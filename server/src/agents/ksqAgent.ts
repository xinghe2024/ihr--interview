/**
 * KSQ Agent
 * DetailedResume → KSQItem[]（关键考察题）
 */
import { v4 as uuid } from 'uuid';
import { chat } from '../services/llmService.js';
import { KSQ_SYSTEM_PROMPT, buildKsqUserPrompt } from '../prompts/ksq.js';
import { getEnv } from '../config/env.js';
import type { DetailedResume, KSQItem } from '@shared/types.js';

/**
 * 根据结构化简历生成 KSQ
 */
export async function generateKSQ(resume: DetailedResume, role: string): Promise<KSQItem[]> {
  const env = getEnv();

  // Mock 模式
  if (env.LLM_PROVIDER === 'mock') {
    return buildMockKSQ(resume, role);
  }

  const resumeJson = JSON.stringify(resume, null, 2);
  const reply = await chat(buildKsqUserPrompt(resumeJson, role), {
    systemPrompt: KSQ_SYSTEM_PROMPT,
    temperature: 0.3,
    jsonMode: true,
  });

  const cleaned = reply.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  const items = JSON.parse(cleaned) as KSQItem[];

  // 确保每个 item 有 id
  return items.map((item, i) => ({
    ...item,
    id: item.id || `ksq-${i + 1}`,
  }));
}

/**
 * Mock 模式：基于简历内容生成假 KSQ
 */
function buildMockKSQ(resume: DetailedResume, role: string): KSQItem[] {
  const items: KSQItem[] = [];

  // 从最近的工作经历生成
  const latestWork = resume.workExperiences[0];
  if (latestWork && !latestWork.companyName.includes('mock')) {
    items.push({
      id: 'ksq-1',
      topic: `${latestWork.position} 核心职责验证`,
      rubric: `能具体描述在 ${latestWork.companyName} 的关键项目、个人贡献和量化成果`,
    });
  }

  // 从技能生成
  const topSkills = resume.skills.filter(s => !s.name.includes('mock')).slice(0, 2);
  if (topSkills.length > 0) {
    items.push({
      id: `ksq-${items.length + 1}`,
      topic: `${topSkills.map(s => s.name).join('/')} 技术深度`,
      rubric: `能描述使用场景、遇到的问题及解决方案，而非仅停留在概念层面`,
    });
  }

  // 兜底
  if (items.length === 0) {
    items.push({
      id: 'ksq-1',
      topic: `${role} 岗位核心能力验证`,
      rubric: '能结合具体项目说明自己的核心优势和实际贡献',
    });
  }

  return items;
}
