# Ailin 侧边栏对话 Agent — 后端实现规格

## 一、Agent 定位

Ailin 侧边栏对话 Agent 是 HR 的 AI 招聘助理，运行在浏览器插件侧边栏中。

**职责边界**：

| 职责 | 走哪条通路 |
|------|-----------|
| 异步事件推送（报告交付、状态变更、异常告警） | **新动态区块**（Dashboard 页面内，结构化列表） |
| HR 主动提问 / 操作指令 | **对话 Agent**（侧边栏对话流，自然语言交互） |

> Agent **不**负责主动推送。它只在 HR 主动发消息时响应。

---

## 二、Agent 能力（Function Calling Tools）

Agent 是一个支持 function-calling 的 LLM，拥有以下工具：

### 2.1 工具清单

| Tool 名称 | 作用 | 参数 | 返回 |
|-----------|------|------|------|
| `query_candidate` | 查询候选人当前状态 | `candidateId?: string`, `name?: string` | 候选人详情（姓名、岗位、状态、面试进度、最近事件） |
| `list_candidates` | 列出候选人列表 | `status?: CandidateStatus`, `verdict?: 'Proceed'\|'FollowUp'\|'Hold'`, `limit?: number` | 候选人摘要数组 |
| `create_interview` | 创建面试邀约 | `candidateId: string`, `channel: 'TEXT'\|'VOICE'`, `ksqItems: KSQItem[]` | `{ sessionId, inviteUrl, inviteText, expiresAt }` |
| `update_ksq` | 修改面试关键考察问题 | `sessionId: string`, `ksqItems: KSQItem[]` | 更新确认 |
| `get_report` | 获取面试评估报告 | `candidateId?: string`, `sessionId?: string` | 报告摘要（评分、关键发现、建议） |
| `get_daily_summary` | 获取今日工作汇总 | 无 | `{ totalScreened, proceed, followUp, hold, inProgress, exceptions }` |
| `search_resume` | 在简历库中搜索 | `query: string`, `filters?: { minExp?, role?, education? }` | 匹配的简历列表 |

### 2.2 工具详细定义（OpenAI function-calling 格式）

```json
[
  {
    "name": "query_candidate",
    "description": "根据候选人 ID 或姓名查询其当前状态、面试进度和最近事件",
    "parameters": {
      "type": "object",
      "properties": {
        "candidateId": { "type": "string", "description": "候选人 ID" },
        "name": { "type": "string", "description": "候选人姓名（模糊匹配）" }
      }
    }
  },
  {
    "name": "list_candidates",
    "description": "列出候选人列表，支持按状态和评估结果筛选",
    "parameters": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": ["PENDING_OUTREACH", "TOUCHED", "INTERVIEWING", "ANALYZING", "DELIVERED", "EXCEPTION"],
          "description": "按候选人状态筛选"
        },
        "verdict": {
          "type": "string",
          "enum": ["Proceed", "FollowUp", "Hold"],
          "description": "按评估结论筛选（仅 DELIVERED 状态有效）"
        },
        "limit": { "type": "integer", "default": 10, "description": "返回数量上限" }
      }
    }
  },
  {
    "name": "create_interview",
    "description": "为指定候选人创建面试邀约，生成邀请链接和邀约文案",
    "parameters": {
      "type": "object",
      "properties": {
        "candidateId": { "type": "string", "description": "候选人 ID" },
        "channel": {
          "type": "string",
          "enum": ["TEXT", "VOICE"],
          "description": "面试渠道：TEXT=文字对话, VOICE=语音对话"
        },
        "ksqItems": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "topic": { "type": "string", "description": "考察话题，如'React 项目经验深度'" },
              "rubric": { "type": "string", "description": "通过标准，如'能说出具体优化指标'" }
            },
            "required": ["id", "topic", "rubric"]
          },
          "description": "关键考察问题列表"
        }
      },
      "required": ["candidateId", "channel", "ksqItems"]
    }
  },
  {
    "name": "update_ksq",
    "description": "修改已创建面试的关键考察问题（面试开始前有效）",
    "parameters": {
      "type": "object",
      "properties": {
        "sessionId": { "type": "string", "description": "面试会话 ID" },
        "ksqItems": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "topic": { "type": "string" },
              "rubric": { "type": "string" }
            },
            "required": ["id", "topic", "rubric"]
          }
        }
      },
      "required": ["sessionId", "ksqItems"]
    }
  },
  {
    "name": "get_report",
    "description": "获取候选人的面试评估报告摘要",
    "parameters": {
      "type": "object",
      "properties": {
        "candidateId": { "type": "string" },
        "sessionId": { "type": "string" }
      }
    }
  },
  {
    "name": "get_daily_summary",
    "description": "获取今日 AI 招聘助理的工作汇总数据",
    "parameters": { "type": "object", "properties": {} }
  },
  {
    "name": "search_resume",
    "description": "在简历库中搜索匹配的候选人",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "搜索关键词，如'3年以上Java经验'" },
        "filters": {
          "type": "object",
          "properties": {
            "minExp": { "type": "integer", "description": "最低工作年限" },
            "role": { "type": "string", "description": "岗位名称" },
            "education": { "type": "string", "description": "最低学历" }
          }
        }
      },
      "required": ["query"]
    }
  }
]
```

---

## 三、System Prompt

