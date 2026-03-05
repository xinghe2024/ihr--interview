/**
 * Sidebar Agent
 * HR 侧边栏对话 Agent — function-calling 模式
 */
import { chatWithTools } from '../services/llmService.js';
import { SIDEBAR_SYSTEM_PROMPT, SIDEBAR_TOOLS } from '../prompts/sidebar.js';
import { getToolHandler, type ToolContext, type ToolResult } from '../services/sidebarToolHandlers.js';
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
  browserContext?: { currentUrl?: string; pageTitle?: string; selectedText?: string },
): Promise<SidebarResponse> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return mockSidebarResponse(userId, message);
  }

  // 工具执行上下文
  const toolCtx: ToolContext = { userId, browserContext };

  // 收集所有工具产生的前端 actions
  const collectedActions: ChatAgentAction[] = [];

  // 注入浏览器上下文到 system prompt
  let systemPrompt = SIDEBAR_SYSTEM_PROMPT;
  if (browserContext) {
    const ctxStr = [
      browserContext.currentUrl && `- 当前页面: ${browserContext.currentUrl}`,
      browserContext.pageTitle && `- 页面标题: ${browserContext.pageTitle}`,
      browserContext.selectedText && `- 选中文本: ${browserContext.selectedText}`,
    ].filter(Boolean).join('\n');
    systemPrompt = systemPrompt.replace('{browserContext}', ctxStr || '（无上下文信息）');
  } else {
    systemPrompt = systemPrompt.replace('{browserContext}', '（无上下文信息）');
  }

  // 执行 tool-calling 循环
  const result = await chatWithTools(message, {
    systemPrompt,
    messages: history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    tools: SIDEBAR_TOOLS,
    temperature: 0.5,
    maxIterations: 3,
    executeToolCall: async (name, args) => {
      console.log(`[Sidebar Agent] LLM called tool: ${name}`, JSON.stringify(args));
      const handler = getToolHandler(name);
      if (!handler) {
        console.log(`[Sidebar Agent] Unknown tool: ${name}`);
        return JSON.stringify({ error: `未知工具: ${name}` });
      }

      const toolResult: ToolResult = await handler(args, toolCtx);

      if (toolResult.actions) {
        collectedActions.push(...toolResult.actions);
      }

      return JSON.stringify(toolResult.data);
    },
  });

  return {
    content: result.content,
    actions: collectedActions.length > 0 ? collectedActions : undefined,
  };
}

/**
 * Mock 回复 + 简单意图识别
 */
async function mockSidebarResponse(userId: string, message: string): Promise<SidebarResponse> {
  const lower = message.toLowerCase();

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

  if (lower.includes('通知') || lower.includes('动态') || lower.includes('消息')) {
    return { content: '(mock) 您目前没有未读通知。' };
  }

  if (lower.includes('统计') || lower.includes('多少') || lower.includes('概况')) {
    return { content: '(mock) 待触达: 0, 面试中: 0, 已交付: 0。配置数据库后可查看真实数据。' };
  }

  return {
    content: `(mock) 收到你的消息："${message.slice(0, 50)}"。我可以帮你查询候选人、查看通知、或者创建面试邀约。请问需要什么帮助？`,
  };
}
