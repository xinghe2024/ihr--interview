import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../../shared/types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { chat as chatApi, files as filesApi } from '../services/api';
import { Send, CheckCircle2, Copy, LayoutGrid, UserCircle2, Paperclip, Command, MoreHorizontal, ArrowLeft, Link2, ExternalLink, Trash2, Plus, ClipboardCheck, Search, LogOut, Settings, HelpCircle, X, RotateCcw } from 'lucide-react';

/** 富上下文结构：让 Ailin 知道用户当前在看什么 */
export interface BrowserContextInfo {
    mode: 'empty' | 'resume' | 'candidate_detail' | 'dashboard';
    candidateId?: string;
    candidateName?: string;
    candidateRole?: string;
}

interface EileenSidebarProps {
    currentView: ViewState;
    onNavigate: (view: ViewState, id?: string) => void;
    browserContext: BrowserContextInfo;
    onLogout?: () => void;
    onClose?: () => void;
    unreadCount?: number;
    extensionMode?: boolean; // Chrome 侧边栏模式：隐藏"Ailin"标题（Chrome 原生栏已显示）
}

type MessageType = 'text' | 'invitation-card' | 'result-card' | 'ksq-card';

interface Message {
    id: string;
    sender: 'user' | 'ai';
    type: MessageType;
    content: string;
    data?: any;
    timestamp: number;
}

import eileenAvatarImg from '../assets/hr.png';

