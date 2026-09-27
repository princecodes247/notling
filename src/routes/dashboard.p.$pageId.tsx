import { DatabaseContainer } from '~/components/database/DatabaseContainer';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPage } from '~/server/pages';
import { Editor } from '~/components/Editor';
import { EditorSkeleton } from '~/components/EditorSkeleton';
import { useUIStore } from '~/store/uiStore';
import { Route as dashboardRoute } from './dashboard';
import { useEffect } from 'react';
import { FileText, ArrowLeft, Trash2 } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/p/$pageId',
  loader: () => null,
  component: DocumentPageRoute,
});

// export const Route = createFileRoute('/dashboard/p/$pageId')({
//   component: DocumentPageRoute,
// });

function DocumentPageRoute() {
  const { pageId } = Route.useParams();
  const initialPage = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      return await getPage({ data: pageId });
    },
    enabled: !!pageId,
    initialData: () => {
      const cached = queryClient.getQueryData<any>(['page', pageId]);
      if (cached) return cached;
      if (initialPage && (initialPage as any).id === pageId) {
        return initialPage;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Synchronize Tab title, icon, active tab/page ID, and document title as soon as page data is loaded
  useEffect(() => {
    if (pageId) {
      const { setActivePageId, setActiveTabId } = useUIStore.getState();
      setActivePageId(pageId);
      setActiveTabId(pageId);
    }
    if (page?.id) {
      const { openTabs, updateTabMeta, openTab, pageMeta } = useUIStore.getState();
      const live = pageMeta[page.id];
      const existing = openTabs.find((t) => t.id === page.id);
      const title = live?.title ?? page.title ?? 'Untitled Document';
      const icon = live?.icon ?? page.icon ?? '';

      if (existing) {
        updateTabMeta(page.id, title, icon);
      } else {
        openTab({
          id: page.id,
          title,
          icon,
          path: `/dashboard/p/${page.id}`,
        });
      }

      document.title = `${title} — Notling`;
    }
  }, [pageId, page?.id, page?.title, page?.icon]);

  const { data: dbData } = useQuery({
    queryKey: ['database', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { getDatabase } = await import('~/server/databases');
      return await getDatabase({ data: pageId });
    },
    enabled: !!pageId,
  });

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (dbData) {
    return <DatabaseContainer key={dbData.database.id} initialData={dbData} />;
  }

  if (!page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-500 dark:text-zinc-400 bg-white dark:bg-[#18181b] min-h-[400px]">
        <div className="max-w-md w-full flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-700/80 text-stone-500 dark:text-zinc-400 flex items-center justify-center shadow-2xs">
            <FileText className="w-6 h-6 text-stone-600 dark:text-zinc-300" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-stone-900 dark:text-white tracking-tight">
              Document not found or in Trash
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              This document may have been deleted, moved to trash, or access may have been revoked.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => navigate({ to: '/dashboard/folders' })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-medium cursor-pointer transition-all active:scale-[0.98] shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: '/dashboard/trash' })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-200 dark:border-zinc-700/80 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-300 text-xs font-medium cursor-pointer transition-all active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>View Trash</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Editor
      key={page.id}
      page={page}
      onTitleOrIconChange={() => {
        queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      }}
      onBack={() => {
        navigate({ to: '/dashboard/folders' });
      }}
    />
  );
}
