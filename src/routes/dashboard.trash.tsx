import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { getTrashPages, restorePage, permanentDeletePage, emptyTrashPages } from '~/server/pages';
import { restoreClientPage, permanentlyDeleteClientPage, emptyClientTrash } from '~/lib/pageMetaSync';
import { TrashView } from '~/components/dashboard/TrashView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/trash',
  component: DashboardTrashPage,
});

function DashboardTrashPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  const workspaceId = session?.workspaceId;

  const { data: trashPages = [], refetch } = useQuery({
    queryKey: ['trashPages', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getTrashPages({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  const invalidateAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['pageTree'] });
    queryClient.invalidateQueries({ queryKey: ['page'] });
    queryClient.invalidateQueries({ queryKey: ['trashPages'] });
  };

  const handleRestore = async (pageId: string) => {
    restoreClientPage(queryClient, pageId);
    await restorePage({ data: pageId });
    invalidateAll();
  };

  const handlePermanentDelete = async (pageId: string) => {
    permanentlyDeleteClientPage(queryClient, pageId);
    await permanentDeletePage({ data: pageId });
    invalidateAll();
  };

  const handleRestoreAll = async () => {
    for (const page of trashPages) {
      restoreClientPage(queryClient, page.id);
    }
    for (const page of trashPages) {
      await restorePage({ data: page.id });
    }
    invalidateAll();
  };

  const handleEmptyTrash = async () => {
    if (workspaceId) {
      emptyClientTrash(queryClient);
      await emptyTrashPages({ data: workspaceId });
      invalidateAll();
    }
  };

  return (
    <TrashView
      trashPages={trashPages}
      onRestore={handleRestore}
      onRestoreAll={handleRestoreAll}
      onPermanentDelete={handlePermanentDelete}
      onEmptyTrash={handleEmptyTrash}
      onSelectPage={(id) => navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } })}
    />
  );
}
