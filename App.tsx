import React, { useState } from 'react';
import { ViewState } from './types';
import EileenSidebar from './components/EileenSidebar';
import CanvasArea from './components/CanvasArea';
import OrderDetailView from './components/views/OrderDetailView';
import { Smartphone, Monitor, Lock, RefreshCcw, ArrowLeft, ArrowRight, Star } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [browserContext, setBrowserContext] = useState<'empty' | 'resume'>('empty');

  const handleNavigate = (view: ViewState, candidateId?: string) => {
    setCurrentView(view);
    if (candidateId) setSelectedCandidateId(candidateId);
  };

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

  // 2. SPLIT LAYOUT VIEW (Dashboard + Sidebar)
  return (
    // Reduced padding (p-4) to maximize space and prevent "cramped" feeling on smaller screens
    <div className="flex h-screen w-full overflow-hidden font-sans p-4 gap-4 relative z-10">
      
      {/* Main Content Area (The "Browser Window") - Updated for AI Holographic Glass */}
      <div className="flex-1 flex flex-col overflow-hidden relative shadow-float rounded-2xl bg-white/40 border border-white/40 backdrop-blur-2xl backdrop-brightness-110 ring-1 ring-white/50">
        
        {/* URL Bar Mock - Fixed Height */}
        <div className="h-12 shrink-0 bg-white/40 border-b border-white/30 flex items-center px-4 gap-4 backdrop-blur-xl z-20">
            <div className="flex gap-2">
                <button className="p-1.5 hover:bg-black/5 rounded-md text-slate-500 transition-colors"><ArrowLeft size={14} /></button>
                <button className="p-1.5 hover:bg-black/5 rounded-md text-slate-500 transition-colors"><ArrowRight size={14} /></button>
                <button className="p-1.5 hover:bg-black/5 rounded-md text-slate-500 transition-colors"><RefreshCcw size={14} /></button>
            </div>
            <div className="flex-1 bg-white/40 border border-white/50 rounded-full h-8 flex items-center px-3 text-xs text-slate-600 shadow-inner gap-2 transition-all hover:bg-white/60">
                <Lock size={10} className="text-emerald-600" />
                <span className="flex-1 truncate font-medium">
                    {browserContext === 'resume' ? 'zhaopin.com/candidate/zhangsan' : 'chrome://newtab'}
                </span>
                <Star size={12} className="text-slate-400 hover:text-amber-400 cursor-pointer" />
            </div>
             <div className="flex gap-1.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-glow border-2 border-white/30">Me</div>
            </div>
        </div>

        {/* Page Content Wrapper - Flex 1 with min-h-0 to enforce scroll within this area */}
        <div className="flex-1 relative min-h-0 bg-gradient-to-b from-white/10 to-transparent">
            <CanvasArea 
              currentView={currentView} 
              selectedCandidateId={selectedCandidateId}
              onNavigate={handleNavigate}
              browserContext={browserContext}
              setBrowserContext={setBrowserContext}
            />
        </div>
      </div>

      {/* Extension Sidebar (Right Side Panel) - Updated for Binary Warmth */}
      <div className="w-[380px] shrink-0 h-full flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-white/40 bg-white/30 backdrop-blur-2xl relative ring-1 ring-white/40">
        <EileenSidebar 
            currentView={currentView} 
            onNavigate={handleNavigate} 
            browserContext={browserContext}
        />
      </div>

      {/* Dev Switcher */}
      <div className="fixed bottom-6 left-6 z-50 flex gap-2 group">
         <button 
          onClick={() => handleNavigate(ViewState.CANDIDATE_MOBILE)}
          className="bg-slate-900 text-white p-3 rounded-full shadow-float hover:scale-110 transition-transform ring-4 ring-white/30 backdrop-blur-sm"
          title="Switch to Candidate Phone Simulator"
        >
          <Smartphone size={20} />
        </button>
      </div>
    </div>
  );
};

export default App;