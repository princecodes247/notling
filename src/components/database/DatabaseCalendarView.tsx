import React, { useState, useMemo } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Layers,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseCalendarViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem?: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const DatabaseCalendarView: React.FC<DatabaseCalendarViewProps> = ({
  properties,
  items,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDatePropId, setSelectedDatePropId] = useState<string | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Find date properties
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

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to extract item date string YYYY-MM-DD
  const getItemDateStr = (item: DatabaseItem): string | null => {
    if (activeDateProp) {
      const val = item.properties?.[activeDateProp.id];
      if (val) {
        try {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
        } catch {
          // ignore
        }
      }
    }
    // Fallback to createdAt
    if (item.createdAt) {
      try {
        const d = new Date(item.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // ignore
      }
    }
    return null;
  };

  // Group items by date string
  const { itemsByDate, unscheduledItems } = useMemo(() => {
    const map = new Map<string, DatabaseItem[]>();
    const unscheduled: DatabaseItem[] = [];

    items.forEach((item) => {
      const dateStr = getItemDateStr(item);
      if (dateStr) {
        const existing = map.get(dateStr) || [];
        existing.push(item);
        map.set(dateStr, existing);
      } else {
        unscheduled.push(item);
      }
    });

    return { itemsByDate: map, unscheduledItems: unscheduled };
  }, [items, activeDateProp]);

  // Generate Month Grid Days
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const str = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const str = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: true,
        isToday: str === todayStr,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const str = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    return days;
  }, [year, month]);

  // Generate Week Grid Days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const todayStr = new Date().toISOString().split('T')[0];
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const str = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: d.getMonth() === month,
        isToday: str === todayStr,
      });
    }

    return days;
  }, [currentDate, month]);

  const handleCreateOnDate = (dateStr: string) => {
    if (readOnly) return;
    const initialProps: Record<string, any> = {};
    if (activeDateProp) {
      initialProps[activeDateProp.id] = dateStr;
    }
    onAddItem(initialProps);
  };

  return (
    <div className="w-full h-full flex flex-col font-sans select-none text-stone-900 dark:text-zinc-100">
      {/* Calendar Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 pt-1 border-b border-stone-200/70 dark:border-zinc-800">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Previous"
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
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-sm sm:text-base font-semibold text-stone-800 dark:text-zinc-100">
            {MONTH_NAMES[month]} {year}
          </h3>
        </div>

        {/* View Switcher & Settings */}
        <div className="flex items-center gap-2">
          {/* Date Property Dropdown if multiple */}
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

          {/* Month / Week View Toggle */}
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                viewMode === 'month'
                  ? "bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 shadow-xs"
                  : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                viewMode === 'week'
                  ? "bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 shadow-xs"
                  : "text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
              )}
            >
              Week
            </button>
          </div>

          {/* Unscheduled Items Button */}
          {unscheduledItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                showUnscheduled
                  ? "border-[#1f4d3d] bg-emerald-50 text-[#1f4d3d] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>No Date ({unscheduledItems.length})</span>
            </button>
          )}

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

      {/* Main Calendar View Area */}
      <div className="flex-1 min-h-0 flex gap-4 pt-3 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0 border border-stone-200/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40 shadow-xs">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-stone-200/80 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/80 text-center py-2 text-[11px] font-semibold text-stone-500 dark:text-zinc-400">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="truncate px-1">
                {day}
              </div>
            ))}
          </div>

          {/* Month / Week Grid Cells */}
          <div
            className={cn(
              "flex-1 grid grid-cols-7 overflow-y-auto divide-x divide-y divide-stone-200/60 dark:divide-zinc-800/60",
              viewMode === 'month' ? "auto-rows-fr" : "grid-rows-1 min-h-[450px]"
            )}
          >
            {(viewMode === 'month' ? monthDays : weekDays).map((dayCell, idx) => {
              const dayItems = itemsByDate.get(dayCell.dateStr) || [];

              return (
                <div
                  key={`${dayCell.dateStr}-${idx}`}
                  className={cn(
                    "min-h-[100px] p-1.5 flex flex-col group transition-colors relative",
                    dayCell.isCurrentMonth
                      ? "bg-white dark:bg-zinc-900/30"
                      : "bg-stone-50/40 dark:bg-zinc-950/40 opacity-60",
                    dayCell.isToday && "bg-emerald-50/20 dark:bg-emerald-950/10"
                  )}
                >
                  {/* Day Header Row */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                        dayCell.isToday
                          ? "bg-[#1f4d3d] text-white"
                          : dayCell.isCurrentMonth
                          ? "text-stone-700 dark:text-zinc-200"
                          : "text-stone-400 dark:text-zinc-600"
                      )}
                    >
                      {dayCell.date.getDate()}
                    </span>

                    {/* Quick Add Button on Hover */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleCreateOnDate(dayCell.dateStr)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-stone-800 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                        title={`Add page for ${dayCell.dateStr}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Day Item Cards */}
                  <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar max-h-[120px]">
                    {dayItems.map((item) => {
                      const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
                      const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
                      const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

                      return (
                        <div
                          key={item.id}
                          onClick={() => onOpenRowDrawer?.(item)}
                          className="group/item flex items-center gap-1.5 px-2 py-1 rounded-md bg-stone-50 dark:bg-zinc-800/80 hover:bg-stone-100 dark:hover:bg-zinc-700/80 border border-stone-200/70 dark:border-zinc-700/60 text-xs cursor-pointer shadow-2xs transition-all hover:translate-y-[-1px]"
                        >
                          {badge && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: badge.style?.color || '#1f4d3d' }}
                            />
                          )}
                          <span className="truncate font-medium text-stone-800 dark:text-zinc-200 flex-1">
                            {item.title || 'Untitled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled Items Drawer Panel */}
        {showUnscheduled && unscheduledItems.length > 0 && (
          <div className="w-72 shrink-0 border border-stone-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/80 shadow-xs flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/70 dark:border-zinc-800">
              <span className="text-xs font-semibold text-stone-700 dark:text-zinc-200">
                Unscheduled Items ({unscheduledItems.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1.5 no-scrollbar">
              {unscheduledItems.map((item) => {
                const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
                const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
                const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => onOpenRowDrawer?.(item)}
                    className="p-2 rounded-lg border border-stone-200/70 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/50 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-stone-800 dark:text-zinc-200 truncate">
                      {item.title || 'Untitled'}
                    </div>
                    {badge && (
                      <span
                        className={cn("inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium", badge.className)}
                        style={badge.style}
                      >
                        {statusOpt?.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
