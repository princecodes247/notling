import { createRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { completeOnboarding, checkWorkspaceSlug, getSession } from '~/server/auth';
import { NotlingLogoIcon } from '~/components/Icons';
import { FullScreenWordListLoader } from '~/components/FullScreenWordListLoader';
import { OnboardingProgress } from '~/components/onboarding/OnboardingProgress';
import { OnboardingStep1 } from '~/components/onboarding/OnboardingStep1';
import { OnboardingStep2 } from '~/components/onboarding/OnboardingStep2';
import { OnboardingStep3 } from '~/components/onboarding/OnboardingStep3';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

const ONBOARDING_LOADING_WORDS = [
  'Designing your workspace...',
  'Crafting page hierarchy...',
  'Configuring starter templates...',
  'Setting up permissions...',
  'Polishing workspace details...',
  'Opening your workspace...',
];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Fetch session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => await getSession(),
  });

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [avatarSeed, setAvatarSeed] = useState(() => 'avatar-' + Math.random().toString(36).substring(2, 9));
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [workspaceSlug, setWorkspaceSlug] = useState('my-workspace');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugInfo, setSlugInfo] = useState<{ isAvailable: boolean; candidateSlug: string } | null>(null);
  const [workspaceRingsSeedSuffix, setWorkspaceRingsSeedSuffix] = useState<string | null>(null);
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');

  useEffect(() => {
    if (!sessionLoading) {
      if (!session) {
        navigate({ to: '/login' });
      } else {
        if (session.name) setName(session.name);
        if (session.workspaceName) setWorkspaceName(session.workspaceName);
        if (session.workspaceSlug) setWorkspaceSlug(session.workspaceSlug);
      }
    }
  }, [session, sessionLoading, navigate]);

  const effectiveRingsSeed = workspaceRingsSeedSuffix
    ? `${workspaceName.trim() || 'My Workspace'}-${workspaceRingsSeedSuffix}`
    : (workspaceName.trim() || 'My Workspace');

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

  // Live Check Workspace Slug Availability
  useEffect(() => {
    let active = true;
    const clean = slugify(workspaceSlug);
    if (!clean) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkWorkspaceSlug({ data: { slug: clean } });
        if (active) {
          setSlugInfo(res);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [workspaceSlug]);

  const handleWorkspaceNameChange = (val: string) => {
    setWorkspaceName(val);
    if (!slugManuallyEdited) {
      setWorkspaceSlug(slugify(val) || 'my-workspace');
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await completeOnboarding({
        data: {
          name: name.trim() || session?.name || 'Workspace Member',
          avatarUrl: `avatune:${avatarSeed}`,
          role,
          workspaceName: workspaceName.trim() || 'My Workspace',
          workspaceSlug: workspaceSlug.trim() || 'my-workspace',
          workspaceIcon: effectiveRingsSeed,
          workspaceDescription,
          templateId: selectedTemplate,
        },
      });

      if (res.success) {
        if (res.session) {
          queryClient.setQueryData(['session'], res.session);
        }
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        await queryClient.invalidateQueries({ queryKey: ['pageTree'] });
        const returnUrl = sessionStorage.getItem('notling_auth_redirect');
        sessionStorage.removeItem('notling_auth_redirect');
        if (returnUrl) {
          window.location.href = returnUrl;
        } else if (res.session?.welcomePageId) {
          navigate({ to: '/dashboard/p/$pageId', params: { pageId: res.session.welcomePageId } });
        } else {
          navigate({ to: '/dashboard' });
        }
      } else {
        alert(res.error || 'Failed to complete onboarding.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <FullScreenWordListLoader
        words={ONBOARDING_LOADING_WORDS}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0e0e10] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 select-none font-sans relative">
      {/* Header Brand */}
      <div className="flex items-center gap-2 mb-8">
        <NotlingLogoIcon className="w-6 h-6 text-brand-text" />
        <span className="font-bold text-lg tracking-tight">Notling Workspace</span>
      </div>

      {/* Progress Indicators */}
      <OnboardingProgress currentStep={step} />

      {/* Onboarding Card Container */}
      <div className="w-full max-w-xl bg-white dark:bg-[#18181b] border border-neutral-200/90 dark:border-zinc-800/80 rounded-xl p-8 shadow-xs dark:shadow-2xl flex flex-col">
        {step === 1 && (
          <OnboardingStep1
            name={name}
            setName={setName}
            role={role}
            setRole={setRole}
            avatarSeed={avatarSeed}
            onRerollAvatar={() => setAvatarSeed('avatar-' + Math.random().toString(36).substring(2, 9))}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <OnboardingStep2
            workspaceName={workspaceName}
            onWorkspaceNameChange={handleWorkspaceNameChange}
            workspaceSlug={workspaceSlug}
            onWorkspaceSlugChange={(val) => {
              setSlugManuallyEdited(true);
              setWorkspaceSlug(slugify(val));
            }}
            effectiveRingsSeed={effectiveRingsSeed}
            onRerollPattern={() => setWorkspaceRingsSeedSuffix(Math.random().toString(36).substring(2, 8))}
            slugInfo={slugInfo}
            workspaceDescription={workspaceDescription}
            setWorkspaceDescription={setWorkspaceDescription}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <OnboardingStep3
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            loading={loading}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
