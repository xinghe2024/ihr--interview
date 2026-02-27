import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../../shared/types';
import {
    Shield, Zap, CheckCircle2, Phone,
    ArrowRight, Loader2, Trash2, Layout, Headphones, ClipboardList, Target
} from 'lucide-react';

// Chrome logo SVG 组件（避免使用 lucide 已弃用的 Chrome icon）
const ChromeIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <line x1="21.17" y1="8" x2="15.87" y2="8" stroke="currentColor" strokeWidth="2" />
        <line x1="3.95" y1="6.06" x2="8.54" y2="14.13" stroke="currentColor" strokeWidth="2" />
        <line x1="8.54" y1="15.87" x2="13.46" y2="15.87" stroke="currentColor" strokeWidth="2" />
    </svg>
);
import heroDashboardImg from '../assets/hero-dashboard-preview.png';
import feature1Img from '../assets/feature1-sidebar.png';
import feature2Img from '../assets/feature2-interview.png';
import feature3Img from '../assets/feature3-report.png';
import eileenAvatarImg from '../assets/hr.png';
import logoImg from '../assets/logo.png';
const EILEEN_AVATAR = eileenAvatarImg;
const CHROME_STORE_URL = 'https://chromewebstore.google.com/'; // TODO: 替换为真实的扩展商店链接

