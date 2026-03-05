# Ailin 埋点规范 (Tracking Specification)

> 版本: 1.0.0 | 生效日期: 2026-03-05 | 维护人: PM + 数据工程

## 1. 架构总览

```
前端 (React)                  后端 (Hono)                   DB
┌─────────────┐              ┌──────────────┐            ┌────────────┐
│ analytics.ts │──batch POST──▶ /api/analytics│──INSERT──▶│ tracking   │
│ queue+batch  │   /events    │   /events    │            │ _events    │
│ sendBeacon   │              └──────────────┘            └────────────┘
└─────────────┘                                                 │
                              ┌──────────────┐            ┌────────────┐
                              │ analyticsService│─fire&forget▶│ tracking │
                              │ (server-side)│            │ _events    │
                              └──────────────┘            └────────────┘
                                                                │
                              ┌──────────────┐            ┌────────────┐
                              │ metricsAggr  │──UPSERT──▶│ daily      │
                              │ (daily cron) │            │ _metrics   │
                              └──────────────┘            └────────────┘
                                                                │
                              ┌──────────────┐                  │
                              │ GET /health  │──SELECT──────────┘
                              │   -report    │
                              └──────────────┘
```

### 关键设计决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 前端发送 | queue + batch (5s / 20条) | 减少请求数，降低对业务请求的干扰 |
| 页面关闭 | navigator.sendBeacon() | 保证最后一批事件不丢 |
| 事件接收认证 | 不要求 JWT | C 端候选人无 token，需要追踪 H5 漏斗 |
| 服务端埋点 | fire-and-forget | 永不阻塞业务逻辑 |
| 数据聚合 | 预聚合 daily_metrics 表 | 仪表盘查询 <100ms，避免全表扫描 |
| AI 消费 | 单一 health-report 端点 | 最小化 token 消耗 |

---

## 2. 事件命名规范

### 格式

```
{domain}.{object}.{action}
```

### Domain 定义

| Domain | 含义 | 示例 |
|--------|------|------|
| `view` | 页面/视图生命周期 | `view.dashboard.entered` |
| `action` | 用户主动操作 | `action.sidebar.message_sent` |
| `funnel` | 业务漏斗关键节点 | `funnel.interview.created` |
| `agent` | Agent 流水线事件 | `agent.resume_pipeline.completed` |
| `error` | 错误事件 | `error.api.request_failed` |
| `perf` | 性能指标 | `perf.llm.call_completed` |

### 命名规则

1. **全小写**，点分隔
2. 动词用**过去式**（entered, completed, failed）
3. 属性中**禁止 PII**（手机号、姓名、邮箱），只用 ID
4. 新事件必须更新本文档的全量事件表

---

## 3. 全量事件表

### 3.1 前端事件

#### View 生命周期

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `view.dashboard.entered` | Dashboard 页面挂载 | — | DashboardView.tsx |
| `view.dashboard.exited` | Dashboard 页面卸载 | `duration_ms` | DashboardView.tsx |
| `view.report.entered` | 报告详情页挂载 | `candidate_id` | OrderDetailView.tsx |
| `view.report.exited` | 报告详情页卸载 | `duration_ms, candidate_id` | OrderDetailView.tsx |
| `view.tracking.entered` | 订单跟踪页挂载 | `candidate_id` | OrderDetailView.tsx |
| `view.tracking.exited` | 订单跟踪页卸载 | `duration_ms, candidate_id` | OrderDetailView.tsx |
| `view.h5_landing.entered` | 候选人 H5 落地页 | `session_id` | CandidateMobileView.tsx |
| `view.h5_chat.entered` | 候选人开始面试 | `session_id` | CandidateMobileView.tsx |
| `view.h5_ended.entered` | 候选人面试结束页 | `session_id` | CandidateMobileView.tsx |

