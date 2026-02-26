import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { ViewState } from '../../types';
import {
    Brain, Sparkles, Shield, Zap, CheckCircle2, Phone,
    ArrowRight, MessageSquare, FileSearch, BarChart3,
    ChevronRight, Loader2
} from 'lucide-react';

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

    // ---- Feature cards for the intro ----
    const features = [
        {
            icon: <FileSearch size={22} className="text-indigo-500" />,
            title: '一键解析简历',
            desc: '在招聘网站上直接解析候选人简历，自动提取关键信息',
        },
        {
            icon: <MessageSquare size={22} className="text-violet-500" />,
            title: 'AI 智能初筛',
            desc: '艾琳自动完成电话初筛，覆盖求职意向、技能验证等核心维度',
        },
        {
            icon: <BarChart3 size={22} className="text-emerald-500" />,
            title: '结构化报告',
            desc: '每位候选人生成可视化分析报告，一眼看清匹配度和风险点',
        },
        {
            icon: <Zap size={22} className="text-amber-500" />,
            title: '效率提升 10x',
            desc: '从"看简历到出结论"平均 3 天缩短至 15 分钟',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex flex-col">
            {/* --- Top Nav Bar --- */}
            <nav className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-white/60 bg-white/40 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                        <Brain size={18} className="text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800 tracking-tight">IHR · NEXUS</span>
                    <span className="text-[11px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Beta</span>
                </div>
                {step === 'intro' && (
                    <button onClick={() => setStep('login')}
                        className="text-[13px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                        已有账号？登录 <ArrowRight size={14} />
                    </button>
                )}
            </nav>

            {/* --- Main Content --- */}
            <div className="flex-1 flex items-center justify-center p-8">
                {step === 'intro' && (
                    <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero */}
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[12px] font-medium text-indigo-600 mb-6">
                                <Sparkles size={14} /> Chrome 插件已安装成功
                            </div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
                                AI 招聘助理<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">「艾琳」</span>
                                <br />已准备就绪
                            </h1>
                            <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
                                在任意招聘网站侧边栏唤起艾琳，即可完成<strong>简历解析 → AI 初筛电话 → 结构化报告</strong>的全流程。
                            </p>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {features.map((f, i) => (
                                <div key={i} className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 group">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-[14px] font-bold text-slate-800 mb-1">{f.title}</h3>
                                    <p className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="text-center">
                            <button onClick={() => setStep('login')}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[15px] font-bold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 hover:scale-[1.02] transition-all">
                                开始使用 <ChevronRight size={18} />
                            </button>
                            <p className="text-[11px] text-slate-400 mt-3">登录后即可在招聘网站上使用全部功能</p>
                        </div>
                    </div>
                )}

                {step === 'login' && (
                    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/30 p-8">
                            {/* Avatar + Title */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center ring-4 ring-white shadow-md">
                                    <img src={EILEEN_AVATAR} className="w-14 h-14 rounded-full object-cover" alt="Eileen" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">欢迎使用 IHR · NEXUS</h2>
                                <p className="text-[13px] text-slate-500 mt-1">请验证手机号以绑定您的招聘数据</p>
                            </div>

                            {/* Phone Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">手机号码</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                                            placeholder="请输入手机号"
                                            maxLength={11}
                                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-slate-50/50"
                                        />
                                    </div>
                                </div>

                                {/* Verification Code */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">验证码</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                                            placeholder="4位验证码"
                                            maxLength={4}
                                            disabled={!codeSent}
                                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-slate-50/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            onClick={handleSendCode}
                                            disabled={countdown > 0 || loading || phone.length < 11}
                                            className="shrink-0 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-[13px] font-bold text-slate-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200"
                                        >
                                            {loading && !codeSent ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : countdown > 0 ? (
                                                `${countdown}s`
                                            ) : codeSent ? (
                                                '重新发送'
                                            ) : (
                                                '获取验证码'
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-[12px] text-rose-500 font-medium pl-1">{error}</p>
                                )}

                                {/* Demo hint */}
                                <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2">
                                    <p className="text-[11px] text-indigo-600">
                                        <strong>💡 体验提示：</strong>输入任意11位手机号，验证码输入 <strong>1234</strong> 即可登录
                                    </p>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleLogin}
                                    disabled={!codeSent || code.length < 4 || loading}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[14px] font-bold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && codeSent ? (
                                        <><Loader2 size={16} className="animate-spin" /> 登录中...</>
                                    ) : (
                                        <><Shield size={16} /> 验证并登录</>
                                    )}
                                </button>
                            </div>

                            {/* Footer */}
                            <p className="text-[10px] text-slate-400 text-center mt-6 leading-relaxed">
                                登录即表示您同意 <button className="text-indigo-500 hover:underline">《服务协议》</button> 和 <button className="text-indigo-500 hover:underline">《隐私政策》</button>
                            </p>
                        </div>

                        {/* Back link */}
                        <button onClick={() => setStep('intro')}
                            className="block mx-auto mt-4 text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
                            ← 返回产品介绍
                        </button>
                    </div>
                )}

                {step === 'success' && loginSuccess && (
                    <div className="w-full max-w-lg text-center animate-in fade-in zoom-in-95 duration-700">
                        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/30 p-10">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-white shadow-md">
                                <CheckCircle2 size={36} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">🎉 插件已准备就绪！</h2>
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-8">
                                您的账号已绑定成功。<br />现在可以在任意招聘网站上唤起 <strong>艾琳</strong> 开始高效筛选。
                            </p>

                            {/* Quick start tips */}
                            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-5 mb-8 text-left">
                                <p className="text-[12px] font-bold text-slate-700 mb-3">⚡ 快速入门</p>
                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-bold">1</span>
                                        <p className="text-[12px] text-slate-600 leading-relaxed">打开招聘网站（如 Boss直聘），点击浏览器右上角的 <strong>IHR 图标</strong>唤起侧边栏</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-bold">2</span>
                                        <p className="text-[12px] text-slate-600 leading-relaxed">将候选人简历拖入对话框，艾琳会自动解析并生成<strong>初筛方案</strong></p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-bold">3</span>
                                        <p className="text-[12px] text-slate-600 leading-relaxed">确认方案后，AI 自动完成电话初筛，结果在<strong>「智能分析」</strong>标签页查看</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleGoToDashboard}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[15px] font-bold rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:scale-[1.02] transition-all">
                                进入工作台 <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Bottom Footer --- */}
            <footer className="h-12 shrink-0 flex items-center justify-center text-[11px] text-slate-400 border-t border-white/60 bg-white/30 backdrop-blur-sm gap-4">
                <span>© 2024 IHR · NEXUS 智能招聘平台</span>
                <span className="text-slate-300">|</span>
                <button className="hover:text-slate-600 transition-colors">隐私政策</button>
                <span className="text-slate-300">|</span>
                <button className="hover:text-slate-600 transition-colors">服务协议</button>
                <span className="text-slate-300">|</span>
                <button className="hover:text-slate-600 transition-colors">联系我们</button>
            </footer>
        </div>
    );
};

export default WelcomeView;
