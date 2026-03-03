/**
 * 面试路由 (M3)
 * POST   /api/interviews                    — 创建面试邀约 (HR)
 * GET    /api/interviews/:sessionId/landing  — 候选人打开 H5 链接
 * POST   /api/interviews/:sessionId/start    — 候选人开始面试
 * POST   /api/interviews/:sessionId/messages — 发送消息
 * GET    /api/interviews/:sessionId/messages — 历史消息
 * POST   /api/interviews/:sessionId/end      — 结束面试
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { writeFile } from 'node:fs/promises';

import { getSupabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { interviewGuard } from '../middleware/interviewGuard.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { ensureUploadDir, generateStoragePath } from '../services/storageService.js';
import { generateOpening, processMessage, type InterviewState } from '../agents/interviewAgent.js';
import { transcribeAudio } from '../services/sttService.js';
import { runAnalysisPipeline } from '../services/orchestrator.js';
import { publishCandidateEvent } from '../services/eventService.js';
import {
  InterviewSessionStatus,
  type CreateInterviewResponse,
  type InterviewLandingResponse,
  type StartInterviewResponse,
  type SendMessageResponse,
  type ListMessagesResponse,
  type EndInterviewResponse,
  type InterviewMessage,
  type InterviewProgress,
  type KSQItem,
  type FileUploadResponse,
} from '@shared/types.js';

const interviews = new Hono();

// ─── POST / — 创建面试邀约（需要 HR 登录） ──────
const createSchema = z.object({
  candidateId: z.string().uuid(),
  channel: z.enum(['TEXT', 'VOICE']).default('TEXT'),
  ksqItems: z.array(z.object({
    id: z.string(),
    topic: z.string(),
    rubric: z.string(),
  })),
  baselineItems: z.array(z.any()).optional(),
  expiresInHours: z.number().default(48),
  maxDurationMinutes: z.number().default(30),
});

interviews.post('/', requireAuth(), async (c) => {
  const body = createSchema.safeParse(await c.req.json());
  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: body.error.issues[0]?.message ?? 'Invalid input' }), 400);
  }

  const user = c.get('user');
  const db = getSupabase();
  const { candidateId, channel, ksqItems, baselineItems, expiresInHours, maxDurationMinutes } = body.data;

  // 校验候选人存在
  const { data: candidate } = await db
    .from('candidates')
    .select('id, name, role')
    .eq('id', candidateId)
    .eq('user_id', user.userId)
    .single();

  if (!candidate) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Candidate not found' }), 404);
  }

  const sessionId = uuid();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString();

  await db.from('interviews').insert({
    id: sessionId,
    candidate_id: candidateId,
    user_id: user.userId,
    channel,
    status: 'CREATED',
    ksq_items: ksqItems,
    baseline_items: baselineItems ?? [],
    max_duration_minutes: maxDurationMinutes,
    expires_at: expiresAt,
  });

  // 更新候选人状态 + 时间线
  await db.from('candidates').update({ status: 'PENDING_OUTREACH' }).eq('id', candidateId);
  await db.from('timeline_events').insert({
    candidate_id: candidateId,
    event_code: 'TASK_CREATED',
    title: '面试邀约已创建',
    detail: `渠道: ${channel}，有效期: ${expiresInHours}h`,
  });

  const inviteUrl = `https://app.ailin.ai/i/${sessionId}`;
  const inviteText = `【艾琳面试邀请】您好 ${candidate.name}，诚邀您参加「${candidate.role}」岗位的线上初筛面试，请点击链接开始：${inviteUrl}（${expiresInHours}小时内有效）`;

  const res: CreateInterviewResponse = { sessionId, inviteUrl, inviteText, expiresAt };
  return c.json(apiResponse(res), 201);
});

// ─── 以下路由面向候选人 H5 端，不需要 JWT ────────

// ─── GET /:sessionId/landing ────────────────────
interviews.get('/:sessionId/landing', async (c) => {
  const db = getSupabase();
  const sessionId = c.req.param('sessionId');

  const { data: session } = await db
    .from('interviews')
    .select('*, candidates(name, role)')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: '面试会话不存在' }), 404);
  }

  // 更新状态 + 发布事件
  if (session.status === 'CREATED') {
    await db.from('interviews').update({ status: 'LANDING_OPENED' }).eq('id', sessionId);
    await db.from('candidates').update({
      status: 'TOUCHED',
      landing_opened_at: new Date().toISOString(),
    }).eq('id', session.candidate_id);
    await db.from('timeline_events').insert({
      candidate_id: session.candidate_id,
      event_code: 'LANDING_OPENED',
      title: '候选人已打开链接',
    });

    const candidateData = session.candidates as any;
    await publishCandidateEvent({
      userId: session.user_id,
      candidateId: session.candidate_id,
      candidateName: candidateData?.name ?? '',
      candidateRole: candidateData?.role ?? '',
      eventType: 'candidate_opened',
      message: `${candidateData?.name ?? '候选人'} 已打开面试链接`,
      severity: 'info',
    });
  }

  // 查询 HR 用户信息用于 recruiter 展示
  const { data: hrUser } = await db
    .from('users')
    .select('name, company')
    .eq('id', session.user_id)
    .single();

  const candidateData = session.candidates as any;
  const recruiterName = hrUser?.name || '招聘方';
  const res: InterviewLandingResponse = {
    sessionId,
    candidateName: candidateData?.name ?? '',
    recruiterTitle: recruiterName,
    positionTitle: candidateData?.role ?? '',
    companyAlias: hrUser?.company || undefined,
    channel: session.channel,
    estimatedMinutes: session.max_duration_minutes,
    maxDurationMinutes: session.max_duration_minutes,
    status: session.status === 'CREATED' ? 'LANDING_OPENED' : session.status,
    expiresAt: session.expires_at,
  };
  return c.json(apiResponse(res));
});

// ─── POST /:sessionId/start ────────────────────
interviews.post('/:sessionId/start', interviewGuard(), async (c) => {
  const db = getSupabase();
  const sessionId = c.req.param('sessionId');

  const { data: session } = await db
    .from('interviews')
    .select('*, candidates(name, role)')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: '面试会话不存在' }), 404);
  }

  const now = new Date().toISOString();
  await db.from('interviews').update({
    status: 'IN_PROGRESS',
    started_at: now,
    current_ksq_index: 0,
  }).eq('id', sessionId);
  await db.from('candidates').update({ status: 'INTERVIEWING' }).eq('id', session.candidate_id);
  await db.from('timeline_events').insert({
    candidate_id: session.candidate_id,
    event_code: 'INTERVIEW_STARTED',
    title: '面试开始',
  });

  // 生成 AI 开场白
  const candidateData = session.candidates as any;
  const state: InterviewState = {
    candidateName: candidateData?.name ?? '候选人',
    role: candidateData?.role ?? '',
    ksqItems: session.ksq_items ?? [],
    currentKsqIndex: 0,
    startedAt: new Date(now),
    maxDurationMinutes: session.max_duration_minutes,
  };

  const firstMessage = await generateOpening(state);

  // 保存 AI 开场消息
  await db.from('messages').insert({
    id: uuid(),
    session_id: sessionId,
    role: 'ai',
    content: firstMessage,
    topic: state.ksqItems[0]?.topic,
  });

  const totalQuestions = state.ksqItems.length;
  const progress: InterviewProgress = { currentQuestion: 1, totalQuestions };
  const res: StartInterviewResponse = { firstMessage, progress };
  return c.json(apiResponse(res));
});

// ─── POST /:sessionId/audio-upload — 候选人上传语音 ──
interviews.post('/:sessionId/audio-upload', interviewGuard(), async (c) => {
  const env = getEnv();
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '请上传音频文件（字段名: file）' }), 400);
  }

  const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return c.json(apiResponse(null, { code: 'FILE_TOO_LARGE', message: `文件不能超过 ${env.UPLOAD_MAX_SIZE_MB}MB` }), 413);
  }

  await ensureUploadDir();
  const { fileId, storagePath } = generateStoragePath(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const db = getSupabase();
  const sessionId = c.req.param('sessionId');
  const now = new Date().toISOString();

  await db.from('files').insert({
    id: fileId,
    user_id: null, // 候选人无 user_id
    file_name: file.name,
    mime_type: file.type || 'audio/webm',
    size: file.size,
    storage_path: storagePath,
    uploaded_at: now,
    session_id: sessionId,
  });

  const res: FileUploadResponse = {
    fileId,
    fileName: file.name,
    mimeType: file.type || 'audio/webm',
    size: file.size,
    uploadedAt: now,
  };
  return c.json(apiResponse(res), 201);
});

// ─── POST /:sessionId/messages ──────────────────
interviews.post('/:sessionId/messages', interviewGuard(), async (c) => {
  const db = getSupabase();
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();

  const content = body.content as string | undefined;
  const audioFileId = body.audioFileId as string | undefined;

  if (!content && !audioFileId) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '请发送文字或语音消息' }), 400);
  }

  // 语音 → 转写
  let messageContent = content ?? '';
  let audioUrl: string | undefined;
  let isTranscript = false;

  if (audioFileId) {
    const { data: file } = await db.from('files').select('storage_path').eq('id', audioFileId).single();
    if (file) {
      messageContent = await transcribeAudio(file.storage_path);
      audioUrl = file.storage_path;
      isTranscript = true;
    }
  }

  // 保存候选人消息
  const candidateMsgId = uuid();
  await db.from('messages').insert({
    id: candidateMsgId,
    session_id: sessionId,
    role: 'candidate',
    content: messageContent,
    audio_url: audioUrl,
    audio_duration: body.audioDuration ?? null,
    is_transcript: isTranscript,
  });

  // 获取会话信息（含 currentKsqIndex）
  const { data: session } = await db
    .from('interviews')
    .select('*, candidates(name, role)')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Session not found' }), 404);
  }

  // 获取历史消息
  const { data: msgs } = await db
    .from('messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const history = (msgs ?? []).map((m: any) => ({
    role: m.role as 'ai' | 'candidate',
    content: m.content as string,
  }));

  // Interview Agent 处理（从 DB 加载 currentKsqIndex）
  const candidateData = session.candidates as any;
  const state: InterviewState = {
    candidateName: candidateData?.name ?? '候选人',
    role: candidateData?.role ?? '',
    ksqItems: session.ksq_items ?? [],
    currentKsqIndex: session.current_ksq_index ?? 0,
    startedAt: new Date(session.started_at),
    maxDurationMinutes: session.max_duration_minutes,
  };

  const result = await processMessage(state, history, messageContent);

  // 持久化 currentKsqIndex
  await db.from('interviews').update({
    current_ksq_index: result.currentKsqIndex,
  }).eq('id', sessionId);

  // 保存 AI 回复
  const aiMsgId = uuid();
  await db.from('messages').insert({
    id: aiMsgId,
    session_id: sessionId,
    role: 'ai',
    content: result.reply,
    topic: result.topic,
  });

  // 如果面试结束 → 触发 M4 分析流水线
  if (result.shouldEnd) {
    await handleInterviewEnd(sessionId, session, 'completed');
  }

  const aiReply: InterviewMessage = {
    id: aiMsgId,
    sessionId,
    role: 'ai',
    content: result.reply,
    timestamp: new Date().toISOString(),
    topic: result.topic,
  };

  const totalQuestions = state.ksqItems.length;
  const progress: InterviewProgress = {
    currentQuestion: Math.min(result.currentKsqIndex + 1, totalQuestions),
    totalQuestions,
  };
  const res: SendMessageResponse = {
    candidateMessageId: candidateMsgId,
    aiReply,
    isCompleted: result.shouldEnd,
    progress,
  };
  return c.json(apiResponse(res));
});

// ─── GET /:sessionId/messages ───────────────────
interviews.get('/:sessionId/messages', async (c) => {
  const db = getSupabase();
  const sessionId = c.req.param('sessionId');

  const { data: session } = await db
    .from('interviews')
    .select('status, started_at')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Session not found' }), 404);
  }

  const { data: msgs } = await db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const messages: InterviewMessage[] = (msgs ?? []).map((m: any) => ({
    id: m.id,
    sessionId: m.session_id,
    role: m.role,
    content: m.content,
    timestamp: m.created_at,
    topic: m.topic,
    audioUrl: m.audio_url,
    audioDuration: m.audio_duration,
    isTranscript: m.is_transcript,
  }));

  const elapsedSeconds = session.started_at
    ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : 0;

  const res: ListMessagesResponse = {
    messages,
    isCompleted: ['COMPLETED', 'ABANDONED', 'EXPIRED'].includes(session.status),
    elapsedSeconds,
  };
  return c.json(apiResponse(res));
});

// ─── POST /:sessionId/end ──────────────────────
const endSchema = z.object({
  reason: z.enum(['completed', 'candidate_quit', 'timeout', 'error']),
});

interviews.post('/:sessionId/end', async (c) => {
  const db = getSupabase();
  const sessionId = c.req.param('sessionId');
  const body = endSchema.safeParse(await c.req.json());

  if (!body.success) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: 'Invalid reason' }), 400);
  }

  const { data: session } = await db
    .from('interviews')
    .select('*, candidates(name, role)')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return c.json(apiResponse(null, { code: 'NOT_FOUND', message: 'Session not found' }), 404);
  }

  // 结束面试 + 触发 M4 分析
  const summary = await handleInterviewEnd(sessionId, session, body.data.reason);

  const res: EndInterviewResponse = {
    sessionId,
    status: InterviewSessionStatus.COMPLETED,
    summary: summary!,
  };
  return c.json(apiResponse(res));
});

// ═══════════════════════════════════════════════════
// 内部函数
// ═══════════════════════════════════════════════════

/**
 * 统一的面试结束处理：
 * 1. 更新面试状态
 * 2. 生成摘要
 * 3. 异步触发 M4 分析流水线
 * 4. 发布通知事件
 */
