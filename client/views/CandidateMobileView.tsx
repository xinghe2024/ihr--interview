
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, ChevronLeft, ShieldCheck, Sparkles, ArrowRight, VideoOff, Phone, Star, Coffee, RefreshCw, Send, MessageSquare, Clock, Lock } from 'lucide-react';

interface CandidateMobileViewProps {
    onExit: () => void;
}

type MobileState = 'LANDING' | 'PERMISSION' | 'INCALL' | 'INTERRUPTED' | 'ENDED';
type InterviewMode = 'VOICE' | 'TEXT';

interface ChatMessage {
    id: string;
    role: 'ai' | 'candidate';
    content: string;
    timestamp: number;
}

// Mock interview script for text mode debugging
const MOCK_INTERVIEW_SCRIPT: Array<{ ai: string; topic?: string }> = [
    { ai: '您好赵嘉明，我是 Ailin，受李先生委托与您进行一次初步沟通。请问现在方便吗？' },
    { ai: '好的，谢谢。我看到您简历里提到了 React 18 的升级经历，能具体讲讲在这个过程中，遇到的最大技术挑战是什么吗？', topic: 'React 项目经验深度' },
    { ai: '明白了。那您在之前公司负责的微前端架构，大概接入了多少子应用？团队分工是怎样的？', topic: '微前端架构实操' },
    { ai: '了解。最后想聊聊，您从上一家公司离开的主要原因是什么？对下一份工作有什么期望？', topic: '离职动机核实' },
    { ai: '感谢您的分享！本次沟通到此结束，结果将在 24 小时内反馈给您。祝一切顺利！' },
];

