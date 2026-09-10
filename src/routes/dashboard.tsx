import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '~/components/Sidebar';
import { TabBar } from '~/components/TabBar';
import { CommandPalette } from '~/components/CommandPalette';
import { TrashModal } from '~/components/TrashModal';
import { getSession, signOut } from '~/server/auth';
import { getPageTree, createPage, softDeletePage, updatePageMeta, type PageTreeNode } from '~/server/pages';
import { useUIStore, type TabItem } from '~/store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
});

function findNodeInTree(nodes: PageTreeNode[], id: string): PageTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const {
    sidebarOpen,
    openTabs,
    activeTabId,
    closeTab,
    setActiveTabId,
  } = useUIStore();

  // 1. Fetch Session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await getSession();
      } catch (err) {
        return null;
      }
    },
  });

  // Redirect if unauthenticated or incomplete onboarding
  React.useEffect(() => {
    if (!sessionLoading) {
      if (!session) {
        navigate({ to: '/login' });
      } else if (!session.isOnboarded) {
        navigate({ to: '/onboarding' });
      }
    }
  }, [session, sessionLoading]);

  const workspaceId = session?.workspaceId;

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

  // Synchronize URL pathname with Open Tabs
  React.useEffect(() => {
    const { openTab: doOpenTab, setActivePageId: doSetActivePageId } = useUIStore.getState();
    if (currentPath.includes('/dashboard/p/')) {
      const match = currentPath.match(/\/dashboard\/p\/([^/]+)/);
      if (match && match[1]) {
        const pageId = match[1];
        doSetActivePageId(pageId);
        const node = findNodeInTree(treeNodes, pageId);
        doOpenTab({
          id: pageId,
          title: node?.title || 'Untitled Document',
          icon: node?.icon || '📄',
          path: currentPath,
        });
      }
    } else if (currentPath.includes('/dashboard/folders')) {
      doSetActivePageId(null);
      doOpenTab({
        id: 'folders',
        title: 'Folders',
        icon: '📁',
        path: '/dashboard/folders',
      });
    } else if (currentPath.includes('/dashboard/settings')) {
      doSetActivePageId(null);
      doOpenTab({
        id: 'settings',
        title: 'Settings',
        icon: '⚙️',
        path: '/dashboard/settings',
      });
    } else if (currentPath === '/dashboard') {
      doSetActivePageId(null);
      doOpenTab({
        id: 'home',
        title: 'Home',
        icon: '🏠',
        path: '/dashboard',
      });
    }
  }, [currentPath, treeNodes]);

  // Create Page Mutation
  const createPageMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      if (!workspaceId) return null;
      return await createPage({ data: { workspaceId, parentId, title: 'Untitled Document' } });
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        useUIStore.getState().setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  // Create Folder Mutation (Root page with folder icon)
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return null;
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
    onSuccess: (_, deletedId) => {
      refetchTree();
      if (deletedId) {
        const nextPath = closeTab(deletedId as string);
        if (nextPath) navigate({ to: nextPath as any });
        else navigate({ to: '/dashboard/folders' });
      }
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

  const handleSelectTab = (tab: TabItem) => {
    setActiveTabId(tab.id);
    if (tab.id !== 'home' && tab.id !== 'folders' && tab.id !== 'settings') {
      useUIStore.getState().setActivePageId(tab.id);
    } else {
      useUIStore.getState().setActivePageId(null);
    }
    navigate({ to: tab.path as any });
  };

  const handleCloseTab = (tabId: string) => {
    const nextPath = closeTab(tabId);
    if (nextPath) {
      navigate({ to: nextPath as any });
    }
  };

  const handleLogout = async () => {
    await signOut();
    queryClient.invalidateQueries({ queryKey: ['session'] });
    navigate({ to: '/login' });
  };

  if (sessionLoading) {
    return (
      <div className="h-screen w-screen bg-[#fafaf9] flex items-center justify-center text-xs text-neutral-400 font-sans">
        Authenticating session...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen w-screen bg-[#eef2f6] p-0 flex font-sans select-none">
      {/* Sidebar Navigation */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar-wrapper"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }}
            className="shrink-0 h-full overflow-hidden bg-[#fafaf9]"
          >
            <Sidebar
              workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
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
                useUIStore.getState().setActivePageId(id);
                navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
              }}
              onSoftDelete={(id) => softDeleteMutation.mutate(id)}
              onUpdateMeta={(id, title, icon) => updateMetaMutation.mutate({ pageId: id, title, icon })}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Framed Workspace Card */}
      <div className="flex-1 bg-[#fafaf9] p-2 overflow-hidden flex flex-col relative min-w-0">
        {/* Tab Bar Header */}
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={() => createPageMutation.mutate(undefined)}
        />

        {/* Content Outlet */}
        <main className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-white border border-neutral-200/90 rounded-2xl shadow-2xs mt-1">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <CommandPalette
        workspaceId={session.workspaceId}
        onSelectPage={(id) => {
          useUIStore.getState().setActivePageId(id);
          navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
        }}
      />
      <TrashModal
        workspaceId={session.workspaceId}
        onRefreshTree={() => refetchTree()}
      />
    </div>
  );
}
