import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ActiveUserPresence } from '~/server/pages.db';
import { UserAvatar } from '~/components/UserAvatar';

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
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const uniqueUsers = useMemo(() => {
    if (!activeUsers || !Array.isArray(activeUsers)) return [];
    const seen = new Set<string>();
    const list: ActiveUserPresence[] = [];
    for (const u of activeUsers) {
      // Exclude own user presence: only display OTHER collaborators
      const isSelf = currentClientId && (u.clientId === currentClientId || u.id === currentClientId);
      if (isSelf) continue;

      const key = (u.email || u.name || u.id || u.clientId || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(u);
      }
    }
    // Stable deterministic sort so avatar order remains completely static
    list.sort((a, b) => {
      const nameA = (a.name || a.email || '').toLowerCase();
      const nameB = (b.name || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return list;
  }, [activeUsers, currentClientId]);

  const handleAvatarHover = (index: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const distanceToRightEdge = window.innerWidth - rect.right;
      // If container is within 180px of the right screen edge, anchor tooltip to the right
      if (distanceToRightEdge < 180 || index >= 2) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
    setHoveredIndex(index);
  };

  if (uniqueUsers.length === 0) return null;

  const displayUsers = uniqueUsers.slice(0, 4);
  const extraCount = uniqueUsers.length - displayUsers.length;
  const hoveredUser = hoveredIndex !== null ? displayUsers[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1.5 relative ${className}`}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="flex items-center -space-x-2 py-1 relative">
        {displayUsers.map((user, index) => {
          const isEditor = user.role === 'editor';
          const userId = user.id || user.clientId || user.email;

          return (
            <div
              key={userId}
              className="relative"
              onMouseEnter={() => handleAvatarHover(index)}
            >
              {/* Avatar Circle */}
              <motion.div
                whileHover={{ scale: 1.15, zIndex: 30 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="relative rounded-full cursor-pointer shrink-0"
              >
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  seed={user.email || user.name || user.id}
                  name={user.name || user.email}
                  size={24}
                  className="w-6 h-6"
                />

                {/* Role Status Dot */}
                <span
                  className={`absolute bottom-1 right-0.5 w-2 h-2 rounded-full border border-white z-0 ${isEditor
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

      {/* Viewport-Aware Shared Floating Tooltip Card */}
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
            className={`absolute top-full mt-2 bg-stone-900/95 backdrop-blur-md text-white text-[11px] font-sans px-3 py-2.5 rounded-xl shadow-2xl border border-stone-800 z-50 pointer-events-none w-[175px] ${alignRight ? 'right-0' : ''
              }`}
            style={
              alignRight
                ? undefined
                : {
                  left: `${Math.max(0, hoveredIndex * 16 - 12)}px`,
                }
            }
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
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <UserAvatar
                    avatarUrl={hoveredUser.avatarUrl}
                    seed={hoveredUser.email || hoveredUser.name || hoveredUser.id}
                    name={hoveredUser.name || hoveredUser.email}
                    size={16}
                    className="w-4 h-4 shrink-0 border border-white/20"
                  />
                  <span
                    className="font-semibold text-stone-100 tracking-tight truncate min-w-0"
                    title={hoveredUser.name || hoveredUser.email}
                  >
                    {hoveredUser.name || (hoveredUser.email?.includes('@notling.app') ? 'Guest User' : hoveredUser.email.split('@')[0])}
                  </span>
                </div>
                {hoveredUser.clientId === currentClientId ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-mono font-medium shrink-0">
                    You
                  </span>
                ) : (hoveredUser.email?.includes('@notling.app') || hoveredUser.email?.startsWith('guest-')) ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800/80 text-stone-400 font-mono font-medium shrink-0">
                    Guest
                  </span>
                ) : null}
              </div>

              {/* Fixed Height Email / Status Row to prevent Card Jitter */}
              <div className="h-4 flex items-center min-w-0">
                {hoveredUser.email &&
                  !hoveredUser.email.includes('@notling.app') &&
                  !hoveredUser.email.startsWith('guest-') ? (
                  <span
                    className="text-[10px] text-stone-400 font-mono tracking-tight truncate w-full"
                    title={hoveredUser.email}
                  >
                    {hoveredUser.email}
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500 font-mono tracking-tight">
                    {hoveredUser.email?.includes('@notling.app') ? 'Anonymous visitor' : 'Workspace member'}
                  </span>
                )}
              </div>

              {/* Role Status Badge */}
              <div className="flex items-center gap-1.5 text-[10px] mt-1 pt-1.5 border-t border-stone-800/80">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${hoveredUser.role === 'editor'
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
