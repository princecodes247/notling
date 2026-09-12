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
  const [ringsSeed, setRingsSeed] = useState(() => 'ws-' + Math.random().toString(36).substring(2, 9));
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReroll = () => {
    setRingsSeed('ws-' + Math.random().toString(36).substring(2, 9));
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
        icon: ringsSeed,
        description: description.trim() || undefined,
      });
      setName('');
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
      icon={<WorkspaceAvatar seed={ringsSeed} name={name || 'New Workspace'} size={32} className="rounded-lg" />}
      title="Create New Workspace"
      subtitle="Organize pages and collaborate with your team"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-stone-200 text-xs text-stone-700 font-medium hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-workspace-form"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            )}
            <span>{isSubmitting ? 'Creating...' : 'Create Workspace'}</span>
          </button>
        </div>
      }
    >
      <form id="create-workspace-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Workspace Rings Avatar & Reroll */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700">Workspace Rings Avatar</label>
          <div className="flex items-center gap-3 bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
            <WorkspaceAvatar
              seed={ringsSeed}
              name={name}
              size={48}
              className="rounded-xl"
              showReroll
              onReroll={handleReroll}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-stone-900 truncate">
                {name.trim() || 'Generative Rings Pattern'}
              </span>
              <span className="text-[11px] text-stone-500 mt-0.5 leading-normal">
                Custom concentric rings. Click the badge or button to reroll patterns.
              </span>
            </div>
            <button
              type="button"
              onClick={handleReroll}
              className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3 text-stone-500" />
              <span>Reroll</span>
            </button>
          </div>
        </div>

        {/* Workspace Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700">Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Design Team Docs"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-black bg-stone-50/50"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Central hub for product specifications and design tokens."
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-black bg-stone-50/50 resize-none"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200 font-medium">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
};
