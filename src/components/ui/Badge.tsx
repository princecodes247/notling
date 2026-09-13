import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center font-semibold rounded-full border shadow-2xs',
  {
    variants: {
      variant: {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
        neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-[11px] px-2.5 py-1 gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ children, variant, size, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {children}
    </span>
  );
}
