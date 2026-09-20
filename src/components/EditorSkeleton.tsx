import React from 'react';

export const EditorSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#18181b] overflow-hidden select-none font-sans">
      {/* Header Bar Skeleton */}
      <header className="h-12 border-b border-stone-200/80 dark:border-zinc-800/80 px-4 sm:px-6 md:px-12 flex items-center justify-between bg-[#fdfcf9]/80 dark:bg-[#18181b]/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-stone-200/70 dark:bg-zinc-800 animate-pulse" />
          <div className="w-36 h-4 rounded bg-stone-200/80 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-stone-200/70 dark:bg-zinc-800 animate-pulse" />
          <div className="w-6 h-6 rounded bg-stone-200/70 dark:bg-zinc-800 animate-pulse" />
          <div className="w-16 h-7 rounded-lg bg-stone-200/80 dark:bg-zinc-800 animate-pulse" />
          <div className="w-16 h-7 rounded-lg bg-stone-200/80 dark:bg-zinc-800 animate-pulse" />
        </div>
      </header>

      {/* Document Body Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 md:px-16 lg:px-24">
        <div className="max-w-3xl mx-auto flex flex-col">
          {/* Icon Skeleton */}
          <div className="w-12 h-12 rounded-xl bg-stone-200/80 dark:bg-zinc-800 animate-pulse mb-4" />

          {/* Title Skeleton */}
          <div className="w-3/4 sm:w-2/3 h-9 sm:h-10 rounded-lg bg-stone-200/90 dark:bg-zinc-800 animate-pulse mb-4" />

          {/* Metadata Pill Skeleton */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-24 h-5 rounded-full bg-stone-200/70 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-20 h-4 rounded bg-stone-200/60 dark:bg-zinc-800/60 animate-pulse" />
          </div>

          {/* Document Content Skeleton Lines */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="w-full h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-[92%] h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-[82%] h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />

            <div className="w-2/5 h-6 rounded bg-stone-300/70 dark:bg-zinc-700/70 animate-pulse mt-4 mb-1" />

            <div className="w-full h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-[88%] h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-[75%] h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
            <div className="w-[60%] h-4 rounded bg-stone-200/80 dark:bg-zinc-800/80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
