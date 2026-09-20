import React, { useState } from 'react';
import { CheckCheck, Sparkles, User, Lock, Check, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUserPendingAccessRequestsFn, respondToPageAccessRequestFn } from '~/server/pages';
import { useNavigate } from '@tanstack/react-router';

interface InboxItem {
  id: string;
  type: 'agent' | 'user' | 'system';
  author: string;
  avatar?: string;
  action: string;
  target: string;
  time: string;
  unread: boolean;
}

const INBOX_ITEMS: InboxItem[] = [
  {
    id: '1',
    type: 'agent',
    author: 'AI Event Agent',
    action: 'Generated 12 speaker outreach email drafts for review in',
    target: 'Agentic Development Workshop NYC',
    time: '12m ago',
    unread: true,
  },
  {
    id: '2',
    type: 'user',
    author: 'Scotty',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
    action: 'Approved the initial $10,000 venue deposit for',
    target: 'Spring Street Studios',
    time: '2h ago',
    unread: true,
  },
  {
    id: '3',
    type: 'user',
    author: 'Alex (Curriculum Lead)',
    action: 'Added 4 code lab modules to the workshop curriculum notes in',
    target: 'Workshop Curriculum',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: '4',
    type: 'agent',
    author: 'Budget Agent',
    action: 'Synchronized estimated ticket revenue model with Stripe integration in',
    target: 'Financial Projections',
    time: '2 days ago',
    unread: false,
  },
  {
    id: '5',
    type: 'system',
    author: 'PostgreSQL Database',
    action: 'Automated full-text tsvector index rebuild completed successfully across',
    target: 'Workspace Pages',
    time: '3 days ago',
    unread: false,
  },
];

export const InboxView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items, setItems] = useState(INBOX_ITEMS);
  const [filter, setFilter] = useState<'all' | 'requests' | 'unread' | 'agent'>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingRespondId, setPendingRespondId] = useState<string | null>(null);

  const { data: pendingRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['allPendingAccessRequests'],
    queryFn: async () => {
      return await getAllUserPendingAccessRequestsFn();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      setPendingRespondId(requestId);
      return await respondToPageAccessRequestFn({
        data: { requestId, action, role: 'editor' },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        setActionSuccess(res.message || 'Action completed.');
        refetchRequests();
        queryClient.invalidateQueries({ queryKey: ['pageTree'] });
        setTimeout(() => setActionSuccess(null), 3000);
      }
    },
    onSettled: () => {
      setPendingRespondId(null);
    },
  });

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'agent') return item.type === 'agent';
    return true;
  });

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  return (
    <div className="flex-1 w-full h-full bg-white dark:bg-[#18181b] flex flex-col overflow-y-auto select-none font-sans p-6 sm:p-10">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 text-stone-900 dark:text-stone-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-normal text-neutral-950 dark:text-white tracking-tight">Inbox & Activity</h1>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
              Live notifications, edit access requests, teammate actions, and system events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-neutral-500" />
              <span>Mark all read</span>
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Section: Pending Edit Access Requests */}
        {pendingRequests.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Pending Access Requests ({pendingRequests.length})
                </span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Requires your approval
              </span>
            </div>

            <div className="flex flex-col divide-y divide-amber-200/60 dark:divide-amber-800/60">
              {pendingRequests.map((req) => (
                <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                      {(req.name || req.email).charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {req.name || req.email.split('@')[0]}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono">
                          ({req.email})
                        </span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                          requested Edit access to
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate({ to: '/dashboard/p/$pageId', params: { pageId: req.pageId } })}
                          className="text-xs font-semibold text-neutral-950 dark:text-white underline hover:text-brand-600 transition-colors cursor-pointer"
                        >
                          "{req.pageTitle || 'Document'}"
                        </button>
                      </div>
                      {req.note && (
                        <p className="text-[11.5px] text-amber-900 dark:text-amber-200 italic mt-1 bg-white/60 dark:bg-black/30 p-2 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                          "{req.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => respondMutation.mutate({ requestId: req.id, action: 'approve' })}
                      disabled={pendingRespondId === req.id}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {pendingRespondId === req.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => respondMutation.mutate({ requestId: req.id, action: 'reject' })}
                      disabled={pendingRespondId === req.id}
                      className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-neutral-700 hover:text-rose-700 dark:text-zinc-300 dark:hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {pendingRespondId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <span>Unread</span>
            {items.some((i) => i.unread) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('agent')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'agent'
                ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Agent Actions</span>
          </button>
        </div>

        {/* Activity Items List */}
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-zinc-800 rounded-lg border border-neutral-200/90 dark:border-zinc-800 bg-white dark:bg-[#18181b] overflow-hidden shadow-2xs">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400 dark:text-zinc-500">
              No notifications matching current filter.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex items-start gap-3.5 transition-colors hover:bg-neutral-50/70 dark:hover:bg-zinc-800/50 ${
                  item.unread ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                }`}
              >
                {/* Author Avatar / Icon */}
                <div className="shrink-0 mt-0.5">
                  {item.type === 'agent' ? (
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.author}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center text-neutral-600 dark:text-zinc-300">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {item.author}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-zinc-500 shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {item.action}{' '}
                    <span className="font-medium text-neutral-900 dark:text-white underline decoration-neutral-300 dark:decoration-zinc-700">
                      {item.target}
                    </span>
                  </p>
                </div>

                {/* Unread indicator */}
                {item.unread && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
