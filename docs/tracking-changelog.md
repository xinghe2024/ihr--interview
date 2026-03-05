# Ailin 埋点变更日志 (Tracking Changelog)

> 记录每次埋点新增、修改、废弃的变更，确保数据口径连续可追溯。

## 格式说明

每条变更记录包含：
- **日期**：变更生效日期
- **类型**：`added` / `modified` / `deprecated` / `removed`
- **事件名**：受影响的事件名
- **说明**：变更内容
- **影响**：对聚合/仪表盘的影响（如有）

---

## v1.0.0 — 2026-03-05（初始版本）

### Added（新增）

| 事件名 | 平台 | 说明 |
|--------|------|------|
| `view.dashboard.entered/exited` | 前端 | Dashboard 页面停留追踪 |
| `view.report.entered/exited` | 前端 | 报告详情页停留追踪 |
| `view.tracking.entered/exited` | 前端 | 订单跟踪页停留追踪 |
| `view.h5_landing.entered` | 前端 | H5 落地页打开 |
| `view.h5_chat.entered` | 前端 | H5 面试开始 |
| `view.h5_ended.entered` | 前端 | H5 面试结束页 |
| `action.navigation.changed` | 前端 | 页面导航切换 |
| `action.auth.login_completed` | 前端 | 登录成功 |
| `action.auth.login_failed` | 前端 | 登录失败 |
| `action.auth.logout` | 前端 | 用户登出 |
| `action.sidebar.message_sent` | 前端 | Sidebar 发消息 |
| `action.sidebar.file_uploaded` | 前端 | Sidebar 上传文件 |
| `action.sidebar.chat_cleared` | 前端 | 清空对话记录 |
| `action.dashboard.notification_clicked` | 前端 | 点击通知 |
| `action.dashboard.mark_all_read` | 前端 | 全部标记已读 |
| `action.dashboard.candidate_clicked` | 前端 | 点击候选人行 |
| `action.h5.message_sent` | 前端 | 候选人发消息 |
| `funnel.ksq.confirmed` | 前端 | HR 确认初筛方案 |
| `funnel.invitation.copied` | 前端 | HR 复制邀约文本 |
| `funnel.resume.parsed` | 前端 | 简历解析成功 |
| `funnel.interview.created` | 前端+后端 | 面试邀约创建 |
| `funnel.decision.made` | 前端 | HR 做出决策 |
| `funnel.landing.opened` | 后端 | 候选人打开链接 |
| `funnel.interview.started` | 后端 | 面试开始 |
| `funnel.interview.ended` | 后端 | 面试结束 |
| `funnel.report.delivered` | 后端 | 报告交付 |
| `agent.resume_pipeline.started/completed` | 后端 | 简历解析流水线 |
| `agent.analysis_pipeline.started/completed` | 后端 | 分析流水线 |
| `perf.llm.call_completed` | 后端 | LLM 单次调用性能 |
| `perf.llm.tool_call_iteration` | 后端 | Tool-calling 迭代性能 |
| `error.api.request_failed` | 前端 | API 请求失败 |

### 基础设施

- 新建 `tracking_events` 表（原始事件）
- 新建 `daily_metrics` 表（预聚合日指标）
- 新建 `POST /api/analytics/events` — 批量事件接收
- 新建 `GET /api/analytics/health-report` — 健康仪表盘 API
- 新建 `POST /api/analytics/aggregate` — 手动日聚合触发
- 新建前端 SDK：`client/services/analytics.ts`
- 新建 Hook：`client/hooks/useViewTracking.ts`
- 新建服务端 helper：`server/src/services/analyticsService.ts`
- 新建聚合器：`server/src/services/metricsAggregator.ts`

---

## 变更模板

```markdown
## vX.Y.Z — YYYY-MM-DD

### Added
| 事件名 | 平台 | 说明 |
|--------|------|------|

### Modified
| 事件名 | 变更内容 | 影响 |
|--------|---------|------|

### Deprecated
| 事件名 | 替代方案 | 计划移除版本 |
|--------|---------|------------|

### Removed
| 事件名 | 原因 |
|--------|------|
```
