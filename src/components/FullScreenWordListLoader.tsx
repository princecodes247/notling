import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '~/context/ThemeContext';

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
  const { isDark: contextIsDark } = useTheme();
  const isDark = explicitTheme ? explicitTheme === 'dark' : contextIsDark;

  useEffect(() => {
    if (words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [words, intervalMs]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden transition-colors duration-150 ${
        isDark ? 'bg-[#121214] text-zinc-100' : 'bg-[#fafaf9] text-stone-900'
      }`}
    >
      {/* Background delicate radial grid backdrop */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
          isDark ? 'opacity-15' : 'opacity-40'
        }`}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(#52525b 1px, transparent 1px)'
            : 'radial-gradient(#d4d4d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Cycling Word List Container */}
        <div className="h-8 flex items-center justify-center my-1 relative w-full overflow-hidden">
          {title ? (
            <h2
              className={`text-base font-semibold tracking-tight mb-1 ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
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
                className={`text-base font-medium tracking-tight mb-1 flex items-center justify-center gap-2 ${
                  isDark ? 'text-white' : 'text-neutral-950'
                }`}
              >
                <span>{words[index]}</span>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {subtitle && (
          <p
            className={`text-xs mb-6 font-normal ${
              isDark ? 'text-zinc-500' : 'text-neutral-400'
            }`}
          >
            {subtitle}
          </p>
        )}

        {/* Minimal Progress Bar line */}
        {showProgress && (
          <div
            className={`w-48 h-1 rounded-full overflow-hidden mt-4 ${
              isDark ? 'bg-zinc-800' : 'bg-neutral-200/80'
            }`}
          >
            <motion.div
              className={`h-full rounded-full ${
                isDark ? 'bg-white' : 'bg-neutral-900'
              }`}
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
