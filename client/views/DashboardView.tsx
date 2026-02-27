import React, { useState, useEffect } from 'react';
import { ViewState, CandidateStatus } from '../../shared/types';
import { CheckCircle2, User, Phone, AlertTriangle, ArrowRight, Clock, Loader2, FileText, Briefcase, GraduationCap, MapPin, HelpCircle, Mail, RefreshCw, Activity, Sparkles, UserCheck, Radio, Search } from 'lucide-react';

interface DashboardViewProps {
    onNavigate: (view: ViewState, id: string) => void;
    browserContext: 'empty' | 'resume';
    setBrowserContext: (ctx: 'empty' | 'resume') => void;
}

// EILEEN AVATAR
import eileenAvatarImg from '../assets/hr.png';
const EILEEN_AVATAR = eileenAvatarImg;

// --- LOCAL TYPE FOR MOCK DATA ---
type Verdict = 'Proceed' | 'FollowUp' | 'Hold';
interface MockCandidate {
    id: string;
    name: string;
    role: string;
    exp: string;
    status: CandidateStatus;
    desc: string;
    verdict?: Verdict;
    avatar: string;
}

// --- REAL AVATAR MAPPING ---
const AVATARS: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&q=80',
    '2': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
    '3': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
    '4': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
    '5': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80',
    '6': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80',
    '7': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80',
    '8': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80',
    '9': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&q=80',
    '10': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80',
    '11': 'https://images.unsplash.com/photo-1507081323647-4d250478b919?w=100&h=100&fit=crop&q=80',
    '12': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80',
    '13': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&q=80',
    '14': 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&q=80',
    '15': 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=100&h=100&fit=crop&q=80',
};

// --- MOCK DATA (15 candidates) ---
const MOCK_CANDIDATES: MockCandidate[] = [
    // === DELIVERED — Proceed (5) ===
    {
        id: '7', name: '王子轩', role: '后端工程师', exp: '7年',
        status: CandidateStatus.DELIVERED, verdict: 'Proceed',
        desc: '技术扎实，项目经验丰富，沟通表达清晰。',
        avatar: AVATARS['7']
    },
    {
        id: '8', name: '李雅婷', role: '数据分析师', exp: '4年',
        status: CandidateStatus.DELIVERED, verdict: 'Proceed',
        desc: '分析思维清晰，案例讲述完整，逻辑自洽。',
        avatar: AVATARS['8']
    },
    {
        id: '9', name: '张明宇', role: 'DevOps 工程师', exp: '6年',
        status: CandidateStatus.DELIVERED, verdict: 'Proceed',
        desc: '实战经验丰富，问题解决能力突出。',
        avatar: AVATARS['9']
    },
    {
        id: '10', name: '刘子琪', role: 'UI 设计师', exp: '5年',
        status: CandidateStatus.DELIVERED, verdict: 'Proceed',
        desc: '设计理念前沿，作品集出色，团队协作好。',
        avatar: AVATARS['10']
    },
    {
        id: '11', name: '黄博文', role: '全栈工程师', exp: '4年',
        status: CandidateStatus.DELIVERED, verdict: 'Proceed',
        desc: '技术广度好，学习能力强，成长性佳。',
        avatar: AVATARS['11']
    },
    // === DELIVERED — FollowUp (3) ===
    {
        id: '4', name: '赵嘉明', role: '高级前端工程师', exp: '5年',
        status: CandidateStatus.DELIVERED, verdict: 'FollowUp',
        desc: '技术功底扎实，离职动机存疑，建议二面追问。',
        avatar: AVATARS['4']
    },
    {
        id: '12', name: '孙芮', role: '项目经理', exp: '8年',
        status: CandidateStatus.DELIVERED, verdict: 'FollowUp',
        desc: '管理经验丰富但跳槽频繁，建议了解稳定性。',
        avatar: AVATARS['12']
    },
    {
        id: '13', name: '陈浩然', role: 'Java 工程师', exp: '6年',
        status: CandidateStatus.DELIVERED, verdict: 'FollowUp',
        desc: '技术能力达标，薪资期望偏高，需沟通对齐。',
        avatar: AVATARS['13']
    },
    // === DELIVERED — Hold (1) ===
    {
        id: '14', name: '马晨曦', role: '产品经理', exp: '3年',
        status: CandidateStatus.DELIVERED, verdict: 'Hold',
        desc: '项目描述模糊，关键指标无法量化，存在较大疑点。',
        avatar: AVATARS['14']
    },
    // === IN PROGRESS (4) ===
    {
        id: '1', name: '陈思远', role: 'Java 专家', exp: '10年',
        status: CandidateStatus.PENDING_OUTREACH,
        desc: '新简历入库，正在排队等待 AI 触达...',
        avatar: AVATARS['1']
    },
    {
        id: '2', name: '林雨晴', role: 'Java 架构师', exp: '8年',
        status: CandidateStatus.INTERVIEWING,
        desc: 'AI 正在与候选人进行对话...',
        avatar: AVATARS['2']
    },
    {
        id: '3', name: '周子涵', role: '测试专家', exp: '6年',
        status: CandidateStatus.ANALYZING,
        desc: '通话结束，正在生成评估报告...',
        avatar: AVATARS['3']
    },
    {
        id: '6', name: '姜琳', role: '算法工程师', exp: '4年',
        status: CandidateStatus.TOUCHED,
        desc: '已发送邀请，等待候选人响应...',
        avatar: AVATARS['6']
    },
    {
        id: '15', name: '韩雪', role: '测试工程师', exp: '3年',
        status: CandidateStatus.PENDING_OUTREACH,
        desc: '新简历入库，排队等待触达...',
        avatar: AVATARS['15']
    },
    // === EXCEPTION (1) ===
    {
        id: '5', name: '吴晓斗', role: '产品经理', exp: '3年',
        status: CandidateStatus.EXCEPTION,
        desc: '呼叫中断或未接通，建议人工介入。',
        avatar: AVATARS['5']
    },
];

