import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Dumbbell, Filter, ChevronRight, Zap, Clock, Minus } from 'lucide-react';
import { ExerciseItem } from '../lib/db';
import { ExerciseThumbnail } from './ExerciseThumbnail';

export interface AddExerciseOptions {
  supersetWithExerciseId?: string;
  restSeconds?: number;
}

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: ExerciseItem[];
  currentWorkoutExercises?: { id: string; name: string; muscle: string }[];
  onSelectExercise: (exercise: ExerciseItem, options?: AddExerciseOptions) => void;
  onCreateCustom: (name: string, muscle: ExerciseItem['muscle'], subMuscle?: string) => void;
  onInspectExercise?: (exercise: ExerciseItem) => void;
}

const MUSCLE_GROUPS: (ExerciseItem['muscle'] | 'All')[] = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full Body'
];

export const SUB_MUSCLE_MAP: Record<string, string[]> = {
  Back: ['All Back', 'Lats', 'Rhomboids', 'Upper Back', 'Traps', 'Lower Back'],
  Shoulders: ['All Shoulders', 'Front Delt', 'Middle Delt', 'Rear Delt', 'Rotator Cuff'],
  Chest: ['All Chest', 'Upper Chest', 'Mid Chest', 'Lower Chest'],
  Legs: ['All Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors / Abductors'],
  Arms: ['All Arms', 'Biceps', 'Triceps', 'Forearms'],
  Core: ['All Core', 'Abs', 'Obliques', 'Deep Core / Stability'],
  'Full Body': ['All Full Body']
};

const EQUIPMENT_FILTERS = [
  'All',
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Smith Machine',
  'Leverage'
];

// Common gym shorthand expansion for fast search
const SHORTHAND_EXPANSIONS: Record<string, string> = {
  rdl: 'romanian deadlift',
  ohp: 'overhead press',
  db: 'dumbbell',
  bb: 'barbell',
  lat: 'lat',
  abs: 'ab',
  calves: 'calf'
};

