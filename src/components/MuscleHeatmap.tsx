import React, { useState } from 'react';
import { DETAILED_MUSCLES, DetailedMuscleInfo } from '../lib/muscleMapping';
import { Info, Layers, Dumbbell, ChevronRight } from 'lucide-react';

export interface DetailedMuscleVolumeStats {
  [muscleKey: string]: {
    volume: number; // in kg
    sets: number;
    exercises: string[];
  };
}

interface MuscleHeatmapProps {
  stats: DetailedMuscleVolumeStats;
  maxVolume?: number;
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({ stats, maxVolume = 1 }) => {
  const [selectedMuscleKey, setSelectedMuscleKey] = useState<string | null>('upper_chest');
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('All');

  // Normalized intensity from 0 to 1
  const getIntensity = (muscleKey: string) => {
    const data = stats[muscleKey];
    if (!data || data.volume <= 0 || maxVolume <= 0) return 0;
    return Math.min(1, data.volume / maxVolume);
  };

  // Athletic heat gradient: zinc -> dark emerald -> vibrant emerald -> neon emerald/cyan
  const getColor = (muscleKey: string) => {
    const intensity = getIntensity(muscleKey);
    if (intensity === 0) return '#27272a'; // zinc-800 (untrained)
    if (intensity < 0.2) return '#064e3b'; // emerald-900 (light volume)
    if (intensity < 0.45) return '#047857'; // emerald-700
    if (intensity < 0.75) return '#10b981'; // emerald-500
    return '#34d399'; // emerald-400 (hottest / highest volume)
  };

  const selectedMuscleInfo: DetailedMuscleInfo | undefined = DETAILED_MUSCLES.find(
    (m) => m.key === selectedMuscleKey
  );

  const selectedStats = selectedMuscleKey ? stats[selectedMuscleKey] : null;

  const filteredMuscles = activeGroupFilter === 'All'
    ? DETAILED_MUSCLES
    : DETAILED_MUSCLES.filter((m) => m.group === activeGroupFilter);

  const muscleGroups = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Neck'];

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Individual Muscle Recovery Heatmap
          </h3>
          <p className="text-[11px] text-zinc-400">
            Targeted volume & sets for individual trainable muscles
          </p>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
          <span>0 vol</span>
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#27272a]" title="0 kg" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#064e3b]" title="Low" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#047857]" title="Medium" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" title="High" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" title="Max" />
          </div>
          <span>Max</span>
        </div>
      </div>

      {/* Interactive Silhouette Visuals: High-Precision Front & Back Anatomy */}
      <div className="grid grid-cols-2 gap-4 bg-[#09090b] border border-[#27272a] rounded-2xl p-3">
        {/* FRONT VIEW */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Front Anatomy
          </span>
          <svg viewBox="0 0 100 160" className="w-36 h-48 drop-shadow">
            {/* Head */}
            <circle cx="50" cy="13" r="8.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />

            {/* Neck Flexors (Sternocleidomastoid) */}
            <path
              d="M44 21 L48 29 L52 29 L56 21 Z"
              fill={getColor('neck_flexors')}
              stroke={selectedMuscleKey === 'neck_flexors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'neck_flexors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('neck_flexors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Neck Flexors</title>
            </path>

            {/* Front Delts (Anterior) */}
            <path
              d="M33 27 C28 30, 26 36, 28 41 L34 38 C35 33, 37 29, 40 28 Z"
              fill={getColor('front_delt')}
              stroke={selectedMuscleKey === 'front_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'front_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('front_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Front Delts</title>
            </path>
            <path
              d="M67 27 C72 30, 74 36, 72 41 L66 38 C65 33, 63 29, 60 28 Z"
              fill={getColor('front_delt')}
              stroke={selectedMuscleKey === 'front_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'front_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('front_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Front Delts</title>
            </path>

            {/* Side Delts (Lateral) */}
            <path
              d="M27 33 C24 37, 23 43, 25 47 L30 44 C29 40, 29 36, 31 34 Z"
              fill={getColor('side_delt')}
              stroke={selectedMuscleKey === 'side_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'side_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('side_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Side / Lateral Delts</title>
            </path>
            <path
              d="M73 33 C76 37, 77 43, 75 47 L70 44 C71 40, 71 36, 69 34 Z"
              fill={getColor('side_delt')}
              stroke={selectedMuscleKey === 'side_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'side_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('side_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Side / Lateral Delts</title>
            </path>

            {/* High Chest / Upper Chest (Clavicular Head) */}
            <path
              d="M36 28 L50 30 L64 28 L63 36 C55 38, 45 38, 37 36 Z"
              fill={getColor('upper_chest')}
              stroke={selectedMuscleKey === 'upper_chest' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'upper_chest' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('upper_chest')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>High Chest (Upper / Clavicular)</title>
            </path>

            {/* Mid & Lower Chest (Sternal Head) */}
            <path
              d="M37 37 C45 39, 55 39, 63 37 L61 46 C52 47, 48 47, 39 46 Z"
              fill={getColor('mid_chest')}
              stroke={selectedMuscleKey === 'mid_chest' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'mid_chest' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('mid_chest')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Mid & Lower Chest (Sternal)</title>
            </path>

            {/* Serratus Anterior (Rib cage sides) */}
            <path
              d="M35 48 L38 47 L36 58 L33 55 Z"
              fill={getColor('serratus')}
              stroke={selectedMuscleKey === 'serratus' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'serratus' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('serratus')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Serratus Anterior</title>
            </path>
            <path
              d="M65 48 L62 47 L64 58 L67 55 Z"
              fill={getColor('serratus')}
              stroke={selectedMuscleKey === 'serratus' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'serratus' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('serratus')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Serratus Anterior</title>
            </path>

            {/* Biceps */}
            <path
              d="M25 48 L32 46 L30 68 L24 66 Z"
              fill={getColor('biceps')}
              stroke={selectedMuscleKey === 'biceps' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'biceps' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('biceps')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Biceps</title>
            </path>
            <path
              d="M75 48 L68 46 L70 68 L76 66 Z"
              fill={getColor('biceps')}
              stroke={selectedMuscleKey === 'biceps' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'biceps' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('biceps')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Biceps</title>
            </path>

            {/* Forearm Extensors / Brachioradialis (Outer Forearm) */}
            <path
              d="M21 68 L26 68 L23 96 L19 94 Z"
              fill={getColor('forearm_extensors')}
              stroke={selectedMuscleKey === 'forearm_extensors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_extensors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_extensors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Extensors / Brachioradialis</title>
            </path>
            <path
              d="M79 68 L74 68 L77 96 L81 94 Z"
              fill={getColor('forearm_extensors')}
              stroke={selectedMuscleKey === 'forearm_extensors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_extensors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_extensors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Extensors / Brachioradialis</title>
            </path>

            {/* Forearm Flexors (Inner Forearm) */}
            <path
              d="M27 69 L30 69 L28 97 L24 97 Z"
              fill={getColor('forearm_flexors')}
              stroke={selectedMuscleKey === 'forearm_flexors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_flexors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_flexors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Flexors (Wrist Curls)</title>
            </path>
            <path
              d="M73 69 L70 69 L72 97 L76 97 Z"
              fill={getColor('forearm_flexors')}
              stroke={selectedMuscleKey === 'forearm_flexors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_flexors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_flexors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Flexors (Wrist Curls)</title>
            </path>

            {/* Abs / Rectus Abdominis */}
            <path
              d="M41 48 L59 48 C58 64, 56 73, 50 74 C44 73, 42 64, 41 48 Z"
              fill={getColor('abs')}
              stroke={selectedMuscleKey === 'abs' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'abs' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('abs')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Abs (Rectus Abdominis)</title>
            </path>

            {/* Obliques */}
            <path
              d="M37 48 L40 48 L39 70 L35 67 Z"
              fill={getColor('obliques')}
              stroke={selectedMuscleKey === 'obliques' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'obliques' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('obliques')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Obliques</title>
            </path>
            <path
              d="M63 48 L60 48 L61 70 L65 67 Z"
              fill={getColor('obliques')}
              stroke={selectedMuscleKey === 'obliques' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'obliques' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('obliques')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Obliques</title>
            </path>

            {/* Quads */}
            <path
              d="M35 76 L48 76 L46 114 L34 112 Z"
              fill={getColor('quads')}
              stroke={selectedMuscleKey === 'quads' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'quads' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('quads')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Quads (Quadriceps)</title>
            </path>
            <path
              d="M52 76 L65 76 L66 112 L54 114 Z"
              fill={getColor('quads')}
              stroke={selectedMuscleKey === 'quads' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'quads' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('quads')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Quads (Quadriceps)</title>
            </path>

            {/* Calves (Front) */}
            <path
              d="M34 118 L46 118 L43 148 L35 148 Z"
              fill={getColor('calves')}
              stroke={selectedMuscleKey === 'calves' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'calves' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('calves')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Calves & Shin</title>
            </path>
            <path
              d="M54 118 L66 118 L65 148 L57 148 Z"
              fill={getColor('calves')}
              stroke={selectedMuscleKey === 'calves' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'calves' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('calves')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Calves & Shin</title>
            </path>
          </svg>
        </div>

        {/* BACK VIEW */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Back Anatomy
          </span>
          <svg viewBox="0 0 100 160" className="w-36 h-48 drop-shadow">
            {/* Head Back */}
            <circle cx="50" cy="13" r="8.5" fill="#18181b" stroke="#27272a" strokeWidth="0.8" />

            {/* Neck Extensors & Upper Traps */}
            <path
              d="M42 22 L50 20 L58 22 L65 32 L35 32 Z"
              fill={getColor('upper_traps')}
              stroke={selectedMuscleKey === 'upper_traps' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'upper_traps' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('upper_traps')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Upper Trapezius & Neck Extensors</title>
            </path>

            {/* Rhomboids & Mid Traps (Diamond between shoulder blades) */}
            <path
              d="M38 33 L62 33 L58 48 L50 51 L42 48 Z"
              fill={getColor('rhomboids')}
              stroke={selectedMuscleKey === 'rhomboids' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'rhomboids' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('rhomboids')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Rhomboids & Mid/Lower Traps (Kelso Shrugs, Rows)</title>
            </path>

            {/* Rear Delts (Posterior) */}
            <path
              d="M26 31 C21 35, 22 41, 26 45 L32 40 Z"
              fill={getColor('rear_delt')}
              stroke={selectedMuscleKey === 'rear_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'rear_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('rear_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Rear Delts (Reverse Flyes)</title>
            </path>
            <path
              d="M74 31 C79 35, 78 41, 74 45 L68 40 Z"
              fill={getColor('rear_delt')}
              stroke={selectedMuscleKey === 'rear_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'rear_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('rear_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Rear Delts (Reverse Flyes)</title>
            </path>

            {/* Side Delts (Rear view edge) */}
            <path
              d="M22 34 C19 39, 20 44, 23 47 L26 43 Z"
              fill={getColor('side_delt')}
              stroke={selectedMuscleKey === 'side_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'side_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('side_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Side Delts</title>
            </path>
            <path
              d="M78 34 C81 39, 80 44, 77 47 L74 43 Z"
              fill={getColor('side_delt')}
              stroke={selectedMuscleKey === 'side_delt' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'side_delt' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('side_delt')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Side Delts</title>
            </path>

            {/* Lats (Latissimus Dorsi wings) */}
            <path
              d="M33 37 L41 37 L41 57 L50 63 L59 57 L59 37 L67 37 L62 65 L50 67 L38 65 Z"
              fill={getColor('lats')}
              stroke={selectedMuscleKey === 'lats' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'lats' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('lats')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Lats (Latissimus Dorsi)</title>
            </path>

            {/* Lower Back / Erector Spinae */}
            <path
              d="M44 54 L56 54 L56 68 L44 68 Z"
              fill={getColor('lower_back')}
              stroke={selectedMuscleKey === 'lower_back' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'lower_back' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('lower_back')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Lower Back (Erector Spinae)</title>
            </path>

            {/* Triceps (Back of arm) */}
            <path
              d="M23 48 L31 44 L28 72 L22 70 Z"
              fill={getColor('triceps')}
              stroke={selectedMuscleKey === 'triceps' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'triceps' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('triceps')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Triceps</title>
            </path>
            <path
              d="M77 48 L69 44 L72 72 L78 70 Z"
              fill={getColor('triceps')}
              stroke={selectedMuscleKey === 'triceps' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'triceps' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('triceps')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Triceps</title>
            </path>

            {/* Forearm Extensors (Posterior Forearm) */}
            <path
              d="M21 71 L27 71 L24 98 L19 96 Z"
              fill={getColor('forearm_extensors')}
              stroke={selectedMuscleKey === 'forearm_extensors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_extensors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_extensors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Extensors / Brachioradialis</title>
            </path>
            <path
              d="M79 71 L73 71 L76 98 L81 96 Z"
              fill={getColor('forearm_extensors')}
              stroke={selectedMuscleKey === 'forearm_extensors' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'forearm_extensors' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('forearm_extensors')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Forearm Extensors / Brachioradialis</title>
            </path>

            {/* Glutes */}
            <path
              d="M36 68 L64 68 L64 84 L50 85 L36 84 Z"
              fill={getColor('glutes')}
              stroke={selectedMuscleKey === 'glutes' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'glutes' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('glutes')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Glutes</title>
            </path>

            {/* Hamstrings */}
            <path
              d="M35 85 L48 85 L46 114 L34 112 Z"
              fill={getColor('hamstrings')}
              stroke={selectedMuscleKey === 'hamstrings' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'hamstrings' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('hamstrings')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Hamstrings (Leg Curls, RDLs)</title>
            </path>
            <path
              d="M52 85 L65 85 L66 112 L54 114 Z"
              fill={getColor('hamstrings')}
              stroke={selectedMuscleKey === 'hamstrings' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'hamstrings' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('hamstrings')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Hamstrings (Leg Curls, RDLs)</title>
            </path>

            {/* Calves (Back - Gastrocnemius & Soleus) */}
            <path
              d="M33 118 L47 118 L44 148 L34 148 Z"
              fill={getColor('calves')}
              stroke={selectedMuscleKey === 'calves' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'calves' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('calves')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Calves (Gastroc & Soleus)</title>
            </path>
            <path
              d="M53 118 L67 118 L66 148 L56 148 Z"
              fill={getColor('calves')}
              stroke={selectedMuscleKey === 'calves' ? '#38bdf8' : '#141416'}
              strokeWidth={selectedMuscleKey === 'calves' ? 1.5 : 0.6}
              onClick={() => setSelectedMuscleKey('calves')}
              className="cursor-pointer transition hover:opacity-85"
            >
              <title>Calves (Gastroc & Soleus)</title>
            </path>
          </svg>
        </div>
      </div>

      {/* Selected Muscle Inspector Card */}
      {selectedMuscleInfo && (
        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-3.5 space-y-2 animate-in fade-in duration-150">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                {selectedMuscleInfo.group}
              </span>
              <h4 className="text-sm font-bold text-white">{selectedMuscleInfo.name}</h4>
              <p className="text-[11px] text-zinc-400">{selectedMuscleInfo.description}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-white block">
                {selectedStats ? `${Math.round(selectedStats.volume).toLocaleString()} kg` : '0 kg'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {selectedStats ? `${selectedStats.sets} sets` : '0 sets logged'}
              </span>
            </div>
          </div>

          {selectedStats && selectedStats.exercises.length > 0 ? (
            <div className="pt-2 border-t border-[#27272a]">
              <span className="text-[10px] text-zinc-500 block mb-1">Targeted by:</span>
              <div className="flex flex-wrap gap-1">
                {selectedStats.exercises.map((ex, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-medium text-zinc-300"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic pt-1 border-t border-[#27272a]">
              No volume logged for this muscle in the selected period.
            </p>
          )}
        </div>
      )}

      {/* Muscle Category Filter Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
          Filter by Region:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {muscleGroups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroupFilter(g)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeGroupFilter === g
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'bg-[#09090b] text-zinc-400 hover:text-white border border-[#27272a]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Muscle Chips List */}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
        {filteredMuscles.map((m) => {
          const item = stats[m.key];
          const isSelected = selectedMuscleKey === m.key;
          const vol = item ? item.volume : 0;

          return (
            <button
              key={m.key}
              onClick={() => setSelectedMuscleKey(m.key)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-emerald-500/20 border-emerald-500 text-white font-semibold'
                  : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getColor(m.key) }}
              />
              <span className="truncate max-w-[120px]">{m.name}</span>
              {vol > 0 && (
                <span className="text-[10px] font-mono text-zinc-400 ml-0.5">
                  {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
