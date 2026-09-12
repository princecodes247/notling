import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { cva, type VariantProps } from 'class-variance-authority';

export const selectTriggerVariants = cva(
  'inline-flex items-center justify-between gap-1.5 rounded-md focus:outline-none cursor-pointer transition-all active:scale-[0.98]',
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1 text-[11px] font-semibold',
        md: 'px-3 py-1.5 text-xs font-medium',
        lg: 'px-3.5 py-2 text-sm font-medium rounded-lg',
      },
      variant: {
        default: 'bg-stone-100 text-stone-700 hover:bg-stone-200/70 border border-stone-200/80',
        subtle: 'bg-transparent text-stone-700 hover:bg-stone-100 border border-transparent',
        outline: 'bg-white text-stone-900 hover:bg-stone-50 border border-stone-200',
      },
    },
    defaultVariants: {
      size: 'sm',
      variant: 'default',
    },
  }
);

export const selectOptionVariants = cva(
  'w-full text-left rounded-lg flex items-center justify-between transition-colors cursor-pointer',
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1.5 text-[11px]',
        md: 'px-3 py-2 text-xs',
        lg: 'px-3.5 py-2.5 text-sm',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }
);

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectProps<T extends string = string>
  extends VariantProps<typeof selectTriggerVariants> {
  value: T;
  options: SelectOption<T>[];
  onChange: (newValue: T) => void;
  disabled?: boolean;
  className?: string;
  dropdownWidth?: number;
  matchTriggerWidth?: boolean;
  align?: 'left' | 'right';
  placeholder?: string;
}

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  disabled,
  className = '',
  dropdownWidth,
  matchTriggerWidth = false,
  align = 'right',
  placeholder = 'Select option...',
  size = 'sm',
  variant = 'default',
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: dropdownWidth || 176,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find((o) => o.value === value);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const targetWidth = matchTriggerWidth ? rect.width : (dropdownWidth || 176);

      let calculatedLeft = align === 'left' ? rect.left : rect.right - targetWidth;

      // Ensure dropdown does not overflow left boundary
      if (calculatedLeft < 8) calculatedLeft = 8;
      // Ensure dropdown does not overflow right boundary
      if (calculatedLeft + targetWidth > viewportWidth - 8) {
        calculatedLeft = viewportWidth - targetWidth - 8;
      }

      setCoords({
        top: rect.bottom + 4,
        left: calculatedLeft,
        width: targetWidth,
      });
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const isFullWidth = className.includes('w-full');
  const iconSize = size === 'lg' ? 14 : size === 'md' ? 12 : 10;

  return (
    <div className={`text-left select-none ${isFullWidth ? 'w-full' : 'inline-block'}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={selectTriggerVariants({ size, variant, className })}
      >
        <span className="truncate">{currentOption?.label || value || placeholder}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={iconSize}
          className={`text-stone-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-xl bg-white border border-stone-200 shadow-2xl p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`${selectOptionVariants({ size })} ${
                    isSelected ? 'bg-stone-100 text-stone-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="text-[10px] text-stone-400 font-normal truncate">{option.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={iconSize + 2} className="text-stone-900 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
