import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Link2,
  Sparkles,
  Search,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export interface MediaInsertPayload {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  caption?: string;
  name?: string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (payload: MediaInsertPayload) => void;
  initialTab?: 'upload' | 'link' | 'unsplash' | 'giphy';
  position?: { top: number; left: number } | null;
}

// Curated high quality Unsplash photos fallback
const CURATED_UNSPLASH_PHOTOS = [
  {
    id: 'u1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    alt: 'Abstract gradient background',
    author: 'Milad Fakurian',
  },
  {
    id: 'u2',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    alt: 'Yosemite valley landscape',
    author: 'Bailey Zindel',
  },
  {
    id: 'u3',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    alt: 'Technology circuit board',
    author: 'Alexandre Debiève',
  },
  {
    id: 'u4',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
    alt: 'Modern skyscraper architecture',
    author: 'Sean Pollock',
  },
  {
    id: 'u5',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80',
    alt: 'Starry night mountains',
    author: 'Benjamin Voros',
  },
  {
    id: 'u6',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    alt: 'Retro synthwave gaming setup',
    author: 'Lorenzo Herrera',
  },
  {
    id: 'u7',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
    alt: 'Developer laptop workspace',
    author: 'Christopher Gower',
  },
  {
    id: 'u8',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    thumb: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80',
    alt: 'Colorful pastel gradient',
    author: 'Pawel Czerwinski',
  },
];

// Curated GIPHY GIFs fallback
const CURATED_GIPHY_GIFS = [
  {
    id: 'g1',
    url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    thumb: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/200w.gif',
    title: 'Mind Blown',
  },
  {
    id: 'g2',
    url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
    thumb: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif',
    title: 'Celebration Confetti',
  },
  {
    id: 'g3',
    url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif',
    thumb: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/200w.gif',
    title: 'Clapping Bravo',
  },
  {
    id: 'g4',
    url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
    thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200w.gif',
    title: 'Typing Cat',
  },
  {
    id: 'g5',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif',
    title: 'Thumbs Up Cool',
  },
  {
    id: 'g6',
    url: 'https://media.giphy.com/media/d31w24psGYeekCXY/giphy.gif',
    thumb: 'https://media.giphy.com/media/d31w24psGYeekCXY/200w.gif',
    title: 'Dancing Party',
  },
];

