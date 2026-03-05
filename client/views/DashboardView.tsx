import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, CandidateStatus, CandidateUpdateEvent } from '../../shared/types';
import type { Candidate } from '../../shared/types';
import type { BrowserContextInfo } from '../components/EileenSidebar';
import { CheckCircle2, Phone, AlertTriangle, ArrowRight, Clock, Loader2, FileText, Briefcase, GraduationCap, MapPin, HelpCircle, Mail, Activity, Sparkles, UserCheck, Radio, Search, Bell, CheckCheck } from 'lucide-react';
import { candidates as candidatesApi, notifications as notificationsApi } from '../services/api';

interface DashboardViewProps {
    onNavigate: (view: ViewState, id: string) => void;
    browserContext: BrowserContextInfo;
    setBrowserContext: (ctx: BrowserContextInfo) => void;
    onUnreadCountChange?: (count: number) => void;
}

import eileenAvatarImg from '../assets/hr.png';
const EILEEN_AVATAR = eileenAvatarImg;

// Status description for the "progress" column
const STATUS_DESC: Record<CandidateStatus, string> = {
    [CandidateStatus.PENDING_OUTREACH]: '简历已解析，等待 HR 发送邀约...',
    [CandidateStatus.TOUCHED]: '候选人已打开面试链接，等待开始对话...',
    [CandidateStatus.INTERVIEWING]: 'AI 正在与候选人对话中...',
    [CandidateStatus.ANALYZING]: '通话已结束，正在生成评估报告...',
    [CandidateStatus.DELIVERED]: '报告已交付，请查看分析结果',
    [CandidateStatus.EXCEPTION]: '任务异常，建议人工介入',
};

