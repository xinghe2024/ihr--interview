/**
 * 艾琳 (Ailin) 后端服务入口
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { logger } from './services/logger.js';

import { loadEnv } from './config/env.js';
import { isDbConfigured, DbNotConfiguredError } from './config/database.js';
import { apiResponse } from './middleware/apiResponse.js';
import authRoutes from './routes/auth.js';
import candidateRoutes from './routes/candidates.js';
import fileRoutes from './routes/files.js';
import interviewRoutes from './routes/interviews.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';

// 初始化环境变量
const env = loadEnv();

const app = new Hono();

// ─── 全局中间件 ─────────────────────────────────
// HTTP 请求日志（替代 hono/logger，输出到 winston）
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - start}ms`);
});
app.use('*', cors({
  origin: (origin) => {
    // 允许 Chrome 插件来源
    if (origin?.startsWith('chrome-extension://')) return origin;
    // 允许配置的来源
    if (env.CORS_ORIGIN === '*') return '*';
    const allowed = env.CORS_ORIGIN.split(',');
    return allowed.includes(origin ?? '') ? origin! : allowed[0];
  },
  credentials: true,
}));

// ─── 全局错误处理（Hono onError） ───────────────
app.onError((err, c) => {
  if (err instanceof DbNotConfiguredError || err.name === 'DbNotConfiguredError') {
    return c.json(apiResponse(null, { code: 'DB_NOT_CONFIGURED', message: err.message }), 503);
  }
  const isDev = env.NODE_ENV !== 'production';
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  return c.json(
    apiResponse(null, { code: 'INTERNAL_ERROR', message: isDev ? err.message : 'Internal server error' }),
    500,
  );
});

// ─── 健康检查 ───────────────────────────────────
app.get('/health', (c) => c.json(apiResponse({ status: 'ok', version: '0.1.0' })));

// ─── M1 路由 ────────────────────────────────────
app.route('/api/auth', authRoutes);
app.route('/api/candidates', candidateRoutes);
app.route('/api/files', fileRoutes);

// ─── M3 路由 ────────────────────────────────────
app.route('/api/interviews', interviewRoutes);

// ─── M5 路由 ────────────────────────────────────
app.route('/api/chat', chatRoutes);
app.route('/api/notifications', notificationRoutes);

// ─── 404 ────────────────────────────────────────
app.notFound((c) => c.json(apiResponse(null, { code: 'NOT_FOUND', message: `Route not found: ${c.req.method} ${c.req.path}` }), 404));

// ─── 启动服务 ───────────────────────────────────
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Ailin server running on http://localhost:${info.port}`);
  logger.info(`env=${env.NODE_ENV} llm=${env.LLM_PROVIDER} db=${isDbConfigured() ? 'connected' : 'NOT configured'}`);
});

export default app;