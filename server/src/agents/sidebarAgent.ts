/**
 * Sidebar Agent
 * HR 侧边栏对话 Agent（function-calling 模式）
 * MVP 阶段简化实现：关键词匹配 + LLM 回复
 */
import { chat } from '../services/llmService.js';
import { SIDEBAR_SYSTEM_PROMPT } from '../prompts/sidebar.js';
import { getEnv } from '../config/env.js';
import { getSupabase } from '../config/database.js';
import type { ChatAgentAction } from '@shared/types.js';

export interface SidebarResponse {
  content: string;
  actions?: ChatAgentAction[];
}

/**
 * 处理 HR 的对话消息
 */
export async function processSidebarMessage(
  userId: string,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<SidebarResponse> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return mockSidebarResponse(userId, message);
  }

  // 真实 LLM
  const messages = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const reply = await chat(message, {
    systemPrompt: SIDEBAR_SYSTEM_PROMPT,
    messages,
    temperature: 0.5,
  });

  // 简单检测是否包含导航意图
  const actions = detectActions(reply, message);

  return { content: reply, actions };
}

/**
 * Mock 回复 + 简单意图识别
 */
async function mockSidebarResponse(userId: string, message: string): Promise<SidebarResponse> {
  const lower = message.toLowerCase();

  // 查询候选人
  if (lower.includes('候选人') && (lower.includes('查') || lower.includes('找') || lower.includes('搜'))) {
    try {
      const db = getSupabase();
      const { count } = await db
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        content: `当前共有 ${count ?? 0} 位候选人。需要我帮你查看具体哪位的信息吗？`,
        actions: [{ type: 'navigate', payload: { page: 'dashboard' } }],
      };
    } catch {
      return { content: '(mock) 数据库未配置，无法查询候选人。' };
    }
  }

  // 通知
  if (lower.includes('通知') || lower.includes('动态') || lower.includes('消息')) {
    return {
      content: '(mock) 您目前没有未读通知。',
    };
  }

  // 统计
  if (lower.includes('统计') || lower.includes('多少') || lower.includes('概况')) {
    return {
      content: '(mock) 待触达: 0, 面试中: 0, 已交付: 0。配置数据库后可查看真实数据。',
    };
  }

  // 默认回复
  return {
    content: `(mock) 收到你的消息："${message.slice(0, 50)}"。我可以帮你查询候选人、查看通知、或者创建面试邀约。请问需要什么帮助？`,
  };
}

/** 从回复中检测导航 action */
function detectActions(reply: string, userMessage: string): ChatAgentAction[] | undefined {
  const actions: ChatAgentAction[] = [];

  if (userMessage.includes('报告') || reply.includes('查看报告')) {
    actions.push({ type: 'show_report', payload: {} });
  }
  if (userMessage.includes('面板') || userMessage.includes('总览')) {
    actions.push({ type: 'navigate', payload: { page: 'dashboard' } });
  }

  return actions.length > 0 ? actions : undefined;
}
