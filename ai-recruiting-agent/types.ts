
export enum ViewState {
  INITIATION = 'INITIATION',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  ORDER_TRACKING = 'ORDER_TRACKING', // 🆕 New View for Order Tracking
  CANDIDATE_MOBILE = 'CANDIDATE_MOBILE'
}

export type SignalType = 'CONFIDENT' | 'HESITANT' | 'CONTRADICTORY' | 'VAGUE';

// 🆕 Strict B2B Order Workflow Statuses
export enum CandidateStatus {
  PENDING_OUTREACH = 'PENDING_OUTREACH', // 待触达
  INVITED = 'INVITED',                   // 已邀请
  INTERVIEWING = 'INTERVIEWING',         // 正在面试
  ANALYZING = 'ANALYZING',               // 分析中
  DELIVERED = 'DELIVERED',               // 已交付
  EXCEPTION = 'EXCEPTION'                // 异常/超时
}

export interface TimelineEvent {
  time: string;
  title: string;
  detail?: string;
}

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
}

// 🆕 Structure for Parsed Resume Content
export interface ResumeSection {
  id: string;
  type: 'header' | 'work' | 'project' | 'skills' | 'education';
  title?: string;
  content: any; // Flexible content structure for rendering
  verificationStatus?: 'verified' | 'warning' | 'risk' | 'neutral';
}
