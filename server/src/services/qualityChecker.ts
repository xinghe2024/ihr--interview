/**
 * Agent 质量自动校验
 *
 * 每个 Agent 返回结果后调用对应 check 函数，得到 QualityResult。
 * checkAndTrack 封装：执行校验 → trackServerEvent 上报 → critical 异常额外发告警。
 * 设计原则：fire-and-forget，永不阻塞业务逻辑。
 */
import type { DetailedResume, KSQItem, Observation, ChatAgentAction } from '@shared/types.js';
import type { InterviewTurnResult, InterviewState } from '../agents/interviewAgent.js';
import type { ReportResult } from '../agents/reportAgent.js';
import type { SidebarResponse } from '../agents/sidebarAgent.js';
import { trackServerEvent } from './analyticsService.js';
import { logger } from './logger.js';

// ─── 类型 ────────────────────────────────────────

export interface QualityAnomaly {
  code: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface QualityResult {
  agent: string;
  pass: boolean;
  score: number;
  anomalies: QualityAnomaly[];
  details: Record<string, unknown>;
}

// ─── 通用封装 ────────────────────────────────────

export function checkAndTrack(
  agent: string,
  checkFn: () => QualityResult,
  contextProps: Record<string, string | number | boolean | null> = {},
  userId?: string,
): void {
  try {
    const result = checkFn();
    trackServerEvent(`quality.agent.${agent}.checked`, {
      pass: result.pass,
      score: result.score,
      anomaly_count: result.anomalies.length,
      anomaly_codes: result.anomalies.map((a) => a.code).join(','),
      ...contextProps,
    }, userId);

    const criticals = result.anomalies.filter((a) => a.severity === 'critical');
    if (criticals.length > 0) {
      trackServerEvent(`quality.agent.${agent}.critical_anomaly`, {
        codes: criticals.map((a) => a.code).join(','),
        messages: criticals.map((a) => a.message).join(' | '),
        ...contextProps,
      }, userId);
    }
  } catch (err) {
    logger.warn(`[QualityChecker] ${agent} check failed: ${err instanceof Error ? err.message : err}`);
  }
}

// ─── helpers ─────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function push(anomalies: QualityAnomaly[], code: string, severity: 'warning' | 'critical', message: string) {
  anomalies.push({ code, severity, message });
}

/** 简单字符串相似度（基于公共子序列字符占比） */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const short = a.length <= b.length ? a : b;
  const long = a.length > b.length ? a : b;
  let matches = 0;
  const used = new Set<number>();
  for (const ch of short) {
    for (let i = 0; i < long.length; i++) {
      if (!used.has(i) && long[i] === ch) {
        matches++;
        used.add(i);
        break;
      }
    }
  }
  return matches / long.length;
}

/** CJK 字符占比 */
function cjkRatio(text: string): number {
  if (!text) return 0;
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return (cjk?.length ?? 0) / text.length;
}

// ─── 1. Resume Agent ─────────────────────────────

const RESUME_THRESHOLD = 0.6;

export function checkResume(resume: DetailedResume, rawTextLength: number): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  const name = resume.basicProfile?.name?.trim() ?? '';
  if (!name || name === '未知姓名') {
    push(anomalies, 'RESUME_MISSING_NAME', 'critical', '未提取到候选人姓名');
    score -= 0.3;
  }

  const workCount = resume.workExperiences?.length ?? 0;
  if (workCount === 0) {
    push(anomalies, 'RESUME_NO_WORK_EXP', 'critical', '工作经历为空');
    score -= 0.3;
  }

  if ((resume.educations?.length ?? 0) === 0) {
    push(anomalies, 'RESUME_NO_EDUCATION', 'warning', '教育经历为空');
    score -= 0.1;
  }

  if ((resume.skills?.length ?? 0) === 0) {
    push(anomalies, 'RESUME_NO_SKILLS', 'warning', '技能列表为空');
    score -= 0.1;
  }

  // 结构化内容与原文字符比
  if (rawTextLength > 0) {
    const structured = JSON.stringify(resume).length;
    if (structured < rawTextLength * 0.05) {
      push(anomalies, 'RESUME_LOW_EXTRACTION', 'warning', `结构化提取率过低 (${((structured / rawTextLength) * 100).toFixed(1)}%)`);
      score -= 0.15;
    }
  }

  // 逐条工作经历检查
  for (const w of resume.workExperiences ?? []) {
    if (!w.startDate) {
      push(anomalies, 'RESUME_WORK_NO_DATES', 'warning', `${w.companyName || '未知公司'}: 缺少起始日期`);
      score -= 0.05;
    }
    if (!w.descriptions || w.descriptions.length === 0) {
      push(anomalies, 'RESUME_WORK_NO_DESCRIPTIONS', 'warning', `${w.companyName || '未知公司'}: 工作描述为空`);
      score -= 0.05;
    }
  }

  score = clamp01(score);
  return {
    agent: 'resume',
    pass: score >= RESUME_THRESHOLD,
    score,
    anomalies,
    details: {
      hasName: !!name,
      workExpCount: workCount,
      eduCount: resume.educations?.length ?? 0,
      skillCount: resume.skills?.length ?? 0,
      hasContact: !!(resume.contact?.phone || resume.contact?.email),
    },
  };
}

