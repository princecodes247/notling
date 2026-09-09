import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  ScrollRestoration,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import stylesCss from '~/styles.css?url';
import '~/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Notling — The smartest way to organize your workspace' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap' },
      { rel: 'stylesheet', href: stylesCss },
    ],
  }),
  notFoundComponent: () => (
    <div className="h-screen w-screen bg-[#eef2f6] flex flex-col items-center justify-center text-neutral-600 gap-3">
      <h2 className="text-xl font-bold text-neutral-900">Page Not Found</h2>
      <a href="/" className="text-sm text-neutral-900 underline hover:text-black">Return to Workspace</a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#eef2f6] text-neutral-900 font-sans antialiased selection:bg-neutral-900 selection:text-white min-h-screen">
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
