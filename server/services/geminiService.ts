/**
 * Gemini API 工具函数
 * 用于与 Google Gemini API 进行交互
 */
/// <reference types="vite/client" />

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 获取 Gemini API 实例
 * @returns GoogleGenerativeAI 实例
 */
export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || import.meta.env.GEMINI_API_KEY || import.meta.env.API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error('请配置 GEMINI_API_KEY 环境变量。请在 .env.local 文件中设置您的 Gemini API Key。');
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * 发送消息到 Gemini API
 * @param prompt - 用户输入的提示词
 * @param systemPrompt - 系统提示词（可选）
 * @returns Promise<string> - AI 的回复
 */
export async function sendMessageToGemini(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      systemInstruction: systemPrompt || '你是一个专业的招聘助手，帮助HR分析候选人简历和进行面试沟通。'
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API 调用失败:', error);
    throw error;
  }
}

/**
 * 流式发送消息到 Gemini API
 * @param prompt - 用户输入的提示词
 * @param systemPrompt - 系统提示词（可选）
 * @param onChunk - 接收文本块的回调函数
 * @returns Promise<void>
 */
export async function sendStreamMessageToGemini(
  prompt: string,
  onChunk: (chunk: string) => void,
  systemPrompt?: string
): Promise<void> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      systemInstruction: systemPrompt || '你是一个专业的招聘助手，帮助HR分析候选人简历和进行面试沟通。'
    });

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      onChunk(chunkText);
    }
  } catch (error) {
    console.error('Gemini API 流式调用失败:', error);
    throw error;
  }
}
