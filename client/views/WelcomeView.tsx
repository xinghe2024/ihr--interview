import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../../shared/types';
import {
    Brain, Sparkles, Shield, Zap, CheckCircle2, Phone,
    ArrowRight, Loader2, Trash2, Layout, Headphones, ClipboardList, Target
} from 'lucide-react';
import heroDashboardImg from '../assets/hero-dashboard-preview.png';

const EILEEN_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80';

interface WelcomeViewProps {
    onNavigate: (view: ViewState) => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigate }) => {
    const { login, sendVerificationCode, isAuthenticated } = useAuth();

    // Steps: 'intro' -> 'login' -> 'success'
    const [step, setStep] = useState<'intro' | 'login' | 'success'>('intro');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginSuccess, setLoginSuccess] = useState(false);

    // If already logged in, skip to success
    useEffect(() => {
        if (isAuthenticated) {
            setStep('success');
            setLoginSuccess(true);
        }
    }, [isAuthenticated]);

    // Countdown timer for resend
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
            setLoginSuccess(true);
            setStep('success');
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

    const Logo = ({ size = "text-xl", iconSize = 18 }: { size?: string, iconSize?: number }) => (
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Brain size={iconSize} className="text-white" />
            </div>
            <span className={`${size} font-bold text-slate-900 tracking-tight flex items-baseline gap-0.5`}>
                艾琳<Sparkles size={12} className="text-indigo-500 mb-2" />
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-y-auto selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- Minimal Header --- */}
            {step === 'intro' && (
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 h-16 flex items-center justify-between">
                    <Logo size="text-lg" iconSize={16} />
                    <div className="flex items-center gap-4">
                        <button onClick={handleDemoMode} className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
                            免登录预览
                        </button>
                        <button onClick={() => setStep('login')}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-1 shadow-sm">
                            登录 <ArrowRight size={14} />
                        </button>
                    </div>
                </header>
            )}

            <div className="flex-1 flex flex-col">
                {step === 'intro' && (
                    <main className="w-full flex flex-col pb-24">
                        {/* 1. HERO SECTION (Ultra Clean) */}
                        <section className="pt-24 pb-16 px-4 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
                            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-6">
                                你的全能 AI <span className="text-indigo-600">招聘助理</span>
                            </h1>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
                                融合顶尖大模型，直接在 Boss 直聘、猎聘等网页侧边栏唤起，<br className="hidden md:block" />提供实时的简历深挖、AI 自动初面与结构化评估报告。
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                <button onClick={() => setStep('login')}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[16px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                                    <Zap size={18} /> 获取「艾琳」插件
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-[12px] font-medium text-slate-400 mt-2 mb-16">
                                <span className="flex items-center gap-1"><Shield size={14} /> 数据加密传输</span>
                                <span className="flex items-center gap-1"><CheckCircle2 size={14} /> 仅在授权区域工作</span>
                                <span className="flex items-center gap-1"><Trash2 size={14} /> 隐私第一原则</span>
                            </div>

                            {/* Crisp Real Screenshot */}
                            <div className="w-full relative px-4 sm:px-0">
                                <img
                                    src={heroDashboardImg}
                                    alt="艾琳产品界面"
                                    className="w-full h-auto rounded-xl shadow-2xl border border-slate-200/60 object-cover bg-slate-50"
                                />
                            </div>
                        </section>

                        {/* 2. FEATURES GRID (Minimal 3 Columns) */}
                        <section className="py-20 px-6 max-w-6xl mx-auto w-full border-t border-slate-100">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">聚焦决策，抛弃繁琐</h2>
                                <p className="text-slate-500 mt-4 text-lg">将重复性最高的招聘初筛交给艾琳，为您释放 80% 的精力。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Feature 1 */}
                                <div className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-sm">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                                        <Layout size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">随处可用的侧边栏</h3>
                                    <p className="text-slate-500 leading-relaxed text-sm">
                                        无需频繁切换系统。在招聘平台查看简历时，艾琳会在侧边栏实时为您提取候选人的核心亮点与经历风险点。
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-violet-300 transition-colors shadow-sm">
                                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 mb-6">
                                        <Headphones size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">15 分钟全自动初面</h3>
                                    <p className="text-slate-500 leading-relaxed text-sm">
                                        一键发送邀约。系统代您与候选人进行深度的多轮语音面谈，还原真实沟通语境，深挖简历背后的真实专业能力。
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors shadow-sm">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                                        <ClipboardList size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">洞察秋毫的评估报告</h3>
                                    <p className="text-slate-500 leading-relaxed text-sm">
                                        拒绝模棱两可。为您生成结构化的评估结论，提供带红笔批注的胜任力量化评分，且保留全部原始沟通录音作为证据。
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 4. FOOTER (Minimal) */}
                        <footer className="mt-auto py-10 text-center border-t border-slate-100">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Brain size={16} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-400 tracking-tight">艾琳 ✨</span>
                            </div>
                            <div className="flex justify-center gap-6 text-[13px] text-slate-500 mb-4">
                                <a href="#" className="hover:text-slate-900">产品介绍</a>
                                <a href="#" className="hover:text-slate-900">隐私条款</a>
                                <a href="#" className="hover:text-slate-900">服务协议</a>
                            </div>
                            <p className="text-[12px] text-slate-400">
                                &copy; 2024 Eileen.ai. All rights reserved.
                            </p>
                        </footer>
                    </main>
                )}

                {/* --- CLEAN LOGIN VIEW --- */}
                {step === 'login' && (
                    <div className="flex-1 flex flex-col bg-slate-50 relative">
                        {/* Simple Header for Login */}
                        <header className="absolute top-0 left-0 w-full p-6 flex justify-start">
                            <Logo size="text-lg" iconSize={16} />
                        </header>

                        <div className="flex-1 flex items-center justify-center px-4 py-12">
                            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 sm:p-10">

                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 rounded-full mx-auto mb-4 border border-slate-100 overflow-hidden shadow-sm p-0.5">
                                        <img src={EILEEN_AVATAR} className="w-full h-full object-cover rounded-full" alt="艾琳" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">艾琳助理</h2>
                                    <p className="text-[13px] text-slate-500 mt-2">工作台登录 / 注册</p>
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
                                        disabled={!codeSent || code.length < 4 || loading}
                                        className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold rounded-xl transition-all disabled:opacity-50 disabled:bg-indigo-400 flex items-center justify-center shadow-sm"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={18} /> : '即刻开启智能招聘'}
                                    </button>
                                </div>

                                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                                    <button onClick={() => setStep('intro')} className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
                                        <ArrowRight size={14} className="rotate-180" /> 返回预览官网
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- CLEAN SUCCESS VIEW --- */}
                {step === 'success' && loginSuccess && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 animate-in fade-in duration-500">
                        <div className="w-full max-w-sm bg-white border border-slate-200/60 rounded-2xl shadow-xl p-10 text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">账号已就绪</h2>
                            <p className="text-[14px] text-slate-500 mb-8 leading-relaxed">
                                您已成功激活艾琳助理。<br />现在立刻前往工作台体验极致的高效筛选工作流。
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
