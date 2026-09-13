import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useIsMobile } from '~/hooks/useIsMobile';
import { BottomSheet } from './BottomSheet';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'lg',
  children,
  footer,
  headerRight,
}) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // On Mobile: Delegate to Apple-level BottomSheet with spring physics & swipe dismiss
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        icon={icon}
        headerRight={headerRight}
        footer={footer}
        zIndex={9999}
        bodyClassName="p-5"
      >
        {children}
      </BottomSheet>
    );
  }

  // On Desktop: Centered animated modal dialog
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Desktop Dialog Card */}
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-[#fdfcf9] dark:bg-[#18181b] border border-stone-200/90 dark:border-stone-800 rounded-2xl shadow-[0_24px_70px_-15px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col relative z-10`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || icon || subtitle) && (
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/60 dark:border-stone-800 flex items-center justify-between bg-[#f8f7f4]/90 dark:bg-[#1c1c1f]/90 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-200/90 flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20">
                      {icon}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    {title && (
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate tracking-tight">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">{subtitle}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerRight}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer active-press"
                    title="Close"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className="p-5 sm:px-6 sm:py-6 flex-1 overflow-y-auto max-h-[80vh] text-stone-900 dark:text-stone-100">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-5 sm:px-6 py-3.5 border-t border-stone-200/60 dark:border-stone-800 bg-[#f8f7f4]/80 dark:bg-[#1c1c1f]/80 flex items-center justify-between shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
