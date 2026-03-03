/**
 * 文件存储服务
 * MVP 阶段：本地磁盘存储
 * 生产环境：可切换到 Supabase Storage / OSS
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuid } from 'uuid';
import { getEnv } from '../config/env.js';

/** 确保上传目录存在 */
export async function ensureUploadDir(): Promise<string> {
  const dir = getEnv().UPLOAD_DIR;
  await mkdir(dir, { recursive: true });
  return dir;
}

/** 生成唯一存储路径 */
export function generateStoragePath(originalName: string): { fileId: string; storagePath: string } {
  const fileId = uuid();
  const ext = originalName.split('.').pop() ?? 'bin';
  const storagePath = join(getEnv().UPLOAD_DIR, `${fileId}.${ext}`);
  return { fileId, storagePath };
}
