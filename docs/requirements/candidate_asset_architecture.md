# 候选人资产化存储架构（Candidate-Centric Asset Model）

> **文档性质**：后端架构需求（MVP 必须实现）  
> **前端影响**：无。本文档所述内容在前端不做任何透出。

---

## 核心理念

从"面向单次面试（Interview_ID）"的存储结构，升级为**"面向候选人（Candidate_ID）"的资产挂载模式**。

AI 采集的有效数据必须与**人**绑定，而非与某次面试绑定。为后续平台的"验证后简历推荐（Verified Profile）"和"跨企业能力复用"做数据基建。

---

## 数据解耦要求

底层表结构必须将以下两类数据**分离存储**：

### 1. Interview_Record（单次面试记录）
与具体的一次面试强绑定，属于 B 企业的私有数据。

| 字段 | 说明 |
|------|------|
| `interview_id` | 面试唯一 ID |
| `candidate_id` | 关联的候选人全局 ID |
| `enterprise_id` | 发起面试的企业 ID |
| `job_requirement` | 岗位要求（JD 摘要） |
| `ksq_config` | 本次面试的 KSQ 配置 |
| `call_metadata` | 通话元数据（时长、开始/结束时间、录音地址） |
| `raw_transcript` | 完整转写文本 |
| `report_json` | 本次报告（Observations + Decision） |
| `status` | 面试状态（CandidateStatus 枚举） |
| `created_at` / `updated_at` | 时间戳 |

### 2. Candidate_Verified_Tags（候选人全局能力标签库）
与**人**绑定，可跨企业、跨面试累积。

| 字段 | 说明 |
|------|------|
| `tag_id` | 标签唯一 ID |
| `candidate_id` | 候选人全局 ID（主键关联） |
| `dimension` | 能力维度（CompetencyDimension） |
| `label` | 定性标签，如"高并发组件排查经验" |
| `rating` | 评级（excellent / good / fair / concern） |
| `confidence` | 置信度（High / Mid / Low） |
| `evidence_clip_url` | 对应的原声切片地址（30-90s） |
| `evidence_quote` | 文字摘要 |
| `source_interview_id` | 数据来源的面试 ID（溯源用） |
| `source_level` | 来源层级（L3 项目真实性 / L4 冰山下素质） |
| `created_at` | 标签创建时间 |

---

## Tag 挂载逻辑

在每次面试结束分析时：

1. AI 引擎产出 Observations（五段式卡片）
2. 对于触发 **L3**（项目真实性/能力评估）和 **L4**（冰山下素质/行为表现）的 Observation：
   - 提取 `competencyDimension` + `competencyLabel` + `competencyRating` → 生成 Verified Tag
   - 绑定对应的原声切片 `evidence_clip_url` + 文字摘要 `quote`
   - 以**增量方式**写入该候选人的 `Candidate_Verified_Tags` 表
3. 同一候选人多次面试 → Tag 库不断扩充（不覆盖，只追加）

### 示例

> 候选人张三在 A 企业的面试中展现了 "高并发组件排查经验（Mid）"  
> → 生成一条 Tag：`{ dimension: 'logic', label: '高并发组件排查经验', rating: 'fair', confidence: 'Mid', evidence_clip_url: 'https://...45s.mp3' }`  
> → 挂载到 `candidate_id = zhang_san_001` 下  
> → 后续 B 企业面试同一个人时，该标签已存在（但 B 企业 UI 不可见）

---

## 前端克制体验（业务约束）

> **⚠️ MVP 阶段严格执行以下约束：**

| 端 | 约束 | 原因 |
|----|------|------|
| **C 端**（候选人 H5） | 不做任何透出。界面保持工具属性，强调"为当前企业面试" | 不可宣发"平台资产"、"免试"等概念，降低认知摩擦 |
| **B 端**（HR Dashboard） | 只展示当次报告结果。不跨企业/跨业务线查询候选人历史标签 | 尊重数据边界，避免隐私争议 |
| **后台** | 所有资产化积累**静默进行** | 先跑通数据基建，UI 透出留给未来版本 |

---

## 对 shared/types.ts 的影响

**当前：无影响。** 上述数据结构仅存在于后端数据库层，前端不引用。

**未来（若 B 端需要展示跨面试档案时）**：需在 `shared/types.ts` 中新增：
```typescript
// 候选人全局能力档案（未来 B 端透出时使用）
export interface VerifiedTag {
  tagId: string;
  dimension: CompetencyDimension;
  label: string;
  rating: CompetencyRating;
  confidence: 'High' | 'Mid' | 'Low';
  evidenceClipUrl: string;
  evidenceQuote: string;
  sourceInterviewId: string;
  createdAt: string;
}

export interface CandidateProfile {
  candidateId: string;
  verifiedTags: VerifiedTag[];
  interviewCount: number;
  lastInterviewAt: string;
}
```

但 **MVP 阶段不添加**，避免前端误用。
