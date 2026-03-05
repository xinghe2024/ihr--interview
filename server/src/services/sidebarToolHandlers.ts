/**
 * Sidebar Agent Tool Handlers
 * 每个 handler 查询数据库，所有查询都带 user_id 隔离
 */
import { getSupabase } from '../config/database.js';
import { v4 as uuid } from 'uuid';
import type { ChatAgentAction } from '@shared/types.js';

// ─── Types ─────────────────────────────────────

export interface ToolContext {
  userId: string;
  browserContext?: {
    currentUrl?: string;
    pageTitle?: string;
    selectedText?: string;
  };
}

export interface ToolResult {
  /** 返回给 LLM 的数据 */
  data: unknown;
  /** 前端 UI 动作 */
  actions?: ChatAgentAction[];
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<ToolResult>;

// ─── Handler Registry ─────────────────────────

const handlers = new Map<string, ToolHandler>();

export function getToolHandler(name: string): ToolHandler | undefined {
  return handlers.get(name);
}

// ─── 1. query_candidate ───────────────────────

handlers.set('query_candidate', async (args, ctx) => {
  const db = getSupabase();
  const { candidateId, name } = args as { candidateId?: string; name?: string };

  console.log(`[Sidebar Tool] query_candidate: candidateId=${candidateId}, name="${name}", userId=${ctx.userId}`);

  if (candidateId) {
    const { data, error } = await db
      .from('candidates')
      .select('id, name, role, status, recommendation, updated_at')
      .eq('id', candidateId)
      .eq('user_id', ctx.userId)
      .single();

    if (error || !data) {
      console.log(`[Sidebar Tool] query by ID failed:`, error?.message ?? 'no data');
      return { data: { error: '未找到该候选人' } };
    }

    const { data: timeline } = await db
      .from('timeline_events')
      .select('event_code, title, detail, created_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      data: { candidate: data, recentEvents: timeline ?? [] },
      actions: [{ type: 'show_candidate' as const, payload: { candidateId: data.id } }],
    };
  }

  if (name) {
    const { data, error } = await db
      .from('candidates')
      .select('id, name, role, status, recommendation, updated_at')
      .eq('user_id', ctx.userId)
      .ilike('name', `%${name}%`)
      .limit(5);

    console.log(`[Sidebar Tool] query by name "${name}": found=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);

    if (error || !data || data.length === 0) {
      return { data: { error: `未找到名为"${name}"的候选人` } };
    }

    if (data.length === 1) {
      const { data: timeline } = await db
        .from('timeline_events')
        .select('event_code, title, detail, created_at')
        .eq('candidate_id', data[0].id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        data: { candidate: data[0], recentEvents: timeline ?? [] },
        actions: [{ type: 'show_candidate' as const, payload: { candidateId: data[0].id } }],
      };
    }

    return {
      data: { candidates: data, message: `找到 ${data.length} 位匹配的候选人` },
    };
  }

  return { data: { error: '请提供候选人 ID 或姓名' } };
});

// ─── 2. list_candidates ──────────────────────

handlers.set('list_candidates', async (args, ctx) => {
  const db = getSupabase();
  const { status, verdict, limit = 10 } = args as {
    status?: string;
    verdict?: string;
    limit?: number;
  };

  let query = db
    .from('candidates')
    .select('id, name, role, status, recommendation, updated_at')
    .eq('user_id', ctx.userId);

  if (status) query = query.eq('status', status);
  if (verdict) query = query.eq('recommendation', verdict);

  query = query.order('updated_at', { ascending: false }).limit(Math.min(limit, 20));

  const { data, error } = await query;
  if (error) return { data: { error: '查询失败' } };

  return {
    data: { candidates: data ?? [], total: data?.length ?? 0 },
    actions: [{ type: 'navigate' as const, payload: { page: 'dashboard' } }],
  };
});

// ─── 3. create_interview ─────────────────────

handlers.set('create_interview', async (args, ctx) => {
  const db = getSupabase();
  const { candidateId, channel = 'TEXT', ksqItems = [] } = args as {
    candidateId: string;
    channel?: 'TEXT' | 'VOICE';
    ksqItems?: Array<{ id: string; topic: string; rubric: string }>;
  };

  // 校验候选人归属
  const { data: candidate } = await db
    .from('candidates')
    .select('id, name, role, ksq_items')
    .eq('id', candidateId)
    .eq('user_id', ctx.userId)
    .single();

  if (!candidate) {
    return { data: { error: '未找到该候选人，无法创建面试' } };
  }

  // 没传 KSQ 则用候选人已有的
  let finalKsqItems = ksqItems.length > 0 ? ksqItems : (candidate.ksq_items ?? []);
  if (!finalKsqItems || finalKsqItems.length === 0) {
    return { data: { error: '该候选人尚未生成考察问题(KSQ)，请先解析简历' } };
  }

  const sessionId = uuid();
  const expiresAt = new Date(Date.now() + 48 * 3600_000).toISOString();

  await db.from('interviews').insert({
    id: sessionId,
    candidate_id: candidateId,
    user_id: ctx.userId,
    channel,
    status: 'CREATED',
    ksq_items: finalKsqItems,
    baseline_items: [],
    max_duration_minutes: 30,
    expires_at: expiresAt,
  });

  await db.from('candidates').update({ status: 'PENDING_OUTREACH' }).eq('id', candidateId);
  await db.from('timeline_events').insert({
    candidate_id: candidateId,
    event_code: 'TASK_CREATED',
    title: '面试邀约已创建',
    detail: `渠道: ${channel}，有效期: 48h`,
  });

  const inviteUrl = `https://app.ailin.ai/i/${sessionId}`;
  const inviteText = `您好 ${candidate.name}，诚邀您参加「${candidate.role}」岗位的线上初面，请点击链接开始：${inviteUrl}（48小时内有效）`;

  return {
    data: { sessionId, inviteUrl, inviteText, expiresAt },
    actions: [{ type: 'create_interview' as const, payload: { sessionId, inviteUrl, candidateId } }],
  };
});

// ─── 4. update_ksq ───────────────────────────

handlers.set('update_ksq', async (args, ctx) => {
  const db = getSupabase();
  const { sessionId, ksqItems } = args as {
    sessionId: string;
    ksqItems: Array<{ id: string; topic: string; rubric: string }>;
  };

  const { data: session } = await db
    .from('interviews')
    .select('id, status, user_id')
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .single();

  if (!session) {
    return { data: { error: '未找到该面试会话' } };
  }

  if (!['CREATED', 'LANDING_OPENED'].includes(session.status)) {
    return { data: { error: '面试已开始或已结束，无法修改考察问题' } };
  }

  await db.from('interviews').update({ ksq_items: ksqItems }).eq('id', sessionId);

  return { data: { success: true, message: `已更新 ${ksqItems.length} 道考察问题` } };
});

// ─── 5. get_report ───────────────────────────

handlers.set('get_report', async (args, ctx) => {
  const db = getSupabase();
  const { candidateId, sessionId } = args as { candidateId?: string; sessionId?: string };

  let targetCandidateId = candidateId;

  if (sessionId && !targetCandidateId) {
    const { data: session } = await db
      .from('interviews')
      .select('candidate_id')
      .eq('id', sessionId)
      .eq('user_id', ctx.userId)
      .single();

    if (!session) return { data: { error: '未找到该面试会话' } };
    targetCandidateId = session.candidate_id;
  }

  if (!targetCandidateId) {
    return { data: { error: '请提供候选人 ID 或面试会话 ID' } };
  }

  const { data: candidate } = await db
    .from('candidates')
    .select('id, name, role, status, recommendation, observations, ksq_items')
    .eq('id', targetCandidateId)
    .eq('user_id', ctx.userId)
    .single();

  if (!candidate) {
    return { data: { error: '未找到该候选人' } };
  }

  if (candidate.status !== 'DELIVERED') {
    return { data: { error: `报告尚未就绪，当前状态: ${candidate.status}` } };
  }

  const observations = (candidate.observations as any[]) ?? [];
  const ksqResults = (candidate.ksq_items as any[]) ?? [];

  return {
    data: {
      candidateName: candidate.name,
      role: candidate.role,
      recommendation: candidate.recommendation,
      ksqResults: ksqResults.map((k: any) => ({
        topic: k.topic,
        result: k.result,
        evidence: k.evidence?.slice(0, 100),
      })),
      keyFindings: observations.slice(0, 5).map((o: any) => ({
        title: o.title,
        signalType: o.signalType,
        observation: o.observation?.slice(0, 150),
      })),
    },
    actions: [{ type: 'show_report' as const, payload: { candidateId: targetCandidateId } }],
  };
});

// ─── 6. get_daily_summary ────────────────────

handlers.set('get_daily_summary', async (_args, ctx) => {
  const db = getSupabase();

  const statuses = [
    'PENDING_OUTREACH', 'TOUCHED', 'INTERVIEWING', 'ANALYZING', 'DELIVERED', 'EXCEPTION',
  ];

  const counts: Record<string, number> = {};
  for (const s of statuses) {
    const { count } = await db
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('status', s);
    counts[s] = count ?? 0;
  }

  const { data: delivered } = await db
    .from('candidates')
    .select('recommendation')
    .eq('user_id', ctx.userId)
    .eq('status', 'DELIVERED');

  const proceed = delivered?.filter((d: any) => d.recommendation === 'Proceed').length ?? 0;
  const followUp = delivered?.filter((d: any) => d.recommendation === 'FollowUp').length ?? 0;
  const hold = delivered?.filter((d: any) => d.recommendation === 'Hold').length ?? 0;

  const { count: unread } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .eq('is_read', false);

  return {
    data: {
      statusBreakdown: counts,
      deliveredBreakdown: { proceed, followUp, hold },
      totalScreened: counts['DELIVERED'] ?? 0,
      inProgress: (counts['INTERVIEWING'] ?? 0) + (counts['ANALYZING'] ?? 0),
      exceptions: counts['EXCEPTION'] ?? 0,
      unreadNotifications: unread ?? 0,
    },
  };
});

// ─── 7. search_resume ────────────────────────

handlers.set('search_resume', async (args, ctx) => {
  const db = getSupabase();
  const { query, filters } = args as {
    query: string;
    filters?: { minExp?: number; role?: string; education?: string };
  };

  let dbQuery = db
    .from('candidates')
    .select('id, name, role, status, recommendation, updated_at, resume_data')
    .eq('user_id', ctx.userId)
    .or(`name.ilike.%${query}%,role.ilike.%${query}%`);

  if (filters?.role) {
    dbQuery = dbQuery.ilike('role', `%${filters.role}%`);
  }

  dbQuery = dbQuery.order('updated_at', { ascending: false }).limit(10);

  const { data, error } = await dbQuery;
  if (error) return { data: { error: '搜索失败' } };

  let results = data ?? [];

  if (filters?.minExp) {
    results = results.filter((c: any) => {
      const workYears = c.resume_data?.basicProfile?.workYears;
      return workYears && workYears >= filters.minExp!;
    });
  }

  if (filters?.education) {
    results = results.filter((c: any) => {
      const edu = c.resume_data?.basicProfile?.highestEducation;
      return edu && edu.includes(filters.education!);
    });
  }

  const summaries = results.map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    status: c.status,
    recommendation: c.recommendation,
    workYears: c.resume_data?.basicProfile?.workYears,
    education: c.resume_data?.basicProfile?.highestEducation,
    currentCity: c.resume_data?.basicProfile?.currentCity,
  }));

  return { data: { results: summaries, total: summaries.length } };
});