```
你是 Ailin，一个专业的 AI 招聘助理。你运行在浏览器插件的侧边栏中，与 HR 进行对话。

## 你的职责
1. 帮助 HR 快速了解候选人状态（调用 query_candidate / list_candidates）
2. 协助发起面试邀约（调用 create_interview）
3. 回答关于面试报告的问题（调用 get_report）
4. 提供工作汇总（调用 get_daily_summary）
5. 在简历库中搜索候选人（调用 search_resume）

## 你的风格
- 简洁、专业、高效
- 回复控制在 2-3 句话以内，避免冗长
- 涉及操作时先确认再执行（如发送邀约前确认候选人和面试类型）
- 当 HR 提到简历/候选人时，优先调用工具获取真实数据，而非猜测
- 使用中文回复

## 上下文
你会收到以下浏览器上下文信息：
- browserContext.currentUrl: HR 当前浏览的页面 URL（可用于判断 HR 在看哪个候选人）
- browserContext.pageTitle: 当前页面标题
- browserContext.selectedText: HR 在页面上选中的文本（可能是简历片段）

请根据上下文智能理解 HR 的意图。例如：
- 如果 HR 在某个简历页面上说"帮我看看这个人"，你应该从 currentUrl 或 selectedText 中提取候选人信息
- 如果 HR 说"发个面试邀请"，你应该先确认候选人身份和面试类型，然后调用 create_interview

## 限制
- 你无法直接修改数据库，所有操作通过工具完成
- 你无法发送邮件/短信，但可以生成邀约文案供 HR 复制
- 对于不确定的信息，明确告知 HR 并建议验证
```

---

## 四、API 接口

### 4.1 发送消息

```
POST /api/chat/messages
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body**:

```typescript
interface ChatMessageRequest {
  content: string;                    // HR 输入的文本
  browserContext?: {
    currentUrl?: string;              // 当前页面 URL
    pageTitle?: string;               // 页面标题
    selectedText?: string;            // 选中的文本
  };
}
```

**Response Body**:

```typescript
interface ChatMessageResponse {
  userMessageId: string;              // 用户消息 ID
  aiReply: {
    id: string;                       // AI 回复 ID
    content: string;                  // AI 回复文本（Markdown）
    actions?: ChatAgentAction[];      // Agent 执行的动作（前端可据此做 UI 响应）
  };
}

interface ChatAgentAction {
  type: 'navigate' | 'create_interview' | 'show_candidate' | 'show_report';
  payload: Record<string, unknown>;
  // 示例:
  // { type: 'navigate', payload: { view: 'REPORT', candidateId: '7' } }
  // { type: 'create_interview', payload: { sessionId: 'xxx', inviteUrl: '...' } }
}
```

**前端如何处理 actions**：
- `navigate` → 调用 `onNavigate(payload.view, payload.candidateId)` 跳转页面
- `create_interview` → 显示邀约卡片 UI
- `show_candidate` → 高亮 Dashboard 中的候选人行
- `show_report` → 跳转到报告页

### 4.2 获取对话历史

```
GET /api/chat/messages
Authorization: Bearer <jwt_token>
```

**Response Body**:

```typescript
interface ChatHistoryResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions?: ChatAgentAction[];
    createdAt: string;                // ISO 8601
  }>;
}
```

### 4.3 清空对话历史

```
DELETE /api/chat/messages
Authorization: Bearer <jwt_token>
```

**Response**: `{ success: true }`

---

## 五、通知事件 API（新动态数据源）

这部分与 Agent 独立，但共享基础设施。后端在候选人状态流转时产生事件，前端通过轮询拉取。

### 5.1 获取通知摘要

```
GET /api/notifications/summary
Authorization: Bearer <jwt_token>
```

**Response Body**:

```typescript
interface NotificationSummaryResponse {
  unreadCount: number;
  events: CandidateUpdateEvent[];
}

interface CandidateUpdateEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  eventType: CandidateEventType;
  message: string;
  severity: 'success' | 'info' | 'error';
  isRead: boolean;
  createdAt: string;                  // ISO 8601
}

type CandidateEventType =
  | 'report_delivered'                // 报告已交付
  | 'candidate_opened'                // 候选人已打开链接
  | 'interview_completed'             // 面试已完成
  | 'interview_exception'             // 面试异常
  | 'status_changed';                 // 状态流转
```

### 5.2 标记已读

```
PATCH /api/notifications/:id/read
Authorization: Bearer <jwt_token>
```

### 5.3 全部已读

```
PATCH /api/notifications/read-all
Authorization: Bearer <jwt_token>
```

### 5.4 事件产生时机

| 触发条件 | eventType | severity | message 示例 |
|---------|-----------|----------|-------------|
| 候选人打开 H5 面试链接 | `candidate_opened` | info | "候选人已打开面试链接" |
| 面试正常完成 | `interview_completed` | info | "面试已完成，正在生成报告" |
| 报告生成并交付 | `report_delivered` | success | "初筛报告已交付 — 建议面试" |
| 面试异常中断 | `interview_exception` | error | "面试异常中断 — 建议人工介入" |
| 候选人状态流转 | `status_changed` | info | "状态更新：待触达 → 已触达" |

---

## 六、Agent 的价值

1. **降低操作门槛**：HR 不需要记住界面入口，直接说"帮我看看赵嘉明的情况"，Agent 调工具查询并回复
2. **上下文感知**：Agent 知道 HR 当前在看哪个页面、选中了什么文本，可以智能理解意图（如在简历页说"帮我筛一下"，Agent 自动提取简历内容）
3. **多步操作编排**：如"帮我给这个人发面试邀请"，Agent 可以：解析简历 → 确认候选人 → 选择面试类型 → 创建邀约 → 返回链接
4. **自然语言兜底**：当 HR 不知道该点哪个按钮时，对话是最自然的交互方式

---

## 七、TypeScript 类型定义

所有上述接口类型已定义在 `shared/types.ts` 中，后端可直接引用：

- `CandidateEventType`
- `CandidateUpdateEvent`
- `NotificationSummaryResponse`
- `ChatMessageRequest`
- `ChatAgentAction`
- `ChatMessageResponse`
- `ChatHistoryResponse`
