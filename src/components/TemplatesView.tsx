import React, { useState, useMemo } from 'react';
import { WorkoutTemplate, ExerciseItem } from '../lib/db';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { Plus, Trash2, Dumbbell, Play, Edit2, X, Check, Search, ChevronUp, ChevronDown, ArrowUpDown, GripVertical } from 'lucide-react';

interface TemplatesViewProps {
  templates: WorkoutTemplate[];
  availableExercises: ExerciseItem[];
  onStartTemplate: (template: WorkoutTemplate) => void;
  onSaveTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onRequestLoadCatalog?: () => void;
}

const MUSCLE_FILTER_OPTIONS: (ExerciseItem['muscle'] | 'All')[] = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core'
];

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  availableExercises,
  onStartTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onRequestLoadCatalog
}) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedExerciseNames, setSelectedExerciseNames] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'order' | 'catalog'>('order');
  const [filterQuery, setFilterQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState<ExerciseItem['muscle'] | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(40);
  const [draggedTmplIdx, setDraggedTmplIdx] = useState<number | null>(null);
  const [dragOverTmplIdx, setDragOverTmplIdx] = useState<number | null>(null);

  const handleOpenNew = () => {
    onRequestLoadCatalog?.();
    setEditingTemplate(null);
    setTemplateName('');
    setSelectedExerciseNames(['Barbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Lateral Raise']);
    setFilterQuery('');
    setFilterMuscle('All');
    setVisibleCount(40);
    setModalTab('order');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: WorkoutTemplate) => {
    onRequestLoadCatalog?.();
    setEditingTemplate(t);
    setTemplateName(t.name);
    setSelectedExerciseNames(t.exercises.map((e) => e.name));
    setFilterQuery('');
    setFilterMuscle('All');
    setVisibleCount(40);
    setModalTab('order');
    setIsModalOpen(true);
  };

  const handleToggleExercise = (name: string) => {
    if (selectedExerciseNames.includes(name)) {
      setSelectedExerciseNames(selectedExerciseNames.filter((n) => n !== name));
    } else {
      setSelectedExerciseNames([...selectedExerciseNames, name]);
    }
  };

  const handleMoveTemplateExercise = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= selectedExerciseNames.length) return;
    const copy = [...selectedExerciseNames];
    const temp = copy[fromIdx];
    copy[fromIdx] = copy[toIdx];
    copy[toIdx] = temp;
    setSelectedExerciseNames(copy);
  };

  const handleReorderTemplate = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= selectedExerciseNames.length ||
      toIdx >= selectedExerciseNames.length
    )
      return;
    const copy = [...selectedExerciseNames];
    const [removed] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, removed);
    setSelectedExerciseNames(copy);
  };

  const handleRemoveTemplateExercise = (index: number) => {
    const copy = [...selectedExerciseNames];
    copy.splice(index, 1);
    setSelectedExerciseNames(copy);
  };

  const handleSave = () => {
    if (!templateName.trim()) return;

    const exerciseObjects = selectedExerciseNames.map((name) => {
      const match = availableExercises.find((e) => e.name === name);
      return {
        name,
        muscle: match?.muscle || 'Full Body'
      };
    });

    const newTemplate: WorkoutTemplate = {
      id: editingTemplate ? editingTemplate.id : `tmpl_${Date.now()}`,
      name: templateName.trim(),
      category: 'Custom Routine',
      exercises: exerciseObjects
    };

    onSaveTemplate(newTemplate);
    setIsModalOpen(false);
  };

  // Filtered exercises for modal
  const filteredModalExercises = useMemo(() => {
    const q = filterQuery.toLowerCase().trim();
    return availableExercises.filter((ex) => {
      if (filterMuscle !== 'All' && ex.muscle !== filterMuscle) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [availableExercises, filterQuery, filterMuscle]);

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Workout Templates</h2>
          <p className="text-xs text-zinc-400">Pre-built routines for fast 1-tap start</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </button>
      </div>

      {/* Templates List */}
      <div className="space-y-3.5">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">{tmpl.name}</h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {tmpl.exercises.length} exercises
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(tmpl)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                  title="Edit Template"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteTemplate(tmpl.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-xs text-zinc-400 divide-y divide-[#27272a]/50 mb-4 mt-2">
              {tmpl.exercises.map((ex, idx) => (
                <div key={idx} className="py-1.5 flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">{ex.name}</span>
                  <span className="text-[11px] text-zinc-400 font-mono">{ex.muscle}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onStartTemplate(tmpl)}
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start This Workout
            </button>
          </div>
        ))}
      </div>

      {/* Create / Edit Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <h3 className="font-bold text-base text-white">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3">
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Routine Name</label>
              <input
                type="text"
                placeholder="e.g. Chest & Triceps Blast"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#09090b] border border-[#27272a] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            {/* Modal Tabs: Routine Order vs Add/Remove Catalog */}
            <div className="flex border-b border-[#27272a] mb-3">
              <button
                onClick={() => setModalTab('order')}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'order'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Routine Order ({selectedExerciseNames.length})
              </button>
              <button
                onClick={() => setModalTab('catalog')}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  modalTab === 'catalog'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add / Remove Exercises
              </button>
            </div>

            {/* TAB 1: ROUTINE ORDER REORDERING */}
            {modalTab === 'order' && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-[220px]">
                {selectedExerciseNames.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    No exercises selected yet. Switch to "Add / Remove Exercises" to build your routine.
                  </div>
                ) : (
                  selectedExerciseNames.map((name, idx) => {
                    const match = availableExercises.find((e) => e.name === name);
                    return (
                      <div
                        key={`${name}_${idx}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverTmplIdx !== idx) setDragOverTmplIdx(idx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedTmplIdx !== null && draggedTmplIdx !== idx) {
                            handleReorderTemplate(draggedTmplIdx, idx);
                          }
                          setDraggedTmplIdx(null);
                          setDragOverTmplIdx(null);
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          dragOverTmplIdx === idx
                            ? 'border-emerald-400 bg-emerald-950/20'
                            : 'border-[#27272a] bg-[#09090b]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Drag handle */}
                          <div
                            draggable
                            onDragStart={() => setDraggedTmplIdx(idx)}
                            onDragEnd={() => {
                              setDraggedTmplIdx(null);
                              setDragOverTmplIdx(null);
                            }}
                            className="cursor-grab active:cursor-grabbing p-1 text-zinc-500 hover:text-zinc-300"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{name}</p>
                            <span className="text-[10px] text-zinc-400">
                              {match?.muscle || 'Full Body'}
                            </span>
                          </div>
                        </div>

                        {/* Reorder Up/Down & Remove Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleMoveTemplateExercise(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-lg transition ${
                              idx === 0
                                ? 'text-zinc-700 cursor-not-allowed opacity-30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveTemplateExercise(idx, 'down')}
                            disabled={idx === selectedExerciseNames.length - 1}
                            className={`p-1.5 rounded-lg transition ${
                              idx === selectedExerciseNames.length - 1
                                ? 'text-zinc-700 cursor-not-allowed opacity-30'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveTemplateExercise(idx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: EXERCISE CATALOG PICKER */}
            {modalTab === 'catalog' && (
              <>
                {/* Search & Muscle Filter */}
                <div className="space-y-2 mb-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#09090b] border border-[#27272a] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {MUSCLE_FILTER_OPTIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setFilterMuscle(m)}
                        className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                          filterMuscle === m
                            ? 'bg-white text-black font-bold'
                            : 'bg-[#09090b] text-zinc-400 hover:text-white border border-[#27272a]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-1 min-h-[200px]">
                  {filteredModalExercises.slice(0, visibleCount).map((ex) => {
                    const isChecked = selectedExerciseNames.includes(ex.name);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => handleToggleExercise(ex.name)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
                            : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <ExerciseThumbnail exercise={ex} size="sm" allowZoom={true} />
                          <div className="text-xs font-medium truncate">
                            <p className="truncate text-white">{ex.name}</p>
                            <span className="text-[10px] text-zinc-400">
                              {ex.muscle} {ex.subMuscles?.length ? `· ${ex.subMuscles.join(', ')}` : ''}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-zinc-700 bg-zinc-900'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}

                  {visibleCount < filteredModalExercises.length && (
                    <div className="py-2 text-center">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 40)}
                        className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg hover:bg-zinc-700"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="pt-3 border-t border-[#27272a] mt-2">
              <button
                onClick={handleSave}
                disabled={!templateName.trim() || selectedExerciseNames.length === 0}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition"
              >
                Save Template ({selectedExerciseNames.length} Exercises)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
