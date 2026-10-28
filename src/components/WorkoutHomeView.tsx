import React from 'react';
import { WorkoutTemplate, WorkoutSession } from '../lib/db';
import { Play, Plus, Dumbbell, Clock, Flame, ChevronRight } from 'lucide-react';

interface WorkoutHomeViewProps {
  templates: WorkoutTemplate[];
  recentWorkout: WorkoutSession | null;
  onStartEmpty: () => void;
  onStartTemplate: (template: WorkoutTemplate) => void;
  onNavigateToTemplates: () => void;
  unit?: string;
}

export const WorkoutHomeView: React.FC<WorkoutHomeViewProps> = ({
  templates,
  recentWorkout,
  onStartEmpty,
  onStartTemplate,
  onNavigateToTemplates,
  unit
}) => {
  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Quick Launch Hero */}
      <div className="bg-gradient-to-b from-[#18181b] to-[#121214] border border-[#27272a] rounded-3xl p-6 mb-6 text-center shadow-lg relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center font-bold text-xl mb-3 border border-emerald-500/20">
          ⚡
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Ready to Train?</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
          Instant cold boot, 100% offline, zero clutter. Start logging immediately.
        </p>

        <div className="mt-5">
          <button
            onClick={onStartEmpty}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Empty Workout
          </button>
        </div>
      </div>

      {/* Last Session Snapshot (if any) */}
      {recentWorkout && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Previous Session
            </span>
            <span className="text-xs text-zinc-500">
              {new Date(recentWorkout.startTime).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-white">{recentWorkout.name}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono">
                <span>{recentWorkout.exercises.length} Exercises</span>
                <span>·</span>
                <span>
                  {recentWorkout.exercises.reduce(
                    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
                    0
                  )}{' '}
                  Sets
                </span>
              </div>
            </div>
            <button
              onClick={() => onStartEmpty()}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
            >
              Train Again
            </button>
          </div>
        </div>
      )}

      {/* Routine Templates */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Quick Routines ({templates.length})
          </span>
          <button
            onClick={onNavigateToTemplates}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5"
          >
            Manage All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {templates.slice(0, 4).map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => onStartTemplate(tmpl)}
              className="bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-zinc-700 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition group active:scale-[0.99]"
            >
              <div className="pr-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {tmpl.exercises.length} ex
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate mt-1">
                  {tmpl.exercises.map((e) => e.name).join(' · ')}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTemplate(tmpl);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-black font-semibold text-xs flex items-center gap-1 transition shrink-0"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
