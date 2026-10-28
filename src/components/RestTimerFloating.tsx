import React from 'react';
import { Timer, Bell } from 'lucide-react';
import { soundEngine, SoundType } from '../lib/audio';

interface RestTimerFloatingProps {
  remaining: number;
  total: number;
  isActive: boolean;
  onSubtractSeconds: (seconds: number) => void;
  onStop: () => void;
  soundType: SoundType;
  soundAlert: boolean;
  exerciseName?: string;
}

export const RestTimerFloating: React.FC<RestTimerFloatingProps> = ({
  remaining,
  total,
  isActive,
  onSubtractSeconds,
  onStop,
  soundType,
  soundAlert,
  exerciseName
}) => {
  if (!isActive || remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const progress = total > 0 ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 0;

  return (
    <div className="fixed top-16 right-4 z-40 max-w-xs animate-in slide-in-from-top-3 duration-200">
      <div className="bg-[#18181b]/95 border border-emerald-500/50 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-black/80 flex items-center gap-3">
        {/* Progress Ring / Icon */}
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="22"
              cy="22"
              r="18"
              className="text-zinc-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              className="text-emerald-500 transition-all duration-1000 ease-linear"
              strokeWidth="3.5"
              strokeDasharray={113.1}
              strokeDashoffset={113.1 - (113.1 * progress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <Timer className="w-4 h-4 text-emerald-400 absolute" />
        </div>

        {/* Text & Timer */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="truncate">{exerciseName ? `Rest · ${exerciseName}` : 'Rest Timer'}</span>
            {soundAlert && <Bell className="w-3 h-3 text-emerald-500/80 shrink-0" />}
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight tabular-nums">
            {timeFormatted}
          </div>
        </div>

        {/* Quick adjustments: Only -15s */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => onSubtractSeconds(15)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-mono font-semibold transition active:scale-95 border border-zinc-700/50 flex items-center gap-0.5"
            title="Subtract 15 seconds"
          >
            -15s
          </button>
        </div>
      </div>
    </div>
  );
};
