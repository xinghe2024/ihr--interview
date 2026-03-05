/**
 * Sidebar Agent 对话路由 (M5)
 * POST   /api/chat/messages  — 发送消息
 * GET    /api/chat/messages  — 对话历史
 * DELETE /api/chat/messages  — 清空历史
 */
import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';

import { getSupabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { processSidebarMessage } from '../agents/sidebarAgent.js';
import type { ChatMessageResponse, ChatHistoryResponse } from '@shared/types.js';

const chatRoutes = new Hono();

chatRoutes.use('*', requireAuth());

// ─── POST /messages ─────────────────────────────
chatRoutes.post('/messages', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const body = await c.req.json();
  const content = body.content as string;
  const browserContext = body.browserContext as {
    currentUrl?: string; pageTitle?: string; selectedText?: string;
  } | undefined;

  if (!content?.trim()) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '消息内容不能为空' }), 400);
  }

  // 获取最近 10 条历史（降序取，再翻转为时间正序）
  const { data: historyRows } = await db
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(10);

  historyRows?.reverse();

  const history = (historyRows ?? []).map((r: any) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content,
  }));

  // 保存用户消息
  const userMsgId = uuid();
  await db.from('chat_history').insert({
    id: userMsgId,
    user_id: user.userId,
    role: 'user',
    content,
  });

  // Sidebar Agent 处理
  const result = await processSidebarMessage(user.userId, content, history, browserContext);

  // 保存 AI 回复
  const aiMsgId = uuid();
  await db.from('chat_history').insert({
    id: aiMsgId,
    user_id: user.userId,
    role: 'assistant',
    content: result.content,
    actions: result.actions ?? null,
  });

  const res: ChatMessageResponse = {
    userMessageId: userMsgId,
    aiReply: {
      id: aiMsgId,
      content: result.content,
      actions: result.actions,
    },
  };
  return c.json(apiResponse(res));
});

// ─── GET /messages ──────────────────────────────
chatRoutes.get('/messages', async (c) => {
  const user = c.get('user');
  const db = getSupabase();

  const { data: rows } = await db
    .from('chat_history')
    .select('*')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: true })
    .limit(100);

  const res: ChatHistoryResponse = {
    messages: (rows ?? []).map((r: any) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      actions: r.actions,
      createdAt: r.created_at,
    })),
  };
  return c.json(apiResponse(res));
});

// ─── DELETE /messages ───────────────────────────
chatRoutes.delete('/messages', async (c) => {
  const user = c.get('user');
  const db = getSupabase();

  const { count } = await db
    .from('chat_history')
    .delete({ count: 'exact' })
    .eq('user_id', user.userId);

  return c.json(apiResponse({ cleared: true, deletedCount: count ?? 0 }));
});

export default chatRoutes;
