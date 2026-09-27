import React from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase, deleteDatabase } from '~/server/databases';
import { togglePinPage, duplicatePage, softDeletePage } from '~/server/pages';
import { DatabaseContainer } from '~/components/database/DatabaseContainer';
import { Route as dashboardRoute } from './dashboard';
import { Database as DatabaseIcon, ArrowLeft } from 'lucide-react';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['databasesList'] });
      navigate({ to: '/dashboard/folders' });
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500 gap-4">
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-full">
          <DatabaseIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Database not found or failed to load
        </h3>
        <button
          onClick={() => navigate({ to: '/dashboard/folders' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
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
