/**
 * 文件上传路由
 * POST /api/files/upload — multipart/form-data 上传
 */
import { Hono } from 'hono';
import { writeFile } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';

import { getSupabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { apiResponse } from '../middleware/apiResponse.js';
import { ensureUploadDir, generateStoragePath } from '../services/storageService.js';
import type { FileUploadResponse } from '@shared/types.js';

const files = new Hono();

files.use('*', requireAuth());

files.post('/upload', async (c) => {
  const env = getEnv();
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json(apiResponse(null, { code: 'VALIDATION', message: '请上传文件（字段名: file）' }), 400);
  }

  // 大小限制
  const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return c.json(apiResponse(null, { code: 'FILE_TOO_LARGE', message: `文件不能超过 ${env.UPLOAD_MAX_SIZE_MB}MB` }), 413);
  }

  // 写入磁盘
  await ensureUploadDir();
  const { fileId, storagePath } = generateStoragePath(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  // 记录到数据库
  const user = c.get('user');
  const db = getSupabase();
  const now = new Date().toISOString();

  await db.from('files').insert({
    id: fileId,
    user_id: user.userId,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size: file.size,
    storage_path: storagePath,
    uploaded_at: now,
  });

  const res: FileUploadResponse = {
    fileId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: now,
  };
  return c.json(apiResponse(res), 201);
});

export default files;
