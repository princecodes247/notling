import React from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import { PieChart, TrendingUp } from 'lucide-react';

interface DatabaseChartViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
}

export const DatabaseChartView: React.FC<DatabaseChartViewProps> = ({
  properties,
  items,
}) => {
  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const counts: Record<string, number> = {};

  if (statusProp) {
    items.forEach((item) => {
      const val = item.properties?.[statusProp.id] || 'Unassigned';
      counts[val] = (counts[val] || 0) + 1;
    });
  } else {
    counts['Total Items'] = items.length;
  }

  const total = items.length || 1;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <div className="w-full max-w-4xl space-y-6 pb-8 select-none">
      <div className="p-6 rounded-2xl bg-stone-50/80 dark:bg-zinc-900/60 border border-stone-200/80 dark:border-zinc-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-zinc-100">
              {statusProp ? `Breakdown by ${statusProp.name}` : 'Database Analytics'}
            </h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400 bg-stone-200/60 dark:bg-zinc-800 px-3 py-1 rounded-full font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>{items.length} Total Items</span>
          </span>
        </div>

        {/* Visual Bar Graph */}
        <div className="space-y-4 pt-2">
          {Object.entries(counts).map(([label, count], idx) => {
            const pct = Math.round((count / total) * 100);
            const color = colors[idx % colors.length];

            return (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-stone-800 dark:text-zinc-200">
                  <span>{label}</span>
                  <span className="font-mono text-stone-500 dark:text-zinc-400">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
