import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-black px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md animate-in slide-in-from-top-2">
      <WifiOff className="w-3.5 h-3.5 stroke-[2.5]" />
      <span>Offline Mode · IndexedDB active</span>
    </div>
  );
};