const CandidateMobileView: React.FC<CandidateMobileViewProps> = ({ onExit }) => {
    const [state, setState] = useState<MobileState>('LANDING');
    const [interviewMode, setInterviewMode] = useState<InterviewMode>('VOICE');
    const [micActive, setMicActive] = useState(false);
    const [micPermissionGranted, setMicPermissionGranted] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [timer, setTimer] = useState(0);

    // Text chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [scriptIndex, setScriptIndex] = useState(0);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Mock Question Progression (voice mode)
    const question = timer > 3 ? "您好，我看到您在之前的项目中负责过前端架构升级。能具体聊聊在这个过程中，您遇到的最大技术挑战是什么吗？" : "正在接入通话...";

    // Timer
    useEffect(() => {
        let interval: any;
        if (state === 'INCALL') {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [state]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiTyping]);

    // Send first AI message when entering text chat
    useEffect(() => {
        if (state === 'INCALL' && interviewMode === 'TEXT' && chatMessages.length === 0) {
            setIsAiTyping(true);
            setTimeout(() => {
                setChatMessages([{
                    id: 'ai_0',
                    role: 'ai',
                    content: MOCK_INTERVIEW_SCRIPT[0].ai,
                    timestamp: Date.now(),
                }]);
                setScriptIndex(1);
                setIsAiTyping(false);
            }, 1000);
        }
    }, [state, interviewMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Text chat: send candidate message and get AI reply
    const handleSendChat = () => {
        const text = chatInput.trim();
        if (!text || isAiTyping) return;

        const candidateMsg: ChatMessage = {
            id: 'c_' + Date.now(),
            role: 'candidate',
            content: text,
            timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev, candidateMsg]);
        setChatInput('');

        // Check if we have more script to send
        if (scriptIndex < MOCK_INTERVIEW_SCRIPT.length) {
            setIsAiTyping(true);
            const isLastMessage = scriptIndex === MOCK_INTERVIEW_SCRIPT.length - 1;
            setTimeout(() => {
                setChatMessages(prev => [...prev, {
                    id: 'ai_' + scriptIndex,
                    role: 'ai',
                    content: MOCK_INTERVIEW_SCRIPT[scriptIndex].ai,
                    timestamp: Date.now(),
                }]);
                setScriptIndex(prev => prev + 1);
                setIsAiTyping(false);

                // Auto-end after last AI message
                if (isLastMessage) {
                    setTimeout(() => setState('ENDED'), 2000);
                }
            }, 1200);
        }
    };

    // Handle start interview based on mode
    const handleStartInterview = () => {
        if (interviewMode === 'VOICE') {
            setState('PERMISSION');
        } else {
            setState('INCALL');
        }
    };

    // --- RENDER FUNCTIONS (called as functions, NOT as <Components />) ---

    const renderLanding = () => (
        <div className="h-full flex flex-col bg-white px-6 pt-8 pb-6 overflow-hidden">
            {/* Top Brand */}
            <div className="flex items-center gap-2 mb-6 opacity-80 shrink-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    <Sparkles size={16} />
                </div>
                <span className="text-sm font-medium text-slate-500">Ailin · AI 招聘助理</span>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shrink-0">
                    <Phone className="text-indigo-600" size={28} />
                </div>

                <h1 className="text-[26px] font-extrabold text-slate-900 leading-[1.2] mb-6 tracking-tight shrink-0">
                    Hi 赵嘉明，<br />
                    邀请您进行岗位初步沟通
                </h1>

                {/* Education Block */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-indigo-600" />
                        <span className="text-sm font-bold text-indigo-900">AI 初筛 (AI Screening)</span>
                    </div>
                    <p className="text-[15px] text-slate-700 leading-relaxed mb-4">
                        我是智能招聘助理 <span className="font-bold">Ailin</span>。受 <span className="font-bold">李先生</span> 委托，想与您进行一次
                        <span className="font-bold text-indigo-700">{interviewMode === 'VOICE' ? '简单的语音沟通' : '简单的文字沟通'}</span>，了解您的基本情况。
                    </p>
                    <div className="flex gap-2">
                        {interviewMode === 'VOICE' ? (
                            <>
                                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <Phone size={14} /> 全程语音
                                </span>
                                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <VideoOff size={14} /> 无摄像头
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <MessageSquare size={14} /> 文字对话
                                </span>
                                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <Clock size={14} /> 随时回复
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Benefits */}
                <div className="space-y-4 shrink-0 overflow-y-auto">
                    <div className="flex items-start gap-3">
                        <div className="pt-0.5"><Star size={20} className="text-amber-500" /></div>
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-900">结果直通面试官</h3>
                            <p className="text-[13px] text-slate-500">意向确认后，24小时内对接正式面试。</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="pt-0.5"><Coffee size={20} className="text-emerald-500" /></div>
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-900">随时随地畅聊</h3>
                            <p className="text-[13px] text-slate-500">约需 10-15 分钟，您可以现在接入。</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-5 space-y-3 shrink-0 pt-2">
                {/* Mode Switch Tab */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 mb-1">
                    <button
                        onClick={() => setInterviewMode('VOICE')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${interviewMode === 'VOICE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Mic size={14} /> 语音通话
                    </button>
                    <button
                        onClick={() => setInterviewMode('TEXT')}
                        className={`flex-1 py-2 text-[13px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${interviewMode === 'TEXT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <MessageSquare size={14} /> 文字对话
                    </button>
                </div>

                <button
                    onClick={handleStartInterview}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {interviewMode === 'VOICE' ? '接受委托，接入通话' : '接受委托，开始对话'} <ArrowRight size={18} />
                </button>
                {/* Privacy Notice */}
                <p className="text-center text-[10px] text-slate-400 leading-relaxed pt-1">
                    <Lock size={10} className="inline -mt-0.5 mr-0.5" />
                    本次沟通将被记录用于招聘评估，您的信息将严格保密
                </p>
            </div>
        </div>
    );

    const renderPermission = () => (
        <div className="h-full flex flex-col p-6 items-center justify-center bg-white relative">
            <button onClick={() => setState('LANDING')} className="absolute top-6 left-6 p-2 bg-slate-50 rounded-full"><ChevronLeft size={24} /></button>

            <div className="text-center space-y-4 mb-16">
                <h3 className="text-2xl font-extrabold text-slate-900">测试麦克风</h3>
                <p className="text-base text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                    为了保证通话质量，请确保我们能听清您的声音
                </p>
            </div>

            <div className="relative mb-20">
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${micPermissionGranted ? 'bg-indigo-600 shadow-xl shadow-indigo-200' : 'bg-slate-100'}`}>
                    <Mic size={56} className={`transition-all ${micPermissionGranted ? 'text-white' : 'text-slate-400'}`} />
                </div>
                {micPermissionGranted && <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping"></div>}
            </div>

            <div className="w-full">
                {!micPermissionGranted ? (
                    <button
                        onClick={() => {
                            setMicActive(true);
                            setTimeout(() => setMicPermissionGranted(true), 1200);
                        }}
                        className="w-full py-4 border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-base flex items-center justify-center gap-3 active:scale-95"
                    >
                        {micActive ? '正在检测...' : '点击测试'}
                    </button>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in">
                        <button
                            onClick={() => setState('INCALL')}
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl text-base shadow-xl flex items-center justify-center gap-3 active:scale-95"
                        >
                            进入房间，开始通话
                        </button>
                        <p className="text-center text-sm text-emerald-600 font-bold flex items-center justify-center gap-2">
                            <ShieldCheck size={18} /> 设备状态正常
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderInCall = () => (
        <div className="h-full flex flex-col relative bg-slate-50">
            <div className="pt-16 px-6 text-center pb-6 z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-base font-bold text-slate-700 font-mono">{formatTime(timer)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">/ ~15:00</span>
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">正在与 AI 招聘助理通话</h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative px-6 pb-16">
                {/* Visualizer — sine wave instead of Math.random() */}
                <div className="mb-12 flex items-center justify-center gap-1.5 h-16">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-3 bg-indigo-400 rounded-full transition-all duration-300"
                            style={{
                                height: isMuted ? '8px' : `${Math.sin(timer * 2 + i * 1.2) * 18 + 22}px`,
                            }}
                        ></div>
                    ))}
                </div>

                <div className="w-full bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={18} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500 uppercase">Ailin</span>
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 leading-relaxed">
                        "{question}"
                    </h3>
                </div>
            </div>

            {/* Bottom controls — removed volume button */}
            <div className="p-8 pb-12 flex items-center justify-center gap-10 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 ${isMuted ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}
                >
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>

                <button
                    onClick={() => setState('INTERRUPTED')}
                    className="w-20 h-20 rounded-[2.5rem] bg-rose-500 text-white shadow-xl shadow-rose-200 transition-all active:scale-95 flex items-center justify-center"
                >
                    <PhoneOff size={32} fill="currentColor" />
                </button>
            </div>
        </div>
    );

    const renderTextChat = () => (
        <div className="h-full flex flex-col relative bg-slate-50">
            {/* Header */}
            <div className="shrink-0 px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Ailin · 文字初筛</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <span className="text-[11px] text-slate-400">进行中 · {formatTime(timer)}</span>
                            {MOCK_INTERVIEW_SCRIPT[scriptIndex - 1]?.topic && (
                                <span className="text-[10px] text-indigo-500 font-bold ml-1">#{MOCK_INTERVIEW_SCRIPT[scriptIndex - 1].topic}</span>
                            )}
                        </div>
                    </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">~15 分钟</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                            msg.role === 'candidate'
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100'
                        }`}>
                            {msg.role === 'ai' && (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Sparkles size={12} className="text-indigo-500" />
                                    <span className="text-[10px] font-bold text-indigo-500">Ailin</span>
                                </div>
                            )}
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* AI typing indicator */}
                {isAiTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-3 pb-6 space-y-2">
                <div className="flex items-center gap-2">
                    <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder={scriptIndex >= MOCK_INTERVIEW_SCRIPT.length ? '对话已结束' : '输入您的回复...'}
                        disabled={scriptIndex >= MOCK_INTERVIEW_SCRIPT.length || isAiTyping}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:opacity-50 transition-all"
                    />
                    <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || isAiTyping || scriptIndex >= MOCK_INTERVIEW_SCRIPT.length}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            chatInput.trim() && !isAiTyping
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-500'
                                : 'bg-slate-100 text-slate-300'
                        }`}
                    >
                        <Send size={18} fill={chatInput.trim() && !isAiTyping ? 'currentColor' : 'none'} />
                    </button>
                </div>
                <button
                    onClick={() => setState('ENDED')}
                    className="w-full py-2 text-[12px] font-medium text-slate-400 hover:text-rose-500 flex items-center justify-center gap-1.5 transition-colors"
                >
                    <PhoneOff size={12} /> 结束对话
                </button>
            </div>
        </div>
    );

    const renderInterrupted = () => (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-8">
                <PhoneOff className="text-amber-500" size={40} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">通话已中断</h2>
            <p className="text-base text-slate-500 mb-10 max-w-[280px] mx-auto leading-relaxed">
                别担心，您的沟通进度<span className="font-bold text-slate-700">已自动保存</span>。
                <br />如果是误触或信号问题，请点击下方按钮恢复。
            </p>

            <div className="w-full space-y-3">
                <button
                    onClick={() => setState('INCALL')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <RefreshCw size={18} /> 恢复通话
                </button>

                <button
                    onClick={() => setState('ENDED')}
                    className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    确认结束沟通
                </button>
            </div>
        </div>
    );

    const renderEnded = () => {
        const topicCount = MOCK_INTERVIEW_SCRIPT.filter(s => s.topic).length;
        const answeredCount = interviewMode === 'TEXT'
            ? chatMessages.filter(m => m.role === 'candidate').length
            : Math.min(topicCount, Math.floor(timer / 30) + 1);

        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                    <Sparkles className="text-indigo-600" size={40} />
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mb-3">沟通已完成</h2>
                <p className="text-base text-slate-500 mb-6">感谢您的配合，沟通记录已生成</p>

                {/* Session Summary — P2 #7 */}
                <div className="w-full bg-indigo-50/60 rounded-2xl p-5 mb-5 border border-indigo-100">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-2xl font-extrabold text-indigo-600">{formatTime(timer)}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">沟通时长</div>
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-indigo-600">{topicCount}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">考察话题</div>
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-indigo-600">{answeredCount}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">已作答</div>
                        </div>
                    </div>
                </div>

                <div className="w-full bg-slate-50 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <ShieldCheck size={24} className="text-emerald-500" />
                        <div className="text-left">
                            <div className="text-base font-bold text-slate-900">已同步至招聘官</div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed text-left pl-9">
                        若意向与岗位匹配，面试官将在 <span className="font-bold text-slate-900">24小时内</span> 联系您。
                    </p>
                </div>

                <button
                    onClick={onExit}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-bold shadow-lg"
                >
                    退出页面
                </button>
            </div>
        );
    };

    // Determine which INCALL view to show
    const renderInCallView = () => {
        if (interviewMode === 'TEXT') return renderTextChat();
        return renderInCall();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-sans">
            <div className="w-full max-w-[375px] h-full sm:h-[800px] bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
                {state === 'LANDING' && renderLanding()}
                {state === 'PERMISSION' && renderPermission()}
                {state === 'INCALL' && renderInCallView()}
                {state === 'INTERRUPTED' && renderInterrupted()}
                {state === 'ENDED' && renderEnded()}

                {/* iOS Home Indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full z-50"></div>
            </div>

            <button
                onClick={onExit}
                className="absolute top-6 right-6 bg-white px-4 py-2 rounded-full text-slate-900 font-bold text-xs shadow-sm"
            >
                退出模拟器
            </button>
        </div>
    );
};

export default CandidateMobileView;
