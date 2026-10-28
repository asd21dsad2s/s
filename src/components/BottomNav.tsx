import React from 'react';
import { Dumbbell, Layers, BarChart3, Settings } from 'lucide-react';

export type TabType = 'workout' | 'templates' | 'stats' | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  hasActiveWorkout: boolean;
  activeTimerRemaining?: number | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  hasActiveWorkout
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: 'workout',
      label: hasActiveWorkout ? 'Active' : 'Workout',
      icon: <Dumbbell className="w-5 h-5" />,
      badge: hasActiveWorkout ? (
        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-6 animate-pulse" />
      ) : null
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <Layers className="w-5 h-5" />
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#18181b]/95 backdrop-blur-xl border-t border-[#27272a] pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 min-h-[44px] ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.badge}
              <div className="transition-transform duration-150">{tab.icon}</div>
              <span className="text-[10px] tracking-tight truncate max-w-[80px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
