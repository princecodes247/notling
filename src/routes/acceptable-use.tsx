import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { LegalLayout } from '~/components/LegalLayout';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/acceptable-use',
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
  return (
    <LegalLayout
      title="Acceptable Use Policy"
      subtitle="Standards and rules ensuring a safe, lawful, and reliable environment for all Notling users."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. Overview</h2>
        <p>
          This Acceptable Use Policy outlines prohibited uses of Notling to protect our infrastructure, service performance, and user community.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. Prohibited Activities</h2>
        <p>You agree not to engage in any of the following prohibited behaviors:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>System Abuse & Exploitation:</strong> Attempting to probe, scan, or breach the vulnerability of any system, API, or network.</li>
          <li><strong>Malicious Content:</strong> Uploading or sharing malware, viruses, trojans, or destructive code.</li>
          <li><strong>Automated Abuse:</strong> Scraping, spamming, or overloading real-time collaboration signaling layers with automated bots.</li>
          <li><strong>Illegal & Harmful Content:</strong> Storing or distributing unlawful, harassing, or dangerous material.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. System Limits & Resource Usage</h2>
        <p>
          To maintain sub-millisecond response times for all users, fair resource limits apply to media attachments, workspace imports, and API request frequencies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Violations & Enforcement</h2>
        <p>
          We reserve the right to investigate suspected violations of this policy and take appropriate action, including issuing warnings, removing content, or terminating access.
        </p>
      </section>
    </LegalLayout>
  );
}
