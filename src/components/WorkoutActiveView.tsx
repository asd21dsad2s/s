import React, { useState, useEffect } from 'react';
import { WorkoutSession, WorkoutSet, WorkoutExercise, ExerciseItem } from '../lib/db';
import { soundEngine } from '../lib/audio';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import {
  Plus,
  Trash2,
  Check,
  Timer,
  Award,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  Flame,
  Edit3,
  Dumbbell,
  GripVertical,
  Zap,
  Link2,
  Unlink
} from 'lucide-react';

// Helper to format duration on demand without constant re-renders
export const formatDuration = (startTime: string) => {
  const start = new Date(startTime).getTime();
  const totalSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Isolated clock component: re-renders every 1s internally without re-rendering the whole workout tree
const WorkoutElapsedClock: React.FC<{ startTime: string }> = React.memo(({ startTime }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hrs = Math.floor(elapsedSeconds / 3600);
  const mins = Math.floor((elapsedSeconds % 3600) / 60);
  const secs = elapsedSeconds % 60;
  const formatted = hrs > 0
    ? `${hrs}h ${mins.toString().padStart(2, '0')}m`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1.5">
      <Timer className="w-3.5 h-3.5 text-blue-400" />
      <span className="text-zinc-200">{formatted}</span>
    </div>
  );
});

interface SetRowProps {
  set: WorkoutSet;
  sIdx: number;
  exIdx: number;
  prevSet?: WorkoutSet;
  onSetChange: (exIdx: number, sIdx: number, field: 'weight' | 'reps', value: string) => void;
  onToggleComplete: (exIdx: number, sIdx: number) => void;
}

