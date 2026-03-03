# 艾琳 (Ailin) AI 招聘助理 — 需求文档 V1.3

> **版本**：V1.3
> **日期**：2026-02-28
> **变更说明**：整合后端架构讨论结论、types.ts 最新契约、过程文档修订内容，形成完整需求基线。
> **权威数据源**：`shared/types.ts`（前后端唯一契约）

---

## 一、产品定位

### 一句话描述

艾琳是一个 AI 驱动的招聘初筛助理。B 端（HR）通过浏览器插件发起初筛任务，AI 解析简历、生成考察方案、执行异步语音/文字面试（MVP）、输出结构化证据报告，帮助 HR 快速做出"通过/待定/淘汰"的路由决策。

### 长期愿景

从"初筛工具"演进为"候选人 AI 经纪人"——候选人的能力数据以资产形式跨面试累积，实现"验证后简历"和"增量面试"（参见 `candidate_asset_architecture.md`）。MVP 阶段**仅静默积累数据**，不对外透出。

---

## 二、用户角色

| 角色 | 端 | MVP 交互方式 |
|------|---|-------------|
| HR / 招聘者 | B 端（Chrome 插件侧边栏 + Dashboard + 报告页） | Web UI + Sidebar 对话 Agent |
| 候选人 | C 端（H5 移动页） | 异步语音/文字面试（MVP），实时语音面试（后续） |

---

## 三、核心业务流程

```
HR 上传简历 / 一键分析
        ↓
  Resume Agent 解析简历 → DetailedResume
        ↓
  KSQ Agent 生成考察方案 → KSQItem[]（含追问链建议）
        ↓
  HR 确认/修改 KSQ → 生成邀约卡 → 复制链接发送
        ↓
  候选人打开 H5 → 异步语音/文字面试（MVP，Interview Agent 实时控制对话）
        ↓
  面试结束 → Interview Agent 交出完整 transcript
        ↓
  Analysis Agent 分析 transcript + 简历 → 4 种信号（CONTRADICTORY/VAGUE/HESITANT/CONFIDENT）+ 证据链
        ↓
  Report Agent 综合 KSQ + Observations → Recommendation + Decision 理由 + 建议追问
        ↓
  报告交付 → HR 阅卷决策（Proceed / Follow-up / Hold）
```

---

## 四、后端架构

### 4.1 Agent 架构（6 Agent + 1 Orchestrator）

| Agent | 职责 | 输入 | 输出 | 触发方式 |
|-------|------|------|------|---------|
| **Resume Agent** | 解析简历为结构化数据 | PDF/文本 | `DetailedResume` | Orchestrator 调用 |
| **KSQ Agent** | 生成考察题目 + rubric + 追问链 | `DetailedResume` | `KSQItem[]`（含追问链建议） | Orchestrator 调用 |
| **Interview Agent** | 🆕 实时对话控制，动态追问 | 简历 + KSQ + 对话历史 + 时间 | AI 回复 + topic + isCompleted | 每轮消息触发 |
| **Analysis Agent** | 分析完整 transcript，信号检测 | transcript + 简历 | `Observation[]`（4 种信号 + 证据链） | Orchestrator 调用 |
| **Report Agent** | 生成最终报告 + Decision | `KSQItem[]` + `Observation[]` | 完整报告 + `Recommendation` | Orchestrator 调用 |
| **Sidebar Agent** | HR 的 AI 对话助理 | HR 消息 + browserContext | 回复文本 + Actions | HR 主动发消息 |

**Orchestrator**：纯流程代码（无 AI），按顺序调度流水线 Agent，传递数据，处理异常。

**Interview Agent**（MVP 新增）：在异步语音/文字模式下控制整个面试对话流程，按 KSQ 顺序逐个考察，动态追问，具备时间感知能力（剩余时间不足时加速收尾）。

**Sidebar Agent** 独立于流水线，通过 function-calling 调用系统 API（查候选人、看报告、发邀约等）。详见 `docs/ailin-sidebar-agent.md`。

### 4.2 LLM 适配层

- 统一接口：`chat(prompt, options) → response`
- 每个 Agent 可独立配置使用不同模型（优先中国国产模型）
- 模型切换只改配置，不改 Agent 代码
- Prompt 模板存数据库，支持版本化管理和 A/B 测试

### 4.3 STT 服务

