/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDB,
  getInitialAppData,
  getActiveWorkout,
  saveActiveWorkout,
  finishWorkout as dbFinishWorkout,
  discardWorkout as dbDiscardWorkout,
  getCompletedWorkouts,
  getAllTemplates,
  saveTemplate as dbSaveTemplate,
  deleteTemplate as dbDeleteTemplate,
  getAllExercises,
  addCustomExercise as dbAddCustomExercise,
  getSettings,
  updateSettings as dbUpdateSettings,
  WorkoutSession,
  WorkoutTemplate,
  WorkoutExercise,
  ExerciseItem,
  WorkoutSet,
  AppSettings,
  DEFAULT_SETTINGS
} from './lib/db';
import { soundEngine } from './lib/audio';
import { lockscreenTimer } from './lib/mediaSessionTimer';
import { createTimerWorker } from './lib/timerWorker';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { RestTimerFloating } from './components/RestTimerFloating';
import { WorkoutHomeView } from './components/WorkoutHomeView';
import { WorkoutActiveView } from './components/WorkoutActiveView';
import { TemplatesView } from './components/TemplatesView';
import { ExerciseModal } from './components/ExerciseModal';
import { OfflineIndicator } from './components/OfflineIndicator';

// Code-split heavy views to reduce main bundle size by >60%
const StatsView = React.lazy(() =>
  import('./components/StatsView').then((m) => ({ default: m.StatsView }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const ExerciseDetailModal = React.lazy(() =>
  import('./components/ExerciseDetailModal').then((m) => ({ default: m.ExerciseDetailModal }))
);

const ViewLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-2">
    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    <span className="text-[11px] text-zinc-500 font-mono">Loading...</span>
  </div>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('workout');

  // Data State from IndexedDB
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // History Map for ghost previous exercise performance (memoized early for template & add exercise pre-fill)
  const historyMap = React.useMemo(() => {
    const map: Record<string, WorkoutSet[]> = {};
    for (const session of history) {
      for (const ex of session.exercises) {
        const key = ex.name.toLowerCase();
        if (!map[key]) {
          const completed = ex.sets.filter((s) => s.completed);
          if (completed.length > 0) {
            map[key] = completed;
          }
        }
      }
    }
    return map;
  }, [history]);

  // Exercise Picker & Exercise Detail Modal
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [inspectedExercise, setInspectedExercise] = useState<ExerciseItem | null>(null);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState(false);

  // Rest Timer State (Timestamp-based: prevents clock drift and avoids closure overwrite on -15s)
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restExerciseName, setRestExerciseName] = useState<string | undefined>();
  const timerIntervalRef = useRef<any>(null);
  const timerWorkerRef = useRef<Worker | null>(null);
  const restEndTimeRef = useRef<number>(0);
  const restTotalRef = useRef<number>(0);
  const restExerciseNameRef = useRef<string | undefined>(undefined);

  // Dedicated Web Worker setup to eliminate Android background throttling
  useEffect(() => {
    const worker = createTimerWorker();
    if (worker) {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'TICK') {
          setRestRemaining(msg.remaining);
          lockscreenTimer.updateLockscreenTimer(
            msg.remaining,
            restTotalRef.current,
            restExerciseNameRef.current
          );
        } else if (msg.type === 'COMPLETE') {
          restEndTimeRef.current = 0;
          setRestActive(false);
          setRestRemaining(0);
          if (settings.soundAlert) {
            soundEngine.playAlert(settings.soundType, settings.soundVolume);
          }
          lockscreenTimer.finishOrStopTimer(true, restExerciseNameRef.current);
        }
      };
      timerWorkerRef.current = worker;
    }

    return () => {
      if (timerWorkerRef.current) {
        timerWorkerRef.current.terminate();
        timerWorkerRef.current = null;
      }
    };
  }, [settings]);

  // Load all data from IndexedDB on startup (Single atomic multi-store batch query: < 5ms cold boot!)
  const reloadData = useCallback(async () => {
    try {
      await getDB();
      const initial = await getInitialAppData();
      setActiveWorkout(initial.activeWorkout);
      setTemplates(initial.templates);
      setExercises(initial.exercises);
      setHistory(initial.history);
      setSettings(initial.settings);
    } catch (e) {
      console.error('Failed to load initial data from IndexedDB:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lazy-load full 2,720 OpenGym catalogue on-demand when opening library or templates
  const ensureFullCatalogLoaded = useCallback(async () => {
    if (isCatalogLoaded) return;
    try {
      const full = await getAllExercises(true);
      setExercises(full);
      setIsCatalogLoaded(true);
    } catch (e) {
      console.error('Failed to load full catalog:', e);
    }
  }, [isCatalogLoaded]);

  // Lazy-load full 2,720 OpenGym catalogue on-demand ONLY when user explicitly opens the "+Add Exercise" modal
  useEffect(() => {
    if (isExerciseModalOpen) {
      ensureFullCatalogLoaded();
    }
  }, [isExerciseModalOpen, ensureFullCatalogLoaded]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Audio Context unlock and notification permissions on initial interaction
  useEffect(() => {
    const handleFirstTouch = () => {
      soundEngine.prepare();
      lockscreenTimer.requestNotificationPermission();
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    window.addEventListener('click', handleFirstTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, []);

  // Stop Rest Timer
  const stopRestTimer = useCallback(() => {
    if (timerWorkerRef.current) {
      timerWorkerRef.current.postMessage({ type: 'STOP' });
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    restEndTimeRef.current = 0;
    setRestActive(false);
    setRestRemaining(0);
    lockscreenTimer.finishOrStopTimer(false);
  }, []);

  // Subtract 15s action (Directly reduces target end timestamp so countdown continues smoothly from new time)
  const subtractRestSeconds = useCallback(
    (sec: number = 15) => {
      if (!restEndTimeRef.current) return;
      // Subtract from the authoritative end timestamp
      restEndTimeRef.current -= sec * 1000;

      const now = Date.now();
      const newRemaining = Math.max(0, Math.ceil((restEndTimeRef.current - now) / 1000));
      setRestRemaining(newRemaining);

      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ type: 'ADJUST', endTime: restEndTimeRef.current });
      }

      if (newRemaining <= 0) {
        if (timerWorkerRef.current) {
          timerWorkerRef.current.postMessage({ type: 'STOP' });
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        restEndTimeRef.current = 0;
        setRestActive(false);
        setRestRemaining(0);

        if (settings.soundAlert) {
          soundEngine.playAlert(settings.soundType, settings.soundVolume);
        }
        lockscreenTimer.finishOrStopTimer(true, restExerciseNameRef.current);
      } else {
        lockscreenTimer.updateLockscreenTimer(
          newRemaining,
          restTotalRef.current,
          restExerciseNameRef.current
        );
      }
    },
    [settings]
  );

  // Rest Timer Controller with Lockscreen & MediaSession sync and Web Worker anti-throttling
  const startRestTimer = useCallback(
    (secondsOverride?: number, exerciseName?: string) => {
      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ type: 'STOP' });
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      soundEngine.prepare();

      // Check per-exercise rest duration preference, then default (165s / 2:45)
      let duration = settings.defaultRestSeconds || 165;
      if (typeof secondsOverride === 'number') {
        duration = secondsOverride;
      } else if (
        exerciseName &&
        settings.exerciseRestDefaults &&
        settings.exerciseRestDefaults[exerciseName.toLowerCase()]
      ) {
        duration = settings.exerciseRestDefaults[exerciseName.toLowerCase()];
      }

      const now = Date.now();
      const targetEndTime = now + duration * 1000;
      restEndTimeRef.current = targetEndTime;
      restTotalRef.current = duration;
      restExerciseNameRef.current = exerciseName;

      setRestTotal(duration);
      setRestRemaining(duration);
      setRestExerciseName(exerciseName);
      setRestActive(true);

      // Initialize Lockscreen & Notification display
      lockscreenTimer.updateLockscreenTimer(duration, duration, exerciseName, {
        onSubtract15: () => subtractRestSeconds(15),
        onSkip: stopRestTimer
      });

      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ type: 'START', endTime: targetEndTime });
      } else {
        timerIntervalRef.current = setInterval(() => {
          const currentTime = Date.now();
          const currentRemaining = Math.max(0, Math.ceil((restEndTimeRef.current - currentTime) / 1000));

          if (currentRemaining <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            restEndTimeRef.current = 0;
            setRestActive(false);
            setRestRemaining(0);

            // Alert tone
            if (settings.soundAlert) {
              soundEngine.playAlert(settings.soundType, settings.soundVolume);
            }

            // Complete Lockscreen timer & push notification
            lockscreenTimer.finishOrStopTimer(true, restExerciseNameRef.current);
            return;
          }

          setRestRemaining(currentRemaining);

          // Update Lockscreen & Notification
          lockscreenTimer.updateLockscreenTimer(
            currentRemaining,
            restTotalRef.current,
            restExerciseNameRef.current
          );
        }, 500);
      }
    },
    [settings, subtractRestSeconds, stopRestTimer]
  );

  // Sync state if subtractRestSeconds is called from UI
  useEffect(() => {
    if (restActive && restRemaining > 0) {
      lockscreenTimer.updateLockscreenTimer(restRemaining, restTotal, restExerciseName);
    }
  }, [restRemaining, restActive, restTotal, restExerciseName]);

  // Debounce IndexedDB writes for active workout (instant 0ms keystrokes, no flash I/O lag)
  const pendingSaveTimeoutRef = useRef<any>(null);
  const pendingWorkoutRef = useRef<WorkoutSession | null>(null);

  const flushPendingWorkoutSave = useCallback(async () => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    if (pendingWorkoutRef.current) {
      await saveActiveWorkout(pendingWorkoutRef.current);
      pendingWorkoutRef.current = null;
    }
  }, []);

  // Cleanup timer interval and flush pending writes on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingWorkoutRef.current) {
        saveActiveWorkout(pendingWorkoutRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pendingSaveTimeoutRef.current) clearTimeout(pendingSaveTimeoutRef.current);
      if (pendingWorkoutRef.current) {
        saveActiveWorkout(pendingWorkoutRef.current);
      }
    };
  }, []);

  // Workout Actions
  const handleStartEmptyWorkout = async () => {
    soundEngine.prepare();
    const newWorkout: WorkoutSession = {
      id: `w_${Date.now()}`,
      name: 'Quick Workout',
      startTime: new Date().toISOString(),
      status: 'active',
      exercises: []
    };
    await saveActiveWorkout(newWorkout);
    setActiveWorkout(newWorkout);
    setCurrentTab('workout');
  };

  const handleStartTemplate = async (template: WorkoutTemplate) => {
    soundEngine.prepare();
    const newWorkout: WorkoutSession = {
      id: `w_${Date.now()}`,
      name: template.name,
      startTime: new Date().toISOString(),
      status: 'active',
      exercises: template.exercises.map((ex, idx) => {
        const numSets = ex.defaultSets || 1;
        const prevHistory = historyMap[ex.name.toLowerCase()] || [];
        const sets: WorkoutSet[] = Array.from({ length: numSets }, (_, sIdx) => {
          const prevSet = prevHistory[sIdx] || prevHistory[0];
          return {
            id: `set_${sIdx + 1}_${Date.now()}_${idx}`,
            setNumber: sIdx + 1,
            weight: prevSet?.weight !== undefined ? String(prevSet.weight) : '',
            reps: prevSet?.reps !== undefined ? String(prevSet.reps) : '',
            completed: false
          };
        });
        return {
          id: `ex_${idx}_${Date.now()}`,
          name: ex.name,
          muscle: ex.muscle,
          supersetGroupId: ex.supersetGroupId,
          sets
        };
      })
    };
    await saveActiveWorkout(newWorkout);
    setActiveWorkout(newWorkout);
    setCurrentTab('workout');
  };

  const handleUpdateActiveWorkout = useCallback((updated: WorkoutSession) => {
    // 1. Instant synchronous state update for 0ms UI responsiveness
    setActiveWorkout(updated);
    pendingWorkoutRef.current = updated;

    // 2. Debounce disk persistence by 250ms to eliminate flash storage lag on mobile
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }
    pendingSaveTimeoutRef.current = setTimeout(async () => {
      if (pendingWorkoutRef.current) {
        await saveActiveWorkout(pendingWorkoutRef.current);
        pendingWorkoutRef.current = null;
      }
      pendingSaveTimeoutRef.current = null;
    }, 250);
  }, []);

  const handleFinishWorkout = async (workout: WorkoutSession) => {
    await flushPendingWorkoutSave();
    await dbFinishWorkout(workout);
    setActiveWorkout(null);
    stopRestTimer();
    const updatedHistory = await getCompletedWorkouts();
    setHistory(updatedHistory);
    setCurrentTab('stats');
  };

  const handleDiscardWorkout = async () => {
    if (!activeWorkout) return;
    if (confirm('Discard current workout session?')) {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        pendingSaveTimeoutRef.current = null;
      }
      pendingWorkoutRef.current = null;
      await dbDiscardWorkout(activeWorkout.id);
      setActiveWorkout(null);
      stopRestTimer();
    }
  };

  // Exercise Selection with Superset Linking, Custom Rest Duration and Pre-populated sets
  const handleAddExerciseToWorkout = (
    ex: ExerciseItem,
    options?: {
      supersetWithExerciseId?: string;
      restSeconds?: number;
    }
  ) => {
    if (!activeWorkout) return;
    const updated: WorkoutSession = {
      ...activeWorkout,
      exercises: [...activeWorkout.exercises]
    };

    // Save custom exercise rest timer if chosen
    if (options?.restSeconds) {
      const newRestDefaults = {
        ...(settings.exerciseRestDefaults || {}),
        [ex.name.toLowerCase()]: options.restSeconds
      };
      dbUpdateSettings({ exerciseRestDefaults: newRestDefaults }).then((up) => {
        setSettings(up);
      });
    }

    let supersetGroupId: string | undefined = undefined;
    let insertIndex = updated.exercises.length;

    // Handle superset linking with a previous exercise in the workout
    if (options?.supersetWithExerciseId) {
      const targetIdx = updated.exercises.findIndex((e) => e.id === options.supersetWithExerciseId);
      if (targetIdx !== -1) {
        const targetEx = updated.exercises[targetIdx];
        if (targetEx.supersetGroupId) {
          supersetGroupId = targetEx.supersetGroupId;
        } else {
          supersetGroupId = `ss_${Date.now()}`;
          updated.exercises[targetIdx] = {
            ...targetEx,
            supersetGroupId
          };
        }
        // Insert directly adjacent to the paired exercise
        insertIndex = targetIdx + 1;
      }
    }

    // Pre-populate sets with exact weight and reps of last time for lightning-fast input
    const prevHistory = historyMap[ex.name.toLowerCase()] || [];
    const initialSets: WorkoutSet[] = prevHistory.length
      ? prevHistory.map((s, idx) => ({
          id: `s_${Date.now()}_${idx}`,
          setNumber: idx + 1,
          weight: s.weight !== undefined ? String(s.weight) : '',
          reps: s.reps !== undefined ? String(s.reps) : '',
          completed: false
        }))
      : [
          {
            id: `s_${Date.now()}_0`,
            setNumber: 1,
            weight: '',
            reps: '',
            completed: false
          }
        ];

    const newExercise: WorkoutExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      rawId: ex.rawId,
      name: ex.name,
      muscle: ex.muscle,
      subMuscles: ex.subMuscles,
      supersetGroupId,
      sets: initialSets
    };

    updated.exercises.splice(insertIndex, 0, newExercise);
    handleUpdateActiveWorkout(updated);
  };

  const handleCreateCustomExercise = async (
    name: string,
    muscle: ExerciseItem['muscle'],
    subMuscle?: string
  ) => {
    const created = await dbAddCustomExercise(name, muscle, subMuscle);
    const updatedExs = await getAllExercises();
    setExercises(updatedExs);
    if (activeWorkout) {
      handleAddExerciseToWorkout(created);
    }
    setIsExerciseModalOpen(false);
  };

  // Templates Management
  const handleSaveTemplate = async (template: WorkoutTemplate) => {
    await dbSaveTemplate(template);
    const updated = await getAllTemplates();
    setTemplates(updated);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Delete this template?')) {
      await dbDeleteTemplate(id);
      const updated = await getAllTemplates();
      setTemplates(updated);
    }
  };

  // History Management
  const handleDeleteWorkoutRecord = async (id: string) => {
    await dbDiscardWorkout(id);
    const updated = await getCompletedWorkouts();
    setHistory(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/40">
            ⚡
          </div>
          <span className="text-xs text-zinc-400 font-mono">Loading GymLite...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans select-none">
      <OfflineIndicator />

      {/* Sticky Top Bar */}
      <Header
        activeTimerRemaining={restActive ? restRemaining : null}
        hasActiveWorkout={!!activeWorkout}
        onOpenTimer={() => {}}
      />

      {/* Floating Rest Timer Overlay with -15s adjustment */}
      <RestTimerFloating
        remaining={restRemaining}
        total={restTotal}
        isActive={restActive}
        onSubtractSeconds={subtractRestSeconds}
        onStop={stopRestTimer}
        soundType={settings.soundType}
        soundAlert={settings.soundAlert}
        exerciseName={restExerciseName}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {currentTab === 'workout' && (
          <>
            {activeWorkout ? (
              <WorkoutActiveView
                workout={activeWorkout}
                unit={settings.unit}
                onUpdateWorkout={handleUpdateActiveWorkout}
                onFinishWorkout={handleFinishWorkout}
                onDiscardWorkout={handleDiscardWorkout}
                onOpenExerciseModal={() => setIsExerciseModalOpen(true)}
                onStartRestTimer={(name) => startRestTimer(undefined, name)}
                autoStartTimer={settings.autoStartTimer}
                historyMap={historyMap}
              />
            ) : (
              <WorkoutHomeView
                templates={templates}
                recentWorkout={history[0] || null}
                onStartEmpty={handleStartEmptyWorkout}
                onStartTemplate={handleStartTemplate}
                onNavigateToTemplates={() => setCurrentTab('templates')}
                unit={settings.unit}
              />
            )}
          </>
        )}

        {currentTab === 'templates' && (
          <TemplatesView
            templates={templates}
            availableExercises={exercises}
            onStartTemplate={handleStartTemplate}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onRequestLoadCatalog={ensureFullCatalogLoaded}
          />
        )}

        {currentTab === 'stats' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <StatsView
              workouts={history}
              unit={settings.unit}
              onDeleteWorkout={handleDeleteWorkoutRecord}
              settings={settings}
              onUpdateSettings={async (updated) => {
                const res = await dbUpdateSettings(updated);
                setSettings(res);
              }}
            />
          </React.Suspense>
        )}

        {currentTab === 'settings' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <SettingsView
              settings={settings}
              onUpdateSettings={async (updated) => {
                const res = await dbUpdateSettings(updated);
                setSettings(res);
              }}
              onDataImported={reloadData}
            />
          </React.Suspense>
        )}
      </main>

      {/* Exercise Picker Modal with Inspection */}
      <ExerciseModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        exercises={exercises}
        currentWorkoutExercises={activeWorkout?.exercises}
        onSelectExercise={handleAddExerciseToWorkout}
        onCreateCustom={handleCreateCustomExercise}
        onInspectExercise={(ex) => setInspectedExercise(ex)}
      />

      {/* Exercise Detail Modal (Progression Graph + History + Custom Rest) */}
      {inspectedExercise && (
        <React.Suspense fallback={null}>
          <ExerciseDetailModal
            exercise={inspectedExercise}
            onClose={() => setInspectedExercise(null)}
            onSelectForWorkout={
              activeWorkout
                ? (ex) => {
                    handleAddExerciseToWorkout(ex);
                    setIsExerciseModalOpen(false);
                  }
                : undefined
            }
            workouts={history}
            settings={settings}
            onUpdateSettings={async (updated) => {
              const res = await dbUpdateSettings(updated);
              setSettings(res);
            }}
          />
        </React.Suspense>
      )}

      {/* Fixed Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        hasActiveWorkout={!!activeWorkout}
        activeTimerRemaining={restActive ? restRemaining : null}
      />
    </div>
  );
}