const MemoizedSetRow: React.FC<SetRowProps> = React.memo(
  ({ set, sIdx, exIdx, prevSet, onSetChange, onToggleComplete }) => {
    const prevLabel = prevSet ? `${prevSet.weight} × ${prevSet.reps}` : '—';
    const isAnomalous = parseFloat(set.weight) > 350;

    return (
      <div
        className={`grid grid-cols-[38px_1fr_1fr_1fr_48px] gap-2 px-3 py-2 items-center ${
          set.completed ? 'bg-blue-950/20' : ''
        }`}
      >
        {/* Set Number */}
        <span className="font-mono text-xs font-semibold text-zinc-400 text-center">
          {sIdx + 1}
        </span>

        {/* Previous Performance */}
        <span className="text-[11px] font-mono text-zinc-500 text-center truncate">
          {prevLabel}
        </span>

        {/* Weight Input - Auto Selects on Focus/Click */}
        <div className="relative">
          <input
            id={`set-weight-${exIdx}-${sIdx}`}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder={prevSet?.weight?.toString() || '0'}
            value={set.weight}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onChange={(e) => onSetChange(exIdx, sIdx, 'weight', e.target.value)}
            className={`w-full text-center py-2 px-1 bg-[#09090b] border rounded-lg text-sm font-semibold font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 ${
              isAnomalous ? 'border-amber-500/80 bg-amber-950/20' : 'border-[#27272a]'
            }`}
          />
          {isAnomalous && (
            <span
              title="Unusually high weight"
              className="absolute -top-1 -right-1 text-[9px] bg-amber-500 text-black font-bold px-1 rounded-full"
            >
              !
            </span>
          )}
        </div>

        {/* Reps Input - Auto Selects on Focus/Click */}
        <div>
          <input
            id={`set-reps-${exIdx}-${sIdx}`}
            type="number"
            inputMode="numeric"
            placeholder={prevSet?.reps?.toString() || '0'}
            value={set.reps}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onChange={(e) => onSetChange(exIdx, sIdx, 'reps', e.target.value)}
            className="w-full text-center py-2 px-1 bg-[#09090b] border border-[#27272a] rounded-lg text-sm font-semibold font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Check Button - Instant High-Contrast Blue Solid Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onToggleComplete(exIdx, sIdx)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              set.completed
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-[#09090b] border border-[#27272a] text-zinc-600 hover:text-zinc-300'
            }`}
            aria-label={`Mark set ${sIdx + 1} complete`}
          >
            <Check className={`w-4 h-4 stroke-[3] ${set.completed ? 'text-white' : ''}`} />
          </button>
        </div>
      </div>
    );
  }
);

interface WorkoutActiveViewProps {
  workout: WorkoutSession;
  unit?: string;
  onUpdateWorkout: (updated: WorkoutSession) => void;
  onFinishWorkout: (workout: WorkoutSession) => void;
  onDiscardWorkout: () => void;
  onOpenExerciseModal: () => void;
  onStartRestTimer: (exerciseName?: string) => void;
  autoStartTimer: boolean;
  historyMap: Record<string, WorkoutSet[]>; // Map of exercise name -> previous sets
}

export const WorkoutActiveView: React.FC<WorkoutActiveViewProps> = ({
  workout,
  unit = 'kg',
  onUpdateWorkout,
  onFinishWorkout,
  onDiscardWorkout,
  onOpenExerciseModal,
  onStartRestTimer,
  autoStartTimer,
  historyMap
}) => {
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [prBanner, setPrBanner] = useState<{ exerciseName: string; weight: string; reps: string } | null>(null);
  const [supersetBanner, setSupersetBanner] = useState<{
    fromName: string;
    toName: string;
    targetSetNum: number;
  } | null>(null);

  // Drag and touch state for reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const touchStartYRef = React.useRef<number>(0);
  const touchActiveIdxRef = React.useRef<number | null>(null);

  const handleSetChange = (exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', val: string) => {
    const updated = { ...workout };
    const set = updated.exercises[exerciseIdx].sets[setIdx];
    set[field] = val;
    onUpdateWorkout(updated);
  };

  const handleToggleComplete = (exerciseIdx: number, setIdx: number) => {
    soundEngine.prepare();

    const updated = { ...workout };
    const ex = updated.exercises[exerciseIdx];
    const set = ex.sets[setIdx];
    const wasCompleted = set.completed;
    set.completed = !wasCompleted;

    // If user marked as completed and values are empty, auto-fill from previous set or default
    if (!wasCompleted) {
      if (!set.weight && setIdx > 0) set.weight = ex.sets[setIdx - 1].weight;
      if (!set.reps && setIdx > 0) set.reps = ex.sets[setIdx - 1].reps;

      // PR Detection Check
      const currentWeight = parseFloat(set.weight) || 0;
      const currentReps = parseInt(set.reps, 10) || 0;

      if (currentWeight > 0 && currentReps > 0) {
        const pastSets = historyMap[ex.name.toLowerCase()] || [];
        let maxPastWeight = 0;
        let maxPastRepsAtWeight = 0;

        for (const ps of pastSets) {
          const pw = parseFloat(ps.weight) || 0;
          const pr = parseInt(ps.reps, 10) || 0;
          if (pw > maxPastWeight) {
            maxPastWeight = pw;
          }
          if (pw === currentWeight && pr > maxPastRepsAtWeight) {
            maxPastRepsAtWeight = pr;
          }
        }

        const isNewWeightPR = currentWeight > maxPastWeight && maxPastWeight > 0;
        const isNewRepPR = currentWeight === maxPastWeight && currentReps > maxPastRepsAtWeight && maxPastRepsAtWeight > 0;

        if (isNewWeightPR || isNewRepPR) {
          setPrBanner({
            exerciseName: ex.name,
            weight: set.weight,
            reps: set.reps
          });
          soundEngine.playAlert('chime', 0.85);
          setTimeout(() => setPrBanner(null), 3500);
        }
      }

      // Check for Superset Linking
      let shouldTriggerRestTimer = autoStartTimer;

      if (ex.supersetGroupId) {
        const companionIdx = updated.exercises.findIndex(
          (otherEx, oIdx) => oIdx !== exerciseIdx && otherEx.supersetGroupId === ex.supersetGroupId
        );

        if (companionIdx !== -1) {
          const companionEx = updated.exercises[companionIdx];
          // Look for companion's set at the same set index, or first incomplete set
          const companionTargetSet =
            companionEx.sets[setIdx] || companionEx.sets.find((s) => !s.completed);

          if (companionTargetSet && !companionTargetSet.completed) {
            // DO NOT start rest timer yet! Superset requires companion exercise completion
            shouldTriggerRestTimer = false;

            setSupersetBanner({
              fromName: ex.name,
              toName: companionEx.name,
              targetSetNum: companionTargetSet.setNumber
            });
            setTimeout(() => setSupersetBanner(null), 3500);

            // Automatically jump and scroll to the companion exercise input!
            setTimeout(() => {
              const targetInput = document.getElementById(
                `set-weight-${companionIdx}-${companionTargetSet.setNumber - 1}`
              );
              if (targetInput) {
                targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetInput.focus();
                (targetInput as HTMLInputElement).select();
              }
            }, 120);
          }
        }
      }

      // Auto-start rest timer only when both exercises in the superset pair are done
      if (shouldTriggerRestTimer) {
        onStartRestTimer(ex.name);
      }
    }

    onUpdateWorkout(updated);
  };

  const handleToggleSuperset = (exerciseIdx: number) => {
    const updated = { ...workout };
    const ex = updated.exercises[exerciseIdx];

    if (ex.supersetGroupId) {
      // Unlink all exercises with this group id
      const gid = ex.supersetGroupId;
      updated.exercises.forEach((e) => {
        if (e.supersetGroupId === gid) {
          delete e.supersetGroupId;
        }
      });
    } else {
      // Link with next exercise if available
      if (exerciseIdx < updated.exercises.length - 1) {
        const nextEx = updated.exercises[exerciseIdx + 1];
        const newGroupId = `ss_${Date.now()}`;
        ex.supersetGroupId = newGroupId;
        nextEx.supersetGroupId = newGroupId;
      }
    }
    onUpdateWorkout(updated);
  };

  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= workout.exercises.length ||
      toIdx >= workout.exercises.length
    )
      return;
    const updated = { ...workout };
    const [removed] = updated.exercises.splice(fromIdx, 1);
    updated.exercises.splice(toIdx, 0, removed);
    onUpdateWorkout(updated);
  };

  const handleMoveExercise = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    handleReorder(fromIdx, toIdx);
  };

  const handleAddSet = (exerciseIdx: number) => {
    const updated = { ...workout };
    const ex = updated.exercises[exerciseIdx];
    const prevSet = ex.sets[ex.sets.length - 1];

    const newSet: WorkoutSet = {
      id: `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      setNumber: ex.sets.length + 1,
      weight: prevSet ? prevSet.weight : '',
      reps: prevSet ? prevSet.reps : '',
      completed: false
    };

    ex.sets.push(newSet);
    onUpdateWorkout(updated);
  };

  const handleRemoveSet = (exerciseIdx: number, setIdx: number) => {
    const updated = { ...workout };
    const ex = updated.exercises[exerciseIdx];
    ex.sets.splice(setIdx, 1);
    ex.sets.forEach((s, idx) => {
      s.setNumber = idx + 1;
    });
    onUpdateWorkout(updated);
  };

  const handleRemoveExercise = (exerciseIdx: number) => {
    if (confirm(`Remove ${workout.exercises[exerciseIdx].name}?`)) {
      const updated = { ...workout };
      updated.exercises.splice(exerciseIdx, 1);
      onUpdateWorkout(updated);
    }
  };

  // Calculations
  const completedSetsCount = workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  const totalVolume = workout.exercises.reduce((acc, ex) => {
    return (
      acc +
      ex.sets.reduce((setAcc, s) => {
        if (!s.completed) return setAcc;
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        return setAcc + w * r;
      }, 0)
    );
  }, 0);

  // Check for anomalous sets (e.g., > 350kg or > 80 reps)
  const hasAnomalousSet = workout.exercises.some((ex) =>
    ex.sets.some((s) => s.completed && (parseFloat(s.weight) > 350 || parseInt(s.reps, 10) > 80))
  );

  const triggerFinish = () => {
    onFinishWorkout(workout);
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-3 relative">
      {/* Discrete Golden PR Notification Badge */}
      {prBanner && (
        <div className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gradient-to-r from-amber-950/95 to-zinc-900 border border-amber-500/50 text-amber-200 px-3.5 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">🏆</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/30">
                    NEW PR
                  </span>
                  <span className="text-xs font-bold text-white truncate">{prBanner.exerciseName}</span>
                </div>
                <p className="text-[11px] font-mono font-medium text-amber-300/90 mt-0.5">
                  {prBanner.weight} kg × {prBanner.reps} reps
                </p>
              </div>
            </div>
            <button
              onClick={() => setPrBanner(null)}
              className="p-1 rounded text-amber-400/70 hover:text-amber-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Superset Auto-Jump Notification Toast */}
      {supersetBanner && (
        <div className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto">
          <div className="bg-[#18181b] border border-blue-500/60 text-blue-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">⚡</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/40">
                    SUPERSET JUMP
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    Next: {supersetBanner.toName}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-blue-300/90 mt-0.5">
                  Complete Set {supersetBanner.targetSetNum} before rest timer!
                </p>
              </div>
            </div>
            <button
              onClick={() => setSupersetBanner(null)}
              className="p-1 rounded text-blue-400/70 hover:text-blue-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Workout Top Card */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <input
            type="text"
            value={workout.name}
            onChange={(e) => onUpdateWorkout({ ...workout, name: e.target.value })}
            className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-blue-500 focus:outline-none w-full"
            placeholder="Workout Title"
          />
          <button
            onClick={onDiscardWorkout}
            className="text-xs text-red-400/80 hover:text-red-400 hover:bg-red-950/30 px-2.5 py-1.5 rounded-lg shrink-0"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
          <WorkoutElapsedClock startTime={workout.startTime} />
          <span>·</span>
          <span>{completedSetsCount} sets completed</span>
          <span>·</span>
          <span>
            {Math.round(totalVolume).toLocaleString()} {unit} vol
          </span>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        {workout.exercises.map((ex, exIdx) => {
          const prevSets = historyMap[ex.name.toLowerCase()] || [];
          const isSuperset = !!ex.supersetGroupId;
          const isLinkedWithNext =
            isSuperset &&
            exIdx < workout.exercises.length - 1 &&
            workout.exercises[exIdx + 1]?.supersetGroupId === ex.supersetGroupId;
          const isLinkedWithPrev =
            isSuperset &&
            exIdx > 0 &&
            workout.exercises[exIdx - 1]?.supersetGroupId === ex.supersetGroupId;

          return (
            <div
              key={ex.id || exIdx}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverIdx !== exIdx) setDragOverIdx(exIdx);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && draggedIdx !== exIdx) {
                  handleReorder(draggedIdx, exIdx);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}
              className={`rounded-2xl overflow-hidden ${
                dragOverIdx === exIdx ? 'border-2 border-blue-400' : 'border border-[#27272a]'
              } ${
                isSuperset
                  ? 'border-l-4 border-l-blue-500 bg-[#18181b]'
                  : 'bg-[#18181b]'
              }`}
            >
              {/* Exercise Header */}
              <div className="px-3.5 py-2.5 bg-[#202024] flex items-center justify-between border-b border-[#27272a] gap-2">
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {/* Drag Grip Handle */}
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(exIdx));
                      setDraggedIdx(exIdx);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onTouchStart={(e) => {
                      touchStartYRef.current = e.touches[0].clientY;
                      touchActiveIdxRef.current = exIdx;
                    }}
                    onTouchMove={(e) => {
                      if (touchActiveIdxRef.current === null) return;
                      const currentY = e.touches[0].clientY;
                      const diffY = currentY - touchStartYRef.current;
                      if (diffY > 45 && exIdx < workout.exercises.length - 1) {
                        handleReorder(exIdx, exIdx + 1);
                        touchStartYRef.current = currentY;
                      } else if (diffY < -45 && exIdx > 0) {
                        handleReorder(exIdx, exIdx - 1);
                        touchStartYRef.current = currentY;
                      }
                    }}
                    onTouchEnd={() => {
                      touchActiveIdxRef.current = null;
                    }}
                    className="cursor-grab active:cursor-grabbing p-1 text-zinc-500 hover:text-zinc-200 touch-none flex items-center justify-center shrink-0"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#27272a] bg-zinc-950 shrink-0">
                    <ExerciseThumbnail
                      rawId={ex.rawId}
                      exerciseName={ex.name}
                      muscle={ex.muscle as any}
                      size="sm"
                      showTapToEnlarge
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-white text-sm tracking-tight truncate">{ex.name}</h3>
                      {isSuperset && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-blue-400 text-blue-400" />
                          SS
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {ex.muscle}
                      {ex.subMuscles && ex.subMuscles.length > 0 ? (
                        <span className="text-blue-400/90 ml-1">· {ex.subMuscles.join(', ')}</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Move Up Button */}
                  <button
                    onClick={() => handleMoveExercise(exIdx, 'up')}
                    disabled={exIdx === 0}
                    className={`p-1.5 rounded-lg transition ${
                      exIdx === 0
                        ? 'text-zinc-700 cursor-not-allowed opacity-30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95'
                    }`}
                    title="Move Up"
                    aria-label="Move exercise up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  {/* Move Down Button */}
                  <button
                    onClick={() => handleMoveExercise(exIdx, 'down')}
                    disabled={exIdx === workout.exercises.length - 1}
                    className={`p-1.5 rounded-lg transition ${
                      exIdx === workout.exercises.length - 1
                        ? 'text-zinc-700 cursor-not-allowed opacity-30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95'
                    }`}
                    title="Move Down"
                    aria-label="Move exercise down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Remove Exercise */}
                  <button
                    onClick={() => handleRemoveExercise(exIdx)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
                    title="Remove Exercise"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Column Headers */}
              <div className="grid grid-cols-[38px_1fr_1fr_1fr_48px] gap-2 px-3 py-2 text-[11px] font-semibold text-zinc-400 border-b border-[#27272a]/60 text-center">
                <span>SET</span>
                <span>PREV</span>
                <span>{unit}</span>
                <span>REPS</span>
                <span>DONE</span>
              </div>

              {/* Sets Rows */}
              <div className="divide-y divide-[#27272a]/40">
                {ex.sets.map((set, sIdx) => (
                  <MemoizedSetRow
                    key={set.id || sIdx}
                    set={set}
                    sIdx={sIdx}
                    exIdx={exIdx}
                    prevSet={prevSets[sIdx]}
                    onSetChange={handleSetChange}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>

              {/* Set Actions Bar */}
              <div className="p-3 bg-[#18181b] border-t border-[#27272a]/60 flex items-center justify-between">
                <button
                  onClick={() => handleAddSet(exIdx)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Set
                </button>

                {ex.sets.length > 1 && (
                  <button
                    onClick={() => handleRemoveSet(exIdx, ex.sets.length - 1)}
                    className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1 transition"
                  >
                    Delete Last Set
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Buttons */}
      <div className="mt-6 space-y-2.5">
        <button
          onClick={onOpenExerciseModal}
          className="w-full h-12 rounded-xl bg-[#18181b] hover:bg-zinc-800 border border-[#27272a] text-white font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          Add Exercise
        </button>

        <button
          onClick={() => setShowFinishModal(true)}
          className="w-full h-13 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4" />
          Finish Workout ({completedSetsCount} Sets Done)
        </button>
      </div>

      {/* Finish Workout Review & Fix Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90">
          <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-2xl p-5 text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Review & Finish Workout</h3>
                  <p className="text-xs text-zinc-400">{workout.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowFinishModal(false)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Set Review Section */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {hasAnomalousSet && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-200">High Weight Detected!</span>
                    One or more sets has a weight over 350 kg (e.g. accidental 5000 kg). Verify and correct
                    below before saving.
                  </div>
                </div>
              )}

              {/* Review KPI row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] text-center">
                  <span className="text-[10px] text-zinc-400">Duration</span>
                  <p className="text-sm font-bold font-mono text-white mt-0.5">
                    {formatDuration(workout.startTime)}
                  </p>
                </div>
                <div className="bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] text-center">
                  <span className="text-[10px] text-zinc-400">Sets Done</span>
                  <p className="text-sm font-bold font-mono text-blue-400 mt-0.5">
                    {completedSetsCount} sets
                  </p>
                </div>
                <div className="bg-[#09090b] p-2.5 rounded-xl border border-[#27272a] text-center">
                  <span className="text-[10px] text-zinc-400">Total Volume</span>
                  <p className="text-sm font-bold font-mono text-white mt-0.5">
                    {Math.round(totalVolume).toLocaleString()} {unit}
                  </p>
                </div>
              </div>

              {/* Editable sets table for quick corrections */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Verify / Edit Sets
                  </span>
                  <span className="text-[10px] text-zinc-500">Edit any typos before save</span>
                </div>

                {workout.exercises.map((ex, exIdx) => {
                  const completedSets = ex.sets.filter((s) => s.completed);
                  if (completedSets.length === 0) return null;

                  return (
                    <div
                      key={exIdx}
                      className="bg-[#09090b] border border-[#27272a] rounded-2xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate">{ex.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {completedSets.length} sets
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {ex.sets.map((set, sIdx) => {
                          if (!set.completed) return null;
                          const isHigh = parseFloat(set.weight) > 350;

                          return (
                            <div
                              key={sIdx}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                                isHigh
                                  ? 'bg-amber-950/30 border-amber-500/50'
                                  : 'bg-[#18181b] border-[#27272a]'
                              }`}
                            >
                              <span className="text-[11px] font-mono text-zinc-400 w-12 text-center">
                                Set {sIdx + 1}
                              </span>

                              {/* Editable Weight */}
                              <div className="flex-1 flex items-center gap-1">
                                <input
                                  type="number"
                                  value={set.weight}
                                  onChange={(e) =>
                                    handleSetChange(exIdx, sIdx, 'weight', e.target.value)
                                  }
                                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg py-1 px-2 text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono">kg</span>
                              </div>

                              <span className="text-zinc-600 text-xs">×</span>

                              {/* Editable Reps */}
                              <div className="w-16 flex items-center gap-1">
                                <input
                                  type="number"
                                  value={set.reps}
                                  onChange={(e) =>
                                    handleSetChange(exIdx, sIdx, 'reps', e.target.value)
                                  }
                                  className="w-full bg-[#09090b] border border-[#27272a] rounded-lg py-1 px-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-[10px] text-zinc-500 font-mono">reps</span>
                              </div>

                              {/* Remove Set */}
                              <button
                                onClick={() => handleRemoveSet(exIdx, sIdx)}
                                className="p-1 text-zinc-500 hover:text-red-400 rounded"
                                title="Delete set"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3 border-t border-[#27272a]">
              <button
                onClick={triggerFinish}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl"
              >
                Confirm & Save Workout
              </button>
              <button
                onClick={() => setShowFinishModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-xl"
              >
                Back to Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
