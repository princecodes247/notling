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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans select-none animate-in fade-in duration-150">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-white border border-neutral-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || icon || subtitle) && (
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && (
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-neutral-900 truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <span className="text-[11px] text-neutral-400">{subtitle}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[80vh]">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