- 集成讯飞实时语音转写 API 或阿里云语音识别
- 音频格式：opus / m4a（移动端录音常用格式）
- 支持普通话 + 简单英文混合
- 转写结果存入 `InterviewMessage.content`，标记 `isTranscript = true`

### 4.4 数据库

- **Supabase（PostgreSQL）**
- 免费层 MVP 足够（500MB 数据库 + 1GB 存储）
- 内置 Auth、Row Level Security
- 迁移到公司服务器时只需导出数据 + 改连接串

### 4.5 部署策略

- Docker 容器化，所有配置走环境变量
- MVP：Vercel / Google Cloud Run
- 后续：迁移到公司服务器（Docker 镜像 + 环境变量，零代码改动）

---

## 五、数据模型

### 5.1 前后端共享类型（types.ts）

#### 候选人状态机

```
CandidateStatus:
  PENDING_OUTREACH → TOUCHED → INTERVIEWING → ANALYZING → DELIVERED
  任意状态 → EXCEPTION
```

#### 事件码（驱动状态流转）

```
EventCode:
  TASK_CREATED → RESUME_PARSED → INVITE_COPIED → LANDING_OPENED
  → INTERVIEW_STARTED → INTERVIEW_ENDED → ANALYSIS_STARTED
  → REPORT_READY → REPORT_DELIVERED
  异常分支：INTERVIEW_EXCEPTION
```

#### 面试会话状态

```
InterviewSessionStatus:
  CREATED → LANDING_OPENED → IN_PROGRESS → COMPLETED
  分支：ABANDONED / EXPIRED
```

#### 核心数据结构

| 类型 | 用途 |
|------|------|
| `Candidate` | 候选人基础信息 + 状态 + 推荐结论 |
| `DetailedResume` | 结构化简历（基础信息、工作/项目/教育经历、技能等） |
| `Observation` | 信号观察卡片（4 种信号 + 证据链 + 内部 competency 标签） |
| `KSQItem` | 关键考察题（topic + rubric + result + evidence） |
| `BaselineCoverage` | 基础覆盖项（类型保留，**MVP 暂不使用**——无 JD 输入） |
| `InterviewMessage` | 面试对话消息（🆕 支持语音：audioUrl + audioDuration + isTranscript） |
| `CandidateUpdateEvent` | 通知事件 |

### 5.2 后端独有数据（不在 types.ts 中）

| 表 | 用途 | 参考文档 |
|----|------|---------|
| `Interview_Record` | 单次面试记录（企业私有） | `candidate_asset_architecture.md` |
| `Candidate_Verified_Tags` | 候选人全局能力标签库（跨面试累积） | `candidate_asset_architecture.md` |
| `Prompt_Templates` | Agent prompt 模板（版本化） | 后端内部 |
| `Agent_Configs` | 各 Agent 的模型配置 | 后端内部 |
| `Chat_History` | Sidebar Agent 对话历史 | 后端内部 |

---

## 六、API 契约总览

> 详细字段定义见 `shared/types.ts`，此处仅列出接口清单。

### 阶段 1：认证 + 候选人管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/send-code` | 发送验证码 |
| POST | `/api/auth/login` | 手机号 + 验证码登录 |
| POST | `/api/auth/refresh` | 刷新 token |
| POST | `/api/candidates` | 创建候选人 |
| GET | `/api/candidates` | 候选人列表（分页/筛选/排序） |
| GET | `/api/candidates/:id` | 候选人详情（含简历/时间线/报告） |
| PUT | `/api/candidates/:id` | 更新候选人 |
| DELETE | `/api/candidates/:id` | 删除候选人 |

### 阶段 1.5：文件上传

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/files/upload` | 上传简历文件（multipart/form-data） |

### 阶段 2：面试会话（C 端 H5）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/interviews` | 创建面试邀约 |
| GET | `/api/interviews/:sid/landing` | 候选人打开落地页 |
| POST | `/api/interviews/:sid/start` | 候选人开始面试 |
| POST | `/api/interviews/:sid/messages` | 候选人发送消息 |
| GET | `/api/interviews/:sid/messages` | 获取历史消息 |
| POST | `/api/interviews/:sid/end` | 结束面试 |
| POST | `/api/interviews/:sid/rtc/token` | WebRTC token（后续阶段） |

