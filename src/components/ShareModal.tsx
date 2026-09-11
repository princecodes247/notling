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
      icon={<HugeiconsIcon icon={Share01Icon} size={18} />}
      title={`Share "${page.title || 'Untitled Document'}"`}
      subtitle="Manage access & link sharing"
      maxWidth="lg"
      footer={
        <>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            {copied ? (
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-600" />
            ) : (
              <HugeiconsIcon icon={Link02Icon} size={14} className="text-neutral-500" />
            )}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Section 1: Add People */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
            <HugeiconsIcon icon={UserAdd01Icon} size={14} className="text-neutral-500" />
            Share with people and groups
          </label>

          <form onSubmit={handleInvite} className="flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-xl border border-neutral-200 bg-neutral-50/50 overflow-hidden focus-within:ring-1 focus-within:ring-black">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Add people by email..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-transparent focus:outline-none text-neutral-900 placeholder:text-neutral-400"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="px-2 py-2.5 text-[11px] font-medium text-neutral-600 bg-transparent border-l border-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!inviteEmail.trim()}
              className="px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-2xs disabled:opacity-40 cursor-pointer shrink-0"
            >
              Invite
            </button>
          </form>

          {invitedSuccess && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />
              {invitedSuccess}
            </span>
          )}

          {/* People List */}
          {loading ? (
            <div className="py-4 text-center text-xs text-neutral-400">Loading invitations...</div>
          ) : people.length > 0 ? (
            <div className="mt-2 flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 max-h-36 overflow-y-auto">
              {people.map((person) => (
                <div key={person.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 text-[10px] shrink-0 font-bold uppercase">
                      {person.email[0]}
                    </div>
                    <span className="truncate text-neutral-800 font-medium">{person.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={person.role}
                      onChange={(e) => handleRoleChange(person.id, e.target.value as 'editor' | 'viewer')}
                      className="px-2 py-1 text-[11px] font-medium text-neutral-600 bg-neutral-50 rounded-md border border-neutral-200 focus:outline-none cursor-pointer"
                    >
                      <option value="viewer">Can view</option>
                      <option value="editor">Can edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(person.id)}
                      className="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer px-1 py-0.5 rounded hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Section 2: Access Level / General Access */}
        <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100">
          <label className="text-xs font-semibold text-neutral-800">General Access</label>
          <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/40 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white border border-neutral-200 shrink-0 text-neutral-700 mt-0.5">
              {visibility === 'private' ? (
                <HugeiconsIcon icon={LockIcon} size={16} className="text-amber-600" />
              ) : visibility === 'public' ? (
                <HugeiconsIcon icon={Globe02Icon} size={16} className="text-blue-600" />
              ) : (
                <HugeiconsIcon icon={Building01Icon} size={16} className="text-emerald-600" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <select
                value={visibility}
                onChange={(e) => onUpdateVisibility(e.target.value as 'private' | 'workspace' | 'public')}
                className="w-full text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              >
                <option value="private">🔒 Restricted (Only added people)</option>
                <option value="workspace">🏢 {workspaceName} (Anyone in workspace)</option>
                <option value="public">🌐 Anyone with the link (Public)</option>
              </select>

              <p className="text-[11px] text-neutral-500 leading-normal">
                {visibility === 'private' && 'Only people added above can open with this link.'}
                {visibility === 'workspace' && `Anyone in ${workspaceName} can find and view.`}
                {visibility === 'public' && 'Anyone on the Internet with the link can view.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

