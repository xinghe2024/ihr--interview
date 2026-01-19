import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, CandidateStatus, Observation, ResumeSection } from '../../types';
import { ChevronLeft, Clock, Mail, Phone, FileText, CheckCircle2, AlertTriangle, RefreshCw, Copy, Bell, MoreHorizontal, XCircle, UserCheck, Mic2, Play, Pause, Download, Briefcase, MapPin, MessageSquare, Link, PhoneForwarded, RotateCcw, Loader2 } from 'lucide-react';
import RedPenCard from '../RedPenCard';

interface OrderDetailViewProps {
  candidateId: string | null;
  onNavigate: (view: ViewState) => void;
  defaultTab?: 'ANALYSIS' | 'TIMELINE' | 'RECORDING';
}

const EILEEN_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80";

// --- 1. CONFIGURATION & TYPES ---

const STEPS = [
    { id: CandidateStatus.PENDING_OUTREACH, label: '待触达', icon: Clock },
    { id: CandidateStatus.INVITED, label: '已邀请', icon: Mail },
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
        case '1': // 赵六 - Newly created
            status = CandidateStatus.PENDING_OUTREACH;
            name = '赵六';
            role = 'Java 专家';
            avatar = AVATARS['1'];
            break;
        case '2': // 王五 - In Call
            status = CandidateStatus.INTERVIEWING;
            name = '王五';
            role = 'Java 架构师';
            avatar = AVATARS['2'];
            break;
        case '3': // 钱七 - Analyzing
            status = CandidateStatus.ANALYZING;
            name = '钱七';
            role = '测试专家';
            avatar = AVATARS['3'];
            break;
        case '4': // 张三 - Delivered
            status = CandidateStatus.DELIVERED;
            name = '张三';
            role = '高级前端工程师';
            avatar = AVATARS['4'];
            break;
        case '5': // 李四 - Exception
            status = CandidateStatus.EXCEPTION;
            name = '李四';
            role = '产品经理';
            avatar = AVATARS['5'];
            break;
        case '6': // Extra - Invited
            status = CandidateStatus.INVITED;
            name = '孙九';
            role = '算法工程师';
            avatar = AVATARS['6'];
            break;
        default:
            status = CandidateStatus.DELIVERED;
            name = '张三 (演示)';
            role = '高级前端工程师';
            avatar = AVATARS['4'];
    }

    // Dynamic Timeline Logs Generation
    const logs: TimelineLog[] = [
        { time: '14:00', title: '任务创建', detail: 'iHR 发起自动初筛任务', type: 'default' },
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
  const { status, name, role, logs, avatar } = useMemo(() => getMockCandidateContext(candidateId), [candidateId]);
  
  // Local state for Decision Logic
  const [decisionState, setDecisionState] = useState<'NONE' | 'PROCESSING' | 'APPROVED' | 'REJECTED'>('NONE');
  
  // Smart default tab logic
  const smartInitialTab = (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) ? 'TIMELINE' : defaultTab;
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'TIMELINE' | 'RECORDING' | 'RESUME'>(smartInitialTab);
  
  useEffect(() => {
     if (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) {
         setActiveTab('TIMELINE');
     } else {
         setActiveTab(defaultTab);
     }
  }, [defaultTab, status]);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // DECISION HANDLER
  const handleDecision = (type: 'APPROVED' | 'REJECTED') => {
      setDecisionState('PROCESSING');
      // Simulate API Call
      setTimeout(() => {
          setDecisionState(type);
      }, 1500);
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

  // Mock Resume Data
  const observations: Observation[] = [
    {
      id: 'o1', category: '技术深度验证', title: 'React Fiber 架构理解',
      observation: '候选人对 Scheduler 调度机制描述准确，能清晰解释时间切片原理。',
      quote: '...Fiber 其实就是把递归改成了链表遍历，利用 requestIdleCallback 做时间切片...',
      evidenceTime: '04:15 - 05:30', signalType: 'CONFIDENT', relatedSectionId: 'work_1'
    },
    {
      id: 'o2', category: '离职动机核实', title: '关于离职原因的陈述',
      observation: '提及团队变动时语速变慢，且与简历上的时间线（空窗期）存在逻辑断层。',
      quote: '呃...主要是当时...那个业务线调整了嘛，然后...我们也换了 Leader...',
      evidenceTime: '12:10 - 13:45', signalType: 'HESITANT', gap: '表达流利度下降，未正面回答裁员比例问题。', nextQuestion: '建议背景调查时重点核实该段时间的社保缴纳记录。', relatedSectionId: 'work_1_reason'
    }
  ];

  const resumeSections: ResumeSection[] = [
      { id: 'header', type: 'header', content: { name: name, role: role, contact: '138-0000-0000 · email@example.com', loc: '北京 · 望京' } },
      { id: 'edu', type: 'education', content: { school: '北京邮电大学', degree: '计算机科学与技术 · 本科', time: '2015 - 2019' } },
      { id: 'work_1', type: 'work', verificationStatus: 'warning', content: { 
          company: '北京字节跳动科技有限公司', role: '资深前端开发工程师', time: '2021.03 - 至今',
          desc: [
              { text: '负责核心业务中台建设，支撑日均千万级 PV 访问。', id: 'w1_p1', status: 'verified' },
              { text: '主导 React 16 到 18 的架构升级，First Contentful Paint (FCP) 提升 40%。', id: 'w1_p2', status: 'verified' },
              { text: '离职原因：寻求更大的技术挑战及业务发展空间。', id: 'work_1_reason', status: 'risk' } 
          ]
      }},
      { id: 'project_1', type: 'project', verificationStatus: 'neutral', content: {
          name: '企业级 CRM 微前端重构', role: '前端负责人',
          desc: [{ text: '基于 qiankun 构建微前端基座，实现巨石应用拆解。', id: 'p1_d1', status: 'neutral' }]
      }},
      { id: 'skills', type: 'skills', content: { tags: ['React', 'TypeScript', 'Node.js', 'K8s'] }}
  ];

  const transcript = [
      { speaker: 'AI', text: '您好，这里是字节跳动招聘组的 AI 助理艾琳。请问现在方便大概花 10 分钟聊聊吗？', time: '00:05' },
      { speaker: 'Candidate', text: '嗯，方便的，您请说。', time: '00:12' },
      { speaker: 'AI', text: '好的。我看到您简历里提到了 React 18 的升级经历。能具体讲讲在处理并发更新时，遇到了哪些棘手的问题吗？', time: '00:18' },
      { speaker: 'Candidate', text: '呃...主要是当时...那个业务线调整了嘛，然后...我们也换了 Leader... 其实技术上主要是调度器那块...', time: '00:35', highlight: 'risk' },
  ];

  // Actions
  const handleSectionClick = (sectionId: string) => {
      setActiveSectionId(sectionId);
      const obsId = observations.find(o => o.relatedSectionId === sectionId || sectionId.startsWith(o.relatedSectionId || ''))?.id;
      if (obsId) document.getElementById(`obs-card-${obsId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleObservationClick = (sectionId?: string) => {
      if (!sectionId) return;
      setActiveSectionId(sectionId);
      document.getElementById(`resume-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // --- SUB-VIEWS ---

  const RenderAnalysisTab = () => (
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Resume Column - Changed bg-white to white/60 to let gradient bleed through */}
        <div className="w-[55%] h-full overflow-y-auto scroll-smooth p-8 pb-32 border-r border-white/40 bg-white/60 backdrop-blur-md">
            <div className="max-w-[700px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {resumeSections.filter(s => s.type !== 'header').map((s) => {
                    const isSectionActive = activeSectionId && (activeSectionId === s.id || activeSectionId.startsWith(s.id));
                    return (
                        <div key={s.id} id={`resume-section-${s.id}`} onClick={() => handleSectionClick(s.id)}
                            className={`group rounded-xl p-5 transition-all duration-300 border-2 cursor-pointer ${isSectionActive ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                {s.type === 'work' && <><Briefcase size={14}/> 工作经历</>}
                                {s.type === 'project' && <><Briefcase size={14}/> 项目经验</>}
                                {s.type === 'education' && <><Briefcase size={14}/> 教育背景</>}
                                {s.type === 'skills' && <><CheckCircle2 size={14}/> 技能清单</>}
                            </h3>

                            {(s.type === 'work' || s.type === 'project') && (
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-[15px] font-bold text-slate-900">{s.content.company || s.content.name}</h4>
                                        <span className="text-[13px] font-medium text-slate-500 font-mono bg-white/60 px-2 py-0.5 rounded">{s.content.time}</span>
                                    </div>
                                    <div className="text-[13px] text-indigo-600 font-bold mb-3">{s.content.role}</div>
                                    <ul className="space-y-2">
                                        {s.content.desc.map((line: any) => {
                                            const isLineActive = activeSectionId === line.id;
                                            const highlightClass = line.status === 'verified' ? "bg-emerald-100/50 decoration-emerald-300 underline" : line.status === 'risk' ? "bg-amber-100/50 decoration-amber-300 underline" : "";
                                            return (
                                                <li key={line.id} id={`resume-section-${line.id}`} onClick={(e) => { e.stopPropagation(); handleSectionClick(line.id); }}
                                                    className={`text-sm leading-relaxed text-slate-700 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-slate-300 transition-all ${isLineActive ? 'font-medium text-slate-900' : ''}`}>
                                                    <span className={`px-1 rounded -ml-1 transition-all ${highlightClass} ${isLineActive ? 'bg-opacity-100' : ''}`}>{line.text}</span>
                                                    {line.status === 'verified' && <CheckCircle2 size={12} className="inline ml-2 text-emerald-500" />}
                                                    {line.status === 'risk' && <AlertTriangle size={12} className="inline ml-2 text-amber-500" />}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                             {s.type === 'skills' && (
                                <div className="flex flex-wrap gap-2">
                                    {s.content.tags.map((tag: string) => (
                                        <span key={tag} className="px-3 py-1.5 bg-white/60 text-slate-600 text-[13px] font-medium rounded-lg border border-slate-200">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* AI Insights Column - Transparent bg */}
        <div className="w-[45%] h-full bg-transparent flex flex-col border-l border-white/40">
             <div className="p-6 pb-2 shrink-0 z-10">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <img src={EILEEN_AVATAR} className="w-8 h-8 rounded-full border border-indigo-100" />
                         <h3 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                             艾琳的验证记录
                         </h3>
                      </div>
                  </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 pb-20 scroll-smooth">
                 {observations.map((obs) => {
                     const isActive = activeSectionId && (activeSectionId === obs.relatedSectionId || activeSectionId.startsWith(obs.relatedSectionId || ''));
                     return (
                         <div key={obs.id} id={`obs-card-${obs.id}`} onClick={() => handleObservationClick(obs.relatedSectionId)}
                             className={`transition-all duration-300 transform ${isActive ? 'scale-[1.02] ring-2 ring-indigo-400 ring-offset-2 z-10' : 'hover:scale-[1.01]'}`}>
                             <RedPenCard data={obs} />
                             {isActive && <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-indigo-400 hidden lg:block"></div>}
                         </div>
                     );
                 })}
             </div>
        </div>
      </div>
  );

  const RenderTimelineTab = () => (
      <div className="flex-1 overflow-y-auto p-8 bg-transparent relative z-10">
          <div className="max-w-3xl mx-auto">
             <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-glass overflow-hidden mb-8">
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
                                <span className="text-xs text-slate-400 italic pl-1">iHR 正在执行下一步操作...</span>
                            </div>
                         )}
                    </div>
                 </div>
             </div>
          </div>
      </div>
  );

  const RenderRecordingTab = () => (
      <div className="flex-1 flex overflow-hidden bg-white/70 backdrop-blur-md relative z-10">
          <div className="w-[60%] flex flex-col border-r border-white/50">
             <div className="px-6 py-4 border-b border-white/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 text-[13px]">全文转写 (Transcript)</h3>
                 <button className="text-[13px] text-indigo-600 font-bold flex items-center gap-1"><Download size={12}/> 导出文本</button>
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
                                 <span className="text-xs font-bold text-slate-700">{t.speaker === 'AI' ? '招聘助理艾琳' : '张三'}</span>
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
              <div className="p-6 border-b border-white/50">
                  <div className="bg-white/80 rounded-xl border border-white/60 p-4 shadow-glass">
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
    // Changed: Transparent main container
    <div className="h-full w-full bg-transparent flex flex-col relative overflow-hidden font-sans">
      
      {/* NEW: Ambient Gradient Blob */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-rose-200/20 to-transparent blur-[120px] pointer-events-none z-0"></div>

      {/* 1. PERSISTENT HEADER (FIXED OVERFLOW & FLEX LAYOUT) */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/50 px-6 pt-5 pb-0 shrink-0 z-30 sticky top-0 flex flex-col gap-5 shadow-sm">
        
        {/* TOAST FEEDBACK OVERLAY */}
        {decisionState === 'APPROVED' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <div>
                    <div className="font-bold text-sm">已通过初筛</div>
                    <div className="text-xs text-slate-300">艾琳已自动发送面试邀请邮件。</div>
                </div>
            </div>
        )}
        {decisionState === 'REJECTED' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                <XCircle className="text-rose-400" size={20} />
                <div>
                    <div className="font-bold text-sm">已标记淘汰</div>
                    <div className="text-xs text-slate-300">订单已归档至历史库。</div>
                </div>
            </div>
        )}

        {/* Top Row: Info & Global Actions */}
        <div className="flex items-center justify-between">
            {/* Left Side: Candidate Info */}
            <div className="flex items-center gap-5 flex-1 min-w-0 mr-4">
                <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded-lg text-slate-500 transition-colors shrink-0">
                    <ChevronLeft size={22} />
                </button>
                <div className="flex items-center gap-4 min-w-0">
                    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            {/* UPDATED: text-lg instead of text-xl/2xl */}
                            <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{name}</h2>
                            {/* Status Badge - Updated text-xs */}
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border flex items-center gap-1.5 cursor-pointer hover:opacity-80 shrink-0 shadow-sm
                                ${decisionState !== 'NONE' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                  status === CandidateStatus.DELIVERED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                  status === CandidateStatus.EXCEPTION ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                  'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                {decisionState === 'APPROVED' ? <><CheckCircle2 size={12}/> 已通过</> : 
                                 decisionState === 'REJECTED' ? <><XCircle size={12}/> 已淘汰</> :
                                 status === CandidateStatus.DELIVERED ? <><CheckCircle2 size={12}/> 已交付</> :
                                 status === CandidateStatus.INVITED ? <><Mail size={12}/> 已邀请</> :
                                 status === CandidateStatus.INTERVIEWING ? <><Phone size={12}/> 面试中</> :
                                 status === CandidateStatus.ANALYZING ? <><RefreshCw size={12} className="animate-spin"/> 分析中</> :
                                 status === CandidateStatus.PENDING_OUTREACH ? <><Clock size={12}/> 待触达</> :
                                 <><AlertTriangle size={12}/> 异常</>}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 truncate font-medium">
                            {role} <span className="w-1 h-1 rounded-full bg-slate-300"></span> <span className="font-mono text-slate-400">ID: {candidateId}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Actions - Decision Buttons */}
            <div className="flex items-center gap-2 shrink-0">
                {decisionState === 'NONE' && (
                    <>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors" title="更多操作">
                            <MoreHorizontal size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <button 
                            onClick={() => handleDecision('REJECTED')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-rose-200 text-rose-600 text-[13px] font-bold rounded-lg hover:bg-rose-50 transition-all whitespace-nowrap"
                        >
                            <XCircle size={14} /> 淘汰
                        </button>
                        <button 
                            onClick={() => handleDecision('APPROVED')} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[13px] font-bold rounded-lg hover:bg-indigo-600 shadow-md shadow-slate-300 transition-all whitespace-nowrap"
                        >
                            <UserCheck size={14} /> 通过
                        </button>
                    </>
                )}
                {decisionState === 'PROCESSING' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                        <Loader2 size={14} className="animate-spin text-slate-500"/>
                        <span className="text-[13px] font-bold text-slate-500">处理中...</span>
                    </div>
                )}
                {decisionState !== 'NONE' && decisionState !== 'PROCESSING' && (
                    <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-all">
                        返回工作台
                    </button>
                )}
            </div>
        </div>

        {/* Bottom Row: UPDATED PILL TABS */}
        <div className="flex justify-between items-center pb-3">
             <div className="flex p-1 bg-slate-100/60 rounded-full border border-white/40 backdrop-blur-sm">
                {[
                    { id: 'ANALYSIS', label: '智能分析', icon: CheckCircle2, disabled: status !== CandidateStatus.DELIVERED },
                    { id: 'TIMELINE', label: '任务进度', icon: Clock, disabled: false },
                    { id: 'RESUME', label: '原始简历', icon: FileText, disabled: false },
                    { id: 'RECORDING', label: '通话录音', icon: Mic2, disabled: [CandidateStatus.PENDING_OUTREACH, CandidateStatus.INVITED].includes(status) }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                        disabled={tab.disabled as boolean}
                        className={`px-4 py-1.5 text-[13px] font-bold rounded-full flex items-center gap-2 transition-all whitespace-nowrap relative
                            ${activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                : tab.disabled 
                                    ? 'text-slate-300 cursor-not-allowed' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.id === 'RECORDING' && activeTab !== 'RECORDING' && !tab.disabled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-2 right-2"></span>
                        )}
                    </button>
                ))}
            </div>
            {/* Optional: Tab Contextual Action/Info could go here */}
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeTab === 'ANALYSIS' && <RenderAnalysisTab />}
      {activeTab === 'TIMELINE' && <RenderTimelineTab />}
      {activeTab === 'RECORDING' && <RenderRecordingTab />}
      {activeTab === 'RESUME' && (
           <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-white/40 relative z-10">
               <div className="bg-white/80 backdrop-blur-md shadow-lg p-12 min-h-[800px] w-[800px]">
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

    </div>
  );
};

export default OrderDetailView;