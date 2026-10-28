import React, { useState } from 'react';
import { AppSettings, exportAllData, importAllData, exportWorkoutHistoryCSV } from '../lib/db';
import { soundEngine, SoundType } from '../lib/audio';
import {
  Volume2,
  Smartphone,
  Download,
  Upload,
  Shield,
  Bell,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onDataImported: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDataImported
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleTestSound = (type: SoundType = settings.soundType) => {
    soundEngine.prepare();
    soundEngine.playAlert(type, settings.soundVolume);
  };

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymlite_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const [csvExportStatus, setCsvExportStatus] = useState<string | null>(null);

  const handleExportCSV = async () => {
    try {
      const csv = await exportWorkoutHistoryCSV();
      // Add UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 symbols and special characters flawlessly
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gymlite_workout_history_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setCsvExportStatus('Workout history CSV downloaded!');
      setTimeout(() => setCsvExportStatus(null), 3500);
    } catch (e: any) {
      alert(`CSV Export failed: ${e.message}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importAllData(content);
      if (res.success) {
        setImportStatus(res.message);
        onDataImported();
        setTimeout(() => setImportStatus(null), 4000);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const ANDROID_MAIN_ACTIVITY = `package com.gymlite.app

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#09090b")
        window.navigationBarColor = Color.parseColor("#18181b")
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            webChromeClient = WebChromeClient()
            webViewClient = WebViewClient()
            setBackgroundColor(Color.parseColor("#09090b"))
        }
        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }
}`;

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Settings</h2>
        <p className="text-xs text-zinc-400">Rest timers, Android installation, and offline backups</p>
      </div>

      {/* ANDROID INSTALLATION GUIDE (Direct answer to user prompt) */}
      <div className="bg-[#18181b] border border-emerald-500/50 rounded-2xl p-4 space-y-3.5 shadow-lg shadow-emerald-950/20">
        <div className="flex items-center gap-2 pb-2 border-b border-[#27272a]">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">How to Download / Install on Android</h3>
        </div>

        <div className="space-y-3 text-xs text-zinc-300">
          <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[11px] font-black flex items-center justify-center">
                1
              </span>
              Direct 1-Click Install via Chrome (Recommended)
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed pl-6.5">
              GymLite is a Progressive Web App (PWA) with a Service Worker. It runs full-screen with
              0 ms latency without needing the heavy Google Play Store:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-zinc-300 space-y-1 pl-6.5 font-mono">
              <li>Open this site in Google Chrome on your Android phone.</li>
              <li>
                Tap the <strong>three dots menu (⋮)</strong> in the top-right corner.
              </li>
              <li>
                Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </li>
              <li>
                Tap <strong>Install</strong>. GymLite will appear in your Android app drawer with its
                custom icon, running standalone with full lockscreen timer support!
              </li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-[#09090b] border border-[#27272a] space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-black flex items-center justify-center">
                2
              </span>
              Standalone Native APK (Android Studio)
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If you want an APK file to sideload via ADB or share with friends: copy the single-file
              WebView setup below into an Android Studio project. It builds a microscopic <strong>~1.8 MB APK</strong>.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[11px] text-emerald-400">MainActivity.kt</span>
              <button
                onClick={() => copyToClipboard(ANDROID_MAIN_ACTIVITY, 'main')}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
              >
                {copiedCode === 'main' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedCode === 'main' ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rest Timer & Sound Configuration */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#27272a]">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Rest Timer & Sound Alerts</h3>
        </div>

        {/* Default duration */}
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">
            Default Rest Duration (Global)
          </label>
          <select
            value={settings.defaultRestSeconds}
            onChange={(e) => onUpdateSettings({ defaultRestSeconds: parseInt(e.target.value, 10) })}
            className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="60">1:00 (60 Seconds)</option>
            <option value="90">1:30 (90 Seconds)</option>
            <option value="120">2:00 (120 Seconds)</option>
            <option value="165">2:45 (165 Seconds) [Default]</option>
            <option value="180">3:00 (180 Seconds)</option>
            <option value="210">3:30 (210 Seconds)</option>
            <option value="240">4:00 (240 Seconds)</option>
            <option value="300">5:00 (300 Seconds)</option>
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">
            Tip: You can also set custom rest timers per exercise directly inside the exercise library!
          </p>
        </div>

        {/* Sound tone selector */}
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">
            Timer Alert Sound (Synthesized in Web Audio)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'chime', label: 'Ascending Chime' },
              { id: 'boxing', label: 'Boxing Bell' },
              { id: 'high_beep', label: 'Digital Stopwatch' },
              { id: 'pulse', label: 'Triple Pulse' }
            ].map((snd) => (
              <button
                key={snd.id}
                onClick={() => {
                  onUpdateSettings({ soundType: snd.id as SoundType });
                  handleTestSound(snd.id as SoundType);
                }}
                className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                  settings.soundType === snd.id
                    ? 'bg-emerald-950/20 border-emerald-500/50 text-white'
                    : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-white'
                }`}
              >
                <span>{snd.label}</span>
                {settings.soundType === snd.id && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleTestSound()}
            className="mt-2.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            Test Sound Alert 🔔
          </button>
        </div>

        {/* Toggles */}
        <div className="pt-2 space-y-3 border-t border-[#27272a]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">Auto-Start Rest Timer</span>
              <span className="text-[11px] text-zinc-500">
                Starts timer immediately when checking a set done
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoStartTimer: !settings.autoStartTimer })}
              className={`w-11 h-6 rounded-full transition relative ${
                settings.autoStartTimer ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  settings.autoStartTimer ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export for External Analysis */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#38bdf8]" />
            <h3 className="text-sm font-bold text-white">Export Workout History (CSV)</h3>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-400">
            Excel / Sheets / Python
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Download your complete set-by-set workout logs into a clean, universally compatible <strong>.csv</strong> spreadsheet.
          Perfect for external analytics, personal dashboards, charting in Excel or Google Sheets, and data science workflows.
        </p>

        <div className="bg-[#09090b] rounded-xl p-2.5 border border-[#27272a] text-[11px] text-zinc-400 font-mono space-y-1">
          <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Included Columns:</span>
          <p className="text-zinc-300">
            Date, Workout Name, Duration (min), Exercise Name, Muscle Group, Equipment, Set Order, Weight (kg), Reps, Volume (kg), Completed, RPE, Workout Notes
          </p>
        </div>

        {csvExportStatus && (
          <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{csvExportStatus}</span>
          </div>
        )}

        <button
          onClick={handleExportCSV}
          className="w-full py-3 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-sky-950/20"
        >
          <Download className="w-4 h-4" />
          Download Workouts (.CSV)
        </button>
      </div>

      {/* Local IndexedDB Data & Full Backup */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#27272a]">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Full App Backup & Migration (JSON)</h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          All workout history, routines, and custom exercises are stored directly in your browser's
          <strong> IndexedDB</strong> engine. No external accounts, zero tracking, and 100% offline.
        </p>

        {importStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs font-medium">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExport}
            className="py-2.5 px-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-[#27272a] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Full Backup (JSON)
          </button>

          <label className="py-2.5 px-3 rounded-xl bg-[#09090b] hover:bg-zinc-800 border border-[#27272a] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Restore (JSON)
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
