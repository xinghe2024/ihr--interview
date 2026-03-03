/**
 * 候选人资产化 — 静默提取 Verified Tags
 * MVP 阶段只积累标签，不对外透出
 */
import type { Observation, KSQItem } from '@shared/types.js';

export interface VerifiedTag {
  tag: string;
  source: 'ksq' | 'observation';
  confidence: 'High' | 'Mid' | 'Low';
}

/**
 * 从 KSQ 结果和 Observations 中提取 verified tags
 */
export function extractVerifiedTags(
  ksqResults: KSQItem[],
  observations: Observation[],
): VerifiedTag[] {
  const tags: VerifiedTag[] = [];

  // 从通过的 KSQ 提取
  for (const ksq of ksqResults) {
    if (ksq.result === 'pass') {
      tags.push({
        tag: ksq.topic,
        source: 'ksq',
        confidence: 'High',
      });
    }
  }

  // 从 CONFIDENT 信号提取
  for (const obs of observations) {
    if (obs.signalType === 'CONFIDENT' && obs.confidence === 'High') {
      tags.push({
        tag: obs.category,
        source: 'observation',
        confidence: 'Mid',
      });
    }
  }

  return tags;
}
