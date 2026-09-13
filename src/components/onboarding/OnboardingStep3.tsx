import { HugeiconsIcon } from '@hugeicons/react';
import {
  Wrench01Icon,
  Target01Icon,
  BrainIcon,
  SparklesIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '~/components/ui/Button';

export const TEMPLATES = [
  {
    id: 'engineering',
    title: 'Engineering & Architecture',
    icon: Wrench01Icon,
    description: 'System overview, API guidelines, architecture diagrams, and dev best practices.',
  },
  {
    id: 'product',
    title: 'Product Roadmap & Specs',
    icon: Target01Icon,
    description: 'Q3 goals, product specifications, customer feedback, and launch checklists.',
  },
  {
    id: 'personal',
    title: 'Personal Knowledge Base',
    icon: BrainIcon,
    description: 'Daily journals, reading list, personal goals, and quick notes.',
  },
  {
    id: 'blank',
    title: 'Clean Slate',
    icon: SparklesIcon,
    description: 'Start fresh with a blank canvas and build your workspace as you go.',
  },
];

interface OnboardingStep3Props {
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;
  loading: boolean;
  onBack: () => void;
  onComplete: () => void;
}

export function OnboardingStep3({
  selectedTemplate,
  setSelectedTemplate,
  loading,
  onBack,
  onComplete,
}: OnboardingStep3Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">Pick a starter template</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Choose a pre-built structure or start with a clean slate.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-3">
        {TEMPLATES.map((tmpl) => {
          const isSelected = selectedTemplate === tmpl.id;
          return (
            <div
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${isSelected
                  ? 'border-neutral-900 bg-neutral-50/80 shadow-2xs'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
            >
              <div
                className={`p-2.5 rounded-xl border shrink-0 transition-colors ${isSelected
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-neutral-100/80 border-neutral-200/80 text-neutral-700'
                  }`}
              >
                <HugeiconsIcon icon={tmpl.icon} size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-neutral-900">{tmpl.title}</h4>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{tmpl.description}</p>
              </div>

              {/* Radio Select Affordance */}
              <div
                className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-white' : 'border-neutral-300 bg-white'
                  }`}
              >
                {isSelected && <HugeiconsIcon icon={Tick01Icon} size={10} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="px-4">
          Back
        </Button>
        <Button isLoading={loading} onClick={onComplete} className="flex-1">
          <span>{loading ? 'Setting up workspace...' : 'Launch Workspace'}</span>
        </Button>
      </div>
    </div>
  );
}
