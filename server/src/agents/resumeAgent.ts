/**
 * Resume Agent
 * 简历原文 → DetailedResume 结构化数据
 */
import { chat } from '../services/llmService.js';
import { RESUME_SYSTEM_PROMPT, buildResumeUserPrompt } from '../prompts/resume.js';
import { getEnv } from '../config/env.js';
import type { DetailedResume } from '@shared/types.js';

/**
 * 解析简历文本为结构化数据
 */
export async function parseResume(resumeText: string): Promise<DetailedResume> {
  const env = getEnv();

  // Mock 模式：返回从文本中提取的基本信息
  if (env.LLM_PROVIDER === 'mock') {
    return buildMockResume(resumeText);
  }

  const reply = await chat(buildResumeUserPrompt(resumeText), {
    systemPrompt: RESUME_SYSTEM_PROMPT,
    temperature: 0.1,
    jsonMode: true,
  });

  // 尝试解析 JSON，去掉可能的 markdown 代码块包裹
  const cleaned = reply.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned) as DetailedResume;
}

/**
 * Mock 模式：从原文中粗提取基本信息
 * 用正则做简单提取，足够开发调试
 */
function buildMockResume(text: string): DetailedResume {
  const nameMatch = text.match(/姓名[：:]\s*(.+)/);
  const phoneMatch = text.match(/(?:电话|手机|联系)[：:]\s*([\d\-+]+)/);
  const emailMatch = text.match(/(?:邮箱|邮件|email)[：:]\s*(\S+@\S+)/i);
  const salaryMatch = text.match(/(\d+[kK]?\s*[-~]\s*\d+[kK]?)/);

  // 提取工作经历段落
  const workBlocks = text.match(/(\d{4}[-/.]\d{1,2})\s*[-~至到]\s*(\d{4}[-/.]\d{1,2}|至今|现在)[\s|]*([^\n]+?)[\s|]*([^\n]+)/g) ?? [];

  const workExperiences = workBlocks.slice(0, 5).map((block, i) => {
    const parts = block.split(/[\s|]+/).filter(Boolean);
    return {
      id: `work-${i + 1}`,
      companyName: parts[2] || `公司${i + 1}`,
      position: parts[3] || '未知职位',
      startDate: parts[0]?.replace(/[/.]/g, '-').slice(0, 7) || '2020-01',
      endDate: parts[1]?.includes('至今') ? undefined : parts[1]?.replace(/[/.]/g, '-').slice(0, 7),
      descriptions: [{ id: `desc-${i + 1}-1`, text: '(mock) 工作职责待 LLM 解析' }],
    };
  });

  return {
    basicProfile: {
      name: nameMatch?.[1]?.trim() ?? (text.slice(0, 20).replace(/[#*\-\n]/g, '').trim() || '未知姓名'),
    },
    contact: {
      phone: phoneMatch?.[1],
      email: emailMatch?.[1],
    },
    jobPreference: salaryMatch ? { expectedSalaryRange: salaryMatch[1] } : undefined,
    workExperiences: workExperiences.length > 0 ? workExperiences : [{
      id: 'work-1',
      companyName: '(mock) 待解析',
      position: '(mock) 待解析',
      startDate: '2020-01',
      descriptions: [{ id: 'desc-1-1', text: '(mock) 待 LLM 解析' }],
    }],
    educations: [{
      id: 'edu-1',
      school: '(mock) 待解析',
      major: '(mock) 待解析',
      degree: '本科',
      startDate: '2016-09',
      endDate: '2020-07',
    }],
    skills: [{ name: '(mock) 待 LLM 提取' }],
  };
}
