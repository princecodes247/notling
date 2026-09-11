import React, { useState } from 'react';
import { CheckCheck, Sparkles, User } from 'lucide-react';

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
  const [items, setItems] = useState(INBOX_ITEMS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'agent'>('all');

  const filteredItems = items.filter((item) => {
    if (filter === 'unread') return item.unread;
    if (filter === 'agent') return item.type === 'agent';
    return true;
  });

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-y-auto select-none font-sans p-6 sm:p-10">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div>
            <h1 className="text-2xl font-normal text-neutral-950 tracking-tight">Inbox & Activity</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live notifications from teammates, AI event agents, and system events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-neutral-500" />
              <span>Mark all read</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50'
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
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'agent'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Agent Actions</span>
          </button>
        </div>

        {/* Activity Items List */}
        <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              No notifications matching current filter.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex items-start gap-3.5 transition-colors hover:bg-neutral-50/70 ${
                  item.unread ? 'bg-amber-50/20' : ''
                }`}
              >
                {/* Author Avatar / Icon */}
                <div className="shrink-0 mt-0.5">
                  {item.type === 'agent' ? (
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.author}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-900 truncate">
                      {item.author}
                    </span>
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {item.action}{' '}
                    <span className="font-medium text-neutral-900 underline decoration-neutral-300">
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
