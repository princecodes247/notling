import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { LegalLayout } from '~/components/LegalLayout';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/security',
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <LegalLayout
      title="Security & Data Integrity"
      subtitle="Our architectural commitment to protecting your documents, sessions, and data."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">1. Security Architecture</h2>
        <p>
          Notling is built with a local-first philosophy. Your workspace data is processed locally with instant UI reactivity and backed by robust server-side data protection.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">2. Transport & Storage Encryption</h2>
        <p>
          All data transmitted between your browser and Notling servers is encrypted in transit using industry-standard TLS 1.3 encryption. Database records and S3 media uploads are encrypted at rest.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">3. Access Controls & Permissions</h2>
        <p>
          Workspace access is governed by strict user authentication and granular sharing roles (Owner, Editor, Viewer). Shared document links enforce permission checks server-side on every request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">4. Anti-Wipe Data Integrity Shield</h2>
        <p>
          Notling incorporates an automated Anti-Wipe Shield that validates client sync payloads before committing updates to PostgreSQL, guarding against blank payload wipes or sync loss.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">5. Reporting Vulnerabilities</h2>
        <p>
          If you discover a potential security issue in Notling, please report it responsibly by contacting our team. We investigate all security reports promptly.
        </p>
      </section>
    </LegalLayout>
  );
}
