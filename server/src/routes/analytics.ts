/**
 * 埋点路由
 * POST /api/analytics/events         — 前端批量上报事件（无需 JWT）
 * GET  /api/analytics/health-report   — 产品健康仪表盘（需要 JWT）
 * POST /api/analytics/aggregate       — 手动触发日聚合（内部调用）
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { getSupabase, isDbConfigured } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { logger } from '../services/logger.js';
import { runDailyAggregation } from '../services/metricsAggregator.js';

const analytics = new Hono();

// ─── Schema ─────────────────────────────────────

const eventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  timestamp: z.string(),
});

const contextSchema = z.object({
  clientId: z.string(),
  sessionId: z.string(),
  userId: z.string().optional(),
  platform: z.enum(['web', 'extension', 'h5']),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  userAgent: z.string().optional(),
  appVersion: z.string().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
  context: contextSchema,
});

// ─── POST /events — 批量事件上报（无需 JWT） ────

analytics.post('/events', async (c) => {
  if (!isDbConfigured()) {
    return c.json(apiResponse({ received: 0, note: 'DB not configured' }));
  }

  let parsed;
  try {
    const raw = await c.req.text();
    parsed = batchSchema.safeParse(JSON.parse(raw));
  } catch {
    return c.json(apiResponse(null, { code: 'PARSE_ERROR', message: 'Invalid JSON body' }), 400);
  }

  if (!parsed.success) {
    return c.json(
      apiResponse(null, { code: 'VALIDATION', message: parsed.error.issues[0]?.message ?? 'Invalid payload' }),
      400,
    );
  }

  const { events, context } = parsed.data;
  const db = getSupabase();

  const rows = events.map((e) => ({
    id: uuid(),
    event_name: e.event,
    properties: e.properties ?? {},
    client_id: context.clientId || null,
    session_id: context.sessionId || null,
    user_id: context.userId || null,
    platform: context.platform,
    app_version: context.appVersion ?? null,
    event_time: e.timestamp,
  }));

  const { error } = await db.from('tracking_events').insert(rows);
  if (error) {
    logger.error(`Analytics batch insert failed: ${error.message}`);
    return c.json(apiResponse(null, { code: 'DB_ERROR', message: 'Failed to store events' }), 500);
  }

  return c.json(apiResponse({ received: events.length }));
});

// ─── GET /health-report — 产品健康仪表盘（需要 JWT） ──

analytics.get('/health-report', requireAuth(), async (c) => {
  if (!isDbConfigured()) {
    return c.json(apiResponse(null, { code: 'DB_NOT_CONFIGURED', message: 'Database not configured' }), 503);
  }

  const db = getSupabase();
  const url = new URL(c.req.url);
  const dateFrom = url.searchParams.get('date_from') || new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const dateTo = url.searchParams.get('date_to') || new Date().toISOString().slice(0, 10);

  // 从 daily_metrics 读取预聚合数据
  const { data: metrics } = await db
    .from('daily_metrics')
    .select('*')
    .gte('metric_date', dateFrom)
    .lte('metric_date', dateTo)
    .order('metric_date', { ascending: true });

  // 构建按 metric_name 分组的映射
  const byName: Record<string, Array<{ date: string; value: number; dimensions: Record<string, unknown> }>> = {};
  for (const row of metrics ?? []) {
    const name = row.metric_name as string;
    if (!byName[name]) byName[name] = [];
    byName[name].push({ date: row.metric_date, value: Number(row.metric_value), dimensions: row.dimensions ?? {} });
  }

  const latest = (name: string) => {
    const arr = byName[name];
    return arr?.[arr.length - 1]?.value ?? 0;
  };
  const series = (name: string) => (byName[name] ?? []).map((r) => ({ date: r.date, value: r.value }));
  const trend = (name: string) => {
    const arr = byName[name];
    if (!arr || arr.length < 2) return 0;
    const prev = arr[arr.length - 2]?.value || 0;
    const curr = arr[arr.length - 1]?.value || 0;
    return prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);
  };

  // 漏斗阶段
  const funnelStages = [
    'funnel.resume.uploaded.count',
    'funnel.resume.parsed.count',
    'funnel.interview.created.count',
    'funnel.landing.opened.count',
    'funnel.interview.started.count',
    'funnel.interview.completed.count',
    'funnel.report.delivered.count',
    'funnel.report.viewed.count',
    'funnel.decision.made.count',
  ];

  const funnelLabels = [
    'resume_uploaded', 'resume_parsed', 'interview_created', 'landing_opened',
    'interview_started', 'interview_completed', 'report_delivered', 'report_viewed', 'decision_made',
  ];

  const funnelData = funnelStages.map((stage, i) => {
    const count = latest(stage);
    const prevCount = i > 0 ? latest(funnelStages[i - 1]) : count;
    return {
      name: funnelLabels[i],
      count,
      conversionFromPrevious: prevCount > 0 ? Math.round((count / prevCount) * 100) / 100 : 0,
      trendVsPreviousPeriod: trend(stage),
    };
  });

  const firstFunnel = latest(funnelStages[0]);
  const lastFunnel = latest(funnelStages[funnelStages.length - 1]);

  // 构建告警
  const alerts: Array<{ severity: string; metric: string; message: string; currentValue: number; threshold: number }> = [];

  const apiErrorRate = latest('health.api_error_rate');
  if (apiErrorRate > 0.05) {
    alerts.push({ severity: 'critical', metric: 'api_error_rate', message: `API 错误率 ${(apiErrorRate * 100).toFixed(1)}% 超过 5% 阈值`, currentValue: apiErrorRate, threshold: 0.05 });
  }

  const llmP95 = latest('health.llm_p95_latency_ms');
  if (llmP95 > 10000) {
    alerts.push({ severity: 'warning', metric: 'llm_p95_latency', message: `LLM P95 延迟 ${Math.round(llmP95)}ms 超过 10s 阈值`, currentValue: llmP95, threshold: 10000 });
  }

  const agentFailures = latest('health.agent_failure_count');
  if (agentFailures > 3) {
    alerts.push({ severity: 'critical', metric: 'agent_failures', message: `今日 Agent 失败 ${agentFailures} 次`, currentValue: agentFailures, threshold: 3 });
  }

  const completionRate = latest('funnel.completion_rate');
  if (completionRate > 0 && completionRate < 0.4) {
    alerts.push({ severity: 'warning', metric: 'interview_completion', message: `面试完成率 ${(completionRate * 100).toFixed(0)}% 低于 40% 预期`, currentValue: completionRate, threshold: 0.4 });
  }

  // Agent 质量告警
  const overallQualityScore = latest('quality.overall_avg_score');
  if (overallQualityScore > 0 && overallQualityScore < 0.6) {
    alerts.push({ severity: 'warning', metric: 'agent_quality_score', message: `Agent 整体质量评分 ${(overallQualityScore * 100).toFixed(0)}% 低于 60% 阈值`, currentValue: overallQualityScore, threshold: 0.6 });
  }

  const qualityAgentNames = ['resume', 'ksq', 'interview', 'analysis', 'report', 'sidebar'];
  const agentLabels: Record<string, string> = { resume: '简历解析', ksq: '考察题', interview: '面试对话', analysis: '信号分析', report: '报告生成', sidebar: 'Ailin 对话' };
  for (const agent of qualityAgentNames) {
    const critCount = latest(`quality.agent_${agent}_critical_count`);
    if (critCount > 0) {
      alerts.push({ severity: 'critical', metric: `agent_${agent}_critical`, message: `${agentLabels[agent]} Agent 今日出现 ${critCount} 次严重质量问题`, currentValue: critCount, threshold: 0 });
    }
  }

  // 构建 agentQuality 段
  const agentQuality: Record<string, unknown> = {
    overallScore: overallQualityScore,
    overallPassRate: latest('quality.overall_pass_rate'),
    agents: {} as Record<string, unknown>,
    scoreSeries: series('quality.overall_avg_score'),
  };
  const agentsMap: Record<string, unknown> = {};
  for (const agent of qualityAgentNames) {
    agentsMap[agent] = {
      avgScore: latest(`quality.agent_${agent}_avg_score`),
      passRate: latest(`quality.agent_${agent}_pass_rate`),
      checkCount: latest(`quality.agent_${agent}_check_count`),
      anomalyCount: latest(`quality.agent_${agent}_anomaly_count`),
      criticalCount: latest(`quality.agent_${agent}_critical_count`),
    };
  }
  agentQuality.agents = agentsMap;

  const report = {
    period: {
      from: dateFrom,
      to: dateTo,
      days: Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400_000) + 1,
    },
    growth: {
      newUsers: latest('new_users_count'),
      newUsersTrend: trend('new_users_count'),
      dau: latest('active_users_dau'),
      dauTrend: trend('active_users_dau'),
      dauSeries: series('active_users_dau'),
    },
    funnel: {
      stages: funnelData,
      overallConversion: firstFunnel > 0 ? Math.round((lastFunnel / firstFunnel) * 100) / 100 : 0,
    },
    engagement: {
      avgSessionDurationS: latest('avg_session_duration_s'),
      featureAdoption: {
        resume: latest('feature_usage_resume'),
        interview: latest('feature_usage_interview'),
        sidebar: latest('feature_usage_sidebar'),
        report: latest('feature_usage_report'),
      },
      reportActionRate: latest('funnel.decision_rate'),
      avgTimeToDecisionH: latest('quality.avg_time_to_decision_h'),
    },
    quality: {
      interviewCompletionRate: completionRate,
      avgInterviewDurationS: latest('quality.avg_interview_duration_s'),
      avgObservationsPerReport: latest('quality.observation_avg_count'),
      recommendationDistribution: {
        proceed: latest('quality.recommendation_proceed'),
        followUp: latest('quality.recommendation_followup'),
        hold: latest('quality.recommendation_hold'),
      },
    },
    systemHealth: {
      apiErrorRate,
      llmAvgLatencyMs: latest('health.llm_avg_latency_ms'),
      llmP95LatencyMs: llmP95,
      llmFailureCount: latest('health.llm_failure_count'),
      llmTotalTokens: latest('health.llm_total_tokens'),
      agentFailures: {
        resume: latest('health.agent_resume_failures'),
        ksq: latest('health.agent_ksq_failures'),
        interview: latest('health.agent_interview_failures'),
        analysis: latest('health.agent_analysis_failures'),
        report: latest('health.agent_report_failures'),
        sidebar: latest('health.agent_sidebar_failures'),
      },
    },
    agentQuality,
    alerts,
  };

  return c.json(apiResponse(report));
});

// ─── POST /aggregate — 手动触发日聚合 ───────────

analytics.post('/aggregate', requireAuth(), async (c) => {
  const url = new URL(c.req.url);
  const targetDate = url.searchParams.get('date') || new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

  try {
    const count = await runDailyAggregation(targetDate);
    return c.json(apiResponse({ date: targetDate, metricsComputed: count }));
  } catch (err) {
    logger.error(`Aggregation failed: ${err instanceof Error ? err.message : err}`);
    return c.json(apiResponse(null, { code: 'AGGREGATION_ERROR', message: 'Aggregation failed' }), 500);
  }
});

export default analytics;
