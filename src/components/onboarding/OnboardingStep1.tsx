import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Avatar } from '@avatune/react';
import pacovqzzTheme from '@avatune/pacovqzz-theme/react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';

interface OnboardingStep1Props {
  name: string;
  setName: (val: string) => void;
  avatarSeed: string;
  onRerollAvatar: () => void;
  onNext: () => void;
}

export function OnboardingStep1({
  name,
  setName,
  avatarSeed,
  onRerollAvatar,
  onNext,
}: OnboardingStep1Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-950 dark:text-white tracking-tight">Set up your profile</h2>
        <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1">How you'll show up to your team</p>
      </div>

      {/* Avatar + Full Name Row */}
      <div className="flex items-end gap-3">
        {/* Compact Avatar with Reroll Badge */}
        <div className="relative shrink-0 group">
          <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-300 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shadow-2xs">
            <Avatar theme={pacovqzzTheme} seed={avatarSeed} size={44} />
          </div>
          <button
            type="button"
            onClick={onRerollAvatar}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-700 border border-neutral-300 dark:border-zinc-700 text-neutral-600 dark:text-zinc-300 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
            title="Reroll avatar"
          >
            <HugeiconsIcon icon={RefreshIcon} size={11} />
          </button>
        </div>

        {/* Full Name Input */}
        <div className="flex-1 min-w-0">
          <Input
            label="Your Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Scotty Prince"
          />
        </div>
      </div>

      <Button onClick={onNext} className="w-full mt-2">
        <span>Continue to Workspace</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
      </Button>
    </div>
  );
}
