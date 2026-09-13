import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface FullScreenWordListLoaderProps {
  words?: string[];
  title?: string;
  subtitle?: string;
  intervalMs?: number;
  showProgress?: boolean
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
  showProgress = false
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [words, intervalMs]);

  return (
    <div className="fixed inset-0 z-50 bg-[#fafaf9] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden">
      {/* Background delicate radial grid backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">

        {/* Cycling Word List Container */}
        <div className="h-8 flex items-center justify-center my-3 relative w-full overflow-hidden">
          {title ? (
            <h2 className="text-base font-semibold text-neutral-950 tracking-tight mb-1">
              {title}
            </h2>) : (
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-base font-medium text-neutral-950 tracking-tight mb-1 flex items-center justify-center gap-2"
              >
                <span>{words[index]}</span>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-neutral-400 mb-6 font-normal">
            {subtitle}
          </p>
        )}

        {/* Minimal Progress Bar line at bottom */}
        {showProgress && <div className="w-48 h-1 bg-neutral-200/80 rounded-full overflow-hidden mt-4">
          <motion.div
            className="h-full bg-neutral-900 rounded-full"
            initial={{ width: '15%' }}
            animate={{ width: `${Math.min(95, ((index + 1) / words.length) * 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        </div>}
      </div>
    </div>
  );
};

export default FullScreenWordListLoader;
