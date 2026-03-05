import React, { useState, useEffect } from 'react';
import { ViewState } from '../../shared/types';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Activity, Zap, AlertTriangle, RefreshCw, ChevronRight, Clock, MessageSquare, FileText, BarChart3, Shield } from 'lucide-react';
import { useViewTracking } from '../hooks/useViewTracking';
import { getStoredToken } from '../services/api';

interface DataDashboardViewProps {
  onNavigate: (view: ViewState, id?: string) => void;
}

// ─── 类型 ──────────────────────────────────────────

interface AgentQualityInfo {
  avgScore: number;
  passRate: number;
  checkCount: number;
  anomalyCount: number;
  criticalCount: number;
}

interface HealthReport {
  period: { from: string; to: string; days: number };
  growth: {
    newUsers: number; newUsersTrend: number;
    dau: number; dauTrend: number;
    dauSeries: Array<{ date: string; value: number }>;
  };
  funnel: {
    stages: Array<{ name: string; count: number; conversionFromPrevious: number; trendVsPreviousPeriod: number }>;
    overallConversion: number;
  };
  engagement: {
    avgSessionDurationS: number;
    featureAdoption: Record<string, number>;
    reportActionRate: number;
    avgTimeToDecisionH: number;
  };
  quality: {
    interviewCompletionRate: number;
    avgInterviewDurationS: number;
    avgObservationsPerReport: number;
    recommendationDistribution: { proceed: number; followUp: number; hold: number };
  };
  systemHealth: {
    apiErrorRate: number;
    llmAvgLatencyMs: number; llmP95LatencyMs: number;
    llmFailureCount: number; llmTotalTokens: number;
    agentFailures: Record<string, number>;
  };
  agentQuality?: {
    overallScore: number;
    overallPassRate: number;
    agents: Record<string, AgentQualityInfo>;
    scoreSeries: Array<{ date: string; value: number }>;
  };
  alerts: Array<{ severity: string; metric: string; message: string; currentValue: number; threshold: number }>;
}

// ─── 辅助 ──────────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = {
  resume_uploaded: '上传简历',
  resume_parsed: '解析简历',
  interview_created: '创建邀约',
  landing_opened: '候选人打开',
  interview_started: '开始面试',
  interview_completed: '完成面试',
  report_delivered: '报告交付',
  report_viewed: '查看报告',
  decision_made: '做出决策',
};

