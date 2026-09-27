import React from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase, deleteDatabase } from '~/server/databases';
import { togglePinPage, duplicatePage, softDeletePage } from '~/server/pages';
import { deleteClientDatabase } from '~/lib/pageMetaSync';
import { DatabaseContainer } from '~/components/database/DatabaseContainer';
import { Route as dashboardRoute } from './dashboard';
import { Database as DatabaseIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { useUIStore } from '~/store/uiStore';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/db/$databaseId',
  loader: () => null,
  component: DashboardDatabaseRoute,
});

function DashboardDatabaseRoute() {
  const { databaseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dbData, isLoading, error } = useQuery({
    queryKey: ['database', databaseId],
    queryFn: async () => {
      if (!databaseId) return null;
      return await getDatabase({ data: databaseId });
    },
    enabled: !!databaseId,
  });

  const targetPageId = dbData?.database?.pageId || dbData?.database?.id;

  // Toggle Pin Mutation
  const togglePinMutation = useMutation({
    mutationFn: async () => {
      if (!targetPageId) return;
      return await togglePinPage({ data: { pageId: targetPageId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['database', databaseId] });
    },
  });

  // Duplicate Database Mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!targetPageId) return;
      return await duplicatePage({ data: targetPageId });
    },
    onSuccess: (newClonedPage) => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
      if (newClonedPage?.id) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newClonedPage.id } });
      }
    },
  });

  // Delete Database Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!databaseId) return;
      if (targetPageId) {
        await softDeletePage({ data: targetPageId });
      } else {
        await deleteDatabase({ data: databaseId });
      }
    },
    onMutate: () => {
      if (databaseId) {
        const nextPath = deleteClientDatabase(queryClient, databaseId, targetPageId);
        if (nextPath) {
          navigate({ to: nextPath as any });
        } else {
          navigate({ to: '/dashboard/folders' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
    },
  });

  React.useEffect(() => {
    if (databaseId) {
      const { setActivePageId, setActiveTabId } = useUIStore.getState();
      const activeId = dbData?.database?.pageId || databaseId;
      setActivePageId(activeId);
      setActiveTabId(databaseId);
    }
    if (dbData?.database) {
      const { openTabs, updateTabMeta, openTab, pageMeta } = useUIStore.getState();
      const dbId = dbData.database.id;
      const live = pageMeta[dbId] || (dbData.database.pageId ? pageMeta[dbData.database.pageId] : undefined);
      const existing = openTabs.find((t) => t.id === dbId || t.id === dbData.database.pageId);
      const title = live?.title ?? dbData.database.title ?? '';
      const icon = live?.icon ?? dbData.database.icon ?? '';

      if (existing) {
        updateTabMeta(existing.id, title, icon);
      } else {
        openTab({
          id: dbId,
          title,
          icon,
          path: `/dashboard/db/${dbId}`,
        });
      }

      document.title = `${title} — Notling`;
    }
  }, [databaseId, dbData?.database?.id, dbData?.database?.title, dbData?.database?.icon]);

  if (isLoading) {
    return <DatabaseSkeleton />;
  }

  if (error || !dbData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-500 dark:text-zinc-400 bg-white dark:bg-[#18181b] min-h-[400px]">
        <div className="max-w-md w-full flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800/80 border border-stone-200/80 dark:border-zinc-700/80 text-stone-500 dark:text-zinc-400 flex items-center justify-center shadow-2xs">
            <DatabaseIcon className="w-6 h-6 text-stone-600 dark:text-zinc-300" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-stone-900 dark:text-white tracking-tight">
              Database not found or in Trash
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              This database may have been deleted, moved to trash, or you might not have access to view it.
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
    <DatabaseContainer
      key={dbData.database.id}
      initialData={dbData}
      onTogglePin={() => togglePinMutation.mutate()}
      onDuplicate={() => duplicateMutation.mutate()}
      onDelete={() => deleteMutation.mutate()}
    />
  );
}

function DatabaseSkeleton() {
  return (
    <div className="w-full font-sans text-stone-900 dark:text-zinc-100 min-h-screen animate-pulse">
      {/* Top Header Bar Skeleton */}
      <div className="h-12 border-b border-stone-200/60 dark:border-zinc-800/60 px-4 flex items-center justify-between gap-4 bg-white/80 dark:bg-[#18181b]/80">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-4 h-4 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
          <div className="w-3 h-3 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
          <div className="w-32 sm:w-48 h-4 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-32 sm:w-40 h-7 bg-stone-100 dark:bg-zinc-800/60 rounded-md" />
          <div className="w-16 h-7 bg-stone-200 dark:bg-zinc-800 rounded-md" />
        </div>
      </div>

      {/* Table Skeletons */}
      <div className="py-2 px-4 sm:px-8">
        <div className="w-full overflow-x-auto text-xs">
          {/* Header Row Skeleton */}
          <div className="border-b border-stone-200/60 dark:border-zinc-800/60 py-2.5 px-3 flex items-center gap-8">
            <div className="w-4 h-4 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
            <div className="w-40 h-3.5 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
            <div className="w-28 h-3.5 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
            <div className="w-28 h-3.5 bg-stone-200 dark:bg-zinc-800 rounded shrink-0" />
            <div className="w-24 h-3.5 bg-stone-100 dark:bg-zinc-800/60 rounded shrink-0" />
          </div>

          {/* Row Items Skeletons */}
          <div className="divide-y divide-stone-200/35 dark:divide-zinc-800/35">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="py-2.5 px-3 flex items-center gap-8">
                <div className="w-4 h-4 bg-stone-100 dark:bg-zinc-800/50 rounded shrink-0" />
                <div className="w-44 h-3.5 bg-stone-200/70 dark:bg-zinc-800/70 rounded shrink-0" />
                <div className="w-24 h-5 bg-stone-100 dark:bg-zinc-800/50 rounded-md shrink-0" />
                <div className="w-20 h-5 bg-stone-100 dark:bg-zinc-800/50 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
