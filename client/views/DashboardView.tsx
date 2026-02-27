import React, { useState, useEffect } from 'react';
import { ViewState, CandidateStatus } from '../../shared/types';
import { CheckCircle2, User, Phone, AlertTriangle, ArrowRight, Clock, Loader2, FileText, Briefcase, GraduationCap, MapPin, HelpCircle, Mail, RefreshCw, Activity, Sparkles, UserCheck, Radio } from 'lucide-react';

interface DashboardViewProps {
    onNavigate: (view: ViewState, id: string) => void;
    browserContext: 'empty' | 'resume';
    setBrowserContext: (ctx: 'empty' | 'resume') => void;
}

// EILEEN AVATAR
const EILEEN_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80";

// --- REAL AVATAR MAPPING ---
const AVATARS: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&q=80',
    '2': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
    '3': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
    '4': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
    '5': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80',
    '6': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80',
};

// --- MOCK DATA ---
const MOCK_CANDIDATES = [
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
        id: '4', name: '赵嘉明', role: '高级前端工程师', exp: '5年',
        status: CandidateStatus.DELIVERED,
        desc: '报告已生成，请查阅评估结果。',
        avatar: AVATARS['4']
    },
    {
        id: '5', name: '吴晓斗', role: '产品经理', exp: '3年',
        status: CandidateStatus.EXCEPTION,
        desc: '呼叫中断或未接通，建议人工介入。',
        avatar: AVATARS['5']
    },
    {
        id: '6', name: '姜琳', role: '算法工程师', exp: '4年',
        status: CandidateStatus.TOUCHED,
        desc: '已发送邀请，等待候选人响应...',
        avatar: AVATARS['6']
    },
];

