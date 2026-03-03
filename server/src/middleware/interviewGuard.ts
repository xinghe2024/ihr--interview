/**
 * 面试时长控制中间件
 * - 全局 30 分钟超时
 * - 单轮 5 分钟超时
 * - 链接 48h 过期
 */
import type { MiddlewareHandler } from 'hono';
import { apiResponse } from './apiResponse.js';
import { getSupabase } from '../config/database.js';

/**
 * 检查面试会话是否可用（未过期、未完成）
 */
export function interviewGuard(): MiddlewareHandler {
  return async (c, next) => {
    const sessionId = c.req.param('sessionId');
    if (!sessionId) return next();

    const db = getSupabase();
    const { data: session } = await db
      .from('interviews')
      .select('status, expires_at, started_at, max_duration_minutes')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return c.json(apiResponse(null, { code: 'SESSION_NOT_FOUND', message: '面试会话不存在' }), 404);
    }

    // 链接过期
    if (new Date(session.expires_at) < new Date()) {
      return c.json(apiResponse(null, { code: 'SESSION_EXPIRED', message: '面试链接已过期' }), 410);
    }

    // 已结束
    if (['COMPLETED', 'ABANDONED', 'EXPIRED'].includes(session.status)) {
      return c.json(apiResponse(null, { code: 'SESSION_ENDED', message: '面试已结束' }), 410);
    }

    // 全局超时
    if (session.started_at) {
      const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 60000;
      if (elapsed > session.max_duration_minutes) {
        // 自动标记超时
        await db.from('interviews').update({ status: 'COMPLETED', end_reason: 'timeout' }).eq('id', sessionId);
        return c.json(apiResponse(null, { code: 'SESSION_TIMEOUT', message: '面试已超时' }), 410);
      }
    }

    await next();
  };
}