// ─── 2. KSQ Agent ────────────────────────────────

const KSQ_THRESHOLD = 0.6;

export function checkKSQ(items: KSQItem[]): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  if (items.length === 0) {
    push(anomalies, 'KSQ_EMPTY', 'critical', '未生成任何考察题');
    return { agent: 'ksq', pass: false, score: 0, anomalies, details: { count: 0 } };
  }

  if (items.length < 2) {
    push(anomalies, 'KSQ_TOO_FEW', 'warning', `仅生成 ${items.length} 条考察题`);
    score -= 0.2;
  }

  if (items.length > 8) {
    push(anomalies, 'KSQ_TOO_MANY', 'warning', `生成 ${items.length} 条考察题（过多）`);
    score -= 0.1;
  }

  for (const item of items) {
    if (!item.topic?.trim()) {
      push(anomalies, 'KSQ_MISSING_TOPIC', 'warning', `KSQ ${item.id}: topic 为空`);
      score -= 0.15;
    } else if (item.topic.trim().length < 4) {
      push(anomalies, 'KSQ_TOPIC_TOO_SHORT', 'warning', `KSQ ${item.id}: topic 过短 "${item.topic}"`);
      score -= 0.05;
    }
    if (!item.rubric?.trim()) {
      push(anomalies, 'KSQ_MISSING_RUBRIC', 'warning', `KSQ ${item.id}: rubric 为空`);
      score -= 0.15;
    }
  }

  // 重复 topic 检测
  const topics = items.map((i) => i.topic?.trim()).filter(Boolean);
  const seen = new Set<string>();
  for (const t of topics) {
    if (seen.has(t!)) {
      push(anomalies, 'KSQ_DUPLICATE_TOPICS', 'warning', `重复 topic: "${t}"`);
      score -= 0.1;
    }
    seen.add(t!);
  }

  score = clamp01(score);
  return {
    agent: 'ksq',
    pass: score >= KSQ_THRESHOLD,
    score,
    anomalies,
    details: {
      count: items.length,
      avgTopicLength: topics.length ? Math.round(topics.reduce((s, t) => s + t!.length, 0) / topics.length) : 0,
    },
  };
}

// ─── 3. Interview Agent ──────────────────────────

const INTERVIEW_THRESHOLD = 0.5;

export function checkInterviewTurn(
  result: InterviewTurnResult,
  state: InterviewState,
  history: Array<{ role: string; content: string }>,
): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  const reply = result.reply?.trim() ?? '';

  if (!reply) {
    push(anomalies, 'INTERVIEW_EMPTY_REPLY', 'critical', '面试 Agent 回复为空');
    return { agent: 'interview', pass: false, score: 0, anomalies, details: { replyLength: 0 } };
  }

  if (reply.length < 20) {
    push(anomalies, 'INTERVIEW_REPLY_TOO_SHORT', 'warning', `回复过短 (${reply.length} 字)`);
    score -= 0.2;
  }

  if (reply.length > 2000) {
    push(anomalies, 'INTERVIEW_REPLY_TOO_LONG', 'warning', `回复过长 (${reply.length} 字)`);
    score -= 0.1;
  }

  if (!result.shouldEnd && result.currentKsqIndex >= state.ksqItems.length) {
    push(anomalies, 'INTERVIEW_KSQ_INDEX_OOB', 'critical', `KSQ index ${result.currentKsqIndex} 越界 (共 ${state.ksqItems.length} 项)`);
    score -= 0.3;
  }

  // 与上一条 AI 回复相似度
  const prevAiMsgs = history.filter((m) => m.role === 'assistant');
  if (prevAiMsgs.length > 0) {
    const lastAi = prevAiMsgs[prevAiMsgs.length - 1].content;
    if (similarity(reply, lastAi) > 0.8) {
      push(anomalies, 'INTERVIEW_REPEATS_SELF', 'warning', '回复与上一条 AI 回复高度相似');
      score -= 0.2;
    }
  }

  // 语言检测
  if (reply.length > 50 && cjkRatio(reply) < 0.2) {
    push(anomalies, 'INTERVIEW_LANGUAGE_MISMATCH', 'warning', '回复中中文比例偏低');
    score -= 0.15;
  }

  const turnNumber = history.filter((m) => m.role === 'user').length;
  score = clamp01(score);
  return {
    agent: 'interview',
    pass: score >= INTERVIEW_THRESHOLD,
    score,
    anomalies,
    details: { replyLength: reply.length, ksqIndex: result.currentKsqIndex, turnNumber, shouldEnd: result.shouldEnd },
  };
}

