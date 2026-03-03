/**
 * 候选人 CRUD 路由
 * POST   /api/candidates              — 创建候选人
 * GET    /api/candidates              — 列表（分页 + 筛选）
 * GET    /api/candidates/:id          — 详情
 * PUT    /api/candidates/:id          — 更新
 * DELETE /api/candidates/:id          — 删除
 * POST   /api/candidates/:id/parse-resume — 触发简历解析流水线 (M2)
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { getSupabase } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { runResumePipeline, runResumeTextPipeline } from '../services/orchestrator.js';
import type {
  Candidate,
  CandidateStatus,
  CandidateDetailResponse,
  CreateCandidateResponse,
  ListCandidatesResponse,
} from '@shared/types.js';

const candidates = new Hono();

// 所有候选人路由需要登录
candidates.use('*', requireAuth());

// ─── POST / ─────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().min(1),
  resumeFileId: z.string().uuid().optional(),
});

candidates.post('/', async (c) => {
  const body = createSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: body.error.issues[0]?.message ?? 'Invalid input' }), 400);
  }

  const user = c.get('user');
  const db = getSupabase();

  const now = new Date().toISOString();
  const row = {
    id: uuid(),
    user_id: user.userId,
    name: body.data.name,
    phone: body.data.phone ?? null,
    email: body.data.email ?? null,
    role: body.data.role,
    status: 'PENDING_OUTREACH' as CandidateStatus,
    resume_file_id: body.data.resumeFileId ?? null,
    avatar: '',
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db.from('candidates').insert(row).select().single();
  if (error) throw error;

  const candidate = rowToCandidate(data);
  const res: CreateCandidateResponse = { candidate };
  return c.json(apiResponse(res), 201);
});

// ─── GET / ──────────────────────────────────────
candidates.get('/', async (c) => {
  const user = c.get('user');
  const db = getSupabase();

  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize') ?? 20)));
  const status = c.req.query('status');
  const recommendation = c.req.query('recommendation');
  const search = c.req.query('search');
  const sortBy = c.req.query('sortBy') ?? 'lastUpdate';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? true : false;

  let query = db.from('candidates').select('*', { count: 'exact' }).eq('user_id', user.userId);

  if (status) query = query.eq('status', status);
  if (recommendation) query = query.eq('recommendation', recommendation);
  if (search) query = query.or(`name.ilike.%${search}%,role.ilike.%${search}%`);

  const orderCol = sortBy === 'name' ? 'name' : 'updated_at';
  query = query.order(orderCol, { ascending: sortOrder });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  const res: ListCandidatesResponse = {
    candidates: (data ?? []).map(rowToCandidate),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
  return c.json(apiResponse(res));
});

// ─── GET /:id ───────────────────────────────────
candidates.get('/:id', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const id = c.req.param('id');

  const { data, error } = await db
    .from('candidates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.userId)
    .single();

  if (error || !data) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Candidate not found' }), 404);
  }

  // 关联时间线
  const { data: timeline } = await db
    .from('timeline_events')
    .select('*')
    .eq('candidate_id', id)
    .order('created_at', { ascending: true });

  const res: CandidateDetailResponse = {
    candidate: rowToCandidate(data),
    resume: data.resume_data ?? undefined,
    timeline: (timeline ?? []).map((t: any) => ({
      time: t.created_at,
      title: t.title,
      detail: t.detail,
      eventCode: t.event_code,
    })),
    observations: data.observations ?? undefined,
    ksqResults: data.ksq_items ?? undefined,
  };
  return c.json(apiResponse(res));
});

// ─── PUT /:id ───────────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  status: z.enum(['PENDING_OUTREACH', 'TOUCHED', 'INTERVIEWING', 'ANALYZING', 'DELIVERED', 'EXCEPTION']).optional(),
  recommendation: z.enum(['Proceed', 'FollowUp', 'Hold']).optional(),
});

candidates.put('/:id', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const id = c.req.param('id');

  const body = updateSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: body.error.issues[0]?.message ?? 'Invalid input' }), 400);
  }

  const { data, error } = await db
    .from('candidates')
    .update(body.data)
    .eq('id', id)
    .eq('user_id', user.userId)
    .select()
    .single();

  if (error || !data) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Candidate not found' }), 404);
  }

  return c.json(apiResponse({ candidate: rowToCandidate(data) }));
});

// ─── DELETE /:id ────────────────────────────────
candidates.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const id = c.req.param('id');

  const { error } = await db
    .from('candidates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.userId);

  if (error) throw error;

  return c.json(apiResponse({ deleted: true }));
});

// ─── POST /:id/parse-resume (M2) ────────────────
candidates.post('/:id/parse-resume', async (c) => {
  const user = c.get('user');
  const db = getSupabase();
  const id = c.req.param('id');

  // 获取候选人
  const { data: candidate, error: findErr } = await db
    .from('candidates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.userId)
    .single();

  if (findErr || !candidate) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Candidate not found' }), 404);
  }

  // 获取关联的 PDF 文件路径
  if (!candidate.resume_file_id) {
    return c.json(apiResponse(null, { code: 'NO_RESUME', message: '该候选人未上传简历文件' }), 400);
  }

  const { data: file } = await db
    .from('files')
    .select('storage_path')
    .eq('id', candidate.resume_file_id)
    .single();

  if (!file) {
    return c.json(apiResponse(null, { code: 'FILE_NOT_FOUND', message: '简历文件不存在' }), 404);
  }

  // 运行解析流水线
  const result = await runResumePipeline(file.storage_path, candidate.role);

  // 写回数据库
  const { error: updateErr } = await db
    .from('candidates')
    .update({
      resume_data: result.resume,
      ksq_items: result.ksqItems,
      status: 'PENDING_OUTREACH',
    })
    .eq('id', id);

  if (updateErr) throw updateErr;

  // 写时间线事件
  await db.from('timeline_events').insert({
    candidate_id: id,
    event_code: 'RESUME_PARSED',
    title: '简历解析完成',
    detail: `提取 ${result.ksqItems.length} 道 KSQ`,
  });

  return c.json(apiResponse({
    resume: result.resume,
    ksqItems: result.ksqItems,
  }));
});

// ─── 工具函数 ───────────────────────────────────

/** DB row → Candidate（对齐 types.ts） */
function rowToCandidate(row: any): Candidate {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    recommendation: row.recommendation ?? 'Hold',
    avatar: row.avatar ?? '',
    lastUpdate: row.updated_at,
    landing_opened_at: row.landing_opened_at,
    report_ready_at: row.report_ready_at,
    evidence_playable: row.evidence_playable,
  };
}

export default candidates;
