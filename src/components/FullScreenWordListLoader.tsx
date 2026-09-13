import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface FullScreenWordListLoaderProps {
  words?: string[];
  title?: string;
  subtitle?: string;
  intervalMs?: number;
  showProgress?: boolean;
  theme?: 'light' | 'dark';
}

const DEFAULT_WORDS = [
  'Initializing workspace...',
  'Configuring page structure...',
  'Setting up starter templates...',
  'Syncing security permissions...',
  'Polishing interface details...',
  'Preparing your environment...',
];

export const FullScreenWordListLoader: React.FC<FullScreenWordListLoaderProps> = ({
  words = DEFAULT_WORDS,
  title,
  subtitle,
  intervalMs = 2500,
  showProgress = false,
  theme: explicitTheme,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [words, intervalMs]);

  const containerThemeClass = explicitTheme === 'dark'
    ? 'dark bg-[#121214] text-zinc-100'
    : explicitTheme === 'light'
      ? 'bg-[#fafaf9] text-stone-900'
      : 'bg-[var(--bg-canvas)] dark:bg-[#121214] text-stone-900 dark:text-zinc-100';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden transition-colors duration-150 ${containerThemeClass}`}
    >
      {/* Background delicate radial grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 transition-opacity duration-150"
        style={{
          backgroundImage: 'radial-gradient(var(--border-color, #d4d4d4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Cycling Word List Container */}
        <div className="h-8 flex items-center justify-center my-1 relative w-full overflow-hidden">
          {title ? (
            <h2 className="text-base font-semibold tracking-tight mb-1 text-neutral-950 dark:text-white">
              {title}
            </h2>
          ) : (
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-base font-medium tracking-tight mb-1 flex items-center justify-center gap-2 text-neutral-950 dark:text-white"
              >
                <span>{words[index]}</span>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {subtitle && (
          <p className="text-xs mb-6 font-normal text-neutral-400 dark:text-zinc-400">
            {subtitle}
          </p>
        )}

        {/* Minimal Progress Bar line */}
        {showProgress && (
          <div className="w-48 h-1 rounded-full overflow-hidden mt-4 bg-neutral-200/80 dark:bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-neutral-900 dark:bg-white"
              initial={{ width: '15%' }}
              animate={{ width: `${Math.min(95, ((index + 1) / words.length) * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FullScreenWordListLoader;
