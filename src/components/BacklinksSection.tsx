import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Link2, ChevronDown, ChevronRight, ArrowUpRight } from 'lucide-react';
import { getPageBacklinks } from '~/server/pages';
import { useUIStore } from '~/store/uiStore';

interface BacklinksSectionProps {
  pageId: string;
}

export const BacklinksSection: React.FC<BacklinksSectionProps> = ({ pageId }) => {
  const navigate = useNavigate();
  const { setActivePageId } = useUIStore();
  const [isOpen, setIsOpen] = useState(true);

  const { data: backlinks = [], isLoading } = useQuery({
    queryKey: ['pageBacklinks', pageId],
    queryFn: async () => await getPageBacklinks({ data: pageId }),
    enabled: Boolean(pageId),
    refetchInterval: 5000,
  });

  const handleNavigateToBacklink = (targetPageId: string) => {
    setActivePageId(targetPageId);
    navigate({ to: '/dashboard/p/$pageId', params: { pageId: targetPageId } });
  };

  if (isLoading) {
    return (
      <div className="my-4 pt-4 border-t border-stone-200/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
          <Link2 className="w-3.5 h-3.5 animate-pulse text-stone-400" />
          <span>Loading backlinks...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="backlinks-section" className="my-6 pt-4 border-t border-stone-200/70 select-none">
      {/* Header / Accordion toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
          )}
          <div className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 transition-colors" />
            <span>Backlinks</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
              backlinks.length > 0
                ? 'bg-amber-50 text-amber-800 border-amber-200/80 font-bold'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}>
              {backlinks.length}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-normal text-stone-400 group-hover:text-stone-600">
          {isOpen ? 'Hide' : 'Show pages linking here'}
        </span>
      </button>

      {/* Expanded list */}
      {isOpen && (
        <div className="mt-2 flex flex-col gap-2">
          {backlinks.length === 0 ? (
            <div className="px-3.5 py-3 rounded-lg bg-stone-50/60 border border-dashed border-stone-200 text-stone-400 text-xs flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>No pages link to this document yet. Type <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white rounded border border-stone-200 text-stone-600">@</kbd> in another document to mention this page.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {backlinks.map((link) => (
                <div
                  key={link.id}
                  onClick={() => handleNavigateToBacklink(link.id)}
                  className="p-3 rounded-xl border border-stone-200/80 hover:border-amber-300/90 bg-white hover:bg-amber-50/30 transition-all cursor-pointer group shadow-2xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{link.icon || '📄'}</span>
                      <span className="text-xs font-semibold text-stone-900 group-hover:text-amber-900 truncate">
                        {link.title || 'Untitled'}
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 transition-colors shrink-0" />
                  </div>

                  {link.snippet && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 italic font-mono bg-stone-50/80 p-1.5 rounded border border-stone-100/90">
                      "{link.snippet}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