async function handleInterviewEnd(
  sessionId: string,
  session: any,
  reason: string,
) {
  const db = getSupabase();
  const now = new Date().toISOString();
  const candidateData = session.candidates as any;

  // 更新面试状态
  await db.from('interviews').update({
    status: 'COMPLETED',
    ended_at: now,
    end_reason: reason,
  }).eq('id', sessionId);

  await db.from('candidates').update({ status: 'ANALYZING' }).eq('id', session.candidate_id);
  await db.from('timeline_events').insert({
    candidate_id: session.candidate_id,
    event_code: 'INTERVIEW_ENDED',
    title: '面试结束',
    detail: `原因: ${reason}`,
  });

  // 统计摘要
  const { count: msgCount } = await db
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('role', 'candidate');

  const totalSeconds = session.started_at
    ? Math.round((new Date(now).getTime() - new Date(session.started_at).getTime()) / 1000)
    : 0;

  const ksqItems = (session.ksq_items as KSQItem[]) ?? [];
  const ksqCount = ksqItems.length;
  const summary = {
    totalDurationSeconds: totalSeconds,
    topicsCovered: ksqCount,
    questionsAnswered: msgCount ?? 0,
    completionRate: ksqCount > 0 ? Math.min(1, (msgCount ?? 0) / (ksqCount * 3)) : 0,
  };

  await db.from('interviews').update({ summary }).eq('id', sessionId);

  // 发布面试完成通知
  await publishCandidateEvent({
    userId: session.user_id,
    candidateId: session.candidate_id,
    candidateName: candidateData?.name ?? '',
    candidateRole: candidateData?.role ?? '',
    eventType: 'interview_completed',
    message: `${candidateData?.name ?? '候选人'} 的面试已完成，正在生成分析报告`,
    severity: 'info',
  });

  // 异步触发 M4 分析流水线（不阻塞 HTTP 响应）
  triggerAnalysisPipeline(sessionId, session).catch((err) => {
    console.error('❌ Analysis pipeline failed:', err);
  });

  return summary;
}

