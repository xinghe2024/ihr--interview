
import React, { useState, useRef } from 'react';
import { ViewState, Observation, ResumeSection } from '../../shared/types';
import { ChevronLeft, UserCheck, XCircle, Mic2, MapPin, Mail, Phone, Building2, CheckCircle2, AlertTriangle, GraduationCap } from 'lucide-react';
import RedPenCard from '../components/RedPenCard';

interface ReportViewProps {
    candidateId: string | null;
    onNavigate: (view: ViewState) => void;
}

const ReportView: React.FC<ReportViewProps> = ({ candidateId, onNavigate }) => {
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // --- MOCK DATA START ---
    // In a real app, this would be fetched based on candidateId

    // 1. AI Insights (The Evidence) - "Right Column"
    const observations: Observation[] = [
        {
            id: 'o1',
            category: '技术深度验证',
            title: 'React Fiber 架构理解',
            observation: '候选人对 Scheduler 调度机制描述准确，能清晰解释时间切片原理。',
            quote: '...Fiber 其实就是把递归改成了链表遍历，利用 requestIdleCallback 做时间切片...',
            evidenceTime: '04:15 - 05:30',
            signalType: 'CONFIDENT',
            relatedSectionId: 'work_1' // Maps to ByteDance Job
        },
        {
            id: 'o2',
            category: '离职动机核实',
            title: '关于离职原因的陈述',
            observation: '提及团队变动时语速变慢，且与简历上的时间线（空窗期）存在逻辑断层。',
            quote: '呃...主要是当时...那个业务线调整了嘛，然后...我们也换了 Leader...',
            evidenceTime: '12:10 - 13:45',
            signalType: 'HESITANT',
            gap: '表达流利度下降，未正面回答裁员比例问题。',
            nextQuestion: '建议背景调查时重点核实该段时间的社保缴纳记录。',
            relatedSectionId: 'work_1_reason' // Maps to specific reason line
        },
        {
            id: 'o3',
            category: '项目经验',
            title: '微前端落地经验',
            observation: '能够给出替代方案，并未实际主导过从0到1的基座搭建，更多是使用现成框架。',
            quote: '我们当时用的是 qiankun，主要是接入，基座那边不是我主要负责的。',
            evidenceTime: '18:20 - 19:10',
            signalType: 'VAGUE',
            relatedSectionId: 'project_1' // Maps to Project
        }
    ];

    // 2. Parsed Resume Structure (The Context) - "Left Column"
    const resumeSections: ResumeSection[] = [
        {
            id: 'header', type: 'header',
            content: { name: '赵嘉明', role: '高级前端工程师', contact: '138-0000-0000 · zhangsan@email.com', loc: '北京 · 望京' }
        },
        {
            id: 'edu', type: 'education',
            content: { school: '北京邮电大学', degree: '计算机科学与技术 · 本科', time: '2015 - 2019' }
        },
        {
            id: 'work_1', type: 'work', verificationStatus: 'warning',
            content: {
                company: '北京字节跳动科技有限公司',
                role: '资深前端开发工程师',
                time: '2021.03 - 至今',
                desc: [
                    { text: '负责核心业务中台建设，支撑日均千万级 PV 访问。', id: 'w1_p1', status: 'verified' },
                    { text: '主导 React 16 到 18 的架构升级，First Contentful Paint (FCP) 提升 40%。', id: 'w1_p2', status: 'verified' },
                    { text: '离职原因：寻求更大的技术挑战及业务发展空间。', id: 'work_1_reason', status: 'risk' }
                ]
            }
        },
        {
            id: 'project_1', type: 'project', verificationStatus: 'neutral',
            content: {
                name: '企业级 CRM 微前端重构',
                role: '前端负责人',
                desc: [
                    { text: '基于 qiankun 构建微前端基座，实现巨石应用拆解。', id: 'p1_d1', status: 'neutral' },
                    { text: '设计跨应用通信机制，解决样式隔离问题。', id: 'p1_d2', status: 'neutral' }
                ]
            }
        },
        {
            id: 'skills', type: 'skills',
            content: { tags: ['React', 'TypeScript', 'Node.js', 'K8s', 'Rust', 'WebAssembly'] }
        }
    ];
    // --- MOCK DATA END ---

    // Scrolling Logic
    const handleObservationClick = (sectionId?: string) => {
        if (!sectionId) return;
        setActiveSectionId(sectionId);
        const element = document.getElementById(`resume-section-${sectionId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleSectionClick = (sectionId: string) => {
        setActiveSectionId(sectionId);
        // Find which observation links to this section
        const obsId = observations.find(o => o.relatedSectionId === sectionId || sectionId.startsWith(o.relatedSectionId || ''))?.id;
        if (obsId) {
            const element = document.getElementById(`obs-card-${obsId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="h-full w-full bg-[#f8f9fc] flex flex-col relative overflow-hidden font-sans">

            {/* 1. Header (Sticky) */}
            <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between shrink-0 z-30 sticky top-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onNavigate(ViewState.DASHBOARD)}
                        className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-sm font-medium transition-colors"
                    >
                        <ChevronLeft size={18} /> 返回工作台
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">ZS</div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">赵嘉明</h2>
                            <p className="text-xs text-slate-500">高级前端工程师 · 5年经验</p>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100">
                            <CheckCircle2 size={12} /> 推荐跟进
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-bold rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm"
                        onClick={() => console.log('Action: Reject candidate')}
                    >
                        <XCircle size={16} /> 淘汰
                    </button>
                    <button
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-md transition-all"
                        onClick={() => console.log('Action: Schedule Interview')}
                    >
                        <UserCheck size={16} /> 安排面试
                    </button>
                </div>
            </div>

            {/* 1.5 TL;DR Verdict Banner */}
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center gap-3 shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">综合建议：推荐跟进</span>
                <span className="text-xs text-emerald-600">AI 综合评分 82 分 · 技术能力突出，离职动机需复试核实</span>
            </div>

            {/* 2. Main Split Content */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT COLUMN: The "Evidence Scene" (Parsed Resume) */}
                <div className="w-[55%] h-full overflow-y-auto scroll-smooth p-8 pb-32 border-r border-slate-200 bg-white" id="resume-container">
                    <div className="max-w-[700px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Header Info */}
                        {resumeSections.filter(s => s.type === 'header').map(s => (
                            <div key={s.id} className="border-b border-slate-100 pb-6">
                                <h1 className="text-3xl font-extrabold text-slate-900 mb-4">{s.content.name}</h1>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-1.5"><Building2 size={16} /> {s.content.role}</span>
                                    <span className="flex items-center gap-1.5"><Phone size={16} /> {s.content.contact.split('·')[0]}</span>
                                    <span className="flex items-center gap-1.5"><Mail size={16} /> {s.content.contact.split('·')[1]}</span>
                                    <span className="flex items-center gap-1.5"><MapPin size={16} /> {s.content.loc}</span>
                                </div>
                            </div>
                        ))}

                        {/* Resume Body Sections */}
                        {resumeSections.filter(s => s.type !== 'header').map((s) => {
                            // Check if this whole section or any of its children is active
                            const isSectionActive = activeSectionId && (activeSectionId === s.id || activeSectionId.startsWith(s.id));

                            return (
                                <div
                                    key={s.id}
                                    id={`resume-section-${s.id}`}
                                    onClick={() => handleSectionClick(s.id)}
                                    className={`group rounded-xl p-5 transition-all duration-300 border-2 cursor-pointer
                                ${isSectionActive
                                            ? 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                                            : 'bg-transparent border-transparent hover:bg-slate-50'
                                        }
                            `}
                                >
                                    {/* Section Labels */}
                                    {s.type === 'work' && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 size={14} /> 工作经历</h3>}
                                    {s.type === 'project' && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Building2 size={14} /> 项目经验</h3>}
                                    {s.type === 'education' && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><GraduationCap size={14} /> 教育背景</h3>}
                                    {s.type === 'skills' && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle2 size={14} /> 技能清单</h3>}

                                    {/* Render: Work / Project */}
                                    {(s.type === 'work' || s.type === 'project') && (
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-lg font-bold text-slate-900">{s.content.company || s.content.name}</h4>
                                                <span className="text-sm font-medium text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">{s.content.time}</span>
                                            </div>
                                            <div className="text-sm text-indigo-600 font-bold mb-3">{s.content.role}</div>

                                            <ul className="space-y-2">
                                                {s.content.desc.map((line: any) => {
                                                    const isLineActive = activeSectionId === line.id;
                                                    // Determine visual style based on verification status
                                                    let highlightClass = "";
                                                    if (line.status === 'verified') highlightClass = "bg-emerald-100/50 decoration-emerald-300 underline decoration-2 underline-offset-4";
                                                    if (line.status === 'risk') highlightClass = "bg-amber-100/50 decoration-amber-300 underline decoration-2 underline-offset-4";
                                                    if (line.status === 'neutral') highlightClass = "decoration-slate-200";

                                                    return (
                                                        <li
                                                            key={line.id}
                                                            id={`resume-section-${line.id}`}
                                                            onClick={(e) => { e.stopPropagation(); handleSectionClick(line.id); }}
                                                            className={`text-[15px] leading-relaxed text-slate-700 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-slate-300 transition-all
                                                        ${isLineActive ? 'font-medium text-slate-900' : ''}
                                                    `}
                                                        >
                                                            <span className={`px-1 rounded -ml-1 transition-all ${highlightClass} ${isLineActive ? 'bg-opacity-100' : ''}`}>
                                                                {line.text}
                                                            </span>
                                                            {/* Inline Status Icons */}
                                                            {line.status === 'verified' && <CheckCircle2 size={12} className="inline ml-2 text-emerald-500 align-middle" />}
                                                            {line.status === 'risk' && <AlertTriangle size={12} className="inline ml-2 text-amber-500 align-middle" />}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Render: Education */}
                                    {s.type === 'education' && (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-lg font-bold text-slate-900">{s.content.school}</div>
                                                <div className="text-sm text-slate-600 mt-1">{s.content.degree}</div>
                                            </div>
                                            <span className="text-sm text-slate-400 font-mono">{s.content.time}</span>
                                        </div>
                                    )}

                                    {/* Render: Skills */}
                                    {s.type === 'skills' && (
                                        <div className="flex flex-wrap gap-2">
                                            {s.content.tags.map((tag: string) => (
                                                <span key={tag} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-200">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: The "Chain of Evidence" (AI Analysis) */}
                <div className="w-[45%] h-full bg-[#f8fafc] flex flex-col border-l border-slate-200">

                    {/* Sticky Header for Analysis */}
                    <div className="p-6 pb-2 shrink-0 bg-[#f8fafc] z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Mic2 size={16} className="text-indigo-600" />
                                通话验证记录 (Verifications)
                            </h3>
                            <div className="flex gap-2 text-[10px] font-bold">
                                <span className="flex items-center gap-1 text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 通过</span>
                                <span className="flex items-center gap-1 text-amber-600"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> 存疑</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            点击卡片，左侧简历将定位到对应原文。
                        </p>
                    </div>

                    {/* Cards List */}
                    <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 pb-20 scroll-smooth">
                        {observations.map((obs) => {
                            const isActive = activeSectionId && (activeSectionId === obs.relatedSectionId || activeSectionId.startsWith(obs.relatedSectionId || ''));

                            return (
                                <div
                                    key={obs.id}
                                    id={`obs-card-${obs.id}`}
                                    onClick={() => handleObservationClick(obs.relatedSectionId)}
                                    className={`transition-all duration-300 transform ${isActive ? 'scale-[1.02] ring-2 ring-indigo-400 ring-offset-2 z-10' : 'hover:scale-[1.01]'}`}
                                >
                                    <RedPenCard data={obs} />

                                    {/* Active Indicator Line (Desktop) */}
                                    {isActive && (
                                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-indigo-400 hidden lg:block"></div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="text-center py-10">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <CheckCircle2 size={24} />
                            </div>
                            <p className="text-sm text-slate-400 font-medium">其余信息经 AI 核实无明显异常</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Selection Floater */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
                {activeSectionId && (
                    <div className="bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2">
                        <span className="text-sm font-bold">已定位: {activeSectionId.includes('reason') ? '离职原因' : '工作经历'}</span>
                        <div className="h-4 w-px bg-white/20"></div>
                        <button className="text-xs font-bold text-indigo-300 hover:text-white" onClick={() => setActiveSectionId(null)}>取消高亮</button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ReportView;
