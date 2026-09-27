import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface DatabasePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  width?: number | string;
  minWidth?: number;
}

export function DatabasePopover({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = '',
  align = 'left',
  width,
  minWidth = 190,
}: DatabasePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState({});

  // Helper to compute exact viewport coordinates from triggerRef synchronously
  const computePosition = () => {
    if (typeof window === 'undefined' || !triggerRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current?.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const targetWidth = typeof width === 'number' ? width : minWidth;
    const popWidth = Math.max(popoverRect?.width || targetWidth, targetWidth);
    const popHeight = popoverRect?.height || 220;

    // Default top: below trigger
    let top = triggerRect.bottom + 6;

    // If bottom edge overflows viewport, render above trigger
    if (top + popHeight > viewportHeight - 12 && triggerRect.top - popHeight - 6 > 12) {
      top = triggerRect.top - popHeight - 6;
    }

    // Default left calculation
    let left = align === 'right' ? triggerRect.right - popWidth : triggerRect.left;

    // Right boundary check
    if (left + popWidth > viewportWidth - 12) {
      left = viewportWidth - popWidth - 12;
    }

    // Left boundary check
    if (left < 12) {
      left = 12;
    }

    return {
      top: Math.max(12, top),
      left: Math.max(12, left),
      maxWidth: viewportWidth - 24,
    };
  };

  // Re-measure after mount in case DOM size changed
  useLayoutEffect(() => {
    if (isOpen) {
      forceUpdate({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      forceUpdate({});
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, triggerRef, onClose]);

  if (typeof document === 'undefined') return null;

  const pos = isOpen && triggerRef.current ? computePosition() : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          key="database-popover-panel"
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: typeof width === 'number' ? `${width}px` : width || 'auto',
            minWidth: `${minWidth}px`,
            maxWidth: `${pos.maxWidth}px`,
            zIndex: 99999,
          }}
          className={`rounded-md bg-white dark:bg-[#18181b] border border-stone-200/90 dark:border-zinc-800/90 shadow-2xl p-1 px-0.5 font-sans antialiased select-none ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
