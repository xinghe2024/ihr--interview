
export enum ViewState {
  WELCOME = 'WELCOME',
  INITIATION = 'INITIATION',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  ORDER_TRACKING = 'ORDER_TRACKING',
  CANDIDATE_MOBILE = 'CANDIDATE_MOBILE'
}

export type SignalType = 'CONFIDENT' | 'HESITANT' | 'CONTRADICTORY' | 'VAGUE';

// 🆕 Event Codes for State Machine — 覆盖完整业务链路
export enum EventCode {
  TASK_CREATED = 'TASK_CREATED',                // 任务创建
  RESUME_PARSED = 'RESUME_PARSED',              // 简历解析完成
  INVITE_COPIED = 'INVITE_COPIED',              // HR 已复制邀约链接
  LANDING_OPENED = 'LANDING_OPENED',            // 候选人打开链接
  INTERVIEW_STARTED = 'INTERVIEW_STARTED',      // 面试开始（通话建立）
  INTERVIEW_ENDED = 'INTERVIEW_ENDED',          // 面试结束（通话结束）
  INTERVIEW_EXCEPTION = 'INTERVIEW_EXCEPTION',  // 面试异常中断
  ANALYSIS_STARTED = 'ANALYSIS_STARTED',        // 分析报告生成中
  REPORT_READY = 'REPORT_READY',                // 报告就绪
  REPORT_DELIVERED = 'REPORT_DELIVERED',         // 报告已交付
}

// 🆕 Strict B2B Order Workflow Statuses
export enum CandidateStatus {
  PENDING_OUTREACH = 'PENDING_OUTREACH', // 待触达
  TOUCHED = 'TOUCHED',                    // 已触达（LANDING_OPENED 事件触发）
  INTERVIEWING = 'INTERVIEWING',         // 正在面试
  ANALYZING = 'ANALYZING',               // 分析中（INTERVIEW_ENDED 之后、REPORT_DELIVERED 之前）
  DELIVERED = 'DELIVERED',               // 已交付（REPORT_DELIVERED + evidence_playable=true）
  EXCEPTION = 'EXCEPTION'                // 异常/超时
}

// ─── 通知 / 新动态 ───────────────────────────────

export type CandidateEventType =
  | 'report_delivered'       // 报告已交付
  | 'candidate_opened'       // 候选人已打开链接
  | 'interview_completed'    // 面试已完成
  | 'interview_exception'    // 面试异常
  | 'status_changed';        // 状态流转

export interface CandidateUpdateEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  eventType: CandidateEventType;
  message: string;                    // "初筛报告已交付 — 建议面试"
  severity: 'success' | 'info' | 'error';
  isRead: boolean;
  createdAt: string;                  // ISO 8601
}

/** GET /api/notifications/summary — 通知摘要 */
export interface NotificationSummaryResponse {
  unreadCount: number;
  events: CandidateUpdateEvent[];
}

/** PATCH /api/notifications/:id/read — 标记单条已读 */
// 无 request body，响应使用 ApiResponse<{ id: string; isRead: true }>

/** PATCH /api/notifications/read-all — 全部标记已读 */
// 无 request body，响应使用 ApiResponse<{ updatedCount: number }>

// ─── 对话 Agent API ─────────────────────────────

/** POST /api/chat/messages — 发送消息给 Agent */
export interface ChatMessageRequest {
  content: string;
  browserContext?: {
    currentUrl?: string;
    pageTitle?: string;
    selectedText?: string;            // HR 选中的简历文本
  };
}

export interface ChatAgentAction {
  type: 'navigate' | 'create_interview' | 'show_candidate' | 'show_report';
  payload: Record<string, unknown>;
}

export interface ChatMessageResponse {
  userMessageId: string;
  aiReply: {
    id: string;
    content: string;
    actions?: ChatAgentAction[];
  };
}

/** GET /api/chat/messages — 对话历史 */
export interface ChatHistoryResponse {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions?: ChatAgentAction[];
    createdAt: string;
  }>;
}

/** DELETE /api/chat/messages — 清空对话历史 */
// 无 request body，响应使用 ApiResponse<{ cleared: true }>

// ─────────────────────────────────────────────────

export interface TimelineEvent {
  time: string;
  title: string;
  detail?: string;
  eventCode?: EventCode;  // 事件码
}

