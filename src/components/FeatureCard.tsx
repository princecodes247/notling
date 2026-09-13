import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actionText?: string;
}

interface FeatureCardProps {
  card: FeatureCardData;
  onAction?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ card, onAction }) => {
  const Icon = card.icon;

  return (
    <div className="min-w-[280px] sm:min-w-[320px] flex-1 bg-[#f8fafc] hover:bg-[#f1f5f9] p-6.5 rounded-2xl border border-neutral-200/80 flex flex-col justify-between transition-all duration-200 snap-start group/card shadow-2xs hover:shadow-xs">
      <div>
        <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-800 mb-6 transition-transform group-hover/card:scale-105">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <h3 className="font-semibold text-base text-neutral-900 tracking-tight mb-2.5">
          {card.title}
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-6 font-normal">
          {card.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="text-xs font-semibold text-neutral-900 inline-flex items-center gap-1.5 hover:gap-2.5 transition-all cursor-pointer self-start group-hover/card:text-black"
      >
        <span>{card.actionText || 'Learn more'}</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/card:translate-x-0.5" />
      </button>
    </div>
  );
};
