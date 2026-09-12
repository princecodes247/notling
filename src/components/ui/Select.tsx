import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (newValue: T) => void;
  disabled?: boolean;
  className?: string;
  dropdownWidth?: number;
}

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  disabled,
  className = '',
  dropdownWidth = 176, // 176px default width (w-44)
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find((o) => o.value === value) || options[0];

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let calculatedLeft = rect.right - dropdownWidth;

      // Ensure dropdown does not overflow left boundary
      if (calculatedLeft < 8) calculatedLeft = 8;
      // Ensure dropdown does not overflow right boundary
      if (calculatedLeft + dropdownWidth > viewportWidth - 8) {
        calculatedLeft = viewportWidth - dropdownWidth - 8;
      }

      setCoords({
        top: rect.bottom + 4,
        left: calculatedLeft,
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

  return (
    <div className="inline-block text-left select-none">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/70 border border-stone-200/80 rounded-md focus:outline-none cursor-pointer transition-all active:scale-[0.98] ${className}`}
      >
        <span>{currentOption?.label || value}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={10}
          className={`text-stone-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
              width: `${dropdownWidth}px`,
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-stone-100 text-stone-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-[10px] text-stone-400 font-normal">{option.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="text-stone-900 shrink-0 ml-1" />
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
