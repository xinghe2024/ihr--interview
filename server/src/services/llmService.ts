/**
 * LLM 统一适配层
 *
 * deepseek / qwen / moonshot 均兼容 OpenAI Chat Completions API，
 * 因此统一使用 openai SDK，通过 baseURL 切换供应商。
 */
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
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
