import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '~/context/ThemeContext';
import { WorkspaceAvatar } from '~/components/WorkspaceAvatar';
import { PublicBlockViewer } from '~/components/share/PublicBlockViewer';
import type { WorkspacePublicOverview } from '~/server/domains.db';
import {
  Search,
  FileText,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
  ShieldCheck,
  Globe,
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface WorkspacePublicPortalProps {
  overview: WorkspacePublicOverview;
}

export function WorkspacePublicPortal({ overview }: WorkspacePublicPortalProps) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const {
    workspace,
    domainType,
    domainName,
    homeDoc: initialHomeDoc,
    publicPages = [],
    isMemberOrOwner,
  } = overview;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    initialHomeDoc?.id || (publicPages.length > 0 ? publicPages[0].id : null)
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter public pages
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return publicPages;
    const q = searchQuery.toLowerCase().trim();
    return publicPages.filter((p) => p.title.toLowerCase().includes(q));
  }, [publicPages, searchQuery]);

  // Selected doc
  const selectedPageMeta = publicPages.find((p) => p.id === selectedDocId);

  // Reading time estimate
  const readingTimeMinutes = useMemo(() => {
    if (!initialHomeDoc?.contentText) return 1;
    const wordCount = initialHomeDoc.contentText.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [initialHomeDoc]);

  return (
    <div className="min-h-screen w-full bg-[#fbfbfa] dark:bg-[#121214] text-stone-900 dark:text-zinc-100 font-sans flex flex-col antialiased selection:bg-[#1f4d3d]/15 selection:text-[#1f4d3d] dark:selection:bg-emerald-500/20 dark:selection:text-emerald-300">
      {/* Top Banner for Workspace Members / Editors */}
      {isMemberOrOwner && (
        <div className="bg-[#1f4d3d] text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-2xs z-30">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              You have edit permissions in <strong>{workspace.name}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => (window.location.href = '/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <span>Open in Editor</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main App Bar */}
      <header className="sticky top-0 z-20 w-full h-14 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-zinc-800/80 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="sm:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-zinc-800"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <WorkspaceAvatar
              seed={workspace.icon || workspace.slug || workspace.id}
              slug={workspace.slug}
              name={workspace.name}
              size={28}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-stone-900 dark:text-white">
                  {workspace.name}
                </span>
                {domainType === 'custom_domain' && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                    title={`Verified custom domain: ${domainName}`}
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono hidden sm:inline">
                {domainType === 'subdomain' ? `${domainName}.notling.app` : domainName}
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {!isMemberOrOwner ? (
            <button
              type="button"
              onClick={() => navigate({ to: '/login' })}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-zinc-700/80 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 transition-colors"
            >
              Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (window.location.href = '/dashboard')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 shadow-2xs transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
            >
              <span>Workspace Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Content Layout */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-[#18181b] border-r border-stone-200/80 dark:border-zinc-800/80 flex flex-col transform transition-transform duration-200 ease-in-out sm:static sm:translate-x-0
            ${isMobileSidebarOpen ? 'translate-x-0 pt-14' : '-translate-x-full sm:translate-x-0'}
          `}
        >
          {/* Search Bar */}
          <div className="p-3.5 border-b border-stone-100 dark:border-zinc-800">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-zinc-700/80 bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d] dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
              Published Documents ({publicPages.length})
            </div>

            {filteredPages.length > 0 ? (
              filteredPages.map((page) => {
                const isSelected = selectedDocId === page.id;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocId(page.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`
                      w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer group
                      ${isSelected
                        ? 'bg-[#1f4d3d]/10 dark:bg-emerald-950/40 text-[#1f4d3d] dark:text-emerald-300 font-semibold'
                        : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800/60'
                      }
                    `}
                  >
                    <span className="text-sm shrink-0">
                      {page.icon || <FileText className="w-3.5 h-3.5 opacity-60" />}
                    </span>
                    <span className="truncate flex-1">{page.title || 'Untitled'}</span>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-stone-400 dark:text-zinc-500">
                {searchQuery ? 'No documents match search.' : 'No public documents published yet.'}
              </div>
            )}
          </div>

          {/* Workspace Footer Info */}
          <div className="p-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-400 dark:text-zinc-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{workspace.name}</span>
            </div>
            <a
              href="https://notling.app"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300 transition-colors"
            >
              Powered by Notling
            </a>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs sm:hidden"
          />
        )}

        {/* Document Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex flex-col gap-6">
            {initialHomeDoc && selectedDocId === initialHomeDoc.id ? (
              <div className="flex flex-col gap-6">
                {/* Document Header */}
                <div className="pb-6 border-b border-stone-200/80 dark:border-zinc-800/80">
                  {initialHomeDoc.icon && (
                    <div className="text-4xl mb-3">{initialHomeDoc.icon}</div>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 dark:text-white mb-3">
                    {initialHomeDoc.title || 'Untitled Document'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 dark:text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Updated {new Date(initialHomeDoc.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{readingTimeMinutes} min read</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{workspace.name} Documentation</span>
                    </div>
                  </div>
                </div>

                {/* Render Block Content */}
                <div className="prose prose-stone dark:prose-invert max-w-none text-stone-800 dark:text-zinc-200 leading-relaxed font-sans">
                  <PublicBlockViewer
                    pageId={initialHomeDoc.id}
                    content={initialHomeDoc.content}
                  />
                </div>
              </div>
            ) : selectedPageMeta ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#18181b] rounded-2xl border border-stone-200/80 dark:border-zinc-800 shadow-2xs">
                <div className="text-4xl mb-4">{selectedPageMeta.icon || '📄'}</div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">
                  {selectedPageMeta.title}
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mb-6 max-w-md">
                  View this document online on the {workspace.name} portal.
                </p>
                <a
                  href={`/share/${selectedPageMeta.id}`}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1f4d3d] hover:bg-[#173a2e] text-white shadow-xs inline-flex items-center gap-2"
                >
                  <span>Open Full Document View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              /* Empty State when no docs are published yet */
              <div className="py-20 flex flex-col items-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 flex items-center justify-center mb-5 text-2xl shadow-2xs">
                  {workspace.icon || '🚀'}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
                  Welcome to {workspace.name}
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed mb-6">
                  {workspace.description ||
                    'This workspace domain is active and ready. Workspace members can publish documents to make them publicly available here.'}
                </p>

                {isMemberOrOwner ? (
                  <button
                    type="button"
                    onClick={() => (window.location.href = '/dashboard')}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 shadow-2xs transition-all active:scale-[0.98] inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Publish Your First Document</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-lg bg-stone-100 dark:bg-zinc-800/60 text-[11px] text-stone-500 dark:text-zinc-400 font-mono">
                    {domainType === 'subdomain' ? `${domainName}.notling.app` : domainName}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
