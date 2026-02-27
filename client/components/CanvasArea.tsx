import React from 'react';
import { ViewState } from '../../shared/types';
import DashboardView from '../views/DashboardView';
import CandidateMobileView from '../views/CandidateMobileView';
import InitiationView from '../views/InitiationView';
import OrderDetailView from '../views/OrderDetailView';

interface CanvasAreaProps {
  currentView: ViewState;
  selectedCandidateId: string | null;
  onNavigate: (view: ViewState, id?: string) => void;
  browserContext: 'empty' | 'resume';
  setBrowserContext: (ctx: 'empty' | 'resume') => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ currentView, selectedCandidateId, onNavigate, browserContext, setBrowserContext }) => {
  // Full Screen Overlays
  if (currentView === ViewState.CANDIDATE_MOBILE) {
    return <CandidateMobileView onExit={() => onNavigate(ViewState.DASHBOARD)} />;
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
    />
  );
};

export default CanvasArea;