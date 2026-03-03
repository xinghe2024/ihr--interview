/**
 * VoiceBubble — 微信风格语音消息气泡
 */
import React from 'react';

interface VoiceBubbleProps {
    duration: number;
    isCandidate: boolean;
}

const VoiceBubble: React.FC<VoiceBubbleProps> = ({ duration, isCandidate }) => {
    // 宽度按时长比例（1s → 30%, 60s+ → 75%）
    const widthPercent = Math.min(75, Math.max(30, (duration / 60) * 100));

    return (
        <div
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-sm cursor-default select-none ${
                isCandidate
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
            }`}
            style={{ width: `${widthPercent}%`, minWidth: '80px', maxWidth: '85%' }}
        >
            {/* 波形图标 */}
            <div className={`flex items-end gap-[3px] ${isCandidate ? '' : 'order-first'}`}>
                {[6, 12, 8].map((h, i) => (
                    <div
                        key={i}
                        className={`w-[3px] rounded-full ${isCandidate ? 'bg-white/80' : 'bg-indigo-400'}`}
                        style={{ height: `${h}px` }}
                    />
                ))}
            </div>

            {/* 时长 */}
            <span className={`text-[13px] font-medium ${isCandidate ? 'text-white/90' : 'text-slate-600'}`}>
                {Math.round(duration)}"
            </span>
        </div>
    );
};

export default VoiceBubble;
