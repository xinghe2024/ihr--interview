/**
 * 通知路由 (M5)
 * GET   /api/notifications/summary    — 通知摘要
 * PATCH /api/notifications/:id/read   — 标记单条已读
 * PATCH /api/notifications/read-all   — 全部标记已读
 */
import { Hono } from 'hono';

import { getSupabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { apiResponse } from '../middleware/apiResponse.js';
import type { NotificationSummaryResponse, CandidateUpdateEvent } from '@shared/types.js';

const notifications = new Hono();

notifications.use('*', requireAuth());

// ─── GET /summary ───────────────────────────────
notifications.get('/summary', async (c) => {
  const user = c.get('user');
  const db = getSupabase();

  // 未读数
  const { count: unreadCount } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.userId)
    .eq('is_read', false);

  // 最近 50 条事件
  const { data: rows } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const events: CandidateUpdateEvent[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    candidateId: r.candidate_id,
    candidateName: r.candidate_name,
    candidateRole: r.candidate_role,
    eventType: r.event_type,
    message: r.message,
    severity: r.severity,
    isRead: r.is_read,
    createdAt: r.created_at,
  }));

  const res: NotificationSummaryResponse = {
    unreadCount: unreadCount ?? 0,
    events,
  };
  return c.json(apiResponse(res));
});

// ─── PATCH /:id/read ────────────────────────────
notifications.patch('/:id/read', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const id = c.req.param('id');

  await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.userId);

  return c.json(apiResponse({ id, isRead: true }));
});

// ─── PATCH /read-all ────────────────────────────
notifications.patch('/read-all', async (c) => {
  const user = c.get('user');
  const db = getSupabase();

  const { count } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.userId)
    .eq('is_read', false);

  return c.json(apiResponse({ updatedCount: count ?? 0 }));
});

export default notifications;
