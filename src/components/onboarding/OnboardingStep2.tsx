import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { WorkspaceAvatar } from '~/components/WorkspaceAvatar';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';

interface OnboardingStep2Props {
  workspaceName: string;
  onWorkspaceNameChange: (val: string) => void;
  workspaceSlug: string;
  onWorkspaceSlugChange: (val: string) => void;
  effectiveRingsSeed: string;
  onRerollPattern: () => void;
  slugInfo: { isAvailable: boolean; candidateSlug: string } | null;
  workspaceDescription: string;
  setWorkspaceDescription: (val: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function OnboardingStep2({
  workspaceName,
  onWorkspaceNameChange,
  workspaceSlug,
  onWorkspaceSlugChange,
  effectiveRingsSeed,
  onRerollPattern,
  slugInfo,
  workspaceDescription,
  setWorkspaceDescription,
  onBack,
  onNext,
}: OnboardingStep2Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">
          Customize your workspace
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Name and icon for your personal knowledge repository.
        </p>
      </div>

      {/* Avatar + Workspace Name Row */}
      <div className="flex items-end gap-3">
        {/* Compact Avatar with Reroll Badge */}
        <div className="relative shrink-0 group">
          <WorkspaceAvatar seed={effectiveRingsSeed} size={44} variant="squircle" />
          <button
            type="button"
            onClick={onRerollPattern}
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-600 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
            title="Reroll avatar pattern"
          >
            <HugeiconsIcon icon={RefreshIcon} size={11} />
          </button>
        </div>

        {/* Workspace Name Input */}
        <div className="flex-1 min-w-0">
          <Input
            label="Workspace Name"
            type="text"
            value={workspaceName}
            onChange={(e) => onWorkspaceNameChange(e.target.value)}
            placeholder="e.g. Acme Engineering Docs"
          />
        </div>
      </div>

      {/* Workspace Slug */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-700">Workspace Slug / URL</label>
        <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50/50 overflow-hidden focus-within:ring-1 focus-within:ring-black">
          <span className="px-3 py-2.5 text-xs text-neutral-400 bg-neutral-100 border-r border-neutral-200 select-none font-mono">
            notling.dev/w/
          </span>
          <input
            type="text"
            value={workspaceSlug}
            onChange={(e) => onWorkspaceSlugChange(e.target.value)}
            placeholder="acme-engineering"
            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-mono"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] mt-0.5">
          <span className="text-neutral-400">Unique identifier for your workspace web URL.</span>
          {slugInfo &&
            (slugInfo.isAvailable ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                ✓ Available
              </span>
            ) : (
              <span
                className="text-amber-600 font-medium flex items-center gap-1"
                title={`Slug already taken. Will be saved as ${slugInfo.candidateSlug}`}
              >
                ⚠️ Taken (auto-adjusts to{' '}
                <code className="font-mono bg-amber-50 px-1 rounded border border-amber-200">
                  {slugInfo.candidateSlug}
                </code>
                )
              </span>
            ))}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-700">Short Description (Optional)</label>
        <textarea
          value={workspaceDescription}
          onChange={(e) => setWorkspaceDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Central hub for product specifications and technical documentation."
          className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50 resize-none"
        />
      </div>

      <div className="flex items-center gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="px-4">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          <span>Choose Starter Template</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
        </Button>
      </div>
    </div>
  );
}
