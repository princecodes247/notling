import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  BarChart3,
  PieChart,
  LayoutGrid,
  Layers,
  TrendingUp,
  AlignLeft,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseChartViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
}

type ChartType = 'bar' | 'column' | 'donut' | 'metrics';

const PALETTE = [
  { fill: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', glow: 'rgba(16, 185, 129, 0.2)' },
  { fill: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500', glow: 'rgba(59, 130, 246, 0.2)' },
  { fill: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500', glow: 'rgba(245, 158, 11, 0.2)' },
  { fill: '#8b5cf6', bg: 'bg-purple-500', text: 'text-purple-500', glow: 'rgba(139, 92, 246, 0.2)' },
  { fill: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', glow: 'rgba(236, 72, 153, 0.2)' },
  { fill: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-500', glow: 'rgba(6, 182, 212, 0.2)' },
  { fill: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-500', glow: 'rgba(99, 102, 241, 0.2)' },
  { fill: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-500', glow: 'rgba(20, 184, 166, 0.2)' },
  { fill: '#f97316', bg: 'bg-orange-500', text: 'text-orange-500', glow: 'rgba(249, 115, 22, 0.2)' },
];

export const DatabaseChartView: React.FC<DatabaseChartViewProps> = ({
  properties,
  items,
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const groupableProps = properties.filter(
    (p) => p.type === 'status' || p.type === 'select' || p.type === 'multi_select' || p.type === 'checkbox'
  );

  const [selectedPropId, setSelectedPropId] = useState<string>(
    groupableProps[0]?.id || ''
  );

  const activeProp = properties.find((p) => p.id === selectedPropId) || groupableProps[0];
  const counts: Record<string, number> = {};

  if (activeProp) {
    items.forEach((item) => {
      const val = item.properties?.[activeProp.id];
      if (activeProp.type === 'checkbox') {
        const key = Boolean(val) ? 'Checked' : 'Unchecked';
        counts[key] = (counts[key] || 0) + 1;
      } else if (activeProp.type === 'multi_select' && Array.isArray(val)) {
        if (val.length === 0) {
          counts['No Tag'] = (counts['No Tag'] || 0) + 1;
        } else {
          val.forEach((optId) => {
            const opt = activeProp.options?.find((o) => o.id === optId);
            const name = opt?.name || optId;
            counts[name] = (counts[name] || 0) + 1;
          });
        }
      } else if (val) {
        const opt = activeProp.options?.find((o) => o.id === val);
        const name = opt?.name || String(val);
        counts[name] = (counts[name] || 0) + 1;
      } else {
        counts['(Empty)'] = (counts['(Empty)'] || 0) + 1;
      }
    });
  } else {
    counts['Total Items'] = items.length;
  }

  const total = items.length || 1;
  const entries = Object.entries(counts);
  const maxCount = Math.max(...entries.map(([, c]) => c), 1);

  return (
    <div className="w-full space-y-6 pb-12 select-none font-sans pt-1">
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200/60 dark:border-zinc-800/60">
        {/* Left: Grouping Dropdown & Title */}
        <div className="flex items-center gap-3">
          {groupableProps.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-zinc-400">
              <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="text-stone-500 dark:text-zinc-400">Group by:</span>
              <select
                value={activeProp?.id || ''}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-stone-100 dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 text-xs font-medium focus:outline-none cursor-pointer"
              >
                {groupableProps.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
              Database Analytics
            </span>
          )}

          <span className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-zinc-400 bg-stone-100/70 dark:bg-zinc-800/60 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>{items.length} records</span>
          </span>
        </div>

        {/* Right: Chart Type Switcher */}
        <div className="flex items-center gap-1 bg-stone-100/80 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-stone-200/60 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
              chartType === 'bar'
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-2xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            )}
            title="Horizontal Bar Chart"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bar</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('column')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
              chartType === 'column'
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-2xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            )}
            title="Vertical Column Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Column</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
              chartType === 'donut'
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-2xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            )}
            title="Donut / Pie Chart"
          >
            <PieChart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Donut</span>
          </button>

          <button
            type="button"
            onClick={() => setChartType('metrics')}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
              chartType === 'metrics'
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 shadow-2xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            )}
            title="Metric Cards Breakdown"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {entries.length === 0 ? (
        <div className="py-16 text-center text-xs text-stone-400 dark:text-zinc-500">
          No records to visualize
        </div>
      ) : chartType === 'bar' ? (
        /* --- HORIZONTAL BAR CHART --- */
        <div className="space-y-4 pt-2">
          {entries.map(([label, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const palette = PALETTE[idx % PALETTE.length];
            const opt = activeProp?.options?.find((o) => o.name === label);
            const badge = opt ? getOptionBadgeStyles(opt.color) : null;

            return (
              <div key={label} className="space-y-1.5 group">
                <div className="flex justify-between items-center text-xs font-medium text-stone-800 dark:text-zinc-200">
                  <div className="flex items-center gap-2">
                    {badge ? (
                      <span
                        className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                        style={badge.style}
                      >
                        {label}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.fill }} />
                        <span className="truncate max-w-[200px]">{label}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-stone-500 dark:text-zinc-400 text-xs">
                    {count} <span className="text-stone-400 dark:text-zinc-500">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                    style={{
                      width: `${Math.min(100, Math.max(3, pct))}%`,
                      backgroundColor: palette.fill,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : chartType === 'column' ? (
        /* --- VERTICAL COLUMN CHART --- */
        <div className="pt-6 space-y-6">
          <div className="h-64 flex items-end gap-3 sm:gap-6 px-2 pb-4 border-b border-stone-200/80 dark:border-zinc-800/80">
            {entries.map(([label, count], idx) => {
              const heightPct = Math.round((count / maxCount) * 100);
              const pct = Math.round((count / total) * 100);
              const palette = PALETTE[idx % PALETTE.length];

              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none z-10">
                    {count} records ({pct}%)
                  </div>

                  <span className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                    {count}
                  </span>

                  <div className="w-full max-w-[60px] h-full flex items-end">
                    <div
                      className="w-full rounded-t-md transition-all duration-500 ease-out group-hover:brightness-110"
                      style={{
                        height: `${Math.max(6, heightPct)}%`,
                        backgroundColor: palette.fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Column Labels */}
          <div className="flex gap-3 sm:gap-6 px-2">
            {entries.map(([label]) => {
              const opt = activeProp?.options?.find((o) => o.name === label);
              const badge = opt ? getOptionBadgeStyles(opt.color) : null;

              return (
                <div key={label} className="flex-1 text-center truncate">
                  {badge ? (
                    <span
                      className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-full", badge.className)}
                      style={badge.style}
                    >
                      {label}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-stone-600 dark:text-zinc-400 truncate block">
                      {label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : chartType === 'donut' ? (
        /* --- DONUT / PIE CHART --- */
        <div className="flex flex-col md:flex-row items-center justify-around gap-8 pt-4">
          {/* SVG Donut */}
          <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
              {(() => {
                let cumulativeAngle = 0;
                const circumference = 2 * Math.PI * 36; // radius = 36

                return entries.map(([label, count], idx) => {
                  const ratio = count / total;
                  const strokeDasharray = `${ratio * circumference} ${circumference}`;
                  const strokeDashoffset = -cumulativeAngle * circumference;
                  cumulativeAngle += ratio;
                  const palette = PALETTE[idx % PALETTE.length];
                  const isHovered = hoveredSlice === label;

                  return (
                    <circle
                      key={label}
                      cx="50"
                      cy="50"
                      r="36"
                      fill="transparent"
                      stroke={palette.fill}
                      strokeWidth={isHovered ? 16 : 14}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      onMouseEnter={() => setHoveredSlice(label)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  );
                });
              })()}
            </svg>

            {/* Central Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
                {hoveredSlice ? counts[hoveredSlice] || 0 : items.length}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
                {hoveredSlice || 'Total Records'}
              </span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="flex-1 w-full max-w-sm space-y-2">
            {entries.map(([label, count], idx) => {
              const pct = Math.round((count / total) * 100);
              const palette = PALETTE[idx % PALETTE.length];
              const opt = activeProp?.options?.find((o) => o.name === label);
              const badge = opt ? getOptionBadgeStyles(opt.color) : null;
              const isHovered = hoveredSlice === label;

              return (
                <div
                  key={label}
                  onMouseEnter={() => setHoveredSlice(label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                    isHovered ? "bg-stone-100 dark:bg-zinc-800" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.fill }} />
                    {badge ? (
                      <span
                        className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                        style={badge.style}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-stone-800 dark:text-zinc-200 truncate">
                        {label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-stone-500 dark:text-zinc-400 shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* --- METRIC SUMMARY CARDS --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {entries.map(([label, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const palette = PALETTE[idx % PALETTE.length];
            const opt = activeProp?.options?.find((o) => o.name === label);
            const badge = opt ? getOptionBadgeStyles(opt.color) : null;

            return (
              <div
                key={label}
                className="p-4 rounded-xl bg-stone-50/70 dark:bg-zinc-900/60 border border-stone-200/70 dark:border-zinc-800/80 space-y-3 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-all group"
              >
                <div className="flex items-center justify-between">
                  {badge ? (
                    <span
                      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", badge.className)}
                      style={badge.style}
                    >
                      {label}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.fill }} />
                      <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 truncate">
                        {label}
                      </span>
                    </div>
                  )}
                  <span className="text-[11px] font-mono text-stone-400 dark:text-zinc-500">
                    {pct}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-stone-900 dark:text-white">
                    {count}
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                    of {items.length} records
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-stone-200/70 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(3, pct))}%`,
                      backgroundColor: palette.fill,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
