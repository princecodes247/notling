import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans select-none">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onCancel} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-[#fdfcf9] dark:bg-[#18181b] border border-stone-200/90 dark:border-zinc-800 rounded-xl shadow-[0_24px_70px_-15px_rgba(28,25,23,0.24),0_0_0_1px_rgba(28,25,23,0.06)] overflow-hidden flex flex-col p-6 gap-4 text-stone-900 dark:text-zinc-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs'
              }`}
            >
              {isDanger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-stone-900 dark:text-white">{title}</h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200/60 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200/80 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 text-xs font-semibold tracking-tight transition-colors cursor-pointer border border-stone-200/80 dark:border-zinc-700/80"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`px-4 py-2 rounded-lg text-white text-xs font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-98 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-brand-bg hover:bg-brand-hover text-brand-fg'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