### 对话 Agent + 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/messages` | 发送消息给 Sidebar Agent |
| GET | `/api/chat/messages` | 获取对话历史 |
| DELETE | `/api/chat/messages` | 清空对话历史 |
| GET | `/api/notifications/summary` | 获取通知摘要 |
| PATCH | `/api/notifications/:id/read` | 标记单条已读 |
| PATCH | `/api/notifications/read-all` | 全部标记已读 |

---

## 七、考核体系

### 设计原则

- **LLM 为主，规则为辅**：规则可迭代性差，LLM 判断 + 证据链才是核心竞争力
- **能算的给结论，不能算的给证据**：硬技能给明确判断，软素质提供行为证据
- **CompetencyDimension 仅作后端内部标签**，报告页不对外展示维度评分

### 信号观察体系（Observation）

面试结束后，Analysis Agent 对完整 transcript + 简历进行信号检测，输出 `Observation[]`，每条观察必须包含完整证据链：

| 信号类型 | 含义 | 必须提供的证据 |
|---------|------|-------------|
| `CONTRADICTORY`（矛盾） | 简历声称与对话表述不一致 | resumeClaim + quote + observation |
| `VAGUE`（模糊） | 追问后仍未给出具体信息 | 被问了什么 + 候选人实际回答 |
| `HESITANT`（回避） | 明显转移话题/不正面回答 | 原始问题 + 回避方式 |
| `CONFIDENT`（扎实） | 具体数据、完整案例、清晰逻辑 | 具体的扎实证据 |

每条信号标注 `confidence: High / Mid / Low`。

### KSQ 机制（重点考察）

- AI 从简历中提取 1-3 道关键考察题（KSQ）
- 每题包含：topic（考察话题）+ rubric（通过标准）+ 追问链建议（2-3 个递进问题）
- HR 可确认/修改/替换
- Interview Agent 按 KSQ 顺序逐个考察，动态追问
- 面试后 AI 按 rubric 判定：pass / partial / fail

### BaselineCoverage — MVP 暂不实现

**原因**：MVP 阶段没有 JD（岗位描述）输入，无法判断薪资/学历/工作年限等硬性条件是否符合岗位要求。招聘者愿意发起初筛，说明硬性条件已通过人工预判。

**后续计划**：如需加入，前置条件是设计 JD 采集流程。类型定义保留在 types.ts 中不删除。

### CompetencyDimension（后端内部标签）

| 维度 | 含义 |
|------|------|
| `communication` | 沟通表达 |
| `logic` | 逻辑思维 |
| `learning` | 学习能力 |
| `integrity` | 诚信度 |
| `stability` | 稳定性 |
| `motivation` | 求职动机 |

> 仅作为 Observation 的内部分类标签，不对外展示评分。

---

## 八、报告呈现结构

```
① AI 结论区
   ├── Recommendation：Proceed / Follow-up / Hold
   └── AI 总结文案（1-2 句话）

② KSQ 回答区（重点考察）
   ├── Q1: [topic] → pass ✅ → rubric + evidence
   ├── Q2: [topic] → partial ⚠️ → rubric + evidence
   └── Q3: [topic] → fail ❌ → rubric + evidence

③ 关键观察区（按信号类型分组）
   ├── ⚠️ 风险信号（CONTRADICTORY / VAGUE / HESITANT）
   │   每条：信号标签 + 置信度 + 标题 + 简历声称 + 候选人原话 + AI 判断理由
   └── ✅ 扎实表现（CONFIDENT）
       每条：标题 + 候选人原话 + AI 判断理由

④ 建议追问区（仅 FollowUp 时展示）

⑤ 批注简历（保持现有）

⑥ 证据面板（支持音频播放）

注：BaselineCoverage 区域 MVP 不渲染（无 JD 数据源）
不展示：competencyDimension 评分、competencyRating 色块、维度雷达图
```

---

## 九、面试交互模式

产品模型类比微信：两种沟通方式，异步沟通（发消息）为主、实时通话（语音电话）为辅。

### 模式一：异步沟通（MVP 主模式）

候选人通过 H5 页面与 AI 进行异步对话。**统一聊天界面**同时支持语音输入和文字输入，可随时切换。

**界面架构**：
- 单一聊天界面（类似微信对话窗），不分"语音模式"和"文字模式"
- 底部输入栏默认为语音输入（"按住说话"），左侧图标可切换为文字输入
- AI 始终以文字气泡回复；候选人语音消息以语音条气泡展示（含时长）
- Landing 页展示"异步沟通"（可用）和"实时通话"（即将上线，灰色占位）两个选项卡

