/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 中提取并验证 JWT
 */
import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../services/jwtService.js';
import { apiResponse } from './apiResponse.js';
import type { TokenPayload } from '@shared/types.js';

// 扩展 Hono Context 的变量类型
declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json(
        apiResponse(null, { code: 'AUTH_MISSING', message: 'Missing or invalid Authorization header' }),
        401,
      );
    }

    const token = header.slice(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return c.json(
        apiResponse(null, { code: 'AUTH_INVALID', message: 'Invalid or expired token' }),
        401,
      );
    }

    c.set('user', payload);
    await next();
  };
}
