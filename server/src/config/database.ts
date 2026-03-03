/**
 * Supabase 数据库客户端
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let _supabase: SupabaseClient | null = null;

/**
 * 数据库是否已配置
 */
export function isDbConfigured(): boolean {
  const env = getEnv();
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * 获取 Supabase 客户端（单例）
 * 未配置时抛出可读错误，路由层统一捕获返回 503
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const env = getEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new DbNotConfiguredError();
  }

  _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _supabase;
}

/** 专用错误类型，中间件可据此返回 503 而非 500 */
export class DbNotConfiguredError extends Error {
  constructor() {
    super('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    this.name = 'DbNotConfiguredError';
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    // 表不存在也算连接成功（error.code = '42P01' 意味着连接通了但表不在）
    if (error && error.code !== '42P01') {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connected');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
}
