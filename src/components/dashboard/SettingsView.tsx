import React, { useState, useEffect } from 'react';
import { Users, Check, Building, Copy, CheckCircle2, AlertTriangle, Trash2, X, Loader2, User, Lock, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession, updateSettings, checkWorkspaceSlug, deleteAccount, deleteWorkspace, type UserSession } from '~/server/auth';
import { getWorkspaceUsers, inviteWorkspaceMember } from '~/server/pages';
import { Select, type SelectOption } from '~/components/ui/Select';
import { UserAvatar } from '../UserAvatar';

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'Eastern Time (US & Canada) - New York', label: 'Eastern Time (US & Canada) - New York' },
  { value: 'Pacific Time (US & Canada) - Los Angeles', label: 'Pacific Time (US & Canada) - Los Angeles' },
  { value: 'Central European Time - Berlin', label: 'Central European Time - Berlin' },
  { value: 'UTC / Greenwich Mean Time', label: 'UTC / Greenwich Mean Time' },
];

interface SettingsViewProps {
  session?: UserSession | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ session: initialSession }) => {
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

  const [activeTab, setActiveTab] = useState<'profile' | 'workspace'>('profile');

  // Permission Check: only workspace owner can edit workspace settings
  const isWorkspaceOwner = session?.isWorkspaceOwner !== false;

  // Form State
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [slugInfo, setSlugInfo] = useState<{ isAvailable: boolean; candidateSlug: string } | null>(null);
  const [workspaceIcon, setWorkspaceIcon] = useState('🚀');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Workspace Owner');
  const [timezone, setTimezone] = useState('Eastern Time (US & Canada) - New York');

  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await deleteAccount();
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.clear();
        window.location.href = '/login';
      } else {
        setDeleteError(res?.error || 'Failed to delete account.');
      }
    },
  });

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
      setUserName(session.name || '');
      setUserRole(session.role || (isWorkspaceOwner ? 'Workspace Owner' : 'Member'));
    }
  }, [session, isWorkspaceOwner]);

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
          name: userName,
          role: userRole,
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const iconsList = ['🚀', '🏢', '💻', '⚡', '🌟', '🎨', '📁', '🔬'];

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-y-auto select-none font-sans p-6 sm:p-10">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="pb-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-normal text-neutral-950 tracking-tight">Settings</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Manage your personal profile, workspace details, team members, and preferences.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced to Database
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-neutral-900 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
            }`}
          >
            <User className="w-4 h-4" />
            Profile Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'workspace'
                ? 'border-neutral-900 text-neutral-950 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
            }`}
          >
            <Building className="w-4 h-4" />
            Workspace Settings
            {!isWorkspaceOwner && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                View Only
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-6">
            {/* User Profile Form */}
            <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-900">Personal Information</h2>
                </div>
                <span className="text-[11px] text-neutral-400">User Profile</span>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={session?.email || ''}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-500 bg-neutral-50 cursor-not-allowed"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-400 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                        Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Your Role / Title
                    </label>
                    <input
                      type="text"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      placeholder="e.g. Workspace Owner, Product Manager"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Primary Timezone
                    </label>
                    <Select
                      value={timezone}
                      options={TIMEZONE_OPTIONS}
                      onChange={(newTz) => setTimezone(newTz)}
                      align="left"
                      matchTriggerWidth
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 bg-white hover:bg-neutral-50 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400">
                    Updates your personal details across all workspaces
                  </span>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    {saved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                    <span>{saved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone - Delete Account */}
            <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-semibold text-rose-950">Danger Zone</h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white border border-rose-200/80">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900">Delete Account & Workspace Data</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5 max-w-md">
                    Permanently remove your account, owned workspaces, documents, pages, and all uploaded media files. This action is irreversible.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmText('');
                    setDeleteError(null);
                    setIsDeleteModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-medium transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account & Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORKSPACE SETTINGS */}
        {activeTab === 'workspace' && (
          <div className="flex flex-col gap-6">
            {/* Non-owner permission banner */}
            {!isWorkspaceOwner && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-3 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold">Owner Permission Required:</span> You are currently viewing this workspace as a member. Only the Workspace Owner can modify the workspace name, icon, or URL slug.
                </div>
              </div>
            )}

            {/* Workspace General Details Form */}
            <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-900">Workspace Profile</h2>
                </div>
                {isWorkspaceOwner ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Workspace Owner
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200 font-medium">
                    Read-Only
                  </span>
                )}
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => isWorkspaceOwner && setWorkspaceName(e.target.value)}
                      disabled={!isWorkspaceOwner}
                      placeholder="Workspace Name"
                      className={`w-full px-3 py-2 rounded-lg border text-xs text-neutral-900 focus:outline-none ${
                        isWorkspaceOwner
                          ? 'border-neutral-200 focus:ring-1 focus:ring-black bg-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Workspace Slug / URL
                    </label>
                    <div className={`flex items-center rounded-lg border overflow-hidden ${
                      isWorkspaceOwner
                        ? 'border-neutral-200 bg-neutral-50 focus-within:ring-1 focus-within:ring-black'
                        : 'border-neutral-200 bg-neutral-50 opacity-80 cursor-not-allowed'
                    }`}>
                      <span className="px-2.5 py-2 text-[11px] text-neutral-400 font-mono border-r border-neutral-200">
                        /w/
                      </span>
                      <input
                        type="text"
                        value={workspaceSlug}
                        onChange={(e) => isWorkspaceOwner && setWorkspaceSlug(e.target.value)}
                        disabled={!isWorkspaceOwner}
                        placeholder="my-workspace"
                        className="flex-1 px-2.5 py-2 text-xs font-mono text-neutral-900 bg-transparent focus:outline-none disabled:cursor-not-allowed"
                      />
                    </div>
                    {isWorkspaceOwner && slugInfo && workspaceSlug !== session?.workspaceSlug && (
                      <div className="text-[10px] mt-1 font-medium">
                        {slugInfo.isAvailable ? (
                          <span className="text-emerald-600">✓ Available</span>
                        ) : (
                          <span className="text-amber-600">⚠️ Taken — will be saved as "{slugInfo.candidateSlug}"</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Workspace Icon
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="w-9 h-9 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center text-lg shrink-0">
                        {workspaceIcon}
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {iconsList.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            disabled={!isWorkspaceOwner}
                            onClick={() => isWorkspaceOwner && setWorkspaceIcon(ic)}
                            className={`w-7 h-7 rounded text-xs flex items-center justify-center transition-colors ${
                              !isWorkspaceOwner
                                ? 'opacity-50 cursor-not-allowed'
                                : workspaceIcon === ic
                                ? 'bg-neutral-900 text-white shadow-2xs cursor-pointer'
                                : 'hover:bg-neutral-100 text-neutral-700 cursor-pointer'
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {isWorkspaceOwner && (
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <span className="text-xs text-neutral-400">
                      Changes update workspace branding for all members
                    </span>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      {saved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                      <span>{saved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Workspace Settings'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Team Members List */}
            <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Members & Roles ({workspaceUsers.length > 0 ? workspaceUsers.length : 1})
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
                    className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-medium cursor-pointer transition-colors active:scale-95 flex items-center gap-1.5"
                  >
                    + Invite Workspace Member
                  </button>
                )}
              </div>

              <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-100 overflow-hidden">
                {workspaceUsers.length > 0 ? (
                  workspaceUsers.map((u) => {
                    const isMe = u.email === session?.email || u.id === session?.userId;
                    return (
                      <div key={u.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50/50 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar avatarUrl={u.avatarUrl} name={u.name || u.email} size={28} />
                          <div className="flex flex-col min-w-0">
                            <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5 truncate">
                              <span className="truncate">{u.name || u.email.split('@')[0]}</span>
                              {isMe && <span className="text-[10px] text-neutral-400 font-normal shrink-0">(You)</span>}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">{u.email}</div>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-700 shrink-0">
                          {u.role || (isMe ? (userRole || session?.role || 'Workspace Owner') : 'Member')}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar avatarUrl={session?.avatarUrl} name={userName || session?.name || session?.email} size={28} />
                      <div>
                        <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                          <span>{userName || session?.name || 'User'}</span>
                          <span className="text-[10px] text-neutral-400 font-normal">(You)</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">{session?.email || 'No email attached'}</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                      {userRole || session?.role || (isWorkspaceOwner ? 'Workspace Owner' : 'Member')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Identifiers & Organization Info */}
            <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-900">Organization Metadata</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-medium block">Workspace ID</span>
                    <span className="text-xs font-mono text-neutral-800 select-all truncate max-w-[200px] block">
                      {session?.workspaceId || '—'}
                    </span>
                  </div>
                  {session?.workspaceId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(session.workspaceId, 'ws')}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                      title="Copy Workspace ID"
                    >
                      {copiedId === 'ws' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-lg border border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-medium block">User ID</span>
                    <span className="text-xs font-mono text-neutral-800 select-all truncate max-w-[200px] block">
                      {session?.userId || '—'}
                    </span>
                  </div>
                  {session?.userId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(session.userId, 'user')}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                      title="Copy User ID"
                    >
                      {copiedId === 'user' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Workspace Danger Zone - Delete Workspace */}
            {isWorkspaceOwner && (
              <div className="p-6 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h2 className="text-sm font-semibold text-rose-950">Workspace Danger Zone</h2>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white border border-rose-200/80">
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-900">Delete Workspace "{session?.workspaceName || 'Workspace'}"</h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5 max-w-md">
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
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 flex flex-col gap-5 relative">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Delete Account & Workspace?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="text-xs text-neutral-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              This will permanently wipe your user profile, all workspaces owned by you, all associated pages and documents, and all uploaded files.
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-100 border border-rose-200 text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-700">
                Type <span className="font-mono font-bold select-all">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim() !== 'DELETE' || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white transition-all shadow-xs flex items-center gap-1.5"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {isDeleteWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 flex flex-col gap-5 relative">
            <button
              type="button"
              onClick={() => setIsDeleteWsModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Delete Workspace?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">This will delete "{session?.workspaceName || 'this workspace'}" and all its pages.</p>
              </div>
            </div>

            <div className="text-xs text-neutral-600 leading-relaxed bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              All pages, sub-pages, content, and collaborator access for this specific workspace will be permanently erased.
            </div>

            {deleteWsError && (
              <div className="p-3 rounded-lg bg-rose-100 border border-rose-200 text-xs text-rose-700 font-medium">
                {deleteWsError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-neutral-700">
                Type <span className="font-mono font-bold select-all">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmWsText}
                onChange={(e) => setConfirmWsText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsDeleteWsModalOpen(false)}
                disabled={deleteWsMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmWsText.trim() !== 'DELETE' && confirmWsText.trim() !== (session?.workspaceName || '').trim() || deleteWsMutation.isPending}
                onClick={() => deleteWsMutation.mutate()}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white transition-all shadow-xs flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 flex flex-col gap-5 relative">
            <button
              type="button"
              onClick={() => setIsInviteWsMemberOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-neutral-700" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Invite Workspace Member</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Full access to all workspace pages.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
              Workspace members get full access to all workspace pages, document trees, and shared team tools in <strong>{session?.workspaceName || 'this workspace'}</strong>.
            </p>

            {inviteWsError && (
              <div className="p-3 rounded-lg bg-rose-100 border border-rose-200 text-xs text-rose-700 font-medium">
                {inviteWsError}
              </div>
            )}

            {inviteWsSuccess && (
              <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-200 text-xs text-emerald-700 font-medium">
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
              <label className="text-xs font-medium text-neutral-700">
                Member Email Address
              </label>
              <input
                type="email"
                required
                value={inviteWsEmail}
                onChange={(e) => setInviteWsEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black font-sans"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsInviteWsMemberOpen(false)}
                  disabled={inviteWsMemberMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteWsEmail.trim() || inviteWsMemberMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-black hover:bg-neutral-800 disabled:opacity-50 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {inviteWsMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adding Member...
                    </>
                  ) : (
                    'Add Workspace Member'
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
