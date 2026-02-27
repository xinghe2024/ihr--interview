import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../../shared/types';
import {
    Brain, Sparkles, Shield, Zap, CheckCircle2, Phone,
    ArrowRight, MessageSquare, FileSearch, BarChart3,
    ChevronRight, Loader2, Trash2, Eye, Star,
    Layout, Headphones, ClipboardList, Target
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

    // Component for the Logo/Branding
    const Logo = ({ size = "text-xl" }: { size?: string }) => (
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
                <Brain size={18} className="text-white" />
            </div>
            <span className={`${size} font-bold text-slate-900 tracking-tight flex items-baseline gap-0.5`}>
                艾琳<Sparkles size={12} className="text-indigo-500 mb-2" />
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-white flex flex-col overflow-y-auto selection:bg-indigo-100 selection:text-indigo-900">
            {/* --- Fixed Floating Login Button --- */}
            {step === 'intro' && (
                <div className="fixed top-8 right-8 z-50 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                    <button onClick={() => setStep('login')}
                        className="bg-white/90 backdrop-blur-md border border-slate-200/60 px-5 py-2 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-[13px] text-slate-700 flex items-center gap-2 group">
                        已有账号？去登录 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col">
                {step === 'intro' && (
                    <div className="w-full flex flex-col">
                        {/* 1. HERO SECTION */}
                        <section className="pt-24 pb-20 px-4 flex flex-col items-center text-center bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-0 opacity-10 pointer-events-none">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]" />
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-400 rounded-full blur-[120px]" />
                            </div>

                            <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                <Logo size="text-2xl" />

                                <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                                    你的全能 AI 招聘助理
                                </h1>

                                <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                    集成行业顶尖模型，在招聘平台侧边栏为你效劳：
                                    <br className="hidden md:block" />
                                    <strong>深入解析、智能触达、自动初面。</strong>
                                </p>

                                <div className="flex flex-col items-center gap-4 pt-4">
                                    <button onClick={() => setStep('login')}
                                        className="inline-flex items-center gap-2 px-10 py-4 bg-indigo-700 hover:bg-indigo-800 text-white text-[16px] font-bold rounded-2xl shadow-2xl shadow-indigo-300/40 hover:scale-[1.02] active:scale-95 transition-all">
                                        🎯 免费添加到 Chrome 浏览器
                                    </button>

                                    <button onClick={handleDemoMode}
                                        className="text-[14px] font-medium text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                                        先不安装，看看 Demo 效果 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-center gap-6 pt-4 grayscale opacity-40">
                                    <span className="text-[12px] font-bold text-slate-600">已深度适配：</span>
                                    <span className="text-[14px] font-bold text-slate-600">BOSS 直聘</span>
                                    <span className="text-[14px] font-bold text-slate-600">猎聘网</span>
                                    <span className="text-[14px] font-bold text-slate-600">拉勾招聘</span>
                                </div>

                                {/* Hero Image Mockup */}
                                <div className="pt-16 px-4">
                                    <div className="relative group perspective-1000">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
                                        <img
                                            src={heroDashboardImg}
                                            alt="艾琳工作台"
                                            className="relative rounded-2xl shadow-3xl border border-slate-200/60 transform transition-all duration-700 hover:rotate-x-1 hover:scale-[1.01]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. VALUE PROPOSITION SECTIONS (Z-Pattern) */}
                        <section className="py-24 space-y-32">
                            {/* Feature 1 */}
                            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                <div className="space-y-6">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                        <Layout size={24} />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">随处可见，随时待命。</h2>
                                    <p className="text-lg text-slate-500 leading-relaxed">
                                        艾琳以侧边栏的形式贴合在你的招聘网站中。无需频繁切换窗口，看简历的同时，让 AI 实时为你提取关键亮点、匹配度风险，甚至是离职动机预测。
                                    </p>
                                    <ul className="space-y-3 pt-4">
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 兼容主流招聘平台</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 支持 PDF/Word 简历一键解析</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> AI 撰写个性化打招呼话术</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-100 rounded-3xl p-4 overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                                    <div className="bg-white rounded-xl shadow-2xl p-4 w-full h-full border border-slate-200">
                                        <div className="flex items-center gap-2 border-b pb-2 mb-4">
                                            <div className="w-3 h-3 rounded-full bg-slate-200" /><div className="w-3 h-3 rounded-full bg-slate-200" /><div className="w-3 h-3 rounded-full bg-slate-200" />
                                            <div className="ml-4 h-3 w-40 bg-slate-100 rounded-full" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-1/3 space-y-3">
                                                <div className="w-16 h-16 bg-slate-100 rounded-lg" />
                                                <div className="h-3 w-full bg-slate-100 rounded-full" />
                                                <div className="h-3 w-1/2 bg-slate-100 rounded-full" />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="h-32 bg-indigo-50 border border-indigo-100 rounded-xl p-3 relative overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Brain size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-bold text-indigo-700">艾琳 · 实时助手</span>
                                                    </div>
                                                    <div className="h-2 w-2/3 bg-indigo-200 rounded-full mb-1" />
                                                    <div className="h-2 w-1/2 bg-indigo-200 rounded-full mb-1" />
                                                    <div className="h-2 w-3/4 bg-indigo-200 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                <div className="order-2 md:order-1 bg-slate-100 rounded-3xl p-4 overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                                    <div className="bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-[320px] aspect-[9/16] relative">
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                            <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center p-0.5 ring-4 ring-indigo-500/20">
                                                <img src={EILEEN_AVATAR} className="w-full h-full rounded-full object-cover" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-indigo-300 text-[10px] font-bold tracking-widest uppercase">AI 进行中</p>
                                                <p className="text-white font-bold">正在面试：林雨晴</p>
                                                <div className="flex justify-center gap-1">
                                                    <div className="w-1 h-3 bg-indigo-400 animate-pulse" />
                                                    <div className="w-1 h-6 bg-indigo-400 animate-pulse delay-75" />
                                                    <div className="w-1 h-2 bg-indigo-400 animate-pulse delay-150" />
                                                    <div className="w-1 h-5 bg-indigo-400 animate-pulse delay-100" />
                                                </div>
                                            </div>
                                            <div className="h-24 w-full bg-white/5 rounded-2xl p-3 text-left">
                                                <p className="text-[10px] text-white/40 mb-1">候选人回答...</p>
                                                <p className="text-xs text-white/80">"我在上个项目中主要负责微服务架构的设计，使用了 Spring Cloud..."</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="order-1 md:order-2 space-y-6">
                                    <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100">
                                        <Headphones size={24} />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">15 分钟，全自动深度初面。</h2>
                                    <p className="text-lg text-slate-500 leading-relaxed">
                                        不再因庞大的候选人群体而精疲力竭。艾琳可以利用自然语言处理和语音技术，通过电话或文字与候选人进行深度的多轮沟通，自动挖掘简历之外的硬实力。
                                    </p>
                                    <ul className="space-y-3 pt-4">
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 完美模拟真人面试语境</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 自动验证技能关键词</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 候选人无需下载任何 APP</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                <div className="space-y-6">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                                        <ClipboardList size={24} />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">像 HRBP 一样思考的评估。</h2>
                                    <p className="text-lg text-slate-500 leading-relaxed">
                                        拒绝模棱两可的评价。艾琳生成的报告会依据 KSQ 模型，从胜任力、价值观、稳定性等维度给出量化的评估结论，直接告诉你这个候选人值不值得约下一轮。
                                    </p>
                                    <ul className="space-y-3 pt-4">
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> AI 辅助候选人排名</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 智能识别沟通中的水分与风险点</li>
                                        <li className="flex items-center gap-2 text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-500" /> 结构化数据导出，团队共享更便捷</li>
                                    </ul>
                                </div>
                                <div className="bg-slate-100 rounded-3xl p-4 overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-[400px] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                                                <div className="h-2 w-20 bg-slate-100 rounded-full" />
                                            </div>
                                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">高匹配 A+</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-2.5 w-full bg-slate-50 rounded-full" />
                                            <div className="h-2.5 w-full bg-slate-50 rounded-full" />
                                            <div className="h-2.5 w-2/3 bg-slate-50 rounded-full" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div className="h-12 bg-slate-50 rounded-lg p-2"><div className="h-2 w-1/2 bg-slate-200 rounded mb-2" /><div className="h-3 w-3/4 bg-slate-300 rounded" /></div>
                                            <div className="h-12 bg-slate-50 rounded-lg p-2"><div className="h-2 w-1/2 bg-slate-200 rounded mb-2" /><div className="h-3 w-3/4 bg-slate-300 rounded" /></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. FINAL CTA */}
                        <section className="py-24 px-6 bg-slate-900 relative overflow-hidden text-center">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
                                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500 rounded-full blur-[100px]" />
                            </div>

                            <div className="relative z-10 max-w-3xl mx-auto space-y-10">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-indigo-300 text-sm font-bold border border-white/10">
                                    <Zap size={16} /> 即刻释放你的招聘潜能
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                                    把重复劳动交给艾琳，
                                    <br />把决策权留给自己。
                                </h2>
                                <div className="flex flex-col items-center gap-6 pt-6">
                                    <button onClick={() => setStep('login')}
                                        className="inline-flex items-center gap-2 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white text-[18px] font-bold rounded-2xl shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                        获取「艾琳」插件
                                    </button>

                                    <div className="flex items-center justify-center gap-6 text-[12px] text-slate-500">
                                        <span className="flex items-center gap-1.5"><Shield size={14} /> 数据全程加密</span>
                                        <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> 仅在你授权时工作</span>
                                        <span className="flex items-center gap-1.5"><Trash2 size={14} /> 隐私第一原则</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. FOOTER */}
                        <footer className="py-12 px-6 border-t border-slate-100 flex flex-col items-center space-y-6">
                            <Logo size="text-lg" />
                            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400 font-medium">
                                <button className="hover:text-indigo-600">产品介绍</button>
                                <button className="hover:text-indigo-600">隐私协议</button>
                                <button className="hover:text-indigo-600">服务条款</button>
                                <button className="hover:text-indigo-600">联系我们</button>
                            </div>
                            <p className="text-[12px] text-slate-300">
                                © 2024 Eileen.ai (艾琳智能招聘助理). All rights reserved.
                            </p>
                        </footer>
                    </div>
                )}

                {step === 'login' && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6 animate-in fade-in duration-500">
                        <div className="w-full max-w-md">
                            <div className="bg-white border border-slate-200/60 rounded-3xl shadow-2xl shadow-slate-200/40 p-10 relative overflow-hidden">
                                {/* Decorator */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />

                                <div className="text-center mb-8 relative z-10">
                                    <div className="w-20 h-20 rounded-full mx-auto mb-4 p-1 bg-white shadow-xl ring-1 ring-slate-100 flex items-center justify-center">
                                        <img src={EILEEN_AVATAR} className="w-full h-full rounded-full object-cover" alt="艾琳" />
                                    </div>
                                    <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-1 mt-6">AI 助理 · 艾琳</p>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">欢迎回来</h2>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider pl-1">手机号码</label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                                                placeholder="请输入手机号"
                                                maxLength={11}
                                                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl text-[15px] text-slate-800 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider pl-1">验证码</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                                                placeholder="验证码"
                                                maxLength={4}
                                                disabled={!codeSent}
                                                className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl text-[15px] text-slate-800 disabled:bg-slate-50/50 disabled:cursor-not-allowed outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                                            />
                                            <button
                                                onClick={handleSendCode}
                                                disabled={countdown > 0 || loading || phone.length < 11}
                                                className="shrink-0 px-6 py-4 bg-slate-50 hover:bg-slate-100 text-[14px] font-bold text-slate-600 rounded-2xl transition-all disabled:opacity-50 border border-slate-200"
                                            >
                                                {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '获取验证码'}
                                            </button>
                                        </div>
                                    </div>

                                    {error && <p className="text-[12px] text-rose-500 font-medium pl-1 animate-shake">{error}</p>}

                                    {import.meta.env.DEV && (
                                        <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl px-4 py-3">
                                            <p className="text-[11px] text-indigo-600 leading-normal"><strong>💡 测试提示：</strong>任意11位手机号 + 验证码 <strong>1234</strong></p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLogin}
                                        disabled={!codeSent || code.length < 4 || loading}
                                        className="w-full py-4 bg-indigo-700 hover:bg-indigo-800 text-white text-[16px] font-bold rounded-2xl shadow-xl shadow-indigo-200/40 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : '即刻开启智能招聘'}
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => setStep('intro')}
                                className="mx-auto mt-8 text-[13px] font-bold text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-2">
                                <ArrowRight size={14} className="rotate-180" /> 返回预览产品魅力
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && loginSuccess && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 animate-in fade-in duration-700">
                        <div className="w-full max-w-lg bg-white border border-slate-200/60 rounded-[40px] shadow-3xl p-12 text-center">
                            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-white">
                                <CheckCircle2 size={48} className="text-emerald-500" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">艾琳已绑就绪！</h2>
                            <p className="text-[16px] text-slate-500 mb-10 leading-relaxed">
                                恭喜！你已成功激活 AI 助理。
                                <br />现在就开始你的极速招聘之旅。
                            </p>

                            <div className="grid grid-cols-3 gap-6 mb-10">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Layout size={20} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">打开网站</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600"><Zap size={20} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">唤起艾琳</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><Target size={20} /></div>
                                    <span className="text-[11px] text-slate-500 font-bold">开启初筛</span>
                                </div>
                            </div>

                            <button onClick={handleGoToDashboard}
                                className="w-full py-5 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white text-[18px] font-bold rounded-2xl shadow-2xl shadow-indigo-300/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                进入艾琳的工作台 <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeView;

