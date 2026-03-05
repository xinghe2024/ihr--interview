/**
 * 服务端埋点工具
 *
 * fire-and-forget：永不阻塞业务逻辑，失败只记日志
 */
import { v4 as uuid } from 'uuid';
import { getSupabase, isDbConfigured } from '../config/database.js';
import { logger } from './logger.js';

export async function trackServerEvent(
  eventName: string,
  properties: Record<string, string | number | boolean | null> = {},
  userId?: string,
): Promise<void> {
  if (!isDbConfigured()) return;

  try {
    const db = getSupabase();
    await db.from('tracking_events').insert({
      id: uuid(),
      event_name: eventName,
      properties,
      client_id: null,
      session_id: null,
      user_id: userId ?? null,
      platform: 'server',
      app_version: '0.1.0',
      event_time: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`Analytics insert failed: ${err instanceof Error ? err.message : err}`);
  }
}
