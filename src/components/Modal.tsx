import React, { useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center max-sm:items-end justify-center p-4 max-sm:p-0 bg-stone-950/45 backdrop-blur-xs select-none animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / iOS Bottom Sheet Container */}
      <div
        className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-[#fdfcf9] border border-stone-200/90 rounded-2xl max-sm:rounded-b-none max-sm:rounded-t-[24px] shadow-[0_24px_70px_-15px_rgba(28,25,23,0.24),0_0_0_1px_rgba(28,25,23,0.06)] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 max-sm:slide-in-from-bottom-full duration-200 max-sm:max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Sheet Drag Handle Pill */}
        <div className="w-10 h-1 rounded-full bg-stone-300 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        {(title || icon || subtitle) && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/60 flex items-center justify-between bg-[#f8f7f4]/90 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-200/90 flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20">
                  {icon}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-stone-900 truncate tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <span className="text-[11px] text-stone-500">{subtitle}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer active-press"
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:px-6 sm:py-6 flex-1 overflow-y-auto max-h-[75vh] sm:max-h-[80vh]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-stone-200/60 bg-[#f8f7f4]/80 flex items-center justify-between shrink-0 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

