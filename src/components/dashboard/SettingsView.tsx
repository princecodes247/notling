import React, { useState, useEffect } from 'react';
import { Users, Check, Sliders, Building, Copy, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession, updateSettings, type UserSession } from '~/server/auth';
import { getWorkspaceUsers } from '~/server/pages';

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


  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [workspaceIcon, setWorkspaceIcon] = useState('🚀');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Workspace Owner');
  const [timezone, setTimezone] = useState('Eastern Time (US & Canada) - New York');

  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state when session is loaded or updated
  useEffect(() => {
    if (session) {
      setWorkspaceName(session.workspaceName || '');
      setWorkspaceSlug(session.workspaceSlug || '');
      setWorkspaceIcon(session.workspaceIcon || '🚀');
      setUserName(session.name || '');
      setUserRole(session.role || 'Workspace Owner');
    }
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return await updateSettings({
        data: {
          workspaceName,
          workspaceSlug,
          workspaceIcon,
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
            <h1 className="text-2xl font-normal text-neutral-950 tracking-tight">Workspace & Account Settings</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Manage details for {session?.workspaceName || 'your workspace'}, user profile, members, and organization resources.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Synced to Database
            </span>
          </div>
        </div>

        {/* 1. General Profile & Workspace */}
        <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-semibold text-neutral-900">General Information</h2>
            </div>
            <span className="text-[11px] text-neutral-400">Organization & Profile</span>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* Workspace details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Workspace Name"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Workspace Slug / URL
                </label>
                <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden focus-within:ring-1 focus-within:ring-black">
                  <span className="px-2.5 py-2 text-[11px] text-neutral-400 font-mono border-r border-neutral-200">
                    /w/
                  </span>
                  <input
                    type="text"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                    placeholder="my-workspace"
                    className="flex-1 px-2.5 py-2 text-xs font-mono text-neutral-900 bg-transparent focus:outline-none"
                  />
                </div>
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
                        onClick={() => setWorkspaceIcon(ic)}
                        className={`w-7 h-7 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${workspaceIcon === ic
                          ? 'bg-neutral-900 text-white shadow-2xs'
                          : 'hover:bg-neutral-100 text-neutral-700'
                          }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* User profile details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
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
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black bg-white"
                >
                  <option>Eastern Time (US & Canada) - New York</option>
                  <option>Pacific Time (US & Canada) - Los Angeles</option>
                  <option>Central European Time - Berlin</option>
                  <option>UTC / Greenwich Mean Time</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <span className="text-xs text-neutral-400">
                Changes update your workspace profile across all sessions
              </span>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                <span>{saved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Team Members */}
        <div className="p-6 rounded-xl border border-neutral-200/90 bg-white flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-semibold text-neutral-900">
                Members & Roles ({workspaceUsers.length > 0 ? workspaceUsers.length : 1})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/login`;
                navigator.clipboard.writeText(inviteUrl);
                alert(`Invite link copied to clipboard: ${inviteUrl}`);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-medium cursor-pointer transition-colors active:scale-95"
            >
              + Invite Member
            </button>
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-100 overflow-hidden">
            {workspaceUsers.length > 0 ? (
              workspaceUsers.map((u) => {
                const isMe = u.email === session?.email || u.id === session?.userId;
                return (
                  <div key={u.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name || u.email}
                          className="w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-xs shrink-0">
                          {(u.name || u.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
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
              /* Fallback to session user while loading */
              <div className="p-3 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  {session?.avatarUrl ? (
                    <img
                      src={session.avatarUrl}
                      alt={session.name || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-xs">
                      {(userName || session?.name || session?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                      <span>{userName || session?.name || 'User'}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">(You)</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">{session?.email || 'No email attached'}</div>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                  {userRole || session?.role || 'Workspace Owner'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Identifiers & Organization Info */}
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
      </div>
    </div>
  );
};
