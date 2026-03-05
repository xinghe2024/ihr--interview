import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewState, CandidateStatus, EventCode, Observation, KSQItem, BaselineCoverage } from '../../shared/types';
import type { CandidateDetailResponse, TimelineEvent, DetailedResume, WorkExperience, ProjectExperience, Education } from '../../shared/types';
import { ChevronLeft, ChevronDown, Clock, Mail, Phone, FileText, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, Copy, Bell, MoreHorizontal, XCircle, UserCheck, Mic2, Play, Pause, Download, Briefcase, MapPin, MessageSquare, Link, PhoneForwarded, RotateCcw, Loader2, GraduationCap, DollarSign, Search } from 'lucide-react';
import RedPenCard from '../components/RedPenCard';
import { useNotification } from '../contexts/NotificationContext';
import { candidates as candidatesApi } from '../services/api';
import eileenAvatarImg from '../assets/hr.png';

interface OrderDetailViewProps {
    candidateId: string | null;
    onNavigate: (view: ViewState) => void;
    defaultTab?: 'ANALYSIS' | 'TIMELINE' | 'RECORDING';
}

const EILEEN_AVATAR = eileenAvatarImg;

// --- 1. CONFIGURATION & TYPES ---

const STEPS = [
    { id: 'CREATED', label: '任务创建', icon: FileText },
    { id: 'PROCESSING', label: '进行中', icon: Loader2 },
    { id: 'DELIVERED', label: '已交付', icon: CheckCircle2 },
];

// 将 CandidateStatus 映射到 3 步进度条的索引
const STATUS_TO_STEP: Record<CandidateStatus, number> = {
    [CandidateStatus.PENDING_OUTREACH]: 0,
    [CandidateStatus.TOUCHED]: 1,
    [CandidateStatus.INTERVIEWING]: 1,
    [CandidateStatus.ANALYZING]: 1,
    [CandidateStatus.DELIVERED]: 2,
    [CandidateStatus.EXCEPTION]: 1,
};

// 进度条下方的阶段描述
const STATUS_DESCRIPTIONS: Record<CandidateStatus, string> = {
    [CandidateStatus.PENDING_OUTREACH]: '简历已解析，等待 HR 发送邀约',
    [CandidateStatus.TOUCHED]: '候选人已打开面试链接，等待开始对话',
    [CandidateStatus.INTERVIEWING]: 'AI 正在与候选人对话中',
    [CandidateStatus.ANALYZING]: '通话已结束，正在生成评估报告...',
    [CandidateStatus.DELIVERED]: '报告已交付，请查看分析结果',
    [CandidateStatus.EXCEPTION]: '任务异常，建议人工介入',
};

interface TimelineLog {
    time: string;
    title: string;
    detail: string;
    type?: 'default' | 'error' | 'success';
    eventCode?: EventCode;
}

// --- 2. TIMELINE EVENT → LOG CONVERTER ---

