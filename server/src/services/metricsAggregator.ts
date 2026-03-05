/**
 * 日指标聚合器
 *
 * 从 tracking_events 计算每日指标，写入 daily_metrics
 * 可由 cron 定时触发或手动 POST /api/analytics/aggregate 调用
 */
import { v4 as uuid } from 'uuid';
import { getSupabase, isDbConfigured } from '../config/database.js';
import { logger } from './logger.js';

interface MetricRow {
  metric_name: string;
  metric_value: number;
  dimensions?: Record<string, unknown>;
}

/**
 * 对指定日期运行聚合，返回写入的指标数量
 */
export async function runDailyAggregation(dateStr: string): Promise<number> {
  if (!isDbConfigured()) return 0;

  const db = getSupabase();
  const dayStart = `${dateStr}T00:00:00+08:00`;
  const dayEnd = `${dateStr}T23:59:59.999+08:00`;

  logger.info(`[MetricsAggregator] Aggregating for ${dateStr}...`);

  // 获取当天所有事件
  const { data: events } = await db
    .from('tracking_events')
    .select('event_name, properties, user_id, session_id, platform')
    .gte('event_time', dayStart)
    .lte('event_time', dayEnd);

  const rows = events ?? [];
  const metrics: MetricRow[] = [];

  // ─── Growth ────────────────────────────────────
  const userIds = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id));
  metrics.push({ metric_name: 'active_users_dau', metric_value: userIds.size });

  const newLoginEvents = rows.filter((r) => r.event_name === 'action.auth.login_completed');
  metrics.push({ metric_name: 'new_users_count', metric_value: newLoginEvents.length });

  // ─── Engagement ────────────────────────────────
  const sessionIds = new Set(rows.filter((r) => r.session_id).map((r) => r.session_id));
  metrics.push({ metric_name: 'session_count', metric_value: sessionIds.size });

  // Feature usage counts
  const featureCounts = {
    resume: rows.filter((r) => r.event_name === 'funnel.resume.uploaded').length,
    interview: rows.filter((r) => r.event_name === 'funnel.interview.created').length,
    sidebar: rows.filter((r) => r.event_name === 'action.sidebar.message_sent').length,
    report: rows.filter((r) => r.event_name === 'funnel.report.viewed').length,
  };
  metrics.push({ metric_name: 'feature_usage_resume', metric_value: featureCounts.resume });
  metrics.push({ metric_name: 'feature_usage_interview', metric_value: featureCounts.interview });
  metrics.push({ metric_name: 'feature_usage_sidebar', metric_value: featureCounts.sidebar });
  metrics.push({ metric_name: 'feature_usage_report', metric_value: featureCounts.report });

  // ─── Funnel counts ────────────────────────────
  const funnelEvents = [
    'funnel.resume.uploaded',
    'funnel.resume.parsed',
    'funnel.interview.created',
    'funnel.landing.opened',
    'funnel.interview.started',
    'funnel.interview.completed',
    'funnel.interview.abandoned',
    'funnel.report.delivered',
    'funnel.report.viewed',
    'funnel.decision.made',
  ];

  for (const eventName of funnelEvents) {
    const count = rows.filter((r) => r.event_name === eventName).length;
    metrics.push({ metric_name: `${eventName}.count`, metric_value: count });
  }

  // Funnel conversion rates
  const funnelCount = (name: string) => rows.filter((r) => r.event_name === name).length;

  const uploaded = funnelCount('funnel.resume.uploaded');
  const parsed = funnelCount('funnel.resume.parsed');
  const created = funnelCount('funnel.interview.created');
  const opened = funnelCount('funnel.landing.opened');
  const started = funnelCount('funnel.interview.started');
  const completed = funnelCount('funnel.interview.completed');
  const abandoned = funnelCount('funnel.interview.abandoned');
  const delivered = funnelCount('funnel.report.delivered');
  const viewed = funnelCount('funnel.report.viewed');
  const decided = funnelCount('funnel.decision.made');

  metrics.push({ metric_name: 'funnel.parse_rate', metric_value: uploaded > 0 ? parsed / uploaded : 0 });
  metrics.push({ metric_name: 'funnel.invite_rate', metric_value: parsed > 0 ? created / parsed : 0 });
  metrics.push({ metric_name: 'funnel.open_rate', metric_value: created > 0 ? opened / created : 0 });
  metrics.push({ metric_name: 'funnel.start_rate', metric_value: opened > 0 ? started / opened : 0 });
  metrics.push({ metric_name: 'funnel.completion_rate', metric_value: started > 0 ? completed / started : 0 });
  metrics.push({ metric_name: 'funnel.view_rate', metric_value: delivered > 0 ? viewed / delivered : 0 });
  metrics.push({ metric_name: 'funnel.decision_rate', metric_value: viewed > 0 ? decided / viewed : 0 });
  metrics.push({ metric_name: 'funnel.abandon_rate', metric_value: started > 0 ? abandoned / started : 0 });

  // ─── Quality ──────────────────────────────────
  // Interview duration
  const completedEvents = rows.filter((r) => r.event_name === 'funnel.interview.completed');
  const durations = completedEvents.map((r) => Number((r.properties as any)?.duration_s ?? 0)).filter((d) => d > 0);
  if (durations.length > 0) {
    metrics.push({ metric_name: 'quality.avg_interview_duration_s', metric_value: durations.reduce((a, b) => a + b, 0) / durations.length });
  }

  // Observation counts
  const analysisEvents = rows.filter((r) => r.event_name === 'agent.analysis.completed');
  const obsCounts = analysisEvents.map((r) => Number((r.properties as any)?.observation_count ?? 0));
  if (obsCounts.length > 0) {
    metrics.push({ metric_name: 'quality.observation_avg_count', metric_value: obsCounts.reduce((a, b) => a + b, 0) / obsCounts.length });
  }

  // Recommendation distribution
  const reportEvents = rows.filter((r) => r.event_name === 'agent.report.completed');
  const proceed = reportEvents.filter((r) => (r.properties as any)?.recommendation === 'Proceed').length;
  const followUp = reportEvents.filter((r) => (r.properties as any)?.recommendation === 'FollowUp').length;
  const hold = reportEvents.filter((r) => (r.properties as any)?.recommendation === 'Hold').length;
  metrics.push({ metric_name: 'quality.recommendation_proceed', metric_value: proceed });
  metrics.push({ metric_name: 'quality.recommendation_followup', metric_value: followUp });
  metrics.push({ metric_name: 'quality.recommendation_hold', metric_value: hold });

  // ─── System Health ────────────────────────────
  // API errors
  const apiErrors = rows.filter((r) => r.event_name === 'error.api.failed').length;
  const totalApiCalls = rows.filter((r) => r.event_name === 'perf.api.response').length;
  metrics.push({ metric_name: 'health.api_error_count', metric_value: apiErrors });
  metrics.push({ metric_name: 'health.api_error_rate', metric_value: totalApiCalls > 0 ? apiErrors / totalApiCalls : 0 });

  // LLM metrics
  const llmEvents = rows.filter((r) => r.event_name === 'agent.llm.completed');
  const llmLatencies = llmEvents.map((r) => Number((r.properties as any)?.latency_ms ?? 0)).filter((l) => l > 0);
  if (llmLatencies.length > 0) {
    llmLatencies.sort((a, b) => a - b);
    metrics.push({ metric_name: 'health.llm_avg_latency_ms', metric_value: llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length });
    metrics.push({ metric_name: 'health.llm_p95_latency_ms', metric_value: llmLatencies[Math.floor(llmLatencies.length * 0.95)] ?? 0 });
  }

  const llmTokens = llmEvents.reduce((sum, r) => sum + Number((r.properties as any)?.tokens_total ?? 0), 0);
  metrics.push({ metric_name: 'health.llm_total_tokens', metric_value: llmTokens });

  const llmFailures = rows.filter((r) => r.event_name === 'agent.llm.failed').length;
  metrics.push({ metric_name: 'health.llm_failure_count', metric_value: llmFailures });

  // Agent failures by type
  const agentTypes = ['resume', 'ksq', 'interview', 'analysis', 'report', 'sidebar'];
  let totalAgentFailures = 0;
  for (const agent of agentTypes) {
    const failures = rows.filter((r) => r.event_name === `agent.${agent}.failed`).length;
    metrics.push({ metric_name: `health.agent_${agent}_failures`, metric_value: failures });
    totalAgentFailures += failures;
  }
  metrics.push({ metric_name: 'health.agent_failure_count', metric_value: totalAgentFailures });

  // ─── Agent Quality Monitoring ─────────────────
  const qualityAgents = ['resume', 'ksq', 'interview', 'analysis', 'report', 'sidebar'];
  const allQualityChecked: Array<{ score: number; pass: boolean; anomalyCount: number }> = [];

  for (const agent of qualityAgents) {
    const checked = rows.filter((r) => r.event_name === `quality.agent.${agent}.checked`);
    if (checked.length > 0) {
      const scores = checked.map((r) => Number((r.properties as any)?.score ?? 0));
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const passCount = checked.filter((r) => (r.properties as any)?.pass === true).length;
      const totalAnomalies = checked.reduce((sum, r) => sum + Number((r.properties as any)?.anomaly_count ?? 0), 0);

      metrics.push({ metric_name: `quality.agent_${agent}_avg_score`, metric_value: avgScore });
      metrics.push({ metric_name: `quality.agent_${agent}_pass_rate`, metric_value: passCount / checked.length });
      metrics.push({ metric_name: `quality.agent_${agent}_check_count`, metric_value: checked.length });
      metrics.push({ metric_name: `quality.agent_${agent}_anomaly_count`, metric_value: totalAnomalies });

      for (const c of checked) {
        allQualityChecked.push({
          score: Number((c.properties as any)?.score ?? 0),
          pass: (c.properties as any)?.pass === true,
          anomalyCount: Number((c.properties as any)?.anomaly_count ?? 0),
        });
      }
    }

    const criticals = rows.filter((r) => r.event_name === `quality.agent.${agent}.critical_anomaly`);
    metrics.push({ metric_name: `quality.agent_${agent}_critical_count`, metric_value: criticals.length });
  }

  if (allQualityChecked.length > 0) {
    const allScores = allQualityChecked.map((c) => c.score);
    const allPass = allQualityChecked.filter((c) => c.pass).length;
    metrics.push({ metric_name: 'quality.overall_avg_score', metric_value: allScores.reduce((a, b) => a + b, 0) / allScores.length });
    metrics.push({ metric_name: 'quality.overall_pass_rate', metric_value: allPass / allQualityChecked.length });
  }

  // ─── Upsert into daily_metrics ────────────────
  const upsertRows = metrics.map((m) => ({
    id: uuid(),
    metric_date: dateStr,
    metric_name: m.metric_name,
    metric_value: m.metric_value,
    dimensions: m.dimensions ?? {},
  }));

  // Supabase upsert with onConflict
  for (const row of upsertRows) {
    await db
      .from('daily_metrics')
      .upsert(row, { onConflict: 'metric_date,metric_name,dimensions' });
  }

  logger.info(`[MetricsAggregator] Wrote ${metrics.length} metrics for ${dateStr}`);
  return metrics.length;
}
