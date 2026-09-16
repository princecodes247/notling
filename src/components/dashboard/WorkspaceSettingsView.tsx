import React, { useState, useEffect } from 'react';
import { Users, Check, Building, AlertTriangle, Trash2, X, Loader2, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession, updateSettings, checkWorkspaceSlug, deleteWorkspace, type UserSession } from '~/server/auth';
import { getWorkspaceUsers, inviteWorkspaceMember } from '~/server/pages';
import { UserAvatar } from '../UserAvatar';
import { WorkspaceAvatar } from '../WorkspaceAvatar';

interface WorkspaceSettingsViewProps {
  session?: UserSession | null;
}

export const WorkspaceSettingsView: React.FC<WorkspaceSettingsViewProps> = ({ session: initialSession }) => {
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
    initialData: initialSession || undefined,
  });

  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ['workspaceUsers', session?.workspaceId],
    queryFn: async () => await getWorkspaceUsers({ data: session?.workspaceId }),
  });

  // Permission Check: only workspace owner can edit workspace settings
  const isWorkspaceOwner = session?.isWorkspaceOwner !== false;

  // Form State
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [slugInfo, setSlugInfo] = useState<{ isAvailable: boolean; candidateSlug: string } | null>(null);
  const [workspaceIcon, setWorkspaceIcon] = useState('🚀');
  const [saved, setSaved] = useState(false);

  const [isDeleteWsModalOpen, setIsDeleteWsModalOpen] = useState(false);
  const [confirmWsText, setConfirmWsText] = useState('');
  const [deleteWsError, setDeleteWsError] = useState<string | null>(null);

  const deleteWsMutation = useMutation({
    mutationFn: async () => {
      return await deleteWorkspace({ data: { workspaceId: session?.workspaceId } });
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['session'] });
        queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
        queryClient.invalidateQueries({ queryKey: ['pageTree'] });
        queryClient.invalidateQueries({ queryKey: ['trashPages'] });
        setIsDeleteWsModalOpen(false);
        window.location.href = '/dashboard';
      } else {
        setDeleteWsError(res?.error || 'Failed to delete workspace.');
      }
    },
  });

  const [isInviteWsMemberOpen, setIsInviteWsMemberOpen] = useState(false);
  const [inviteWsEmail, setInviteWsEmail] = useState('');
  const [inviteWsError, setInviteWsError] = useState<string | null>(null);
  const [inviteWsSuccess, setInviteWsSuccess] = useState<string | null>(null);

  const inviteWsMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      return await inviteWorkspaceMember({ data: { workspaceId: session?.workspaceId, email } });
    },
    onSuccess: (res, email) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['workspaceUsers', session?.workspaceId] });
        setInviteWsSuccess(`Workspace member added: ${email}`);
        setInviteWsEmail('');
        setTimeout(() => {
          setInviteWsSuccess(null);
          setIsInviteWsMemberOpen(false);
        }, 1500);
      } else {
        setInviteWsError(res?.error || 'Failed to invite workspace member.');
      }
    },
  });

  // Sync state when session is loaded or updated
  useEffect(() => {
    if (session) {
      setWorkspaceName(session.workspaceName || '');
      setWorkspaceSlug(session.workspaceSlug || '');
      setWorkspaceIcon(session.workspaceIcon || '🚀');
    }
  }, [session]);

  // Live Check Workspace Slug Availability
  useEffect(() => {
    let active = true;
    if (!workspaceSlug.trim() || !session?.workspaceId || !isWorkspaceOwner) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkWorkspaceSlug({
          data: {
            slug: workspaceSlug.trim(),
            excludeWorkspaceId: session.workspaceId,
          },
        });
        if (active) {
          setSlugInfo(res);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [workspaceSlug, session?.workspaceId, isWorkspaceOwner]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return await updateSettings({
        data: {
          workspaceName: isWorkspaceOwner ? workspaceName : undefined,
          workspaceSlug: isWorkspaceOwner ? workspaceSlug : undefined,
          workspaceIcon: isWorkspaceOwner ? workspaceIcon : undefined,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: ['session'] });
        setTimeout(() => setSaved(false), 2000);
      }
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="flex-1 w-full h-full bg-white dark:bg-[#18181b] text-neutral-900 dark:text-zinc-100 flex flex-col overflow-y-auto select-none font-sans p-4 sm:p-10 pb-6 sm:pb-10 pt-safe">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="pb-5 border-b border-neutral-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-normal text-neutral-950 dark:text-white tracking-tight">Workspace Settings</h1>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
              Manage workspace profile, members, permissions, and workspace configuration.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Non-owner permission banner */}
          {!isWorkspaceOwner && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3 shadow-2xs">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold">Owner Permission Required:</span> You are currently viewing this workspace as a member. Only the Workspace Owner can modify the workspace name, icon, or URL slug.
              </div>
            </div>
          )}

          {/* Workspace General Details Form */}
          <div className="p-6 rounded-xl border border-neutral-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-neutral-500 dark:text-zinc-400" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">Workspace Profile</h2>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => isWorkspaceOwner && setWorkspaceName(e.target.value)}
                    disabled={!isWorkspaceOwner}
                    placeholder="Workspace Name"
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none ${isWorkspaceOwner
                      ? 'border-neutral-200 dark:border-zinc-700/80 focus:ring-1 focus:ring-black dark:focus:ring-zinc-400 bg-white dark:bg-zinc-900'
                      : 'border-neutral-200 dark:border-zinc-700/80 bg-neutral-50 dark:bg-zinc-800/50 text-neutral-500 dark:text-zinc-400 cursor-not-allowed'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
                    Workspace Slug / URL
                  </label>
                  <div className={`flex items-center rounded-lg border overflow-hidden ${isWorkspaceOwner
                    ? 'border-neutral-200 dark:border-zinc-700/80 bg-neutral-50 dark:bg-zinc-900 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-zinc-400'
                    : 'border-neutral-200 dark:border-zinc-700/80 bg-neutral-50 dark:bg-zinc-800/50 opacity-80 cursor-not-allowed'
                    }`}>
                    <span className="px-2.5 py-2 text-[11px] text-neutral-400 dark:text-zinc-500 font-mono border-r border-neutral-200 dark:border-zinc-700/80">
                      /w/
                    </span>
                    <input
                      type="text"
                      value={workspaceSlug}
                      onChange={(e) => isWorkspaceOwner && setWorkspaceSlug(e.target.value)}
                      disabled={!isWorkspaceOwner}
                      placeholder="my-workspace"
                      className="flex-1 px-2.5 py-2 text-xs font-mono text-neutral-900 dark:text-zinc-100 bg-transparent focus:outline-none disabled:cursor-not-allowed"
                    />
                    {workspaceSlug && (
                      <a
                        href={`/w/${workspaceSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 mr-1.5 text-[10px] font-medium text-stone-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        Visit ↗
                      </a>
                    )}
                  </div>
                  {isWorkspaceOwner && slugInfo && workspaceSlug !== session?.workspaceSlug && (
                    <div className="text-[10px] mt-1 font-medium">
                      {slugInfo.isAvailable ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Available</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">⚠️ Taken — will be saved as "{slugInfo.candidateSlug}"</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
                    Workspace Avatar
                  </label>
                  <div className="flex items-center gap-2.5">
                    <WorkspaceAvatar
                      seed={workspaceIcon || workspaceSlug || session?.workspaceSlug || session?.workspaceId}
                      slug={workspaceSlug || session?.workspaceSlug}
                      name={workspaceName}
                      size={36}
                      showReroll={isWorkspaceOwner}
                      onReroll={() => isWorkspaceOwner && setWorkspaceIcon('ws-' + Math.random().toString(36).substring(2, 9))}
                    />
                  </div>
                </div>
              </div>

              {isWorkspaceOwner && (
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-zinc-800">
                  <span className="text-xs text-neutral-400 dark:text-zinc-500">
                  </span>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 disabled:opacity-50 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    {saved ? <Check className="w-3.5 h-3.5 text-white dark:text-neutral-950" /> : null}
                    <span>{saved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Workspace Settings'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Team Members List */}
          <div className="p-6 rounded-xl border border-neutral-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-500 dark:text-zinc-400" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">
                  Members &amp; Roles ({workspaceUsers.length > 0 ? workspaceUsers.length : 1})
                </h2>
              </div>
              {isWorkspaceOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setInviteWsEmail('');
                    setInviteWsError(null);
                    setInviteWsSuccess(null);
                    setIsInviteWsMemberOpen(true);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-zinc-700/80 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-800 dark:text-zinc-200 font-medium cursor-pointer transition-colors active:scale-95 flex items-center gap-1.5"
                >
                  + Invite Workspace Member
                </button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-neutral-100 dark:divide-zinc-800 rounded-lg border border-neutral-100 dark:border-zinc-800 overflow-hidden">
              {workspaceUsers.length > 0 ? (
                workspaceUsers.map((u) => {
                  const isMe = u.email === session?.email || u.id === session?.userId;
                  return (
                    <div key={u.id} className="p-3 flex items-center justify-between bg-white dark:bg-zinc-900/40 hover:bg-neutral-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar avatarUrl={u.avatarUrl} email={u.email} name={u.name} size={28} />
                        <div className="flex flex-col min-w-0">
                          <div className="text-xs font-medium text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                            <span className="truncate">{u.name || u.email.split('@')[0]}</span>
                            {isMe && <span className="text-[10px] text-neutral-400 dark:text-zinc-500 font-normal shrink-0">(You)</span>}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-zinc-500 truncate">{u.email}</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 shrink-0">
                        {u.role || (isMe ? (session?.role || (isWorkspaceOwner ? 'Workspace Owner' : 'Member')) : 'Member')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 flex items-center justify-between bg-white dark:bg-zinc-900/40">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar avatarUrl={session?.avatarUrl} email={session?.email} name={session?.name} size={28} />
                    <div>
                      <div className="text-xs font-medium text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{session?.name || 'User'}</span>
                        <span className="text-[10px] text-neutral-400 dark:text-zinc-500 font-normal">(You)</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-zinc-500">{session?.email || 'No email attached'}</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                    {session?.role || (isWorkspaceOwner ? 'Workspace Owner' : 'Member')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Workspace Danger Zone - Delete Workspace */}
          {isWorkspaceOwner && (
            <div className="p-6 rounded-xl border border-neutral-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h2 className="text-sm font-semibold text-rose-600 dark:text-rose-400">Workspace Danger Zone</h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-neutral-50/60 dark:bg-zinc-800/30 border border-neutral-200/60 dark:border-zinc-800/60">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-zinc-100">Delete Workspace "{session?.workspaceName || 'Workspace'}"</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5 max-w-md">
                    Permanently delete this workspace and all pages contained within it. Your user account will remain active.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmWsText('');
                    setDeleteWsError(null);
                    setIsDeleteWsModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-medium transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Workspace Confirmation Modal */}
      {isDeleteWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-zinc-800 flex flex-col gap-5 relative text-neutral-900 dark:text-zinc-100">
            <button
              type="button"
              onClick={() => setIsDeleteWsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Delete Workspace?</h3>
                <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">This will delete "{session?.workspaceName || 'this workspace'}" and all its pages.</p>
              </div>
            </div>

            <div className="text-xs text-neutral-600 dark:text-zinc-300 leading-relaxed bg-rose-50/50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
              All pages, sub-pages, content, and collaborator access for this specific workspace will be permanently erased.
            </div>

            {deleteWsError && (
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {deleteWsError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                Type <span className="font-mono font-bold select-all text-neutral-900 dark:text-white">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmWsText}
                onChange={(e) => setConfirmWsText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDeleteWsModalOpen(false)}
                disabled={deleteWsMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={(confirmWsText.trim() !== 'DELETE' && confirmWsText.trim() !== (session?.workspaceName || '').trim()) || deleteWsMutation.isPending}
                onClick={() => deleteWsMutation.mutate()}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {deleteWsMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting Workspace...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Workspace Member Modal */}
      {isInviteWsMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-zinc-800 flex flex-col gap-5 relative text-neutral-900 dark:text-zinc-100">
            <button
              type="button"
              onClick={() => setIsInviteWsMemberOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-neutral-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Invite Workspace Member</h3>
                <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">Full access to all workspace pages.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-zinc-300 leading-relaxed bg-neutral-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800">
              Workspace members get full access to all workspace pages, document trees, and shared team tools in <strong>{session?.workspaceName || 'this workspace'}</strong>.
            </p>

            {inviteWsError && (
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {inviteWsError}
              </div>
            )}

            {inviteWsSuccess && (
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {inviteWsSuccess}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteWsEmail.trim()) {
                  inviteWsMemberMutation.mutate(inviteWsEmail.trim());
                }
              }}
              className="flex flex-col gap-3"
            >
              <label className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                Member Email Address
              </label>
              <input
                type="email"
                required
                value={inviteWsEmail}
                onChange={(e) => setInviteWsEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-zinc-400 focus:border-black dark:focus:border-zinc-400 font-sans"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsInviteWsMemberOpen(false)}
                  disabled={inviteWsMemberMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteWsEmail.trim() || inviteWsMemberMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {inviteWsMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adding Member...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