#### 用户操作

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `action.navigation.changed` | 页面导航切换 | `from, to, target_id` | App.tsx |
| `action.auth.login_completed` | 登录成功 | `user_id` | AuthContext.tsx |
| `action.auth.login_failed` | 登录失败 | `error` | AuthContext.tsx |
| `action.auth.logout` | 用户登出 | — | AuthContext.tsx |
| `action.sidebar.message_sent` | Sidebar 发消息 | `has_candidate_context, is_override` | EileenSidebar.tsx |
| `action.sidebar.file_uploaded` | Sidebar 上传文件 | `file_type` | EileenSidebar.tsx |
| `action.sidebar.chat_cleared` | 清空对话记录 | — | EileenSidebar.tsx |
| `action.dashboard.notification_clicked` | 点击通知 | `candidate_id` | DashboardView.tsx |
| `action.dashboard.mark_all_read` | 全部标记已读 | — | DashboardView.tsx |
| `action.dashboard.candidate_clicked` | 点击候选人行 | `candidate_id, status` | DashboardView.tsx |
| `action.h5.message_sent` | 候选人发消息 | `session_id, type(text/voice)` | CandidateMobileView.tsx |

#### 漏斗事件（前端）

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `funnel.ksq.confirmed` | HR 确认初筛方案 | `items_count, was_edited` | EileenSidebar.tsx |
| `funnel.invitation.copied` | HR 复制邀约文本 | — | EileenSidebar.tsx |
| `funnel.resume.parsed` | 简历解析成功 | `candidate_id` | api.ts |
| `funnel.interview.created` | 面试邀约创建 | `candidate_id, channel` | api.ts |
| `funnel.decision.made` | HR 做出决策 | `candidate_id, decision` | OrderDetailView.tsx |

#### 错误事件（前端）

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `error.api.request_failed` | API 请求返回非 success | `path, status, code` | api.ts |

### 3.2 服务端事件

#### 漏斗事件（服务端）

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `funnel.interview.created` | 面试邀约创建 | `candidate_id, channel, session_id` | interviews.ts |
| `funnel.landing.opened` | 候选人打开链接 | `session_id, candidate_id` | interviews.ts |
| `funnel.interview.started` | 面试开始 | `session_id, candidate_id` | interviews.ts |
| `funnel.interview.ended` | 面试结束 | `session_id, candidate_id, reason` | interviews.ts |
| `funnel.report.delivered` | 报告交付 | `session_id, candidate_id, recommendation, observation_count` | interviews.ts |

#### Agent 流水线

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `agent.resume_pipeline.started` | 简历解析流水线开始 | `role` | orchestrator.ts |
| `agent.resume_pipeline.completed` | 简历解析流水线完成 | `role, duration_ms, raw_text_length, ksq_count` | orchestrator.ts |
| `agent.analysis_pipeline.started` | 分析流水线开始 | `message_count, ksq_count` | orchestrator.ts |
| `agent.analysis_pipeline.completed` | 分析流水线完成 | `duration_ms, observation_count, recommendation, tag_count` | orchestrator.ts |

#### LLM 性能

| 事件名 | 触发时机 | 属性 | 来源文件 |
|--------|---------|------|---------|
| `perf.llm.call_completed` | 单次 LLM 调用完成 | `model, provider, latency_ms, prompt_tokens, completion_tokens, total_tokens` | llmService.ts |
| `perf.llm.tool_call_iteration` | Tool-calling 单轮迭代 | `model, iteration, latency_ms, total_tokens` | llmService.ts |

---

## 4. 数据库 Schema

### tracking_events（原始事件）

| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID PK | 自动生成 |
| event_name | VARCHAR(100) | 事件名（如 `view.dashboard.entered`） |
| properties | JSONB | 事件属性 |
| client_id | UUID | 前端持久化的设备 ID |
| session_id | UUID | 页面级会话 ID |
| user_id | UUID FK → users | 可空（候选人无 user_id） |
| platform | VARCHAR(20) | `web` / `extension` / `h5` / `server` |
| app_version | VARCHAR(20) | 如 `0.1.0` |
| event_time | TIMESTAMPTZ | 事件发生时间 |
| created_at | TIMESTAMPTZ | 入库时间 |

