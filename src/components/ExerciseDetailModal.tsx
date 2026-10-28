import React, { useState, useEffect, useMemo } from 'react';
import { X, Timer, Trophy, Dumbbell, History, Flame, ArrowUpRight, Check } from 'lucide-react';
import { ExerciseItem, WorkoutSession, AppSettings } from '../lib/db';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { ExerciseProgressionChart, ProgressionDataPoint } from './ExerciseProgressionChart';

interface ExerciseDetailModalProps {
  exercise: ExerciseItem | null;
  onClose: () => void;
  onSelectForWorkout?: (exercise: ExerciseItem) => void;
  workouts: WorkoutSession[];
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  onClose,
  onSelectForWorkout,
  workouts,
  settings,
  onUpdateSettings
}) => {
  if (!exercise) return null;

  // Custom rest duration for this exercise (defaults to app default e.g. 165s / 2:45)
  const exerciseKey = exercise.name.toLowerCase();
  const currentRestDuration = settings.exerciseRestDefaults?.[exerciseKey] ?? settings.defaultRestSeconds ?? 165;
  const [selectedRest, setSelectedRest] = useState<number>(currentRestDuration);
  const [savedRestNotice, setSavedRestNotice] = useState(false);

  const handleRestChange = (seconds: number) => {
    setSelectedRest(seconds);
    const updated = {
      ...(settings.exerciseRestDefaults || {}),
      [exerciseKey]: seconds
    };
    onUpdateSettings({ exerciseRestDefaults: updated });
    setSavedRestNotice(true);
    setTimeout(() => setSavedRestNotice(false), 2000);
  };

  // Compute history data and progression points for this exercise
  const { progressionData, personalRecord, totalVolume, totalSets, recentLogs } = useMemo(() => {
    const points: ProgressionDataPoint[] = [];
    let prWeight = 0;
    let prReps = 0;
    let prDate = '';
    let maxE1rm = 0;
    let vol = 0;
    let setsCount = 0;

    interface LogItem {
      workoutId: string;
      workoutName: string;
      date: string;
      sets: { weight: number; reps: number; completed: boolean }[];
    }
    const logs: LogItem[] = [];

    // Search all workouts chronologically
    const sortedWorkouts = [...workouts].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (const w of sortedWorkouts) {
      const match = w.exercises.find(
        (e) => e.name.toLowerCase() === exerciseKey || (exercise.rawId && e.rawId === exercise.rawId)
      );
      if (!match) continue;

      const completedSets = match.sets.filter((s) => s.completed && parseFloat(s.weight) > 0);
      if (completedSets.length === 0) continue;

      let maxSessionWeight = 0;
      let maxSessionReps = 0;
      const sessionSets: { weight: number; reps: number; completed: boolean }[] = [];

      for (const s of completedSets) {
        const wt = parseFloat(s.weight) || 0;
        const rp = parseInt(s.reps, 10) || 0;
        if (wt <= 0) continue;

        setsCount++;
        vol += wt * rp;
        sessionSets.push({ weight: wt, reps: rp, completed: true });

        // Estimated 1RM (Epley formula: w * (1 + r/30))
        const e1rm = rp === 1 ? wt : wt * (1 + rp / 30);
        if (e1rm > maxE1rm) {
          maxE1rm = Math.round(e1rm * 10) / 10;
        }

        if (wt > prWeight || (wt === prWeight && rp > prReps)) {
          prWeight = wt;
          prReps = rp;
          prDate = w.startTime;
        }

        if (wt > maxSessionWeight) {
          maxSessionWeight = wt;
          maxSessionReps = rp;
        }
      }

      if (maxSessionWeight > 0) {
        points.push({
          date: w.startTime,
          weight: maxSessionWeight,
          reps: maxSessionReps,
          workoutName: w.name
        });
      }

      if (sessionSets.length > 0) {
        logs.unshift({
          workoutId: w.id,
          workoutName: w.name,
          date: w.startTime,
          sets: sessionSets
        });
      }
    }

    return {
      progressionData: points,
      personalRecord: prWeight > 0 ? { weight: prWeight, reps: prReps, date: prDate, e1rm: maxE1rm } : null,
      totalVolume: Math.round(vol),
      totalSets: setsCount,
      recentLogs: logs
    };
  }, [workouts, exerciseKey, exercise.rawId]);

  const formatRestMinutes = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272a] rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#18181b]">
          <div className="min-w-0 pr-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {exercise.muscle} {exercise.equipment ? `· ${exercise.equipment}` : ''}
            </span>
            <h2 className="text-lg font-bold text-white truncate">{exercise.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Hero: Picture + Tags */}
          <div className="flex gap-4 items-center bg-[#18181b] border border-[#27272a] rounded-2xl p-3">
            <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-[#27272a] bg-zinc-950">
              <ExerciseThumbnail
                rawId={exercise.rawId}
                exerciseName={exercise.name}
                muscle={exercise.muscle}
                size="lg"
                showTapToEnlarge
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[10px] font-semibold text-emerald-300">
                  {exercise.muscle}
                </span>
                {exercise.equipment && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-medium text-zinc-300">
                    {exercise.equipment}
                  </span>
                )}
                {exercise.target && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-800/40 text-[10px] font-medium text-blue-300">
                    Target: {exercise.target}
                  </span>
                )}
              </div>
              {exercise.subMuscles && exercise.subMuscles.length > 0 && (
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  <span className="text-zinc-500">Sub-muscles:</span> {exercise.subMuscles.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Custom Rest Timer Duration for this exercise */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Default Rest Duration for this Exercise</span>
              </div>
              {savedRestNotice && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Custom rest interval automatically starts whenever you complete a set of this exercise.
            </p>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '1:30', sec: 90 },
                { label: '2:00', sec: 120 },
                { label: '2:45', sec: 165 }, // Default
                { label: '3:00', sec: 180 },
                { label: '3:30', sec: 210 },
                { label: '4:00', sec: 240 },
                { label: '5:00', sec: 300 },
                { label: '1:00', sec: 60 }
              ].map((opt) => (
                <button
                  key={opt.sec}
                  onClick={() => handleRestChange(opt.sec)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-mono font-medium transition active:scale-95 border ${
                    selectedRest === opt.sec
                      ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                      : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progression Graph (matching user screenshot) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-[#38bdf8]" /> Progression (kg)
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {progressionData.length} entries
              </span>
            </div>
            <ExerciseProgressionChart
              data={progressionData}
              exerciseName={exercise.name}
              secondaryMuscles={exercise.subMuscles}
              unit="kg"
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Personal Record</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                {personalRecord ? `${personalRecord.weight} kg` : '--'}
              </span>
              {personalRecord && (
                <span className="text-[10px] text-zinc-500 font-mono">× {personalRecord.reps} reps</span>
              )}
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Est. 1RM</span>
              <span className="text-lg font-bold font-mono text-[#38bdf8] mt-0.5 block">
                {personalRecord?.e1rm ? `${personalRecord.e1rm} kg` : '--'}
              </span>
              <span className="text-[10px] text-zinc-500">Max theoretical</span>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Total Volume</span>
              <span className="text-lg font-bold font-mono text-zinc-200 mt-0.5 block">
                {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '--'}
              </span>
              <span className="text-[10px] text-zinc-500">{totalSets} sets</span>
            </div>
          </div>

          {/* History Log Table */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Exercise History</h3>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">No past workouts logged with this exercise yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {recentLogs.map((log) => (
                  <div
                    key={log.workoutId}
                    className="p-2.5 rounded-xl bg-[#09090b] border border-[#27272a] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-medium text-white block">{log.workoutName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(log.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {log.sets.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-zinc-800 text-[11px] font-mono font-medium text-zinc-300"
                        >
                          {s.weight}kg × {s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#18181b] flex gap-2">
          {onSelectForWorkout && (
            <button
              onClick={() => {
                onSelectForWorkout(exercise);
                onClose();
              }}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Dumbbell className="w-4 h-4" />
              Add to Workout
            </button>
          )}
          <button
            onClick={onClose}
            className="py-3 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
