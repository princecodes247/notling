import { createRoute, useNavigate, redirect } from '@tanstack/react-router';
import { getSession } from '~/server/auth';
import { resolveWorkspaceHost } from '~/server/domains';
import { LandingView } from '~/components/LandingView';
import { DashboardMockup } from '~/components/DashboardMockup';
import { WorkspacePublicPortal } from '~/components/public/WorkspacePublicPortal';
import { Route as rootRoute } from './__root';

export interface LandingSearchParams {
  landing?: boolean | string;
  home?: boolean | string;
  view?: string;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): LandingSearchParams => ({
    landing: search.landing ? String(search.landing) : undefined,
    home: search.home ? String(search.home) : undefined,
    view: search.view ? String(search.view) : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // If user explicitly requests the marketing landing page (e.g. /?landing=true, /?home=true, /?view=landing), allow viewing it
    const isExplicitLanding = Boolean(
      search.landing === 'true' ||
      search.landing === true ||
      search.home === 'true' ||
      search.home === true ||
      search.view === 'landing'
    );
    if (isExplicitLanding) return;

    try {
      const domainContext = await resolveWorkspaceHost();
      // If accessed from a workspace subdomain or custom domain, do not redirect away from portal
      if (domainContext) return;
    } catch {
      // ignore
    }

    try {
      const session = await getSession();
      if (session) {
        if (!session.isOnboarded) {
          throw redirect({ to: '/onboarding' });
        }
        throw redirect({ to: '/dashboard' });
      }
    } catch (err: any) {
      if (err?.to) throw err;
    }
  },
  loader: async () => {
    const [domainContext, session] = await Promise.all([
      resolveWorkspaceHost().catch(() => null),
      getSession().catch(() => null),
    ]);
    return { domainContext, session };
  },
  component: LandingPageRoute,
});

function LandingPageRoute() {
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  const domainContext = loaderData?.domainContext ?? null;
  const session = loaderData?.session ?? null;

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
      session={session}
      onEnterApp={handleEnterApp}
      renderWorkspacePreview={() => <DashboardMockup onNavigate={handleEnterApp} />}
    />
  );
}


