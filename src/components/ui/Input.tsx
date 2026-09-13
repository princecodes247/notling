import React from 'react';
import { cn } from '~/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-neutral-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50',
            error ? 'border-rose-400 focus:ring-rose-500' : 'border-neutral-200',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
        {!error && helperText && <span className="text-[11px] text-neutral-400">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
