import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import { WorkspaceAvatar } from '~/components/WorkspaceAvatar';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkspace: (data: { name: string; icon?: string; description?: string }) => Promise<void>;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkspace,
}) => {
  const [name, setName] = useState('');
  const [rerollSeed, setRerollSeed] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSeed = rerollSeed ? `${name.trim() || 'Workspace'}-${rerollSeed}` : (name.trim() || 'Workspace');

  const handleReroll = () => {
    setRerollSeed(Math.random().toString(36).substring(2, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a workspace name.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onCreateWorkspace({
        name: cleanName,
        icon: effectiveSeed,
        description: description.trim() || undefined,
      });
      setName('');
      setRerollSeed(null);
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Create New Workspace"
      subtitle="Organize pages and collaborate with your team"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs text-stone-700 dark:text-zinc-300 font-medium hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-workspace-form"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2.5 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-950 text-xs font-medium tracking-tight transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-98"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:text-zinc-950" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-200 dark:text-amber-600" />
            )}
            <span>{isSubmitting ? 'Creating...' : 'Create Workspace'}</span>
          </button>
        </div>
      }
    >
      <form id="create-workspace-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Avatar + Workspace Name Row */}
        <div className="flex items-end gap-3">
          {/* Inline Compact Avatar with Reroll Badge */}
          <div className="relative shrink-0 group">
            <WorkspaceAvatar
              seed={effectiveSeed}
              size={44}
              variant="squircle"
            />
            <button
              type="button"
              onClick={handleReroll}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-300 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
              title="Reroll pattern"
            >
              <RefreshCw className="w-2.5 h-2.5 text-stone-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Workspace Name */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team Docs"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-stone-50/50 dark:bg-zinc-900/50 placeholder-stone-400 dark:placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Central hub for product specifications and design tokens."
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white bg-stone-50/50 dark:bg-zinc-900/50 placeholder-stone-400 dark:placeholder-zinc-500 resize-none"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800/60 font-medium">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
};
