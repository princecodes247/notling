import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ActiveUserPresence } from '~/server/pages.db';

interface CollaboratorAvatarsProps {
  activeUsers: ActiveUserPresence[];
  currentClientId?: string;
  className?: string;
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  activeUsers,
  currentClientId,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const uniqueUsers = useMemo(() => {
    if (!activeUsers || !Array.isArray(activeUsers)) return [];
    const seen = new Set<string>();
    const list: ActiveUserPresence[] = [];
    for (const u of activeUsers) {
      const key = (u.email || u.name || u.id || u.clientId || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(u);
      }
    }
    // Stable deterministic sort so avatar order remains completely static
    list.sort((a, b) => {
      const isACurrent = currentClientId && a.clientId === currentClientId;
      const isBCurrent = currentClientId && b.clientId === currentClientId;
      if (isACurrent && !isBCurrent) return -1;
      if (!isACurrent && isBCurrent) return 1;
      const nameA = (a.name || a.email || '').toLowerCase();
      const nameB = (b.name || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return list;
  }, [activeUsers, currentClientId]);

  if (uniqueUsers.length === 0) return null;

  const displayUsers = uniqueUsers.slice(0, 4);
  const extraCount = uniqueUsers.length - displayUsers.length;
  const hoveredUser = hoveredIndex !== null ? displayUsers[hoveredIndex] : null;

  return (
    <div
      className={`flex items-center gap-1.5 relative ${className}`}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="flex items-center -space-x-2 py-1 relative">
        {displayUsers.map((user, index) => {
          const isEditor = user.role === 'editor';
          const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
          const userId = user.id || user.clientId || user.email;

          return (
            <div
              key={userId}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Avatar Circle */}
              <motion.div
                whileHover={{ scale: 1.15, zIndex: 30 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-xs cursor-pointer border-2 border-white transition-colors ${
                  isEditor ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                <span>{initial}</span>

                {/* Role Status Dot */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    isEditor
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse'
                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  }`}
                />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Overflow Count Pill */}
      {extraCount > 0 && (
        <span className="text-[10px] font-bold text-stone-600 bg-stone-100/90 px-2 py-0.5 rounded-full border border-stone-200 shadow-2xs">
          +{extraCount}
        </span>
      )}

      {/* Shared Single Floating Tooltip Card */}
      <AnimatePresence>
        {hoveredUser !== null && hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{
              layout: { type: 'spring', stiffness: 450, damping: 30 },
              opacity: { duration: 0.15 },
            }}
            className="absolute top-full mt-2.5 bg-stone-900/95 backdrop-blur-md text-white text-[11px] font-sans px-3 py-2 rounded-xl shadow-2xl border border-stone-800 z-50 whitespace-nowrap pointer-events-none min-w-[120px]"
            style={{
              left: `${hoveredIndex * 16}px`,
              transform: 'translateX(-20%)',
            }}
            layout
          >
            {/* Content morph transition */}
            <motion.div
              key={hoveredUser.id || hoveredUser.clientId || hoveredUser.email}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col gap-0.5"
            >
              {/* User Title Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-stone-100 tracking-tight">
                  {hoveredUser.name || (hoveredUser.email?.includes('@notling.app') ? 'Guest User' : hoveredUser.email.split('@')[0])}
                </span>
                {hoveredUser.clientId === currentClientId ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-mono font-medium">
                    You
                  </span>
                ) : (hoveredUser.email?.includes('@notling.app') || hoveredUser.email?.startsWith('guest-')) ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800/80 text-stone-400 font-mono font-medium">
                    Guest
                  </span>
                ) : null}
              </div>

              {/* Email Subtext (only for real authenticated users) */}
              {hoveredUser.email &&
                !hoveredUser.email.includes('@notling.app') &&
                !hoveredUser.email.startsWith('guest-') &&
                hoveredUser.email !== (hoveredUser.name || hoveredUser.email.split('@')[0]) && (
                  <div className="text-[10px] text-stone-400 font-mono tracking-tight truncate max-w-[160px]">
                    {hoveredUser.email}
                  </div>
                )}

              {/* Role Status Badge */}
              <div className="flex items-center gap-1.5 text-[10px] mt-1.5 pt-1.5 border-t border-stone-800/80">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    hoveredUser.role === 'editor'
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse'
                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  }`}
                />
                <span className={`font-semibold tracking-wide ${hoveredUser.role === 'editor' ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {hoveredUser.role === 'editor' ? 'Can edit' : 'View only'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
