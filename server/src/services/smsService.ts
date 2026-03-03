/**
 * 短信验证码服务
 * MVP 阶段使用 mock 模式（验证码打印到控制台）
 * 生产环境接入阿里云 SMS
 */
import { getEnv } from '../config/env.js';

// 内存存储：phone → { code, expiresAt }
const codeStore = new Map<string, { code: string; expiresAt: number }>();

const CODE_LENGTH = 6;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效

function generateCode(): string {
  return Math.random().toString().slice(2, 2 + CODE_LENGTH);
}

/** 发送验证码，返回生成的验证码（mock 模式下用于测试自动化） */
export async function sendVerificationCode(phone: string): Promise<string> {
  const env = getEnv();
  // Mock 模式使用固定验证码 1234，方便手动测试
  const code = env.SMS_PROVIDER === 'mock' ? '1234' : generateCode();

  codeStore.set(phone, { code, expiresAt: Date.now() + CODE_TTL_MS });

  if (env.SMS_PROVIDER === 'mock') {
    console.log(`📱 [Mock SMS] ${phone} → 验证码: ${code}`);
    return code;
  }

  // TODO: 接入阿里云 SMS
  throw new Error(`SMS provider "${env.SMS_PROVIDER}" not implemented yet`);
}

/** 验证验证码，成功后自动销毁 */
export function verifyCode(phone: string, code: string): boolean {
  const entry = codeStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(phone);
    return false;
  }
  if (entry.code !== code) return false;

  codeStore.delete(phone);
  return true;
}