export type CompetencyDimension = 'communication' | 'logic' | 'learning' | 'integrity' | 'stability' | 'motivation';
export type CompetencyRating = 'excellent' | 'good' | 'fair' | 'concern';

export interface Observation {
  id: string;
  category: string;
  title: string;
  observation: string;
  quote: string;
  evidenceTime: string;
  signalType: SignalType;
  confidence?: 'High' | 'Mid' | 'Low';
  gap?: string;
  nextQuestion?: string;
  relatedSectionId?: string; // Link to Resume Section ID for evidence chain
  // 🆕 增强证据链（异步语音面试方案）
  resumeClaim?: string;         // 简历中的原始声称（如"接入 20+ 子应用"）
  interviewContext?: string;    // 触发该观察的面试问答上下文摘要
  // 通用素质评估字段（后端内部标签，不对外展示）
  competencyDimension?: CompetencyDimension;
  competencyRating?: CompetencyRating;
  competencyLabel?: string; // 定性标签，如"流畅清晰"、"频繁跳槽"
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  status: CandidateStatus;
  recommendation: 'Proceed' | 'FollowUp' | 'Hold';
  avatar: string;
  lastUpdate: string;
  timeline?: TimelineEvent[];
  landing_opened_at?: string;      // LANDING_OPENED 事件时间
  report_ready_at?: string;         // REPORT_READY 事件时间
  evidence_playable?: boolean;     // 证据是否可播放
}

// ========== 详细简历数据结构 ==========

// 基础身份信息
export interface BasicProfile {
  name: string;
  gender?: 'male' | 'female';
  age?: number;
  birthDate?: string; // YYYY-MM
  currentStatus?: '在职' | '离职' | '看机会';
  workYears?: number;
  highestEducation?: string; // 如：本科、硕士
  hukou?: string; // 户口
  politicalStatus?: string; // 政治面貌
  currentCity?: string;
  currentDistrict?: string;
  nationality?: string; // 民族
  // 教育经历（整合到基础信息）
  education?: {
    school: string;
    major: string;
    degree: string;
    startDate: string;
    endDate: string;
  };
}

// 联系方式
export interface Contact {
  phone?: string;
  email?: string;
  wechat?: string;
  qq?: string;
}

// 求职意向
export interface JobPreference {
  preferredCities?: string[];
  preferredPositions?: string[];
  expectedSalaryRange?: string; // 如：20k-30k
  preferredIndustries?: string[];
}

// 个人简介
export interface ProfileSummary {
  careerOverview?: string;
  coreCompetencies?: string;
  keywords?: string[]; // 行业/技术关键词
}

// 工作经历（单段）
export interface WorkExperience {
  id: string;
  companyName: string;
  companyType?: string; // 公司性质/标签
  position: string;
  positionType?: string; // 职位类型
  salary?: string;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM，空表示至今
  duration?: string; // 自动计算
  responsibilityTags?: string[]; // 职责模块标签
  descriptions: Array<{ id: string; text: string; status?: 'verified' | 'risk' | 'neutral' }>;
  reportingTo?: string; // 汇报对象
  teamSize?: number; // 团队规模
}

// 项目经历（单段）
export interface ProjectExperience {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  duration?: string;
  background?: string;
  responsibilities?: string[];
  methodologies?: string[]; // 方法论/工具
  outcomes?: string[]; // 项目成果
  projectScale?: string; // 项目规模
}

// 教育经历（单段）
export interface Education {
  id: string;
  school: string;
  schoolTier?: string; // 985/211
  major: string;
  degree: string;
  educationType?: '统招' | '非统招';
  startDate: string;
  endDate: string;
  gpa?: string; // GPA/成绩
}

// 个人优势
export interface Strengths {
  capabilities?: string[];
  industryExperience?: string[];
  methodologies?: string[];
  softSkills?: string[];
}

// 培训经历（单段）
export interface Training {
  id: string;
  institution: string;
  date: string;
  topic: string;
}

// 语言能力（单语言）
export interface Language {
  name: string;
  readingLevel?: string;
  speakingLevel?: string;
}

// 证书资质
export interface Certificate {
  id: string;
  name: string;
  level?: string;
}

// 专业技能（单技能）
export interface Skill {
  name: string;
  yearsOfExperience?: number;
  proficiency?: string; // 熟练度等级
}

