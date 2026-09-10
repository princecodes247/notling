import { createRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { getPageTree } from '~/server/pages';
// import { Sidebar } from '~/components/Sidebar';
import { LandingView } from '~/components/LandingView';
// import { HomeView } from '~/components/dashboard/HomeView';
import { Route as rootRoute } from './__root';
import { Maximize2 } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPageRoute,
});

const DEFAULT_SESSION = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'scotty@notling.dev',
  name: 'Scotty',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
  workspaceId: '00000000-0000-0000-0000-000000000002',
};

function LandingPageRoute() {
  const navigate = useNavigate();

  const { data: session = DEFAULT_SESSION } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await getSession();
      } catch {
        return DEFAULT_SESSION;
      }
    },
    initialData: DEFAULT_SESSION,
  });

  const workspaceId = session.workspaceId;

  const { data: treeNodes = [] } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  return (
    <LandingView
      onEnterApp={() => navigate({ to: '/dashboard' })}
      renderWorkspacePreview={() => (
        <div className="flex w-full h-full overflow-hidden bg-white relative">
          {/* Sidebar */}


          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="absolute top-3.5 right-6 z-30 p-1.5 rounded-lg bg-white/90 hover:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black shadow-xs transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Open in Full Dashboard View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Launch Workspace</span>
          </button>
        </div>
      )}
    />
  );
}