### daily_metrics（预聚合日指标）

| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID PK | 自动生成 |
| metric_date | DATE | 指标日期 |
| metric_name | VARCHAR(100) | 指标名（如 `dau`, `funnel.interview.created`） |
| metric_value | NUMERIC | 数值 |
| dimensions | JSONB | 额外维度（如 `{"platform": "web"}`） |
| created_at | TIMESTAMPTZ | 入库时间 |

UNIQUE 约束：`(metric_date, metric_name, dimensions)`

---

## 5. API 端点

### POST /api/analytics/events

批量事件接收，**不要求 JWT**。

```json
{
  "events": [
    { "event": "view.dashboard.entered", "properties": {}, "timestamp": "2026-03-05T10:00:00Z" }
  ],
  "context": {
    "clientId": "uuid",
    "sessionId": "uuid",
    "userId": "uuid",
    "platform": "web",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "userAgent": "...",
    "appVersion": "0.1.0"
  }
}
```

### GET /api/analytics/health-report

**需要 JWT**。返回产品健康仪表盘数据。

Query 参数：
- `days`（可选，默认 7）：回溯天数

返回类型：`AnalyticsHealthReport`（见 `shared/types.ts`）

### POST /api/analytics/aggregate

**需要 JWT**。手动触发日聚合。

```json
{ "date": "2026-03-04" }
```

---

## 6. 前端追踪 SDK

### 初始化

```typescript
// App.tsx
import { initAnalytics, track } from './services/analytics';

useEffect(() => {
  initAnalytics('web'); // 或 'extension' / 'h5'
}, []);
```

### 追踪事件

```typescript
track('action.sidebar.message_sent', {
  has_candidate_context: true,
  is_override: false,
});
```

### 页面停留追踪

```typescript
import { useViewTracking } from './hooks/useViewTracking';

// 组件顶层
useViewTracking('dashboard');
// 或带属性
useViewTracking('report', { candidate_id: candidateId });
```

### 用户身份

```typescript
import { setUserId, clearUserId } from './services/analytics';

// 登录后
setUserId(user.id);
// 登出后
clearUserId();
```

---

## 7. 服务端追踪

```typescript
import { trackServerEvent } from './services/analyticsService';

// fire-and-forget，永不 await
trackServerEvent('funnel.interview.created', {
  candidate_id: candidateId,
  channel: 'TEXT',
}, userId);
```

---

## 8. 健康仪表盘指标

| 分类 | 指标 | 告警阈值 |
|------|------|---------|
| 增长 | DAU, 新用户数, 会话数 | DAU 环比 < -30% |
| 漏斗 | 简历→邀约→打开→开始→完成→交付 | 打开→开始 < 40% |
| 参与 | 平均停留, Sidebar 消息数, 功能使用 | — |
| 质量 | 面试时长, Observation 数, 推荐分布 | 面试 <5min 异常 |
| 系统 | API 错误率, LLM 延迟/P95/Token | 错误率 >5%, P95 >10s |

---

## 9. 新增埋点流程

1. 在本文档「全量事件表」中新增一行
2. 按命名规范 `{domain}.{object}.{action}` 命名
3. 在代码中添加 `track()` 或 `trackServerEvent()` 调用
4. 如需聚合，在 `metricsAggregator.ts` 中添加对应计算逻辑
5. 更新 `docs/tracking-changelog.md` 记录变更
6. 提交代码 + 文档一并 review

---

## 10. 隐私合规

- 事件属性中**严禁包含** PII（手机号、姓名、邮箱、身份证）
- 只允许使用 UUID 格式的 ID 关联用户和候选人
- `client_id` 持久化在 localStorage，用户清除浏览器数据即失效
- 服务端 `user_id` 可选，候选人事件无 user_id
