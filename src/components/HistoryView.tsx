import React, { useState } from 'react';
import { WorkoutSession } from '../lib/db';
import { Calendar, Trash2, Trophy, Clock, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';

interface HistoryViewProps {
  workouts: WorkoutSession[];
  unit: 'KG' | 'LBS';
  onDeleteWorkout: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ workouts, unit, onDeleteWorkout }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute personal records across all history (estimated 1RM = weight * (1 + reps / 30))
  const personalRecords = React.useMemo(() => {
    const prMap: Record<string, { weight: number; reps: number; oneRm: number; date: string }> = {};

    workouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (!s.completed) return;
          const weight = parseFloat(s.weight) || 0;
          const reps = parseInt(s.reps, 10) || 0;
          if (weight <= 0 || reps <= 0) return;

          const oneRm = reps === 1 ? weight : weight * (1 + reps / 30);
          const existing = prMap[ex.name];

          if (!existing || oneRm > existing.oneRm) {
            prMap[ex.name] = {
              weight,
              reps,
              oneRm: Math.round(oneRm * 10) / 10,
              date: w.startTime
            };
          }
        });
      });
    });

    return Object.entries(prMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.oneRm - a.oneRm)
      .slice(0, 4); // Top 4 key lifts
  }, [workouts]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return null;
    const diffSecs = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
    const mins = Math.floor(diffSecs / 60);
    return `${mins} min`;
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* PR Highlights Bar */}
      {personalRecords.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2.5 px-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Personal Records (Estimated 1RM)
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {personalRecords.map((pr) => (
              <div
                key={pr.name}
                className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3 shadow-sm"
              >
                <p className="text-xs font-semibold text-white truncate">{pr.name}</p>
                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {pr.oneRm}
                  </span>
                  <span className="text-[11px] text-zinc-400">{unit}</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                  Lifted: {pr.weight} {unit} × {pr.reps}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workouts History Feed */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Workout Logs ({workouts.length})
          </h2>
        </div>

        {workouts.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 text-center">
            <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="font-semibold text-white text-sm">No workouts logged yet</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Complete your first workout to track volume and personal records.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => {
              const isExpanded = expandedId === w.id;
              const dateStr = new Date(w.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });
              const duration = calculateDuration(w.startTime, w.endTime);

              const totalCompletedSets = w.exercises.reduce(
                (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
                0
              );

              const volume = w.exercises.reduce((acc, ex) => {
                return (
                  acc +
                  ex.sets.reduce((setAcc, s) => {
                    if (!s.completed) return setAcc;
                    return setAcc + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                  }, 0)
                );
              }, 0);

              return (
                <div
                  key={w.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden transition shadow-sm"
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpand(w.id)}
                    className="p-4 cursor-pointer hover:bg-zinc-800/20 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{w.name}</h3>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {dateStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 font-mono">
                        <span>{totalCompletedSets} sets</span>
                        <span>·</span>
                        <span>{Math.round(volume).toLocaleString()} {unit}</span>
                        {duration && (
                          <>
                            <span>·</span>
                            <span>{duration}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this workout log?')) {
                            onDeleteWorkout(w.id);
                          }
                        }}
                        className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg transition"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#27272a] text-xs space-y-3">
                      {w.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="bg-[#09090b] p-3 rounded-xl border border-[#27272a]/60">
                          <div className="flex items-center justify-between mb-1.5 font-semibold text-white">
                            <span>{ex.name}</span>
                            <span className="text-[10px] text-zinc-400 font-normal">{ex.muscle}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 space-y-0.5 font-mono">
                            {ex.sets
                              .filter((s) => s.completed)
                              .map((s, idx) => (
                                <div key={idx} className="flex justify-between py-0.5 border-b border-zinc-900 last:border-none">
                                  <span>Set {idx + 1}</span>
                                  <span className="text-zinc-200">
                                    {s.weight} {unit} × {s.reps} reps
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
