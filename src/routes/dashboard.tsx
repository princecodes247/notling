import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '~/components/Sidebar';
import { TabBar } from '~/components/TabBar';
import { CommandPalette } from '~/components/CommandPalette';
import { TrashModal } from '~/components/TrashModal';
import { CreateWorkspaceModal } from '~/components/CreateWorkspaceModal';
import { getSession, signOut, getUserWorkspaces, switchWorkspace, createWorkspace } from '~/server/auth';
import { getPageTree, createPage, softDeletePage, updatePageMeta, reorderPage, type PageTreeNode } from '~/server/pages';
import { useUIStore, type TabItem } from '~/store/uiStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FullScreenWordListLoader } from '~/components/FullScreenWordListLoader';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Folder01Icon,
  Search01Icon,
  Settings02Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';

const DASHBOARD_LOADING_WORDS = [
  'Verifying session credentials...',
  'Loading workspace hierarchy...',
  'Syncing recent pages...',
  'Opening dashboard...',
];

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

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = React.useState(false);

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

  // 1b. Fetch User Workspaces
  const { data: userWorkspaces = [] } = useQuery({
    queryKey: ['userWorkspaces'],
    queryFn: async () => {
      return await getUserWorkspaces();
    },
    enabled: !!session,
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
        const resolvedTitle =
          node?.title ??
          (existingTab?.title && existingTab.title !== 'Untitled Document' ? existingTab.title : 'Untitled Document');
        const resolvedIcon = node?.icon ?? existingTab?.icon ?? '📄';

        doOpenTab({
          id: pageId,
          title: resolvedTitle,
          icon: resolvedIcon,
          path: currentPath,
        });

        if (resolvedTitle && resolvedTitle !== 'Untitled Document') {
          document.title = `${resolvedTitle} — Notling`;
        }
      }
    } else if (currentPath.includes('/dashboard/folders')) {
      doSetActivePageId(null);
      document.title = 'Folders — Notling';
      doOpenTab({
        id: 'folders',
        title: 'Folders',
        icon: '📁',
        path: '/dashboard/folders',
      });
    } else if (currentPath.includes('/dashboard/settings')) {
      doSetActivePageId(null);
      document.title = 'Settings — Notling';
      doOpenTab({
        id: 'settings',
        title: 'Settings',
        icon: '⚙️',
        path: '/dashboard/settings',
      });
    } else if (currentPath.includes('/dashboard/trash')) {
      doSetActivePageId(null);
      document.title = 'Trash - Notling';
      doOpenTab({
        id: 'trash',
        title: 'Trash',
        icon: '🗑️',
        path: '/dashboard/trash',
      });
    } else if (currentPath === '/dashboard') {
      doSetActivePageId(null);
      document.title = 'Home - Notling';
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

  // Soft Delete Page Mutation
  const softDeleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return await softDeletePage({ data: pageId });
    },
    onSuccess: (_, deletedId) => {
      refetchTree();
      queryClient.invalidateQueries({ queryKey: ['trashPages'] });
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

  // Reorder Page Mutation
  const reorderPageMutation = useMutation({
    mutationFn: async (input: { pageId: string; targetParentId: string | null; targetOrder: number }) => {
      return await reorderPage({ data: input });
    },
    onSuccess: () => {
      refetchTree();
    },
  });

  const handleSelectTab = (tab: TabItem) => {
    setActiveTabId(tab.id);
    if (tab.id !== 'home' && tab.id !== 'folders' && tab.id !== 'settings' && tab.id !== 'trash') {
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
      <FullScreenWordListLoader
        words={DASHBOARD_LOADING_WORDS}
      />
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="h-screen w-screen bg-[#f3f2ee] p-0 flex select-none relative overflow-hidden">
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
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
            className="shrink-0 h-full overflow-hidden bg-[#f9f8f5] md:relative fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[280px] md:w-60 shadow-2xl md:shadow-none"
          >
            <Sidebar
              workspaceName={session.workspaceName || `${session.name || 'Personal'}'s Workspace`}
              session={session}
              treeNodes={treeNodes}
              userWorkspaces={userWorkspaces}
              onSwitchWorkspace={(id) => {
                switchWorkspaceMutation.mutate(id);
                useUIStore.getState().setSidebarOpen(false);
              }}
              onOpenCreateWorkspaceModal={() => {
                setIsCreateWorkspaceOpen(true);
                useUIStore.getState().setSidebarOpen(false);
              }}
              trashCount={trashPages.length}
              activeNav={activeNav}
              onNavClick={(nav) => {
                if (nav === 'home') navigate({ to: '/dashboard' });
                else if (nav === 'folders') navigate({ to: '/dashboard/folders' });
                else if (nav === 'settings') navigate({ to: '/dashboard/settings' });
                else if (nav === 'trash') navigate({ to: '/dashboard/trash' });
                useUIStore.getState().setSidebarOpen(false);
              }}
              onCreateFolder={() => {
                createFolderMutation.mutate();
                useUIStore.getState().setSidebarOpen(false);
              }}
              onCreatePage={(parentId) => {
                createPageMutation.mutate(parentId);
                useUIStore.getState().setSidebarOpen(false);
              }}
              onSelectPage={(id) => {
                useUIStore.getState().setActivePageId(id);
                navigate({ to: '/dashboard/p/$pageId', params: { pageId: id } });
                useUIStore.getState().setSidebarOpen(false);
              }}
              onSoftDelete={(id) => softDeleteMutation.mutate(id)}
              onUpdateMeta={(id, title, icon) => updateMetaMutation.mutate({ pageId: id, title, icon })}
              onReorderPage={(input) => reorderPageMutation.mutate(input)}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Framed Workspace Main Area */}
      <div className="flex-1 bg-[#f3f2ee] p-1 sm:p-2 overflow-hidden flex flex-col relative min-w-0 h-full">
        {/* Desktop Tab Bar Header */}
        <TabBar
          tabs={openTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={() => createPageMutation.mutate(undefined)}
        />

        {/* Main Content Outlet */}
        <main className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-white border border-stone-200/90 rounded-xl max-sm:rounded-b-none mt-1 shadow-xs pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Apple Floating Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-3 left-4 right-4 z-40 h-14 bg-stone-900/92 backdrop-blur-xl text-white rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.38)] border border-white/15 flex items-center justify-around px-2 mb-safe">
        {/* Pages Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => useUIStore.getState().setSidebarOpen(!sidebarOpen)}
          className={`flex flex-col items-center justify-center w-12 h-10 rounded-full transition-colors active-press ${sidebarOpen ? 'text-amber-300' : 'text-stone-300 hover:text-white'}`}
          title="Pages & Sidebar"
        >
          <HugeiconsIcon icon={Folder01Icon} size={20} />
          <span className="text-[9px] font-medium mt-0.5 tracking-tight">Pages</span>
        </button>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={() => useUIStore.getState().setSearchOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-10 rounded-full text-stone-300 hover:text-white transition-colors active-press"
          title="Search Workspace"
        >
          <HugeiconsIcon icon={Search01Icon} size={20} />
          <span className="text-[9px] font-medium mt-0.5 tracking-tight">Search</span>
        </button>

        {/* Floating Center (+) New Document Action */}
        <button
          type="button"
          onClick={() => createPageMutation.mutate(undefined)}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-400 text-stone-950 font-bold shadow-lg hover:bg-amber-300 active:scale-90 transition-all -translate-y-2.5 ring-4 ring-[#f3f2ee]"
          title="New Document"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={22} />
        </button>

        {/* Home View Button */}
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard' })}
          className={`flex flex-col items-center justify-center w-12 h-10 rounded-full transition-colors active-press ${activeNav === 'home' ? 'text-amber-300' : 'text-stone-300 hover:text-white'}`}
          title="Home"
        >
          <HugeiconsIcon icon={Home01Icon} size={20} />
          <span className="text-[9px] font-medium mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard/settings' })}
          className={`flex flex-col items-center justify-center w-12 h-10 rounded-full transition-colors active-press ${activeNav === 'settings' ? 'text-amber-300' : 'text-stone-300 hover:text-white'}`}
          title="Settings"
        >
          <HugeiconsIcon icon={Settings02Icon} size={20} />
          <span className="text-[9px] font-medium mt-0.5 tracking-tight">Settings</span>
        </button>
      </div>

      {/* Modals & Overlays */}
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
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreateWorkspace={async (data) => {
          await createWorkspaceMutation.mutateAsync(data);
        }}
      />
    </div>
  );
}
