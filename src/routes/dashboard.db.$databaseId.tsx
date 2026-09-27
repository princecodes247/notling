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
      setActivePageId(databaseId);
      setActiveTabId(databaseId);
    }
    if (dbData?.database) {
      const { openTabs, updateTabMeta, openTab, pageMeta } = useUIStore.getState();
      const dbId = dbData.database.id;
      const live = pageMeta[dbId] || (dbData.database.pageId ? pageMeta[dbData.database.pageId] : undefined);
      const existing = openTabs.find((t) => t.id === dbId || t.id === dbData.database.pageId);
      const title = live?.title ?? dbData.database.title ?? 'Projects & Tasks Database';
      const icon = live?.icon ?? dbData.database.icon ?? '📊';

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
    return (
      <div className="flex-1 p-8 space-y-4 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-64" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-96" />
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-full" />
      </div>
    );
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