// ─── 4. Analysis Agent ───────────────────────────

const ANALYSIS_THRESHOLD = 0.5;
const VALID_SIGNALS = new Set(['CONFIDENT', 'HESITANT', 'CONTRADICTORY', 'VAGUE']);

export function checkObservations(observations: Observation[], candidateMessageCount: number): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  if (!observations || observations.length === 0) {
    push(anomalies, 'ANALYSIS_EMPTY', 'critical', '未产出任何观察');
    return { agent: 'analysis', pass: false, score: 0, anomalies, details: { observationCount: 0 } };
  }

  if (observations.length < 2 && candidateMessageCount >= 4) {
    push(anomalies, 'ANALYSIS_TOO_FEW', 'warning', `仅 ${observations.length} 条观察（${candidateMessageCount} 条候选人消息）`);
    score -= 0.2;
  }

  const signalCounts: Record<string, number> = {};
  const ids = new Set<string>();

  for (const obs of observations) {
    if (!obs.quote?.trim()) {
      push(anomalies, 'ANALYSIS_MISSING_QUOTE', 'warning', `观察 "${obs.title}": 缺少原文引用`);
      score -= 0.1;
    }
    if (!obs.evidenceTime?.trim()) {
      push(anomalies, 'ANALYSIS_MISSING_EVIDENCE_TIME', 'warning', `观察 "${obs.title}": 缺少证据时间`);
      score -= 0.05;
    }
    if (!VALID_SIGNALS.has(obs.signalType)) {
      push(anomalies, 'ANALYSIS_INVALID_SIGNAL', 'critical', `观察 "${obs.title}": 无效 signalType "${obs.signalType}"`);
      score -= 0.2;
    } else {
      signalCounts[obs.signalType] = (signalCounts[obs.signalType] ?? 0) + 1;
    }
    if (ids.has(obs.id)) {
      push(anomalies, 'ANALYSIS_DUPLICATE_IDS', 'warning', `重复 observation id: "${obs.id}"`);
      score -= 0.1;
    }
    ids.add(obs.id);
  }

  // 信号多样性
  if (observations.length >= 3 && Object.keys(signalCounts).length === 1) {
    push(anomalies, 'ANALYSIS_NO_SIGNAL_VARIETY', 'warning', `所有观察同一 signalType: ${Object.keys(signalCounts)[0]}`);
    score -= 0.15;
  }

  score = clamp01(score);
  return {
    agent: 'analysis',
    pass: score >= ANALYSIS_THRESHOLD,
    score,
    anomalies,
    details: {
      observationCount: observations.length,
      signalDistribution: signalCounts,
      hasQuotes: observations.every((o) => !!o.quote?.trim()),
    },
  };
}

// ─── 5. Report Agent ─────────────────────────────

const REPORT_THRESHOLD = 0.6;
const VALID_RECOMMENDATIONS = new Set(['Proceed', 'FollowUp', 'Hold']);
const VALID_KSQ_RESULTS = new Set(['pass', 'partial', 'fail']);

