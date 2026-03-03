# 艾琳 (Ailin) 后端开发计划

> **版本**：V1.3
> **日期**：2026-02-28
> **前提**：types.ts 契约已就绪，前端可并行开发
> **权威数据源**：`shared/types.ts` + `docs/requirements/requirements_v1.3.md`

---

## 里程碑总览

```
M0 基建层（无业务逻辑）
 ↓
M1 认证 + 候选人 CRUD（阶段 1 API）
 ↓
M2 简历解析流水线（Resume Agent + KSQ Agent）
 ↓
M3 面试会话 + Interview Agent（阶段 2 API 核心）
 ↓
M4 分析 + 报告（Analysis Agent + Report Agent）
 ↓
M5 Sidebar Agent + 通知
 ↓
M6 端到端联调 + 上线
```

---

## M0：基建层

**目标**：搭建后端骨架，确保所有后续开发有统一的基础设施。

### 交付物

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 0.1 | 项目初始化 | `server/package.json`, `server/tsconfig.json` | Express/Hono + TypeScript，配置 ESLint |
| 0.2 | 目录结构 | `server/` 下创建 `routes/`, `agents/`, `services/`, `middleware/`, `config/`, `utils/` | 按职责分层 |
| 0.3 | 环境变量管理 | `server/config/env.ts` | 统一读取环境变量，零硬编码，类型安全 |
| 0.4 | Supabase 连接 | `server/config/database.ts` | 数据库客户端初始化，连接池配置 |
| 0.5 | 数据库 Schema | `server/database/migrations/` | 建表脚本（candidates, interviews, messages, notifications, chat_history, files） |
| 0.6 | LLM 适配层 | `server/services/llmService.ts` | 统一 `chat(prompt, options)` 接口，支持多模型（deepseek/qwen/moonshot），每 Agent 独立配置 |
| 0.7 | 通用中间件 | `server/middleware/` | 错误处理、请求日志、CORS、ApiResponse 包装 |
| 0.8 | 删除废弃文件 | `server/services/geminiService.ts` | 标记废弃并移除 |

### 验收标准
- `npm run dev` 启动无报错
- 数据库连接成功
- LLM 适配层能调通至少一个模型
- 所有 API 返回统一 `ApiResponse` 格式

---

## M1：认证 + 候选人 CRUD

**目标**：实现阶段 1 API，前端可以登录、管理候选人。

### 交付物

| # | 任务 | 文件 | 对应 API |
|---|------|------|---------|
| 1.1 | 短信验证码 | `server/routes/auth.ts`, `server/services/smsService.ts` | `POST /api/auth/send-code` |
| 1.2 | 登录 + JWT | `server/routes/auth.ts`, `server/middleware/auth.ts` | `POST /api/auth/login`, `POST /api/auth/refresh` |
| 1.3 | 候选人 CRUD | `server/routes/candidates.ts` | `POST/GET/PUT/DELETE /api/candidates` |
| 1.4 | 候选人详情 | 同上 | `GET /api/candidates/:id`（含 resume, timeline, observations, ksqResults） |
| 1.5 | 文件上传 | `server/routes/files.ts`, `server/services/storageService.ts` | `POST /api/files/upload` |

### 验收标准
- 手机号 + 验证码完成登录，拿到 JWT
- CRUD 候选人全流程通
- 上传 PDF 文件 → 返回 `FileUploadResponse`

---

## M2：简历解析流水线

**目标**：上传简历 → AI 解析为 DetailedResume → 生成 KSQ 考察方案。

### 交付物

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.1 | Resume Agent | `server/agents/resumeAgent.ts` | PDF 解析 + LLM 提取 → `DetailedResume` |
| 2.2 | KSQ Agent | `server/agents/ksqAgent.ts` | 从 DetailedResume 生成 `KSQItem[]`（含追问链建议） |
| 2.3 | Orchestrator — 解析流程 | `server/services/orchestrator.ts` | 串联 Resume Agent → KSQ Agent，传递数据 |
| 2.4 | PDF 解析服务 | `server/services/pdfService.ts` | PDF 文本提取（pdf-parse 或类似库） |
| 2.5 | Prompt 模板 | `server/prompts/resume.ts`, `server/prompts/ksq.ts` | Agent 的 system prompt + few-shot 示例 |

### 验收标准
- 上传真实简历 PDF → 返回结构化 `DetailedResume`
- 自动生成 1-3 条 KSQ，每条含 topic + rubric
- KSQ 与简历内容相关、考察点有针对性

---

## M3：面试会话 + Interview Agent

**目标**：实现 C 端 H5 面试全流程——创建邀约、候选人开始面试、实时对话、面试结束。

### 交付物

