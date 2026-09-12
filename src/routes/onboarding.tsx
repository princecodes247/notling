import { createRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Route as rootRoute } from './__root';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SparklesIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { completeOnboarding, checkWorkspaceSlug } from '~/server/auth';
import { NotlingLogoIcon } from '~/components/Icons';
import { Select, type SelectOption } from '~/components/ui/Select';
import { Avatar } from '@avatune/react';
import pacovqzzTheme from '@avatune/pacovqzz-theme/react';
import { RefreshCw } from 'lucide-react';
import { WorkspaceAvatar } from '~/components/WorkspaceAvatar';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

const ONBOARDING_ROLE_OPTIONS: SelectOption[] = [
  { value: 'Software Engineer', label: 'Software Engineer / Tech Lead' },
  { value: 'Product Manager', label: 'Product Manager / Owner' },
  { value: 'Designer', label: 'UI/UX Designer' },
  { value: 'Founder / CEO', label: 'Founder / Executive' },
  { value: 'Researcher / Student', label: 'Researcher / Student' },
];

const TEMPLATES = [
  {
    id: 'engineering',
    title: 'Engineering & Architecture',
    icon: '⚙️',
    description: 'System overview, API guidelines, architecture diagrams, and dev best practices.',
  },
  {
    id: 'product',
    title: 'Product Roadmap & Specs',
    icon: '🎯',
    description: 'Q3 goals, product specifications, customer feedback, and launch checklists.',
  },
  {
    id: 'personal',
    title: 'Personal Knowledge Base',
    icon: '🧠',
    description: 'Daily journals, reading list, personal goals, and quick notes.',
  },
  {
    id: 'blank',
    title: 'Clean Slate',
    icon: '✨',
    description: 'Start with an empty workspace and build your own custom page hierarchy.',
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

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
  const [selectedTemplate, setSelectedTemplate] = useState('engineering');

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
          name: name.trim() || 'Workspace Member',
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
        const returnUrl = sessionStorage.getItem('notling_auth_redirect');
        sessionStorage.removeItem('notling_auth_redirect');
        if (returnUrl) {
          window.location.href = returnUrl;
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

  return (
    <div className="min-h-screen bg-[#fafaf9] text-neutral-900 flex flex-col items-center justify-center p-6 select-none font-sans relative">
      {/* Header Brand */}
      <div className="flex items-center gap-2 mb-8">
        <NotlingLogoIcon className="w-6 h-6 text-neutral-900" />
        <span className="font-bold text-lg tracking-tight">Notling Workspace</span>
      </div>

      {/* Progress Indicators */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step === s
                ? 'bg-black text-white shadow-2xs'
                : step > s
                  ? 'bg-neutral-200 text-neutral-800'
                  : 'bg-neutral-100 text-neutral-400'
                }`}
            >
              {step > s ? <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-emerald-600" /> : s}
            </div>
            {s < 3 && <div className="w-8 h-0.5 bg-neutral-200 rounded-full" />}
          </div>
        ))}
      </div>

      {/* Onboarding Card Container */}
      <div className="w-full max-w-xl bg-white border border-neutral-200/90 rounded-xl p-8 shadow-xs flex flex-col">
        {/* STEP 1: Profile Setup */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Set up your profile</h2>
              <p className="text-xs text-neutral-500 mt-1">
                How you'll show up to your team
              </p>
            </div>

            {/* Avatar + Full Name Row */}
            <div className="flex items-end gap-3">
              {/* Compact Avatar with Reroll Badge */}
              <div className="relative shrink-0 group">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-300 bg-neutral-100 flex items-center justify-center shadow-2xs">
                  <Avatar theme={pacovqzzTheme} seed={avatarSeed} size={44} />
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarSeed('avatar-' + Math.random().toString(36).substring(2, 9))}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-600 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
                  title="Reroll avatar"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Full Name Input */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <label className="text-xs font-semibold text-neutral-700">Your Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Scotty Prince"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Your Primary Role</label>
              <Select
                value={role}
                options={ONBOARDING_ROLE_OPTIONS}
                onChange={(newRole) => setRole(newRole)}
                size="lg"
                variant="outline"
                align="left"
                matchTriggerWidth
                className="w-full bg-neutral-50/50 hover:bg-neutral-100/60"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs mt-2"
            >
              <span>Continue to Workspace</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
            </button>
          </div>
        )}

        {/* STEP 2: Workspace Setup */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Customize your workspace</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Name and icon for your personal knowledge repository.
              </p>
            </div>

            {/* Avatar + Workspace Name Row */}
            <div className="flex items-end gap-3">
              {/* Compact Avatar with Reroll Badge */}
              <div className="relative shrink-0 group">
                <WorkspaceAvatar
                  seed={effectiveRingsSeed}
                  size={44}
                  variant="squircle"
                />
                <button
                  type="button"
                  onClick={() => setWorkspaceRingsSeedSuffix(Math.random().toString(36).substring(2, 8))}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-600 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90"
                  title="Reroll avatar pattern"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Workspace Name Input */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <label className="text-xs font-semibold text-neutral-700">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                  placeholder="e.g. Acme Engineering Docs"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50"
                />
              </div>
            </div>

            {/* Workspace Slug */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Workspace Slug / URL</label>
              <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50/50 overflow-hidden focus-within:ring-1 focus-within:ring-black">
                <span className="px-3 py-2.5 text-xs text-neutral-400 bg-neutral-100 border-r border-neutral-200 select-none font-mono">
                  notling.dev/w/
                </span>
                <input
                  type="text"
                  value={workspaceSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setWorkspaceSlug(slugify(e.target.value));
                  }}
                  placeholder="acme-engineering"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none font-mono"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-0.5">
                <span className="text-neutral-400">Unique identifier for your workspace web URL.</span>
                {slugInfo && (
                  slugInfo.isAvailable ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      ✓ Available
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium flex items-center gap-1" title={`Slug already taken. Will be saved as ${slugInfo.candidateSlug}`}>
                      ⚠️ Taken (auto-adjusts to <code className="font-mono bg-amber-50 px-1 rounded border border-amber-200">{slugInfo.candidateSlug}</code>)
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Short Description (Optional)</label>
              <textarea
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Central hub for product specifications and technical documentation."
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>Choose Starter Template</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Starter Template Selection */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Pick a starter template</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Choose a pre-built structure or start with a clean slate.
              </p>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 gap-3">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex items-start gap-3.5 ${selectedTemplate === tmpl.id
                    ? 'border-black bg-neutral-50/80 shadow-2xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                >
                  <span className="text-2xl p-1 bg-white rounded-lg border border-neutral-200 shrink-0 shadow-2xs">
                    {tmpl.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-900">{tmpl.title}</h4>
                      {selectedTemplate === tmpl.id && (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-black shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{tmpl.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleComplete}
                className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <span>{loading ? 'Setting up workspace...' : 'Launch Workspace'}</span>
                <HugeiconsIcon icon={SparklesIcon} size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