const FEATURE_LABELS: Record<string, string> = {
  resume: '简历解析',
  interview: '面试',
  sidebar: 'Ailin 对话',
  report: '报告查看',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${(seconds / 3600).toFixed(1)}小时`;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-slate-400">持平</span>;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isUp ? '+' : ''}{value}%
    </span>
  );
}

// ─── 组件 ──────────────────────────────────────────

const DataDashboardView: React.FC<DataDashboardViewProps> = ({ onNavigate }) => {
  useViewTracking('data_dashboard');
  const [data, setData] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateFrom = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const dateTo = new Date().toISOString().slice(0, 10);
      const token = getStoredToken();
      const res = await fetch(`/api/analytics/health-report?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error?.message || '加载失败');
      }
    } catch (e: any) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  // ─── Loading / Error ─────────────────────────

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/10 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={24} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">加载数据中...</p>
        </div>
      </div>
    );
  }

  // ─── 主渲染 ──────────────────────────────────

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">产品数据仪表盘</h1>
              <p className="text-xs text-slate-400">
                {data?.period.from} 至 {data?.period.to} · {data?.period.days ?? days} 天
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 时间范围选择 */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${days === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {d}天
                </button>
              ))}
            </div>
            <button onClick={fetchData} disabled={loading}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* 告警 */}
        {data && data.alerts.length > 0 && (
          <div className="space-y-2">
            {data.alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${a.severity === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <AlertTriangle size={16} />
                <span className="text-sm font-medium flex-1">{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {error && !data && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
            {error}
            <button onClick={fetchData} className="ml-2 underline">重试</button>
          </div>
        )}

        {data && (
          <>
            {/* ─── 第一行：核心数字 ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<Users size={18} />} label="日活用户 (DAU)" value={data.growth.dau} trend={data.growth.dauTrend} color="indigo" />
              <MetricCard icon={<TrendingUp size={18} />} label="新增用户" value={data.growth.newUsers} trend={data.growth.newUsersTrend} color="emerald" />
              <MetricCard icon={<Clock size={18} />} label="平均停留" value={formatDuration(data.engagement.avgSessionDurationS)} color="violet" />
              <MetricCard icon={<Activity size={18} />} label="全链路转化率" value={`${(data.funnel.overallConversion * 100).toFixed(0)}%`} color="amber" />
            </div>

            {/* ─── 第二行：业务漏斗 ─── */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-500" />
                业务漏斗
                <span className="text-xs text-slate-400 font-normal">每一步有多少人往下走</span>
              </h2>
              <div className="space-y-3">
                {data.funnel.stages.map((stage, i) => {
                  const maxCount = Math.max(...data.funnel.stages.map(s => s.count), 1);
                  const widthPct = Math.max((stage.count / maxCount) * 100, 4);
                  return (
                    <div key={stage.name} className="flex items-center gap-3">
                      <div className="w-24 shrink-0 text-right">
                        <span className="text-xs text-slate-500">{FUNNEL_LABELS[stage.name] ?? stage.name}</span>
                      </div>
                      <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-700 ease-out"
                          style={{
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${funnelColor(i, data.funnel.stages.length)} 0%, ${funnelColor(i, data.funnel.stages.length)}cc 100%)`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-xs font-bold text-white drop-shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {stage.count}
                          </span>
                        </div>
                      </div>
                      <div className="w-16 shrink-0">
                        {i > 0 && (
                          <span className={`text-xs font-bold ${stage.conversionFromPrevious >= 0.5 ? 'text-emerald-600' : stage.conversionFromPrevious >= 0.3 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {(stage.conversionFromPrevious * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                百分比 = 当前步骤人数 / 上一步人数。绿色 ≥50% 正常 · 黄色 30-50% 需关注 · 红色 &lt;30% 需修复
              </p>
            </div>

            {/* ─── 第三行：功能使用 + 面试质量 ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 功能使用 */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  功能使用量
                </h2>
                <div className="space-y-3">
                  {Object.entries(data.engagement.featureAdoption).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{FEATURE_LABELS[key] ?? key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(((val as number) / Math.max(...(Object.values(data.engagement.featureAdoption) as number[]), 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 w-10 text-right">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>报告决策率</span>
                  <span className="font-bold text-slate-800">{(data.engagement.reportActionRate * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>平均决策时长</span>
                  <span className="font-bold text-slate-800">{data.engagement.avgTimeToDecisionH.toFixed(1)} 小时</span>
                </div>
              </div>

              {/* 面试质量 */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-500" />
                  面试质量
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">面试完成率</span>
                    <ProgressRing value={data.quality.interviewCompletionRate * 100} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">平均面试时长</span>
                    <span className="text-sm font-bold text-slate-800">{formatDuration(data.quality.avgInterviewDurationS)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">平均发现点 / 报告</span>
                    <span className="text-sm font-bold text-slate-800">{data.quality.avgObservationsPerReport.toFixed(1)}</span>
                  </div>
                  {/* 推荐分布 */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">推荐结果分布</p>
                    <div className="flex gap-2">
                      <RecommendPill label="推进" count={data.quality.recommendationDistribution.proceed} color="emerald" />
                      <RecommendPill label="跟进" count={data.quality.recommendationDistribution.followUp} color="amber" />
                      <RecommendPill label="暂缓" count={data.quality.recommendationDistribution.hold} color="slate" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── AI Agent 质量监控 ─── */}
            <AgentQualitySection quality={data.agentQuality} />

            {/* ─── 第四行：系统健康 ─── */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Shield size={16} className="text-blue-500" />
                系统健康
                <span className="text-xs text-slate-400 font-normal">AI 系统运行状态</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SystemMetric label="API 错误率"
                  value={`${(data.systemHealth.apiErrorRate * 100).toFixed(1)}%`}
                  status={data.systemHealth.apiErrorRate > 0.05 ? 'danger' : data.systemHealth.apiErrorRate > 0.02 ? 'warn' : 'ok'} />
                <SystemMetric label="LLM 平均延迟"
                  value={`${Math.round(data.systemHealth.llmAvgLatencyMs)}ms`}
                  status={data.systemHealth.llmAvgLatencyMs > 8000 ? 'danger' : data.systemHealth.llmAvgLatencyMs > 5000 ? 'warn' : 'ok'} />
                <SystemMetric label="LLM P95 延迟"
                  value={`${Math.round(data.systemHealth.llmP95LatencyMs)}ms`}
                  status={data.systemHealth.llmP95LatencyMs > 10000 ? 'danger' : data.systemHealth.llmP95LatencyMs > 7000 ? 'warn' : 'ok'} />
                <SystemMetric label="LLM 失败次数"
                  value={String(data.systemHealth.llmFailureCount)}
                  status={data.systemHealth.llmFailureCount > 5 ? 'danger' : data.systemHealth.llmFailureCount > 0 ? 'warn' : 'ok'} />
                <SystemMetric label="Token 消耗"
                  value={data.systemHealth.llmTotalTokens > 1_000_000 ? `${(data.systemHealth.llmTotalTokens / 1_000_000).toFixed(1)}M` : `${Math.round(data.systemHealth.llmTotalTokens / 1000)}K`}
                  status="ok" />
              </div>
              {/* Agent 失败明细 */}
              {(Object.values(data.systemHealth.agentFailures) as number[]).some(v => v > 0) && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Agent 失败明细</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(data.systemHealth.agentFailures) as [string, number][]).filter(([, v]) => v > 0).map(([agent, count]) => (
                      <span key={agent} className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg border border-rose-100">
                        {agent}: {count}次
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DAU 趋势 — 简单的 sparkline */}
            {data.growth.dauSeries.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-500" />
                  DAU 趋势
                </h2>
                <div className="flex items-end gap-1 h-24">
                  {data.growth.dauSeries.map((d, i) => {
                    const maxVal = Math.max(...data.growth.dauSeries.map(s => s.value), 1);
                    const heightPct = Math.max((d.value / maxVal) * 100, 4);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.value}`}>
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</span>
                        <div className="w-full rounded-t-md bg-indigo-400 hover:bg-indigo-500 transition-colors cursor-pointer"
                          style={{ height: `${heightPct}%` }} />
                        <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── 子组件 ────────────────────────────────────────

function MetricCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string | number; trend?: number; color: string }) {
  const bgMap: Record<string, string> = { indigo: 'bg-indigo-50', emerald: 'bg-emerald-50', violet: 'bg-violet-50', amber: 'bg-amber-50' };
  const iconColorMap: Record<string, string> = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', violet: 'text-violet-600', amber: 'text-amber-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${bgMap[color]} flex items-center justify-center ${iconColorMap[color]}`}>
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 60 ? 'text-emerald-500' : clamped >= 40 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className={`text-sm font-bold ${color}`}>
      {clamped.toFixed(0)}%
    </div>
  );
}

function RecommendPill({ label, count, color }: { label: string; count: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${styles[color]}`}>
      {label} <span className="text-sm">{count}</span>
    </span>
  );
}

function SystemMetric({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'danger' }) {
  const dotColor = { ok: 'bg-emerald-500', warn: 'bg-amber-500', danger: 'bg-rose-500' }[status];
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function funnelColor(index: number, total: number): string {
  const colors = ['#6366f1', '#818cf8', '#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764'];
  return colors[Math.min(index, colors.length - 1)];
}

function qualityScoreColor(score: number): string {
  if (score >= 0.8) return '#10b981';
  if (score >= 0.6) return '#f59e0b';
  return '#f43f5e';
}

const AGENT_LABELS: Record<string, string> = {
  resume: '简历解析', ksq: '考察题生成', interview: '面试对话',
  analysis: '信号分析', report: '报告生成', sidebar: 'Ailin 对话',
};

function AgentQualitySection({ quality }: { quality?: HealthReport['agentQuality'] }) {
  if (!quality) return null;

  const hasData = Object.values(quality.agents).some((a: AgentQualityInfo) => a.checkCount > 0);
  const overallColor = qualityScoreColor(quality.overallScore);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Shield size={16} className="text-violet-500" />
        AI Agent 质量监控
        <span className="text-xs text-slate-400 font-normal">每个 Agent 输出自动校验</span>
      </h2>

      {!hasData ? (
        <div className="text-center py-6 text-sm text-slate-400">
          暂无质量检查数据，Agent 被调用后自动展示
        </div>
      ) : (
        <>
          {/* 整体评分 */}
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <div className="text-3xl font-bold" style={{ color: overallColor }}>
              {(quality.overallScore * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              整体质量分<br />
              通过率 {(quality.overallPassRate * 100).toFixed(0)}%
            </div>
          </div>
          {/* 6 格 Agent 卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(quality.agents).map(([agent, info]) => (
              <AgentQualityCard key={agent} agent={agent} info={info as AgentQualityInfo} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const AgentQualityCard: React.FC<{ agent: string; info: AgentQualityInfo }> = ({ agent, info }) => {
  const color = qualityScoreColor(info.avgScore);
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">{AGENT_LABELS[agent] ?? agent}</span>
        {info.criticalCount > 0 && (
          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-md">
            {info.criticalCount} 严重
          </span>
        )}
      </div>
      <div className="text-lg font-bold" style={{ color }}>
        {(info.avgScore * 100).toFixed(0)}%
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${info.passRate * 100}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] text-slate-400">{info.checkCount}次</span>
      </div>
    </div>
  );
}

export default DataDashboardView;