export function checkReport(report: ReportResult, ksqItems: KSQItem[], observations: Observation[]): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  if (!VALID_RECOMMENDATIONS.has(report.recommendation)) {
    push(anomalies, 'REPORT_INVALID_RECOMMENDATION', 'critical', `无效推荐: "${report.recommendation}"`);
    score -= 0.5;
  }

  const summary = report.summary?.trim() ?? '';
  if (!summary) {
    push(anomalies, 'REPORT_EMPTY_SUMMARY', 'critical', '报告摘要为空');
    score -= 0.3;
  } else if (summary.length < 20) {
    push(anomalies, 'REPORT_SUMMARY_TOO_SHORT', 'warning', `报告摘要过短 (${summary.length} 字)`);
    score -= 0.15;
  }

  if (report.ksqResults?.length !== ksqItems.length) {
    push(anomalies, 'REPORT_KSQ_COUNT_MISMATCH', 'warning', `KSQ 结果 ${report.ksqResults?.length ?? 0} 条，预期 ${ksqItems.length} 条`);
    score -= 0.2;
  }

  let passCount = 0;
  let failCount = 0;
  for (const kr of report.ksqResults ?? []) {
    if (!kr.result) {
      push(anomalies, 'REPORT_KSQ_MISSING_RESULT', 'warning', `KSQ "${kr.topic}": 缺少 result`);
      score -= 0.15;
    } else if (!VALID_KSQ_RESULTS.has(kr.result)) {
      push(anomalies, 'REPORT_KSQ_INVALID_RESULT', 'warning', `KSQ "${kr.topic}": 无效 result "${kr.result}"`);
      score -= 0.15;
    } else {
      if (kr.result === 'pass') passCount++;
      if (kr.result === 'fail') failCount++;
    }
    if (!kr.evidence?.trim()) {
      push(anomalies, 'REPORT_KSQ_MISSING_EVIDENCE', 'warning', `KSQ "${kr.topic}": 缺少证据`);
      score -= 0.1;
    }
  }

  if (!report.softSkillNote?.trim()) {
    push(anomalies, 'REPORT_NO_SOFTSKILL', 'warning', '软技能评价为空');
    score -= 0.1;
  }

  // 推荐一致性
  const total = (report.ksqResults?.length ?? 0);
  if (total > 0) {
    if (report.recommendation === 'Proceed' && failCount > total / 2) {
      push(anomalies, 'REPORT_RECOMMENDATION_CONTRADICTS', 'warning', `推荐 Proceed 但 ${failCount}/${total} 项 fail`);
      score -= 0.2;
    }
    if (report.recommendation === 'Hold' && passCount > total / 2) {
      push(anomalies, 'REPORT_RECOMMENDATION_CONTRADICTS', 'warning', `推荐 Hold 但 ${passCount}/${total} 项 pass`);
      score -= 0.2;
    }
  }

  score = clamp01(score);
  return {
    agent: 'report',
    pass: score >= REPORT_THRESHOLD,
    score,
    anomalies,
    details: {
      recommendation: report.recommendation,
      summaryLength: summary.length,
      ksqResultCount: total,
      ksqPassCount: passCount,
      ksqFailCount: failCount,
      softSkillNoteLength: report.softSkillNote?.trim().length ?? 0,
    },
  };
}

// ─── 6. Sidebar Agent ────────────────────────────

const SIDEBAR_THRESHOLD = 0.5;
const VALID_ACTION_TYPES = new Set(['navigate', 'create_interview', 'show_candidate', 'show_report']);

export function checkSidebarResponse(response: SidebarResponse, userMessage: string): QualityResult {
  const anomalies: QualityAnomaly[] = [];
  let score = 1.0;

  const content = response.content?.trim() ?? '';

  if (!content) {
    push(anomalies, 'SIDEBAR_EMPTY_CONTENT', 'critical', 'Sidebar Agent 回复为空');
    return { agent: 'sidebar', pass: false, score: 0, anomalies, details: { contentLength: 0 } };
  }

  if (content.length < 10) {
    push(anomalies, 'SIDEBAR_CONTENT_TOO_SHORT', 'warning', `回复过短 (${content.length} 字)`);
    score -= 0.2;
  }

  if (content.length > 5000) {
    push(anomalies, 'SIDEBAR_CONTENT_TOO_LONG', 'warning', `回复过长 (${content.length} 字)`);
    score -= 0.1;
  }

  // 语言检测
  if (content.length > 50 && cjkRatio(content) < 0.2) {
    push(anomalies, 'SIDEBAR_LANGUAGE_MISMATCH', 'warning', '回复中中文比例偏低');
    score -= 0.15;
  }

  // action 类型校验
  for (const action of response.actions ?? []) {
    if (!VALID_ACTION_TYPES.has(action.type)) {
      push(anomalies, 'SIDEBAR_INVALID_ACTION_TYPE', 'warning', `无效 action type: "${action.type}"`);
      score -= 0.15;
    }
  }

  // 鹦鹉学舌检测
  if (userMessage && similarity(content, userMessage) > 0.8) {
    push(anomalies, 'SIDEBAR_PARROT', 'warning', '回复与用户输入高度相似（鹦鹉学舌）');
    score -= 0.2;
  }

  score = clamp01(score);
  return {
    agent: 'sidebar',
    pass: score >= SIDEBAR_THRESHOLD,
    score,
    anomalies,
    details: {
      contentLength: content.length,
      actionCount: response.actions?.length ?? 0,
      actionTypes: (response.actions ?? []).map((a) => a.type),
    },
  };
}
