/**
 * 环境变量统一管理
 * 所有配置走环境变量，零硬编码
 */
import { config } from 'dotenv';
import { z } from 'zod';

const envSchema = z.object({
  // 服务器
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // 数据库（Supabase）
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // LLM（多模型支持）
  LLM_PROVIDER: z.enum(['deepseek', 'qwen', 'moonshot', 'volcengine', 'mock']).default('mock'),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_MODEL: z.string().optional(),

  // STT（语音转文字）
  STT_PROVIDER: z.enum(['xfyun', 'aliyun', 'mock']).default('mock'),
  STT_API_KEY: z.string().optional(),
  STT_API_SECRET: z.string().optional(),

  // SMS（短信验证码）
  SMS_PROVIDER: z.enum(['aliyun', 'mock']).default('mock'),
  SMS_API_KEY: z.string().optional(),
  SMS_API_SECRET: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  JWT_EXPIRES_IN: z.coerce.number().default(7200), // 2 小时
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().default(604800), // 7 天

  // 文件上传
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),

  // 日志目录（生产环境文件日志）
  LOG_DIR: z.string().default('/data/logs/ailin-server'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // 智联招聘 API
  ZHAOPIN_API_BASE: z.string().default('https://cgate.zhaopin.com'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  // 开发环境加载 .env 文件
  if (process.env.NODE_ENV !== 'production') {
    config({ path: '../.env' });
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment variable validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) return loadEnv();
  return _env;
}
