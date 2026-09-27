import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { parseDateInput } from '~/lib/databaseValidation';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (dateStr: string) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  onClose,
  readOnly = false,
}) => {
  const initialDate = value && !isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [typedInput, setTypedInput] = useState(value || '');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const formatDateString = (y: number, m: number, d: number): string => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const selectedDateStr = value ? new Date(value).toISOString().slice(0, 10) : '';

  const handleSelectDay = (dayNum: number) => {
    if (readOnly) return;
    const formatted = formatDateString(year, month, dayNum);
    setTypedInput(formatted);
    onChange(formatted);
    onClose?.();
  };

  const handleTypedSubmit = () => {
    if (readOnly) return;
    const parsed = parseDateInput(typedInput);
    if (parsed !== null) {
      onChange(parsed);
      const d = new Date(parsed);
      if (!isNaN(d.getTime())) setViewDate(d);
      onClose?.();
    } else {
      onChange(typedInput);
      onClose?.();
    }
  };

  const handleTypedChange = (str: string) => {
    setTypedInput(str);
    const parsed = parseDateInput(str);
    if (parsed) {
      const d = new Date(parsed);
      if (!isNaN(d.getTime())) {
        setViewDate(d);
      }
    }
  };

  const handleSelectPreset = (preset: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    if (readOnly) return;
    const now = new Date();
    if (preset === 'today') {
      const formatted = formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
      setTypedInput(formatted);
      onChange(formatted);
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const formatted = formatDateString(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      setTypedInput(formatted);
      onChange(formatted);
    } else if (preset === 'nextWeek') {
      const nextW = new Date(now);
      nextW.setDate(now.getDate() + 7);
      const formatted = formatDateString(nextW.getFullYear(), nextW.getMonth(), nextW.getDate());
      setTypedInput(formatted);
      onChange(formatted);
    } else if (preset === 'clear') {
      setTypedInput('');
      onChange('');
    }
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="p-3 bg-white dark:bg-zinc-900 w-64 select-none z-50 text-xs font-sans cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Typeable Input inside Picker */}
      <div className="mb-2 pb-2 border-b border-stone-100 dark:border-zinc-800 flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Type date (e.g. 2026-09-27 or today)..."
          value={typedInput}
          disabled={readOnly}
          onChange={(e) => handleTypedChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleTypedSubmit();
            }
          }}
          className="w-full px-2 py-1 text-xs rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
          autoFocus
        />
        <button
          type="button"
          onClick={handleTypedSubmit}
          disabled={readOnly}
          className="p-1 rounded-lg bg-[#1f4d3d] hover:bg-[#183e31] text-white cursor-pointer shrink-0"
          title="Apply Date"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header controls */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-zinc-100">
          <CalendarIcon className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400" />
          <span>{monthNames[month]} {year}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-500 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center font-medium text-[10px] text-stone-400 dark:text-zinc-500 mb-1">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const currentStr = formatDateString(year, month, dayNum);
          const isSelected = selectedDateStr === currentStr;
          const isToday = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === currentStr;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleSelectDay(dayNum)}
              className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${isSelected
                  ? 'bg-[#1f4d3d] dark:bg-emerald-600 text-white font-semibold shadow-2xs'
                  : isToday
                    ? 'border border-[#1f4d3d] text-[#1f4d3d] dark:text-emerald-400 font-semibold'
                    : 'hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200'
                }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Presets footer */}
      <div className="mt-3 pt-2 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-medium text-stone-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectPreset('today')}
            className="hover:text-stone-900 dark:hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('tomorrow')}
            className="hover:text-stone-900 dark:hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-zinc-800"
          >
            Tomorrow
          </button>
        </div>
        <button
          type="button"
          onClick={() => handleSelectPreset('clear')}
          className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer px-1 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          Clear
        </button>
      </div>
    </motion.div>
  );
};
