import React, { useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
  bodyClassName?: string;
  offsetBottom?: number;
  hideHeader?: boolean;
  hideHandle?: boolean;
  zIndex?: number;
  dark?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  children,
  maxHeight = 'max-h-[85vh]',
  className = '',
  bodyClassName = '',
  offsetBottom = 0,
  hideHeader = false,
  hideHandle = false,
  zIndex = 50,
  dark = false,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If pulled down far enough or flicked downwards with velocity, dismiss
    if (info.offset.y > 80 || info.velocity.y > 300) {
      onClose();
    }
  };

  const baseCardStyles = dark
    ? 'bg-[#1c1c1c] text-white border-t border-stone-800 shadow-[0_-12px_45px_rgba(0,0,0,0.5)]'
    : 'bg-[#fdfcf9] text-stone-900 border-t border-stone-200/90 shadow-[0_-12px_45px_rgba(28,25,23,0.18)]';

  const pillStyles = dark
    ? 'bg-stone-600 hover:bg-stone-500'
    : 'bg-stone-300 hover:bg-stone-400';

  const headerStyles = dark
    ? 'border-b border-stone-800 bg-[#181818]'
    : 'border-b border-stone-200/60 bg-[#f8f7f4]/80';

  const closeButtonStyles = dark
    ? 'text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer'
    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 active:bg-stone-200 transition-colors cursor-pointer';

  const footerStyles = dark
    ? 'border-t border-stone-800 bg-[#181818]'
    : 'border-t border-stone-200/60 bg-[#f8f7f4]/80';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            key="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs select-none"
            style={{ zIndex }}
            onClick={onClose}
          />

          {/* Bottom Sheet Card */}
          <motion.div
            key="bottom-sheet-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.7 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
            className={`fixed left-0 right-0 rounded-t-[24px] ${baseCardStyles} ${maxHeight} flex flex-col overflow-hidden pb-safe select-none ${className}`}
            style={{
              zIndex: zIndex + 1,
              bottom: `${offsetBottom}px`,
            }}
          >
            {/* iOS Drag Handle Pill */}
            {!hideHandle && (
              <div
                className={`w-10 h-1.5 rounded-full ${pillStyles} mx-auto mt-2.5 mb-1.5 shrink-0 cursor-grab active:cursor-grabbing transition-colors`}
              />
            )}

            {/* Header */}
            {!hideHeader && (title || subtitle || icon || headerRight) && (
              <div
                className={`px-4 sm:px-5 py-2.5 sm:py-3 ${headerStyles} flex items-center justify-between shrink-0`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {icon && (
                    <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                      {icon}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    {title && (
                      <h3
                        className={`text-xs sm:text-sm font-semibold tracking-tight truncate ${
                          dark ? 'text-white' : 'text-stone-900'
                        }`}
                      >
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <span
                        className={`text-[11px] truncate ${
                          dark ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {headerRight}
                  <button
                    type="button"
                    onClick={onClose}
                    className={`p-1 rounded-lg ${closeButtonStyles}`}
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Sheet Scrollable Body */}
            <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div
                className={`px-4 sm:px-5 py-3 ${footerStyles} flex items-center justify-between shrink-0 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]`}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
