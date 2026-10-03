import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { TrendingUp, BarChart3, Layers } from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseChartViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
}

export const DatabaseChartView: React.FC<DatabaseChartViewProps> = ({
  properties,
  items,
}) => {
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
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

  return (
    <div className="w-full max-w-4xl space-y-6 pb-12 select-none font-sans pt-1">
      {/* Analytics Card */}
      <div className="p-5 rounded-lg bg-white dark:bg-[#18181b] border border-stone-200/70 dark:border-zinc-800/70 space-y-5 shadow-2xs">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/60 dark:border-zinc-800/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-stone-100 dark:bg-zinc-800 text-[#1f4d3d] dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 dark:text-zinc-100">
                {activeProp ? `Breakdown by ${activeProp.name}` : 'Database Analytics'}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                Distribution across {items.length} records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {groupableProps.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={activeProp?.id || ''}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="px-2.5 py-1 rounded-md bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-zinc-100 text-xs font-medium focus:outline-none cursor-pointer"
                >
                  {groupableProps.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-zinc-300 bg-stone-100/70 dark:bg-zinc-800 px-2.5 py-1 rounded-md font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{items.length} Total</span>
            </span>
          </div>
        </div>

        {/* Visual Progress Breakdown */}
        <div className="space-y-3.5 pt-0.5">
          {Object.entries(counts).map(([label, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const color = colors[idx % colors.length];
            const opt = activeProp?.options?.find((o) => o.name === label);
            const badge = opt ? getOptionBadgeStyles(opt.color) : null;

            return (
              <div key={label} className="space-y-1">
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
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span>{label}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-stone-500 dark:text-zinc-400 text-xs">
                    {count} <span className="text-stone-400 dark:text-zinc-600">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}

          {Object.keys(counts).length === 0 && (
            <div className="py-12 text-center text-xs text-stone-400 dark:text-zinc-500">
              No data to visualize
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
