/**
 * Report Agent
 * KSQ + Observations → Recommendation + 报告
 */
import { chat } from '../services/llmService.js';
import { REPORT_SYSTEM_PROMPT, buildReportUserPrompt } from '../prompts/report.js';
import { getEnv } from '../config/env.js';
import type { KSQItem, Observation } from '@shared/types.js';

export interface ReportResult {
  recommendation: 'Proceed' | 'FollowUp' | 'Hold';
  summary: string;
  ksqResults: KSQItem[];
  softSkillNote: string;
}

/**
 * 生成最终报告
 */
export async function generateReport(
  ksqItems: KSQItem[],
  observations: Observation[],
): Promise<ReportResult> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return buildMockReport(ksqItems, observations);
  }

  const reply = await chat(
    buildReportUserPrompt(JSON.stringify(ksqItems, null, 2), JSON.stringify(observations, null, 2)),
    {
      systemPrompt: REPORT_SYSTEM_PROMPT,
      temperature: 0.2,
      jsonMode: true,
    },
  );

  const cleaned = reply.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  const result = JSON.parse(cleaned);

  return {
    recommendation: result.recommendation,
    summary: result.summary,
    ksqResults: result.ksqResults.map((k: any, i: number) => ({
      id: ksqItems[i]?.id ?? k.id,
      topic: k.topic ?? ksqItems[i]?.topic ?? '',
      rubric: k.rubric ?? ksqItems[i]?.rubric ?? '',
      result: k.result,
      evidence: k.evidence,
    })),
    softSkillNote: result.softSkillNote,
  };
}

/**
 * Mock 报告
 */
function buildMockReport(ksqItems: KSQItem[], observations: Observation[]): ReportResult {
  const hasContradiction = observations.some(o => o.signalType === 'CONTRADICTORY');
  const confidentCount = observations.filter(o => o.signalType === 'CONFIDENT').length;

  const recommendation: 'Proceed' | 'FollowUp' | 'Hold' =
    hasContradiction ? 'FollowUp' : confidentCount > observations.length / 2 ? 'Proceed' : 'FollowUp';

  return {
    recommendation,
    summary: `(mock) 候选人完成了 ${ksqItems.length} 项考察，整体表现${recommendation === 'Proceed' ? '良好' : '需进一步评估'}`,
    ksqResults: ksqItems.map((k, i) => ({
      ...k,
      result: i === 0 ? 'pass' : 'partial',
      evidence: `(mock) 基于面试第 ${i + 1} 轮的回答判定`,
    })),
    softSkillNote: '(mock) 沟通表达尚可，建议人工复核。仅供参考，建议人工复核。',
  };
}
