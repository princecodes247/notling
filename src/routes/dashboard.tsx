import { createFileRoute, Outlet, useNavigate, useLocation, redirect } from '@tanstack/react-router';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '~/components/Sidebar';
import { TabBar } from '~/components/TabBar';
import { CommandPalette } from '~/components/CommandPalette';
import { CreateWorkspaceModal } from '~/components/CreateWorkspaceModal';
import { ImportModal } from '~/components/ImportModal';
import { MobileHeader } from '~/components/dashboard/MobileHeader';
import { getSession, signOut, getUserWorkspaces, switchWorkspace, createWorkspace } from '~/server/auth';
import { getPageTree, getPage, createPage, softDeletePage, updatePageMeta, reorderPage, togglePinPage, duplicatePage, type PageTreeNode } from '~/server/pages';
import { createDatabase } from '~/server/databases';
import { updateClientPageMeta, deleteClientPage } from '~/lib/pageMetaSync';
import { useUIStore, type TabItem } from '~/store/uiStore';
import { useIsMobile } from '~/hooks/useIsMobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NetworkStatusBanner } from '~/components/NetworkStatusBanner';

export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    try {
      const session = await getSession();
      if (!session) {
        throw redirect({ to: '/login' });
      }
      if (!session.isOnboarded) {
        throw redirect({ to: '/onboarding' });
      }

      const [userWorkspaces, treeNodes] = await Promise.all([
        getUserWorkspaces().catch(() => []),
        session.workspaceId ? getPageTree({ data: session.workspaceId }).catch(() => []) : Promise.resolve([]),
      ]);

      return { session, userWorkspaces, treeNodes };
    } catch (err: any) {
      if (err?.to) throw err;
      return { session: null, userWorkspaces: [], treeNodes: [] };
    }
  },
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
  const loaderData = Route.useLoaderData();
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

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (isMobile) {
      useUIStore.getState().setSidebarOpen(false);
    }
  }, [isMobile]);

  const closeSidebarOnMobile = React.useCallback(() => {
    if (isMobile) {
      useUIStore.getState().setSidebarOpen(false);
    }
  }, [isMobile]);

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
    initialData: loaderData?.session ?? undefined,
    staleTime: 5 * 60 * 1000,
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

  // 1b. Fetch User Workspaces
  const { data: userWorkspaces = [] } = useQuery({
    queryKey: ['userWorkspaces'],
    queryFn: async () => {
      return await getUserWorkspaces();
    },
    enabled: !!session,
    initialData: loaderData?.userWorkspaces ?? [],
    staleTime: 5 * 60 * 1000,
  });

  // Switch Workspace Mutation
  const switchWorkspaceMutation = useMutation({
    mutationFn: async (targetWorkspaceId: string) => {
      return await switchWorkspace({ data: { workspaceId: targetWorkspaceId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
      queryClient.invalidateQueries({ queryKey: ['trashPages'] });
    },
  });

  // Create Workspace Mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: async ({ name, icon, description }: { name: string; icon?: string; description?: string }) => {
      return await createWorkspace({ data: { name, icon, description } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['pageTree'] });
      queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
      setIsCreateWorkspaceOpen(false);
    },
  });

  // 2. Fetch Workspace Page Tree
  const { data: treeNodes = [], refetch: refetchTree, isLoading: treeLoading } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
    initialData: loaderData?.treeNodes ?? [],
    staleTime: 5 * 60 * 1000,
  });

  // Determine current active nav based on pathname
  const currentPath = location.pathname;
  let activeNav: string = 'home';
  if (currentPath.includes('/dashboard/folders')) {
    activeNav = 'folders';
  } else if (currentPath.includes('/dashboard/settings')) {
    activeNav = 'settings';
  } else if (currentPath.includes('/dashboard/profile')) {
    activeNav = 'profile';
  } else if (currentPath.includes('/dashboard/trash')) {
    activeNav = 'trash';
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
        const existingTab = useUIStore.getState().openTabs.find((t) => t.id === pageId);
        const liveMeta = useUIStore.getState().pageMeta[pageId];
        const resolvedTitle =
          liveMeta?.title ??
          node?.title ??
          (existingTab?.title && existingTab.title !== 'Untitled Document' ? existingTab.title : 'Untitled Document');
        const resolvedIcon = liveMeta?.icon ?? node?.icon ?? existingTab?.icon ?? '📄';

        doOpenTab({
          id: pageId,
          title: resolvedTitle,
          icon: resolvedIcon,
          path: currentPath,
        });

        if (resolvedTitle && resolvedTitle !== 'Untitled Document') {
          document.title = `${resolvedTitle} - Notling`;
        }
      }
    } else if (currentPath.includes('/dashboard/folders')) {
      doSetActivePageId(null);
      document.title = 'Folders - Notling';
      doOpenTab({
        id: 'folders',
        title: 'Folders',
        path: '/dashboard/folders',
      });
    } else if (currentPath.includes('/dashboard/settings')) {
      doSetActivePageId(null);
      document.title = 'Workspace Settings - Notling';
      doOpenTab({
        id: 'settings',
        title: 'Workspace Settings',
        path: '/dashboard/settings',
      });
    } else if (currentPath.includes('/dashboard/profile')) {
      doSetActivePageId(null);
      document.title = 'Profile Settings - Notling';
      doOpenTab({
        id: 'profile',
        title: 'Profile Settings',
        path: '/dashboard/profile',
      });
    } else if (currentPath.includes('/dashboard/trash')) {
      doSetActivePageId(null);
      document.title = 'Trash - Notling';
      doOpenTab({
        id: 'trash',
        title: 'Trash',
        path: '/dashboard/trash',
      });
    } else if (currentPath === '/dashboard') {

      if (session?.welcomePageId) {
        const targetWelcomeId = session.welcomePageId;
        queryClient.setQueryData(['session'], (oldData: any) =>
          oldData ? { ...oldData, welcomePageId: undefined } : oldData
        );
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: targetWelcomeId }, replace: true });
      } else {
        doSetActivePageId(null);
        document.title = 'Home - Notling';
        doOpenTab({
          id: 'home',
          title: 'Home',
          icon: '🏠',
          path: '/dashboard',
        });
      }
    }
  }, [currentPath, treeNodes]);

  // Background pre-fetch open document tabs into query cache for instant 0ms tab switching
  React.useEffect(() => {
    openTabs.forEach((t) => {
      if (
        t.id &&
        t.id !== 'home' &&
        t.id !== 'folders' &&
        t.id !== 'settings' &&
        t.id !== 'profile' &&
        t.id !== 'trash'
      ) {
        queryClient.prefetchQuery({
          queryKey: ['page', t.id],
          queryFn: async () => await getPage({ data: t.id }),
          staleTime: 5 * 60 * 1000,
        });
      }
    });
  }, [openTabs, queryClient]);

  const isCreatingPageRef = React.useRef(false);

  // Create Page Mutation
  const createPageMutation = useMutation({
    mutationFn: async (parentId?: string) => {
      if (!workspaceId || isCreatingPageRef.current) return null;
      isCreatingPageRef.current = true;
      try {
        return await createPage({ data: { workspaceId, parentId, title: 'Untitled Document' } });
      } finally {
        isCreatingPageRef.current = false;
      }
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        useUIStore.getState().setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
    onError: () => {
      isCreatingPageRef.current = false;
    },
  });

  const isCreatingFolderRef = React.useRef(false);

  // Create Folder Mutation (Root page with folder icon)
  const createFolderMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || isCreatingFolderRef.current) return null;
      isCreatingFolderRef.current = true;
      try {
        return await createPage({ data: { workspaceId, title: 'New Folder', icon: '📁' } });
      } finally {
        isCreatingFolderRef.current = false;
      }
    },
    onSuccess: (newFolder) => {
      refetchTree();
      if (newFolder) {
        navigate({ to: '/dashboard/folders' });
      }
    },
    onError: () => {
      isCreatingFolderRef.current = false;
    },
  });

  // Create Database Mutation
  const createDatabaseMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return null;
      return await createDatabase({ data: { workspaceId, title: 'Projects & Tasks Database' } });
    },
    onSuccess: (newDb) => {
      if (newDb) {
        queryClient.invalidateQueries({ queryKey: ['databases'] });
        navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: newDb.database.id } });
        closeSidebarOnMobile();
      }
    },
  });

  // Fetch Trash Pages
  const { data: trashPages = [] } = useQuery({
    queryKey: ['trashPages', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { getTrashPages } = await import('~/server/pages');
      return await getTrashPages({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Fetch Databases in Workspace
  const { data: databases = [] } = useQuery({
    queryKey: ['databases', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { getDatabasesInWorkspace } = await import('~/server/databases');
      return await getDatabasesInWorkspace({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Soft Delete Page Mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await softDeletePage({ data: pageId });
    },
    onMutate: async (pageId: string) => {
      const nextPath = deleteClientPage(queryClient, pageId);
      if (nextPath) {
        navigate({ to: nextPath as any });
      } else {
        const currentActiveTab = useUIStore.getState().activeTabId;
        if (!currentActiveTab || currentActiveTab === pageId) {
          navigate({ to: '/dashboard/folders' });
        }
      }
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['trashPages'] });
    },
  });

  // Update Page Meta Mutation
  const updateMetaMutation = useMutation({
    mutationFn: async ({ pageId, title, icon }: { pageId: string; title: string; icon?: string }) => {
      return await updatePageMeta({ data: { pageId, title, icon } });
    },
    onMutate: async ({ pageId, title, icon }) => {
      updateClientPageMeta(queryClient, { pageId, title, icon });
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['page'] });
    },
  });

  // Reorder Page Mutation
  const reorderPageMutation = useMutation({
    mutationFn: async (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => {
      return await reorderPage({ data: input });
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  // Toggle Pin / Favorite Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await togglePinPage({ data: { pageId } });
    },
    onSuccess: () => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['page'] });
    },
  });

  // Duplicate Page Mutation
  const duplicatePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await duplicatePage({ data: pageId });
    },
    onSuccess: (newPage) => {
      refetchTree();
      if (newPage) {
        useUIStore.getState().setActivePageId(newPage.id);
        navigate({ to: '/dashboard/p/$pageId', params: { pageId: newPage.id } });
      }
    },
  });

  const handleSelectTab = (tab: TabItem) => {
    setActiveTabId(tab.id);
    if (tab.id !== 'home' && tab.id !== 'folders' && tab.id !== 'settings' && tab.id !== 'profile' && tab.id !== 'trash') {
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

  if (!session) {
    return null;
  }

  return (
    <>
      <NetworkStatusBanner />
      {/* <OnboardingBanner
        workspaceName={session.workspaceName}
        onOpenSettings={() => navigate({ to: '/dashboard/settings' })}
      /> */}

      <div className="h-screen w-screen bg-[#f3f2ee] dark:bg-[#121214] p-0 flex select-none relative overflow-hidden">
        {/* Mobile Drawer Dark Backdrop Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => useUIStore.getState().setSidebarOpen(false)}
              className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Desktop & Mobile Responsive Sidebar Drawer */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar-wrapper"
              initial={isMobile ? { x: '-100%', opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: 240, opacity: 1 }}
              exit={isMobile ? { x: '-100%', opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
              className="shrink-0 h-full overflow-hidden bg-[#f9f8f5] dark:bg-[#121214] md:relative fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[280px] md:w-[240px] shadow-2xl md:shadow-none"
            >
              <Sidebar
                databases={databases}
                onSelectDatabase={(dbId) => {
                  navigate({ to: '/dashboard/db/$databaseId', params: { databaseId: dbId } });
                  closeSidebarOnMobile();
                }}
                onCreateDatabase={() => {
                  if (createDatabaseMutation.isPending) return;
                  createDatabaseMutation.mutate();
                }}
                workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
                session={session}
                treeNodes={treeNodes}
                userWorkspaces={userWorkspaces}
                isCreatingPage={createPageMutation.isPending}
                isLoading={treeLoading}
                onSwitchWorkspace={(id) => {
                  switchWorkspaceMutation.mutate(id);
                  closeSidebarOnMobile();
                }}
                onOpenCreateWorkspaceModal={() => {
                  setIsCreateWorkspaceOpen(true);
                  closeSidebarOnMobile();
                }}
                trashCount={trashPages.length}
                activeNav={activeNav}
                onNavClick={(nav) => {
                  if (nav === 'home') navigate({ to: '/dashboard' });
                  else if (nav === 'folders') navigate({ to: '/dashboard/folders' });
                  else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
                  else if (nav === 'profile') navigate({ to: '/dashboard/profile' });
                  else if (nav === 'trash') navigate({ to: '/dashboard/trash' });
                  closeSidebarOnMobile();
                }}
                onCreateFolder={() => {
                  if (createFolderMutation.isPending) return;
                  createFolderMutation.mutate();
                  closeSidebarOnMobile();
                }}
                onCreatePage={(parentId) => {
                  if (createPageMutation.isPending) return;
                  createPageMutation.mutate(parentId);
                  closeSidebarOnMobile();
                }}
                onCreateDatabase={() => {
                  if (createDatabaseMutation.isPending) return;
                  createDatabaseMutation.mutate();
                  closeSidebarOnMobile();
                }}
                onSelectPage={(id) => {
                  useUIStore.getState().setActivePageId(id);
                  navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
                  closeSidebarOnMobile();
                }}
                onSoftDelete={(id) => softDeleteMutation.mutate(id)}
                onUpdateMeta={(id, title, icon) => {
                  updateClientPageMeta(queryClient, { pageId: id, title, icon });
                  updateMetaMutation.mutate({ pageId: id, title, icon });
                }}
                onReorderPage={(input) => reorderPageMutation.mutate(input)}
                onTogglePin={(id) => togglePinMutation.mutate(id)}
                onDuplicatePage={(id) => duplicatePageMutation.mutate(id)}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Framed Workspace Main Area */}
        <div className="flex-1 bg-[#f3f2ee] dark:bg-[#121214] p-0 sm:p-2 overflow-hidden flex flex-col relative min-w-0 h-full">
          {/* Mobile Top Header Bar */}
          <MobileHeader
            workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
            isCreatingPage={createPageMutation.isPending}
            onOpenMenu={() => useUIStore.getState().setSidebarOpen(true)}
            onOpenSearch={() => useUIStore.getState().setSearchOpen(true)}
            onCreatePage={() => !createPageMutation.isPending && createPageMutation.mutate(undefined)}
          />

          {/* Desktop Tab Bar Header */}
          <TabBar
            tabs={openTabs}
            activeTabId={activeTabId}
            isCreatingPage={createPageMutation.isPending}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={() => !createPageMutation.isPending && createPageMutation.mutate(undefined)}
          />

          {/* Main Content Outlet */}
          <main className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-white dark:bg-[#18181b] border border-stone-200/90 dark:border-stone-800/80 rounded-xl max-sm:rounded-none mt-1 max-sm:mt-0 shadow-xs pb-0">
            <Outlet />
          </main>
        </div>

        {/* Modals & Overlays */}
        <CommandPalette
          workspaceId={session.workspaceId}
          onSelectPage={(id) => {
            useUIStore.getState().setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
        />
        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceOpen}
          onClose={() => setIsCreateWorkspaceOpen(false)}
          onCreateWorkspace={async (data) => {
            await createWorkspaceMutation.mutateAsync(data);
          }}
        />
        <ImportModal
          workspaceId={session.workspaceId}
          onSelectPage={(id) => {
            useUIStore.getState().setActivePageId(id);
            navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
          }}
        />
      </div>
    </>
  );
}