| # | 任务 | 文件 | 对应 API |
|---|------|------|---------|
| 3.1 | 创建面试邀约 | `server/routes/interviews.ts` | `POST /api/interviews` |
| 3.2 | 落地页数据 | 同上 | `GET /api/interviews/:sid/landing` |
| 3.3 | 开始面试 | 同上 | `POST /api/interviews/:sid/start` |
| 3.4 | Interview Agent | `server/agents/interviewAgent.ts` | 实时对话控制：接收消息 → 追问/切题/结束 |
| 3.5 | 消息交互 | `server/routes/interviews.ts` | `POST /api/interviews/:sid/messages`（支持文字 + 音频） |
| 3.6 | 历史消息 | 同上 | `GET /api/interviews/:sid/messages` |
| 3.7 | 结束面试 | 同上 | `POST /api/interviews/:sid/end` |
| 3.8 | STT 服务 | `server/services/sttService.ts` | 讯飞/阿里云语音识别，音频 → 文字 |
| 3.9 | 时长控制 | `server/middleware/interviewGuard.ts` | 全局 30 分钟超时、单轮 5 分钟超时 |
| 3.10 | Interview Agent Prompt | `server/prompts/interview.ts` | 面试官人设 + 行为准则 + 时间感知 |

### 验收标准
- 创建邀约 → 拿到链接 → 候选人打开 → 开始对话
- 文字消息：发送 → 收到 AI 追问 → 多轮对话
- 语音消息：上传音频 → STT 转写 → AI 回复
- 超时自动结束
- 对话轮数 10-20 轮，覆盖所有 KSQ

---

## M4：分析 + 报告

**目标**：面试结束后自动分析 transcript，生成结构化报告。

### 交付物

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 4.1 | Analysis Agent | `server/agents/analysisAgent.ts` | 信号检测：4 种信号 + 证据链 → `Observation[]` |
| 4.2 | Report Agent | `server/agents/reportAgent.ts` | 综合 KSQ + Observations → `Recommendation` + 报告 |
| 4.3 | Orchestrator — 分析流程 | `server/services/orchestrator.ts` | 串联 Analysis → Report，面试结束自动触发 |
| 4.4 | Analysis Prompt | `server/prompts/analysis.ts` | 信号检测指令 + 输出格式约束 |
| 4.5 | Report Prompt | `server/prompts/report.ts` | 报告生成指令 + 输出格式约束 |
| 4.6 | 候选人资产化 | `server/services/tagService.ts` | 静默提取 Verified Tags（MVP 只积累，不透出） |

### 验收标准
- 面试结束 → 自动触发分析 → 生成 Observation[]
- 每条 Observation 包含完整证据链（resumeClaim + quote + observation）
- Report 输出 Recommendation + 一句话摘要
- 候选人状态自动流转到 DELIVERED

---

## M5：Sidebar Agent + 通知

**目标**：HR 可以在侧边栏与 AI 对话，实时收到候选人动态通知。

### 交付物

| # | 任务 | 文件 | 对应 API |
|---|------|------|---------|
| 5.1 | Sidebar Agent | `server/agents/sidebarAgent.ts` | function-calling LLM，7 个工具 |
| 5.2 | 对话 API | `server/routes/chat.ts` | `POST/GET/DELETE /api/chat/messages` |
| 5.3 | 通知 API | `server/routes/notifications.ts` | `GET /api/notifications/summary`, `PATCH` 标记已读 |
| 5.4 | 事件发布 | `server/services/eventService.ts` | 状态流转时发布 `CandidateUpdateEvent` |
| 5.5 | Sidebar Prompt | `server/prompts/sidebar.ts` | System prompt + 工具定义 |

### 验收标准
- HR 发消息 → Agent 正确使用工具 → 返回结构化结果
- 候选人状态变化 → 通知列表出现新事件
- 标记已读正常工作

---

## M6：端到端联调 + 上线

**目标**：全链路跑通，部署到线上。

### 交付物

| # | 任务 | 说明 |
|---|------|------|
| 6.1 | 端到端测试 | 上传简历 → KSQ → 邀约 → 面试（语音+文字）→ 分析 → 报告 → HR 查看 |
| 6.2 | Docker 容器化 | `Dockerfile`, `docker-compose.yml` |
| 6.3 | 环境变量文档 | `.env.example`，所有配置项说明 |
| 6.4 | 部署 | Vercel / Google Cloud Run |
| 6.5 | 前后端联调 | 与前端团队对接，修复接口不一致 |

### 验收标准
- 全链路可跑通（允许部分环节效果不完美）
- Docker build + run 成功
- 线上可访问

---

## 依赖关系

```
M0 ──→ M1 ──→ M2 ──→ M3 ──→ M4 ──→ M6
                              ↓
                             M5 ──→ M6
```

- M0 是所有后续的前置
- M1-M4 严格顺序（后者依赖前者的数据库 + API）
- M5 可在 M3 完成后并行开发（Sidebar Agent 独立于流水线）
- M6 需要 M4 + M5 都完成

---

## 每个里程碑的执行协议

每个任务开始前：
1. 确认涉及的 types.ts 类型已就绪
2. 列出要改/新建的文件
3. 说明不会改动的文件

每个任务完成后：
1. TypeScript 编译通过
2. API 手动测试通过（curl / Postman）
3. 列出潜在回归点 ≥ 3 条

---

*Last Updated: 2026-02-28*