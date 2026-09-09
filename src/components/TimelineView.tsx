import React, { useState } from 'react';

interface TimelineItem {
  id: string;
  title: string;
  startCol: number; // 0 to 7
  duration: number; // columns spanned
  status: 'active' | 'in-progress' | 'upcoming';
}

const INITIAL_ITEMS: TimelineItem[] = [
  { id: '1', title: 'Venue & Logistics', startCol: 1, duration: 2.5, status: 'active' },
  { id: '2', title: 'Workshop Curriculum', startCol: 2, duration: 2.8, status: 'active' },
  { id: '3', title: 'Speaker Outreach', startCol: 3, duration: 2.7, status: 'in-progress' },
  { id: '4', title: 'Registration Launch', startCol: 3.8, duration: 2.7, status: 'upcoming' },
  { id: '5', title: 'Agent Demo Setup', startCol: 4.8, duration: 2.7, status: 'upcoming' },
  { id: '6', title: 'Day-of Operations', startCol: 5.2, duration: 2.8, status: 'upcoming' },
  { id: '7', title: 'Post-Event Recap', startCol: 6.7, duration: 1.5, status: 'upcoming' },
];

export const TimelineView: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>(INITIAL_ITEMS);

  return (
    <div className="flex-1 w-full h-full bg-white relative overflow-x-auto overflow-y-auto select-none">
      {/* Column Headers */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-100 min-w-[900px]">
        <div className="grid grid-cols-8 text-center text-[11px] text-neutral-400 py-3">
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2 flex items-center justify-center gap-1">
            <span>Apr 27 - </span>
            <span className="bg-neutral-200 text-neutral-800 font-medium px-1 rounded text-[10px]">
              May
            </span>
            <span>3</span>
          </div>
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2">Apr 27 - May 3</div>
          <div className="px-2">Apr 27 - May 3</div>
        </div>
      </div>

      {/* Grid Canvas with Vertical Orange Marker Line */}
      <div className="relative min-w-[900px] min-h-[500px] pt-6 pb-20">
        {/* Background Vertical Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-r border-dashed border-neutral-100 h-full"
            />
          ))}
        </div>

        {/* Prominent Vertical Orange Marker Line (Exact 1:1 match to useDance Image 1) */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-amber-400/90 z-10 pointer-events-none"
          style={{ left: '37.5%' }}
        />

        {/* Timeline Event Cards */}
        <div className="flex flex-col gap-4 relative z-20 px-6">
          {items.map((item) => {
            const leftPercent = (item.startCol / 8) * 100;
            const widthPercent = (item.duration / 8) * 100;

            return (
              <div
                key={item.id}
                className="relative h-11 flex items-center"
              >
                <div
                  className="absolute h-10 rounded-lg bg-white border border-neutral-200 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all flex items-center px-4 gap-3 cursor-pointer group"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(220, widthPercent * 9)}px`,
                  }}
                >
                  {/* Status Indicator Circle */}
                  {item.status === 'active' && (
                    <span className="w-3 h-3 rounded-full border-[1.5px] border-amber-500 shrink-0 inline-block" />
                  )}
                  {item.status === 'in-progress' && (
                    <span className="w-3 h-3 rounded-full border-[1.5px] border-dashed border-blue-400 shrink-0 inline-block animate-pulse" />
                  )}
                  {item.status === 'upcoming' && (
                    <span className="w-3 h-3 rounded-full border-[1.5px] border-dashed border-neutral-300 shrink-0 inline-block" />
                  )}

                  {/* Title */}
                  <span className="text-xs font-normal text-neutral-800 truncate">
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