// 自定义动效组件：AI 语音面试
const AnimatedVoiceInterview = () => {
    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative flex flex-col items-center justify-center p-6 rounded-2xl group cursor-default">
            {/* 炫光背景效果 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px]" />

            {/* AI 头像与波纹 */}
            <div className="relative mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-400/30 relative z-10">
                    <img src={EILEEN_AVATAR} alt="AI 面试官" className="w-full h-full object-cover" />
                </div>
                {/* 呼吸光环 */}
                <div className="absolute inset-0 rounded-full border border-indigo-500/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />

                {/* 麦克风图标 */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-20 shadow-lg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-indigo-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                </div>
            </div>

            {/* 状态文字 */}
            <p className="text-indigo-200/80 text-[13px] font-medium mb-12 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                艾琳面试助理正在提问
            </p>

            {/* CSS 声电动效 */}
            <div className="flex items-center gap-1.5 h-16 w-full max-w-[200px] justify-center">
                {[
                    { h: '20%', d: '0s' }, { h: '40%', d: '-0.2s' }, { h: '70%', d: '-0.4s' },
                    { h: '100%', d: '-0.1s' }, { h: '60%', d: '-0.3s' }, { h: '30%', d: '-0.5s' },
                    { h: '80%', d: '-0.2s' }, { h: '100%', d: '-0.6s' }, { h: '50%', d: '-0.1s' },
                    { h: '20%', d: '-0.4s' }
                ].map((bar, i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-violet-500 to-indigo-400 rounded-full opacity-80"
                        style={{
                            height: '10%',
                            animation: `soundwave 0.8s ease-in-out infinite alternate`,
                            animationDelay: bar.d,
                            '--max-h': bar.h
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* 提问字幕 */}
            <div className="mt-12 text-center max-w-[85%] mx-auto">
                <p className="text-white font-medium text-[16px] leading-relaxed tracking-wide">
                    "请谈谈您在微服务架构设计中，是如何解决分布式事务一致性问题的？"
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes soundwave {
                    0% { height: 10%; opacity: 0.4; }
                    100% { height: var(--max-h); opacity: 1; }
                }
            `}} />
        </div>
    );
};

// 自定义动效组件：首屏大图 (Dashboard + AI 悬浮窗)
const AnimatedHeroDashboard = () => {
    return (
        <div className="w-full bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden relative flex flex-col cursor-default">
            {/* 顶栏 */}
            <div className="h-10 sm:h-12 border-b border-slate-200 bg-white flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-rose-400" />
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-amber-400" />
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="hidden sm:flex flex-1 max-w-md mx-4 h-6 bg-slate-100 rounded-md items-center px-3">
                    <div className="w-4 h-4 rounded-full bg-slate-200" />
                </div>
                <div className="w-16 sm:w-20 h-6 bg-slate-100 rounded-md" />
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* 侧边栏 */}
                <div className="w-48 border-r border-slate-200 bg-white/50 hidden md:flex flex-col p-4 gap-3">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded bg-indigo-600" />
                        <div className="h-4 w-20 bg-slate-800 rounded" />
                    </div>
                    <div className="h-8 rounded-lg bg-indigo-50 border border-indigo-100 w-full" />
                    <div className="h-8 rounded-lg bg-slate-100 w-3/4" />
                    <div className="h-8 rounded-lg bg-slate-100 w-5/6" />
                    <div className="h-8 rounded-lg bg-slate-100 w-2/3" />
                </div>

                {/* 主内容区（左右分栏结构） */}
                <div className="flex-1 p-4 sm:p-6 sm:px-8 flex flex-col gap-4 sm:gap-6 bg-slate-50">

                    {/* 顶部统计卡片 (增加信息量) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 shrink-0">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                            <span className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>今日扫描简历</span>
                            <span className="text-xl font-extrabold text-slate-800">128<span className="text-[12px] font-normal text-slate-400 ml-1">份</span></span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">
                            <span className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>AI 已触达</span>
                            <span className="text-xl font-extrabold text-slate-800">45<span className="text-[12px] font-normal text-slate-400 ml-1">人</span></span>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center relative overflow-hidden hidden sm:flex">
                            <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl translate-x-1/2 -translate-y-1/2"></div>
                            <span className="text-[11px] text-indigo-600 font-medium mb-1 flex items-center gap-1.5 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>正在面试</span>
                            <span className="text-xl font-extrabold text-indigo-700">3<span className="text-[12px] font-normal text-indigo-400 ml-1">人</span></span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center hidden md:flex">
                            <span className="text-[11px] text-slate-500 font-medium mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>高分推荐返回</span>
                            <span className="text-xl font-extrabold text-slate-800">12<span className="text-[12px] font-normal text-slate-400 ml-1">份报告</span></span>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* 左侧：候选人列表 (占据 2/3 宽度) */}
                        <div className="lg:col-span-2 flex flex-col gap-3">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[14px] font-bold text-slate-800">最新 AI 初筛进展</span>
                                <div className="h-7 px-3 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[11px] font-bold cursor-pointer hover:bg-indigo-700 transition-colors">+ 添加候选人</div>
                            </div>

                            {/* 真实数据的列表项 */}
                            <div className="flex flex-col gap-3">
                                {[
                                    { name: '李梅', role: '大客户销售经理', exp: '5年', status: '待沟通', bg: 'bg-slate-100', text: 'text-slate-600', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80' },
                                    { name: '陈思远', role: '资深法务顾问', exp: '8年', status: '正在面试', bg: 'bg-indigo-100 ring-1 ring-indigo-500/50', text: 'text-indigo-700 font-bold', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80', active: true },
                                    { name: '王磊', role: 'HRBP (研发BP)', exp: '10年', status: '评估完成 (8.5分)', bg: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700 font-medium', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80' },
                                    { name: '张伟', role: '大区运营总监', exp: '12年', status: '已淘汰', bg: 'bg-slate-50 opacity-60', text: 'text-slate-400', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80' },
                                ].map((candidate, i) => (
                                    <div key={i} className={`h-14 sm:h-[60px] bg-white border rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex items-center px-3 sm:px-4 gap-3 sm:gap-4 shrink-0 transition-all ${candidate.active ? 'border-indigo-400 shadow-indigo-500/10 bg-indigo-50/30' : 'border-slate-100'}`}>
                                        <img src={candidate.avatar} className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover shrink-0 border border-slate-200" alt={candidate.name} />

                                        {/* 信息区：宽度固定以保证对齐 */}
                                        <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-3 gap-2 items-center">
                                            {/* 姓名与年限 */}
                                            <div className="flex flex-col col-span-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold truncate ${i === 3 ? 'text-slate-500' : 'text-slate-800'}`}>{candidate.name}</span>
                                                    <span className="text-[11px] text-slate-400 hidden sm:inline-block bg-slate-50 px-1.5 rounded">{candidate.exp}</span>
                                                </div>
                                            </div>

                                            {/* 岗位：确保无论多长都左对齐并截断 */}
                                            <div className="col-span-1 border-l border-slate-100 pl-3">
                                                <div className={`text-[12px] truncate font-medium ${i === 3 ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {candidate.role}
                                                </div>
                                            </div>

                                            {/* 状态标签（大屏） */}
                                            <div className="hidden lg:flex justify-end pr-2">
                                                <div className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ${candidate.bg} ${candidate.text}`}>
                                                    {candidate.status}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 小屏状态标签 */}
                                        <div className={`lg:hidden px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-[11px] whitespace-nowrap shrink-0 ${candidate.bg} ${candidate.text}`}>
                                            {candidate.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 右侧：AI 面试实时状态窗 (占据 1/3 宽度)，移除绝对定位 */}
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="w-full bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-500/20 border border-indigo-500/40 p-5 relative overflow-hidden group">
                                {/* 光环背景效果 */}
                                <div className="absolute -inset-[1px] bg-gradient-to-br from-indigo-500/30 to-emerald-500/30 rounded-2xl pointer-events-none" />
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
                                                    <span className="text-emerald-400 text-[12px] font-bold tracking-wider">AI 语音面试中</span>
                                                </div>
                                                <h4 className="text-white font-bold text-[16px]">正在面试：陈思远</h4>
                                            </div>
                                            <div className="w-12 h-12 rounded-full border-2 border-indigo-400/50 overflow-hidden shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                                <img src={EILEEN_AVATAR} className="w-full h-full object-cover" alt="AI" />
                                            </div>
                                        </div>

                                        {/* 声波 */}
                                        <div className="h-12 w-full flex items-center gap-[3px] justify-center mb-6">
                                            {[
                                                { h: '30%', d: '0s' }, { h: '50%', d: '-0.2s' }, { h: '90%', d: '-0.4s' },
                                                { h: '100%', d: '-0.1s' }, { h: '70%', d: '-0.3s' }, { h: '40%', d: '-0.5s' },
                                                { h: '85%', d: '-0.2s' }, { h: '60%', d: '-0.6s' }, { h: '30%', d: '-0.1s' },
                                            ].map((bar, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1.5 bg-indigo-400 rounded-full"
                                                    style={{
                                                        height: '20%',
                                                        animation: `soundwave 0.8s ease-in-out infinite alternate`,
                                                        animationDelay: bar.d,
                                                        '--max-h': bar.h
                                                    } as React.CSSProperties}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* 实时字幕摘要 */}
                                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 shadow-inner block mt-auto">
                                        <p className="text-indigo-50/90 text-[13px] leading-relaxed font-medium">
                                            <span className="text-indigo-400 font-bold mr-1">陈思远：</span>"在我主导的微服务改造项目中，使用 Spring Boot 解决了高并发下的系统扩展性问题..."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface WelcomeViewProps {
    onNavigate: (view: ViewState) => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigate }) => {
    const { login, sendVerificationCode, isAuthenticated } = useAuth();

    const [step, setStep] = useState<'intro' | 'login' | 'success'>('intro');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [loginAnimating, setLoginAnimating] = useState(false);
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

    // 检测是否在 Chrome 扩展环境中运行
    useEffect(() => {
        try {
            const w = window as any;
            if (w.chrome?.runtime?.id) {
                setIsExtensionInstalled(true);
            }
        } catch {
            // 非扩展环境
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            setStep('success');
            setLoginSuccess(true);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (countdown <= 0) return;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            setError('请输入正确的手机号');
            return;
        }
        setError('');
        setLoading(true);
        const ok = await sendVerificationCode(phone);
        setLoading(false);
        if (ok) {
            setCodeSent(true);
            setCountdown(60);
        } else {
            setError('发送失败，请稍后重试');
        }
    };

    const handleLogin = async () => {
        if (!code || code.length < 4) {
            setError('请输入4位验证码');
            return;
        }
        setError('');
        setLoading(true);
        const ok = await login(phone, code);
        setLoading(false);
        if (ok) {
            setLoginAnimating(true);
            setTimeout(() => {
                setLoginSuccess(true);
                setStep('success');
            }, 600);
        } else {
            setError('验证码错误，请输入 1234');
        }
    };

    const handleGoToDashboard = () => {
        onNavigate(ViewState.DASHBOARD);
    };

    const handleDemoMode = () => {
        onNavigate(ViewState.DASHBOARD);
    };

    const handlePrimaryCTA = () => {
        if (isExtensionInstalled) {
            setStep('login');
        } else {
            window.open(CHROME_STORE_URL, '_blank');
        }
    };

    const Logo = () => (
        <div className="flex items-center gap-0">
            <img src={logoImg} alt="艾琳 AI" className="w-[71px] h-[71px] object-contain" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">艾琳 AI</span>
        </div>
    );

    // 分屏功能展示数据
    const features = [
        {
            title: '侧栏伴随，无需切换',
            desc: '在 Boss 直聘、智联、猎聘等招聘网站浏览简历时，侧边栏实时提取候选人的核心亮点与经历风险点。无需来回切换系统，信息就在手边。',
            icon: Layout,
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-50',
            image: feature1Img,
            reverse: false,
        },
        {
            title: '15 分钟全自动初面',
            desc: '一键发送面试邀约，AI 代您完成多轮语音面谈。还原真实沟通语境，深挖简历背后的专业能力与求职动机。',
            icon: Headphones,
            iconColor: 'text-violet-600',
            iconBg: 'bg-violet-50',
            renderCustom: () => <AnimatedVoiceInterview />,
            reverse: true,
        },
        {
            title: '结构化报告，拒绝模棱两可',
            desc: '每位候选人生成带红笔批注的胜任力量化评分。关键维度一目了然，所有结论均保留原始录音作为证据。',
            icon: ClipboardList,
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            image: feature3Img,
            reverse: false,
        },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-y-auto selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- Header (无边框) --- */}
            {step === 'intro' && (
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 h-20 flex items-center justify-between">
                    <Logo />
                    <div className="flex items-center gap-4">
                        {isExtensionInstalled ? (
                            <>
                                <button onClick={handleDemoMode} className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                    免登录预览
                                </button>
                                <button onClick={() => setStep('login')}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-1 shadow-sm">
                                    登录 <ArrowRight size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setStep('login')} className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                                    登录
                                </button>
                                <button onClick={handlePrimaryCTA}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-1.5 shadow-sm">
                                    <ChromeIcon size={14} /> 添加到 Chrome
                                </button>
                            </>
                        )}
                    </div>
                </header>
            )}

            <div className="flex-1 flex flex-col">
                {step === 'intro' && (
                    <main className="w-full flex flex-col pb-24">
                        {/* 1. HERO SECTION */}
                        <section className="pt-24 pb-16 px-4 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
                            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-6">
                                你的 AI <span className="text-indigo-600">招聘助理</span>
                            </h1>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
                                直接在 Boss 直聘、智联、猎聘等招聘网站的侧边栏唤起，<br className="hidden md:block" />完成简历深度解析、AI 自动初面与结构化评估报告。
                            </p>

                            {/* CTA — 区分安装状态 */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                <button onClick={handlePrimaryCTA}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                                    {isExtensionInstalled ? (
                                        <><Zap size={18} /> 免费开始使用</>
                                    ) : (
                                        <><ChromeIcon size={18} /> 免费添加到 Chrome</>
                                    )}
                                </button>
                                {!isExtensionInstalled && (
                                    <button onClick={() => setStep('login')}
                                        className="px-6 py-4 text-slate-600 hover:text-slate-900 text-[14px] font-medium transition-colors flex items-center gap-1.5">
                                        已有账号？登录 <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>

                            {/* 信任徽章 */}
                            <div className="flex items-center gap-6 text-[12px] font-medium text-slate-400 mt-2 mb-12">
                                <span className="flex items-center gap-1"><Shield size={14} /> 数据加密传输</span>
                                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> 仅在授权区域工作</span>
                                <span className="flex items-center gap-1"><Trash2 size={14} /> 隐私第一原则</span>
                            </div>

                            {/* 社会证明 */}
                            <div className="flex items-center justify-center gap-8 sm:gap-12 text-center mb-14">
                                <div>
                                    <p className="text-2xl font-extrabold text-slate-900">500+</p>
                                    <p className="text-[12px] text-slate-400 mt-0.5">HR 用户</p>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div>
                                    <p className="text-2xl font-extrabold text-slate-900">12,000+</p>
                                    <p className="text-[12px] text-slate-400 mt-0.5">候选人已筛选</p>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div>
                                    <p className="text-2xl font-extrabold text-slate-900">73%</p>
                                    <p className="text-[12px] text-slate-400 mt-0.5">初筛时间节省</p>
                                </div>
                            </div>

                            {/* 产品截图 */}
                            <div className="w-full relative px-4 sm:px-0">
                                <AnimatedHeroDashboard />
                                {/* 原始静态图备份，暂时隐藏 */}
                                {/* <img
                                    src={heroDashboardImg}
                                    alt="艾琳产品界面"
                                    className="w-full h-auto rounded-xl shadow-2xl border border-slate-200/60 object-cover bg-slate-50"
                                /> */}
                            </div>
                        </section>

                        {/* 2. FEATURE SHOWCASES — 分屏交替布局 */}
                        {features.map((feature, i) => (
                            <section key={i} className="py-20 px-6 max-w-6xl mx-auto w-full border-t border-slate-100">
                                <div className={`flex flex-col md:flex-row items-center gap-12 ${feature.reverse ? 'md:flex-row-reverse' : ''}`}>
                                    {/* 文字侧 */}
                                    <div className="flex-1 max-w-lg">
                                        <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center ${feature.iconColor} mb-5`}>
                                            <feature.icon size={24} />
                                        </div>
                                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">{feature.title}</h2>
                                        <p className="text-slate-500 leading-relaxed text-[15px]">{feature.desc}</p>
                                    </div>
                                    {/* 图片侧 */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-full max-w-lg aspect-[4/3] relative rounded-2xl overflow-hidden shadow-xl border border-slate-200/60 bg-slate-50 group">
                                            {feature.renderCustom ? (
                                                feature.renderCustom()
                                            ) : (
                                                <img
                                                    src={feature.image}
                                                    alt={feature.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            )}
                                            <div className="absolute inset-0 ring-1 ring-inset ring-slate-900/10 rounded-2xl pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))}

                        {/* 3. BOTTOM CTA — 区分安装状态 */}
                        <section className="py-16 px-6 bg-slate-50 text-center border-t border-slate-100">
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">准备好提升招聘效率了吗？</h3>
                            <p className="text-slate-500 mb-8">30 秒完成注册，立刻体验 AI 驱动的全新初筛流程</p>
                            <button onClick={handlePrimaryCTA}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-2">
                                {isExtensionInstalled ? (
                                    <><Zap size={18} /> 免费开始使用</>
                                ) : (
                                    <><ChromeIcon size={18} /> 免费添加到 Chrome</>
                                )}
                            </button>
                        </section>

                        {/* 4. FOOTER */}
                        <footer className="mt-auto py-10 text-center border-t border-slate-100">
                            <div className="flex justify-center gap-6 text-[13px] text-slate-500 mb-4">
                                <a href="#" className="hover:text-slate-900">产品介绍</a>
                                <a href="#" className="hover:text-slate-900">隐私条款</a>
                                <a href="#" className="hover:text-slate-900">服务协议</a>
                            </div>
                            <p className="text-[12px] text-slate-400">
                                &copy; 2025 Eileen.ai. All rights reserved.
                            </p>
                        </footer>
                    </main>
                )}

                {/* --- LOGIN VIEW --- */}
                {step === 'login' && (
                    <div className="flex-1 flex flex-col bg-slate-50 relative">
                        <header className="absolute top-0 left-0 w-full p-6 flex justify-start">
                            <Logo />
                        </header>

                        <div className="flex-1 flex items-center justify-center px-4 py-12">
                            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 sm:p-10">

                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">工作台登录 / 注册</h2>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-700 mb-2">手机号码</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                                                placeholder="请输入手机号"
                                                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-700 mb-2">验证码</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                                                placeholder="4位验证码"
                                                disabled={!codeSent}
                                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                            />
                                            <button
                                                onClick={handleSendCode}
                                                disabled={countdown > 0 || loading || phone.length < 11}
                                                className="shrink-0 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[13px] font-bold text-slate-700 rounded-xl transition-all disabled:opacity-50"
                                            >
                                                {countdown > 0 ? `${countdown}s 后重新获取` : codeSent ? '重新发送' : '获取验证码'}
                                            </button>
                                        </div>
                                    </div>

                                    {error && <p className="text-[12px] text-rose-500 font-medium animate-in fade-in">{error}</p>}

                                    {import.meta.env.DEV && (
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-2">
                                            <p className="text-[11px] text-slate-500 break-all">测试环境提示：任意手机号 + 验证码 <strong>1234</strong></p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLogin}
                                        disabled={!codeSent || code.length < 4 || loading || loginAnimating}
                                        className={`w-full mt-2 py-3 text-white text-[15px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center shadow-sm ${loginAnimating ? 'bg-emerald-500 scale-[1.02]' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-400'}`}
                                    >
                                        {loginAnimating ? <CheckCircle2 size={20} className="animate-in zoom-in duration-300" /> : loading ? <Loader2 className="animate-spin" size={18} /> : '登录 / 注册'}
                                    </button>
                                </div>

                                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                                    <button onClick={() => setStep('intro')} className="text-[13px] font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full transition-all inline-flex items-center gap-1.5">
                                        <ArrowRight size={14} className="rotate-180" /> 返回首页
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SUCCESS VIEW --- */}
                {step === 'success' && loginSuccess && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 animate-in fade-in duration-500">
                        <div className="w-full max-w-sm bg-white border border-slate-200/60 rounded-2xl shadow-xl p-10 text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">账号已就绪</h2>
                            <p className="text-[14px] text-slate-500 mb-8 leading-relaxed">
                                您已成功激活艾琳 AI。<br />前往工作台开始使用吧。
                            </p>

                            <div className="grid grid-cols-3 gap-4 mb-8 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-indigo-600"><Layout size={18} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">侧栏助手</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-violet-600"><Zap size={18} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">一键面谈</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-emerald-600"><Target size={18} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">多维报告</span>
                                </div>
                            </div>

                            <button onClick={handleGoToDashboard}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                                进入智能工作台 <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeView;
