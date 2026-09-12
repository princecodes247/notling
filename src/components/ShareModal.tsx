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
  ArrowDown01Icon,
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
  visibility: 'private' | 'workspace' | 'public' | 'public_edit';
  onUpdateVisibility: (newVisibility: 'private' | 'workspace' | 'public' | 'public_edit') => void;
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
    const isPublic = visibility === 'public' || visibility === 'public_edit';
    const url = `${window.location.origin}${isPublic ? `/share/${page.id}` : `/dashboard/p/${page.id}`}`;
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
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          Done
        </button>
      }
    >
      <div className="flex flex-col gap-5 select-none text-stone-900">
        {/* Section 1: Invite People */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-800 tracking-tight">
            Invite people
          </label>

          <form onSubmit={handleInvite} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white border border-stone-300/80 rounded-lg px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(0,0,0,0.02)] focus-within:border-stone-800 focus-within:ring-2 focus-within:ring-stone-900/[0.06] transition-all gap-2 h-10">
              <HugeiconsIcon icon={UserAdd01Icon} size={15} className="text-stone-400 shrink-0" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex-1 text-xs font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none min-w-0"
              />
              <div className="relative flex items-center shrink-0">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="appearance-none pl-2.5 pr-6 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/70 border border-stone-200/80 rounded-md focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
                <HugeiconsIcon icon={ArrowDown01Icon} size={10} className="absolute right-2 text-stone-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!inviteEmail.trim()}
              className={`h-10 px-4 rounded-lg text-xs font-semibold tracking-tight transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95 ${
                inviteEmail.trim()
                  ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs active:bg-black'
                  : 'bg-stone-100 text-stone-400 border border-stone-200/80 cursor-not-allowed shadow-none'
              }`}
            >
              Invite
            </button>
          </form>

          {invitedSuccess && (
            <div className="px-3 py-1.5 rounded-md bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 animate-in fade-in">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600 shrink-0" />
              <span>{invitedSuccess}</span>
            </div>
          )}

          {/* People List */}
          {loading ? (
            <div className="py-4 text-center text-xs text-stone-400">Loading collaborators...</div>
          ) : people.length > 0 ? (
            <div className="mt-1 flex flex-col divide-y divide-stone-100 rounded-lg border border-stone-200/70 bg-white/60 overflow-hidden max-h-40 overflow-y-auto shadow-2xs">
              {people.map((person) => (
                <div key={person.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-stone-800 text-amber-200 font-mono font-semibold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                      {person.email[0]}
                    </div>
                    <span className="truncate text-stone-800 font-medium">{person.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative flex items-center shrink-0">
                      <select
                        value={person.role}
                        onChange={(e) => handleRoleChange(person.id, e.target.value as 'editor' | 'viewer')}
                        className="appearance-none pl-2.5 pr-6 py-1 text-[11px] font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200/60 rounded-md border border-stone-200/80 focus:outline-none cursor-pointer transition-colors"
                      >
                        <option value="viewer">Can view</option>
                        <option value="editor">Can edit</option>
                      </select>
                      <HugeiconsIcon icon={ArrowDown01Icon} size={10} className="absolute right-1.5 text-stone-500 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person.id)}
                      className="text-[11px] text-stone-400 hover:text-rose-600 font-medium cursor-pointer px-1.5 py-1 rounded hover:bg-rose-50 transition-colors"
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
        <div className="flex flex-col gap-2.5 pt-4 border-t border-stone-200/60">
          <label className="text-xs font-semibold text-stone-800 tracking-tight flex items-center justify-between">
            <span>General access</span>
            <span className="text-[11px] font-normal text-stone-400">Controls who can open this link</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Restricted Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('private')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                visibility === 'private'
                  ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
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
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                visibility === 'workspace'
                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'workspace' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={Building01Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Workspace</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Anyone in {workspaceName} can view & edit.</p>
            </button>

            {/* Public (View) Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('public')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                visibility === 'public'
                  ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={Globe02Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Public (View Only)</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Anyone with the link can view without login.</p>
            </button>

            {/* Public (Edit) Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('public_edit')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                visibility === 'public_edit'
                  ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-300/40 shadow-xs'
                  : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'public_edit' ? 'bg-indigo-100 text-indigo-800' : 'bg-stone-100 text-stone-600'}`}>
                  <HugeiconsIcon icon={Globe02Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900">Public (Can Edit)</span>
              </div>
              <p className="text-[10.5px] text-stone-500 leading-snug">Anyone with the link can view & edit page!</p>
            </button>
          </div>
        </div>

        {/* Section 3: Link Preview & Copy Bar */}
        <div className="p-2.5 rounded-lg border border-stone-200/90 bg-stone-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-white border border-stone-200 text-stone-600 shrink-0">
              <HugeiconsIcon icon={Link02Icon} size={13} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9.5px] uppercase font-semibold tracking-wider text-stone-400">Share Link</span>
              <span className="text-xs font-mono text-stone-700 truncate">
                {visibility === 'public' || visibility === 'public_edit' ? `/share/${page.id}` : `/dashboard/p/${page.id}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center gap-1.5 ${
              copied
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-200'
            }`}
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
            ) : (
              <HugeiconsIcon icon={Link02Icon} size={13} />
            )}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
