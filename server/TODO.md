# 后端待办

## 1. Supabase 数据库 ✅ 已就绪
- [x] 已注册并创建项目
- [ ] 在 `server/.env` 中填入 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- [ ] 执行 `server/src/database/migrations/001_initial_schema.sql`
- [ ] `cd server && npm run dev` 验证 `db=connected`

## 2. LLM ⚠️ 有 key，调试中
- 已有 API key，但还没调通
- `.env` 中 `LLM_PROVIDER=mock` 可先跑通全流程（mock 回复）
- 调通后改为 `deepseek` / `qwen` / `moonshot`
- Interview agent 已加 LLM 调用 error handling：真实 LLM 失败时自动降级为 mock 回复

## 3. STT 语音转文字 ❌ 等合作团队
- 需要合作团队提供讯飞/阿里云语音识别 API
- `.env` 中 `STT_PROVIDER=mock` 可先跑通（返回模拟转写文本）
- 接入后在 `server/src/services/sttService.ts` 实现对应 provider

## 4. SMS 短信 — 开发阶段用 mock
- `SMS_PROVIDER=mock`，验证码打印在控制台
- 生产环境需接入阿里云短信

## 5. Docker 部署
1. 确保 `.env` 文件就绪
2. `docker-compose up --build` 启动
3. 验证 `http://localhost:3001/health`

## 6. 前后端联调
1. 前端通过 Vite proxy 转发到 `http://localhost:3001/api`
2. 所有 API 返回统一 `ApiResponse` 格式
3. 面试 H5 页面对接 `/api/interviews/:sessionId/*` 系列 API
