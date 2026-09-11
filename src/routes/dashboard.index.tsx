import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { getPageTree, createPage } from '~/server/pages';
import { HomeView } from '~/components/dashboard/HomeView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardIndexPage,
});

// export const Route = createFileRoute('/dashboard/')({
//   component: DashboardIndexPage,
// });

function DashboardIndexPage() {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  const workspaceId = session?.workspaceId;

  const { data: treeNodes = [], refetch } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  const createPageMutation = useMutation({
    mutationFn: async () => {
      return await createPage({ data: { workspaceId: workspaceId!, title: 'Untitled Document' } });
    },
    onSuccess: (newPage) => {
      refetch();
      if (newPage) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      return await createPage({ data: { workspaceId: workspaceId!, title: 'New Folder', icon: '📁' } });
    },
    onSuccess: () => {
      refetch();
      navigate({ to: '/dashboard/folders' });
    },
  });

  return (
    <HomeView
      userName={session?.name ? session.name.split(' ')[0] : 'Scotty'}
      treeNodes={treeNodes}
      onSelectPage={(id) => navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } })}
      onCreateFolder={() => createFolderMutation.mutate()}
      onCreatePage={() => createPageMutation.mutate()}
      onNavigate={(nav) => {
        if (nav === 'folders') navigate({ to: '/dashboard/folders' });
        else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
      }}
    />
  );
}
