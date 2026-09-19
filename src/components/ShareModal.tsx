import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Link02Icon,
  CheckmarkCircle01Icon,
  UserAdd01Icon,
  LockIcon,
  Globe02Icon,
  Building01Icon,
} from '@hugeicons/core-free-icons';
import type { Page } from '~/db/schema';
import { Modal } from './Modal';
import { Select, type SelectOption } from '~/components/ui/Select';
import { UserAvatar } from '~/components/UserAvatar';
import {
  getPageShares,
  getPageVisitors,
  inviteUserToPage,
  removePageShare,
  updatePageShareRole,
  getPendingPageAccessRequestsFn,
  respondToPageAccessRequestFn,
  type PageVisitorItem,
  type AccessRequestResult,
} from '~/server/pages';

const ROLE_OPTIONS: SelectOption<'viewer' | 'editor'>[] = [
  { value: 'viewer', label: 'Can view', description: 'Read-only access' },
  { value: 'editor', label: 'Can edit', description: 'Edit & comment permissions' },
];

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
  name?: string | null;
  avatarUrl?: string | null;
  userId?: string | null;
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
  const [inviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [owner, setOwner] = useState<{ id: string; email: string; name?: string | null; avatarUrl?: string | null; userId?: string | null } | null>(null);
  const [people, setPeople] = useState<SharedPerson[]>([]);
  const [visitors, setVisitors] = useState<PageVisitorItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitedSuccess, setInvitedSuccess] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && page?.id) {
      setLoading(true);
      Promise.all([
        getPageShares({ data: page.id }),
        getPageVisitors({ data: page.id }),
        getPendingPageAccessRequestsFn({ data: page.id }).catch(() => []),
      ])
        .then(([sharesRes, visitorsRes, accessReqsRes]: [any, any, any]) => {
          if (sharesRes) {
            if (sharesRes.owner) {
              setOwner({ ...sharesRes.owner, userId: sharesRes.owner.id });
            } else {
              setOwner(null);
            }
            const sharesList = sharesRes.shares || (Array.isArray(sharesRes) ? sharesRes : []);
            setPeople(
              sharesList.map((s: any) => ({
                id: s.id,
                email: s.email,
                role: s.role as 'editor' | 'viewer',
                name: s.name,
                avatarUrl: s.avatarUrl,
                userId: s.userId,
              }))
            );
          }
          if (Array.isArray(visitorsRes)) {
            setVisitors(visitorsRes);
          }
          if (Array.isArray(accessReqsRes)) {
            setPendingRequests(accessReqsRes);
          }
        })
        .catch((err) => console.error('Failed to load page shares/visitors/requests:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, page?.id]);

  const handleRespondToRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await respondToPageAccessRequestFn({
        data: { requestId, action, role: 'editor' },
      });
      if (res?.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (action === 'approve') {
          setInvitedSuccess(res.message || 'Access request approved!');
          // Refresh shares list
          const sharesRes = await getPageShares({ data: page.id });
          if (sharesRes?.shares) {
            setPeople(
              sharesRes.shares.map((s: any) => ({
                id: s.id,
                email: s.email,
                role: s.role as 'editor' | 'viewer',
                name: s.name,
                avatarUrl: s.avatarUrl,
                userId: s.userId,
              }))
            );
          }
        }
        queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
        queryClient.invalidateQueries({ queryKey: ['page', page.id] });
        queryClient.invalidateQueries({ queryKey: ['pendingAccessRequests', page.id] });
        queryClient.invalidateQueries({ queryKey: ['allPendingAccessRequests'] });
        setTimeout(() => setInvitedSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to respond to access request:', err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !page?.id) return;

    if (owner && cleanEmail === owner.email.toLowerCase()) {
      setInvitedSuccess('User is already the page owner.');
      setInviteEmail('');
      setTimeout(() => setInvitedSuccess(null), 3000);
      return;
    }

    try {
      const newShare: any = await inviteUserToPage({
        data: {
          pageId: page.id,
          email: cleanEmail,
          role: inviteRole,
        },
      });

      if (newShare) {
        setPeople((prev) => {
          const filtered = prev.filter((p) => p.email !== cleanEmail);
          return [
            ...filtered,
            {
              id: newShare.id,
              email: newShare.email,
              role: newShare.role as 'editor' | 'viewer',
              name: newShare.name,
              avatarUrl: newShare.avatarUrl,
              userId: newShare.userId,
            },
          ];
        });
        setInvitedSuccess(`Invitation sent to ${cleanEmail}`);
        queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
        queryClient.invalidateQueries({ queryKey: ['page', page.id] });
        setTimeout(() => setInvitedSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to invite user:', err);
    }
    setInviteEmail('');
  };

  const handleQuickInvite = async (email: string, role: 'editor' | 'viewer') => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !page?.id) return;

    try {
      const newShare: any = await inviteUserToPage({
        data: {
          pageId: page.id,
          email: cleanEmail,
          role,
        },
      });

      if (newShare) {
        setPeople((prev) => {
          const filtered = prev.filter((p) => p.email !== cleanEmail);
          return [
            ...filtered,
            {
              id: newShare.id,
              email: newShare.email,
              role: newShare.role as 'editor' | 'viewer',
              name: newShare.name,
              avatarUrl: newShare.avatarUrl,
              userId: newShare.userId,
            },
          ];
        });
        setVisitors((prev) =>
          prev.map((v) =>
            v.email.toLowerCase() === cleanEmail
              ? { ...v, shareRole: role, shareId: newShare.id }
              : v
          )
        );
        setInvitedSuccess(`Access granted to ${cleanEmail}`);
        queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
        queryClient.invalidateQueries({ queryKey: ['page', page.id] });
        queryClient.invalidateQueries({ queryKey: ['pageVisitors', page.id] });
        setTimeout(() => setInvitedSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to quick invite user:', err);
    }
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
      queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
    } catch (err) {
      console.error('Failed to update share role:', err);
    }
  };

  const handleRemovePerson = async (shareId: string) => {
    try {
      await removePageShare({ data: shareId });
      setPeople((prev) => prev.filter((p) => p.id !== shareId));
      queryClient.invalidateQueries({ queryKey: ['publicPage', page.id] });
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
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

  const uninvitedVisitors = visitors.filter(
    (v) => v.shareRole === 'none' && (!owner || v.email.toLowerCase() !== owner.email.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={page.title ? `Share "${page.title}"` : 'Share Untitled Document'}
      // subtitle="Permissions & live collaboration"
      maxWidth="lg"
      footer={
        <>
          <span></span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-semibold tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Done
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5 select-none text-stone-900">
        {/* Section 1: Invite People */}
        <div className="flex flex-col gap-2">

          {/* Pending Access Requests Banner */}
          {pendingRequests.length > 0 && (
            <div className="mb-2 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Edit Access Requests ({pendingRequests.length})
                </span>
              </div>
              <div className="flex flex-col divide-y divide-amber-200/50 dark:divide-amber-800/50">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <UserAvatar avatarUrl={req.avatarUrl} email={req.email} name={req.name} size={28} className="w-7 h-7 shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {req.name || req.email.split('@')[0]}
                        </span>
                        <span className="text-[10.5px] font-mono text-stone-500 dark:text-stone-400 truncate">
                          {req.email}
                        </span>
                        {req.note && (
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 italic mt-0.5 line-clamp-2">
                            "{req.note}"
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleRespondToRequest(req.id, 'approve')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Approve Edit Access
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondToRequest(req.id, 'reject')}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-stone-700 hover:text-rose-700 dark:text-stone-300 dark:hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          <form onSubmit={handleInvite} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white dark:bg-[#222226] border border-stone-300/80 dark:border-stone-700/80 rounded-lg px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(0,0,0,0.02)] focus-within:border-stone-800 dark:focus-within:border-stone-400 transition-all gap-2 h-10">
              <HugeiconsIcon icon={UserAdd01Icon} size={15} className="text-stone-400 dark:text-stone-500 shrink-0" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex-1 text-xs font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 bg-transparent focus:outline-none min-w-0"
              />
            </div>

            <button
              type="submit"
              disabled={!inviteEmail.trim()}
              className={`h-10 px-4 rounded-lg text-xs font-semibold tracking-tight transition-all shrink-0 flex items-center justify-center cursor-pointer active:scale-95 ${inviteEmail.trim()
                ? 'bg-brand-bg hover:bg-brand-hover text-brand-fg shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 border border-stone-200/80 dark:border-stone-700 cursor-not-allowed shadow-none'
                }`}
            >
              Invite
            </button>
          </form>

          {invitedSuccess && (
            <div className="px-3 py-1.5 rounded-md bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 animate-in fade-in">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{invitedSuccess}</span>
            </div>
          )}

          {/* Logged-in Page Visitors Section (Quick 1-Click Invitations) */}
          {uninvitedVisitors.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5 py-3">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 tracking-tight flex items-center justify-between">
                <span>Recent visitors</span>
              </label>
              <p className="text-[10.5px] text-stone-500 dark:text-stone-400">
                These logged-in users have visited this document. Click to grant access instantly.
              </p>
              <div className="flex flex-col divide-y divide-stone-200/60 dark:divide-stone-800 mt-1 max-h-36 overflow-y-auto">
                {uninvitedVisitors.map((v) => (
                  <div key={v.email} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar avatarUrl={v.avatarUrl} email={v.email} name={v.name} size={24} className="w-6 h-6 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-stone-900 dark:text-stone-100">{v.name || v.email.split('@')[0]}</span>
                          {v.isOnline && (
                            <span className="text-[9px] px-1 py-0.1 rounded font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                              Online now
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate font-mono">{v.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">

                      <button
                        type="button"
                        onClick={() => handleQuickInvite(v.email, 'editor')}
                        className="px-2 py-1 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition-colors hover:bg-stone-300 dark:hover:bg-stone-700 cursor-pointer"
                      >
                        Invite as Editor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People List */}
          {loading ? (
            <div className="py-4 text-center text-xs text-stone-400 dark:text-zinc-500 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-500 dark:border-zinc-400 border-t-transparent animate-spin" />
              <span>Loading collaborators...</span>
            </div>
          ) : owner || people.length > 0 ? (
            <>
              <label className="text-xs mt-3 font-semibold text-stone-800 dark:text-stone-200 tracking-tight flex items-center justify-between">
                <span>People with access</span>
              </label>

              <div className="mt-0 flex flex-col divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden max-h-40 overflow-y-auto">
                {owner && (
                  <div key="owner" className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        avatarUrl={owner.avatarUrl}
                        email={owner.email}
                        name={owner.name}
                        size={24}
                        className="w-6 h-6 shrink-0"
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-stone-800 dark:text-stone-200 font-medium">{owner.email}</span>
                        {owner.name && (
                          <span className="text-[11px] text-stone-400 dark:text-stone-500 truncate">({owner.name})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 px-2.5 py-1 rounded-md select-none">
                        Owner
                      </span>
                    </div>
                  </div>
                )}
                {people
                  .filter((person) => !owner || person.email.toLowerCase() !== owner.email.toLowerCase())
                  .map((person) => (
                    <div key={person.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-stone-50/60 dark:hover:bg-stone-800/50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {person.userId ? (
                          <UserAvatar
                            avatarUrl={person.avatarUrl}
                            email={person.email}
                            name={person.name}
                            size={24}
                            className="w-6 h-6 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-stone-800 dark:bg-stone-700 text-amber-200 font-mono font-semibold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs">
                            {person.email[0]}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate text-stone-800 dark:text-stone-200 font-medium">{person.email}</span>
                          {person.name && (
                            <span className="text-[11px] text-stone-400 dark:text-stone-500 truncate">({person.name})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={person.role}
                          options={ROLE_OPTIONS}
                          onChange={(newRole) => handleRoleChange(person.id, newRole)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(person.id)}
                          className="text-[11px] text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer px-1.5 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Section 2: General Access Tier */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-stone-200/60 dark:border-stone-800">
          <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 tracking-tight flex items-center justify-between">
            <span>General access</span>
            <span className="text-[11px] font-normal text-stone-400 dark:text-stone-500">Controls who can open this link</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Restricted Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('private')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'private'
                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-300/40 shadow-xs'
                : 'bg-white dark:bg-[#222226] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-800/40'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'private' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                  <HugeiconsIcon icon={LockIcon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">Private Access</span>
              </div>
              <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug">Only invited people can access this page.</p>
            </button>

            {/* Workspace Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('workspace')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'workspace'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-300/40 shadow-xs'
                : 'bg-white dark:bg-[#222226] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-800/40'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'workspace' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                  <HugeiconsIcon icon={Building01Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">Workspace Members</span>
              </div>
              <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug">Everyone in {workspaceName} can view and edit.</p>
            </button>

            {/* Public (View) Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('public')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'public'
                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-1 ring-blue-300/40 shadow-xs'
                : 'bg-white dark:bg-[#222226] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-800/40'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'public' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                  <HugeiconsIcon icon={Globe02Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">Anyone with link</span>
              </div>
              <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug">Anyone on the web with the link can view.</p>
            </button>

            {/* Public (Edit) Option */}
            <button
              type="button"
              onClick={() => onUpdateVisibility('public_edit')}
              className={`p-3 rounded-lg border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${visibility === 'public_edit'
                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-300/40 shadow-xs'
                : 'bg-white dark:bg-[#222226] border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-800/40'
                }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${visibility === 'public_edit' ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}>
                  <HugeiconsIcon icon={Globe02Icon} size={12} />
                </div>
                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">Anyone with link can edit</span>
              </div>
              <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-snug">Anyone on the web with the link can view & edit.</p>
            </button>
          </div>
        </div>

        {/* Section 3: Link Preview & Copy Bar */}
        <div className="p-2.5 rounded-lg border border-stone-200/90 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-white border border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-800 dark:text-stone-400 shrink-0">
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
            className={`h-8 px-3.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 flex items-center gap-1.5 ${copied
              ? 'bg-brand-bg text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
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