// Agent status bar — static for now (will be dynamic when real-time events are implemented)
const AGENT_ACTIVITIES = [
    { text: "Ailin 就绪，等待指令", icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", dot: "bg-indigo-500" },
    { text: "正在监听候选人动态...", icon: Radio, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", dot: "bg-emerald-500" },
];

type FilterType = 'ALL' | 'PROCEED' | 'FOLLOW_UP' | 'HOLD' | 'IN_PROGRESS' | 'EXCEPTION';

// Default avatar fallback — shows first character of name
const AvatarFallback = ({ name }: { name: string }) => (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0 ring-2 ring-white shadow-sm">
        {name.charAt(0)}
    </div>
);

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

const DashboardView: React.FC<DashboardViewProps> = ({ browserContext, setBrowserContext, onNavigate, onUnreadCountChange }) => {
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [activityIndex, setActivityIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [candidateList, setCandidateList] = useState<Candidate[]>([]);
    const [updateEvents, setUpdateEvents] = useState<CandidateUpdateEvent[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Fetch candidates and notifications from API
    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [candRes, notifRes] = await Promise.all([
                candidatesApi.list({ page: 1, pageSize: 100 }),
                notificationsApi.getSummary(),
            ]);
            setCandidateList(candRes.candidates);
            setUpdateEvents(notifRes.events);
        } catch (err: any) {
            setError(err.message || '加载数据失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Cycle through agent activities
    useEffect(() => {
        const interval = setInterval(() => {
            setActivityIndex(prev => (prev + 1) % AGENT_ACTIVITIES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Sync unread count to parent
    const unreadEvents = updateEvents.filter(e => !e.isRead);
    useEffect(() => {
        onUnreadCountChange?.(unreadEvents.length);
    }, [unreadEvents.length]);

    const handleDismissEvent = async (eventId: string, candidateId: string) => {
        // Optimistic update
        setUpdateEvents(prev => prev.map(e => e.id === eventId ? { ...e, isRead: true } : e));
        // Call API
        notificationsApi.markRead(eventId).catch(() => {
            // Revert on failure
            setUpdateEvents(prev => prev.map(e => e.id === eventId ? { ...e, isRead: false } : e));
        });
        // Navigate
        const candidate = candidateList.find(c => c.id === candidateId);
        if (candidate?.status === CandidateStatus.DELIVERED) {
            onNavigate(ViewState.REPORT, candidateId);
        } else {
            onNavigate(ViewState.ORDER_TRACKING, candidateId);
        }
    };

    const handleMarkAllRead = async () => {
        const prevEvents = updateEvents;
        setUpdateEvents(prev => prev.map(e => ({ ...e, isRead: true })));
        notificationsApi.markAllRead().catch(() => setUpdateEvents(prevEvents));
    };

    const currentActivity = AGENT_ACTIVITIES[activityIndex];
    const ActivityIcon = currentActivity.icon;

    // KPI counts from real data
    const proceedCount = candidateList.filter(c => c.status === CandidateStatus.DELIVERED && c.recommendation === 'Proceed').length;
    const followUpCount = candidateList.filter(c => c.status === CandidateStatus.DELIVERED && c.recommendation === 'FollowUp').length;
    const holdCount = candidateList.filter(c => c.status === CandidateStatus.DELIVERED && c.recommendation === 'Hold').length;
    const inProgressCount = candidateList.filter(c => c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION).length;
    const exceptionCount = candidateList.filter(c => c.status === CandidateStatus.EXCEPTION).length;

    // Filter + Search
    const filteredList = candidateList.filter(c => {
        if (filter === 'PROCEED' && !(c.status === CandidateStatus.DELIVERED && c.recommendation === 'Proceed')) return false;
        if (filter === 'FOLLOW_UP' && !(c.status === CandidateStatus.DELIVERED && c.recommendation === 'FollowUp')) return false;
        if (filter === 'HOLD' && !(c.status === CandidateStatus.DELIVERED && c.recommendation === 'Hold')) return false;
        if (filter === 'IN_PROGRESS' && (c.status === CandidateStatus.DELIVERED || c.status === CandidateStatus.EXCEPTION)) return false;
        if (filter === 'EXCEPTION' && c.status !== CandidateStatus.EXCEPTION) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q);
        }
        return true;
    });

    // Sort: Proceed → FollowUp → Hold → InProgress → Exception
    const getSortPriority = (c: Candidate): number => {
        if (c.status === CandidateStatus.DELIVERED && c.recommendation === 'Proceed') return 0;
        if (c.status === CandidateStatus.DELIVERED && c.recommendation === 'FollowUp') return 1;
        if (c.status === CandidateStatus.DELIVERED && c.recommendation === 'Hold') return 2;
        if (c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION) return 3;
        return 4;
    };
    const sortedList = [...filteredList].sort((a, b) => getSortPriority(a) - getSortPriority(b));

    const handleRowClick = (c: Candidate) => {
        if (c.status === CandidateStatus.DELIVERED) {
            onNavigate(ViewState.REPORT, c.id);
        } else {
            onNavigate(ViewState.ORDER_TRACKING, c.id);
        }
    };

    // Resume View (Browser Context)
    if (browserContext.mode === 'resume') {
        return (
            <div className="w-full h-full bg-white/95 overflow-y-auto font-sans text-slate-900">
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
                                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm">赵</div>
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

    // MAIN DASHBOARD
    return (
        <div className="w-full h-full bg-white/50 backdrop-blur-sm flex flex-col overflow-y-auto font-sans text-slate-900 scroll-smooth">

            {/* 1. AGENT STATUS BAR */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm transition-all duration-500">
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 p-0.5 bg-white">
                                <img src={EILEEN_AVATAR} alt="Ailin" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors duration-500 ${currentActivity.dot}`}></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900">Ailin 的工作台</h2>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 transition-all duration-500 ${currentActivity.bg} ${currentActivity.color} ${currentActivity.border}`}>
                                    <ActivitySize size={10} /> 状态：活跃
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 h-4">
                                <ActivityIcon size={12} className={`transition-colors duration-500 ${currentActivity.color}`} />
                                <p className="text-xs text-slate-500 transition-all duration-500">
                                    {currentActivity.text}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 pb-8">
                {/* Error state */}
                {error && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-600 text-sm">
                        {error}
                        <button onClick={fetchData} className="ml-3 underline font-bold">重试</button>
                    </div>
                )}

                {/* 2. KPI Cards */}
                <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={16} /> Ailin 今日汇报
                    </h3>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
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

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28 group hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setFilter('IN_PROGRESS')}>
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-bold text-slate-600 tracking-wide flex items-center gap-1">进行中 <InfoTip text="Ailin 正在处理中，包括待触达、面试中、分析中等" /></span>
                            <Clock size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                        </div>
                        <div>
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{inProgressCount}</span>
                            <span className="text-sm text-slate-400 ml-1 font-bold">人</span>
                        </div>
                    </div>
                </div>

                {/* 2.5 Notification events */}
                {unreadEvents.length > 0 && (
                    <div className="mb-8 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-200/60 rounded-2xl p-5 animate-[fadeIn_0.4s_ease-out]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Bell size={16} className="text-indigo-600" />
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-800">
                                    新动态
                                    <span className="ml-2 text-[13px] font-bold text-indigo-500">({unreadEvents.length})</span>
                                </h3>
                            </div>
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-white/80 rounded-lg transition-all"
                            >
                                <CheckCheck size={14} />
                                全部已读
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {unreadEvents.map((evt) => {
                                const severityConfig = {
                                    success: { bar: 'bg-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600' },
                                    info: { bar: 'bg-blue-500', icon: Mail, iconColor: 'text-blue-600' },
                                    error: { bar: 'bg-rose-500', icon: AlertTriangle, iconColor: 'text-rose-600' },
                                }[evt.severity];
                                const SeverityIcon = severityConfig.icon;

                                const timeAgo = (() => {
                                    const diff = Date.now() - new Date(evt.createdAt).getTime();
                                    const minutes = Math.floor(diff / 60000);
                                    if (minutes < 60) return `${minutes} 分钟前`;
                                    const hours = Math.floor(minutes / 60);
                                    if (hours < 24) return `${hours} 小时前`;
                                    return `${Math.floor(hours / 24)} 天前`;
                                })();

                                return (
                                    <div
                                        key={evt.id}
                                        onClick={() => handleDismissEvent(evt.id, evt.candidateId)}
                                        className="flex items-stretch bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group overflow-hidden"
                                    >
                                        <div className={`w-1 shrink-0 ${severityConfig.bar}`} />
                                        <div className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <SeverityIcon size={18} className={`shrink-0 ${severityConfig.iconColor}`} />
                                                <div className="min-w-0">
                                                    <p className="text-[14px] font-bold text-slate-800 truncate">
                                                        {evt.candidateName}
                                                        <span className="font-medium text-slate-400 ml-1.5">· {evt.candidateRole}</span>
                                                    </p>
                                                    <p className="text-[13px] text-slate-500 mt-0.5 truncate">{evt.message}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-[12px] text-slate-400 whitespace-nowrap">{timeAgo}</span>
                                                <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Main List Section */}
                <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white z-20 border-b border-slate-200">
                        <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200">
                            {[
                                { id: 'ALL', label: '全部', count: candidateList.length },
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

                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-3 pl-2">候选人</div>
                        <div className="col-span-2">状态</div>
                        <div className="col-span-5">Ailin 的当前进展</div>
                        <div className="col-span-2 text-right pr-2">管理操作</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {isLoading && (
                            <div className="animate-pulse space-y-0 divide-y divide-slate-50">
                                {[1, 2, 3, 4, 5].map(i => (
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
                                <p className="text-[15px] font-bold text-slate-400 mb-1">
                                    {candidateList.length === 0 ? '暂无候选人' : '当前筛选条件下暂无候选人'}
                                </p>
                                <p className="text-[13px] text-slate-300">
                                    {candidateList.length === 0 ? '通过 Sidebar 上传简历开始使用' : '调整筛选条件或创建新任务'}
                                </p>
                            </div>
                        )}
                        {!isLoading && sortedList.map((c) => (
                            <div key={c.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleRowClick(c)}>
                                <div className="col-span-3 flex items-center gap-4 pl-2 min-w-0">
                                    {c.avatar ? (
                                        <img src={c.avatar} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0" alt={c.name} />
                                    ) : (
                                        <AvatarFallback name={c.name} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-[16px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{c.name}</h3>
                                        <p className="text-[13px] text-slate-500 mt-0.5 font-medium truncate">{c.role}</p>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    {c.status === CandidateStatus.DELIVERED && c.recommendation === 'Proceed' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[13px] font-bold rounded-md whitespace-nowrap"><CheckCircle2 size={14} /> 建议面试</span>}
                                    {c.status === CandidateStatus.DELIVERED && c.recommendation === 'FollowUp' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 需关注</span>}
                                    {c.status === CandidateStatus.DELIVERED && c.recommendation === 'Hold' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 暂缓</span>}
                                    {c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[13px] font-bold rounded-md whitespace-nowrap">
                                            <Loader2 size={14} className="animate-spin" /> 进行中
                                        </span>
                                    )}
                                    {c.status === CandidateStatus.EXCEPTION && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[13px] font-bold rounded-md whitespace-nowrap"><AlertTriangle size={14} /> 异常</span>}
                                </div>
                                <div className="col-span-5 pr-4 min-w-0">
                                    <span className="text-[14px] font-medium text-slate-600 truncate block flex items-center gap-2">
                                        {c.status === CandidateStatus.INTERVIEWING && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
                                        {STATUS_DESC[c.status as CandidateStatus] || c.status}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right pr-2 flex justify-end">
                                    {c.status === CandidateStatus.DELIVERED && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.REPORT, c.id); }} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 whitespace-nowrap flex items-center gap-1"><UserCheck size={14} /> 决策</button>}
                                    {c.status !== CandidateStatus.DELIVERED && c.status !== CandidateStatus.EXCEPTION && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="text-[13px] font-bold text-indigo-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">查看进度</button>}
                                    {c.status === CandidateStatus.EXCEPTION && <button onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.ORDER_TRACKING, c.id); }} className="px-4 py-2 border border-rose-200 text-rose-600 text-[13px] font-bold rounded-lg hover:bg-rose-50 transition-all bg-white">人工介入</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 mb-6">
                    <button onClick={() => setBrowserContext({ mode: 'resume', candidateName: '赵嘉明', candidateRole: 'Java 架构师' })} className="flex items-center gap-4 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group w-96 shadow-sm">
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
