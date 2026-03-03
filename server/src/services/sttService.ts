/**
 * STT（语音转文字）服务
 * MVP 阶段使用 mock 模式
 * 生产环境接入讯飞 / 阿里云
 */
import { getEnv } from '../config/env.js';

/**
 * 将音频文件转为文字
 * @param audioPath 音频文件路径
 * @returns 转写文本
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  const env = getEnv();

  if (env.STT_PROVIDER === 'mock') {
    console.log(`🎙️ [Mock STT] Transcribing: ${audioPath}`);
    return '(mock 转写结果) 这是一段模拟的语音转写文本，实际内容需接入 STT 服务后生成。';
  }

  // TODO: 接入讯飞 / 阿里云 STT
  throw new Error(`STT provider "${env.STT_PROVIDER}" not implemented yet`);
}
