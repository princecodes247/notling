import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '~/context/ThemeContext';
import { PwaProvider } from '~/context/PwaContext';
import { PwaBanner } from '~/components/pwa/PwaBanner';
import stylesCss from '~/styles.css?url';
import '~/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5,
      gcTime: 1000 * 60 * 60, // Keep cached page data in memory for 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount) => {
        // Don't spam retries if browser is offline
        if (typeof window !== 'undefined' && !navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

const THEME_INIT_SCRIPT = `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'light';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = mode === 'dark' || (mode === 'system' && prefersDark);
      var root = document.documentElement;
      if (isDark) {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content' },
      { title: 'Notling - The smartest way to organize your workspace' },
      { name: 'description', content: 'The smartest way to organize your workspace, notes, documents, and public knowledge base.' },
      { name: 'application-name', content: 'Notling' },
      { name: 'theme-color', content: '#18181b', media: '(prefers-color-scheme: dark)' },
      { name: 'theme-color', content: '#fbfbfa', media: '(prefers-color-scheme: light)' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Notling' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'apple-touch-icon', sizes: '192x192', href: '/icons/icon-192.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap' },
      { rel: 'stylesheet', href: stylesCss },
    ],
  }),
  notFoundComponent: () => (
    <div className="h-screen w-screen bg-[#eef2f6] flex flex-col items-center justify-center text-neutral-600 gap-3">
      <h2 className="text-xl font-bold text-neutral-900">Page Not Found</h2>
      <a href="/" className="text-sm text-neutral-900 underline hover:text-black">Return to Workspace</a>
    </div>
  ),
  errorComponent: ({ error }: { error: any }) => (
    <div className="h-screen w-screen bg-[#eef2f6] dark:bg-zinc-900 flex flex-col items-center justify-center text-neutral-600 dark:text-zinc-400 gap-3 p-4">
      <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Something went wrong</h2>
      <p className="text-sm max-w-md text-center">{error?.message || 'An unexpected error occurred.'}</p>
      <a href="/" className="text-sm text-neutral-900 dark:text-white underline hover:opacity-80 mt-2">
        Return to Workspace
      </a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
        <HeadContent />
      </head>
      <body className="text-[var(--text-primary)] bg-[var(--bg-canvas)] font-sans antialiased selection:bg-brand-bg selection:text-brand-fg min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <PwaProvider>
              <Outlet />
              <PwaBanner />
            </PwaProvider>
          </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
