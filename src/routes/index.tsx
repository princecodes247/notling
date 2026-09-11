import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
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

function LandingPageRoute() {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await getSession();
      } catch {
        return null;
      }
    },
  });

  const handleEnterApp = () => {
    if (session) {
      if (!session.isOnboarded) {
        navigate({ to: '/onboarding' });
      } else {
        navigate({ to: '/dashboard' });
      }
    } else {
      navigate({ to: '/login' });
    }
  };

  return (
    <LandingView
      onEnterApp={handleEnterApp}
      renderWorkspacePreview={() => (
        <div className="flex w-full h-full overflow-hidden bg-white relative">
          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={handleEnterApp}
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
