import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { WorkoutSession, ExerciseItem, AppSettings } from '../lib/db';
import { MuscleHeatmap, DetailedMuscleVolumeStats } from './MuscleHeatmap';
import { DETAILED_MUSCLES, mapExerciseToDetailedMuscles } from '../lib/muscleMapping';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import {
  BarChart3,
  Calendar,
  Trophy,
  Flame,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';

interface StatsViewProps {
  workouts: WorkoutSession[];
  unit?: string;
  onDeleteWorkout: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type SubTab = 'analytics' | 'history' | 'prs';
type TimeRange = 'weekly' | 'monthly';

export const StatsView: React.FC<StatsViewProps> = ({
  workouts,
  unit = 'KG',
  onDeleteWorkout,
  settings,
  onUpdateSettings
}) => {
  const [subTab, setSubTab] = useState<SubTab>('analytics');
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Exercise Detail Modal state
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<ExerciseItem | null>(null);

  const [distFilter, setDistFilter] = useState<string>('All');

  // Filter workouts based on time range
  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'weekly') {
      cutoff.setDate(now.getDate() - 28); // 4 weeks
    } else {
      cutoff.setMonth(now.getMonth() - 6); // 6 months
    }
    return workouts.filter((w) => new Date(w.startTime) >= cutoff);
  }, [workouts, timeRange]);

  // Muscle Volume Stats for Heatmap & Breakdown
  const { muscleStats, maxMuscleVolume, totalVolumePeriod, totalSetsPeriod } = useMemo(() => {
    const stats: DetailedMuscleVolumeStats = {};
    DETAILED_MUSCLES.forEach((m) => {
      stats[m.key] = { volume: 0, sets: 0, exercises: [] };
    });

    let totalVol = 0;
    let totalSets = 0;

    filteredWorkouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        let exVol = 0;
        let exSets = 0;

        ex.sets.forEach((s) => {
          if (!s.completed) return;
          const wt = parseFloat(s.weight) || 0;
          const rp = parseInt(s.reps, 10) || 0;
          if (wt <= 0) return;

          const setVol = wt * rp;
          exVol += setVol;
          exSets++;
          totalVol += setVol;
          totalSets++;
        });

        if (exSets > 0) {
          const matchedKeys = mapExerciseToDetailedMuscles(ex);
          matchedKeys.forEach((key) => {
            if (stats[key]) {
              stats[key].volume += exVol;
              stats[key].sets += exSets;
              if (!stats[key].exercises.includes(ex.name)) {
                stats[key].exercises.push(ex.name);
              }
            }
          });
        }
      });
    });

    const maxVol = Math.max(...Object.values(stats).map((s) => s.volume), 1);

    return {
      muscleStats: stats,
      maxMuscleVolume: maxVol,
      totalVolumePeriod: totalVol,
      totalSetsPeriod: totalSets
    };
  }, [filteredWorkouts]);

  // Volume by buckets for D3 Chart (Weekly or Monthly)
  const volumeBuckets = useMemo(() => {
    const buckets: { label: string; volume: number; date: Date }[] = [];
    if (workouts.length === 0) return buckets;

    if (timeRange === 'weekly') {
      // Last 4-6 weeks
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let vol = 0;
        workouts.forEach((w) => {
          const wDate = new Date(w.startTime);
          if (wDate >= startOfWeek && wDate <= endOfWeek) {
            w.exercises.forEach((ex) => {
              ex.sets.forEach((s) => {
                if (s.completed) {
                  vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                }
              });
            });
          }
        });

        buckets.push({
          label: `${d3.timeFormat('%b %-d')(startOfWeek)}`,
          volume: Math.round(vol),
          date: startOfWeek
        });
      }
    } else {
      // Last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        let vol = 0;
        workouts.forEach((w) => {
          const wDate = new Date(w.startTime);
          if (wDate >= d && wDate <= nextMonth) {
            w.exercises.forEach((ex) => {
              ex.sets.forEach((s) => {
                if (s.completed) {
                  vol += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
                }
              });
            });
          }
        });

        buckets.push({
          label: d3.timeFormat('%b')(d),
          volume: Math.round(vol),
          date: d
        });
      }
    }

    return buckets;
  }, [workouts, timeRange]);

  // Volume Chart D3 SVG
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!chartSvgRef.current || !chartContainerRef.current || volumeBuckets.length === 0) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth || 340;
    const height = 150;
    const margin = { top: 15, right: 15, bottom: 25, left: 45 };

    const svg = d3.select(chartSvgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(volumeBuckets.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.35);

    const maxVol = d3.max(volumeBuckets, (d) => d.volume) || 1000;
    const yScale = d3.scaleLinear().domain([0, maxVol * 1.15]).nice().range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(3))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#27272a')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2,2');

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(8);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(3)
      .tickFormat((d) => `${(Number(d) / 1000).toFixed(0)}t`)
      .tickSize(0)
      .tickPadding(6);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axis) => axis.select('.domain').attr('stroke', '#27272a'))
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    g.append('g')
      .call(yAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Bars
    g.selectAll('.bar')
      .data(volumeBuckets)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.label) || 0)
      .attr('y', (d) => yScale(d.volume))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => Math.max(2, innerHeight - yScale(d.volume)))
      .attr('fill', (d) => (d.volume > 0 ? '#10b981' : '#27272a'))
      .attr('rx', 4);
  }, [volumeBuckets]);

  // All-time Personal Records list
  const allPersonalRecords = useMemo(() => {
    const prMap: Record<
      string,
      {
        exerciseName: string;
        muscle: string;
        rawId?: string;
        weight: number;
        reps: number;
        oneRm: number;
        date: string;
      }
    > = {};

    workouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (!s.completed) return;
          const weight = parseFloat(s.weight) || 0;
          const reps = parseInt(s.reps, 10) || 0;
          if (weight <= 0 || reps <= 0) return;

          const oneRm = reps === 1 ? weight : weight * (1 + reps / 30);
          const key = ex.name.toLowerCase();
          const existing = prMap[key];

          if (!existing || weight > existing.weight || (weight === existing.weight && reps > existing.reps)) {
            prMap[key] = {
              exerciseName: ex.name,
              muscle: ex.muscle,
              rawId: ex.rawId,
              weight,
              reps,
              oneRm: Math.round(oneRm * 10) / 10,
              date: w.startTime
            };
          }
        });
      });
    });

    return Object.values(prMap).sort((a, b) => b.oneRm - a.oneRm);
  }, [workouts]);

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return null;
    const diffSecs = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
    const mins = Math.floor(diffSecs / 60);
    return `${mins} min`;
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4 space-y-4">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Stats & Progress</h1>
        <p className="text-xs text-zinc-400">Recovery heatmaps, progression graphs, and history</p>
      </div>

      {/* Segmented Top Sub-Tabs */}
      <div className="grid grid-cols-3 p-1 bg-[#18181b] border border-[#27272a] rounded-2xl">
        <button
          onClick={() => setSubTab('analytics')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            subTab === 'analytics'
              ? 'bg-emerald-500 text-black shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Analytics
        </button>
        <button
          onClick={() => setSubTab('history')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            subTab === 'history'
              ? 'bg-emerald-500 text-black shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          History ({workouts.length})
        </button>
        <button
          onClick={() => setSubTab('prs')}
          className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            subTab === 'prs'
              ? 'bg-emerald-500 text-black shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          PRs ({allPersonalRecords.length})
        </button>
      </div>

      {/* SUB-TAB 1: ANALYTICS & HEATMAPS */}
      {subTab === 'analytics' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Time range switcher (Weekly / Monthly) */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Overview Filter
            </span>
            <div className="flex bg-[#18181b] p-1 border border-[#27272a] rounded-xl text-xs">
              <button
                onClick={() => setTimeRange('weekly')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  timeRange === 'weekly' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                Weekly (4w)
              </button>
              <button
                onClick={() => setTimeRange('monthly')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  timeRange === 'monthly' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                }`}
              >
                Monthly (6m)
              </button>
            </div>
          </div>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Total Volume</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                {totalVolumePeriod > 0 ? `${Math.round(totalVolumePeriod / 1000).toLocaleString()}t` : '0 kg'}
              </span>
              <span className="text-[10px] text-zinc-500">{totalSetsPeriod} sets</span>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Workouts</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                {filteredWorkouts.length}
              </span>
              <span className="text-[10px] text-zinc-500">In period</span>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-3 text-center">
              <span className="text-[10px] text-zinc-400 font-medium block">Avg / Session</span>
              <span className="text-lg font-bold font-mono text-[#38bdf8] mt-0.5 block">
                {filteredWorkouts.length > 0
                  ? `${Math.round(totalVolumePeriod / filteredWorkouts.length).toLocaleString()}`
                  : '0'}
              </span>
              <span className="text-[10px] text-zinc-500">kg / workout</span>
            </div>
          </div>

          {/* D3 Volume Over Time Chart */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Volume Lifted Over Time
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">Tons (1,000 kg)</span>
            </div>

            {volumeBuckets.length === 0 || totalVolumePeriod === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Log completed workouts to populate the volume chart.
              </p>
            ) : (
              <div ref={chartContainerRef} className="w-full">
                <svg ref={chartSvgRef} className="w-full" />
              </div>
            )}
          </div>

          {/* Interactive Muscle Heatmap */}
          <MuscleHeatmap stats={muscleStats} maxVolume={maxMuscleVolume} />

          {/* Muscle Volume Distribution */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Individual Muscle Volume Breakdown
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Targeted volume and completed sets per individual muscle
                </p>
              </div>

              {/* Group Quick Filter */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Neck'].map((grp) => (
                  <button
                    key={grp}
                    onClick={() => setDistFilter(grp)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                      distFilter === grp
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#27272a]/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {DETAILED_MUSCLES
                .filter((m) => distFilter === 'All' || m.group === distFilter)
                .map((m) => {
                  const data = muscleStats[m.key] || { volume: 0, sets: 0, exercises: [] };
                  const pct = totalVolumePeriod > 0 ? Math.round((data.volume / totalVolumePeriod) * 100) : 0;
                  const intensity = maxMuscleVolume > 0 ? (data.volume / maxMuscleVolume) * 100 : 0;
                  return {
                    muscle: m,
                    data,
                    pct,
                    intensity
                  };
                })
                .sort((a, b) => b.data.volume - a.data.volume || b.data.sets - a.data.sets)
                .map(({ muscle, data, pct, intensity }) => {
                  const hasData = data.volume > 0;
                  return (
                    <div
                      key={muscle.key}
                      className={`p-2.5 rounded-xl border transition-all ${
                        hasData
                          ? 'bg-[#121214] border-zinc-800/80 hover:border-zinc-700'
                          : 'bg-[#121214]/40 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">
                            {muscle.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {muscle.group}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-semibold text-white">
                            {Math.round(data.volume).toLocaleString()} kg
                          </span>
                          <span className="text-[10px] text-zinc-400 ml-1.5 font-mono">
                            ({data.sets} sets)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            intensity > 60
                              ? 'bg-emerald-400'
                              : intensity > 25
                              ? 'bg-emerald-500'
                              : intensity > 0
                              ? 'bg-emerald-700'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.max(intensity, hasData ? 3 : 0)}%` }}
                        />
                      </div>

                      {/* Exercises contributing */}
                      {data.exercises.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {data.exercises.slice(0, 3).map((ex) => (
                            <span
                              key={ex}
                              className="text-[10px] text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded"
                            >
                              {ex}
                            </span>
                          ))}
                          {data.exercises.length > 3 && (
                            <span className="text-[10px] text-zinc-500">
                              +{data.exercises.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HISTORY LOGS */}
      {subTab === 'history' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {workouts.length === 0 ? (
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 text-center">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">No workouts logged yet</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Start an empty workout or template to log your sets.
              </p>
            </div>
          ) : (
            workouts.map((w) => {
              const isExpanded = expandedWorkoutId === w.id;
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
                  <div
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : w.id)}
                    className="p-4 cursor-pointer hover:bg-zinc-800/20 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{w.name}</h3>
                        <span className="text-[11px] text-zinc-400 font-mono">{dateStr}</span>
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
                          if (confirm(`Delete workout "${w.name}"?`)) {
                            onDeleteWorkout(w.id);
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition"
                        title="Delete workout"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Workout Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#27272a] space-y-3 bg-[#121214]">
                      {w.notes && (
                        <p className="text-xs text-zinc-400 italic bg-[#18181b] p-2.5 rounded-xl border border-[#27272a]">
                          "{w.notes}"
                        </p>
                      )}
                      <div className="space-y-3">
                        {w.exercises.map((ex, exIdx) => {
                          const completed = ex.sets.filter((s) => s.completed);
                          return (
                            <div key={exIdx} className="space-y-1.5">
                              <div
                                onClick={() =>
                                  setSelectedExerciseForModal({
                                    id: `ex_${ex.name}`,
                                    rawId: ex.rawId,
                                    name: ex.name,
                                    muscle: ex.muscle as any
                                  })
                                }
                                className="flex items-center justify-between cursor-pointer group"
                              >
                                <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition flex items-center gap-1">
                                  {ex.name}
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                                </span>
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  {ex.muscle}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {completed.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 flex justify-between"
                                  >
                                    <span className="text-zinc-500">Set {s.setNumber}</span>
                                    <span className="font-semibold text-white">
                                      {s.weight}kg × {s.reps}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 3: PERSONAL RECORDS & PROGRESSION */}
      {subTab === 'prs' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">
              Tap any exercise card below to view its <strong>Progression Graph</strong> and details.
            </span>
          </div>

          {allPersonalRecords.length === 0 ? (
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 text-center">
              <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <h3 className="font-semibold text-white text-sm">No Personal Records Yet</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Log completed sets during workouts to automatically calculate your 1RM and PRs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allPersonalRecords.map((pr) => (
                <div
                  key={pr.exerciseName}
                  onClick={() =>
                    setSelectedExerciseForModal({
                      id: `pr_${pr.exerciseName}`,
                      rawId: pr.rawId,
                      name: pr.exerciseName,
                      muscle: pr.muscle as any
                    })
                  }
                  className="bg-[#18181b] hover:bg-zinc-800/40 border border-[#27272a] hover:border-emerald-500/50 rounded-2xl p-3.5 shadow-sm cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                        {pr.muscle}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                        {pr.exerciseName}
                      </h4>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition shrink-0" />
                  </div>

                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#27272a]">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Est. 1RM</span>
                      <span className="text-lg font-bold font-mono text-[#38bdf8] tabular-nums">
                        {pr.oneRm} {unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Heaviest Lift</span>
                      <span className="text-xs font-semibold font-mono text-white">
                        {pr.weight} {unit} × {pr.reps}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exercise Detail Modal (Progression Graph + History) */}
      {selectedExerciseForModal && (
        <ExerciseDetailModal
          exercise={selectedExerciseForModal}
          onClose={() => setSelectedExerciseForModal(null)}
          workouts={workouts}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}
    </div>
  );
};
