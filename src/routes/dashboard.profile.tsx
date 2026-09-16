import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getSession } from '~/server/auth';
import { ProfileSettingsView } from '~/components/dashboard/ProfileSettingsView';
import { Route as dashboardRoute } from './dashboard';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/profile',
  component: DashboardProfilePage,
});

function DashboardProfilePage() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  return <ProfileSettingsView session={session} />;
}
