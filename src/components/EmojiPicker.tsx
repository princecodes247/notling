import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Folder, Lightbulb, Smile, Leaf, MapPin, Trash2 } from 'lucide-react';
import { EMOJI_LIST } from '~/lib/constants';


export type EmojiCategory = 'all' | 'objects' | 'symbols' | 'smileys' | 'nature' | 'places';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  currentEmoji?: string | null;
  onRemove?: () => void;
  className?: string;
}

const CATEGORIES: { id: EmojiCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: "" },
  { id: 'objects', label: 'Objects', icon: <Folder className="w-3.5 h-3.5" /> },
  { id: 'symbols', label: 'Symbols', icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { id: 'smileys', label: 'Smileys', icon: <Smile className="w-3.5 h-3.5" /> },
  { id: 'nature', label: 'Nature', icon: <Leaf className="w-3.5 h-3.5" /> },
  { id: 'places', label: 'Places', icon: <MapPin className="w-3.5 h-3.5" /> },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  onClose,
  currentEmoji,
  onRemove,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick, true);
      document.addEventListener('touchstart', handleOutsideClick, true);
      document.addEventListener('keydown', handleKeyDown, true);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EMOJI_LIST.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.emoji.includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 w-72 bg-white dark:bg-[#1f1f23] border border-stone-200/90 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2 font-sans select-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search input header */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-7 py-1.5 text-xs bg-stone-100 dark:bg-[#18181b] border border-transparent focus:border-stone-300 dark:focus:border-zinc-700 rounded-lg text-stone-900 dark:text-zinc-100 placeholder-stone-400 dark:placeholder-zinc-500 outline-none transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 p-0.5 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-1 pb-1 border-b border-stone-100 dark:border-zinc-800/80 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !searchQuery;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${isActive
                ? 'bg-stone-200/90 dark:bg-zinc-700/80 text-stone-900 dark:text-white'
                : 'text-stone-500 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/60 hover:text-stone-800 dark:hover:text-zinc-200'
                }`}
              title={cat.label}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Emoji Grid Container */}
      <div className="max-h-48 p-1 overflow-y-auto custom-scrollbar pr-0.5">
        {filteredEmojis.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 dark:text-zinc-500">
            No emojis found for "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji + item.name}
                type="button"
                onClick={() => {
                  onSelect(item.emoji);
                  onClose();
                }}
                title={item.name}
                className={`text-xl p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:bg-stone-100 dark:hover:bg-zinc-800 hover:scale-110 active:scale-95 ${currentEmoji === item.emoji
                  ? 'bg-stone-200/90 dark:bg-zinc-700/90 ring-1 ring-stone-400 dark:ring-zinc-500'
                  : ''
                  }`}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optional Footer: Remove Icon */}
      {onRemove && currentEmoji && (
        <div className="pt-1.5 border-t border-stone-100 dark:border-zinc-800/80 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove icon</span>
          </button>
        </div>
      )}
    </div>
  );
};
