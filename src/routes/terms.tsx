import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { LegalLayout } from '~/components/LegalLayout';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The terms and guidelines governing your access to and use of Notling."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">1. Acceptance of Terms</h2>
        <p>
          By creating an account or accessing the Notling application, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">2. User Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account credentials. You agree to notify us immediately of any unauthorized access to your account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">3. Content Rights & Licensing</h2>
        <p>
          You retain all ownership rights to all text, media, documents, and assets you create or upload in Notling. We claim no intellectual property rights over the material you provide to the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">4. Service Modifications</h2>
        <p>
          We continuously update Notling to enhance speed, reliability, and security. We reserve the right to modify or discontinue features with reasonable notice to users.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">5. Termination</h2>
        <p>
          You may delete your account and stop using the service at any time. We reserve the right to suspend or terminate accounts that violate our Acceptable Use Policy.
        </p>
      </section>
    </LegalLayout>
  );
}
