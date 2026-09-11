import { createRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Route as rootRoute } from './__root';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SparklesIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { completeOnboarding } from '~/server/auth';
import { NotlingLogoIcon } from '~/components/Icons';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=128&h=128&fit=crop&crop=faces',
];

const WORKSPACE_ICONS = ['🚀', '🧠', '⚡', '💡', '🎨', '📚', '🎯', '🔥', '💻', '📦'];

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
  const [avatarUrl, setAvatarUrl] = useState(AVATARS[0]);
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [workspaceSlug, setWorkspaceSlug] = useState('my-workspace');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [workspaceIcon, setWorkspaceIcon] = useState('🚀');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('engineering');

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

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
          avatarUrl,
          role,
          workspaceName: workspaceName.trim() || 'My Workspace',
          workspaceSlug: workspaceSlug.trim() || 'my-workspace',
          workspaceIcon,
          workspaceDescription,
          templateId: selectedTemplate,
        },
      });

      if (res.success) {
        navigate({ to: '/dashboard' });
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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                step === s
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
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Set up your profile</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Tell us how you would like to be identified across documents and team collaboration.
              </p>
            </div>

            {/* Avatar Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-700">Choose your avatar</label>
              <div className="flex items-center gap-3">
                {AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      avatarUrl === url ? 'border-black scale-105 shadow-2xs' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img src={url} alt="Avatar option" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Your Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Scotty Prince"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50"
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Your Primary Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50 cursor-pointer"
              >
                <option value="Software Engineer">Software Engineer / Tech Lead</option>
                <option value="Product Manager">Product Manager / Owner</option>
                <option value="Designer">UI/UX Designer</option>
                <option value="Founder / CEO">Founder / Executive</option>
                <option value="Researcher / Student">Researcher / Student</option>
              </select>
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
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Customize your workspace</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Name and icon for your personal knowledge repository.
              </p>
            </div>

            {/* Icon Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-neutral-700">Workspace Icon</label>
              <div className="flex flex-wrap gap-2">
                {WORKSPACE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setWorkspaceIcon(emoji)}
                    className={`w-10 h-10 text-xl rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                      workspaceIcon === emoji
                        ? 'bg-neutral-100 border-black shadow-2xs'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Workspace Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-700">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                placeholder="e.g. Acme Engineering Docs"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50/50"
              />
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
              <p className="text-[11px] text-neutral-400">Unique identifier for your workspace web URL.</p>
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
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedTemplate === tmpl.id
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
