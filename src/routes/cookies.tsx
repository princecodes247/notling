import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { LegalLayout } from '~/components/LegalLayout';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cookies',
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="How Notling uses essential storage and local caching to deliver an instant, secure workspace."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">1. What Is Essential Storage</h2>
        <p>
          Essential storage includes cookies, local browser storage (`localStorage`), and client-side database caches (`IndexedDB`) required for Notling to function securely, remember your preferences, and load your workspace instantly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">2. Essential Storage</h2>
        <p>
          Notling uses essential storage mechanisms strictly for necessary platform operations:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
          <li>
            <strong>Authentication & Session Security:</strong> Encrypted tokens used to verify your identity and maintain a secure sign-in session across refreshes.
          </li>
          <li>
            <strong>Workspace Context & Preferences:</strong> Remembers your active workspace selection, folder collapse states, theme settings (Light or Dark mode), and UI view modes.
          </li>
          <li>
            <strong>Local-First Document Caching:</strong> Uses high-performance local storage and IndexedDB to cache document blocks, search indices, and offline edits locally for instant reactivity.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">3. Zero Third-Party Advertising Trackers</h2>
        <p>
          Notling does <strong>not</strong> use third-party advertising cookies, cross-site tracking pixels, or third-party analytics scripts that profile your activity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">4. Managing Storage Preferences</h2>
        <p>
          You can manage or clear storage data through your browser settings at any time. Please note that clearing essential session storage will sign you out and reset local UI preferences.
        </p>
      </section>
    </LegalLayout>
  );
}