**语音交互（微信模式）**：
- 按住说话 → 松手直接发送（无上传按钮，后台静默处理）
- 上滑取消发送（滑动距离超过 80px）
- 后台管道：上传音频 → STT 转写 → Interview Agent 回复 → 前端渲染文字气泡
- 单条语音限时 120 秒（110 秒时闪烁警告，120 秒自动停止）
- 录音中显示浮层：红色脉冲圆点 + 实时时长 + "上滑取消"提示
- 浏览器不支持 MediaRecorder 时自动降级为纯文字模式

**文字交互**：
- 标准文字输入框 + 发送按钮
- Enter 键发送
- 与语音消息在同一对话流中混排

**候选人端音频上传**：
- 独立端点 `POST /api/interviews/:sessionId/audio-upload`，使用 `interviewGuard()` 鉴权（不需要 HR JWT）
- 返回 `fileId`，随后通过 `sendMessage({ audioFileId, audioDuration })` 发送

**时长控制（防作弊）**：
- 全局倒计时：面试开始后限时 30 分钟（`maxDurationMinutes`，可配置）
- 单轮回复限时：每题回复窗口 5 分钟，超时 AI 自动跳到下一题
- 顶部显示剩余时间进度条
- Interview Agent 具备时间感知：剩余时间不足时加速收尾

**Interview Agent 行为准则**：
1. 按 KSQ 顺序逐个考察，每个 KSQ 允许 1-3 轮追问
2. 追问触发条件：回答模糊 / 数据与简历不一致 / 未正面回答
3. 总对话轮数控制在 10-20 轮
4. 语气专业友善，不给候选人压迫感

### 模式二：实时语音通话（未来）

由语音团队负责通话技术（WebRTC + STT/TTS），我方提供预生成的追问链。信号采集能力弱于异步模式（无动态追问）。Landing 页以"即将上线"灰色标签展示。

---

## 十、候选人资产化（静默积累）

> MVP 阶段仅后端静默执行，前端不做任何透出。

- 每次面试结束后，Analysis Agent 将 L3（项目真实性）和 L4（冰山下素质）的 Observation 提取为 `Candidate_Verified_Tags`
- 标签以增量方式挂载到候选人全局 ID 下，跨面试累积
- 同一候选人多次面试 → Tag 库只追加不覆盖

详见 `docs/requirements/candidate_asset_architecture.md`。

---

## 十一、约束与边界

### types.ts 管控

- `shared/types.ts` 是前后端唯一数据契约
- 任何改动必须提前沟通，不可擅自修改
- 后端独有类型放 `server/` 内部

### MVP 范围

- 全链路跑通（简历解析 → 面试 → 报告），允许某些环节效果不完美
- 目标是发现能力天花板和瓶颈，不是追求完美
- 架构必须支持模型升级后无代码改动即可提升效果

### 部署与迁移

- 所有配置走环境变量，零硬编码
- Docker 容器化，迁移只需换部署目标 + 改环境变量
- MVP 独立域名部署，后续可迁移公司服务器

---

## 附录：文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 前后端契约 | `shared/types.ts` | **权威数据源** |
| 产品上下文 | `docs/requirements/context.md` | 产品骨架、状态机、执行协议 |
| 考察维度 | `docs/requirements/kaocha.md` | 5 大类 17 小类考察清单 |
| 候选人资产化 | `docs/requirements/candidate_asset_architecture.md` | 后端数据架构 |
| 面试邀约流程 | `docs/flows/interview_invitation_flow.md` | 触发路径 + 状态映射 |
| KSQ 交互流程 | `docs/flows/ksq_interaction_flow.md` | KSQ 确认卡 + 报告呈现 |
| AI 初筛重点 | `docs/flows/screening_focus_v1.md` | 分层结论 + Decision Card 设计 |
| Sidebar Agent | `docs/ailin-sidebar-agent.md` | Agent 能力 + API + System Prompt |
| 战略建议 | `docs/requirements/Requirements Discussion-1.md` | AI 经纪人方向论证 |
| 插件外围建设 | `docs/guides/extension_peripheral_features.md` | Chrome 商店上架、onboarding |

---

*Last Updated: 2026-02-28*
