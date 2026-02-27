import React, { useState } from 'react';
import { Observation, SignalType } from '../types';
import { Play, Mic2, AlertTriangle, AlertOctagon, CheckCircle2, MessageSquareQuote, ChevronRight, ChevronDown, Pause } from 'lucide-react';

interface RedPenCardProps {
  data: Observation;
  isHighlighted?: boolean;
}

const RedPenCard: React.FC<RedPenCardProps> = ({ data, isHighlighted = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);

  const getSignalStyle = (signal: SignalType) => {
    switch (signal) {
      case 'CONFIDENT': return { 
          icon: <CheckCircle2 size={13} />, 
          bg: 'bg-white', 
          border: 'border-emerald-200',
          borderLeft: 'border-l-emerald-500', 
          badge: 'bg-emerald-50 text-emerald-700',
          label: '验证通过',
          lightColor: 'text-emerald-600'
      };
      case 'HESITANT': return { 
          icon: <AlertTriangle size={13} />, 
          bg: 'bg-white', 
          border: 'border-amber-200', 
          borderLeft: 'border-l-amber-500', 
          badge: 'bg-amber-50 text-amber-700',
          label: '存疑 / 迟疑',
          lightColor: 'text-amber-600'
      };
      case 'CONTRADICTORY': return { 
          icon: <AlertOctagon size={13} />, 
          bg: 'bg-white', 
          border: 'border-rose-200', 
          borderLeft: 'border-l-rose-500', 
          badge: 'bg-rose-50 text-rose-700',
          label: '风险 / 矛盾',
          lightColor: 'text-rose-600'
      };
      case 'VAGUE': return { 
          icon: <AlertTriangle size={13} />, 
          bg: 'bg-white', 
          border: 'border-slate-200', 
          borderLeft: 'border-l-slate-400', 
          badge: 'bg-slate-100 text-slate-600',
          label: '描述模糊',
          lightColor: 'text-slate-500'
      };
      default: return { icon: null, bg: 'bg-white', border: 'border-slate-200', borderLeft: 'border-l-slate-200', badge: '', label: '', lightColor: '' };
    }
  };

  const style = getSignalStyle(data.signalType);

  return (
    <div className={`group relative rounded-xl p-3 shadow-sm hover:shadow-md transition-all border border-l-[4px] cursor-pointer ${style.bg} ${style.border} ${style.borderLeft} ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-yellow-100' : ''}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
            {data.category}
        </span>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${style.badge}`}>
            {style.icon} {style.label}
        </div>
      </div>

      {/* Title - L2 Module Title */}
      <h4 className="text-[12px] font-bold text-slate-900 mb-1.5 leading-snug">{data.title}</h4>
      
      {/* Body - L3 Content */}
      <p className="text-xs text-slate-600 leading-snug mb-2.5">
        {data.observation}
      </p>

      {/* Footer / Player + STT Transcript - L4 Controls */}
      <div className="pt-0.5">
        {/* 播放行 */}
        <div className="flex items-center justify-between mb-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${isPlaying ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {isPlaying ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
            {isPlaying ? '00:12 / 01:15' : `听原声 ${data.evidenceTime}`}
            {isPlaying && <div className="flex gap-0.5 h-1.5 items-center ml-1"><div className="w-0.5 bg-white h-full animate-bounce"></div><div className="w-0.5 bg-white h-2/3 animate-bounce [animation-delay:0.1s]"></div><div className="w-0.5 bg-white h-full animate-bounce [animation-delay:0.2s]"></div></div>}
          </button>

          <div className="flex items-center gap-2">
            {data.gap && (
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${style.lightColor}`}>
                查看追问 <ChevronRight size={11} />
              </span>
            )}
            {data.quote && (
              <button
                onClick={(e) => { e.stopPropagation(); setTranscriptOpen(!transcriptOpen); }}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 transition-colors"
              >
                文字摘要 <ChevronDown size={10} className={`transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* STT 文字摘要区（默认展开） */}
        {data.quote && transcriptOpen && (
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-400 mr-1 not-italic">候选人：</span>
              {data.quote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedPenCard;