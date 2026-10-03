import React, { useMemo } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  CheckCircle2,
  Layers,
  TrendingUp,
  Plus,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseDashboardViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem?: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

export const DatabaseDashboardView: React.FC<DatabaseDashboardViewProps> = ({
  properties,
  items,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const checkboxProps = properties.filter((p) => p.type === 'checkbox');

  // Compute status analytics
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let completedCount = 0;

    items.forEach((item) => {
      if (statusProp) {
        const val = item.properties?.[statusProp.id];
        const opt = statusProp.options?.find((o) => o.id === val);
        const name = opt?.name || 'Unassigned';
        counts[name] = (counts[name] || 0) + 1;

        if (
          name.toLowerCase().includes('done') ||
          name.toLowerCase().includes('complete') ||
          name.toLowerCase().includes('closed')
        ) {
          completedCount++;
        }
      }

      // Checkbox completions
      checkboxProps.forEach((cb) => {
        if (item.properties?.[cb.id]) {
          completedCount++;
        }
      });
    });

    const total = items.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return { counts, completedCount, completionRate, total };
  }, [items, statusProp, checkboxProps]);

  // Recent items (last 5)
  const recentItems = useMemo(() => {
    return [...items].slice(0, 5);
  }, [items]);

  return (
    <div className="w-full space-y-6 pb-16 font-sans select-none text-stone-900 dark:text-zinc-100">
      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Records */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Records</span>
            <Layers className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {statusStats.total}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">
            Across {properties.length} properties
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {statusStats.completionRate}%
          </div>
          <div className="w-full bg-stone-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#1f4d3d] dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${statusStats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Completed Items */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <TrendingUp className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {statusStats.completedCount}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">
            {statusStats.total - statusStats.completedCount} remaining
          </div>
        </div>

        {/* Active Categories */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Status Groups</span>
            <PieChart className="w-4 h-4 text-[#1f4d3d] dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            {Object.keys(statusStats.counts).length}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-zinc-500">
            Distribution buckets
          </div>
        </div>
      </div>

      {/* Grid: Status Distribution & Recent Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution Panel */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-stone-800 dark:text-zinc-200 uppercase tracking-wider">
              Status Breakdown
            </h4>
            <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-medium">
              {statusProp?.name || 'Status'}
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(statusStats.counts).map(([statusName, count]) => {
              const opt = statusProp?.options?.find((o) => o.name === statusName);
              const badge = opt ? getOptionBadgeStyles(opt.color) : null;
              const pct = statusStats.total > 0 ? Math.round((count / statusStats.total) * 100) : 0;

              return (
                <div key={statusName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      {badge ? (
                        <span
                          className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                          style={badge.style}
                        >
                          {statusName}
                        </span>
                      ) : (
                        <span className="text-stone-700 dark:text-zinc-300">{statusName}</span>
                      )}
                    </div>
                    <span className="text-stone-500 dark:text-zinc-400 text-[11px]">
                      {count} ({pct}%)
                    </span>
                  </div>

                  <div className="w-full bg-stone-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: badge?.style?.color || '#1f4d3d',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Updates Panel */}
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-stone-800 dark:text-zinc-200 uppercase tracking-wider">
              Recent Records
            </h4>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onAddItem()}
                className="flex items-center gap-1 text-xs font-semibold text-[#1f4d3d] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 divide-y divide-stone-200/60 dark:divide-zinc-800/60">
            {recentItems.map((item) => {
              const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
              const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenRowDrawer?.(item)}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 group cursor-pointer hover:bg-stone-50/70 dark:hover:bg-zinc-800/40 p-1.5 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-semibold text-stone-800 dark:text-zinc-200 group-hover:text-[#1f4d3d] dark:group-hover:text-emerald-400 transition-colors truncate">
                      {item.title || 'Untitled'}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      {badge && (
                        <span
                          className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                          style={badge.style}
                        >
                          {statusOpt?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