// 完整简历数据
export interface DetailedResume {
  basicProfile: BasicProfile;
  contact: Contact;
  jobPreference?: JobPreference;
  profileSummary?: ProfileSummary;
  workExperiences: WorkExperience[];
  projectExperiences?: ProjectExperience[];
  educations: Education[];
  strengths?: Strengths;
  trainings?: Training[];
  languages?: Language[];
  certificates?: Certificate[];
  skills: Skill[];
}

// 🆕 Structure for Parsed Resume Content
/**
 * @deprecated 旧版简历 section 格式，已被 DetailedResume 替代。
 * 仅 ReportView.tsx（遗留 demo 页面）仍引用此类型，生产代码不应使用。
 */
export interface ResumeSection {
  id: string;
  type: 'header' | 'basic' | 'contact' | 'jobPreference' | 'summary' | 'work' | 'workList' | 'project' | 'projectList' | 'education' | 'strengths' | 'training' | 'languages' | 'certificates' | 'skills';
  title?: string;
  content: BasicProfile | Contact | JobPreference | ProfileSummary | WorkExperience | WorkExperience[] | ProjectExperience | ProjectExperience[] | Education | Strengths | Training | Language[] | Certificate[] | Skill[] | any; // 保持 any 以兼容旧数据
  verificationStatus?: 'verified' | 'warning' | 'risk' | 'neutral';
}

// ========== KSQ (Key Screening Questions) ==========

export interface KSQItem {
  id: string;
  topic: string;          // e.g. "React 项目经验深度"
  rubric: string;         // e.g. "能说出具体优化指标和数据"
  result?: 'pass' | 'partial' | 'fail';
  evidence?: string;      // e.g. "能说出 FCP 提升 40%，时间切片原理"
}

export interface BaselineCoverage {
  label: string;          // e.g. "薪资匹配"
  status: 'pass' | 'warning' | 'unchecked';
}

// ================================================================
// ========== API 契约：前后端共享的请求/响应类型 ==========
// ================================================================

// ---------- 通用 ----------

/** 所有 API 的统一响应包装 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;       // 机器可读错误码，如 'AUTH_INVALID_CODE'
    message: string;    // 人类可读错误信息
  };
}

/** 分页参数（请求） */
export interface PaginationParams {
  page?: number;        // 页码，从 1 开始，默认 1
  pageSize?: number;    // 每页条数，默认 20
}

/** 分页信息（响应） */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;        // 总记录数
  totalPages: number;   // 总页数
}

// ================================================================
// ========== 阶段 1：用户认证 ==========
// ================================================================

/** POST /api/auth/send-code — 发送验证码 */
export interface SendCodeRequest {
  phone: string;        // 手机号，如 '13800000000'
}

/** POST /api/auth/login — 手机号 + 验证码登录 */
export interface LoginRequest {
  phone: string;
  code: string;         // 短信验证码
}

export interface LoginResponse {
  token: string;        // JWT access token
  refreshToken: string; // 刷新 token
  expiresIn: number;    // token 有效期（秒）
  user: UserProfile;    // 用户信息
}

/** 用户信息（登录后前端持有） */
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  company: string;
  role: string;         // 如 '高级HR经理'、'招聘总监'
  avatar?: string;
  zhaopinUserId?: string;  // 智联招聘用户 ID 关联
}

/** POST /api/auth/zhaopin-exchange — 智联 token 换 NEXUS JWT */
export interface ZhaopinExchangeRequest {
  zpAccessToken: string;
}

/** JWT Token 解码后的 payload（前端一般不直接用，但类型需对齐） */
export interface TokenPayload {
  userId: string;
  phone: string;
  companyId: string;
  iat: number;          // issued at
  exp: number;          // expires at
}

/** POST /api/auth/refresh — 刷新 token */
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

// ================================================================
// ========== 阶段 1：候选人 CRUD ==========
// ================================================================

/** POST /api/candidates — 创建候选人 */
export interface CreateCandidateRequest {
  name: string;
  phone?: string;
  email?: string;
  role: string;         // 应聘岗位
  resumeFileId?: string; // 上传后的文件 ID（阶段 2 接入）
}

export interface CreateCandidateResponse {
  candidate: Candidate;
}

/** PUT /api/candidates/:id — 更新候选人 */
export interface UpdateCandidateRequest {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  status?: CandidateStatus;
  recommendation?: 'Proceed' | 'FollowUp' | 'Hold';
}

