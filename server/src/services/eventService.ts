/**
 * 事件发布服务
 * 候选人状态流转时发布通知事件
 */
import { getSupabase } from '../config/database.js';
import type { CandidateEventType, CandidateUpdateEvent } from '@shared/types.js';
import { v4 as uuid } from 'uuid';

/**
 * 发布候选人状态变更事件
 */
export async function publishCandidateEvent(params: {
  userId: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  eventType: CandidateEventType;
  message: string;
  severity: 'success' | 'info' | 'error';
}): Promise<void> {
  const db = getSupabase();

  await db.from('notifications').insert({
    id: uuid(),
    user_id: params.userId,
    candidate_id: params.candidateId,
    candidate_name: params.candidateName,
    candidate_role: params.candidateRole,
    event_type: params.eventType,
    message: params.message,
    severity: params.severity,
    is_read: false,
  });
}