const ITEMS_PER_PAGE = 50;

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  exercises,
  currentWorkoutExercises,
  onSelectExercise,
  onCreateCustom,
  onInspectExercise
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<ExerciseItem['muscle'] | 'All'>('All');
  const [selectedSubMuscle, setSelectedSubMuscle] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [customMuscle, setCustomMuscle] = useState<ExerciseItem['muscle']>('Back');
  const [customSubMuscle, setCustomSubMuscle] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Add Exercise Options State
  const [configuringExercise, setConfiguringExercise] = useState<ExerciseItem | null>(null);
  const [addMode, setAddMode] = useState<'normal' | 'superset'>('normal');
  const [selectedSupersetTargetId, setSelectedSupersetTargetId] = useState<string>('');
  const [selectedRestSeconds, setSelectedRestSeconds] = useState<number>(165); // Default 2:45

  const handleOpenAddOptions = (ex: ExerciseItem) => {
    setConfiguringExercise(ex);
    setAddMode('normal');
    if (currentWorkoutExercises && currentWorkoutExercises.length > 0) {
      setSelectedSupersetTargetId(currentWorkoutExercises[currentWorkoutExercises.length - 1].id);
    } else {
      setSelectedSupersetTargetId('');
    }
    setSelectedRestSeconds(165); // 2:45 default
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleConfirmAdd = () => {
    if (!configuringExercise) return;
    onSelectExercise(configuringExercise, {
      supersetWithExerciseId: addMode === 'superset' && selectedSupersetTargetId ? selectedSupersetTargetId : undefined,
      restSeconds: selectedRestSeconds
    });
    setConfiguringExercise(null);
    onClose();
  };

  // When primary muscle changes, reset sub-muscle filter to 'All'
  const handleMuscleChange = (group: ExerciseItem['muscle'] | 'All') => {
    setSelectedMuscle(group);
    setSelectedSubMuscle('All');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Reset pagination when filter or search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [search, selectedMuscle, selectedSubMuscle, selectedEquipment]);

  const availableSubMuscles = useMemo(() => {
    if (selectedMuscle === 'All') return [];
    return SUB_MUSCLE_MAP[selectedMuscle] || [];
  }, [selectedMuscle]);

  // Pre-Indexed Tokenized Search Cache (builds once when exercise list changes)
  const indexedData = useMemo(() => {
    return exercises.map((ex) => {
      const nameL = ex.name.toLowerCase();
      const targetL = (ex.target || '').toLowerCase();
      const eqL = (ex.equipment || '').toLowerCase();
      const subsL = (ex.subMuscles || []).map((s) => s.toLowerCase());

      // Pre-tokenized words for instant prefix & substring matching
      const searchStr = `${nameL} ${targetL} ${eqL} ${subsL.join(' ')}`;

      return {
        item: ex,
        muscle: ex.muscle,
        subMuscles: ex.subMuscles || [],
        targetL,
        nameL,
        eqL,
        searchStr
      };
    });
  }, [exercises]);

  // Sub-millisecond filter execution (< 0.2ms per keystroke)
  const filteredExercises = useMemo(() => {
    const rawSearch = search.trim().toLowerCase();
    const expandedTerm = SHORTHAND_EXPANSIONS[rawSearch] || rawSearch;
    const searchWords = expandedTerm.split(/\s+/).filter(Boolean);
    const hasSearch = searchWords.length > 0;
    const filterSub = selectedSubMuscle !== 'All' && !selectedSubMuscle.startsWith('All ');
    const subTargetLower = filterSub ? selectedSubMuscle.toLowerCase() : '';
    const eqFilterLower = selectedEquipment !== 'All' ? selectedEquipment.toLowerCase() : '';

    const results: ExerciseItem[] = [];

    for (let i = 0; i < indexedData.length; i++) {
      const entry = indexedData[i];

      // 1. Primary muscle group check
      if (selectedMuscle !== 'All' && entry.muscle !== selectedMuscle) {
        continue;
      }

      // 2. Sub-muscle / target check
      if (filterSub) {
        const matchesSub = entry.subMuscles.includes(selectedSubMuscle);
        const matchesTarget = entry.targetL.includes(subTargetLower);
        const matchesName = entry.nameL.includes(subTargetLower);
        if (!matchesSub && !matchesTarget && !matchesName) {
          continue;
        }
      }

      // 3. Equipment filter check
      if (eqFilterLower && !entry.eqL.includes(eqFilterLower)) {
        continue;
      }

      // 4. Tokenized search terms
      if (hasSearch) {
        let allWordsMatch = true;
        for (let j = 0; j < searchWords.length; j++) {
          if (!entry.searchStr.includes(searchWords[j])) {
            allWordsMatch = false;
            break;
          }
        }
        if (!allWordsMatch) continue;
      }

      results.push(entry.item);
    }

    return results;
  }, [indexedData, search, selectedMuscle, selectedSubMuscle, selectedEquipment]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!search.trim()) return;
    onCreateCustom(search.trim(), customMuscle, customSubMuscle || undefined);
    setSearch('');
  };

  const displayedExercises = filteredExercises.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">OpenGym Resistance Library</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {exercises.length.toLocaleString()} pure gym exercises · Tap row to inspect stats & rest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 bg-[#141416] border-b border-[#27272a] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises, lats, delts, chest, RDL, shrugs..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Primary Muscle Group Filter Tabs */}
          <div className="overflow-x-auto no-scrollbar py-0.5">
            <div className="flex gap-1.5 min-w-max">
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group}
                  onClick={() => handleMuscleChange(group)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${
                    selectedMuscle === group
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#09090b] text-zinc-400 hover:text-white border border-[#27272a]'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Contextual Sub-Muscle Breakdown Tabs */}
          {availableSubMuscles.length > 0 && (
            <div className="bg-[#121214] border border-[#27272a] rounded-xl p-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-400/90 pl-1 pr-1 shrink-0">
                  {selectedMuscle} Target:
                </span>
                {availableSubMuscles.map((sub) => {
                  const isAll = sub === `All ${selectedMuscle}`;
                  const isCurrent = isAll ? selectedSubMuscle === 'All' : selectedSubMuscle === sub;

                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubMuscle(isAll ? 'All' : sub)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#18181b] text-zinc-300 hover:text-white hover:bg-zinc-800 border border-[#27272a]'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equipment Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar text-[11px] items-center">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold shrink-0">
              Equipment:
            </span>
            {EQUIPMENT_FILTERS.map((eq) => (
              <button
                key={eq}
                onClick={() => setSelectedEquipment(eq)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap ${
                  selectedEquipment === eq
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count & Match Information */}
        <div className="px-4 py-1.5 bg-[#141416] border-y border-[#27272a] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span>{filteredExercises.length.toLocaleString()} exercises found</span>
            {selectedSubMuscle !== 'All' && (
              <span className="text-blue-400 font-semibold">· {selectedSubMuscle}</span>
            )}
          </div>
          {visibleCount < filteredExercises.length && (
            <span>Showing top {visibleCount}</span>
          )}
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#27272a]">
          {displayedExercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => {
                if (onInspectExercise) {
                  onInspectExercise(ex);
                } else {
                  onSelectExercise(ex);
                  onClose();
                }
              }}
              className="w-full py-2.5 flex items-center justify-between text-left hover:bg-zinc-800/40 px-2 rounded-xl transition group cursor-pointer"
            >
              <div className="flex items-center gap-3 pr-2 min-w-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#27272a] bg-zinc-950 shrink-0">
                  <ExerciseThumbnail
                    rawId={ex.rawId}
                    exerciseName={ex.name}
                    muscle={ex.muscle}
                    size="sm"
                    showTapToEnlarge
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-blue-400 truncate">
                    {ex.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                    <span className="text-zinc-300 font-medium">{ex.muscle}</span>
                    {ex.subMuscles && ex.subMuscles.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-blue-400/90 font-medium">{ex.subMuscles.join(', ')}</span>
                      </>
                    )}
                    {ex.equipment && (
                      <>
                        <span>·</span>
                        <span className="text-zinc-500">{ex.equipment}</span>
                      </>
                    )}
                    {ex.isCustom && <span className="text-blue-400 font-semibold">· Custom</span>}
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddOptions(ex);
                }}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-base font-bold shrink-0"
                title="Add to Workout"
              >
                +
              </button>
            </div>
          ))}

          {/* Load More Button for Sliced Pagination */}
          {visibleCount < filteredExercises.length && (
            <div className="py-3 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition active:scale-95"
              >
                Load More ({filteredExercises.length - visibleCount} remaining)
              </button>
            </div>
          )}

          {/* If search query doesn't match an exact exercise, offer instant creation */}
          {search.trim().length > 0 &&
            !filteredExercises.some(
              (e) => e.name.toLowerCase() === search.trim().toLowerCase()
            ) && (
              <div className="py-4 px-2">
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3">
                  <p className="text-xs text-zinc-400 mb-1">Create custom exercise:</p>
                  <p className="text-sm font-bold text-white mb-2">"{search.trim()}"</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Target Muscle:</label>
                      <select
                        value={customMuscle}
                        onChange={(e) => {
                          const m = e.target.value as any;
                          setCustomMuscle(m);
                          setCustomSubMuscle('');
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-white"
                      >
                        {MUSCLE_GROUPS.filter((m) => m !== 'All').map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Sub-Target (Optional):
                      </label>
                      <select
                        value={customSubMuscle}
                        onChange={(e) => setCustomSubMuscle(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-white"
                      >
                        <option value="">General {customMuscle}</option>
                        {(SUB_MUSCLE_MAP[customMuscle] || [])
                          .filter((sub) => !sub.startsWith('All '))
                          .map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreate}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add "{search.trim()}" to Library
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Configure Add Exercise Options Drawer / Modal */}
      {configuringExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#202024]">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                  Add Exercise Options
                </span>
                <h3 className="text-base font-bold text-white truncate">
                  {configuringExercise.name}
                </h3>
                <p className="text-xs text-zinc-400 truncate">
                  {configuringExercise.muscle}
                  {configuringExercise.equipment ? ` · ${configuringExercise.equipment}` : ''}
                </p>
              </div>
              <button
                onClick={() => setConfiguringExercise(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Mode Selection: Normal vs Superset */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Workout Structure
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMode('normal')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      addMode === 'normal'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${addMode === 'normal' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      <span className="text-xs font-bold text-white">Normal</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      Standard standalone exercise with separate rest timer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentWorkoutExercises && currentWorkoutExercises.length > 0) {
                        setAddMode('superset');
                      }
                    }}
                    disabled={!currentWorkoutExercises || currentWorkoutExercises.length === 0}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      !currentWorkoutExercises || currentWorkoutExercises.length === 0
                        ? 'opacity-40 cursor-not-allowed border-[#27272a] bg-[#09090b] text-zinc-600'
                        : addMode === 'superset'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-[#27272a] bg-[#09090b] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-1 rounded flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                        SS
                      </span>
                      <span className="text-xs font-bold text-white">Superset</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      Pair with previous exercise; rest triggers after both
                    </span>
                  </button>
                </div>

                {/* Superset Target Exercise Picker */}
                {addMode === 'superset' && currentWorkoutExercises && currentWorkoutExercises.length > 0 && (
                  <div className="mt-3 p-3 bg-zinc-900/90 border border-emerald-500/30 rounded-xl space-y-2">
                    <label className="text-[11px] font-semibold text-emerald-400 block">
                      Superset with which exercise in workout?
                    </label>
                    <select
                      value={selectedSupersetTargetId}
                      onChange={(e) => setSelectedSupersetTargetId(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {currentWorkoutExercises.map((wEx, idx) => (
                        <option key={wEx.id} value={wEx.id}>
                          #{idx + 1} {wEx.name} ({wEx.muscle})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-400">
                      ⚡ When you finish a set of the first exercise, it will automatically jump to this exercise before the rest timer starts.
                    </p>
                  </div>
                )}
              </div>

              {/* Rest Timer Setting */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Rest Timer for this Exercise
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {formatTime(selectedRestSeconds)}
                  </span>
                </div>

                {/* Stepper adjustment */}
                <div className="flex items-center justify-center gap-3 bg-[#09090b] border border-[#27272a] rounded-xl p-2.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRestSeconds((s) => Math.max(15, s - 15))}
                    className="w-9 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 transition"
                    title="-15 seconds"
                  >
                    -15s
                  </button>

                  <div className="text-center px-4">
                    <span className="font-mono text-xl font-bold text-white tracking-wider">
                      {formatTime(selectedRestSeconds)}
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-sans">
                      {selectedRestSeconds === 165 ? '(Default 2:45)' : 'Custom Rest'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRestSeconds((s) => s + 15)}
                    className="w-9 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 transition"
                    title="+15 seconds"
                  >
                    +15s
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: '1:30', val: 90 },
                    { label: '2:00', val: 120 },
                    { label: '2:30', val: 150 },
                    { label: '2:45 (Default)', val: 165 },
                    { label: '3:00', val: 180 },
                    { label: '3:30', val: 210 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSelectedRestSeconds(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition ${
                        selectedRestSeconds === p.val
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-[#27272a] bg-[#202024] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfiguringExercise(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#27272a] hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Add to Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
