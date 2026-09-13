import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-lg transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-[0.985]',
  {
    variants: {
      variant: {
        primary: 'bg-black hover:bg-neutral-800 text-white',
        secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800',
        outline: 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90',
        ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 shadow-none active:scale-100',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs gap-1.5 h-8',
        md: 'px-4 py-2 text-xs gap-2 h-9',
        lg: 'px-4 py-2.5 text-xs gap-2 h-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant,
      size,
      isLoading = false,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? <span className="animate-pulse">Loading...</span> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