/** GET /api/candidates — 获取候选人列表 */
export interface ListCandidatesParams extends PaginationParams {
  status?: CandidateStatus;                               // 按状态筛选
  recommendation?: 'Proceed' | 'FollowUp' | 'Hold';      // 按推荐结果筛选
  search?: string;                                          // 模糊搜索（姓名/岗位）
  sortBy?: 'lastUpdate' | 'name';                            // 排序字段（matchScore 已删除）
  sortOrder?: 'asc' | 'desc';                               // 排序方向
}

export interface ListCandidatesResponse {
  candidates: Candidate[];
  pagination: PaginationMeta;
}

/** GET /api/candidates/:id — 获取候选人详情（含简历 + 时间线） */
export interface CandidateDetailResponse {
  candidate: Candidate;
  resume?: DetailedResume;          // 解析后的结构化简历
  timeline: TimelineEvent[];         // 全链路事件日志
  observations?: Observation[];      // 面试报告卡片
  ksqResults?: KSQItem[];            // KSQ 结果
  baselineCoverage?: BaselineCoverage[];  // 基础覆盖
}

/** DELETE /api/candidates/:id — 删除候选人 */
// 无 request body，响应使用 ApiResponse<{ deleted: true }>

// ================================================================
// ========== 阶段 1.5：文件上传 ==========
// ================================================================

/** POST /api/files/upload — 上传简历文件（multipart/form-data） */
export interface FileUploadResponse {
  fileId: string;             // 文件唯一 ID（后续关联候选人用）
  fileName: string;           // 原始文件名
  mimeType: string;           // MIME 类型，如 'application/pdf'
  size: number;               // 文件大小（字节）
  uploadedAt: string;         // 上传时间 ISO 8601
}

// ================================================================
// ========== 阶段 2：候选人面试（C 端 H5） ==========
// ================================================================

/**
 * 面试会话模式
 * - TEXT:  文字对话（MVP，纯 HTTP）
 * - VOICE: 语音对话（后续，WebRTC + STT/TTS）
 */
export type InterviewChannelType = 'TEXT' | 'VOICE';

/**
 * 面试会话状态（服务端维护）
 */
export enum InterviewSessionStatus {
  CREATED = 'CREATED',             // 已创建，候选人尚未打开
  LANDING_OPENED = 'LANDING_OPENED', // 候选人已打开 H5 落地页
  IN_PROGRESS = 'IN_PROGRESS',     // 面试进行中
  COMPLETED = 'COMPLETED',         // 正常完成
  ABANDONED = 'ABANDONED',         // 候选人中途放弃
  EXPIRED = 'EXPIRED',             // 链接超时（48h）
}

// ---------- 面试邀请（HR 侧触发） ----------

/** POST /api/interviews — HR 创建面试邀请 */
export interface CreateInterviewRequest {
  candidateId: string;              // 候选人 ID
  channel: InterviewChannelType;    // 面试渠道
  ksqItems: KSQItem[];              // 关键考察问题
  baselineItems?: BaselineCoverage[]; // 基础覆盖项（MVP 暂不使用，预留）
  expiresInHours?: number;          // 链接有效期（默认 48h）
  maxDurationMinutes?: number;      // 🆕 面试最长时长（分钟），默认 30，用于防作弊
}

export interface CreateInterviewResponse {
  sessionId: string;                // 面试会话 ID
  inviteUrl: string;                // 候选人 H5 链接，如 https://app.ailin.ai/i/{sessionId}
  inviteText: string;               // 生成的邀约文案（可直接复制发送）
  expiresAt: string;                // 过期时间 ISO 8601
}

// ---------- 候选人 H5 端 ----------

/** GET /api/interviews/{sessionId}/landing — 候选人打开 H5 链接 */
export interface InterviewLandingResponse {
  sessionId: string;
  candidateName: string;            // 候选人姓名（用于页面称呼）
  recruiterTitle: string;           // 委托人称呼，如 "李先生"
  positionTitle: string;            // 岗位名称
  companyAlias?: string;            // 公司别名（可选，保护隐私）
  channel: InterviewChannelType;
  estimatedMinutes: number;         // 预计时长（分钟）
  maxDurationMinutes: number;       // 🆕 面试最长时长（分钟），前端倒计时用
  status: InterviewSessionStatus;
  expiresAt: string;
}

