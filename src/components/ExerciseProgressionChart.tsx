import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';

export interface ProgressionDataPoint {
  date: string; // ISO date string or YYYY-MM-DD
  weight: number; // in kg
  reps: number;
  workoutName?: string;
}

interface ExerciseProgressionChartProps {
  data: ProgressionDataPoint[];
  exerciseName: string;
  secondaryMuscles?: string[];
  unit?: string;
}

export const ExerciseProgressionChart: React.FC<ExerciseProgressionChartProps> = ({
  data,
  exerciseName,
  secondaryMuscles = [],
  unit = 'kg'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sort chronologically
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Active / scrubbed point (defaults to the most recent data point)
  const [activePoint, setActivePoint] = useState<ProgressionDataPoint | null>(null);

  useEffect(() => {
    if (sortedData.length > 0) {
      setActivePoint(sortedData[sortedData.length - 1]);
    } else {
      setActivePoint(null);
    }
  }, [sortedData]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sortedData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth || 340;
    const height = 180;
    const margin = { top: 20, right: 20, bottom: 30, left: 45 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parsedData = sortedData.map((d) => ({
      ...d,
      parsedDate: new Date(d.date)
    }));

    // Scales
    const xExtent = d3.extent(parsedData, (d) => d.parsedDate) as [Date, Date];
    // If only 1 data point, broaden the range slightly
    const minDate = xExtent[0];
    const maxDate = xExtent[1];
    let domainX: [Date, Date] = [minDate, maxDate];
    if (minDate && maxDate && minDate.getTime() === maxDate.getTime()) {
      domainX = [
        new Date(minDate.getTime() - 24 * 3600 * 1000 * 7),
        new Date(maxDate.getTime() + 24 * 3600 * 1000 * 7)
      ];
    }

    const xScale = d3.scaleTime().domain(domainX).range([0, innerWidth]);

    const yMin = d3.min(parsedData, (d) => d.weight) || 0;
    const yMax = d3.max(parsedData, (d) => d.weight) || 100;
    const yPadding = Math.max(5, (yMax - yMin) * 0.15);

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines (subtle dark gray)
    const yTicks = yScale.ticks(4);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
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
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(parsedData.length, 4))
      .tickFormat((d) => d3.timeFormat('%b %-d')(d as Date))
      .tickSize(0)
      .tickPadding(10);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d} ${unit}`)
      .tickSize(0)
      .tickPadding(8);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((axis) => axis.select('.domain').attr('stroke', '#27272a'))
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    g.append('g')
      .call(yAxis)
      .call((axis) => axis.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#71717a')
      .attr('font-size', '11px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Line generator with smooth curve
    const lineGenerator = d3
      .line<(typeof parsedData)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScale(d.weight))
      .curve(d3.curveMonotoneX);

    // Gradient fill under the line
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', `gradient-${exerciseName.replace(/[^a-zA-Z0-9]/g, '')}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0284c7').attr('stop-opacity', 0.25);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0284c7').attr('stop-opacity', 0.0);

    const areaGenerator = d3
      .area<(typeof parsedData)[0]>()
      .x((d) => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1((d) => yScale(d.weight))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', `url(#gradient-${exerciseName.replace(/[^a-zA-Z0-9]/g, '')})`)
      .attr('d', areaGenerator);

    // Bold electric blue line (identical to user screenshot)
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#0ea5e9')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Interactive Vertical Crosshair cursor line
    const cursorLine = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#0284c7')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    // Glowing active halo around selected node
    const haloCircle = g
      .append('circle')
      .attr('r', 10)
      .attr('fill', '#0284c7')
      .attr('opacity', 0.35)
      .style('opacity', 0);

    const activeCircle = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#09090b')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    // Data points
    g.selectAll('.dot')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(d.parsedDate))
      .attr('cy', (d) => yScale(d.weight))
      .attr('r', 4)
      .attr('fill', '#0284c7')
      .attr('stroke', '#09090b')
      .attr('stroke-width', 1.5);

    // Helper to update cursor position
    const updateCursor = (target: (typeof parsedData)[0]) => {
      const cx = xScale(target.parsedDate);
      const cy = yScale(target.weight);

      cursorLine.attr('x1', cx).attr('x2', cx).style('opacity', 1);
      haloCircle.attr('cx', cx).attr('cy', cy).style('opacity', 1);
      activeCircle.attr('cx', cx).attr('cy', cy).style('opacity', 1);
      setActivePoint(target);
    };

    // Initialize cursor on the most recent point
    if (parsedData.length > 0) {
      updateCursor(parsedData[parsedData.length - 1]);
    }

    // Interactive overlay for touch scrubbing
    const bisectDate = d3.bisector((d: (typeof parsedData)[0]) => d.parsedDate).center;

    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const handlePointerMove = (event: any) => {
      const [mx] = d3.pointer(event);
      const x0 = xScale.invert(mx);
      const idx = bisectDate(parsedData, x0);
      const d = parsedData[Math.max(0, Math.min(parsedData.length - 1, idx))];
      if (d) {
        updateCursor(d);
      }
    };

    overlay.on('mousemove', handlePointerMove).on('touchmove', handlePointerMove);
  }, [sortedData, exerciseName, unit]);

  // Formatted date string for active point
  const formattedActiveDate = useMemo(() => {
    if (!activePoint) return '';
    const date = new Date(activePoint.date);
    if (isNaN(date.getTime())) return activePoint.date;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [activePoint]);

  if (sortedData.length === 0) {
    return (
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-5 text-center">
        <p className="text-xs text-zinc-400">No workout sets logged yet for this exercise.</p>
        <p className="text-[11px] text-zinc-500 mt-1">Complete a workout to track weight progression here.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-2xl p-4 select-none">
      {/* Secondary Muscle Tag (matches screenshot top header) */}
      {secondaryMuscles.length > 0 && (
        <div className="text-[11px] text-zinc-400 font-medium mb-1">
          Secondary: {secondaryMuscles.join(', ')}
        </div>
      )}

      {/* Prominent Weight & Date Headline (identical to screenshot: "80 kg Oct 23") */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {activePoint ? `${activePoint.weight} ${unit}` : '--'}
        </span>
        <span className="text-xl font-bold font-mono text-[#38bdf8]">
          {formattedActiveDate}
        </span>
        {activePoint && (
          <span className="text-xs text-zinc-400 ml-auto font-mono">
            {activePoint.reps} reps
          </span>
        )}
      </div>

      {/* D3 SVG chart */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>

      <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-2 px-1">
        <span>Drag or tap to inspect history</span>
        <span>{sortedData.length} sessions logged</span>
      </div>
    </div>
  );
};
