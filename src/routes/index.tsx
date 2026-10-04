import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { resolveWorkspaceHost } from '~/server/domains';
import { LandingView } from '~/components/LandingView';
import { DashboardMockup } from '~/components/DashboardMockup';
import { WorkspacePublicPortal } from '~/components/public/WorkspacePublicPortal';
import { Route as rootRoute } from './__root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async () => {
    try {
      const domainContext = await resolveWorkspaceHost();
      return { domainContext };
    } catch {
      return { domainContext: null };
    }
  },
  component: LandingPageRoute,
});

function LandingPageRoute() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();

  const { data: domainContext } = useQuery({
    queryKey: ['domainContext'],
    queryFn: async () => {
      const host = typeof window !== 'undefined' ? window.location.host : undefined;
      return await resolveWorkspaceHost({ data: { host } });
    },
    initialData: loaderData?.domainContext,
  });

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

  // If accessed from a workspace subdomain or custom domain, render public workspace portal
  if (domainContext) {
    return <WorkspacePublicPortal overview={domainContext} />;
  }

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