function timelineToLogs(events: TimelineEvent[]): TimelineLog[] {
    return events.map(evt => ({
        time: new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: evt.title,
        detail: evt.detail || '',
        eventCode: evt.eventCode as EventCode | undefined,
        type: evt.eventCode === EventCode.INTERVIEW_EXCEPTION ? 'error' as const
            : evt.eventCode === EventCode.REPORT_DELIVERED ? 'success' as const
                : 'default' as const,
    }));
}

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ candidateId, onNavigate, defaultTab = 'ANALYSIS' }) => {
    const { addToast } = useNotification();

    // --- API data loading ---
    const [apiData, setApiData] = useState<CandidateDetailResponse | null>(null);
    const [apiLoading, setApiLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (!candidateId) return;
        setApiLoading(true);
        setApiError(null);
        candidatesApi.get(candidateId)
            .then(data => setApiData(data))
            .catch(err => setApiError(err.message || '加载失败'))
            .finally(() => setApiLoading(false));
    }, [candidateId]);

    // Derive display fields from API data (with fallbacks)
    const status = (apiData?.candidate?.status as CandidateStatus) || CandidateStatus.PENDING_OUTREACH;
    const name = apiData?.candidate?.name || '加载中...';
    const role = apiData?.candidate?.role || '';
    const avatar = apiData?.candidate?.avatar || '';
    const logs = useMemo(() => timelineToLogs(apiData?.timeline || []), [apiData?.timeline]);

    // Local state for Decision Logic
    const [decisionState, setDecisionState] = useState<'NONE' | 'PROCESSING' | 'PROCEED' | 'FOLLOWUP' | 'HOLD'>('NONE');

    // Smart default tab logic
    const smartInitialTab = (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) ? 'TIMELINE' : defaultTab;
    const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'TIMELINE' | 'RESUME'>(smartInitialTab);

    useEffect(() => {
        if (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) {
            setActiveTab('TIMELINE');
        } else {
            setActiveTab(defaultTab);
        }
    }, [defaultTab, status]);

    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(false);
    const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [isReportLoading, setIsReportLoading] = useState(true);
    const totalDuration = 900; // 15 minutes in seconds

    // Skeleton entrance for report
    useEffect(() => {
        const timer = setTimeout(() => setIsReportLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // 3-WAY ROUTING DECISION HANDLER
    const handleDecision = async (type: 'PROCEED' | 'FOLLOWUP' | 'HOLD') => {
        if (!candidateId) return;
        setDecisionState('PROCESSING');
        const recommendationMap = { PROCEED: 'Proceed' as const, FOLLOWUP: 'FollowUp' as const, HOLD: 'Hold' as const };
        try {
            await candidatesApi.update(candidateId, { recommendation: recommendationMap[type] });
            setDecisionState(type);
            const msgs: Record<string, { title: string; type: 'success' | 'warning' | 'error' }> = {
                PROCEED: { title: `已通过「${name}」初筛`, type: 'success' },
                FOLLOWUP: { title: `已标记「${name}」为待定`, type: 'warning' },
                HOLD: { title: `已淘汰「${name}」`, type: 'error' },
            };
            const msg = msgs[type];
            addToast({ type: msg.type, title: msg.title });
        } catch (err: any) {
            setDecisionState('NONE');
            addToast({ type: 'error', title: err.message || '操作失败' });
        }
    };

    // Loading / Error state
    if (apiLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20">
                <div className="text-center">
                    <Loader2 size={32} className="text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">正在加载候选人信息...</p>
                </div>
            </div>
        );
    }
    if (apiError) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20">
                <div className="text-center">
                    <AlertTriangle size={32} className="text-rose-400 mx-auto mb-3" />
                    <p className="text-sm text-rose-600 mb-2">{apiError}</p>
                    <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="text-sm text-indigo-600 underline">返回工作台</button>
                </div>
            </div>
        );
    }

    // Progress Bar logic — use STATUS_TO_STEP mapping
    const currentStepIndex = STATUS_TO_STEP[status] ?? 0;
    const progressPercentage = (currentStepIndex / (STEPS.length - 1)) * 100;

    // Data from API (with fallback empty arrays for pre-report states)
    const observations: Observation[] = apiData?.observations || [];
    const resume: DetailedResume | undefined = apiData?.resume as DetailedResume | undefined;
    const transcript: Array<{ speaker: string; text: string; time: string; highlight?: string }> = []; // Transcript not in MVP API yet

    // AI Recommendation — use backend Report Agent result, fallback to simple heuristic
    const getAIRecommendation = () => {
        const backendRec = apiData?.candidate?.recommendation;
        if (backendRec === 'Proceed') return { type: 'Proceed' as const };
        if (backendRec === 'FollowUp') return { type: 'FollowUp' as const };
        if (backendRec === 'Hold') return { type: 'Hold' as const };
        // Fallback: simple heuristic if backend hasn't set recommendation
        const contradictory = observations.filter(o => o.signalType === 'CONTRADICTORY').length;
        const hesitant = observations.filter(o => o.signalType === 'HESITANT').length;
        if (contradictory > 0) return { type: 'Hold' as const };
        if (hesitant > 1) return { type: 'FollowUp' as const };
        return { type: 'Proceed' as const };
    };

    // AI summary from timeline REPORT_READY event
    const reportReadyEvent = (apiData?.timeline || []).find(t => t.eventCode === EventCode.REPORT_READY);
    const coreSummary = reportReadyEvent?.detail?.replace(/^推荐: \w+ — /, '') || (apiData?.candidate ? '报告数据来自 AI 分析引擎' : '');
    const followUpQuestions = observations.filter(o => o.nextQuestion);

    // Structured resume data
    const workExperiences: WorkExperience[] = resume?.workExperiences || [];
    const projectExperiences: ProjectExperience[] = resume?.projectExperiences || [];
    const educations: Education[] = resume?.educations || [];

    // KSQ Results & Baseline Coverage from API
    const ksqResults: KSQItem[] = apiData?.ksqResults || [];
    const ksqSectionMap: Record<string, string> = {};
    const baselineCoverage: BaselineCoverage[] = apiData?.baselineCoverage || [];

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Open evidence panel, expand matching segment, scroll to it
    const openEvidenceFor = (sectionId: string) => {
        setActiveSectionId(sectionId);
        setIsEvidencePanelOpen(true);
        const obs = observations.find(o => o.relatedSectionId === sectionId || sectionId.startsWith(o.relatedSectionId || ''));
        if (obs) {
            // Find the timeline segment linked to this observation
            const seg = interviewTimeline.find(s => s.obsId === obs.id);
            if (seg) setExpandedSegmentId(seg.id);
            setTimeout(() => {
                document.getElementById(`obs-card-${obs.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };
    const handleObservationClick = (sectionId?: string) => {
        if (!sectionId) return;
        setActiveSectionId(sectionId);
        document.getElementById(`resume-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Toggle segment expand/collapse
    const toggleSegment = (segId: string) => {
        setExpandedSegmentId(prev => prev === segId ? null : segId);
    };

    // Seek to a specific time
    const seekTo = (seconds: number) => {
        setPlaybackTime(seconds);
        setIsPlaying(true);
    };

    // --- SUB-VIEWS ---

    // Interview timeline segments with start/end seconds for scrubber
    const interviewTimeline = [
        { id: 'seg_0', startSec: 0, endSec: 180, label: '开场 / 自我介绍', obsId: null, status: 'neutral' as const, transcript: '候选人自我介绍，沟通基本信息和到岗时间意愿。语气自然，表达清晰。' },
        { id: 'seg_1', startSec: 180, endSec: 330, label: '技术深度：React 架构', obsId: 'o1', status: 'passed' as const, transcript: null },
        { id: 'seg_2', startSec: 330, endSec: 480, label: '微前端项目经验', obsId: null, status: 'neutral' as const, transcript: '候选人介绍了 qiankun 微前端的接入流程，整体叙述连贯，未发现明显矛盾。' },
        { id: 'seg_3', startSec: 500, endSec: 550, label: '履历核实：CRM 重构规模', obsId: 'o3', status: 'risk' as const, transcript: null },
        { id: 'seg_4', startSec: 550, endSec: 720, label: '团队协作与管理', obsId: null, status: 'neutral' as const, transcript: '候选人描述了与后端、设计团队的协作方式，提及每周 Code Review 实践。' },
        { id: 'seg_5', startSec: 730, endSec: 825, label: '离职动机', obsId: 'o2', status: 'warning' as const, transcript: null },
        { id: 'seg_6', startSec: 825, endSec: 900, label: '薪资意向 / 结束', obsId: null, status: 'neutral' as const, transcript: '确认薪资范围 29-35K，期望到岗时间 1 个月内。通话正常结束。' },
    ];

    const RenderAnalysisTab = () => {
        const rec = getAIRecommendation();
        const cfg = {
            Proceed: { emoji: '🟢', label: '综合建议：推荐面试', accent: 'border-l-emerald-500', accentBg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-slate-200' },
            FollowUp: { emoji: '🟡', label: '综合建议：可面试，需重点关注', accent: 'border-l-amber-400', accentBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-slate-200' },
            Hold: { emoji: '🔴', label: '综合建议：暂缓面试', accent: 'border-l-rose-500', accentBg: 'bg-rose-50', text: 'text-rose-700', border: 'border-slate-200' },
        }[rec.type];

        if (isReportLoading) {
            return (
                <div className="flex-1 overflow-hidden p-8">
                    <div className="max-w-[960px] mx-auto animate-pulse space-y-6">
                        {/* Skeleton: Candidate card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-32 bg-slate-200 rounded" />
                                    <div className="h-3 w-48 bg-slate-100 rounded" />
                                </div>
                            </div>
                            <div className="h-16 bg-slate-50 rounded-lg border border-slate-100" />
                        </div>
                        {/* Skeleton: KSQ */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                            <div className="h-3 w-24 bg-slate-200 rounded" />
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0" />
                                    <div className="h-3 bg-slate-100 rounded flex-1" />
                                    <div className="h-5 w-12 bg-slate-100 rounded-full" />
                                </div>
                            ))}
                        </div>
                        {/* Skeleton: Resume sections */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="h-3 w-20 bg-slate-200 rounded" />
                                    <div className="h-2 bg-slate-50 rounded w-full" />
                                    <div className="h-2 bg-slate-50 rounded w-3/4" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Left Column */}
                <div className={`h-full overflow-y-auto scroll-smooth p-8 pb-32 bg-transparent transition-all duration-300 ${isEvidencePanelOpen ? 'w-[72%] border-r border-slate-200' : 'w-full'}`}>
                    <div className={`mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 ${isEvidencePanelOpen ? 'max-w-full px-2' : 'max-w-[960px]'}`}>

                        {/* ===== 候选人速览卡 (Merged: Basic Info + AI Verdict + Follow-ups) ===== */}
                        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                            {/* --- Top: Basic Info with Avatar --- */}
                            <div className="px-6 pt-5 pb-4 flex items-start gap-4">
                                {avatar ? (
                                    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md shrink-0 mt-0.5" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold ring-2 ring-white shadow-md shrink-0 mt-0.5">{name.charAt(0)}</div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                            {resume?.basicProfile?.name || name}
                                        </h1>
                                        <span className="text-[13px] text-slate-500 font-medium">
                                            {role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                                        {resume?.basicProfile?.highestEducation && (
                                            <><span className="flex items-center gap-1"><GraduationCap size={13} className="text-slate-400" />{resume.basicProfile.highestEducation}</span><span className="text-slate-300">·</span></>
                                        )}
                                        {resume?.basicProfile?.workYears != null && (
                                            <><span className="flex items-center gap-1"><Briefcase size={13} className="text-slate-400" />{resume.basicProfile.workYears}年经验</span><span className="text-slate-300">·</span></>
                                        )}
                                        {resume?.jobPreference?.expectedSalaryRange && (
                                            <><span className="flex items-center gap-1"><DollarSign size={13} className="text-slate-400" />{resume.jobPreference.expectedSalaryRange}</span><span className="text-slate-300">·</span></>
                                        )}
                                        {resume?.basicProfile?.currentCity && (
                                            <><span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{resume.basicProfile.currentCity}</span><span className="text-slate-300">·</span></>
                                        )}
                                        {resume?.contact?.phone && (
                                            <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{resume.contact.phone}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- AI Verdict + Baseline Badge Bar --- */}
                            <div className={`mx-5 mb-4 px-4 py-3 border-l-[3px] ${cfg.accent} ${cfg.accentBg} rounded-r-lg`}>
                                <div className={`text-sm font-extrabold ${cfg.text} flex items-center gap-2`}>
                                    <span className="text-base">{cfg.emoji}</span> {cfg.label}
                                </div>
                                <p className="text-[13px] text-slate-600 leading-relaxed mt-1.5 ml-5">"{coreSummary}"</p>
                                <div className="mt-2.5 ml-5 flex flex-wrap gap-1.5">
                                    {baselineCoverage.map((b, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${b.status === 'pass'
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                            {b.status === 'pass' ? '✓' : '⚠'} {b.label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* --- Inner Card A: KSQ Results --- */}
                            <div className="mx-5 mb-3 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-100/80">
                                    <Search size={13} className="text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-700 tracking-wide">重点考察回答</span>
                                    <span className="text-[11px] font-medium px-1.5 py-0.5 bg-white text-slate-400 rounded-full border border-slate-100">
                                        {ksqResults.length} 项
                                    </span>
                                </div>
                                <div className="px-4 py-3 space-y-2.5">
                                    {ksqResults.map((ksq, idx) => {
                                        const statusCfg = ksq.result === 'pass'
                                            ? { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: '达标' }
                                            : ksq.result === 'fail'
                                                ? { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', label: '不达标' }
                                                : { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', label: '存疑' };
                                        const sectionId = ksqSectionMap[ksq.id];
                                        return (
                                            <div key={ksq.id} className="group flex items-start gap-2.5 py-1">
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center text-[11px] font-bold mt-px">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-bold text-slate-800">{ksq.topic}</span>
                                                        <span className={`text-[11px] font-bold ${statusCfg.color} ${statusCfg.bg} border px-1.5 py-0.5 rounded`}>{statusCfg.label}</span>
                                                        {sectionId && (
                                                            <button onClick={() => openEvidenceFor(sectionId)}
                                                                className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all">
                                                                <Play size={8} fill="currentColor" /> 访谈纪录
                                                            </button>
                                                        )}
                                                    </div>
                                                    {ksq.evidence && <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">→ {ksq.evidence}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* --- Inner Card B: Follow-up Questions --- */}
                            {followUpQuestions.length > 0 && (
                                <div className="mx-5 mb-4 rounded-lg bg-amber-50 border border-amber-100 overflow-hidden">
                                    <div className="px-4 py-2.5 flex items-center gap-2 border-b border-amber-100">
                                        <MessageSquare size={13} className="text-amber-500" />
                                        <span className="text-xs font-bold text-slate-700 tracking-wide">面试时建议重点追问</span>
                                        <span className="text-[11px] font-medium px-1.5 py-0.5 bg-white text-slate-400 rounded-full border border-amber-100">
                                            {followUpQuestions.length} 项
                                        </span>
                                    </div>
                                    <div className="px-4 py-3 space-y-2.5">
                                        {followUpQuestions.map((q, idx) => {
                                            const isContradictory = q.signalType === 'CONTRADICTORY';
                                            return (
                                                <div key={q.id} className="group flex items-start gap-2.5 py-1">
                                                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-px ${isContradictory ? 'bg-rose-200/80 text-rose-600' : 'bg-slate-200/80 text-slate-500'
                                                        }`}>{idx + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-[13px] font-bold leading-snug ${isContradictory ? 'text-rose-700' : 'text-slate-800'}`}>{q.observation}</p>
                                                            {q.relatedSectionId && (
                                                                <button onClick={() => openEvidenceFor(q.relatedSectionId!)}
                                                                    className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all">
                                                                    <Play size={8} fill="currentColor" /> 访谈纪录
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">→ {q.nextQuestion}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ===== ③ 关键观察区（Observation Cards grouped by signal） ===== */}
                        {observations.length > 0 && (
                            <div className="space-y-4">
                                {/* Risk signals first */}
                                {(() => {
                                    const riskObs = observations.filter(o => o.signalType !== 'CONFIDENT');
                                    const confidentObs = observations.filter(o => o.signalType === 'CONFIDENT');
                                    return (
                                        <>
                                            {riskObs.length > 0 && (
                                                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                                        <AlertTriangle size={14} className="text-amber-500" />
                                                        <span className="text-xs font-bold text-slate-700 tracking-wide">风险信号</span>
                                                        <span className="text-[11px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                            {riskObs.length} 项
                                                        </span>
                                                    </div>
                                                    <div className="p-4 grid gap-3">
                                                        {riskObs.map(obs => (
                                                            <div key={obs.id} onClick={() => obs.relatedSectionId ? openEvidenceFor(obs.relatedSectionId) : setIsEvidencePanelOpen(true)}>
                                                                <RedPenCard data={obs} isHighlighted={activeSectionId === obs.relatedSectionId} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {confidentObs.length > 0 && (
                                                <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                                                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        <span className="text-xs font-bold text-slate-700 tracking-wide">扎实表现</span>
                                                        <span className="text-[11px] font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                            {confidentObs.length} 项
                                                        </span>
                                                    </div>
                                                    <div className="p-4 grid gap-3">
                                                        {confidentObs.map(obs => (
                                                            <div key={obs.id} onClick={() => obs.relatedSectionId ? openEvidenceFor(obs.relatedSectionId) : setIsEvidencePanelOpen(true)}>
                                                                <RedPenCard data={obs} isHighlighted={activeSectionId === obs.relatedSectionId} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ===== ⑤ 批注简历（从 DetailedResume 结构读取） ===== */}
                        <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                            {/* --- 工作经历 --- */}
                            {workExperiences.length > 0 && (
                                <div className="p-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase size={14} /> 工作经历
                                    </h3>
                                    <div className="space-y-6">
                                        {workExperiences.map((w) => (
                                            <div key={w.id} id={`resume-section-${w.id}`}>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className="text-[15px] font-bold text-slate-900">{w.companyName}</h4>
                                                    <span className="text-[12px] font-medium text-slate-400 font-mono shrink-0 ml-3">
                                                        {w.startDate} — {w.endDate || '至今'}
                                                    </span>
                                                </div>
                                                <div className="text-[13px] text-slate-500 font-medium mb-3">{w.position}</div>
                                                <ul className="space-y-2">
                                                    {w.descriptions.map((line) => {
                                                        const linkedObs = observations.find(o => o.relatedSectionId === line.id);
                                                        const isRisk = line.status === 'risk';
                                                        const isLineActive = activeSectionId === line.id;
                                                        return (
                                                            <li key={line.id} id={`resume-section-${line.id}`}
                                                                onClick={() => linkedObs ? openEvidenceFor(line.id) : undefined}
                                                                className={`text-sm leading-relaxed text-slate-700 pl-3 border-l-[3px] transition-all ${isRisk ? 'border-l-amber-400 bg-amber-50/40 py-1.5 px-3 rounded-r-md' : 'border-l-transparent'
                                                                    } ${isLineActive ? 'font-medium text-slate-900 !border-l-indigo-500 !bg-indigo-50/40' : ''} ${linkedObs ? 'cursor-pointer hover:bg-slate-50 rounded-r-md' : ''}`}>
                                                                {line.text}
                                                                {isRisk && <AlertTriangle size={12} className="inline ml-2 text-amber-500" />}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- 项目经历 --- */}
                            {projectExperiences.length > 0 && (
                                <div className="p-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FileText size={14} /> 项目经验
                                    </h3>
                                    <div className="space-y-6">
                                        {projectExperiences.map((p) => (
                                            <div key={p.id} id={`resume-section-${p.id}`}>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h4 className="text-[15px] font-bold text-slate-900">{p.name}</h4>
                                                    <span className="text-[12px] font-medium text-slate-400 font-mono shrink-0 ml-3">
                                                        {p.startDate} — {p.endDate || '至今'}
                                                    </span>
                                                </div>
                                                {p.background && <div className="text-[12px] text-slate-400 mb-2">{p.background}</div>}
                                                {p.responsibilities && p.responsibilities.length > 0 && (
                                                    <ul className="space-y-1.5 mb-2">
                                                        {p.responsibilities.map((r, idx) => (
                                                            <li key={idx} className="text-sm leading-relaxed text-slate-700 pl-3 border-l-[3px] border-l-transparent">
                                                                {r}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {p.outcomes && p.outcomes.length > 0 && (
                                                    <ul className="space-y-1.5">
                                                        {p.outcomes.map((o, idx) => (
                                                            <li key={idx} className="text-sm leading-relaxed text-emerald-700 pl-3 border-l-[3px] border-l-emerald-300 bg-emerald-50/30 py-1 px-3 rounded-r-md">
                                                                📊 {o}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- 教育背景 --- */}
                            {educations.length > 0 && (
                                <div className="p-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <GraduationCap size={14} /> 教育背景
                                    </h3>
                                    <div className="space-y-3">
                                        {educations.map((edu) => (
                                            <div key={edu.id} className="flex items-baseline justify-between">
                                                <div>
                                                    <span className="text-[14px] font-bold text-slate-800">{edu.school}</span>
                                                    {edu.schoolTier && <span className="ml-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{edu.schoolTier}</span>}
                                                    <span className="text-[13px] text-slate-500 ml-3">{edu.major} · {edu.degree}</span>
                                                </div>
                                                <span className="text-[12px] font-medium text-slate-400 font-mono shrink-0 ml-3">
                                                    {edu.startDate} — {edu.endDate}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- 技能标签 --- */}
                            {resume?.skills && resume.skills.length > 0 && (
                                <div className="p-5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        技能
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {resume.skills.map((skill, idx) => (
                                            <span key={idx} className={`text-[12px] font-medium px-2.5 py-1 rounded-full border ${skill.proficiency === '精通' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                skill.proficiency === '熟悉' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                {skill.name}{skill.proficiency ? ` · ${skill.proficiency}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Podcast-style Interview Player (collapsed by default) */}
                {
                    isEvidencePanelOpen && (
                        <div className="w-[28%] h-full bg-slate-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right-8 duration-300">
                            {/* --- Sticky Header: Title + Close --- */}
                            <div className="px-4 py-2.5 shrink-0 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <img src={EILEEN_AVATAR} className="w-5 h-5 rounded-full border border-indigo-100" />
                                    <h3 className="text-[12px] font-extrabold text-slate-600 uppercase tracking-widest">
                                        {name}的访谈纪录
                                    </h3>
                                    <span className="text-[12px] text-slate-400 font-medium">{formatTime(totalDuration)}</span>
                                </div>
                                <button onClick={() => { setIsEvidencePanelOpen(false); setActiveSectionId(null); setExpandedSegmentId(null); }}
                                    className="p-1 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="收起">
                                    <XCircle size={16} />
                                </button>
                            </div>

                            {/* --- Audio Player Bar --- */}
                            <div className="px-4 py-3 shrink-0 border-b border-slate-200 bg-white">
                                <div className="flex items-center gap-2.5">
                                    <button onClick={() => setIsPlaying(!isPlaying)}
                                        className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shrink-0">
                                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        {/* Scrubber bar with colored segments */}
                                        <div className="relative h-2 bg-slate-200 rounded-full cursor-pointer group"
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const pct = (e.clientX - rect.left) / rect.width;
                                                seekTo(Math.round(pct * totalDuration));
                                            }}>
                                            {/* Colored segment markers on the bar */}
                                            {interviewTimeline.filter(s => s.status !== 'neutral').map(seg => {
                                                const left = (seg.startSec / totalDuration) * 100;
                                                const width = ((seg.endSec - seg.startSec) / totalDuration) * 100;
                                                const color = seg.status === 'risk' ? 'bg-rose-400' : seg.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400';
                                                return (
                                                    <div key={seg.id} className={`absolute top-0 h-full ${color} rounded-full opacity-60`}
                                                        style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />
                                                );
                                            })}
                                            {/* Playback position indicator */}
                                            <div className="absolute top-0 h-full bg-slate-600 rounded-full transition-all duration-150"
                                                style={{ width: `${(playbackTime / totalDuration) * 100}%` }} />
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-800 rounded-full shadow-sm border-2 border-white transition-all duration-150 group-hover:scale-125"
                                                style={{ left: `${(playbackTime / totalDuration) * 100}%`, marginLeft: '-6px' }} />
                                        </div>
                                        {/* Time display */}
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[11px] font-mono text-slate-400">{formatTime(playbackTime)}</span>
                                            <span className="text-[11px] font-mono text-slate-400">{formatTime(totalDuration)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Chapter List (all collapsed by default) --- */}
                            <div className="flex-1 overflow-y-auto scroll-smooth">
                                {interviewTimeline.map((seg) => {
                                    const obs = seg.obsId ? observations.find(o => o.id === seg.obsId) : null;
                                    const isExpanded = expandedSegmentId === seg.id;
                                    const isActive = obs && activeSectionId && (activeSectionId === obs.relatedSectionId || activeSectionId.startsWith(obs.relatedSectionId || ''));
                                    const statusConfig: Record<string, { dot: string; border: string; bg: string; text: string; badge: string }> = {
                                        risk: { dot: 'bg-rose-400', border: 'border-l-rose-400', bg: 'bg-rose-50/50', text: 'text-rose-700', badge: '🚨 矛盾' },
                                        warning: { dot: 'bg-amber-400', border: 'border-l-amber-400', bg: 'bg-amber-50/50', text: 'text-amber-700', badge: '⚠️ 存疑' },
                                        passed: { dot: 'bg-emerald-400', border: 'border-l-emerald-200', bg: 'bg-emerald-50/30', text: 'text-emerald-600', badge: '✅ 通过' },
                                        neutral: { dot: 'bg-slate-300', border: 'border-l-slate-200', bg: 'bg-transparent', text: 'text-slate-500', badge: '' },
                                    };
                                    const sc = statusConfig[seg.status];

                                    return (
                                        <div key={seg.id} id={obs ? `obs-card-${obs.id}` : `seg-${seg.id}`}
                                            className={`border-l-[3px] ${sc.border} border-b border-slate-100 transition-all duration-200 ${isActive ? `${sc.bg} ring-1 ring-inset ring-indigo-200` : ''
                                                }`}>
                                            {/* Chapter header (always visible, always clickable) */}
                                            <div className="flex items-center gap-2.5 px-3 py-3 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                                                onClick={() => toggleSegment(seg.id)}>
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`}></div>
                                                <button onClick={(e) => { e.stopPropagation(); seekTo(seg.startSec); }}
                                                    className="text-[12px] font-mono text-slate-400 hover:text-indigo-600 hover:underline shrink-0 transition-colors"
                                                    title="跳转播放">
                                                    {formatTime(seg.startSec)}
                                                </button>
                                                <span className={`text-[13px] font-semibold flex-1 truncate ${seg.status === 'neutral' ? 'text-slate-500' : sc.text}`}>
                                                    {seg.label}
                                                </span>
                                                {seg.status !== 'neutral' && (
                                                    <span className={`text-[11px] font-bold ${sc.text} shrink-0`}>{sc.badge}</span>
                                                )}
                                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Expanded detail (obs detail for flagged, transcript for neutral) */}
                                            {isExpanded && (
                                                <div className={`px-4 pb-3 pt-1 ml-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200 ${sc.bg} rounded-b-md`}>
                                                    {obs ? (
                                                        <>
                                                            <p className="text-[13px] text-slate-600 leading-relaxed">{obs.observation}</p>
                                                            {obs.quote && (
                                                                <div className="pl-3 border-l-2 border-slate-300/60">
                                                                    <p className="text-[12px] text-slate-500 italic leading-relaxed">"{obs.quote}"</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : seg.transcript ? (
                                                        <p className="text-[13px] text-slate-500 leading-relaxed">{seg.transcript}</p>
                                                    ) : null}
                                                    <button onClick={() => seekTo(seg.startSec)}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 text-white rounded text-[12px] font-bold hover:bg-indigo-600 transition-colors w-fit">
                                                        <Play size={10} fill="currentColor" /> 播放 {formatTime(seg.startSec)} - {formatTime(seg.endSec)}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }
            </div >
        );
    };

    const RenderTimelineTab = () => (
        <div className="flex-1 overflow-y-auto p-8 bg-transparent relative z-10">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                    <div className="p-8">
                        {/* --- DYNAMIC PROGRESS BAR --- */}
                        <div className="relative flex justify-between mb-12">
                            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
                            <div
                                className={`absolute top-5 left-0 h-0.5 -z-10 transition-all duration-700 ease-out ${status === CandidateStatus.EXCEPTION ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                style={{ width: `${progressPercentage}%` }}
                            ></div>

                            {STEPS.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;

                                let circleClass = "bg-white border-slate-200 text-slate-300";
                                let labelClass = "text-slate-400";
                                let icon = <step.icon size={18} />;

                                if (status === CandidateStatus.EXCEPTION && isCurrent) {
                                    circleClass = "bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100";
                                    labelClass = "text-rose-600 font-bold";
                                    icon = <AlertTriangle size={18} />;
                                } else if (isCurrent) {
                                    circleClass = "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100";
                                    if (step.id === 'PROCESSING') circleClass += " animate-pulse";
                                    labelClass = "text-indigo-600 font-bold";
                                } else if (isCompleted) {
                                    circleClass = "bg-indigo-600 border-indigo-600 text-white";
                                    labelClass = "text-indigo-600 font-medium";
                                }

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-3 relative">
                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${circleClass}`}>
                                            {icon}
                                        </div>
                                        <span className={`text-xs font-medium ${labelClass}`}>{step.label}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* --- STAGE DESCRIPTION --- */}
                        <div className={`text-center text-sm font-medium mb-12 ${status === CandidateStatus.EXCEPTION ? 'text-rose-600' : 'text-slate-500'}`}>
                            {STATUS_DESCRIPTIONS[status]}
                        </div>

                        {/* --- TIMELINE LOGS --- */}
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                            {logs.map((log, index) => (
                                <div key={index} className="relative group">
                                    <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 bg-white ${log.type === 'error' ? 'border-rose-500' : log.type === 'success' ? 'border-emerald-500' : 'border-indigo-500'} group-hover:scale-125 transition-transform`}></div>
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                        <span className="text-[13px] font-mono font-bold text-slate-400 w-12 shrink-0">{log.time}</span>
                                        <div>
                                            <h4 className={`text-sm font-bold ${log.type === 'error' ? 'text-rose-600' : log.type === 'success' ? 'text-emerald-600' : 'text-slate-900'}`}>{log.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{log.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* EXCEPTION INTERVENTION CONSOLE */}
                            {status === CandidateStatus.EXCEPTION && (
                                <div className="mt-8 bg-rose-50 border border-rose-100 rounded-xl p-5 relative animate-in slide-in-from-bottom-2">
                                    <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-200 animate-pulse"></div>

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 shrink-0">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">任务异常：需要人工干预</h4>
                                            <p className="text-xs text-rose-700 mt-1">AI 呼叫已中断，建议通过以下方式联系候选人。</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 rounded-lg text-[13px] font-bold text-slate-700 hover:text-rose-600 hover:border-rose-300 transition-all shadow-sm">
                                            <Link size={14} /> 复制面试邀请链接
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[13px] font-bold hover:bg-rose-700 shadow-md shadow-rose-200 transition-all">
                                            <PhoneForwarded size={14} /> 人工拨号并标记
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-[13px] font-bold hover:bg-slate-200 transition-all">
                                            <RotateCcw size={14} /> 重置 AI 任务
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Next Step Prediction (Fake) */}
                            {status !== CandidateStatus.DELIVERED && status !== CandidateStatus.EXCEPTION && (
                                <div className="relative">
                                    <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-200 animate-pulse"></div>
                                    <span className="text-xs text-slate-400 italic pl-1">Ailin 正在执行下一步操作...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const RenderRecordingTab = () => (
        <div className="flex-1 flex overflow-hidden bg-white relative z-10">
            <div className="w-[60%] flex flex-col border-r border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-[13px]">全文转写 (Transcript)</h3>
                    <button className="text-[13px] text-indigo-600 font-bold flex items-center gap-1"><Download size={12} /> 导出文本</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {transcript.map((t, idx) => (
                        <div key={idx} className="flex gap-4 group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.speaker === 'AI' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                {t.speaker === 'AI' ? (
                                    <img src={EILEEN_AVATAR} className="w-full h-full object-cover rounded-full" />
                                ) : '候选人'}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700">{t.speaker === 'AI' ? '招聘助理 Ailin' : '赵嘉明'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{t.time}</span>
                                </div>
                                <p className={`text-sm leading-relaxed p-2 rounded-lg ${t.highlight === 'risk' ? 'bg-amber-50 text-slate-800 border border-amber-100' : 'text-slate-600 hover:bg-white/50'}`}>
                                    {t.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-[40%] bg-transparent flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500">录音播放</span>
                            <span className="text-xs font-mono text-slate-400">14:20</span>
                        </div>
                        <div className="h-12 flex items-center gap-0.5 justify-center mb-4 overflow-hidden opacity-60">
                            {[...Array(40)].map((_, i) => (
                                <div key={i} className="w-1 bg-indigo-500 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-center gap-4">
                            <button className="p-3 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700"><Play size={20} fill="currentColor" /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    // --- MAIN RENDER ---
    return (
        // Light frosted backdrop — aurora shows through subtly
        <div className="h-full w-full bg-white/50 backdrop-blur-sm flex flex-col relative overflow-hidden font-sans">

            {/* 1. PERSISTENT HEADER (FIXED OVERFLOW & FLEX LAYOUT) */}
            {/* === SLIM NAV BAR (40px) === */}
            <div className="bg-white border-b border-slate-200 px-4 shrink-0 z-30 sticky top-0 flex items-center gap-1 h-11 shadow-sm">
                {/* TOAST FEEDBACK OVERLAY */}
                {decisionState === 'APPROVED' && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                        <CheckCircle2 className="text-emerald-400" size={20} />
                        <div>
                            <div className="font-bold text-sm">已通过初筛</div>
                            <div className="text-xs text-slate-300">Ailin 已自动发送面试邀请邮件。</div>
                        </div>
                    </div>
                )}
                {decisionState === 'REJECTED' && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                        <XCircle className="text-rose-400" size={20} />
                        <div>
                            <div className="font-bold text-sm">已标记淘汰</div>
                            <div className="text-xs text-slate-300">订单已归档至历史库。</div>
                        </div>
                    </div>
                )}

                {/* Back button */}
                <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors shrink-0">
                    <ChevronLeft size={16} /> 返回
                </button>

                {/* Tabs inline */}
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    {[
                        { id: 'ANALYSIS', label: '智能分析', icon: CheckCircle2, disabled: status !== CandidateStatus.DELIVERED },
                        { id: 'TIMELINE', label: '任务进度', icon: Clock, disabled: false },
                        { id: 'RESUME', label: '原始简历', icon: FileText, disabled: false }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                            disabled={tab.disabled as boolean}
                            className={`px-3 py-1 text-[12px] font-bold rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                    : tab.disabled
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                            <tab.icon size={12} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. MAIN CONTENT AREA */}
            {activeTab === 'ANALYSIS' && <RenderAnalysisTab />}
            {activeTab === 'TIMELINE' && <RenderTimelineTab />}
            {activeTab === 'RESUME' && (
                <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-50 relative z-10">
                    <div className="bg-white shadow-sm border border-slate-200 p-12 min-h-[800px] w-[800px] rounded-xl">
                        <div className="border-b pb-6 mb-6">
                            <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
                            <p className="text-slate-500 mt-2">{role} · 北京</p>
                        </div>
                        <div className="space-y-6">
                            <p className="text-slate-400 italic text-center text-sm">-- 原始 PDF 预览区域 --</p>
                            <p className="text-slate-600 leading-8 text-sm">此处展示解析前的原始简历文件，方便 HR 核对细节...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* === BOTTOM STICKY DECISION BAR === */}
            {decisionState === 'NONE' && (
                <div className="shrink-0 sticky bottom-0 z-30 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
                    <span className="text-[12px] text-slate-400 font-medium mr-auto">您的决策：</span>
                    <button onClick={() => handleDecision('HOLD')}
                        className="flex items-center gap-1.5 px-5 py-2 bg-white border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-[13px] font-bold rounded-lg transition-all hover:bg-rose-50">
                        <XCircle size={14} /> 淘汰
                    </button>
                    <button onClick={() => handleDecision('FOLLOWUP')}
                        className="flex items-center gap-1.5 px-5 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-[13px] font-bold rounded-lg hover:bg-amber-100 transition-all">
                        <AlertTriangle size={14} /> 待定
                    </button>
                    <button onClick={() => handleDecision('PROCEED')}
                        className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-bold rounded-lg shadow-md shadow-emerald-200 transition-all">
                        <CheckCircle2 size={14} /> 通过
                    </button>
                </div>
            )}
            {decisionState === 'PROCESSING' && (
                <div className="shrink-0 sticky bottom-0 z-30 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                        <Loader2 size={14} className="animate-spin text-slate-500" />
                        <span className="text-[13px] font-bold text-slate-500">处理中...</span>
                    </div>
                </div>
            )}
            {decisionState !== 'NONE' && decisionState !== 'PROCESSING' && (
                <div className="shrink-0 sticky bottom-0 z-30 bg-white border-t border-slate-200 px-6 py-3 flex items-center gap-3">
                    <div className={`flex-1 flex items-center gap-2 py-2 px-3 rounded-lg ${decisionState === 'PROCEED' ? 'bg-emerald-50 border border-emerald-200' :
                        decisionState === 'FOLLOWUP' ? 'bg-amber-50 border border-amber-200' :
                            'bg-rose-50 border border-rose-200'
                        }`}>
                        {decisionState === 'PROCEED' && <><CheckCircle2 size={16} className="text-emerald-600" /> <span className="text-[13px] font-bold text-emerald-700">已标记为「通过」，将进入下一轮面试安排</span></>}
                        {decisionState === 'FOLLOWUP' && <><AlertTriangle size={16} className="text-amber-600" /> <span className="text-[13px] font-bold text-amber-700">已标记为「待定」，建议补充追问后再决策</span></>}
                        {decisionState === 'HOLD' && <><XCircle size={16} className="text-rose-600" /> <span className="text-[13px] font-bold text-rose-700">已标记为「淘汰」</span></>}
                        <button onClick={() => setDecisionState('NONE')}
                            className="ml-auto text-[12px] text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2">
                            撤回
                        </button>
                    </div>
                    <button onClick={() => onNavigate(ViewState.DASHBOARD)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-all shrink-0">
                        返回工作台
                    </button>
                </div>
            )}

        </div>
    );
};

export default OrderDetailView;