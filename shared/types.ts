
export enum ViewState {
  WELCOME = 'WELCOME',
  INITIATION = 'INITIATION',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  ORDER_TRACKING = 'ORDER_TRACKING',
  CANDIDATE_MOBILE = 'CANDIDATE_MOBILE'
}

export type SignalType = 'CONFIDENT' | 'HESITANT' | 'CONTRADICTORY' | 'VAGUE';

// 🆕 Event Codes for State Machine
export enum EventCode {
  LANDING_OPENED = 'LANDING_OPENED',      // H5落地页打开
  CALL_ENDED = 'CALL_ENDED',              // 通话结束
  ANALYSIS_STARTED = 'ANALYSIS_STARTED',  // 分析开始
  REPORT_READY = 'REPORT_READY',           // 报告就绪
  REPORT_DELIVERED = 'REPORT_DELIVERED'   // 报告交付
}

// 🆕 Strict B2B Order Workflow Statuses
export enum CandidateStatus {
  PENDING_OUTREACH = 'PENDING_OUTREACH', // 待触达
  TOUCHED = 'TOUCHED',                    // 已触达（LANDING_OPENED 事件触发）
  INTERVIEWING = 'INTERVIEWING',         // 正在面试
  ANALYZING = 'ANALYZING',               // 分析中（CALL_ENDED 之后、REPORT_DELIVERED 之前）
  DELIVERED = 'DELIVERED',               // 已交付（REPORT_DELIVERED + evidence_playable=true）
  EXCEPTION = 'EXCEPTION'                // 异常/超时
}

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
  relatedSectionId?: string; // 🆕 Link to Resume Section ID for evidence chain
  // 🆕 通用素质评估字段
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
  matchScore: number;
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
  sortBy?: 'lastUpdate' | 'matchScore' | 'name';           // 排序字段
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
