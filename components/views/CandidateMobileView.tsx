
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, ChevronLeft, ShieldCheck, Volume2, Sparkles, Calendar, ArrowRight, VideoOff, Phone, Star, Coffee, Info, RefreshCw } from 'lucide-react';

interface CandidateMobileViewProps {
  onExit: () => void;
}

type MobileState = 'LANDING' | 'PERMISSION' | 'INCALL' | 'INTERRUPTED' | 'ENDED';

const CandidateMobileView: React.FC<CandidateMobileViewProps> = ({ onExit }) => {
  const [state, setState] = useState<MobileState>('LANDING');
  const [micActive, setMicActive] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState(0);

  // Mock Question Progression
  const question = timer > 3 ? "您好，我看到您在之前的项目中负责过前端架构升级。能具体聊聊在这个过程中，您遇到的最大技术挑战是什么吗？" : "正在接入通话...";

  useEffect(() => {
    let interval: any;
    if (state === 'INCALL') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const RenderLanding = () => (
    <div className="h-full flex flex-col bg-white px-6 pt-8 pb-6 overflow-hidden">
      {/* Top Brand - Compact */}
      <div className="flex items-center gap-2 mb-6 opacity-80 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">聘</div>
          <span className="text-sm font-medium text-slate-500">字节跳动 · 招聘</span>
      </div>

      {/* Main Content - Flex Grow to take available space, but center content */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shrink-0">
             <Phone className="text-indigo-600" size={28} />
        </div>
        
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-[1.2] mb-6 tracking-tight shrink-0">
            Hi 张三，<br/>
            邀请您进行岗位初步沟通
        </h1>
        
        {/* Education Block - PRESERVED TEXT & CONTENT */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 shrink-0">
            <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={16} className="text-indigo-600"/>
                 <span className="text-sm font-bold text-indigo-900">AI 电话初筛 (AI Phone Screening)</span>
            </div>
            <p className="text-[15px] text-slate-700 leading-relaxed mb-4">
                我是智能招聘助理 <span className="font-bold">艾琳 (Ailin)</span>。受 <span className="font-bold">李先生</span> 委托，想与您进行一次<span className="font-bold text-indigo-700">简单的语音沟通</span>，了解您的基本情况。
            </p>
            <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Phone size={14}/> 全程语音
                </span>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <VideoOff size={14}/> 无摄像头
                </span>
            </div>
        </div>

        {/* Benefits - PRESERVED ALL ITEMS - UPDATED COPY */}
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

      {/* Footer Actions - Anchored at bottom */}
      <div className="mt-5 space-y-3 shrink-0 pt-2 border-t border-transparent">
          <button 
              onClick={() => setState('PERMISSION')}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-[16px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
              接受委托，接入通话 <ArrowRight size={18} />
          </button>
          <button className="w-full py-2 text-slate-500 text-sm font-medium flex items-center justify-center gap-2 hover:text-slate-800">
              <Calendar size={16} /> 预约稍后时间
          </button>
      </div>
    </div>
  );

  const RenderPermission = () => (
     <div className="h-full flex flex-col p-6 items-center justify-center bg-white relative">
        <button onClick={() => setState('LANDING')} className="absolute top-6 left-6 p-2 bg-slate-50 rounded-full"><ChevronLeft size={24}/></button>

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

  const RenderInCall = () => (
    <div className="h-full flex flex-col relative bg-slate-50">
        <div className="pt-16 px-6 text-center pb-6 z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-base font-bold text-slate-700 font-mono">{formatTime(timer)}</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">正在与 AI 招聘助理通话</h3>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative px-6 pb-16">
            {/* Visualizer */}
            <div className="mb-12 flex items-center justify-center gap-1.5 h-16">
                 {[...Array(5)].map((_, i) => (
                     <div key={i} className={`w-3 bg-indigo-400 rounded-full animate-[bounce_1s_infinite]`} style={{ height: isMuted ? '8px' : `${Math.random() * 40 + 15}px`, animationDelay: `${i * 0.1}s` }}></div>
                 ))}
            </div>

            <div className="w-full bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-500 uppercase">艾琳 (Ailin)</span>
                </div>
                <h3 className="text-lg font-medium text-slate-800 leading-relaxed">
                    "{question}"
                </h3>
            </div>
        </div>

        <div className="p-8 pb-12 flex items-center justify-center gap-8 bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
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
            
            <button className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 active:scale-95">
                <Volume2 size={28} />
            </button>
        </div>
    </div>
  );

  const RenderInterrupted = () => (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
          <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-8">
              <PhoneOff className="text-amber-500" size={40} />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">通话已中断</h2>
          <p className="text-base text-slate-500 mb-10 max-w-[280px] mx-auto leading-relaxed">
              别担心，您的沟通进度<span className="font-bold text-slate-700">已自动保存</span>。
              <br/>如果是误触或信号问题，请点击下方按钮恢复。
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

  const RenderEnded = () => (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-white text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
              <Sparkles className="text-indigo-600" size={40} />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">沟通已完成</h2>
          <p className="text-base text-slate-500 mb-10">感谢您的配合，沟通记录已生成</p>
          
          <div className="w-full bg-slate-50 rounded-2xl p-8 mb-10">
              <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck size={24} className="text-emerald-500"/>
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
            className="w-full py-4 bg-slate-900 text-white rounded-xl text-base font-bold shadow-lg"
          >
              退出页面
          </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center font-sans">
      <div className="w-full max-w-[375px] h-full sm:h-[800px] bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
        {state === 'LANDING' && <RenderLanding />}
        {state === 'PERMISSION' && <RenderPermission />}
        {state === 'INCALL' && <RenderInCall />}
        {state === 'INTERRUPTED' && <RenderInterrupted />}
        {state === 'ENDED' && <RenderEnded />}
        
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