/** POST /api/interviews/{sessionId}/start — 候选人点击"开始对话" */
export interface StartInterviewRequest {
  channel: InterviewChannelType;    // 候选人实际选择的渠道（可能与创建时不同）
}

export interface StartInterviewResponse {
  /** 文字模式：AI 的第一条消息 */
  firstMessage?: string;
  /** 语音模式：WebRTC 房间信息 */
  rtcRoomId?: string;
  rtcToken?: string;
  /** 面试进度 */
  progress?: InterviewProgress;
}

/** 面试进度信息（前端显示 "问题 2/8"） */
export interface InterviewProgress {
  currentQuestion: number;    // 当前问题序号（从 1 开始）
  totalQuestions: number;     // 总问题数
}

// ---------- 文字面试：消息交互（MVP 核心） ----------

/**
 * 面试消息角色
 * - ai:        AI 面试官
 * - candidate: 候选人
 * - system:    系统消息（如超时提醒）
 */
export type InterviewMessageRole = 'ai' | 'candidate' | 'system';

export interface InterviewMessage {
  id: string;
  sessionId: string;
  role: InterviewMessageRole;
  content: string;                    // 文字内容（AI 回复 / 候选人文字 / 语音转写文本）
  timestamp: string;                  // ISO 8601
  /** AI 消息可携带当前考察维度，前端可展示 */
  topic?: string;                     // 如 "React 项目经验深度"
  // 🆕 语音消息扩展（异步语音面试方案）
  audioUrl?: string;                  // 语音文件播放地址（仅候选人语音消息有）
  audioDuration?: number;             // 语音时长（秒）
  isTranscript?: boolean;             // content 是否为 STT 转写（true=语音转写，false/undefined=原始文字）
}

/** POST /api/interviews/{sessionId}/messages — 候选人发送一条消息 */
export interface SendMessageRequest {
  content?: string;             // 文字消息内容（文字输入时必填）
  audioFileId?: string;         // 语音消息的文件 ID（语音输入时必填）
  audioDuration?: number;       // 语音时长（秒），前端录制时计算
  // content 和 audioFileId 二选一
  // 语音流程：前端松手 → 静默上传到 /api/files/upload 拿到 fileId → 发此请求
}

export interface SendMessageResponse {
  /** 候选人消息的服务端 ID */
  candidateMessageId: string;
  /** AI 回复（同步返回，SSE 流式返回时此字段为空） */
  aiReply?: InterviewMessage;
  /** 面试是否结束（AI 判断最后一轮时返回 true） */
  isCompleted?: boolean;
  /** 面试进度 */
  progress?: InterviewProgress;
}

/** GET /api/interviews/{sessionId}/messages — 获取历史消息（断线重连） */
export interface ListMessagesResponse {
  messages: InterviewMessage[];
  isCompleted: boolean;
  elapsedSeconds: number;           // 已用时（秒）
}

// ---------- 语音面试：WebRTC 信令（后续阶段） ----------

/** POST /api/interviews/{sessionId}/rtc/token — 获取/刷新 RTC token */
export interface RtcTokenResponse {
  rtcRoomId: string;
  rtcToken: string;
  rtcProvider: 'livekit' | 'agora' | 'daily';  // 允许后端切换供应商
  iceServers?: Array<{
    urls: string[];
    username?: string;
    credential?: string;
  }>;
}

// ---------- 面试结束 & 结果 ----------

/** POST /api/interviews/{sessionId}/end — 主动结束面试 */
export interface EndInterviewRequest {
  reason: 'completed' | 'candidate_quit' | 'timeout' | 'error';
}

export interface EndInterviewResponse {
  sessionId: string;
  status: InterviewSessionStatus;
  summary: InterviewSummary;
}

/** 面试摘要（结束后返回给候选人 + HR） */
export interface InterviewSummary {
  totalDurationSeconds: number;
  topicsCovered: number;            // 考察话题数
  questionsAnswered: number;        // 已作答数
  completionRate: number;           // 完成率 0~1
}

// ---------- Webhook / 事件回调（通知 HR 侧） ----------

/** 面试状态变更事件（推送给 HR 侧系统） */
export interface InterviewStatusEvent {
  eventType: 'interview.started' | 'interview.completed' | 'interview.abandoned' | 'interview.expired';
  sessionId: string;
  candidateId: string;
  timestamp: string;
  summary?: InterviewSummary;       // completed 时携带
}
