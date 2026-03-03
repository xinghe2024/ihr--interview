/**
 * Analysis Agent
 * 面试 transcript → Observation[]（信号检测 + 证据链）
 */
import { v4 as uuid } from 'uuid';
import { chat } from '../services/llmService.js';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../prompts/analysis.js';
import { getEnv } from '../config/env.js';
import type { Observation, InterviewMessage, DetailedResume } from '@shared/types.js';

/**
 * 分析面试 transcript，生成 Observation 数组
 */
export async function analyzeTranscript(
  messages: InterviewMessage[],
  resume: DetailedResume | undefined,
  ksqTopics: string[],
): Promise<Observation[]> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return buildMockObservations(messages, ksqTopics);
  }

  // 构建 transcript 文本
  const transcript = messages
    .map(m => `[${m.role === 'ai' ? '面试官' : '候选人'}] ${m.content}`)
    .join('\n\n');

  const resumeSummary = resume
    ? `姓名: ${resume.basicProfile.name}, 工作经历: ${resume.workExperiences.map(w => `${w.companyName}(${w.position})`).join(', ')}`
    : '(无简历数据)';

  const reply = await chat(buildAnalysisUserPrompt(transcript, resumeSummary, ksqTopics), {
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    temperature: 0.2,
    jsonMode: true,
    maxTokens: 8192,
  });

  const cleaned = reply.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned) as Observation[];
}

/**
 * Mock 分析
 */
function buildMockObservations(messages: InterviewMessage[], ksqTopics: string[]): Observation[] {
  const candidateMsgs = messages.filter(m => m.role === 'candidate');
  const observations: Observation[] = [];

  // 基于候选人消息数量生成 mock 观察
  candidateMsgs.forEach((msg, i) => {
    if (i >= 3) return; // 最多 3 条
    const signals: Array<'CONFIDENT' | 'HESITANT' | 'CONTRADICTORY' | 'VAGUE'> =
      ['CONFIDENT', 'HESITANT', 'VAGUE', 'CONFIDENT'];

    observations.push({
      id: `obs-${i + 1}`,
      category: ksqTopics[i] ? '专项考察' : '综合表现',
      title: `(mock) 关于"${ksqTopics[i] ?? '综合话题'}"的回答分析`,
      observation: `(mock) 候选人在该话题上的回答${signals[i % 4] === 'CONFIDENT' ? '较为自信，能给出细节' : '较为模糊，缺少具体数据'}`,
      quote: msg.content.slice(0, 100),
      evidenceTime: `第${i + 1}轮`,
      signalType: signals[i % 4]!,
      confidence: 'Mid',
      competencyDimension: 'communication',
    });
  });

  // 至少一条
  if (observations.length === 0) {
    observations.push({
      id: 'obs-1',
      category: '综合表现',
      title: '(mock) 面试观察',
      observation: '(mock) 候选人完成了面试流程',
      quote: '(mock 数据)',
      evidenceTime: '全程',
      signalType: 'CONFIDENT',
      confidence: 'Low',
    });
  }

  return observations;
}
