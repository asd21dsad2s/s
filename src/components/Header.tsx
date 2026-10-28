import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { Dumbbell, Timer } from 'lucide-react';

interface HeaderProps {
  activeTimerRemaining?: number | null;
  activeTimerTotal?: number | null;
  hasActiveWorkout?: boolean;
  onOpenTimer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTimerRemaining,
  hasActiveWorkout,
  onOpenTimer
}) => {
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-black text-sm shadow-sm">
            ⚡
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base">GymLite</span>
            {hasActiveWorkout && (
              <span className="ml-2 text-[10px] font-medium tracking-wide uppercase text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                In Session
              </span>
            )}
          </div>
        </div>

        {/* Zone 2 & 3: Active Rest Timer Pill + PWA Install */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTimerRemaining !== undefined && activeTimerRemaining !== null && activeTimerRemaining > 0 && (
            <button
              onClick={onOpenTimer}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-pulse"
              title="Rest timer active"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{formatTimer(activeTimerRemaining)}</span>
            </button>
          )}

          <PWAInstallButton compact={true} />
        </div>
      </div>
    </header>
  );
};
