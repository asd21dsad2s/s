import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (isInstalled) {
    if (compact) return null;
    return (
      <span className="text-xs text-emerald-400/90 font-medium flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/30 border border-emerald-800/40">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        Installed
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 3000);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        aria-label="Install App"
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors border ${
          compact
            ? 'px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95'
            : 'px-3 py-1.5 text-xs bg-emerald-500 text-black font-semibold hover:bg-emerald-400 active:scale-95'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">Install App</span>
      </button>

      {/* Guide Modal for devices when beforeinstallprompt is not directly triggered */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">Install GymLite</h3>
                  <p className="text-xs text-zinc-400">Offline Android & iOS App</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-zinc-300">
              {isAndroid || (!isIOS && !isAndroid) ? (
                <div className="bg-[#09090b] p-3 rounded-xl border border-[#27272a] space-y-2">
                  <p className="font-medium text-emerald-400">On Android (Chrome / Edge):</p>
                  <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                    <li>Tap the <strong>three dots (⋮)</strong> in browser menu.</li>
                    <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>The app runs fullscreen with zero-latency offline access.</li>
                  </ol>
                </div>
              ) : null}

              {isIOS ? (
                <div className="bg-[#09090b] p-3 rounded-xl border border-[#27272a] space-y-2">
                  <p className="font-medium text-emerald-400">On iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                    <li>Tap the <strong>Share</strong> button at bottom of Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Launch from your home screen as a standalone app.</li>
                  </ol>
                </div>
              ) : null}

              <div className="text-[11px] text-zinc-400 pt-1">
                Works 100% offline with synthesized audio cues and local IndexedDB database.
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {installedNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-4 py-2 rounded-xl font-medium text-xs shadow-lg">
          App installed successfully!
        </div>
      )}
    </>
  );
};
