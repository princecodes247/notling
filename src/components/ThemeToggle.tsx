import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Sun02Icon, Moon02Icon, ComputerIcon } from '@hugeicons/core-free-icons';
import { useTheme, type ThemeMode } from '~/context/ThemeContext';

export type { ThemeMode } from '~/context/ThemeContext';
export { getInitialThemeMode, applyThemeMode } from '~/context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'pill' | 'segmented' | 'icon' | 'cards';
  className?: string;
}

export default function ThemeToggle({ variant = 'segmented', className = '' }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  if (!mounted) return null;

  if (variant === 'cards') {
    const options: Array<{ id: ThemeMode; label: string; icon: typeof Sun02Icon; desc: string }> = [
      { id: 'light', label: 'Light', icon: Sun02Icon, desc: 'Clean high-contrast light theme' },
      { id: 'dark', label: 'Dark', icon: Moon02Icon, desc: 'Apple-grade matte carbon dark theme' },
      { id: 'system', label: 'System', icon: ComputerIcon, desc: 'Automatically matches OS settings' },
    ];

    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {options.map((opt) => {
          const isSelected = mode === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectMode(opt.id)}
              className={`relative flex flex-col p-4 rounded-xl text-left border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-neutral-100/90 dark:bg-zinc-800 border-neutral-900 dark:border-white shadow-xs ring-1 ring-neutral-900/10 dark:ring-white/20'
                  : 'bg-white dark:bg-zinc-900/50 border-neutral-200/90 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  <HugeiconsIcon icon={Icon} size={16} />
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected
                    ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white'
                    : 'border-neutral-300 dark:border-zinc-700'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />}
                </div>
              </div>

              <span className={`text-xs font-semibold ${isSelected ? 'text-neutral-950 dark:text-white' : 'text-neutral-800 dark:text-zinc-200'}`}>
                {opt.label}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5 leading-snug">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'icon') {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    return (
      <button
        type="button"
        onClick={() => handleSelectMode(nextMode)}
        title={`Current: ${mode}. Click to switch theme.`}
        className={`w-8 h-8 rounded-lg flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-all cursor-pointer active:scale-95 ${className}`}
      >
        {mode === 'light' ? (
          <HugeiconsIcon icon={Sun02Icon} size={15} className="text-amber-500" />
        ) : mode === 'dark' ? (
          <HugeiconsIcon icon={Moon02Icon} size={15} className="text-indigo-400" />
        ) : (
          <HugeiconsIcon icon={ComputerIcon} size={15} className="text-stone-500 dark:text-stone-400" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-800/80 border border-stone-300/50 dark:border-stone-700/60 shadow-2xs select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => handleSelectMode('light')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight transition-all cursor-pointer ${
          mode === 'light'
            ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        <HugeiconsIcon icon={Sun02Icon} size={13} className={mode === 'light' ? 'text-amber-500' : ''} />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelectMode('dark')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight transition-all cursor-pointer ${
          mode === 'dark'
            ? 'bg-stone-900 dark:bg-stone-900 text-white shadow-xs ring-1 ring-white/10'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        <HugeiconsIcon icon={Moon02Icon} size={13} className={mode === 'dark' ? 'text-indigo-400' : ''} />
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelectMode('system')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight transition-all cursor-pointer ${
          mode === 'system'
            ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
        }`}
      >
        <HugeiconsIcon icon={ComputerIcon} size={13} />
        <span>System</span>
      </button>
    </div>
  );
}
