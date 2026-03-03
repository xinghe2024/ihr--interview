# 艾琳 (Ailin) 项目

---

## 0）一句话产品（低频更新）

艾琳：B端发起 AI 初筛 → 生成邀约链接 → C端异步语音/文字面试（MVP）/ 实时语音面试（后续）→ AI 输出结构化证据报告 → B端阅卷决策。

---

## 1）产品骨架（低频更新）

### B端（侧边栏 + 阅卷页）

* 入口：浏览器侧边栏（Side Panel）+ Sidebar 对话 Agent
* 发起路径 A：拖拽上传 PDF → AI 解析简历 → 生成 KSQ 确认卡 → 邀约卡
* 发起路径 B：招聘平台简历页 →「交给艾琳来初面」→ 抓取简历 → 同上
* 进度：Dashboard 候选人列表 + 状态流转 + 新动态通知
* 阅卷：报告页（AI 结论 + KSQ 回答 + 信号观察详情）——MVP 无 BaselineCoverage（无 JD）
* 决策：Proceed / Follow-up / Hold（三态路由）

### C端（H5 落地页 + 面试页）

* 信任落地页：品牌 + 岗位信息 + 预计时长 + 面试倒计时
* 面试页（MVP）：异步语音（微信模式）+ 文字对话，AI 实时追问，Interview Agent 控制对话
* 面试页（后续）：实时语音通话，语音团队负责通话，预生成追问链

---

## 2）状态与流程（低频更新）

### 候选人状态机 (CandidateStatus)

```
PENDING_OUTREACH → TOUCHED → INTERVIEWING → ANALYZING → DELIVERED
    任意状态 → EXCEPTION（异常/超时）
```

### 事件码 (EventCode) — 驱动状态流转

```
TASK_CREATED → RESUME_PARSED → INVITE_COPIED → LANDING_OPENED
→ INTERVIEW_STARTED → INTERVIEW_ENDED → ANALYSIS_STARTED
→ REPORT_READY → REPORT_DELIVERED
  （异常分支：INTERVIEW_EXCEPTION）
```

### 面试会话状态 (InterviewSessionStatus)

```
CREATED → LANDING_OPENED → IN_PROGRESS → COMPLETED
  分支：ABANDONED（中途放弃）/ EXPIRED（48h 超时）
```

### 输出报告结构

AI 结论（verdict + 摘要）/ KSQ Result（pass/partial/fail + evidence）/ 信号观察（CONTRADICTORY/VAGUE/HESITANT/CONFIDENT + 证据链）/ 建议追问 / Recommendation（Proceed|Follow-up|Hold）

> MVP 无 BaselineCoverage（无 JD 信息输入，无法判断硬性条件匹配）

---

## 3）当前版本"可执行变更清单"

> 规则：只写能直接改代码/改交互的条目。保持 3–8 条，旧的删掉即可。

### 当前生效版本：v1.3

* [新增] 后端 Agent 架构搭建（Resume / KSQ / **Interview** / Analysis / Report / Sidebar 六个 Agent + Orchestrator）
* [新增] 数据库基建（Supabase PostgreSQL）
* [新增] LLM 适配层（支持多模型热切换）
* [新增] 阶段 1 API 实现（认证 + 候选人 CRUD + 文件上传）
* [新增] 阶段 2 API 实现（面试会话 + 消息交互 + 语音消息支持）
* [新增] 对话 Agent API + 通知 API
* [新增] STT 服务集成（语音转文字，讯飞/阿里云）
* [变更] MVP 删除 BaselineCoverage（无 JD 输入）
* [变更] 面试模式改为异步语音（微信模式）+ 文字，Interview Agent 重新回归
* [变更] 观察体系改为信号检测（4 种信号 + 证据链）

---

## 4）硬约束 / 禁改项

1. `shared/types.ts` 是前后端唯一契约，改动必须提前沟通
2. 禁止：顺手重构/目录重排/全量格式化/改无关样式与逻辑
3. 后端 Agent 内部类型放 `server/` 内部，不污染 `shared/`
4. 所有配置走环境变量，代码中零硬编码
5. 不确定就先问，不允许擅自扩大改动范围

---

## 5）执行协议（永不改）

你处于【执行模式】时必须：

1. 先给 Plan：改哪些文件、各改哪里、明确不会改哪里
2. 再给 Patch：优先 unified diff；或"变更片段+精确插入位置"
3. 附带：潜在回归点 ≥ 3 条

---

## 6）本次变更卡（CR）模板（我每次会按此格式给你）

* 目标（单一）：<一句话>
* 允许改的文件：<最多3个>
* 禁止改动：<列3条>
* 验收标准：<1-3条>

---

*Last Updated: 2026-02-28*