/**
 * M4 分析流水线（异步执行）
 * 面试结束后：获取 transcript → Analysis Agent → Report Agent → 更新候选人
 */
async function triggerAnalysisPipeline(sessionId: string, session: any) {
  const db = getSupabase();
  const candidateData = session.candidates as any;

  console.log(`🔬 [M4] Starting analysis for session ${sessionId}...`);

  // 写时间线
  await db.from('timeline_events').insert({
    candidate_id: session.candidate_id,
    event_code: 'ANALYSIS_STARTED',
    title: '分析报告生成中',
  });

  // 获取所有消息
  const { data: msgs } = await db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const messages: InterviewMessage[] = (msgs ?? []).map((m: any) => ({
    id: m.id,
    sessionId: m.session_id,
    role: m.role,
    content: m.content,
    timestamp: m.created_at,
    topic: m.topic,
    audioUrl: m.audio_url,
    audioDuration: m.audio_duration,
    isTranscript: m.is_transcript,
  }));

  // 获取候选人简历
  const { data: candidate } = await db
    .from('candidates')
    .select('resume_data')
    .eq('id', session.candidate_id)
    .single();

  const ksqItems = (session.ksq_items as KSQItem[]) ?? [];

  // 运行 M4 流水线
  const result = await runAnalysisPipeline(messages, ksqItems, candidate?.resume_data);

  // 更新候选人：写入 observations + ksq_results + recommendation
  await db.from('candidates').update({
    observations: result.observations,
    ksq_items: result.report.ksqResults,
    recommendation: result.report.recommendation,
    status: 'DELIVERED',
    report_ready_at: new Date().toISOString(),
  }).eq('id', session.candidate_id);

  // 写时间线
  await db.from('timeline_events').insert({
    candidate_id: session.candidate_id,
    event_code: 'REPORT_READY',
    title: '分析报告就绪',
    detail: `推荐: ${result.report.recommendation} — ${result.report.summary}`,
  });

  await db.from('timeline_events').insert({
    candidate_id: session.candidate_id,
    event_code: 'REPORT_DELIVERED',
    title: '报告已交付',
  });

  // 发布报告就绪通知
  await publishCandidateEvent({
    userId: session.user_id,
    candidateId: session.candidate_id,
    candidateName: candidateData?.name ?? '',
    candidateRole: candidateData?.role ?? '',
    eventType: 'report_delivered',
    message: `${candidateData?.name ?? '候选人'} 的初筛报告已交付 — ${result.report.summary}`,
    severity: 'success',
  });

  console.log(`✅ [M4] Analysis complete for session ${sessionId}: ${result.report.recommendation}`);
}

export default interviews;
