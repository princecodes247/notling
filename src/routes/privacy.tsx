import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { LegalLayout } from '~/components/LegalLayout';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How Notling collects, protects, and respects your personal data and document content."
      lastUpdated="September 14, 2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">1. Introduction</h2>
        <p>
          Notling Technologies ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and safeguarded when you use our workspace application and related services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">2. Information We Collect</h2>
        <p>
          We collect minimal information necessary to deliver a fast, reliable workspace experience:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Account Data:</strong> Email address, name, and profile picture (via email sign-in or OAuth providers like Google and GitHub).</li>
          <li><strong>Workspace Content:</strong> Document titles, rich-text blocks, nested folders, media attachments, and metadata created within your workspace.</li>
          <li><strong>Session & Authentication Cookies:</strong> Encrypted tokens required to keep you signed in securely.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">3. How We Use Your Information</h2>
        <p>
          Your information is used strictly to provide and improve the Notling workspace platform:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
          <li>Syncing document content across your active sessions and collaborators.</li>
          <li>Indexing document titles and body text for instant full-text search (`Cmd+K`).</li>
          <li>Facilitating workspace permissions, invite links, and real-time presence indicators.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">4. Data Ownership & Storage</h2>
        <p>
          Your notes, documents, and assets belong exclusively to you. Notling does not sell your personal data or use your private document content to train public AI models.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">5. Your Rights & Data Portability</h2>
        <p>
          You retain full control over your data. You may export your pages to Markdown or HTML formats at any time, or permanently delete documents and workspaces directly from the application.
        </p>
      </section>
    </LegalLayout>
  );
}
