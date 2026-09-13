import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export function OnboardingProgress({ currentStep, totalSteps = 3 }: OnboardingProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-3 mb-8">
      {steps.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              currentStep === s
                ? 'bg-brand-bg text-brand-fg shadow-2xs'
                : currentStep > s
                  ? 'bg-neutral-200 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-200'
                  : 'bg-neutral-100 dark:bg-zinc-900 text-neutral-400 dark:text-zinc-600'
            }`}
          >
            {currentStep > s ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              s
            )}
          </div>
          {s < totalSteps && <div className="w-8 h-0.5 bg-neutral-200 dark:bg-zinc-800 rounded-full" />}
        </div>
      ))}
    </div>
  );
}
