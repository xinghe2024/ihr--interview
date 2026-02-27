import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, CandidateStatus, Observation, ResumeSection, KSQItem, BaselineCoverage } from '../../shared/types';
import { ChevronLeft, ChevronDown, Clock, Mail, Phone, FileText, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, Copy, Bell, MoreHorizontal, XCircle, UserCheck, Mic2, Play, Pause, Download, Briefcase, MapPin, MessageSquare, Link, PhoneForwarded, RotateCcw, Loader2, GraduationCap, DollarSign, Search } from 'lucide-react';
import RedPenCard from '../components/RedPenCard';
import { useNotification } from '../contexts/NotificationContext';

interface OrderDetailViewProps {
    candidateId: string | null;
    onNavigate: (view: ViewState) => void;
    defaultTab?: 'ANALYSIS' | 'TIMELINE' | 'RECORDING';
}

const EILEEN_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80";

// --- 1. CONFIGURATION & TYPES ---

const STEPS = [
    { id: CandidateStatus.PENDING_OUTREACH, label: '待触达', icon: Clock },
    { id: CandidateStatus.TOUCHED, label: '已邀请', icon: Mail },
    { id: CandidateStatus.INTERVIEWING, label: '正在面试', icon: Phone },
    { id: CandidateStatus.ANALYZING, label: '分析中', icon: FileText },
    { id: CandidateStatus.DELIVERED, label: '已交付', icon: CheckCircle2 },
];

interface TimelineLog {
    time: string;
    title: string;
    detail: string;
    type?: 'default' | 'error' | 'success';
}

// --- 2. ROBUST MOCK DATA ENGINE ---

const AVATARS: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&q=80',
    '2': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
    '3': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
    '4': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
    '5': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80',
    '6': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80',
};

