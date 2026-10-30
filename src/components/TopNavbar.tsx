import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Search, Terminal, Disc3, X, Link2 } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const {
    activeView,
    navigateTo,
    searchQuery,
    setSearchQuery,
    setInspectorOpen,
    setImportModalOpen,
  } = usePlayer();

  const [localInput, setLocalInput] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Sync when search query changes externally
  useEffect(() => {
    setLocalInput(searchQuery);
  }, [searchQuery]);

  // Fetch InnerTube suggestions on debounced keystrokes
  useEffect(() => {
    const trimmed = localInput.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const list = await api.getSuggestions(trimmed);
        setSuggestions(list.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [localInput]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    setSearchQuery(localInput.trim());
    setIsSuggestOpen(false);
    navigateTo('search');
  };

  const handleSelectSuggestion = (item: string) => {
    setLocalInput(item);
    setSearchQuery(item);
    setIsSuggestOpen(false);
    navigateTo('search');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070708]/95 backdrop-blur-md border-b border-neutral-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-6">
      {/* Zone 1: Wordmark */}
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 focus:outline-none cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
          <Disc3 className="w-4.5 h-4.5 animate-[spin_6s_linear_infinite]" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-white leading-tight">
            zero<span className="text-red-500 font-black">-music</span>
          </span>
        </div>
      </button>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'home'
              ? 'text-white font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          ホーム (Home)
        </button>
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'library'
              ? 'text-white font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          ライブラリ (Library)
        </button>
        <button
          type="button"
          onClick={() => setInspectorOpen(true)}
          className="text-neutral-400 hover:text-red-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>InnerTube API</span>
        </button>
      </nav>

      {/* Zone 3: Search Bar with Autocomplete & Quick Import & Inspector */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div ref={searchBoxRef} className="relative w-40 sm:w-60 md:w-72">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={localInput}
              onChange={(e) => {
                setLocalInput(e.target.value);
                setIsSuggestOpen(true);
              }}
              onFocus={() => setIsSuggestOpen(true)}
              placeholder="楽曲、アーティスト、アルバムを検索..."
              className="w-full bg-neutral-900/90 text-sm text-white placeholder-neutral-500 pl-9.5 pr-8 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-colors"
            />
            {localInput && (
              <button
                type="button"
                onClick={() => {
                  setLocalInput('');
                  setSuggestions([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Autocomplete suggestions popover */}
          {isSuggestOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[#121214] border border-neutral-800 rounded-lg shadow-2xl py-1 z-50 overflow-hidden">
              <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                InnerTube サジェスト
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-3.5 py-2 text-sm text-neutral-200 hover:bg-neutral-800/70 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global One-Click URL Import Button */}
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          title="YouTube / Spotify プレイリストURLを一括インポート"
          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 hover:text-white border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">URLインポート</span>
        </button>

        {/* InnerTube Inspector Button */}
        <button
          type="button"
          onClick={() => setInspectorOpen(true)}
          title="InnerTube API Inspector"
          className="px-2.5 sm:px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden lg:inline">API 診断</span>
        </button>
      </div>
    </header>
  );
};