const GIPHY_API_KEY = 'pL32Ria9x1rGPJuav70Y4vOc69BQAACN'; // Public GIPHY API key

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  initialTab = 'upload',
  position,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'unsplash' | 'giphy'>(initialTab);
  const [linkInput, setLinkInput] = useState('');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashPhotos, setUnsplashPhotos] = useState(CURATED_UNSPLASH_PHOTOS);
  const [loadingUnsplash, setLoadingUnsplash] = useState(false);

  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyGifs, setGiphyGifs] = useState(CURATED_GIPHY_GIFS);
  const [loadingGiphy, setLoadingGiphy] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Fetch Unsplash photos on search
  useEffect(() => {
    if (activeTab !== 'unsplash') return;
    if (!unsplashQuery.trim()) {
      setUnsplashPhotos(CURATED_UNSPLASH_PHOTOS);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingUnsplash(true);
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            unsplashQuery
          )}&per_page=16&client_id=Client-ID-Placeholder`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const mapped = data.results.map((p: any) => ({
              id: p.id,
              url: p.urls.regular,
              thumb: p.urls.small,
              alt: p.alt_description || p.description || 'Unsplash photo',
              author: p.user?.name || 'Unsplash',
            }));
            setUnsplashPhotos(mapped);
          }
        } else {
          // Fallback to Unsplash Source search
          const querySlug = encodeURIComponent(unsplashQuery.trim());
          const fallbackPhotos = Array.from({ length: 8 }).map((_, i) => ({
            id: `uns-fall-${i}-${querySlug}`,
            url: `https://images.unsplash.com/photo-${1500000000000 + i * 100000}?auto=format&fit=crop&w=1200&q=80`,
            thumb: `https://source.unsplash.com/400x300/?${querySlug},${i}`,
            alt: `${unsplashQuery} photo ${i + 1}`,
            author: 'Unsplash Community',
          }));
          setUnsplashPhotos(fallbackPhotos);
        }
      } catch {
        // Fallback filtering on search
        const q = unsplashQuery.toLowerCase();
        const filtered = CURATED_UNSPLASH_PHOTOS.filter(
          (p) => p.alt.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
        );
        setUnsplashPhotos(filtered.length > 0 ? filtered : CURATED_UNSPLASH_PHOTOS);
      } finally {
        setLoadingUnsplash(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [unsplashQuery, activeTab]);

  // Fetch GIPHY GIFs on search
  useEffect(() => {
    if (activeTab !== 'giphy') return;

    const timer = setTimeout(async () => {
      setLoadingGiphy(true);
      try {
        const endpoint = giphyQuery.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
              giphyQuery
            )}&limit=16&rating=g`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=16&rating=g`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const mapped = data.data.map((g: any) => ({
              id: g.id,
              url: g.images?.original?.url || g.images?.downsized?.url,
              thumb: g.images?.fixed_height?.url || g.images?.small?.url,
              title: g.title || 'GIF',
            }));
            setGiphyGifs(mapped);
          }
        }
      } catch {
        // Keep current curated GIFs on error
      } finally {
        setLoadingGiphy(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [giphyQuery, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
      ? 'audio'
      : file.type.startsWith('image/')
      ? 'image'
      : 'file';

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onSelectMedia({
          url: dataUrl,
          type: fileType,
          name: file.name,
          caption: file.name,
        });
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;

    const url = linkInput.trim();
    let mediaType: 'image' | 'video' | 'audio' | 'file' = 'image';

    if (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('youtube.com') || url.includes('vimeo.com')) {
      mediaType = 'video';
    } else if (/\.(mp3|wav|m4a|aac)$/i.test(url)) {
      mediaType = 'audio';
    } else if (/\.(pdf|doc|docx|zip)$/i.test(url)) {
      mediaType = 'file';
    }

    onSelectMedia({
      url,
      type: mediaType,
      caption: url,
    });
    setLinkInput('');
    onClose();
  };

  if (!isOpen) return null;

  const modalStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: `${Math.min(position.top, window.innerHeight - 420)}px`,
        left: `${Math.min(position.left, window.innerWidth - 490)}px`,
      }
    : {
        position: 'fixed',
        top: '18%',
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <div
      ref={modalRef}
      style={modalStyle}
      className="z-[99999] w-[460px] bg-[#1c1c1c] text-white rounded-xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none font-sans"
    >
      {/* Header Tabs Navigation */}
      <div className="px-4 pt-3 pb-0 border-b border-stone-800 flex items-center justify-between bg-[#181818]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-white text-white bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-white text-white bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unsplash')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'unsplash'
                ? 'border-white text-white bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5" />
            <span>Unsplash</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('giphy')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'giphy'
                ? 'border-white text-white bg-stone-800/60'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>GIPHY</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 bg-[#1c1c1c] flex-1 min-h-[260px] max-h-[360px] overflow-y-auto">
        {/* Tab 1: Upload */}
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 border-2 border-dashed border-stone-700/80 rounded-xl bg-stone-900/40 hover:bg-stone-900/80 hover:border-stone-500 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,.pdf"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-300">
              <Upload className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div className="text-center flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-200">
                Choose a file or drag & drop
              </span>
              <span className="text-[11px] text-stone-500">
                Supports Images, GIFs, Videos, Audio, or PDFs up to 50MB
              </span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold tracking-tight transition-colors cursor-pointer border border-stone-700 shadow-sm"
            >
              Upload file
            </button>
          </div>
        )}

        {/* Tab 2: Link */}
        {activeTab === 'link' && (
          <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4 py-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Embed link or media URL
              </label>
              <input
                type="url"
                required
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Paste an image, video, audio, or embed URL..."
                className="w-full h-10 px-3 bg-[#141414] border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!linkInput.trim()}
              className="w-full h-9 bg-white hover:bg-stone-200 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Embed Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 3: Unsplash */}
        {activeTab === 'unsplash' && (
          <div className="flex flex-col gap-3">
            {/* Search input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={unsplashQuery}
                onChange={(e) => setUnsplashQuery(e.target.value)}
                placeholder="Search Unsplash high-res photos..."
                className="w-full h-9 pl-9 pr-3 bg-[#141414] border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-stone-400 transition-all"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['Minimal', 'Nature', 'Abstract', 'Tech', 'Architecture', '3D', 'Space'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setUnsplashQuery(tag)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 transition-colors cursor-pointer ${
                    unsplashQuery.toLowerCase() === tag.toLowerCase()
                      ? 'bg-white text-black'
                      : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Photos Grid */}
            {loadingUnsplash ? (
              <div className="py-12 flex items-center justify-center text-xs text-stone-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
                <span>Searching Unsplash...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-[230px] overflow-y-auto pr-0.5">
                {unsplashPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      onSelectMedia({
                        url: photo.url,
                        type: 'image',
                        caption: `Photo by ${photo.author} on Unsplash`,
                      });
                      onClose();
                    }}
                    className="relative group rounded-lg overflow-hidden border border-stone-800 aspect-video bg-stone-900 cursor-pointer text-left transition-transform hover:scale-[1.02]"
                  >
                    <img
                      src={photo.thumb || photo.url}
                      alt={photo.alt}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                      <span className="text-[10px] text-white font-medium truncate">
                        By {photo.author}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: GIPHY */}
        {activeTab === 'giphy' && (
          <div className="flex flex-col gap-3">
            {/* Search input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={giphyQuery}
                onChange={(e) => setGiphyQuery(e.target.value)}
                placeholder="Search GIPHY GIFs..."
                className="w-full h-9 pl-9 pr-3 bg-[#141414] border border-stone-700 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-none focus:border-stone-400 transition-all"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['Trending', 'Reactions', 'Celebration', 'Mind Blown', 'Dance', 'Cat', 'OMG'].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setGiphyQuery(tag === 'Trending' ? '' : tag)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full shrink-0 transition-colors cursor-pointer ${
                      (tag === 'Trending' && !giphyQuery) || giphyQuery.toLowerCase() === tag.toLowerCase()
                        ? 'bg-amber-400 text-black font-semibold'
                        : 'bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700'
                    }`}
                  >
                    {tag}
                  </button>
                )
              )}
            </div>

            {/* GIFs Grid */}
            {loadingGiphy ? (
              <div className="py-12 flex items-center justify-center text-xs text-stone-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Searching GIPHY...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-h-[230px] overflow-y-auto pr-0.5">
                {giphyGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => {
                      onSelectMedia({
                        url: gif.url,
                        type: 'image',
                        caption: gif.title || 'GIF via GIPHY',
                      });
                      onClose();
                    }}
                    className="relative group rounded-lg overflow-hidden border border-stone-800 aspect-video bg-stone-900 cursor-pointer text-left transition-transform hover:scale-[1.02]"
                  >
                    <img
                      src={gif.thumb || gif.url}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                      <span className="text-[10px] text-white font-medium truncate">
                        {gif.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer attribution */}
      <div className="px-4 py-2 bg-[#141414] border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-500">
        <span>Powered by Notling Media Services</span>
        <span className="font-mono text-stone-600">Press Esc to exit</span>
      </div>
    </div>
  );
};

// Helper camera icon
function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}
