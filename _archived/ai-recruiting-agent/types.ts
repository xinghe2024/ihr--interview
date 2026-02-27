
export enum ViewState {
  INITIATION = 'INITIATION',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  ORDER_TRACKING = 'ORDER_TRACKING', // 🆕 New View for Order Tracking
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