const getMockCandidateContext = (id: string | null) => {
    // Default fallback
    let status = CandidateStatus.DELIVERED;
    let name = '未知候选人';
    let role = '候选人';
    let avatar = AVATARS['4'];

    // Explicit Mock Cases mapping to Dashboard IDs
    switch (id) {
        case '1': // 陈思远 - Newly created
            status = CandidateStatus.PENDING_OUTREACH;
            name = '陈思远';
            role = 'Java 专家';
            avatar = AVATARS['1'];
            break;
        case '2': // 林雨晴 - In Call
            status = CandidateStatus.INTERVIEWING;
            name = '林雨晴';
            role = 'Java 架构师';
            avatar = AVATARS['2'];
            break;
        case '3': // 周子涵 - Analyzing
            status = CandidateStatus.ANALYZING;
            name = '周子涵';
            role = '测试专家';
            avatar = AVATARS['3'];
            break;
        case '4': // 赵嘉明 - Delivered
            status = CandidateStatus.DELIVERED;
            name = '赵嘉明';
            role = '高级前端工程师';
            avatar = AVATARS['4'];
            break;
        case '5': // 吴晓斗 - Exception
            status = CandidateStatus.EXCEPTION;
            name = '吴晓斗';
            role = '产品经理';
            avatar = AVATARS['5'];
            break;
        case '6': // Extra - Invited
            status = CandidateStatus.TOUCHED;
            name = '姜琳';
            role = '算法工程师';
            avatar = AVATARS['6'];
            break;
        default:
            status = CandidateStatus.DELIVERED;
            name = '赵嘉明 (演示)';
            role = '高级前端工程师';
            avatar = AVATARS['4'];
    }

    // Dynamic Timeline Logs Generation
    const logs: TimelineLog[] = [
        { time: '14:00', title: '任务创建', detail: '艾琳 发起自动初筛任务', type: 'default' },
        { time: '14:02', title: '简历解析完成', detail: '提取关键技能与工作经历', type: 'default' },
    ];

    if (status !== CandidateStatus.PENDING_OUTREACH) {
        logs.push({ time: '14:05', title: '触达短信已送达', detail: '发送至候选人手机，包含通话链接', type: 'default' });
    }

    if ([CandidateStatus.INTERVIEWING, CandidateStatus.ANALYZING, CandidateStatus.DELIVERED, CandidateStatus.EXCEPTION].includes(status)) {
        logs.push({ time: '14:30', title: '候选人点击链接', detail: '设备检测通过 (iOS / Safari)', type: 'default' });
        logs.push({ time: '14:31', title: '通话建立', detail: '双方已接入，AI 开始对话', type: 'default' });
    }

    if (status === CandidateStatus.EXCEPTION) {
        logs.push({ time: '14:35', title: '通话异常中断', detail: '检测到候选人主动挂断或信号丢失 (连续3次)', type: 'error' });
    }

    if ([CandidateStatus.ANALYZING, CandidateStatus.DELIVERED].includes(status)) {
        logs.push({ time: '14:45', title: '通话结束', detail: '通话时长 14分20秒', type: 'default' });
        logs.push({ time: '14:46', title: '生成分析报告中', detail: '正在进行语音转写与意图识别...', type: 'default' });
    }

    if (status === CandidateStatus.DELIVERED) {
        logs.push({ time: '14:48', title: 'AI 报告已生成', detail: '包含 3 个关键风险点提示，已发送通知', type: 'success' });
    }

    return { status, name, role, logs, avatar };
};

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ candidateId, onNavigate, defaultTab = 'ANALYSIS' }) => {
    const { addToast } = useNotification();
    const { status, name, role, logs, avatar } = useMemo(() => getMockCandidateContext(candidateId), [candidateId]);

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
    const handleDecision = (type: 'PROCEED' | 'FOLLOWUP' | 'HOLD') => {
        setDecisionState('PROCESSING');
        setTimeout(() => {
            setDecisionState(type);
            const msgs: Record<string, { title: string; type: 'success' | 'warning' | 'error' }> = {
                PROCEED: { title: `已通过「${name}」初筛`, type: 'success' },
                FOLLOWUP: { title: `已标记「${name}」为待定`, type: 'warning' },
                HOLD: { title: `已淘汰「${name}」`, type: 'error' },
            };
            const msg = msgs[type];
            addToast({ type: msg.type, title: msg.title });
        }, 1000);
    };

    // Progress Bar logic
    const getCurrentStepIndex = () => {
        let index = STEPS.findIndex(s => s.id === status);
        if (status === CandidateStatus.EXCEPTION) return 2;
        if (index === -1) return 0;
        return index;
    };

    const currentStepIndex = getCurrentStepIndex();
    const progressPercentage = (currentStepIndex / (STEPS.length - 1)) * 100;

    // Mock Resume Data — expanded with PRD 5-segment fields
    const observations: Observation[] = [
        {
            id: 'o1', category: '技术深度验证', title: 'React Fiber 架构理解',
            observation: '候选人对 Scheduler 调度机制描述准确，能清晰解释时间切片原理。',
            quote: '...Fiber 其实就是把递归改成了链表遍历，利用 requestIdleCallback 做时间切片...',
            evidenceTime: '04:15 - 05:30', signalType: 'CONFIDENT', confidence: 'High',
            relatedSectionId: 'work_1'
        },
        {
            id: 'o2', category: '离职动机核实', title: '关于离职原因的陈述',
            observation: '提及团队变动时语速变慢，且与简历上的时间线（空窗期）存在逻辑断层。',
            quote: '呃...主要是当时...那个业务线调整了嘛，然后...我们也换了 Leader...',
            evidenceTime: '12:10 - 13:45', signalType: 'HESITANT', confidence: 'Mid',
            gap: '表达流利度下降，未正面回答裁员比例问题。',
            nextQuestion: '建议背调重点核实该段社保缴纳记录，并追问"业务线调整后您的去向安排是怎样的？"',
            relatedSectionId: 'work_1_reason'
        },
        {
            id: 'o3', category: '项目真实性核验', title: 'CRM 微前端重构规模存疑',
            observation: '候选人描述项目规模为"几十个子应用"，但追问具体数字时回答含糊。',
            quote: '差不多...十几二十个吧，具体记不太清了...',
            evidenceTime: '08:20 - 09:10', signalType: 'CONTRADICTORY', confidence: 'Low',
            gap: '未能给出子应用具体数量、团队分工、以及自己负责的模块范围。',
            nextQuestion: '请追问"你负责的基座具体接入了几个子应用？上线后的首屏加载时间是多少？"',
            relatedSectionId: 'p1_d1'
        }
    ];

    const resumeSections: ResumeSection[] = [
        { id: 'header', type: 'header', content: { name: name, role: role, contact: '138-0000-0000 · email@example.com', loc: '北京 · 望京' } },
        {
            id: 'work_1', type: 'work', verificationStatus: 'warning', content: {
                company: '北京字节跳动科技有限公司', role: '资深前端开发工程师', time: '2021.03 - 至今',
                desc: [
                    { text: '负责核心业务中台建设，支撑日均千万级 PV 访问。', id: 'w1_p1', status: 'verified' },
                    { text: '主导 React 16 到 18 的架构升级，First Contentful Paint (FCP) 提升 40%。', id: 'w1_p2', status: 'verified' },
                    { text: '离职原因：寻求更大的技术挑战及业务发展空间。', id: 'work_1_reason', status: 'risk' }
                ]
            }
        },
        {
            id: 'project_1', type: 'project', verificationStatus: 'neutral', content: {
                name: '企业级 CRM 微前端重构', role: '前端负责人',
                desc: [{ text: '基于 qiankun 构建微前端基座，实现巨石应用拆解。', id: 'p1_d1', status: 'risk' }]
            }
        }
    ];

    const transcript = [
        { speaker: 'AI', text: '您好，这里是字节跳动招聘组的 AI 助理艾琳。请问现在方便大概花 10 分钟聊聊吗？', time: '00:05' },
        { speaker: 'Candidate', text: '嗯，方便的，您请说。', time: '00:12' },
        { speaker: 'AI', text: '好的。我看到您简历里提到了 React 18 的升级经历。能具体讲讲在处理并发更新时，遇到了哪些棘手的问题吗？', time: '00:18' },
        { speaker: 'Candidate', text: '呃...主要是当时...那个业务线调整了嘛，然后...我们也换了 Leader... 其实技术上主要是调度器那块...', time: '00:35', highlight: 'risk' },
    ];

    // AI Recommendation Logic
    const getAIRecommendation = () => {
        const contradictory = observations.filter(o => o.signalType === 'CONTRADICTORY').length;
        const hesitant = observations.filter(o => o.signalType === 'HESITANT').length;
        const followUps = observations.filter(o => o.nextQuestion).length;
        if (contradictory > 0) return { type: 'FollowUp' as const };
        if (hesitant > 1 || followUps > 3) return { type: 'FollowUp' as const };
        return { type: 'Proceed' as const };
    };

    const coreSummary = '技术功底扎实，React 架构理解深入；但离职动机描述含糊，微前端项目规模细节存疑。建议二面重点追问上述两点。';
    const followUpQuestions = observations.filter(o => o.nextQuestion);

    // KSQ Results & Baseline Coverage for report
    const ksqResults: KSQItem[] = [
        { id: 'ksq1', topic: 'React 项目经验深度', rubric: '能说出具体优化指标和数据', result: 'pass', evidence: '能说出 FCP 提升 40%，时间切片原理' },
        { id: 'ksq2', topic: '微前端架构实操', rubric: '能描述接入的子应用数和分工', result: 'partial', evidence: '说“十几二十个”但给不了具体数' },
        { id: 'ksq3', topic: '离职动机核实', rubric: '各段经历的离开原因清晰连贯', result: 'partial', evidence: '语速变慢，未正面回答裁员比例' },
    ];
    const ksqSectionMap: Record<string, string> = {
        'ksq1': 'work_1',
        'ksq2': 'p1_d1',
        'ksq3': 'work_1_reason',
    };
    const baselineCoverage: BaselineCoverage[] = [
        { label: '薪资范围匹配', status: 'pass' },
        { label: '学历信息已核实', status: 'pass' },
        { label: '到岗时间已确认', status: 'pass' },
        { label: '表达流畅，逻辑清晰', status: 'pass' },
        { label: '工作经历无明显空窗', status: 'pass' },
        { label: '回答条理清晰', status: 'pass' },
        { label: '求职动机已了解', status: 'pass' },
        { label: '地域意向待确认', status: 'warning' },
    ];

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
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0" />
                                    <div className="h-3 bg-slate-100 rounded flex-1" />
                                    <div className="h-5 w-12 bg-slate-100 rounded-full" />
                                </div>
                            ))}
                        </div>
                        {/* Skeleton: Resume sections */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                            {[1,2,3,4].map(i => (
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
                                <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                            {resumeSections.find(s => s.type === 'header')?.content?.name || name}
                                        </h1>
                                        <span className="text-[13px] text-slate-500 font-medium">
                                            {resumeSections.find(s => s.type === 'header')?.content?.role || role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                                        <span className="flex items-center gap-1"><GraduationCap size={13} className="text-slate-400" />本科</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="flex items-center gap-1"><Briefcase size={13} className="text-slate-400" />5年经验</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="flex items-center gap-1"><DollarSign size={13} className="text-slate-400" />29-35K</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="flex items-center gap-1"><Clock size={13} className="text-slate-400" />1个月内到岗</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{resumeSections.find(s => s.type === 'header')?.content?.contact?.split('·')[0]?.trim()}</span>
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

                        {/* ===== Annotated Resume (merged white container) ===== */}
                        <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                            {resumeSections.filter(s => s.type !== 'header').map((s) => {
                                const isSectionActive = activeSectionId && (activeSectionId === s.id || activeSectionId.startsWith(s.id));
                                return (
                                    <div key={s.id} id={`resume-section-${s.id}`}
                                        className={`p-5 transition-all duration-300 ${isSectionActive ? 'bg-indigo-50/30' : ''}`}>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            {s.type === 'work' && <><Briefcase size={14} /> 工作经历</>}
                                            {s.type === 'project' && <><Briefcase size={14} /> 项目经验</>}
                                            {s.type === 'education' && <><Briefcase size={14} /> 教育背景</>}
                                        </h3>
                                        {(s.type === 'work' || s.type === 'project') && (
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="text-[15px] font-bold text-slate-900">{s.content.company || s.content.name}</h4>
                                                    <span className="text-[12px] font-medium text-slate-400 font-mono">{s.content.time}</span>
                                                </div>
                                                <div className="text-[13px] text-slate-500 font-medium mb-3">{s.content.role}</div>
                                                <ul className="space-y-2.5">
                                                    {s.content.desc?.map((line: any) => {
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
                                        )}
                                    </div>
                                );
                            })}
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
                                    if (step.id === CandidateStatus.INTERVIEWING || step.id === CandidateStatus.ANALYZING) circleClass += " animate-pulse";
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
                                    <span className="text-xs text-slate-400 italic pl-1">艾琳 正在执行下一步操作...</span>
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
                                    <span className="text-xs font-bold text-slate-700">{t.speaker === 'AI' ? '招聘助理艾琳' : '赵嘉明'}</span>
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
                            <div className="text-xs text-slate-300">艾琳已自动发送面试邀请邮件。</div>
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