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
      subtitle="How Notling uses essential cookies and local storage to deliver an instant, secure workspace."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored in your browser when you visit a website. Notling uses essential cookies and client storage mechanisms strictly required for security, authentication, and performance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. Essential Cookies We Use</h2>
        <div className="overflow-x-auto my-4 border border-neutral-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 dark:bg-zinc-800/80 text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-zinc-800">
              <tr>
                <th className="p-3 font-semibold">Cookie Name</th>
                <th className="p-3 font-semibold">Purpose</th>
                <th className="p-3 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
              <tr>
                <td className="p-3 font-mono">session_token</td>
                <td className="p-3">Encrypted token used to verify your signed-in session securely.</td>
                <td className="p-3">Session / 30 Days</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">active_workspace_id</td>
                <td className="p-3">Remembers your current active workspace selection across refreshes.</td>
                <td className="p-3">30 Days</td>
              </tr>
              <tr>
                <td className="p-3 font-mono">theme</td>
                <td className="p-3">Stores your interface appearance preference (Light / Dark mode).</td>
                <td className="p-3">Persistent</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. Local Storage Usage</h2>
        <p>
          As a local-first workspace platform, Notling uses browser `localStorage` and `IndexedDB` to cache document state locally for instant page loading and offline resilience.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Zero Third-Party Advertising Trackers</h2>
        <p>
          Notling does <strong>not</strong> use third-party advertising cookies, cross-site tracking pixels, or data brokers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">5. Managing Cookies</h2>
        <p>
          You can disable or manage cookies through your browser settings. Please note that clearing essential session cookies will log you out of your workspace.
        </p>
      </section>
    </LegalLayout>
  );
}
