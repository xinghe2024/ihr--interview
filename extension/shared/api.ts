/**
 * 统一 API 客户端
 * 自动携带 JWT，处理 401 重试
 */
import { NEXUS_API_BASE } from './constants.js';
import { getJwt } from './auth.js';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 带认证的 API 请求
 * 自动添加 Authorization header
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
  const jwt = await getJwt();
  if (!jwt) {
    return { success: false, error: { code: 'NOT_AUTHENTICATED', message: '未登录' } };
  }

  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${NEXUS_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
