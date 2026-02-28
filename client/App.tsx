import React, { useState } from 'react';
import { ViewState } from '../shared/types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/Toast';
import EileenSidebar from './components/EileenSidebar';
import CanvasArea from './components/CanvasArea';
import OrderDetailView from './views/OrderDetailView';
import WelcomeView from './views/WelcomeView';
import { Smartphone, MessageCircle } from 'lucide-react';

const AppInner: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [browserContext, setBrowserContext] = useState<'empty' | 'resume'>('empty');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNavigate = (view: ViewState, candidateId?: string) => {
    setCurrentView(view);
    if (candidateId) setSelectedCandidateId(candidateId);
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

      {/* Floating Sidebar Toggle Button */}
      {!isSidebarOpen && (
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

      {/* Sidebar Panel — Slides in from right */}
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