// --- DYNAMIC AGENT STATES ---
const AGENT_ACTIVITIES = [
    { text: "正在面试候选人 林雨晴 (05:23)...", icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50/60", border: "border-indigo-100", dot: "bg-indigo-500" },
    { text: "正在生成 周子涵 的面试分析报告 (89%)...", icon: Loader2, color: "text-amber-600", bg: "bg-amber-50/60", border: "border-amber-100", dot: "bg-amber-500", spin: true },
    { text: "正在呼叫候选人 姜琳 (第1次尝试)...", icon: Radio, color: "text-emerald-600", bg: "bg-emerald-50/60", border: "border-emerald-100", dot: "bg-emerald-500" },
    { text: "所有高优任务处理完毕，等待新指令", icon: CheckCircle2, color: "text-slate-600", bg: "bg-slate-50/60", border: "border-slate-100", dot: "bg-slate-400" },
];

type FilterType = 'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXCEPTION';

const DashboardView: React.FC<DashboardViewProps> = ({ browserContext, setBrowserContext, onNavigate }) => {
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [activityIndex, setActivityIndex] = useState(0);

    // Cycle through agent activities to make it feel alive
    useEffect(() => {
        const interval = setInterval(() => {
            setActivityIndex(prev => (prev + 1) % AGENT_ACTIVITIES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const currentActivity = AGENT_ACTIVITIES[activityIndex];
    const ActivityIcon = currentActivity.icon;

    // Filter Logic
    const filteredList = MOCK_CANDIDATES.filter(c => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return c.status === CandidateStatus.PENDING_OUTREACH;
        if (filter === 'ACTIVE') return [CandidateStatus.TOUCHED, CandidateStatus.INTERVIEWING, CandidateStatus.ANALYZING].includes(c.status);
        if (filter === 'COMPLETED') return c.status === CandidateStatus.DELIVERED;
        if (filter === 'EXCEPTION') return c.status === CandidateStatus.EXCEPTION;
        return true;
    });

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
        <div className="w-full h-full bg-transparent flex flex-col overflow-y-auto font-sans text-slate-900 scroll-smooth relative">

            {/* NEW: Ambient Gradient Blob for Bottom Left - Visual Decoration */}
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-200/20 via-rose-200/20 to-transparent blur-[100px] pointer-events-none z-0"></div>

            {/* 1. AGENT STATUS BAR - Increased Transparency */}
            <div className="bg-white/40 backdrop-blur-xl border-b border-white/40 sticky top-0 z-30 shadow-sm transition-all duration-500">
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 p-0.5 bg-white/60">
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
                                <p className="text-xs text-slate-500 transition-all duration-500 fade-in slide-in-from-bottom-1 key={activityIndex}">
                                    {currentActivity.text}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right mr-2 hidden sm:block">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">今日消耗算力</div>
                            <div className="text-sm font-bold text-slate-800">1,240 Tokens</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Updated: Reduced bottom padding from pb-20 to pb-8 to fix whitespace */}
            <div className="p-6 pb-8 relative z-10">
                {/* 2. KPI Cards */}
                <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={16} /> 艾琳今日汇报
                    </h3>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/40 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-glass flex flex-col justify-between h-28 relative overflow-hidden group hover:bg-white/60 hover:border-indigo-200 transition-all hover:shadow-glow">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">待触达</span>
                            <div className="p-1.5 bg-white/60 rounded-md text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors"><User size={20} /></div>
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">12</span>
                            <span className="text-sm text-slate-500 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-glass flex flex-col justify-between h-28 group hover:bg-white/60 hover:border-indigo-200 transition-all hover:shadow-glow">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">正在面试</span>
                            <div className="p-1.5 bg-indigo-50/60 rounded-md text-indigo-600"><Phone size={20} /></div>
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">5</span>
                            <span className="text-sm text-slate-500 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-glass flex flex-col justify-between h-28 group hover:bg-white/60 hover:border-emerald-200 transition-all hover:shadow-glow">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">已交付</span>
                            <div className="p-1.5 bg-emerald-50/60 rounded-md text-emerald-600"><CheckCircle2 size={20} /></div>
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">8</span>
                            <span className="text-sm text-slate-500 ml-1 font-bold">人</span>
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-glass flex flex-col justify-between h-28 relative overflow-hidden group hover:bg-white/60 hover:border-rose-200 transition-all hover:shadow-glow">
                        <div className="flex justify-between items-start relative z-10">
                            <span className="text-sm font-bold text-slate-600 tracking-wide">异常/需人工</span>
                            <div className="p-1.5 bg-rose-50/60 rounded-md text-rose-600"><AlertTriangle size={20} /></div>
                        </div>
                        <div className="relative z-10">
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">1</span>
                            <span className="text-sm text-slate-500 ml-1 font-bold">人</span>
                        </div>
                    </div>
                </div>

                {/* 3. Main List Section - High Transparency & Modern Toolbar */}
                <div className="flex flex-col bg-white/40 backdrop-blur-xl rounded-3xl border border-white/40 shadow-glass overflow-hidden">
                    {/* Toolbar - Redesigned: Glassy & Unified */}
                    <div className="px-6 py-5 flex items-center sticky top-0 bg-white/40 backdrop-blur-md z-20 border-b border-white/20">

                        {/* New Pill Tabs */}
                        <div className="flex items-center p-1 bg-slate-100/50 rounded-full border border-white/30 backdrop-blur-sm">
                            {[{ id: 'ALL', label: '全部' }, { id: 'PENDING', label: '待触达' }, { id: 'ACTIVE', label: '执行中' }, { id: 'COMPLETED', label: '已交付' }, { id: 'EXCEPTION', label: '需关注' }].map((t) => {
                                const isActive = filter === t.id;
                                return (
                                    <button key={t.id} onClick={() => setFilter(t.id as FilterType)}
                                        className={`px-4 py-1.5 text-[13px] font-bold rounded-full transition-all duration-300 ${isActive
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                                            }`}>
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* List Header - Soft & Clean */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/10 border-b border-white/20 text-[11px] font-bold text-slate-400 uppercase tracking-wider backdrop-blur-sm">
                        <div className="col-span-3 pl-2">候选人</div>
                        <div className="col-span-2">状态</div>
                        <div className="col-span-5">艾琳的当前进展</div>
                        <div className="col-span-2 text-right pr-2">管理操作</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-white/40">
                        {filteredList.map((c) => (
                            <div key={c.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/40 transition-colors group cursor-pointer" onClick={() => handleRowClick(c)}>
                                <div className="col-span-3 flex items-center gap-4 pl-2 min-w-0">
                                    <img src={c.avatar} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/60 shadow-sm shrink-0" alt={c.name} />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{c.name}</h3>
                                        <p className="text-[13px] text-slate-500 mt-0.5 font-medium truncate">{c.role} · {c.exp}</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    {c.status === CandidateStatus.PENDING_OUTREACH && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100/60 text-slate-600 text-[13px] font-bold rounded-md whitespace-nowrap"><Clock size={14} /> 待触达</span>}
                                    {c.status === CandidateStatus.TOUCHED && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/60 text-indigo-600 text-[13px] font-bold rounded-md whitespace-nowrap"><Mail size={14} /> 已触达</span>}
                                    {c.status === CandidateStatus.INTERVIEWING && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/60 text-indigo-600 text-[13px] font-bold rounded-md whitespace-nowrap animate-pulse"><Phone size={14} /> 正在面试</span>}
                                    {c.status === CandidateStatus.ANALYZING && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/60 text-amber-600 text-[13px] font-bold rounded-md whitespace-nowrap"><RefreshCw size={14} className="animate-spin" /> 分析中</span>}
                                    {c.status === CandidateStatus.DELIVERED && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50/60 text-emerald-600 text-[13px] font-bold rounded-md whitespace-nowrap"><CheckCircle2 size={14} /> 已交付</span>}
                                    {c.status === CandidateStatus.EXCEPTION && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50/60 text-rose-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 异常</span>}
                                </div>
                                <div className="col-span-5 pr-4 min-w-0">
                                    <span className="text-[14px] font-medium text-slate-600 truncate block flex items-center gap-2">
                                        {c.status === CandidateStatus.INTERVIEWING && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
                                        {c.desc}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right pr-2 flex justify-end">
                                    {c.status === CandidateStatus.PENDING_OUTREACH && <button className="text-[13px] font-bold text-slate-400 px-3 py-1.5">等待执行</button>}
                                    {c.status === CandidateStatus.DELIVERED && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.REPORT, c.id); }} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 whitespace-nowrap flex items-center gap-1"><UserCheck size={14} /> 决策</button>}
                                    {[CandidateStatus.TOUCHED, CandidateStatus.INTERVIEWING, CandidateStatus.ANALYZING].includes(c.status) && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="text-[13px] font-bold text-indigo-600 hover:bg-white/50 px-3 py-1.5 rounded-lg transition-colors">查看进度</button>}
                                    {c.status === CandidateStatus.EXCEPTION && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="px-4 py-2 border border-rose-200 text-rose-600 text-[13px] font-bold rounded-lg hover:bg-rose-50 transition-all bg-white/80">人工介入</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Quick Action - Updated with Warm Gradient */}
                <div className="mt-6 mb-6">
                    <button onClick={() => setBrowserContext('resume')} className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-50/40 to-rose-50/40 backdrop-blur-md border border-white/60 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all text-left group w-96 shadow-glass">
                        <div className="w-12 h-12 bg-white/60 rounded-lg flex items-center justify-center text-indigo-600"><FileText size={24} /></div>
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