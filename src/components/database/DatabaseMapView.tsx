import React, { useState, useMemo } from 'react';
import type { DatabaseProperty, DatabaseItem } from '~/db/schema';
import {
  MapPin,
  Search,
  Plus,
  Compass,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { getOptionBadgeStyles } from '~/lib/optionColors';

interface DatabaseMapViewProps {
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onUpdateItem?: (itemId: string, updates: { title?: string; properties?: Record<string, any> }) => void;
  onDeleteItem?: (itemId: string) => void;
  onAddItem: (initialProps?: Record<string, any>) => void;
  onOpenRowDrawer?: (item: DatabaseItem) => void;
  readOnly?: boolean;
}

// Preset realistic world landmarks for coordinate hashing
const GEO_LOCATIONS = [
  { name: 'San Francisco', x: 18, y: 35 },
  { name: 'New York', x: 28, y: 34 },
  { name: 'London', x: 48, y: 26 },
  { name: 'Berlin', x: 53, y: 24 },
  { name: 'Tokyo', x: 86, y: 36 },
  { name: 'Singapore', x: 79, y: 55 },
  { name: 'Sydney', x: 89, y: 78 },
  { name: 'Sao Paulo', x: 34, y: 72 },
  { name: 'Toronto', x: 26, y: 31 },
  { name: 'Paris', x: 49, y: 28 },
  { name: 'Dubai', x: 62, y: 42 },
  { name: 'Seoul', x: 84, y: 34 },
  { name: 'Amsterdam', x: 50, y: 25 },
  { name: 'Stockholm', x: 54, y: 19 },
];

export const DatabaseMapView: React.FC<DatabaseMapViewProps> = ({
  properties,
  items,
  onAddItem,
  onOpenRowDrawer,
  readOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const statusProp = properties.find((p) => p.type === 'status' || p.type === 'select');
  const textProps = properties.filter((p) => p.type === 'text' || p.type === 'url' || p.type === 'email');

  // Map each item to a realistic coordinate on the SVG map
  const mappedItems = useMemo(() => {
    return items.map((item, index) => {
      // Find any property value that might describe location
      let locName = '';
      for (const tp of textProps) {
        const val = item.properties?.[tp.id];
        if (typeof val === 'string' && val.trim()) {
          locName = val.trim();
          break;
        }
      }

      // Consistent hashing for items
      let hash = 0;
      const strToHash = item.title + item.id + locName;
      for (let i = 0; i < strToHash.length; i++) {
        hash = (hash << 5) - hash + strToHash.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);

      const preset = GEO_LOCATIONS[(index + absHash) % GEO_LOCATIONS.length];
      const offsetX = ((absHash % 10) - 5) * 0.8;
      const offsetY = (((absHash >> 3) % 10) - 5) * 0.8;

      return {
        item,
        locationLabel: locName || preset.name,
        x: Math.min(92, Math.max(8, preset.x + offsetX)),
        y: Math.min(88, Math.max(12, preset.y + offsetY)),
      };
    });
  }, [items, textProps]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mappedItems;
    const q = searchQuery.toLowerCase();
    return mappedItems.filter(
      (m) =>
        (m.item.title || '').toLowerCase().includes(q) ||
        m.locationLabel.toLowerCase().includes(q)
    );
  }, [mappedItems, searchQuery]);

  const activeMappedItem = mappedItems.find((m) => m.item.id === selectedItemId);

  return (
    <div className="w-full h-full flex flex-col font-sans select-none text-stone-900 dark:text-zinc-100">
      {/* Map Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 pt-1 border-b border-stone-200/70 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#1f4d3d] dark:text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">
            {items.length} Location Markers Plotted
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 rounded-md hover:bg-stone-200/70 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => onAddItem()}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#1f4d3d] hover:bg-[#183d30] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Map Split Canvas */}
      <div className="flex-1 min-h-0 flex gap-4 pt-3 overflow-hidden">
        {/* Left Side: Search & Locations List */}
        <div className="w-72 sm:w-80 shrink-0 border border-stone-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 shadow-xs flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-2.5 border-b border-stone-200/70 dark:border-zinc-800">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 dark:bg-zinc-800/80 border border-stone-200/70 dark:border-zinc-700/60 text-xs">
              <Search className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locations..."
                className="w-full bg-transparent placeholder-stone-400 focus:outline-none font-medium text-stone-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Location Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
            {filteredItems.map(({ item, locationLabel }) => {
              const isSelected = selectedItemId === item.id;
              const statusVal = statusProp ? item.properties?.[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find((o) => o.id === statusVal);
              const badge = statusOpt ? getOptionBadgeStyles(statusOpt.color) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  onDoubleClick={() => onOpenRowDrawer?.(item)}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all cursor-pointer group",
                    isSelected
                      ? "border-[#1f4d3d] bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-700 shadow-2xs"
                      : "border-stone-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-stone-50/80 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-semibold text-stone-800 dark:text-zinc-200 truncate">
                      {item.title || 'Untitled'}
                    </h5>
                    {badge && (
                      <span
                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", badge.className)}
                        style={badge.style}
                      >
                        {statusOpt?.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500 dark:text-zinc-400">
                    <MapPin className="w-3 h-3 text-[#1f4d3d] dark:text-emerald-400" />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Vector Map Canvas */}
        <div className="flex-1 border border-stone-200/80 dark:border-zinc-800 rounded-xl bg-[#0e1626]/90 dark:bg-[#090d16] shadow-xs relative overflow-hidden flex items-center justify-center">
          {/* Subtle Map Background Grid & Continent Outlines */}
          <div
            className="w-full h-full relative transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <svg
              className="w-full h-full opacity-20 dark:opacity-15 pointer-events-none"
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="1000" height="500" fill="url(#mapGrid)" />
              {/* World Continents Simplified Polygons */}
              {/* North America */}
              <path
                d="M 120,80 Q 250,50 320,120 Q 280,240 180,220 Z"
                fill="#38bdf8"
                opacity="0.3"
              />
              {/* South America */}
              <path
                d="M 280,260 Q 360,280 340,420 Q 290,450 260,320 Z"
                fill="#38bdf8"
                opacity="0.3"
              />
              {/* Europe & Africa */}
              <path
                d="M 460,70 Q 580,60 560,180 Q 600,320 540,430 Q 450,320 450,180 Z"
                fill="#38bdf8"
                opacity="0.3"
              />
              {/* Asia & Australia */}
              <path
                d="M 620,70 Q 880,80 880,240 Q 750,280 640,200 Z M 800,340 Q 920,330 900,440 Q 810,430 800,340 Z"
                fill="#38bdf8"
                opacity="0.3"
              />
            </svg>

            {/* Rendered Pins */}
            {filteredItems.map(({ item, locationLabel, x, y }) => {
              const isSelected = selectedItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    onOpenRowDrawer?.(item);
                  }}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group z-10"
                >
                  {/* Pin Pulse Glow */}
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 animate-ping opacity-40",
                      isSelected ? "bg-emerald-400" : "bg-sky-400"
                    )}
                  />

                  {/* Pin Head */}
                  <div
                    className={cn(
                      "p-1.5 rounded-full shadow-lg border transition-all duration-200 group-hover:scale-125 flex items-center justify-center",
                      isSelected
                        ? "bg-[#1f4d3d] border-emerald-400 text-white ring-4 ring-emerald-500/30 scale-110"
                        : "bg-sky-500 border-sky-300 text-white group-hover:bg-emerald-500"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                  </div>

                  {/* Tooltip on Hover / Selection */}
                  <div
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2.5 py-1 rounded-md bg-stone-900/90 text-white text-[11px] font-medium whitespace-nowrap shadow-xl border border-stone-700 pointer-events-none transition-all",
                      isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95"
                    )}
                  >
                    <span className="font-semibold">{item.title || 'Untitled'}</span>
                    <span className="text-stone-400 text-[10px] ml-1.5">({locationLabel})</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Location Info Card Floating Bottom */}
          {activeMappedItem && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 p-3 rounded-xl bg-stone-900/90 backdrop-blur-md border border-stone-700 text-white shadow-2xl flex items-center justify-between gap-3 z-20">
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">
                  {activeMappedItem.item.title || 'Untitled'}
                </div>
                <div className="text-[10px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span>{activeMappedItem.locationLabel}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenRowDrawer?.(activeMappedItem.item)}
                className="px-2.5 py-1 rounded-lg bg-[#1f4d3d] hover:bg-[#183d30] text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Open Page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
