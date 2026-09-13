import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, Cancel01Icon, Settings02Icon } from '@hugeicons/core-free-icons';

interface OnboardingBannerProps {
  workspaceName?: string;
  onOpenSettings: () => void;
}

export function OnboardingBanner({ workspaceName, onOpenSettings }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem('notling_onboarding_banner_dismissed');
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('notling_onboarding_banner_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-green-500/20 via-neutral-100 to-green-500/20 border-b border-amber-200/60 px-4 py-2 flex items-center justify-between gap-3 text-xs text-stone-800 shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">

        <span className="truncate">
          Welcome to <strong className="font-semibold text-stone-900">{workspaceName || 'your workspace'}</strong>! You are ready to write notes & specs.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
        >
          <HugeiconsIcon icon={Settings02Icon} size={12} />
          <span>Customize Workspace</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
        </button>
      </div>
    </div>
  );
}
