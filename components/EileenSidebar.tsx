import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { Send, Sparkles, CheckCircle2, Copy, LayoutGrid, UserCircle2, Paperclip, Command, MoreHorizontal, ArrowLeft, Link2, ExternalLink } from 'lucide-react';

interface EileenSidebarProps {
    currentView: ViewState;
    onNavigate: (view: ViewState, id?: string) => void;
    browserContext: 'empty' | 'resume';
}

type MessageType = 'text' | 'invitation-card' | 'result-card';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    type: MessageType;
    content: string;
    data?: any;
    timestamp: number;
}

const EILEEN_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80";

const EileenSidebar: React.FC<EileenSidebarProps> = ({ currentView, onNavigate, browserContext }) => {
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Message Logic
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // --- ACTIONS ---

    const handleSendMessage = (textOverride?: string) => {
        const text = textOverride || inputValue.trim();
        if (!text) return;

        const userMsg: Message = { id: Date.now().toString(), sender: 'user', type: 'text', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulation Logic
        setTimeout(() => {
            setIsTyping(false);
            if (text.includes('分析') || text.includes('简历') || text.includes('张三')) {
                triggerAnalysisFlow();
            } else if (text.includes('上传')) {
                setMessages(prev => [...prev, { id: 'upload_' + Date.now(), sender: 'ai', type: 'text', content: '好的，请将文件拖入此处，或者点击上传窗口。我支持 PDF, Word 或图片格式的简历解析。', timestamp: Date.now() }]);
            } else if (text.includes('进度') || text.includes('工作台')) {
                setMessages(prev => [...prev, { id: 'nav_' + Date.now(), sender: 'ai', type: 'text', content: '好的，正在为您打开工作台，您可以查看所有候选人的实时状态。', timestamp: Date.now() }]);
                setTimeout(() => onNavigate(ViewState.DASHBOARD), 1000);
            } else {
                setMessages(prev => [...prev, { id: 'reply_' + Date.now(), sender: 'ai', type: 'text', content: '收到，正在处理您的指令。', timestamp: Date.now() }]);
            }
        }, 1000);
    };

    const triggerAnalysisFlow = () => {
        const newCandidateId = 'zhangsan';
        const inviteLink = 'https://ihr.ai/i/' + newCandidateId + '_' + Date.now().toString(36);
        const invitationMsg: Message = {
            id: 'invitation_' + Date.now(), sender: 'ai', type: 'invitation-card',
            content: '简历解析完成。已为该候选人生成 AI 初筛邀约，您可以复制邀约信息发送给候选人 👇',
            data: {
                id: newCandidateId,
                name: '张三',
                role: '高级前端工程师',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
                inviteLink,
                inviteText: `Hi 张三，邀请您进行岗位初步沟通。我是智能招聘助理艾琳，受招聘方委托，想与您进行一次简短的初步沟通（约15分钟），了解您的基本情况和职业意向。\n\n👉 点击开始：${inviteLink}`
            },
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, invitationMsg]);
    };

    const handleCopyInvitation = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    };

    // --- COMPONENTS ---
    const IntroCard = () => (
        <div className="mb-6 mx-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gradient-to-br from-white/90 via-indigo-50/80 to-white/90 border border-white/60 rounded-2xl p-5 shadow-colorful backdrop-blur-md relative overflow-hidden group hover:shadow-lg transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-200/20 to-indigo-200/20 blur-2xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <Sparkles size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-[17px]">我是您的 AI 招聘助理 - 艾琳</h3>
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed mb-5 relative z-10 font-medium">
                    不要让我只做一个聊天机器人，请把我当做您的专业下属。我可以全权负责：
                </p>
                <div className="space-y-3.5 relative z-10">
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm shrink-0 mt-0.5">1</div>
                        <div>
                            <span className="text-[14px] font-bold text-indigo-900 block leading-tight">深度阅卷</span>
                            <span className="text-xs text-slate-500">解析简历疑点，生成面试策略</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm shrink-0 mt-0.5">2</div>
                        <div>
                            <span className="text-[14px] font-bold text-indigo-900 block leading-tight">AI 初筛面试</span>
                            <span className="text-xs text-slate-500">生成邀约链接，候选人自助完成初筛</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm shrink-0 mt-0.5">3</div>
                        <div>
                            <span className="text-[14px] font-bold text-indigo-900 block leading-tight">生成评估报告</span>
                            <span className="text-xs text-slate-500">红笔批注简历，提供录音转写</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const InvitationCard = ({ msg }: { msg: Message }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = async () => {
            await handleCopyInvitation(msg.data.inviteText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        return (
            <div className="mt-2 bg-white/90 border border-white/50 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="p-3">
                    {/* Candidate Info - compact single line */}
                    <div className="flex items-center gap-2 mb-2.5">
                        <img src={msg.data.avatar} className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" alt={msg.data.name} />
                        <span className="font-bold text-slate-900 text-[14px]">{msg.data.name}</span>
                        <span className="text-[12px] text-slate-400">{msg.data.role}</span>
                        <span className="ml-auto px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100">待发送</span>
                    </div>
                    {/* Invitation Text Preview - no title */}
                    <div className="bg-slate-50/80 border border-slate-100 rounded-lg p-2.5 text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap mb-2.5">
                        {msg.data.inviteText}
                    </div>
                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className={`w-full py-2 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${copied
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-200'
                            }`}
                    >
                        {copied ? <><CheckCircle2 size={16} /> 已复制到剪贴板</> : <><Copy size={16} /> 复制邀约信息</>}
                    </button>
                </div>
            </div>
        );
    };

    const ResultCard = ({ msg }: { msg: Message }) => (
        <div onClick={() => onNavigate(ViewState.REPORT, msg.data.id)}
            className="mt-3 bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/50 rounded-xl p-5 shadow-sm cursor-pointer group hover:shadow-md transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <CheckCircle2 size={80} className="text-emerald-500" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded shadow-sm">初筛通过</span>
                    <span className="text-xs text-slate-400 font-mono">14:20 PM</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 text-[16px]">{msg.data.name} - 初筛报告</h3>
                <p className="text-[14px] text-slate-500 mb-2 line-clamp-2">已核实：技术栈深度、离职原因、薪资期望。</p>
            </div>
        </div>
    );

    return (
        // 1. MAIN CONTAINER - Updated background to be more subtle and glass-like
        <div className="h-full flex flex-col relative bg-gradient-to-b from-white/20 via-white/10 to-transparent">

            {/* Background Ambience */}
            <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[30%] bg-indigo-200/20 blur-[60px] rounded-full pointer-events-none mix-blend-multiply animate-pulse"></div>

            {/* 2. HEADER - Glass style with better transparency */}
            <div className="shrink-0 h-16 px-5 z-20 flex justify-between items-center relative border-b border-white/30 bg-white/40 backdrop-blur-xl shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="relative group cursor-pointer">
                        {/* Glowing Avatar */}
                        <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-rose-300 via-indigo-400 to-cyan-300 shadow-glow hover:scale-105 transition-transform">
                            <img src={EILEEN_AVATAR} className="w-full h-full rounded-full object-cover border-2 border-white/80" alt="Eileen Avatar" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-md animate-pulse"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-slate-900 text-[16px] leading-tight">艾琳 Ailin</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex gap-0.5">
                                <span className="w-0.5 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                                <span className="w-0.5 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                                <span className="w-0.5 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            </span>
                            <span className="text-xs font-bold text-indigo-600">AI Online</span>
                        </div>
                    </div>
                </div>

                {/* Header Action */}
                <button
                    onClick={() => onNavigate(ViewState.DASHBOARD)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white/80 text-indigo-700 rounded-lg border border-white/60 shadow-sm transition-all hover:shadow-md group backdrop-blur-sm"
                    title="查看工作进度"
                >
                    <LayoutGrid size={18} />
                    <span className="text-[13px] font-bold hidden sm:inline">查看工作进度</span>
                </button>
            </div>

            {/* 2.5. (removed — merged into footer smart bar) */}

            {/* 3. MESSAGE LIST */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth z-10 space-y-5 no-scrollbar min-h-0 bg-transparent">
                {messages.length === 0 && <IntroCard />}
                {messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <div key={msg.id} className={`flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm backdrop-blur-md relative border
                             ${isUser
                                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-[18px] rounded-br-none shadow-glow border-indigo-400'
                                        : 'bg-white/80 text-slate-800 rounded-[18px] rounded-bl-none border-white/50 shadow-sm'
                                    }`}>
                                    {msg.content}
                                    {msg.type === 'invitation-card' && <InvitationCard msg={msg} />}
                                    {msg.type === 'result-card' && <ResultCard msg={msg} />}
                                </div>
                                <span className="text-xs text-slate-500/80 mt-1 px-1 font-medium">
                                    {isUser ? 'You' : 'Eileen'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/60 px-4 py-3 rounded-[18px] rounded-bl-none flex items-center gap-1.5 border border-white/40 shadow-sm backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 4. SMART ACTION BAR — unified input + upload + contextual resume */}
            <div className="shrink-0 z-20 bg-white/60 backdrop-blur-2xl border-t border-white/40 px-3 pt-2 pb-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {browserContext === 'resume' ? (
                    /* ===== Resume Page Mode: 「张三 · 交给艾琳来初面」+ 📎 ===== */
                    <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-100/90 via-indigo-50/80 to-white/90 border-2 border-indigo-200 rounded-2xl px-3 py-2.5 animate-in slide-in-from-bottom-3 duration-500 ring-4 ring-indigo-100/40 relative overflow-hidden">
                        {/* Active pulse indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-indigo-500 rounded-l-2xl" />
                        {/* Pulsing green dot */}
                        <div className="relative shrink-0 ml-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        </div>
                        <div className="flex flex-col shrink-0">
                            <span className="text-[10px] text-indigo-500 font-bold leading-none mb-0.5">简历已识别</span>
                            <span className="text-[13px] font-bold text-slate-900 truncate">张三</span>
                        </div>
                        <button
                            onClick={() => triggerAnalysisFlow()}
                            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:scale-[1.02] whitespace-nowrap"
                        >
                            <ExternalLink size={13} /> 交给艾琳来初面
                        </button>
                        <button
                            onClick={() => handleSendMessage('上传简历')}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/80 hover:bg-slate-50 border border-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                            title="上传本地简历"
                        >
                            <Paperclip size={16} />
                        </button>
                    </div>
                ) : (
                    /* ===== Default Mode: 📎 + input placeholder ===== */
                    <div className="bg-gradient-to-r from-indigo-50/50 to-rose-50/50 border border-white/60 p-1.5 pl-2 rounded-2xl shadow-inner flex items-center gap-1.5 transition-all focus-within:ring-2 focus-within:ring-rose-200/50 focus-within:border-rose-200 group">
                        <button
                            onClick={() => handleSendMessage('上传简历')}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                            title="上传本地简历"
                        >
                            <Paperclip size={17} />
                        </button>
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="上传简历，交给艾琳来初面..."
                            className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder:text-slate-400 font-medium h-9 w-full"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim()}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 
                        ${inputValue.trim()
                                    ? 'bg-gradient-to-r from-indigo-600 to-rose-500 text-white shadow-glow-warm hover:scale-105 hover:shadow-lg'
                                    : 'bg-white/50 text-slate-300'}`}
                        >
                            <Send size={18} fill={inputValue.trim() ? "currentColor" : "none"} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EileenSidebar;