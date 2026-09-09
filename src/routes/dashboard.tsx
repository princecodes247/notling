import { createRoute, Outlet, useNavigate, useLocation, Link } from '@tanstack/react-router';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import {
  getPageTree,
  createPage,
  softDeletePage,
  updatePageMeta,
} from '~/server/pages';
import { Sidebar } from '~/components/Sidebar';
import { CommandPalette } from '~/components/CommandPalette';
import { TrashModal } from '~/components/TrashModal';
import { useUIStore } from '~/store/uiStore';
import { Route as rootRoute } from './__root';
import { ArrowLeft } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardLayout,
});

const DEFAULT_SESSION = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'scotty@usedance.com',
  name: 'Scotty',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
  workspaceId: '00000000-0000-0000-0000-000000000002',
};

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { sidebarOpen, setActivePageId } = useUIStore();

  // 1. Fetch Session
  const { data: session = DEFAULT_SESSION } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await getSession();
      } catch (err) {
        return DEFAULT_SESSION;
      }
    },
    initialData: DEFAULT_SESSION,
  });

  const workspaceId = session.workspaceId;

  // 2. Fetch Workspace Page Tree
  const { data: treeNodes = [], refetch: refetchTree } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Determine current active nav based on pathname
  const currentPath = location.pathname;
  let activeNav: string = 'home';
  if (currentPath.includes('/dashboard/folders')) {
    activeNav = 'folders';
  } else if (currentPath.includes('/dashboard/settings')) {
    activeNav = 'settings';
  } else if (currentPath.includes('/dashboard/p/')) {
    activeNav = 'document';
  } else if (currentPath === '/dashboard') {
    activeNav = 'home';
  }

  // Create Page Mutation
  const createPageMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      return await createPage({ data: { workspaceId, parentId, title: 'Untitled Document' } });
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  // Create Folder Mutation (Root page with folder icon)
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      return await createPage({ data: { workspaceId, title: 'New Folder', icon: '📁' } });
    },
    onSuccess: (newFolder) => {
      refetchTree();
      if (newFolder) {
        navigate({ to: '/dashboard/folders' });
      }
    },
  });

  // Soft Delete Page Mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await softDeletePage({ data: pageId });
    },
    onSuccess: () => {
      refetchTree();
      navigate({ to: '/dashboard/folders' });
    },
  });

  // Update Page Meta Mutation
  const updateMetaMutation = useMutation({
    mutationFn: async ({ pageId, title, icon }: { pageId: string; title: string; icon?: string }) => {
      return await updatePageMeta({ data: { pageId, title, icon } });
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['page'] });
    },
  });

  return (
    <div className="h-screen w-screen bg-[#eef2f6] p-0 flex font-sans select-none">
      {/* Sidebar Navigation */}
      {sidebarOpen && (
        <Sidebar
          workspaceName="Terrace"
          session={session}
          treeNodes={treeNodes}
          activeNav={activeNav}
          onNavClick={(nav) => {
            if (nav === 'home') navigate({ to: '/dashboard' });
            else if (nav === 'folders') navigate({ to: '/dashboard/folders' });
            else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
          }}
          onCreateFolder={() => createFolderMutation.mutate()}
          onCreatePage={(parentId) => createPageMutation.mutate(parentId)}
          onSelectPage={(id) => {
            setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
          onSoftDelete={(id) => softDeleteMutation.mutate(id)}
          onUpdateMeta={(id, title, icon) => updateMetaMutation.mutate({ pageId: id, title, icon })}
          onLogout={() => navigate({ to: '/login' })}
        />
      )}
      {/* Framed Workspace Card */}
      <div className="flex-1 bg-[#fafaf9] p-2 overflow-hidden flex relative">

        {/* Dynamic Route Outlet */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative bg-white border border-neutral-200/90 rounded-xl overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      {workspaceId && (
        <CommandPalette
          workspaceId={workspaceId}
          onSelectPage={(id) => {
            setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
        />
      )}

      {workspaceId && (
        <TrashModal
          workspaceId={workspaceId}
          onRefreshTree={() => refetchTree()}
        />
      )}
    </div>
  );
}