// --- DYNAMIC AGENT STATES ---
const AGENT_ACTIVITIES = [
    { text: "今日已完成 9 人筛选：5 人建议面试，3 人需关注，1 人暂缓", icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", dot: "bg-indigo-500" },
    { text: "正在面试候选人 林雨晴 (05:23)...", icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", dot: "bg-indigo-500" },
    { text: "正在生成 周子涵 的面试分析报告 (89%)...", icon: Loader2, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", dot: "bg-amber-500", spin: true },
    { text: "正在呼叫候选人 姜琳 (第1次尝试)...", icon: Radio, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", dot: "bg-emerald-500" },
    { text: "赵嘉明 报告已交付 → 需关注离职动机", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", dot: "bg-amber-500" },
];

type FilterType = 'ALL' | 'PROCEED' | 'FOLLOW_UP' | 'HOLD' | 'IN_PROGRESS' | 'EXCEPTION';

// 轻量 info tooltip 组件
const InfoTip = ({ text, className = '' }: { text: string; className?: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <span className={`relative inline-flex ${className}`}>
            <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="text-slate-300 hover:text-slate-500 transition-colors">
                <HelpCircle size={13} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-50 w-48 px-3 py-2 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-lg">
                        {text}
                        <div className="absolute left-3 -top-1 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                </>
            )}
        </span>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ browserContext, setBrowserContext, onNavigate }) => {
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [activityIndex, setActivityIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Skeleton entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    // Cycle through agent activities to make it feel alive
    useEffect(() => {
        const interval = setInterval(() => {
            setActivityIndex(prev => (prev + 1) % AGENT_ACTIVITIES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const currentActivity = AGENT_ACTIVITIES[activityIndex];
    const ActivityIcon = currentActivity.icon;

    // --- Dynamic KPI counts ---
    const proceedCount = MOCK_CANDIDATES.filter(c => c.status === CandidateStatus.DELIVERED && c.verdict === 'Proceed').length;
    const followUpCount = MOCK_CANDIDATES.filter(c => c.status === CandidateStatus.DELIVERED && c.verdict === 'FollowUp').length;
    const holdCount = MOCK_CANDIDATES.filter(c => c.status === CandidateStatus.DELIVERED && c.verdict === 'Hold').length;
    const inProgressCount = MOCK_CANDIDATES.filter(c => c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION).length;
    const exceptionCount = MOCK_CANDIDATES.filter(c => c.status === CandidateStatus.EXCEPTION).length;

    // --- Filter + Search Logic ---
    const filteredList = MOCK_CANDIDATES.filter(c => {
        if (filter === 'PROCEED' && !(c.status === CandidateStatus.DELIVERED && c.verdict === 'Proceed')) return false;
        if (filter === 'FOLLOW_UP' && !(c.status === CandidateStatus.DELIVERED && c.verdict === 'FollowUp')) return false;
        if (filter === 'HOLD' && !(c.status === CandidateStatus.DELIVERED && c.verdict === 'Hold')) return false;
        if (filter === 'IN_PROGRESS' && (c.status === CandidateStatus.DELIVERED || c.status === CandidateStatus.EXCEPTION)) return false;
        if (filter === 'EXCEPTION' && c.status !== CandidateStatus.EXCEPTION) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
        }
        return true;
    });

    // --- Sort: 建议面试 → 需关注 → 暂缓 → 进行中 → 异常 ---
    const getSortPriority = (c: MockCandidate): number => {
        if (c.status === CandidateStatus.DELIVERED && c.verdict === 'Proceed') return 0;
        if (c.status === CandidateStatus.DELIVERED && c.verdict === 'FollowUp') return 1;
        if (c.status === CandidateStatus.DELIVERED && c.verdict === 'Hold') return 2;
        if (c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION) return 3;
        return 4; // EXCEPTION
    };
    const sortedList = [...filteredList].sort((a, b) => getSortPriority(a) - getSortPriority(b));

    const handleRowClick = (candidate: typeof MOCK_CANDIDATES[0]) => {
        if (candidate.status === CandidateStatus.DELIVERED) {
            onNavigate(ViewState.REPORT, candidate.id);
        } else {
            onNavigate(ViewState.ORDER_TRACKING, candidate.id);
        }
    };

    // Resume View (Browser Context)
    if (browserContext === 'resume') {
        return (
            <div className="w-full h-full bg-white/95 overflow-y-auto font-sans text-slate-900">
                {/* Header */}
                <div className="h-14 bg-[#1f2937] flex items-center px-6 justify-between sticky top-0 z-10 shadow-md">
                    <div className="flex items-center gap-8">
                        <span className="text-[#00bebd] font-extrabold text-xl tracking-tight">BOSS</span>
                        <div className="flex gap-6 text-sm font-medium text-slate-400">
                            <span className="text-white font-bold cursor-pointer">推荐牛人</span>
                            <span className="hover:text-white cursor-pointer transition-colors">搜索</span>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                </div>
                <div className="max-w-5xl mx-auto mt-8 pb-20 px-6">
                    <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-6">
                                <img src={AVATARS['4']} className="w-24 h-24 rounded-lg object-cover shadow-sm" />
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl font-bold text-slate-900">赵嘉明</h1>
                                        <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-0.5 rounded">P7</span>
                                    </div>
                                    <div className="flex gap-6 text-sm text-slate-600">
                                        <span className="flex items-center gap-1.5"><Briefcase size={16} /> 5年经验</span>
                                        <span className="flex items-center gap-1.5"><GraduationCap size={16} /> 本科</span>
                                        <span className="flex items-center gap-1.5"><MapPin size={16} /> 北京</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // RECRUITER WORKBENCH - MANAGERIAL VIEW
    return (
        // Updated: Ensure w-full h-full and scrolling happen here.
        <div className="w-full h-full bg-white/50 backdrop-blur-sm flex flex-col overflow-y-auto font-sans text-slate-900 scroll-smooth">

            {/* 1. AGENT STATUS BAR */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-all duration-500">
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 p-0.5 bg-white">
                                <img src={EILEEN_AVATAR} alt="艾琳" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors duration-500 ${currentActivity.dot}`}></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900">艾琳的工作台</h2>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 transition-all duration-500 ${currentActivity.bg} ${currentActivity.color} ${currentActivity.border}`}>
                                    <ActivitySize size={10} /> 状态：活跃
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 h-4">
                                <ActivityIcon size={12} className={`transition-colors duration-500 ${currentActivity.color} ${currentActivity.spin ? 'animate-spin' : ''}`} />
                                <p className="text-xs text-slate-500 transition-all duration-500">
                                    {currentActivity.text}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Updated: Reduced bottom padding from pb-20 to pb-8 to fix whitespace */}
            <div className="p-6 pb-8">
                {/* 2. KPI Cards */}
                <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={16} /> 艾琳今日汇报
                    </h3>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* 建议面试 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 group hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer" onClick={() => setFilter('PROCEED')}>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide flex items-center gap-1">建议面试 <InfoTip text="AI 综合评估后认为适合推进面试流程的候选人" /></span>
                            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{proceedCount}</span>
                            <span className="text-sm text-slate-400 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    {/* 需关注 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 group hover:shadow-md hover:border-amber-200 transition-all cursor-pointer" onClick={() => setFilter('FOLLOW_UP')}>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide flex items-center gap-1">需关注 <InfoTip text="面试可推进但存在风险点，建议重点追问" /></span>
                            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-amber-600 tracking-tight">{followUpCount}</span>
                            <span className="text-sm text-slate-400 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    {/* 暂缓 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 group hover:shadow-md hover:border-rose-200 transition-all cursor-pointer" onClick={() => setFilter('HOLD')}>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide flex items-center gap-1">暂缓 <InfoTip text="AI 发现较大疑点，建议暂不推进" /></span>
                            <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-rose-600 tracking-tight">{holdCount}</span>
                            <span className="text-sm text-slate-400 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    {/* 进行中 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setFilter('IN_PROGRESS')}>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide flex items-center gap-1">进行中 <InfoTip text="艾琳正在处理中，包括待触达、面试中、分析中等" /></span>
                            <Clock size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{inProgressCount}</span>
                            <span className="text-sm text-slate-400 ml-1 font-bold">人</span>
                        </div>
                    </div>
                </div>

                {/* 3. Main List Section */}
                <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white z-20 border-b border-slate-200">

                        {/* Pill Tabs */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200">
                            {[
                                { id: 'ALL', label: '全部', count: MOCK_CANDIDATES.length },
                                { id: 'PROCEED', label: '建议面试', count: proceedCount },
                                { id: 'FOLLOW_UP', label: '需关注', count: followUpCount },
                                { id: 'HOLD', label: '暂缓', count: holdCount },
                                { id: 'IN_PROGRESS', label: '进行中', count: inProgressCount },
                                { id: 'EXCEPTION', label: '异常', count: exceptionCount },
                            ].map((t) => {
                                const isActive = filter === t.id;
                                return (
                                    <button key={t.id} onClick={() => setFilter(t.id as FilterType)}
                                        className={`px-4 py-1.5 text-[13px] font-bold rounded-full transition-all duration-300 ${isActive
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                                            }`}>
                                        {t.label} {t.id !== 'ALL' && <span className="text-[11px] ml-0.5 opacity-60">{t.count}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search */}
                        <div className="relative ml-4">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索姓名或职位"
                                className="pl-8 pr-3 py-1.5 w-48 text-[13px] bg-slate-50 border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
                            />
                        </div>
                    </div>

                    {/* List Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-3 pl-2">候选人</div>
                        <div className="col-span-2">状态</div>
                        <div className="col-span-5">艾琳的当前进展</div>
                        <div className="col-span-2 text-right pr-2">管理操作</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-100">
                        {isLoading && (
                            <div className="animate-pulse space-y-0 divide-y divide-slate-50">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className="grid grid-cols-12 gap-4 px-6 py-5 items-center">
                                        <div className="col-span-3 flex items-center gap-4 pl-2">
                                            <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3.5 w-20 bg-slate-200 rounded" />
                                                <div className="h-2.5 w-28 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="col-span-3"><div className="h-2.5 bg-slate-100 rounded w-32" /></div>
                                        <div className="col-span-2"><div className="h-5 bg-slate-100 rounded-full w-16" /></div>
                                        <div className="col-span-2"><div className="h-2.5 bg-slate-100 rounded w-24" /></div>
                                        <div className="col-span-2"><div className="h-7 bg-slate-100 rounded-lg w-20 ml-auto" /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!isLoading && sortedList.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                    <Search size={24} className="text-slate-300" />
                                </div>
                                <p className="text-[15px] font-bold text-slate-400 mb-1">当前筛选条件下暂无候选人</p>
                                <p className="text-[13px] text-slate-300">调整筛选条件或创建新任务</p>
                            </div>
                        )}
                        {!isLoading && sortedList.map((c) => (
                            <div key={c.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleRowClick(c)}>
                                <div className="col-span-3 flex items-center gap-4 pl-2 min-w-0">
                                    <img src={c.avatar} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0" alt={c.name} />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{c.name}</h3>
                                        <p className="text-[13px] text-slate-500 mt-0.5 font-medium truncate">{c.role} · {c.exp}</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    {/* 已有结果 */}
                                    {c.status === CandidateStatus.DELIVERED && c.verdict === 'Proceed' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[13px] font-bold rounded-md whitespace-nowrap"><CheckCircle2 size={14} /> 建议面试</span>}
                                    {c.status === CandidateStatus.DELIVERED && c.verdict === 'FollowUp' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 需关注</span>}
                                    {c.status === CandidateStatus.DELIVERED && c.verdict === 'Hold' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 暂缓</span>}
                                    {/* 进行中 */}
                                    {c.status === CandidateStatus.PENDING_OUTREACH && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[13px] font-bold rounded-md whitespace-nowrap"><Clock size={14} /> 待触达</span>}
                                    {c.status === CandidateStatus.TOUCHED && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[13px] font-bold rounded-md whitespace-nowrap"><Mail size={14} /> 已触达</span>}
                                    {c.status === CandidateStatus.INTERVIEWING && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[13px] font-bold rounded-md whitespace-nowrap animate-pulse"><Phone size={14} /> 面试中</span>}
                                    {c.status === CandidateStatus.ANALYZING && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[13px] font-bold rounded-md whitespace-nowrap"><RefreshCw size={14} className="animate-spin" /> 分析中</span>}
                                    {/* 异常 */}
                                    {c.status === CandidateStatus.EXCEPTION && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 异常</span>}
                                </div>
                                <div className="col-span-5 pr-4 min-w-0">
                                    <span className="text-[14px] font-medium text-slate-600 truncate block flex items-center gap-2">
                                        {c.status === CandidateStatus.INTERVIEWING && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
                                        {c.desc}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right pr-2 flex justify-end">
                                    {c.status === CandidateStatus.PENDING_OUTREACH && <span className="text-[12px] text-slate-400 font-medium">排队中...</span>}
                                    {c.status === CandidateStatus.DELIVERED && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.REPORT, c.id); }} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 whitespace-nowrap flex items-center gap-1"><UserCheck size={14} /> 决策</button>}
                                    {[CandidateStatus.TOUCHED, CandidateStatus.INTERVIEWING, CandidateStatus.ANALYZING].includes(c.status) && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="text-[13px] font-bold text-indigo-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">查看进度</button>}
                                    {c.status === CandidateStatus.EXCEPTION && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="px-4 py-2 border border-rose-200 text-rose-600 text-[13px] font-bold rounded-lg hover:bg-rose-50 transition-all bg-white">人工介入</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Quick Action - Updated with Warm Gradient */}
                <div className="mt-6 mb-6">
                    <button onClick={() => setBrowserContext('resume')} className="flex items-center gap-4 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group w-96 shadow-sm">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-indigo-600"><FileText size={24} /></div>
                        <div><div className="text-[15px] font-bold text-slate-900">查看候选人简历 (示例)</div><div className="text-[13px] text-slate-500 mt-0.5">来源：Boss直聘</div></div>
                        <ArrowRight size={20} className="ml-auto text-slate-300 group-hover:text-indigo-500" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ActivitySize = ({ size }: { size: number }) => <Activity size={size} />;

export default DashboardView;