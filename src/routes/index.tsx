import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { LandingView } from '~/components/LandingView';
import { DashboardMockup } from '~/components/DashboardMockup';
import { Route as rootRoute } from './__root';

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
      renderWorkspacePreview={() => <DashboardMockup />}
    />
  );
}
