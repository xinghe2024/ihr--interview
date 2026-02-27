import React, { useState, useEffect } from 'react';
import { ViewState, CandidateStatus, EventCode } from '../../shared/types';
import { ChevronLeft, Clock, Mail, Phone, FileText, CheckCircle2, AlertTriangle, RefreshCw, Copy, Bell, MoreHorizontal, User, Smartphone, MapPin, Briefcase } from 'lucide-react';

interface OrderTrackingViewProps {
    candidateId: string | null;
    onNavigate: (view: ViewState, id?: string) => void;
}

// Helper to determine status based on ID for demo purposes
const getMockStatus = (id: string | null): CandidateStatus => {
    if (id === '2') return CandidateStatus.TOUCHED; // 林雨晴
    if (id === '3') return CandidateStatus.ANALYZING; // 周子涵
    if (id === '5') return CandidateStatus.EXCEPTION; // 吴晓斗
    return CandidateStatus.INTERVIEWING; // Default demo state
};

const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ candidateId, onNavigate }) => {
    const status = getMockStatus(candidateId);
    const [timer, setTimer] = useState(0);

    // Mock Timer for Interviewing State
    useEffect(() => {
        if (status === CandidateStatus.INTERVIEWING) {
            const interval = setInterval(() => setTimer(t => t + 1), 1000);
            return () => clearInterval(interval);
        }
    }, [status]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // State Machine Configuration
    const steps = [
        { id: CandidateStatus.PENDING_OUTREACH, label: '待触达', icon: Clock },
        { id: CandidateStatus.TOUCHED, label: '已触达', icon: Mail },
        { id: CandidateStatus.INTERVIEWING, label: '正在面试', icon: Phone },
        { id: CandidateStatus.ANALYZING, label: '分析中', icon: FileText },
        { id: CandidateStatus.DELIVERED, label: '已交付', icon: CheckCircle2 },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === status);
    // Exception handling: if EXCEPTION, we map it to TOUCHED index visually but show error
    const visualStepIndex = status === CandidateStatus.EXCEPTION ? 1 : (currentStepIndex === -1 ? 2 : currentStepIndex);

    // Mock Timeline Data
    const timelineLogs = [
        { time: '14:00', title: '任务创建', detail: 'HR 发起自动初筛任务' },
        { time: '14:02', title: '简历解析完成', detail: '提取关键技能：Java, Spring Boot, K8s' },
        ...(status === CandidateStatus.TOUCHED ? [
            { time: '14:30', title: 'H5落地页已打开', detail: '候选人打开H5落地页 (LANDING_OPENED)', eventCode: EventCode.LANDING_OPENED }
        ] : []),
        ...(status !== CandidateStatus.PENDING_OUTREACH && status !== CandidateStatus.TOUCHED ? [
            { time: '14:30', title: 'H5落地页已打开', detail: '候选人打开H5落地页 (LANDING_OPENED)', eventCode: EventCode.LANDING_OPENED },
            { time: '14:31', title: '通话建立', detail: '双方已接入，开始对话' },
        ] : []),
        ...(status === CandidateStatus.EXCEPTION ? [
            { time: '14:35', title: '通话异常中断', detail: '原因：候选人主动挂断', type: 'error' }
        ] : []),
        ...(status === CandidateStatus.ANALYZING ? [
            { time: '14:45', title: '通话结束', detail: '通话时长 14分20秒 (CALL_ENDED)', eventCode: EventCode.CALL_ENDED },
            { time: '14:46', title: '分析开始', detail: '正在进行语音转写与意图识别... (ANALYSIS_STARTED)', eventCode: EventCode.ANALYSIS_STARTED }
        ] : []),
        ...(status === CandidateStatus.DELIVERED ? [
            { time: '14:45', title: '通话结束', detail: '通话时长 14分20秒 (CALL_ENDED)', eventCode: EventCode.CALL_ENDED },
            { time: '14:46', title: '分析开始', detail: '正在进行语音转写与意图识别... (ANALYSIS_STARTED)', eventCode: EventCode.ANALYSIS_STARTED },
            { time: '14:48', title: '报告就绪', detail: 'AI分析报告已生成 (REPORT_READY)', eventCode: EventCode.REPORT_READY },
            { time: '14:49', title: '报告交付', detail: '报告已交付，证据可播放 (REPORT_DELIVERED)', eventCode: EventCode.REPORT_DELIVERED }
        ] : [])
    ];

    return (
        <div className="h-full w-full bg-[#f8f9fc] flex flex-col font-sans">

            {/* 1. Navbar */}
            <div className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onNavigate(ViewState.DASHBOARD)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-[15px] font-bold text-slate-900 leading-tight">任务详情 #{candidateId || 'Unknown'}</h2>
                    </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    Order ID: 20240520-{candidateId}-X92
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* 2. Candidate Info Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex justify-between items-start">
                        <div className="flex gap-5">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-xl font-bold text-slate-500">
                                {candidateId === '2' ? 'LY' : candidateId === '3' ? 'ZZ' : candidateId === '5' ? 'WX' : 'ZJ'}
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
                                    {candidateId === '2' ? '林雨晴' : candidateId === '3' ? '周子涵' : candidateId === '5' ? '吴晓斗' : '赵嘉明'}
                                </h1>
                                <div className="flex gap-4 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-1.5"><Briefcase size={16} /> Java 架构师</span>
                                    <span className="flex items-center gap-1.5"><MapPin size={16} /> 北京</span>
                                    <span className="flex items-center gap-1.5"><User size={16} /> 8年经验</span>
                                </div>
                            </div>
                        </div>
                        {/* Status Badge (Top Right) */}
                        <div>
                            {status === CandidateStatus.INTERVIEWING && (
                                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center gap-3 animate-pulse">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    <span className="font-bold text-sm">正在面试 ({formatTime(322 + timer)})</span>
                                </div>
                            )}
                            {status === CandidateStatus.EXCEPTION && (
                                <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    <span className="font-bold text-sm">异常：用户未接听</span>
                                </div>
                            )}
                            {status === CandidateStatus.TOUCHED && (
                                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex items-center gap-2">
                                    <Mail size={18} />
                                    <span className="font-bold text-sm">已触达 (等待接入)</span>
                                </div>
                            )}
                            {status === CandidateStatus.ANALYZING && (
                                <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 flex items-center gap-2">
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span className="font-bold text-sm">AI 分析报告中...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. State Machine (Progress Bar) */}
                    <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                        <div className="relative flex justify-between">
                            {/* Connecting Line Background */}
                            <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>

                            {/* Active Line (Dynamic Width) */}
                            <div
                                className={`absolute top-5 left-0 h-0.5 bg-indigo-600 -z-10 transition-all duration-1000 ease-in-out`}
                                style={{ width: `${(visualStepIndex / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {steps.map((step, index) => {
                                const isCompleted = index <= visualStepIndex;
                                const isCurrent = index === visualStepIndex;
                                const isException = status === CandidateStatus.EXCEPTION && isCurrent;

                                let circleClass = "bg-white border-slate-200 text-slate-300";
                                let textClass = "text-slate-400";

                                if (isException) {
                                    circleClass = "bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100";
                                    textClass = "text-rose-600 font-bold";
                                } else if (isCurrent) {
                                    if (status === CandidateStatus.INTERVIEWING) {
                                        circleClass = "bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse";
                                        textClass = "text-emerald-600 font-bold";
                                    } else if (status === CandidateStatus.ANALYZING) {
                                        circleClass = "bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100";
                                        textClass = "text-amber-600 font-bold";
                                    } else {
                                        circleClass = "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100";
                                        textClass = "text-indigo-600 font-bold";
                                    }
                                } else if (isCompleted) {
                                    circleClass = "bg-indigo-600 border-indigo-600 text-white";
                                    textClass = "text-indigo-600 font-bold";
                                }

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 ${circleClass}`}>
                                            <step.icon size={18} />
                                        </div>
                                        <span className={`text-xs font-medium transition-colors duration-300 ${textClass}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Manual Intervention Actions - Updated to text-[13px] */}
                        {status !== CandidateStatus.DELIVERED && (
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                                {status === CandidateStatus.TOUCHED && (
                                    <>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                                            <Copy size={16} /> 复制邀请链接
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[13px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
                                            <Bell size={16} /> 立即催促
                                        </button>
                                    </>
                                )}
                                {status === CandidateStatus.EXCEPTION && (
                                    <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[13px] font-bold shadow-md hover:bg-rose-700 transition-colors">
                                        <RefreshCw size={16} /> 重置任务
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 4. Timeline Logs */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm">任务日志 (Activity Log)</h3>
                        </div>
                        <div className="p-6">
                            <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                                {timelineLogs.map((log, index) => (
                                    <div key={index} className="relative group">
                                        {/* Dot */}
                                        <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 bg-white ${log.type === 'error' ? 'border-rose-500' : 'border-indigo-500'} group-hover:scale-125 transition-transform`}></div>

                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="text-[13px] font-mono font-bold text-slate-400 w-12 shrink-0">{log.time}</span>
                                            <div>
                                                <h4 className={`text-sm font-bold ${log.type === 'error' ? 'text-rose-600' : 'text-slate-900'}`}>{log.title}</h4>
                                                <p className="text-xs text-slate-500 mt-1">{log.detail}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Live Indicator at bottom */}
                                {status !== CandidateStatus.DELIVERED && status !== CandidateStatus.EXCEPTION && (
                                    <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-200 animate-pulse"></div>
                                        <span className="text-xs text-slate-400 italic pl-1">等待后续事件...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OrderTrackingView;