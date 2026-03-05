import React, { useState, useEffect } from 'react';
import { ViewState } from '../shared/types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/Toast';
import EileenSidebar, { BrowserContextInfo } from './components/EileenSidebar';
import CanvasArea from './components/CanvasArea';
import OrderDetailView from './views/OrderDetailView';
import WelcomeView from './views/WelcomeView';
import { Smartphone, MessageCircle } from 'lucide-react';

// ─── 插件侧边栏独立模式 ────────────────────────────────

const SidebarMode: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [browserContext, setBrowserContext] = useState<BrowserContextInfo>({ mode: 'dashboard' });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'BROWSER_CONTEXT') {
        // 兼容旧的 string 模式和新的富结构
        const ctx = e.data.context;
        if (typeof ctx === 'string') {
          setBrowserContext({ mode: ctx as 'empty' | 'resume' });
        } else {
          setBrowserContext(ctx);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col relative bg-gradient-to-b from-indigo-50/60 to-slate-50 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[40%] bg-indigo-200/25 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-[-10%] w-[60%] h-[30%] bg-violet-200/20 blur-[50px] rounded-full pointer-events-none" />

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center px-5 py-6 z-10 gap-5">

          {/* 情境感知 Banner（仅简历页） */}
          {browserContext.mode === 'resume' && (
            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 animate-in slide-in-from-top-2 fade-in duration-500">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <p className="text-[13px] text-indigo-700 font-medium leading-snug">
                我注意到您正在查看一份候选人简历<br />
                <span className="text-indigo-500 font-normal">登录后，我立即为您开始分析</span>
              </p>
            </div>
          )}

          {/* 冷启动主标语（非简历页） */}
          {browserContext.mode === 'empty' && (
            <div className="animate-in fade-in duration-500">
              <p className="text-[20px] font-bold text-slate-800 leading-tight mb-1">让 AI 替你做初面</p>
              <p className="text-[13px] text-indigo-600 font-medium">15 分钟完成一次专业初面</p>
            </div>
          )}

          {/* 价值点（两态共用） */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-[13px] font-bold text-slate-800 leading-tight">15 分钟全自动初面</p>
                <p className="text-xs text-slate-500 mt-0.5">AI 全程主持，多轮语音面谈</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-[13px] font-bold text-slate-800 leading-tight">结构化报告，拒绝模棱两可</p>
                <p className="text-xs text-slate-500 mt-0.5">量化评分报告，带红笔批注</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => window.open('http://localhost:3000', '_blank')}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[14px] font-bold rounded-xl shadow-lg shadow-indigo-200/60 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            {browserContext.mode === 'resume' ? '登录，立即初面这位候选人' : '登录，立即开始'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <EileenSidebar
        currentView={ViewState.DASHBOARD}
        onNavigate={() => window.open('http://localhost:3000', '_blank')}
        browserContext={browserContext}
        onLogout={logout}
        extensionMode={true}
      />
    </div>
  );
};

// ─── 主应用 ───────────────────────────────────────────

const AppInner: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [browserContext, setBrowserContext] = useState<BrowserContextInfo>({ mode: 'dashboard' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 检测插件是否已安装（webapp.ts content script 在 document_start 注入该属性）
  const hasExtension = document.documentElement.getAttribute('data-ailin-ext') === 'true';

  // 插件侧边栏 iframe 模式
  if (new URLSearchParams(window.location.search).get('mode') === 'sidebar') {
    return <SidebarMode />;
  }

  const handleNavigate = (view: ViewState, id?: string) => {
    setCurrentView(view);
    if (view === ViewState.CANDIDATE_MOBILE && id) {
      setInterviewSessionId(id);
    } else if (id) {
      setSelectedCandidateId(id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/50 animate-pulse">
            <span className="text-white text-lg font-bold">N</span>
          </div>
          <p className="text-[13px] text-slate-500">正在加载...</p>
        </div>
      </div>
    );
  }

  // Not logged in → Welcome page
  if (!isAuthenticated || currentView === ViewState.WELCOME) {
    return <WelcomeView onNavigate={handleNavigate} />;
  }

  // 1. FULL SCREEN VIEWS (Immersive Mode)
  if (currentView === ViewState.CANDIDATE_MOBILE) {
    return (
      <CanvasArea
        currentView={currentView}
        selectedCandidateId={selectedCandidateId}
        interviewSessionId={interviewSessionId}
        onNavigate={handleNavigate}
        browserContext={browserContext}
        setBrowserContext={setBrowserContext}
      />
    );
  }

  // Unified Order Detail View (Report & Tracking) - Full Screen
  if (currentView === ViewState.REPORT) {
    return <OrderDetailView candidateId={selectedCandidateId} onNavigate={handleNavigate} defaultTab="ANALYSIS" />;
  }

  if (currentView === ViewState.ORDER_TRACKING) {
    return <OrderDetailView candidateId={selectedCandidateId} onNavigate={handleNavigate} defaultTab="TIMELINE" />;
  }

  // 2. MAIN LAYOUT: Full-screen Dashboard + Floating Sidebar
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans relative">

      {/* Main Content Area — Full Width, no URL bar */}
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${isSidebarOpen ? 'mr-[400px]' : ''}`}>
        <CanvasArea
          currentView={currentView}
          selectedCandidateId={selectedCandidateId}
          onNavigate={handleNavigate}
          browserContext={browserContext}
          setBrowserContext={setBrowserContext}
          onUnreadCountChange={setUnreadCount}
        />
      </div>

      {/* Floating Sidebar Toggle Button — 安装了插件时隐藏（用插件侧边栏代替） */}
      {!hasExtension && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-300/40 hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center group"
          title="唤起 Ailin"
        >
          <MessageCircle size={22} className="group-hover:scale-110 transition-transform" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm animate-bounce">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
          )}
        </button>
      )}

      {/* Sidebar Panel — 安装了插件时隐藏（用插件侧边栏代替） */}
      {!hasExtension && (
        <div className={`fixed top-0 right-0 h-full w-[400px] z-40 flex flex-col shadow-2xl bg-white/30 backdrop-blur-2xl border-l border-white/40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <EileenSidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            browserContext={browserContext}
            onLogout={logout}
            onClose={() => setIsSidebarOpen(false)}
            unreadCount={unreadCount}
          />
        </div>
      )}

      {/* Dev Switcher */}
      <div className="fixed bottom-6 left-6 z-50 flex gap-2 group">
        <button
          onClick={() => handleNavigate(ViewState.CANDIDATE_MOBILE)}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-float hover:scale-110 transition-transform ring-4 ring-indigo-200/40"
          title="Switch to Candidate Phone Simulator"
        >
          <Smartphone size={20} />
        </button>
      </div>
    </div>
  );
};

// Wrap with Providers
const App: React.FC = () => (
  <NotificationProvider>
    <AuthProvider>
      <AppInner />
      <ToastContainer />
    </AuthProvider>
  </NotificationProvider>
);

export default App;