const EileenSidebar: React.FC<EileenSidebarProps> = ({ currentView, onNavigate, browserContext, onLogout, onClose, unreadCount = 0, extensionMode = false }) => {
    const { user } = useAuth();
    const { addToast } = useNotification();
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
        };
        if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    // Initial Message Logic
    const [messages, setMessages] = useState<Message[]>([]);
    const prevCandidateRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Load chat history on mount
    useEffect(() => {
        chatApi.getHistory()
            .then(res => {
                const loaded: Message[] = res.messages.map(m => ({
                    id: m.id,
                    sender: m.role === 'user' ? 'user' as const : 'ai' as const,
                    type: 'text' as const,
                    content: m.content,
                    timestamp: new Date(m.createdAt).getTime(),
                }));
                if (loaded.length > 0) setMessages(loaded);
            })
            .catch(() => { }); // Silently fail — history is optional
    }, []);

    // P1-3: 页面切换时自动插入分割线
    useEffect(() => {
        const currentCandidate = browserContext.candidateId;
        if (currentCandidate && currentCandidate !== prevCandidateRef.current && messages.length > 0) {
            const dividerMsg: Message = {
                id: 'divider_' + Date.now(),
                sender: 'ai',
                type: 'text',
                content: `🔗 已切换至 ${browserContext.candidateName || '未知候选人'} 的上下文`,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, dividerMsg]);
        }
        prevCandidateRef.current = currentCandidate;
    }, [browserContext.candidateId]);

    // P0-1: 清空对话（两步确认，不用丑陋的 window.confirm）
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const handleClearChat = async () => {
        if (!showClearConfirm) {
            setShowClearConfirm(true);
            // 3 秒后自动取消确认态
            setTimeout(() => setShowClearConfirm(false), 3000);
            return;
        }
        setShowClearConfirm(false);
        try {
            await chatApi.clear();
            setMessages([]);
            addToast({ type: 'success', title: '对话已清空', message: '历史记录已清除' });
        } catch {
            addToast({ type: 'error', title: '清空失败', message: '请稍后重试' });
        }
    };

    // 简历文件上传
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // 重置 input 以支持再次选同一个文件
        e.target.value = '';
        try {
            addToast({ type: 'info', title: '上传中', message: `正在上传 ${file.name}...` });
            const res = await filesApi.upload(file);
            // 上传成功后通过聊天通知 AI
            handleSendMessage(`已上传简历文件：${file.name}，请帮我解析并生成初筛方案`);
        } catch (err: any) {
            addToast({ type: 'error', title: '上传失败', message: err.message || '请稍后重试' });
        }
    };

    // --- ACTIONS ---

    const handleSendMessage = async (textOverride?: string) => {
        const text = textOverride || inputValue.trim();
        if (!text) return;

        const userMsg: Message = { id: Date.now().toString(), sender: 'user', type: 'text', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // P1-4: 发送时注入当前候选人上下文
            const res = await chatApi.send(text, {
                currentUrl: window.location.href,
                pageTitle: document.title,
                candidateId: browserContext.candidateId,
                candidateName: browserContext.candidateName,
                candidateRole: browserContext.candidateRole,
            });
            setIsTyping(false);
            const aiMsg: Message = {
                id: res.aiReply.id,
                sender: 'ai',
                type: 'text',
                content: res.aiReply.content,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: 'err_' + Date.now(),
                sender: 'ai',
                type: 'text',
                content: `抱歉，出了点问题: ${err.message || '请稍后再试'}`,
                timestamp: Date.now(),
            }]);
        }
    };

    const triggerInvitationAfterKSQ = () => {
        // In MVP, just send a confirmation message via chat
        handleSendMessage('初筛方案已确认，请生成面试邀约');
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
        addToast({ type: 'success', title: '已复制到剪贴板', message: '邀约信息已复制，可直接粘贴发送给候选人' });
    };

    // --- COMPONENTS ---

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

    const KSQCard = ({ msg }: { msg: Message }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [confirmed, setConfirmed] = useState(false);
        const [items, setItems] = useState<Array<{ id: string; topic: string; rubric: string }>>(msg.data.ksqItems);

        const handleConfirm = () => {
            setConfirmed(true);
            setIsEditing(false);
            setTimeout(() => triggerInvitationAfterKSQ(), 800);
        };

        const handleDelete = (id: string) => {
            setItems(prev => prev.filter(i => i.id !== id));
        };

        const handleAdd = () => {
            if (items.length >= 3) return;
            setItems(prev => [...prev, { id: 'ksq_new_' + Date.now(), topic: '', rubric: '' }]);
        };

        const handleChange = (id: string, field: 'topic' | 'rubric', value: string) => {
            setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
        };

        if (confirmed) {
            return (
                <div className="mt-2 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
                    <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1" />
                    <p className="text-[13px] font-bold text-emerald-700">初筛方案已确认</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">正在生成邀约...</p>
                </div>
            );
        }

        return (
            <div className="mt-2 bg-white/90 border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-3 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <ClipboardCheck size={14} className="text-indigo-600" />
                        <span className="text-[13px] font-bold text-slate-800">初筛方案</span>
                    </div>
                    <p className="text-[12px] text-slate-500">{msg.data.candidateName} · {msg.data.candidateRole} · {msg.data.candidateExp}</p>
                </div>

                {/* KSQ Focus Questions */}
                <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Search size={12} className="text-indigo-500" />
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">重点考察{isEditing ? '（可修改）' : ''}</span>
                    </div>
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex items-start gap-2">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold mt-0.5">{idx + 1}</span>
                                {isEditing ? (
                                    <div className="flex-1 space-y-1">
                                        <input value={item.topic} onChange={e => handleChange(item.id, 'topic', e.target.value)}
                                            className="w-full text-[13px] font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-300"
                                            placeholder="考察方向" />
                                        <input value={item.rubric} onChange={e => handleChange(item.id, 'rubric', e.target.value)}
                                            className="w-full text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-indigo-300"
                                            placeholder="验证标准" />
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800 leading-snug">{item.topic}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">验证标准：{item.rubric}</p>
                                    </div>
                                )}
                                {isEditing && (
                                    <button onClick={() => handleDelete(item.id)}
                                        className="shrink-0 p-1 text-slate-300 hover:text-rose-500 transition-colors mt-0.5">
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {isEditing && items.length < 3 && (
                            <button onClick={handleAdd}
                                className="flex items-center gap-1.5 text-[12px] text-indigo-500 hover:text-indigo-700 font-medium pl-7 transition-colors">
                                <Plus size={13} /> 新增一道题
                            </button>
                        )}
                    </div>
                </div>

                {/* Baseline Coverage */}
                {!isEditing && (
                    <div className="mx-3 mb-2 px-2.5 py-2 bg-slate-50/80 border border-slate-100 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">基础覆盖（自动完成）</p>
                        <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                            {msg.data.baselineItems.map((b: any, i: number) => (
                                <span key={i} className="text-[11px] text-slate-500">
                                    ✓ {b.label}{i < msg.data.baselineItems.length - 1 ? ' ·' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="px-3 pb-3 pt-1 flex gap-2">
                    {isEditing ? (
                        <button onClick={handleConfirm}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold rounded-lg transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={14} /> 确认并开始面试
                        </button>
                    ) : (
                        <>
                            <button onClick={handleConfirm}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold rounded-lg transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-1.5">
                                {extensionMode ? '确认方案' : <><CheckCircle2 size={14} /> 确认方案，生成邀约</>}
                            </button>
                            <button onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 text-[13px] font-bold rounded-lg transition-all">
                                {extensionMode ? '修改' : '✏️ 修改方案'}
                            </button>
                        </>
                    )}
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
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-100 p-0.5 bg-white">
                            <img src={eileenAvatarImg} className="w-full h-full object-cover rounded-full" alt="Ailin Avatar" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex flex-col">
                        {!extensionMode && <h1 className="font-bold text-slate-900 text-[16px] leading-tight">Ailin</h1>}
                        {!extensionMode && <span className="text-xs text-slate-400 mt-0.5">你的 AI 招聘助理</span>}
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => onNavigate(ViewState.DASHBOARD)}
                            className="p-2.5 bg-white hover:bg-slate-50 text-indigo-700 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md"
                            title="查看工作进度"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {/* 🧹 P0-1: 清空对话按钮 — 两步确认 */}
                    <button
                        onClick={handleClearChat}
                        className={`p-2.5 rounded-lg border shadow-sm transition-all hover:shadow-md flex items-center gap-1 ${showClearConfirm
                            ? 'bg-rose-50 border-rose-300 text-rose-500'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-rose-500'
                            }`}
                        title={showClearConfirm ? '再次点击确认清空' : '清空对话记录'}
                    >
                        <RotateCcw size={16} className={showClearConfirm ? 'animate-spin' : ''} />
                        {showClearConfirm && <span className="text-[11px] font-bold pr-0.5">确认?</span>}
                    </button>
                    {/* ⋯ Three-dot menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2.5 rounded-lg border border-slate-200 shadow-sm transition-all ${isMenuOpen ? 'bg-white text-indigo-700' : 'bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                                }`}
                            title="设置"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {user?.avatar ? (
                                                <img src={user.avatar} className="w-full h-full object-cover" alt={user?.name} />
                                            ) : (
                                                user?.name?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-800 truncate">{user?.name || '未登录'}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{user?.phone}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Menu Items */}
                                <div className="py-1">
                                    <button onClick={() => { setIsMenuOpen(false); onNavigate(ViewState.DASHBOARD); }}
                                        className="w-full px-4 py-2.5 text-left text-[12px] text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                                        <ExternalLink size={14} className="text-slate-400" /> 在新标签页打开工作台
                                    </button>
                                    <button onClick={() => setIsMenuOpen(false)}
                                        className="w-full px-4 py-2.5 text-left text-[12px] text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                                        <Settings size={14} className="text-slate-400" /> 设置
                                    </button>
                                    <button onClick={() => setIsMenuOpen(false)}
                                        className="w-full px-4 py-2.5 text-left text-[12px] text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors">
                                        <HelpCircle size={14} className="text-slate-400" /> 使用帮助
                                    </button>
                                </div>
                                {/* Logout */}
                                <div className="border-t border-slate-100 py-1">
                                    <button onClick={() => { setIsMenuOpen(false); onLogout?.(); }}
                                        className="w-full px-4 py-2.5 text-left text-[12px] text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition-colors">
                                        <LogOut size={14} /> 退出登录
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Close sidebar */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 shadow-sm transition-all"
                            title="关闭侧边栏"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2.5. (removed — merged into footer smart bar) */}

            {/* 3. MESSAGE LIST */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth z-10 space-y-5 no-scrollbar min-h-0 bg-transparent">
                {messages.length === 0 && (
                    <div className="flex w-full justify-start animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <div className="max-w-[92%] flex flex-col items-start">
                            <div className="px-4 py-3 text-[14px] leading-relaxed shadow-sm backdrop-blur-md relative border bg-white/80 text-slate-800 rounded-[18px] rounded-bl-none border-white/50">
                                <p className="text-[13px] text-slate-600 font-medium mb-3">
                                    {extensionMode
                                        ? '初面全流程，交给我全权负责：'
                                        : '不要让我只做一个聊天机器人，请把我当做您的专业下属。我可以全权负责：'}
                                </p>
                                <div className={extensionMode ? 'space-y-2' : 'space-y-3'}>
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 mt-0.5">1</div>
                                        <div>
                                            <span className="text-[13px] font-bold text-slate-800 block leading-tight">15 分钟全自动初面</span>
                                            <span className="text-xs text-slate-500">
                                                {extensionMode ? 'AI 全程主持，多轮语音面谈' : '一键发起，AI 代你主持多轮语音面谈'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 mt-0.5">2</div>
                                        <div>
                                            <span className="text-[13px] font-bold text-slate-800 block leading-tight">结构化报告，拒绝模棱两可</span>
                                            <span className="text-xs text-slate-500">
                                                {extensionMode ? '量化评分报告，带红笔批注' : '每位候选人生成带红笔批注的胜任力量化评分'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-[13px] text-slate-500 leading-relaxed">
                                    您可以<strong className="text-indigo-600 font-bold">上传简历</strong>，或打开网页版简历让我自动识别，开始第一次初面 👇
                                </p>
                            </div>
                            <span className="text-xs text-slate-500/80 mt-1 px-1 font-medium">Ailin • 刚刚</span>
                        </div>
                    </div>
                )}
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
                                    {msg.type === 'ksq-card' && <KSQCard msg={msg} />}
                                    {msg.type === 'invitation-card' && <InvitationCard msg={msg} />}
                                    {msg.type === 'result-card' && <ResultCard msg={msg} />}
                                </div>
                                <span className="text-xs text-slate-500/80 mt-1 px-1 font-medium">
                                    {isUser ? 'You' : 'Ailin'} •{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            {/* 隐藏的文件选择器 */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* 4. SMART ACTION BAR — unified input + upload + contextual resume */}
            <div className="shrink-0 z-20 bg-white/60 backdrop-blur-2xl border-t border-white/40 px-3 pt-2 pb-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {browserContext.mode === 'resume' ? (
                    /* ===== Resume Page Mode: 「候选人 · 交给 Ailin 来初面」+ 📎 ===== */
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
                            <span className="text-[13px] font-bold text-slate-900 truncate">{browserContext.candidateName || '候选人'}</span>
                        </div>
                        <button
                            onClick={() => handleSendMessage(`请帮我分析${browserContext.candidateName ? ' ' + browserContext.candidateName + ' 的' : '这份'}简历并生成初筛方案`)}
                            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-bold rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:scale-[1.02] whitespace-nowrap"
                        >
                            {extensionMode ? '立即初面' : <><ExternalLink size={13} /> 交给 Ailin 来初面</>}
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/80 hover:bg-slate-50 border border-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                            title="上传本地简历"
                        >
                            <Paperclip size={16} />
                        </button>
                    </div>
                ) : (
                    /* ===== Default Mode: context chip + 📎 + input ===== */
                    <div className="bg-gradient-to-r from-indigo-50/50 to-rose-50/50 border border-white/60 rounded-2xl shadow-inner transition-all focus-within:ring-2 focus-within:ring-rose-200/50 focus-within:border-rose-200 group">
                        {/* P1-2: 内嵌状态胶囊 — 像 ChatGPT 附件一样嵌在输入框内 */}
                        {(browserContext.candidateId || browserContext.mode === 'dashboard' || browserContext.mode === 'empty') && (
                            <div className="px-2.5 pt-2 pb-0.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${browserContext.candidateId
                                    ? 'bg-indigo-100 text-indigo-600 border border-indigo-200/60'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${browserContext.candidateId ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                    {browserContext.candidateId
                                        ? `${browserContext.candidateName || '候选人'}${browserContext.candidateRole ? ' · ' + browserContext.candidateRole : ''}`
                                        : '📋 全局工作台'
                                    }
                                </span>
                            </div>
                        )}
                        <div className="p-1.5 pl-2 flex items-center gap-1.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="上传本地简历"
                            >
                                <Paperclip size={17} />
                            </button>
                            <input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={extensionMode ? '上传简历，或浏览网页版简历…' : '有问题，尽管问'}
                                className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder:text-slate-400 font-medium h-9 w-full"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputValue.trim()}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 
                            ${inputValue.trim()
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200 hover:shadow-lg'
                                        : 'bg-white/50 text-slate-300'}`}
                            >
                                <Send size={18} fill={inputValue.trim() ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EileenSidebar;