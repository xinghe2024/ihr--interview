/**
 * LLM 统一适配层
 *
 * deepseek / qwen / moonshot 均兼容 OpenAI Chat Completions API，
 * 因此统一使用 openai SDK，通过 baseURL 切换供应商。
 */
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions.mjs';
import { getEnv } from '../config/env.js';

// 每个供应商的默认配置
const PROVIDER_DEFAULTS: Record<string, { baseURL: string; model: string }> = {
  deepseek:   { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
  qwen:       { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  moonshot:   { baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  volcengine: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', model: 'deepseek-v3-1-terminus' },
};

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    // mock 模式不需要真实客户端，chat() 会直接返回
    _client = null as unknown as OpenAI;
    return _client;
  }

  const defaults = PROVIDER_DEFAULTS[env.LLM_PROVIDER];
  if (!defaults) throw new Error(`Unknown LLM provider: ${env.LLM_PROVIDER}`);

  if (!env.LLM_API_KEY) {
    throw new Error(`LLM_API_KEY is required for provider "${env.LLM_PROVIDER}"`);
  }

  _client = new OpenAI({
    apiKey: env.LLM_API_KEY,
    baseURL: env.LLM_BASE_URL || defaults.baseURL,
  });

  return _client;
}

// ─── 公共接口 ───────────────────────────────────

export interface ChatOptions {
  /** 系统提示词 */
  systemPrompt?: string;
  /** 对话历史 */
  messages?: ChatCompletionMessageParam[];
  /** 覆盖默认模型 */
  model?: string;
  /** 温度 0-2 */
  temperature?: number;
  /** 最大输出 token */
  maxTokens?: number;
  /** JSON mode（部分模型支持） */
  jsonMode?: boolean;
}

/**
 * 统一的 LLM 对话接口
 * @returns AI 回复的文本内容
 */
export async function chat(prompt: string, options: ChatOptions = {}): Promise<string> {
  const env = getEnv();

  // ─── Mock 模式 ────────────────────────────────
  if (env.LLM_PROVIDER === 'mock') {
    return `[mock] Received: ${prompt.slice(0, 100)}...`;
  }

  // ─── 真实调用 ─────────────────────────────────
  const client = getClient();
  const defaults = PROVIDER_DEFAULTS[env.LLM_PROVIDER]!;
  const model = options.model || env.LLM_MODEL || defaults.model;

  const messages: ChatCompletionMessageParam[] = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  if (options.messages) {
    messages.push(...options.messages);
  }

  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  return response.choices[0]?.message?.content ?? '';
}

// ─── Tool-calling 接口 ─────────────────────────

export interface ChatWithToolsOptions extends ChatOptions {
  /** OpenAI 格式工具定义 */
  tools: ChatCompletionTool[];
  /** 工具执行回调，由调用方注入 */
  executeToolCall: (name: string, args: Record<string, unknown>) => Promise<string>;
  /** 最大循环轮次（防死循环），默认 3 */
  maxIterations?: number;
}

export interface ChatWithToolsResult {
  /** LLM 最终文本回复 */
  content: string;
  /** 所有被执行的工具调用记录 */
  executedToolCalls: Array<{ name: string; args: Record<string, unknown>; result: string }>;
}

/**
 * 带 function-calling 的 LLM 对话
 * 循环：LLM 请求工具 → 执行 → 结果回传 → LLM 继续，直到 LLM 输出纯文本
 */
export async function chatWithTools(
  prompt: string,
  options: ChatWithToolsOptions,
): Promise<ChatWithToolsResult> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return { content: `[mock] Received: ${prompt.slice(0, 100)}...`, executedToolCalls: [] };
  }

  const client = getClient();
  const defaults = PROVIDER_DEFAULTS[env.LLM_PROVIDER]!;
  const model = options.model || env.LLM_MODEL || defaults.model;
  const maxIterations = options.maxIterations ?? 3;

  const messages: ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  if (options.messages) {
    messages.push(...options.messages);
  }
  messages.push({ role: 'user', content: prompt });

  const executedToolCalls: ChatWithToolsResult['executedToolCalls'] = [];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: options.tools,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    if (!choice) break;

    const assistantMessage = choice.message;
    messages.push(assistantMessage as ChatCompletionMessageParam);

    // 无 tool_calls → 最终回复
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return { content: assistantMessage.content ?? '', executedToolCalls };
    }

    // 执行每个 tool call（只处理 function 类型）
    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== 'function') continue;

      const fnName = toolCall.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch { /* 参数解析失败用空对象 */ }

      let result: string;
      try {
        result = await options.executeToolCall(fnName, args);
      } catch (err) {
        result = JSON.stringify({ error: err instanceof Error ? err.message : '工具执行失败' });
      }

      executedToolCalls.push({ name: fnName, args, result });

      const toolMessage: ChatCompletionToolMessageParam = {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      };
      messages.push(toolMessage);
    }
  }

  // 超过最大轮次 → 最后一次不带 tools 强制文本回复
  const finalResponse = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.maxTokens ?? 4096,
  });

  return {
    content: finalResponse.choices[0]?.message?.content ?? '抱歉，处理过程出现了问题，请稍后再试。',
    executedToolCalls,
  };
}

/**
 * 测试 LLM 连接
 */
export async function testLLM(): Promise<boolean> {
  try {
    const reply = await chat('请回复"ok"', { temperature: 0, maxTokens: 10 });
    console.log(`✅ LLM connected (${getEnv().LLM_PROVIDER}): "${reply.slice(0, 50)}"`);
    return true;
  } catch (err) {
    console.error('❌ LLM connection failed:', err);
    return false;
  }
}
