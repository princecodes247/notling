import React, { useState, useMemo } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseTimelineViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem?: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

type ZoomLevel = 'days' | 'weeks' | 'months';

export const DatabaseTimelineView: React.FC<DatabaseTimelineViewProps> = ({
  properties,
  items,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('days');
  const [startDateOffset, setStartDateOffset] = useState<number>(-3); // Start 3 days before today
  const [selectedDatePropId, setSelectedDatePropId] = useState<string | null>(null);

  const dateProperties = useMemo(() => {
    return properties.filter((p) => p.type === 'date' || p.type === 'created_at');
  }, [properties]);

  const activeDateProp = useMemo(() => {
    if (selectedDatePropId) {
      const found = dateProperties.find((p) => p.id === selectedDatePropId);
      if (found) return found;
    }
    return dateProperties[0] || null;
  }, [dateProperties, selectedDatePropId]);

  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');

  // Generate timeline slots based on zoom level and offset
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const columnCount = zoomLevel === 'days' ? 21 : zoomLevel === 'weeks' ? 14 : 12;

  const timelineSlots = useMemo(() => {
    const slots = [];
    const base = new Date(today);

    if (zoomLevel === 'days') {
      base.setDate(base.getDate() + startDateOffset);
      for (let i = 0; i < columnCount; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const str = d.toISOString().split('T')[0];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        slots.push({
          date: d,
          dateStr: str,
          label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
          shortLabel: `${d.getDate()}`,
          dayName: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
          isToday: str === todayStr,
          isWeekend,
        });
      }
    } else if (zoomLevel === 'weeks') {
      base.setDate(base.getDate() + startDateOffset * 7);
      for (let i = 0; i < columnCount; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i * 7);
        const str = d.toISOString().split('T')[0];
        slots.push({
          date: d,
          dateStr: str,
          label: `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
          shortLabel: `W${Math.ceil(d.getDate() / 7)}`,
          dayName: d.toLocaleDateString(undefined, { month: 'short' }),
          isToday: str === todayStr,
          isWeekend: false,
        });
      }
    } else {
      base.setMonth(base.getMonth() + startDateOffset);
      for (let i = 0; i < columnCount; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
        const str = d.toISOString().split('T')[0];
        slots.push({
          date: d,
          dateStr: str,
          label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
          shortLabel: d.toLocaleDateString(undefined, { month: 'short' }),
          dayName: `${d.getFullYear()}`,
          isToday: d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
          isWeekend: false,
        });
      }
    }

    return slots;
  }, [today, todayStr, zoomLevel, startDateOffset, columnCount]);

  const minTimelineDate = timelineSlots[0]?.date || today;
  const maxTimelineDate = timelineSlots[timelineSlots.length - 1]?.date || today;

  // Helper to extract item date and calculate slot position
  const getItemRange = (item: DatabaseItem) => {
    let itemDate: Date | null = null;
    if (activeDateProp) {
      const val = item.properties?.[activeDateProp.id];
      if (val) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) itemDate = parsed;
      }
    }
    if (!itemDate && item.createdAt) {
      const parsed = new Date(item.createdAt);
      if (!isNaN(parsed.getTime())) itemDate = parsed;
    }

    if (!itemDate) return null;

    const startDiff = (itemDate.getTime() - minTimelineDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalDiff = (maxTimelineDate.getTime() - minTimelineDate.getTime()) / (1000 * 60 * 60 * 24);

    if (totalDiff <= 0) return null;

    let leftPct = (startDiff / totalDiff) * 100;
    let widthPct = zoomLevel === 'days' ? 6 : zoomLevel === 'weeks' ? 8 : 10;

    // Constrain within bounds
    leftPct = Math.max(0, Math.min(94, leftPct));

    return {
      leftPct,
      widthPct,
      dateFormatted: itemDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  };

  const handlePrev = () => {
    setStartDateOffset((prev) => prev - (zoomLevel === 'days' ? 7 : zoomLevel === 'weeks' ? 4 : 2));
  };

  const handleNext = () => {
    setStartDateOffset((prev) => prev + (zoomLevel === 'days' ? 7 : zoomLevel === 'weeks' ? 4 : 2));
  };

  const handleToday = () => {
    setStartDateOffset(-3);
  };

  return (
    <div className="w-full h-full flex flex-col font-sans select-none text-stone-900 dark:text-zinc-100">
      {/* Timeline Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 pt-1 border-b border-stone-200/70 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-zinc-200 hover:bg-stone-200/70 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
            {timelineSlots[0]?.label} — {timelineSlots[timelineSlots.length - 1]?.label}
          </span>
        </div>

        {/* Zoom & Property Controls */}
        <div className="flex items-center gap-2">
          {dateProperties.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <select
                value={activeDateProp?.id || ''}
                onChange={(e) => setSelectedDatePropId(e.target.value)}
                className="bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-md px-2 py-1 text-xs font-medium text-stone-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                {dateProperties.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    By {dp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Zoom Level Switcher */}
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 p-0.5 text-xs">
            {(['days', 'weeks', 'months'] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setZoomLevel(level);
                  setStartDateOffset(0);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer",
                  zoomLevel === level
                    ? "bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 shadow-xs"
                    : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => onAddItem()}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1f4d3d] hover:bg-[#183d30] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Grid */}
      <div className="flex-1 min-h-0 flex border border-stone-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 shadow-xs mt-3">
        {/* Left Item Titles Column */}
        <div className="w-64 sm:w-72 shrink-0 border-r border-stone-200/80 dark:border-zinc-800 flex flex-col bg-stone-50/50 dark:bg-zinc-900/70">
          <div className="h-10 px-3 flex items-center border-b border-stone-200/80 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
            Page / Item
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-200/60 dark:divide-zinc-800/60 no-scrollbar">
            {items.map((item) => {
              const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
              const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenRowDrawer?.(item)}
                  className="h-10 px-3 flex items-center justify-between gap-2 hover:bg-stone-100/70 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-medium text-stone-800 dark:text-zinc-200 truncate flex-1">
                    {item.title || 'Untitled'}
                  </span>

                  {badge && (
                    <span
                      className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", badge.className)}
                      style={badge.style}
                    >
                      {statusOpt?.name}
                    </span>
                  )}
                </div>
              );
            })}

            {!readOnly && (
              <button
                type="button"
                onClick={() => onAddItem()}
                className="w-full h-10 px-3 flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New page</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Gantt Chart View Canvas */}
        <div className="flex-1 flex flex-col overflow-x-auto no-scrollbar relative min-w-[500px]">
          {/* Header Dates Row */}
          <div className="h-10 flex border-b border-stone-200/80 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/80 sticky top-0 z-10">
            {timelineSlots.map((slot) => (
              <div
                key={slot.dateStr}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center border-r border-stone-200/50 dark:border-zinc-800/50 text-[10px] min-w-[40px]",
                  slot.isToday && "bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-[#1f4d3d] dark:text-emerald-400",
                  slot.isWeekend && "bg-stone-100/30 dark:bg-zinc-950/30 text-stone-400"
                )}
              >
                <span className="text-[9px] text-stone-400 dark:text-zinc-500 font-medium leading-tight">
                  {slot.dayName}
                </span>
                <span className="font-semibold">{slot.shortLabel}</span>
              </div>
            ))}
          </div>

          {/* Timeline Row Bars */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-200/60 dark:divide-zinc-800/60 relative">
            {items.map((item) => {
              const range = getItemRange(item);
              const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
              const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

              return (
                <div
                  key={item.id}
                  className="h-10 relative flex items-center hover:bg-stone-50/40 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timelineSlots.map((slot) => (
                      <div
                        key={`grid-${slot.dateStr}`}
                        className={cn(
                          "flex-1 border-r border-stone-200/30 dark:border-zinc-800/30 min-w-[40px]",
                          slot.isToday && "bg-emerald-500/5",
                          slot.isWeekend && "bg-stone-100/20 dark:bg-zinc-950/20"
                        )}
                      />
                    ))}
                  </div>

                  {/* Horizontal Bar */}
                  {range && (
                    <div
                      onClick={() => onOpenRowDrawer?.(item)}
                      style={{
                        left: `${range.leftPct}%`,
                        width: `${Math.max(range.widthPct, 12)}%`,
                      }}
                      className={cn(
                        "absolute h-6 rounded-md px-2 flex items-center gap-1.5 shadow-2xs border text-xs font-medium cursor-pointer transition-all hover:scale-[1.02] hover:z-20 truncate",
                        badge
                          ? "bg-[#1f4d3d] text-white border-emerald-700/50 dark:bg-emerald-800 dark:border-emerald-600"
                          : "bg-stone-800 text-stone-100 border-stone-700 dark:bg-zinc-700 dark:border-zinc-600"
                      )}
                    >
                      <span className="truncate">{item.title || 'Untitled'}</span>
                      <span className="text-[10px] opacity-80 shrink-0 ml-auto">{range.dateFormatted}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
