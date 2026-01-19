import React, { useState } from 'react';
import { Observation, SignalType } from '../types';
import { Play, Mic2, AlertTriangle, AlertOctagon, CheckCircle2, MessageSquareQuote, ChevronRight, Pause } from 'lucide-react';

interface RedPenCardProps {
  data: Observation;
}

const RedPenCard: React.FC<RedPenCardProps> = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);

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
    <div className={`group relative rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-l-[4px] cursor-pointer ${style.bg} ${style.border} ${style.borderLeft}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
            {data.category}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${style.badge}`}>
            {style.icon} {style.label}
        </div>
      </div>

      {/* Title - L2 Module Title */}
      <h4 className="text-sm font-bold text-slate-900 mb-2">{data.title}</h4>
      
      {/* Body - L3 Content (Updated to text-sm for readability) */}
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        {data.observation}
      </p>

      {/* Evidence Box (Quote) - L5 Metadata */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 relative mb-3">
             <MessageSquareQuote size={14} className="text-slate-300 absolute top-2 left-2" />
             <p className="text-xs text-slate-500 italic leading-relaxed pl-5 font-serif">
                 "{data.quote}"
             </p>
      </div>

      {/* Footer / Player - L4 Controls */}
      <div className="flex items-center justify-between pt-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${isPlaying ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
              {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              {isPlaying ? '00:12 / 01:15' : `听原声 ${data.evidenceTime}`}
              {isPlaying && <div className="flex gap-0.5 h-2 items-center ml-1"><div className="w-0.5 bg-white h-full animate-bounce"></div><div className="w-0.5 bg-white h-2/3 animate-bounce [animation-delay:0.1s]"></div><div className="w-0.5 bg-white h-full animate-bounce [animation-delay:0.2s]"></div></div>}
          </button>

          {data.gap && (
              <span className={`text-[11px] font-bold flex items-center gap-1 ${style.lightColor}`}>
                 查看追问 <ChevronRight size={12} />
              </span>
          )}
      </div>
    </div>
  );
};

export default RedPenCard;