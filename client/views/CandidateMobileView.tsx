
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, PhoneOff, ShieldCheck, Sparkles, ArrowRight, Coffee, RefreshCw, Send, MessageSquare, Lock, CheckCircle, User } from 'lucide-react';
import { interviews as interviewsApi } from '../services/api';
import type { InterviewLandingResponse, InterviewSummary, InterviewProgress } from '../../shared/types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import VoiceBubble from '../components/VoiceBubble';
import { track } from '../services/analytics';

interface CandidateMobileViewProps {
    onExit: () => void;
    sessionId?: string;
}

type MobileState = 'LANDING' | 'CHATTING' | 'INTERRUPTED' | 'ENDED';
type InputMode = 'voice' | 'text';

interface ChatMessage {
    id: string;
    role: 'ai' | 'candidate' | 'system';
    content: string;
    timestamp: number;
    topic?: string;
    isVoice?: boolean;
    audioDuration?: number;
    isSending?: boolean;
    isFailed?: boolean;
    failedPayload?: { blob?: Blob; text?: string; duration?: number };
}

/** Extracted Timer — self-manages state to avoid re-rendering parent every second */
const Timer: React.FC<{
    isRunning: boolean;
    estimatedMinutes: number;
    onTick?: React.MutableRefObject<(s: number) => void>;
}> = ({ isRunning, estimatedMinutes, onTick }) => {
    const [seconds, setSeconds] = useState(0);
    const secondsRef = useRef(0);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            secondsRef.current += 1;
            setSeconds(secondsRef.current);
            onTick?.current?.(secondsRef.current);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, onTick]);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const progress = Math.min(100, (seconds / (estimatedMinutes * 60)) * 100);

    return (
        <>
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-[11px] text-slate-400">进行中 · {formatted}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
                <div
                    className="h-full bg-indigo-400 transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </>
    );
};

