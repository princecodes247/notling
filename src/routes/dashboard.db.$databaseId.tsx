import React from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getDatabase } from '~/server/databases';
import { DatabaseContainer } from '~/components/database/DatabaseContainer';
import { Route as dashboardRoute } from './dashboard';
import { Database as DatabaseIcon, ArrowLeft } from 'lucide-react';

export const Route = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/db/$databaseId',
  loader: () => null,
  component: DashboardDatabaseRoute,
});

function DashboardDatabaseRoute() {
  const { databaseId } = Route.useParams();
  const navigate = useNavigate();

  const { data: dbData, isLoading, error } = useQuery({
    queryKey: ['database', databaseId],
    queryFn: async () => {
      if (!databaseId) return null;
      return await getDatabase({ data: databaseId });
    },
    enabled: !!databaseId,
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 space-y-4 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-64" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-96" />
        <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl w-full" />
      </div>
    );
  }

  if (error || !dbData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500 gap-4">
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-full">
          <DatabaseIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Database not found or failed to load
        </h3>
        <button
          onClick={() => navigate({ to: '/dashboard/folders' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <DatabaseContainer initialData={dbData} />
    </div>
  );
}
