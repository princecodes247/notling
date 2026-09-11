import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Share01Icon,
  Link02Icon,
  CheckmarkCircle01Icon,
  UserAdd01Icon,
  LockIcon,
  Globe02Icon,
  Building01Icon,
} from '@hugeicons/core-free-icons';
import type { Page } from '~/db/schema';
import { Modal } from './Modal';
import {
  getPageShares,
  inviteUserToPage,
  removePageShare,
  updatePageShareRole,
} from '~/server/pages';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: Page;
  visibility: 'private' | 'workspace' | 'public';
  onUpdateVisibility: (newVisibility: 'private' | 'workspace' | 'public') => void;
  workspaceName?: string;
}

interface SharedPerson {
  id: string;
  email: string;
  role: 'editor' | 'viewer';
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  page,
  visibility,
  onUpdateVisibility,
  workspaceName = 'Workspace',
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitedSuccess, setInvitedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && page?.id) {
      setLoading(true);
      getPageShares({ data: page.id })
        .then((shares) => {
          if (shares && Array.isArray(shares)) {
            setPeople(
              shares.map((s) => ({
                id: s.id,
                email: s.email,
                role: s.role as 'editor' | 'viewer',
              }))
            );
          }
        })
        .catch((err) => console.error('Failed to load page shares:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, page?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !page?.id) return;

    try {
      const newShare = await inviteUserToPage({
        data: {
          pageId: page.id,
          email: cleanEmail,
          role: inviteRole,
        },
      });

      if (newShare) {
        setPeople((prev) => {
          const filtered = prev.filter((p) => p.email !== cleanEmail);
          return [...filtered, { id: newShare.id, email: newShare.email, role: newShare.role as 'editor' | 'viewer' }];
        });
        setInvitedSuccess(`Invitation sent to ${cleanEmail}`);
        setTimeout(() => setInvitedSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to invite user:', err);
    }
    setInviteEmail('');
  };

  const handleRoleChange = async (shareId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updatePageShareRole({
        data: {
          shareId,
          role: newRole,
        },
      });
      setPeople((prev) =>
        prev.map((p) => (p.id === shareId ? { ...p, role: newRole } : p))
      );
    } catch (err) {
      console.error('Failed to update share role:', err);
    }
  };

  const handleRemovePerson = async (shareId: string) => {
    try {
      await removePageShare({ data: shareId });
      setPeople((prev) => prev.filter((p) => p.id !== shareId));
    } catch (err) {
      console.error('Failed to remove share:', err);
    }
  };

  const handleCopyLink = () => {
    const url =
      visibility === 'public'
        ? `${window.location.origin}/share/${page.id}`
        : `${window.location.origin}/dashboard/p/${page.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<HugeiconsIcon icon={Share01Icon} size={16} />}
      title={page.title ? `Share "${page.title}"` : 'Share Untitled Document'}
      subtitle="Permissions & live collaboration"
      maxWidth="lg"
      footer={
        <>
          <div className="flex items-center gap-2">

          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all cursor-pointer shadow-xs active:scale-98"
          >
            Done
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Section 1: Invite Collaborators */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 tracking-tight">
            <HugeiconsIcon icon={UserAdd01Icon} size={14} className="text-stone-500" />
            <span>Invite people</span>
          </label>

          <form onSubmit={handleInvite} className="flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-xl border border-stone-200 bg-stone-50/70 focus-within:bg-white focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-stone-900/5 transition-all overflow-hidden">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@workspace.com..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-transparent focus:outline-none text-stone-900 placeholder:text-stone-400"
              />
              <div className="h-4 w-px bg-stone-200 shrink-0" />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="px-3 py-2.5 text-[11px] font-medium text-stone-600 bg-transparent focus:outline-none cursor-pointer hover:text-stone-900"
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!inviteEmail.trim()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight transition-all shadow-xs disabled:opacity-40 cursor-pointer shrink-0 active:scale-98"
            >
              Invite
            </button>
          </form>

          {invitedSuccess && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 animate-in fade-in">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600 shrink-0" />
              <span>{invitedSuccess}</span>
            </div>
          )}

          {/* People List */}
          {loading ? (
            <div className="py-4 text-center text-xs text-stone-400">Loading collaborators...</div>
          ) : people.length > 0 ? (
            <div className="mt-1 flex flex-col divide-y divide-stone-100 rounded-xl border border-stone-200/70 bg-white/60 overflow-hidden max-h-40 overflow-y-auto shadow-2xs">
              {people.map((person) => (
                <div key={person.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-stone-800 text-amber-200 font-mono font-semibold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                      {person.email[0]}
                    </div>
                    <span className="truncate text-stone-800 font-medium">{person.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={person.role}
                      onChange={(e) => handleRoleChange(person.id, e.target.value as 'editor' | 'viewer')}
                      className="px-2 py-1 text-[11px] font-medium text-stone-600 bg-stone-100/70 rounded-md border border-stone-200/70 focus:outline-none cursor-pointer hover:border-stone-300"
                    >
                      <option value="viewer">Can view</option>
                      <option value="editor">Can edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person.id)}
                      className="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Section 2: General Access Tier */}
        <div className="flex flex-col gap-3 pt-4 border-t border-stone-200/60">
          <label className="text-xs font-semibold text-stone-800 tracking-tight flex items-center justify-between">
            <span>General access</span>
            <span className="text-[11px] font-normal text-stone-400">Controls who can open this link</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Restricted Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('private')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'private'
                  ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${visibility === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={LockIcon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Restricted</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Only people specifically invited can view.</p>
            </button>

            {/* Workspace Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('workspace')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'workspace'
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${visibility === 'workspace' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={Building01Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Workspace</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Anyone in {workspaceName} can view.</p>
            </button>

            {/* Public Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('public')}
              className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'public'
                  ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={Globe02Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Public</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Anyone with the link can view without login.</p>
            </button>
          </div>
        </div>

        {/* Section 3: Link Preview & Copy Bar */}
        <div className="p-3.5 rounded-xl border border-stone-200/90 bg-stone-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-600 shrink-0">
              <HugeiconsIcon icon={Link02Icon} size={14} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">Share Link</span>
              <span className="text-xs font-mono text-stone-700 truncate">
                {visibility === 'public' ? `/share/${page.id}` : `/dashboard/p/${page.id}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer shrink-0 shadow-2xs ${copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white hover:bg-stone-100 text-stone-900 border border-stone-200'
              }`}
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
            ) : (
              <HugeiconsIcon icon={Link02Icon} size={14} />
            )}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};