const CandidateMobileView: React.FC<CandidateMobileViewProps> = ({ onExit, sessionId: sessionIdProp }) => {
    const sessionId = sessionIdProp || (() => {
        const hash = window.location.hash;
        const match = hash.match(/#interview\/(.+)/);
        return match ? match[1] : '';
    })();

    const [state, setState] = useState<MobileState>('LANDING');
    const [inputMode, setInputMode] = useState<InputMode>('voice');
    const timerValueRef = useRef(0);
    const timerTickRef = useRef((s: number) => { timerValueRef.current = s; });

    // Landing data
    const [landingData, setLandingData] = useState<InterviewLandingResponse | null>(null);
    const [landingLoading, setLandingLoading] = useState(false);
    const [landingError, setLandingError] = useState<string | null>(null);

    // Interview state
    const [interviewCompleted, setInterviewCompleted] = useState(false);
    const [endSummary, setEndSummary] = useState<InterviewSummary | null>(null);
    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [progress, setProgress] = useState<InterviewProgress | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Voice recording — touch state for slide-to-cancel
    const touchStartY = useRef(0);
    const [isCancelling, setIsCancelling] = useState(false);
    const [voiceTooShort, setVoiceTooShort] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showMicPrompt, setShowMicPrompt] = useState(false);
    const [showToggleHint, setShowToggleHint] = useState(() =>
        typeof localStorage !== 'undefined' && !localStorage.getItem('ailin_toggle_hint_dismissed')
    );
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const CANCEL_THRESHOLD = 80;

    // End interview via API
    const handleEndInterview = useCallback(async (reason: string) => {
        track('view.h5_ended.entered', { session_id: sessionId || '', reason });
        if (!sessionId) { setState('ENDED'); return; }
        try {
            const res = await interviewsApi.end(sessionId, reason);
            setEndSummary(res.summary);
        } catch {
            // Still transition to ended
        }
        setState('ENDED');
    }, [sessionId]);

    // Voice recording complete → upload + send
    const handleVoiceComplete = useCallback(async (blob: Blob, durationSeconds: number) => {
        if (!sessionId || interviewCompleted || durationSeconds < 0.5) return;

        track('action.h5.message_sent', { is_voice: true, duration_s: Math.round(durationSeconds), session_id: sessionId });
        const tempId = 'voice_' + Date.now();
        const roundedDuration = Math.round(durationSeconds);
        setChatMessages(prev => [...prev, {
            id: tempId,
            role: 'candidate',
            content: '语音消息',
            timestamp: Date.now(),
            isVoice: true,
            audioDuration: roundedDuration,
            isSending: true,
        }]);
        setIsAiTyping(true);

        try {
            const uploadRes = await interviewsApi.uploadAudio(sessionId, blob);
            // Mark as sent
            setChatMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...msg, isSending: false } : msg
            ));

            const res = await interviewsApi.sendMessage(sessionId, {
                audioFileId: uploadRes.fileId,
                audioDuration: roundedDuration,
            });

            if (res.progress) setProgress(res.progress);
            if (res.aiReply) {
                setChatMessages(prev => [...prev, {
                    id: res.aiReply!.id,
                    role: 'ai',
                    content: res.aiReply!.content,
                    timestamp: Date.now(),
                    topic: res.aiReply!.topic,
                }]);

            }
            if (res.isCompleted) {
                setInterviewCompleted(true);
                setTimeout(() => handleEndInterview('completed'), 2000);
            }
        } catch (err: any) {
            // Network-level failures → offer recovery via INTERRUPTED
            if (err.message?.includes('fetch') || err.message?.includes('network') || !navigator.onLine) {
                setState('INTERRUPTED');
            }
            setChatMessages(prev => prev.map(msg =>
                msg.id === tempId
                    ? { ...msg, content: '发送失败，点击重试', isSending: false, isFailed: true, failedPayload: { blob, duration: roundedDuration } }
                    : msg
            ));
        } finally {
            setIsAiTyping(false);
        }
    }, [sessionId, interviewCompleted, handleEndInterview]);

    const recorder = useVoiceRecorder({
        maxDurationSeconds: 120,
        minDurationSeconds: 1,
        onComplete: handleVoiceComplete,
        onTooShort: () => {
            setVoiceTooShort(true);
            setTimeout(() => setVoiceTooShort(false), 2000);
        },
        onError: () => setInputMode('text'),
    });

    // Fetch landing data
    useEffect(() => {
        if (!sessionId) return;
        track('view.h5_landing.entered', { session_id: sessionId });
        setLandingLoading(true);
        setLandingError(null);
        interviewsApi.getLanding(sessionId)
            .then(data => setLandingData(data))
            .catch(err => setLandingError(err.message || '加载面试信息失败'))
            .finally(() => setLandingLoading(false));
    }, [sessionId]);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiTyping]);

    // Auto-dismiss toggle hint after 5 seconds
    useEffect(() => {
        if (showToggleHint && state === 'CHATTING') {
            const t = setTimeout(() => {
                setShowToggleHint(false);
                localStorage.setItem('ailin_toggle_hint_dismissed', '1');
            }, 5000);
            return () => clearTimeout(t);
        }
    }, [showToggleHint, state]);

    // Keyboard viewport adaptation
    useEffect(() => {
        if (state !== 'CHATTING') return;
        const vv = window.visualViewport;
        if (!vv) return;
        const handleResize = () => {
            const offset = window.innerHeight - vv.height;
            setKeyboardOffset(offset > 50 ? offset : 0);
        };
        vv.addEventListener('resize', handleResize);
        return () => vv.removeEventListener('resize', handleResize);
    }, [state]);

    // Scroll when keyboard opens
    useEffect(() => {
        if (keyboardOffset > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [keyboardOffset]);

    // Start interview — call API and get first AI message
    useEffect(() => {
        if (state !== 'CHATTING' || !sessionId || chatMessages.length > 0) return;
        // System welcome message
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setChatMessages([{
            id: 'sys_start',
            role: 'system',
            content: `— ${timeStr} 对话开始 —`,
            timestamp: Date.now(),
        }]);
        setIsAiTyping(true);
        interviewsApi.start(sessionId, 'TEXT')
            .then(res => {
                if (res.progress) setProgress(res.progress);
                if (res.firstMessage) {
                    setChatMessages(prev => [...prev, {
                        id: 'ai_0',
                        role: 'ai',
                        content: res.firstMessage,
                        timestamp: Date.now(),
                    }]);
                }
            })
            .catch(err => {
                setChatMessages(prev => [...prev, {
                    id: 'err_0',
                    role: 'ai',
                    content: `面试启动失败：${err.message || '请稍后重试'}`,
                    timestamp: Date.now(),
                }]);
            })
            .finally(() => setIsAiTyping(false));
    }, [state, sessionId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Text chat send
    const handleSendChat = useCallback(async () => {
        const text = chatInput.trim();
        if (!text || interviewCompleted || !sessionId) return;

        track('action.h5.message_sent', { is_voice: false, session_id: sessionId });
        const msgId = 'c_' + Date.now();
        setChatMessages(prev => [...prev, {
            id: msgId,
            role: 'candidate',
            content: text,
            timestamp: Date.now(),
        }]);
        setChatInput('');
        setIsAiTyping(true);

        try {
            const res = await interviewsApi.sendMessage(sessionId, { content: text });
            if (res.progress) setProgress(res.progress);
            if (res.aiReply) {
                setChatMessages(prev => [...prev, {
                    id: res.aiReply!.id,
                    role: 'ai',
                    content: res.aiReply!.content,
                    timestamp: Date.now(),
                    topic: res.aiReply!.topic,
                }]);

            }
            if (res.isCompleted) {
                setInterviewCompleted(true);
                setTimeout(() => handleEndInterview('completed'), 2000);
            }
        } catch {
            setChatMessages(prev => prev.map(msg =>
                msg.id === msgId
                    ? { ...msg, isFailed: true, failedPayload: { text } }
                    : msg
            ));
        } finally {
            setIsAiTyping(false);
        }
    }, [chatInput, interviewCompleted, sessionId, handleEndInterview]);

    // Retry failed messages
    const handleRetry = useCallback(async (msgId: string) => {
        const msg = chatMessages.find(m => m.id === msgId);
        if (!msg?.failedPayload || !sessionId) return;

        // Remove the failed message
        setChatMessages(prev => prev.filter(m => m.id !== msgId));

        if (msg.failedPayload.blob) {
            handleVoiceComplete(msg.failedPayload.blob, msg.failedPayload.duration || 0);
        } else if (msg.failedPayload.text) {
            // Re-insert as new candidate message and send
            const retryId = 'c_' + Date.now();
            const text = msg.failedPayload.text;
            setChatMessages(prev => [...prev, {
                id: retryId, role: 'candidate', content: text, timestamp: Date.now(),
            }]);
            setIsAiTyping(true);
            try {
                const res = await interviewsApi.sendMessage(sessionId, { content: text });
                if (res.progress) setProgress(res.progress);
                if (res.aiReply) {
                    setChatMessages(prev => [...prev, {
                        id: res.aiReply!.id, role: 'ai', content: res.aiReply!.content,
                        timestamp: Date.now(), topic: res.aiReply!.topic,
                    }]);
                }
                if (res.isCompleted) {
                    setInterviewCompleted(true);
                    setTimeout(() => handleEndInterview('completed'), 2000);
                }
            } catch {
                setChatMessages(prev => prev.map(m =>
                    m.id === retryId ? { ...m, isFailed: true, failedPayload: { text } } : m
                ));
            } finally {
                setIsAiTyping(false);
            }
        }
    }, [chatMessages, sessionId, handleVoiceComplete, handleEndInterview]);

    // Press-to-talk touch handlers
    const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        // Intercept if mic permission not yet granted
        if (recorder.permissionState === 'denied') {
            setShowMicPrompt(true);
            return;
        }
        if (recorder.permissionState !== 'granted' && recorder.permissionState !== 'unknown') {
            setShowMicPrompt(true);
            return;
        }
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        touchStartY.current = y;
        setIsCancelling(false);
        // Haptic feedback
        if ('vibrate' in navigator) navigator.vibrate(10);
        recorder.startRecording();
    }, [recorder]);

    const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        if (isCancelling) {
            recorder.cancelRecording();
        } else {
            recorder.stopRecording();
        }
        setIsCancelling(false);
    }, [recorder, isCancelling]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (recorder.state !== 'recording') return;
        const currentY = e.touches[0].clientY;
        const delta = touchStartY.current - currentY;
        setIsCancelling(delta > CANCEL_THRESHOLD);
    }, [recorder.state]);

    const handleStartInterview = () => {
        track('view.h5_chat.entered', { session_id: sessionId });
        setState('CHATTING');
    };

    // --- RENDER FUNCTIONS ---

    const candidateName = landingData?.candidateName || '候选人';
    const recruiterTitle = landingData?.recruiterTitle || '招聘官';
    const companyAlias = landingData?.companyAlias || '';
    const positionTitle = landingData?.positionTitle || '';
    const estimatedMinutes = landingData?.estimatedMinutes || 15;

    const renderLanding = () => {
        if (landingLoading) {
            return (
                <div className="h-full flex items-center justify-center bg-white">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-slate-500">加载面试信息...</p>
                    </div>
                </div>
            );
        }
        if (landingError) {
            return (
                <div className="h-full flex items-center justify-center bg-white p-6">
                    <div className="text-center">
                        <p className="text-base text-rose-500 mb-4">{landingError}</p>
                        <button onClick={onExit} className="text-sm text-indigo-600 font-bold">返回</button>
                    </div>
                </div>
            );
        }
        return (
        <div className="h-full flex flex-col bg-white px-6 pt-8 pb-6 overflow-hidden">
            {/* Top Brand */}
            <div className="flex items-center gap-2 mb-5 opacity-80 shrink-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    <Sparkles size={16} />
                </div>
                <span className="text-sm font-medium text-slate-500">Ailin · AI 招聘助理</span>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
                {/* 1. WHO — 尊称 + 委托来源 */}
                <h1 className="text-[22px] font-extrabold text-slate-900 leading-[1.35] mb-4 tracking-tight shrink-0">
                    {candidateName}您好 👋
                </h1>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 shrink-0">
                    <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <User size={20} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[15px] font-bold text-slate-900 truncate">
                                {companyAlias ? `${companyAlias} · ` : ''}{recruiterTitle}
                            </p>
                        </div>
                    </div>
                    {/* 2. WHAT — 做什么 */}
                    <p className="text-[14px] text-slate-600 leading-relaxed">
                        委托 AI 助理 <span className="font-bold text-indigo-600">Ailin</span> 与您进行一次
                        {positionTitle
                            ? <>关于「<span className="font-bold text-slate-800">{positionTitle}</span>」岗位的简短沟通</>
                            : '简短的岗位沟通'
                        }，了解您的基本情况。
                    </p>
                </div>

                {/* 3. BENEFIT — 我有什么好处 */}
                <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100 mb-4 shrink-0 flex items-start gap-2.5">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-emerald-800 leading-relaxed">
                        完成沟通 → <span className="font-bold">结果直达面试官</span>，表现优秀者 24 小时内安排正式面试
                    </p>
                </div>

                {/* 4. COST — 成本很低 */}
                <div className="flex flex-wrap gap-2 shrink-0">
                    <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Coffee size={14} /> 仅 {estimatedMinutes} 分钟
                    </span>
                    <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Mic size={14} /> 语音/文字均可
                    </span>
                    <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <ShieldCheck size={14} /> 无需开摄像头
                    </span>
                </div>
            </div>

            {/* 5. CTA */}
            <div className="mt-5 space-y-3 shrink-0 pt-2">
                <button
                    onClick={handleStartInterview}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    开始对话 <ArrowRight size={18} />
                </button>
                <p className="text-center text-[10px] text-slate-400 leading-relaxed pt-1">
                    <Lock size={10} className="inline -mt-0.5 mr-0.5" />
                    本次沟通仅用于招聘评估，您的信息将严格保密
                </p>
            </div>
        </div>
        );
    };

    const renderChat = () => (
        <div className="h-full flex flex-col relative bg-slate-50">
            {/* Header */}
            <div className="shrink-0 px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Ailin · {positionTitle || 'AI 助理'}</h3>
                        <div className="flex items-center gap-2">
                            <Timer isRunning={state === 'CHATTING'} estimatedMinutes={estimatedMinutes} onTick={timerTickRef} />
                            {progress && (
                                <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {progress.currentQuestion}/{progress.totalQuestions}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowEndConfirm(true)}
                    className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors px-2 py-1"
                >
                    <PhoneOff size={12} /> 结束
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
                {chatMessages.map((msg) => {
                    // System message (e.g. "对话开始")
                    if (msg.role === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center">
                                <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{msg.content}</span>
                            </div>
                        );
                    }
                    return (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                        {msg.isVoice ? (
                            <div className="relative">
                                <VoiceBubble duration={msg.audioDuration || 0} isCandidate={msg.role === 'candidate'} />
                                {msg.isSending && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                                )}
                            </div>
                        ) : (
                            <div className={`max-w-[85%] px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                                msg.role === 'candidate'
                                    ? msg.isFailed
                                        ? 'bg-rose-100 text-rose-700 rounded-2xl rounded-br-sm border border-rose-200'
                                        : 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
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
                        )}
                        {msg.isFailed && (
                            <button
                                onClick={() => handleRetry(msg.id)}
                                className="flex items-center gap-1 mt-1 text-[11px] text-rose-500 font-medium"
                            >
                                <RefreshCw size={12} /> 重新发送
                            </button>
                        )}
                    </div>
                    );
                })}

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

            {/* Recording Overlay */}
            {recorder.state === 'recording' && (
                <div className="absolute inset-x-0 bottom-24 flex flex-col items-center pb-4 pointer-events-none z-20">
                    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${isCancelling ? 'bg-rose-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-mono font-bold text-slate-700">{formatTime(recorder.duration)}</span>
                        {recorder.duration >= 110 && (
                            <span className="text-[10px] text-rose-500 font-bold">即将到时</span>
                        )}
                    </div>
                    <p className={`text-xs mt-2 font-medium ${isCancelling ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isCancelling ? '松开取消' : '↑ 上滑取消发送'}
                    </p>
                </div>
            )}

            {/* End Confirmation Dialog */}
            {showEndConfirm && (
                <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] text-center shadow-xl">
                        <PhoneOff size={24} className="text-rose-500 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-900 mb-2">确认结束对话？</h3>
                        <p className="text-sm text-slate-500 mb-5">结束后将无法继续沟通</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                            >
                                继续
                            </button>
                            <button
                                onClick={() => { setShowEndConfirm(false); handleEndInterview('candidate_quit'); }}
                                className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
                            >
                                结束
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Microphone Permission Prompt */}
            {showMicPrompt && (
                <div className="absolute inset-0 bg-black/40 z-30 flex items-end justify-center pb-20">
                    <div className="bg-white rounded-2xl p-5 mx-4 w-full max-w-[320px] shadow-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <Mic size={24} className="text-indigo-600" />
                            <h3 className="text-base font-bold text-slate-900">
                                {recorder.permissionState === 'denied' ? '麦克风权限已关闭' : '需要麦克风权限'}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            {recorder.permissionState === 'denied'
                                ? '请在浏览器设置中允许麦克风访问，或切换到文字输入'
                                : '语音沟通需要使用麦克风，您也可以选择文字输入'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowMicPrompt(false); setInputMode('text'); }}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                            >
                                用文字
                            </button>
                            {recorder.permissionState !== 'denied' && (
                                <button
                                    onClick={() => { setShowMicPrompt(false); recorder.startRecording(); }}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
                                >
                                    允许麦克风
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="shrink-0 bg-white border-t border-slate-100 px-4 py-3 pb-6 space-y-2">
                {/* Toast messages */}
                {recorder.error && (
                    <div className="text-[11px] text-rose-500 text-center pb-1">{recorder.error}</div>
                )}
                {voiceTooShort && (
                    <div className="text-[11px] text-amber-600 text-center pb-1">录音太短，请长按说话</div>
                )}

                <div className="flex items-center gap-2">
                    {inputMode === 'voice' && recorder.isSupported && !interviewCompleted ? (
                        <>
                            {/* Switch to text */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setInputMode('text');
                                        if (showToggleHint) {
                                            setShowToggleHint(false);
                                            localStorage.setItem('ailin_toggle_hint_dismissed', '1');
                                        }
                                    }}
                                    className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    <MessageSquare size={20} />
                                </button>
                                {showToggleHint && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg z-10">
                                        点击切换文字
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                )}
                            </div>
                            {/* Press-to-talk */}
                            <button
                                onTouchStart={!isAiTyping ? handleTouchStart : undefined}
                                onTouchEnd={!isAiTyping ? handleTouchEnd : undefined}
                                onTouchMove={!isAiTyping ? handleTouchMove : undefined}
                                onMouseDown={!isAiTyping ? handleTouchStart : undefined}
                                onMouseUp={!isAiTyping ? handleTouchEnd : undefined}
                                className={`flex-1 py-3 rounded-xl text-[14px] font-bold select-none transition-all ${
                                    isAiTyping
                                        ? 'bg-slate-50 text-slate-400'
                                        : recorder.state === 'recording'
                                            ? isCancelling
                                                ? 'bg-rose-100 text-rose-600 scale-95'
                                                : 'bg-indigo-100 text-indigo-700 scale-95'
                                            : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                                }`}
                                style={{ touchAction: 'none' }}
                            >
                                {isAiTyping
                                    ? '对方正在回复...'
                                    : recorder.state === 'recording'
                                        ? isCancelling ? '松开取消' : '松开 发送'
                                        : recorder.state === 'requesting' ? '请求权限...' : '按住 说话'
                                }
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Switch to voice (if supported) */}
                            {recorder.isSupported && (
                                <button
                                    onClick={() => setInputMode('voice')}
                                    className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    <Mic size={20} />
                                </button>
                            )}
                            {/* Text input */}
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder={interviewCompleted ? '对话已结束' : '输入您的回复...'}
                                disabled={interviewCompleted}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:opacity-50 transition-all"
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || interviewCompleted}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                    chatInput.trim()
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-500'
                                        : 'bg-slate-100 text-slate-300'
                                }`}
                            >
                                <Send size={18} fill={chatInput.trim() ? 'currentColor' : 'none'} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    const renderInterrupted = () => (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-8">
                <PhoneOff className="text-amber-500" size={40} />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">对话已中断</h2>
            <p className="text-base text-slate-500 mb-10 max-w-[280px] mx-auto leading-relaxed">
                别担心，您的沟通进度<span className="font-bold text-slate-700">已自动保存</span>。
                <br />如果是误触或信号问题，请点击下方按钮恢复。
            </p>

            <div className="w-full space-y-3">
                <button
                    onClick={() => setState('CHATTING')}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <RefreshCw size={18} /> 恢复对话
                </button>

                <button
                    onClick={() => handleEndInterview('candidate_quit')}
                    className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
                >
                    确认结束沟通
                </button>
            </div>
        </div>
    );

    const renderEnded = () => {
        const topicCount = endSummary?.topicsCovered ?? chatMessages.filter(m => m.topic).length;
        const answeredCount = endSummary?.questionsAnswered ?? chatMessages.filter(m => m.role === 'candidate').length;
        const duration = endSummary?.totalDurationSeconds ?? timerValueRef.current;

        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                    <Sparkles className="text-indigo-600" size={40} />
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 mb-3">沟通已完成</h2>
                <p className="text-base text-slate-500 mb-6">感谢您的配合，沟通记录已生成</p>

                <div className="w-full bg-indigo-50/60 rounded-2xl p-5 mb-5 border border-indigo-100">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-2xl font-extrabold text-indigo-600">{formatTime(duration)}</div>
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

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center font-sans">
            <div
                className="w-full max-w-[375px] h-full sm:h-[800px] bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col transition-all"
                style={keyboardOffset > 0 ? { height: `calc(100% - ${keyboardOffset}px)` } : undefined}
            >
                {state === 'LANDING' && renderLanding()}
                {state === 'CHATTING' && renderChat()}
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
