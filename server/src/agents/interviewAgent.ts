/**
 * Interview Agent
 * 控制面试对话流程：接收候选人消息 → 决定追问/切题/结束
 */
import { chat } from '../services/llmService.js';
import { INTERVIEW_SYSTEM_PROMPT, buildInterviewContext } from '../prompts/interview.js';
import { getEnv } from '../config/env.js';
import type { KSQItem, InterviewMessage } from '@shared/types.js';

export interface InterviewTurnResult {
  /** AI 回复内容 */
  reply: string;
  /** 当前考察的 KSQ index */
  currentKsqIndex: number;
  /** 面试是否应结束 */
  shouldEnd: boolean;
  /** 当前考察的话题 */
  topic?: string;
}

export interface InterviewState {
  candidateName: string;
  role: string;
  ksqItems: KSQItem[];
  currentKsqIndex: number;
  startedAt: Date;
  maxDurationMinutes: number;
}

/**
 * 生成面试开场白
 */
export async function generateOpening(state: InterviewState): Promise<string> {
  const env = getEnv();

  if (env.LLM_PROVIDER === 'mock') {
    return `你好 ${state.candidateName}，我是艾琳，感谢你参加这次面试。` +
      `本次面试大约 ${state.maxDurationMinutes} 分钟，我会围绕你的经历问几个问题。` +
      `准备好了我们就开始吧！\n\n` +
      `首先想了解一下：${state.ksqItems[0]?.topic ?? '请介绍一下你最近的工作经历'}`;
  }

  const context = buildInterviewContext({
    candidateName: state.candidateName,
    role: state.role,
    ksqTopics: state.ksqItems.map(k => k.topic),
    elapsedMinutes: 0,
    maxMinutes: state.maxDurationMinutes,
    currentKsqIndex: 0,
    totalKsqs: state.ksqItems.length,
  });

  try {
    return await chat(`${context}\n\n请生成面试开场白，包含自我介绍和第一个问题。`, {
      systemPrompt: INTERVIEW_SYSTEM_PROMPT,
      temperature: 0.7,
    });
  } catch (err) {
    console.error('[InterviewAgent] LLM call failed in generateOpening, using fallback:', err);
    return `你好 ${state.candidateName}，我是艾琳，感谢你参加这次面试。` +
      `本次面试大约 ${state.maxDurationMinutes} 分钟，我会围绕你的经历问几个问题。` +
      `准备好了我们就开始吧！\n\n` +
      `首先想了解一下：${state.ksqItems[0]?.topic ?? '请介绍一下你最近的工作经历'}`;
  }
}

/**
 * 处理一轮对话：接收候选人消息，返回 AI 回复
 */
export async function processMessage(
  state: InterviewState,
  history: Array<{ role: 'ai' | 'candidate'; content: string }>,
  candidateMessage: string,
): Promise<InterviewTurnResult> {
  const env = getEnv();
  const elapsed = (Date.now() - state.startedAt.getTime()) / 60000;
  const timeUp = elapsed >= state.maxDurationMinutes;

  // 超时 → 结束
  if (timeUp) {
    return {
      reply: `感谢你的时间，${state.candidateName}。我们本次面试就到这里，后续结果会由招聘方通知你，祝一切顺利！`,
      currentKsqIndex: state.currentKsqIndex,
      shouldEnd: true,
    };
  }

  // Mock 模式
  if (env.LLM_PROVIDER === 'mock') {
    return mockProcessMessage(state, history, candidateMessage, elapsed);
  }

  // 真实 LLM 对话
  const context = buildInterviewContext({
    candidateName: state.candidateName,
    role: state.role,
    ksqTopics: state.ksqItems.map(k => k.topic),
    elapsedMinutes: Math.round(elapsed),
    maxMinutes: state.maxDurationMinutes,
    currentKsqIndex: state.currentKsqIndex,
    totalKsqs: state.ksqItems.length,
  });

  const messages = history.map(m => ({
    role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  let reply: string;
  try {
    reply = await chat(candidateMessage, {
      systemPrompt: `${INTERVIEW_SYSTEM_PROMPT}\n\n${context}`,
      messages,
      temperature: 0.7,
    });
  } catch (err) {
    console.error('[InterviewAgent] LLM call failed, falling back to mock:', err);
    // LLM 调用失败 → 降级为 mock 回复，保证面试不中断
    return mockProcessMessage(state, history, candidateMessage, elapsed);
  }

  // 简单启发式判断是否切到下一个 KSQ
  const nextIndex = detectTopicSwitch(reply, state);

  return {
    reply,
    currentKsqIndex: nextIndex,
    shouldEnd: nextIndex >= state.ksqItems.length,
    topic: state.ksqItems[nextIndex]?.topic,
  };
}

/**
 * Mock 对话处理
 */
function mockProcessMessage(
  state: InterviewState,
  history: Array<{ role: string; content: string }>,
  candidateMessage: string,
  elapsedMinutes: number,
): InterviewTurnResult {
  const turnCount = history.filter(m => m.role === 'candidate').length;
  const ksqCount = state.ksqItems.length;

  // 每 3 轮切一个 KSQ
  const newIndex = Math.min(Math.floor(turnCount / 3), ksqCount - 1);
  const isLastKsq = newIndex >= ksqCount - 1;
  const shouldEnd = isLastKsq && turnCount % 3 === 2;

  if (shouldEnd) {
    return {
      reply: `非常感谢你的详细回答，${state.candidateName}。本次面试到此结束，后续结果会由招聘方通知你。祝你一切顺利！`,
      currentKsqIndex: newIndex,
      shouldEnd: true,
    };
  }

  const currentKsq = state.ksqItems[newIndex];
  const withinKsqTurn = turnCount % 3;

  let reply: string;
  if (withinKsqTurn === 0 && newIndex > state.currentKsqIndex) {
    // 切换到新话题
    reply = `好的，了解了。接下来我想聊聊另一个话题：${currentKsq?.topic ?? '你的技术经验'}`;
  } else {
    // 追问
    reply = `(mock) 关于"${currentKsq?.topic ?? '当前话题'}"，能再具体说说细节吗？比如具体的数据指标或你个人的贡献？`;
  }

  return {
    reply,
    currentKsqIndex: newIndex,
    shouldEnd: false,
    topic: currentKsq?.topic,
  };
}

/** 简单检测是否提到了下一个 KSQ 话题 */
function detectTopicSwitch(reply: string, state: InterviewState): number {
  const next = state.currentKsqIndex + 1;
  if (next >= state.ksqItems.length) return state.currentKsqIndex;

  const nextTopic = state.ksqItems[next]!.topic;
  if (reply.includes(nextTopic) || reply.includes('下一个') || reply.includes('接下来')) {
    return next;
  }
  return state.currentKsqIndex;
}
