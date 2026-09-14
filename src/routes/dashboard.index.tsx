import { useRef } from 'react';
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

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  const workspaceId = session?.workspaceId;

  const { data: treeNodes = [], refetch, isLoading: treeLoading } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  const isCreatingPageRef = useRef(false);
  const createPageMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || isCreatingPageRef.current) return null;
      isCreatingPageRef.current = true;
      try {
        return await createPage({ data: { workspaceId: workspaceId!, title: 'Untitled Document' } });
      } finally {
        isCreatingPageRef.current = false;
      }
    },
    onSuccess: (newPage) => {
      refetch();
      if (newPage) {
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
    onError: () => {
      isCreatingPageRef.current = false;
    },
  });

  const isCreatingFolderRef = useRef(false);
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || isCreatingFolderRef.current) return null;
      isCreatingFolderRef.current = true;
      try {
        return await createPage({ data: { workspaceId: workspaceId!, title: 'New Folder', icon: '📁' } });
      } finally {
        isCreatingFolderRef.current = false;
      }
    },
    onSuccess: () => {
      refetch();
      navigate({ to: '/dashboard/folders' });
    },
    onError: () => {
      isCreatingFolderRef.current = false;
    },
  });

  return (
    <HomeView
      userName={session?.name ? session.name.split(' ')[0] : 'Scotty'}
      treeNodes={treeNodes}
      isLoading={sessionLoading || (!!workspaceId && treeLoading)}
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
