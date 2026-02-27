import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { Send, Sparkles, CheckCircle2, Phone, StopCircle, LayoutGrid, UserCircle2, UploadCloud, FileSearch, Command, MoreHorizontal, ArrowLeft } from 'lucide-react';

interface EileenSidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState, id?: string) => void;
  browserContext: 'empty' | 'resume';
}

type MessageType = 'text' | 'strategy-card' | 'result-card' | 'calling-card';

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
    // Step 1: Strategy
    const newCandidateId = 'zhangsan';
    const strategyMsg: Message = {
        id: 'strategy_' + Date.now(), sender: 'ai', type: 'strategy-card',
        content: '阅毕。此人技术栈匹配度 90%。\n\n我发现他有两段经历存在“时间重叠”疑点，建议重点核实。这是我的沟通策略 👇',
        data: { 
            id: newCandidateId, 
            name: '张三', 
            role: '高级前端工程师', 
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80', 
            points: ['离职动机真实性', 'React 并发机制', '时间重叠解释'] 
        },
        timestamp: Date.now()
    };
    setMessages(prev => [...prev, strategyMsg]);
  };

  const handleExecuteStrategy = (cardId: string, data: any) => {
      setMessages(prev => [...prev, {
          id: 'call_' + Date.now(),
          sender: 'ai',
          type: 'calling-card',
          content: '正在拨通候选人电话...',
          data: { name: data.name, avatar: data.avatar },
          timestamp: Date.now()
      }]);

      setTimeout(() => {
           setMessages(prev => {
               return prev.filter(m => m.type !== 'calling-card').concat([{
                   id: 'res_' + Date.now(),
                   sender: 'ai',
                   type: 'result-card',
                   content: '通话结束。🎉 \n\n结论：【推荐复试】\n技术深度过关，离职原因虽有隐情但已解释清楚。详细录音和红笔批注已生成。',
                   data: { id: data.id, name: data.name, role: data.role },
                   timestamp: Date.now()
               }]);
           });
      }, 4000);
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
                          <span className="text-[14px] font-bold text-indigo-900 block leading-tight">全自动电话初筛</span>
                          <span className="text-xs text-slate-500">模拟真人通话，验证候选人意向</span>
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

  const CallingCard = ({ msg }: { msg: Message }) => (
      <div className="mt-2 p-5 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl text-white shadow-xl relative overflow-hidden ring-1 ring-white/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl animate-pulse"></div>
          <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                 <img src={msg.data.avatar} className="w-14 h-14 rounded-full border-2 border-white/30" />
                 <div className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 rounded-full border-2 border-indigo-600 animate-pulse"></div>
              </div>
              <div>
                  <div className="text-sm text-indigo-100 font-bold mb-0.5 flex items-center gap-1.5"><Phone size={14} className="animate-bounce" /> 正在通话中...</div>
                  <div className="font-bold text-xl">{msg.data.name}</div>
                  <div className="text-sm text-indigo-200 font-mono mt-1">00:14</div>
              </div>
              <div className="ml-auto">
                  <div className="flex gap-1 items-end h-6">
                      <div className="w-1.5 bg-white/90 h-3 animate-[bounce_1s_infinite]"></div>
                      <div className="w-1.5 bg-white/90 h-6 animate-[bounce_1s_infinite_0.1s]"></div>
                      <div className="w-1.5 bg-white/90 h-2 animate-[bounce_1s_infinite_0.2s]"></div>
                  </div>
              </div>
          </div>
          <button className="mt-5 w-full py-3 bg-white/20 hover:bg-white/30 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors border border-white/10">
              <StopCircle size={18} /> 挂断 / 旁听
          </button>
      </div>
  );

  const StrategyCard = ({ msg }: { msg: Message }) => {
      const [executed, setExecuted] = useState(false);
      if (executed) {
          return (
             <div className="mt-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700 text-sm font-bold">
                <CheckCircle2 size={18} className="text-emerald-500" /> 策略已执行
            </div>
          );
      }
      return (
        <div className="mt-3 bg-white/80 border border-white/50 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center ring-2 ring-white">
                        <UserCircle2 className="text-indigo-600" size={26} />
                    </div>
                    <div>
                        <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">目标候选人</div>
                        <div className="font-bold text-slate-900 text-[16px]">{msg.data.name}</div>
                    </div>
                </div>
                <div className="space-y-2 mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">本次沟通重点</p>
                    <div className="flex flex-wrap gap-2">
                        {msg.data.points.map((p: string) => (
                            <span key={p} className="px-2.5 py-1 bg-white border border-indigo-100 text-indigo-700 text-xs font-bold rounded shadow-sm">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => { setExecuted(true); handleExecuteStrategy(msg.id, msg.data); }}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                >
                    <Phone size={16} /> 确认并开始 AI 电面
                </button>
            </div>
        </div>
      );
  };

  const ResultCard = ({ msg }: { msg: Message }) => (
      <div onClick={() => onNavigate(ViewState.REPORT, msg.data.id)}
        className="mt-3 bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100/50 rounded-xl p-5 shadow-sm cursor-pointer group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
              <CheckCircle2 size={80} className="text-emerald-500"/>
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
          
          {/* Header Action - Updated text to "查看工作进度" - BUMPED SIZE */}
          <button 
             onClick={() => onNavigate(ViewState.DASHBOARD)}
             className="flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white/80 text-indigo-700 rounded-lg border border-white/60 shadow-sm transition-all hover:shadow-md group backdrop-blur-sm"
             title="查看工作进度"
          >
              <LayoutGrid size={18} />
              <span className="text-[13px] font-bold hidden sm:inline">查看工作进度</span>
          </button>
      </div>

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
                             {msg.type === 'strategy-card' && <StrategyCard msg={msg} />}
                             {msg.type === 'calling-card' && <CallingCard msg={msg} />}
                             {msg.type === 'result-card' && <ResultCard msg={msg} />}
                         </div>
                         <span className="text-xs text-slate-500/80 mt-1 px-1 font-medium">
                             {isUser ? 'You' : 'Eileen'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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

      {/* 4. FOOTER DOCK - Updated for "Binary Warmth" and "Human Touch" */}
      <div className="shrink-0 z-20 flex flex-col gap-3 bg-white/60 backdrop-blur-2xl border-t border-white/40 px-4 pt-4 pb-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          
          {/* Action Chips Row - BUMPED SIZE to text-sm */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => handleSendMessage('上传简历')} 
                  className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-[13px] font-bold rounded-full border border-white/60 transition-colors whitespace-nowrap shadow-sm">
                   <UploadCloud size={16} className="text-rose-400" /> 上传简历
              </button>
              <button onClick={() => handleSendMessage('分析当前简历')} 
                  className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-[13px] font-bold rounded-full border border-white/60 transition-colors whitespace-nowrap shadow-sm">
                  <FileSearch size={16} className="text-indigo-400"/> 一键分析
              </button>
          </div>

          {/* Input Bar - Warm Gradient Background - BUMPED SIZE to text-[15px] */}
          <div className="bg-gradient-to-r from-indigo-50/50 to-rose-50/50 border border-white/60 p-2 pl-3 rounded-2xl shadow-inner flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-rose-200/50 focus-within:border-rose-200 group">
              <Command size={18} className="text-slate-400 shrink-0 group-focus-within:text-rose-400 transition-colors" />
              <input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="给艾琳下达指令..." 
                  className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-800 placeholder:text-slate-400 font-medium h-10 w-full"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 
                    ${inputValue.trim() 
                        ? 'bg-gradient-to-r from-indigo-600 to-rose-500 text-white shadow-glow-warm hover:scale-105 hover:shadow-lg' 
                        : 'bg-white/50 text-slate-300'}`}
              >
                  <Send size={20} fill={inputValue.trim() ? "currentColor" : "none"} />
              </button>
          </div>
      </div>
    </div>
  );
};

export default EileenSidebar;