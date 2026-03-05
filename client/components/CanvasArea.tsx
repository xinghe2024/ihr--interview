import React from 'react';
import { ViewState } from '../../shared/types';
import type { BrowserContextInfo } from '../components/EileenSidebar';
import DashboardView from '../views/DashboardView';
import CandidateMobileView from '../views/CandidateMobileView';
import InitiationView from '../views/InitiationView';
import OrderDetailView from '../views/OrderDetailView';

interface CanvasAreaProps {
  currentView: ViewState;
  selectedCandidateId: string | null;
  interviewSessionId?: string | null;
  onNavigate: (view: ViewState, id?: string) => void;
  browserContext: BrowserContextInfo;
  setBrowserContext: (ctx: BrowserContextInfo) => void;
  onUnreadCountChange?: (count: number) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ currentView, selectedCandidateId, interviewSessionId, onNavigate, browserContext, setBrowserContext, onUnreadCountChange }) => {
  // Full Screen Overlays
  if (currentView === ViewState.CANDIDATE_MOBILE) {
    return <CandidateMobileView onExit={() => onNavigate(ViewState.DASHBOARD)} sessionId={interviewSessionId || undefined} />;
  }

  // Unified Order Detail View for both Reporting and Tracking phases
  if (currentView === ViewState.REPORT) {
    return <OrderDetailView candidateId={selectedCandidateId} onNavigate={onNavigate} defaultTab="ANALYSIS" />;
  }

  if (currentView === ViewState.ORDER_TRACKING) {
    return <OrderDetailView candidateId={selectedCandidateId} onNavigate={onNavigate} defaultTab="TIMELINE" />;
  }

  if (currentView === ViewState.INITIATION) {
    return <InitiationView onNavigate={onNavigate} />;
  }

  // In Dashboard state, we render the "Browser Content"
  return (
    <DashboardView
      onNavigate={onNavigate}
      browserContext={browserContext}
      setBrowserContext={setBrowserContext}
      onUnreadCountChange={onUnreadCountChange}
    />
  );
};

export default CanvasArea;