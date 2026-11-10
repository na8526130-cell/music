import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import {
  Search,
  Terminal,
  Disc3,
  X,
  Link2,
  User,
  Bell,
  ShieldCheck,
  Sliders,
  MessageSquare,
  Radio,
  FileText,
  Trophy,
  Sparkles,
  Users,
  Music,
  Tv,
  Crown,
  Smartphone,
  BarChart2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { IOSInstallGuideModal } from './PWAInstallBanner';

export const TopNavbar: React.FC = () => {
  const {
    activeView,
    navigateTo,
    searchQuery,
    setSearchQuery,
    setInspectorOpen,
    setImportModalOpen,
    currentUser,
    setAccountModalOpen,
    stats,
    onlineCount,
    isAdmin,
    setAdminModalOpen,
    setEqModalOpen,
    setDmModalOpen,
    setNotificationDrawerOpen,
    unreadNotificationCount,
    setTermsModalOpen,
    setQuizModalOpen,
    setMatchModalOpen,
    setCollabModalOpen,
    playerMode,
    setPlayerMode,
    setVideoLayout,
    currentTrack,
    queue,
    playTrack,
    setWrappedModalOpen,
  } = usePlayer();

  const [localInput, setLocalInput] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  const handlePwaClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowPwaModal(true);
    }
  };

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
    const query = localInput.trim();
    if (!query) return;

    // Auto-detect Spotify & YouTube playlist/track URLs
    if (
      query.includes('spotify.com') ||
      query.includes('spotify.link') ||
      query.startsWith('spotify:') ||
      (query.includes('youtube.com') && query.includes('list=')) ||
      (query.includes('youtu.be') && query.includes('list='))
    ) {
      setImportModalOpen(true);
      setIsSuggestOpen(false);
      return;
    }

    setSearchQuery(query);
    api.recordSearchTelemetry(query);
    setIsSuggestOpen(false);
    navigateTo('search');
  };

  const handleSelectSuggestion = (item: string) => {
    setLocalInput(item);
    setSearchQuery(item);
    api.recordSearchTelemetry(item);
    setIsSuggestOpen(false);
    navigateTo('search');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070708]/95 backdrop-blur-md border-b border-neutral-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 md:gap-6">
      {/* Zone 1: Wordmark & Live Online Presence Badge (誰でも常に見える) */}
      <div className="flex items-center gap-3 shrink-0">
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

        {/* Live Online Users Badge - Visible to Everyone on all screens */}
        <button
          type="button"
          onClick={() => setAccountModalOpen(true)}
          title={`現在リアルタイム接続中: ${onlineCount}人（クリックでシステム稼働実績を表示）`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400/70 text-emerald-300 transition-all cursor-pointer shadow-sm shadow-emerald-950/40 select-none group"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden xs:inline sm:inline text-[11px] font-medium text-emerald-300/90 group-hover:text-emerald-200">
            オンライン
          </span>
          <span className="font-extrabold text-white text-xs font-mono">{onlineCount}</span>
          <span className="text-[10px] text-emerald-400 font-bold">人</span>
        </button>

        {/* Audio (音声) / MV (動画) Mode Switcher */}
        <div className="flex items-center bg-neutral-900/90 border border-neutral-700/80 rounded-full p-0.5 shadow-inner gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setPlayerMode('cover')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              playerMode === 'cover'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="音声・カバーアートモード（通信量節約・BGM再生）"
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">音声</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlayerMode('video');
              setVideoLayout('theater');
              if (!currentTrack && queue.length > 0) {
                playTrack(queue[0]);
              }
            }}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              playerMode === 'video'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40 ring-1 ring-red-400'
                : 'text-neutral-400 hover:text-red-400'
            }`}
            title={currentTrack ? 'ミュージックビデオ（MV）モードに切り替え' : 'MVモード（曲を選んでMVを大画面再生）'}
          >
            <Tv className="w-3.5 h-3.5 text-red-400" />
            <span>MV</span>
            {playerMode === 'video' && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            )}
          </button>
        </div>
      </div>

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
          onClick={() => {
            navigateTo('home');
            setTimeout(() => {
              const el = document.getElementById('oricon-ranking-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }}
          className="text-red-400 hover:text-red-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer font-medium"
          title="オリコン週間ランキングへスクロール"
        >
          <Crown className="w-3.5 h-3.5 text-red-500" />
          <span>オリコン (Oricon)</span>
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
          onClick={() => navigateTo('party')}
          className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeView === 'party'
              ? 'text-red-400 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>同時聴きラウンジ</span>
        </button>
        <button
          type="button"
          onClick={() => setDmModalOpen(true)}
          className="text-neutral-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          DMチャット
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
                検索候補
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

        {/* Real Stats Pill (オンライン人数 & 総アクセス回数 & アカウント数 - 偽はいらん) */}
        <button
          type="button"
          onClick={() => setAccountModalOpen(true)}
          title="システム稼働状況: リアルタイムオンライン人数・総アクセス回数・登録アカウント数（クリックで詳細）"
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer text-xs font-mono"
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-400">オンライン</span>
            <span className="font-bold text-emerald-400">{onlineCount}人</span>
          </span>
          <span className="text-neutral-600">/</span>
          <span className="flex items-center gap-1">
            <span className="text-neutral-400">アクセス</span>
            <span className="font-bold text-white">{stats.totalAccessCount.toLocaleString()}</span>
          </span>
          <span className="text-neutral-600">/</span>
          <span className="flex items-center gap-1">
            <span className="text-neutral-400">アカウント</span>
            <span className="font-bold text-neutral-200">{stats.totalAccountsCount.toLocaleString()}</span>
          </span>
        </button>

        {/* Intro Quiz Button */}
        <button
          type="button"
          onClick={() => setQuizModalOpen(true)}
          title="イントロ当て音楽クイズ（全5問・早押し対戦）"
          className="hidden lg:flex px-2.5 sm:px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>クイズ</span>
        </button>

        {/* Music Taste Matching Button */}
        <button
          type="button"
          onClick={() => setMatchModalOpen(true)}
          title="音楽の好みの近さ マッチング診断"
          className="hidden xl:flex px-2.5 sm:px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 hover:text-pink-200 border border-pink-500/30 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>好み診断</span>
        </button>

        {/* Collab Playlist Button */}
        <button
          type="button"
          onClick={() => setCollabModalOpen(true)}
          title="共同編集プレイリスト（友達とリアルタイム作成）"
          className="hidden xl:flex px-2.5 sm:px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>共同作成</span>
        </button>

        {/* Direct Messages Quick Button */}
        <button
          type="button"
          onClick={() => setDmModalOpen(true)}
          title="ユーザー間DMチャット（曲やプレイリストのプライベート交換）"
          className="px-2.5 sm:px-3 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">DM</span>
        </button>

        {/* Social Notification Bell with live unread badge */}
        <button
          type="button"
          onClick={() => setNotificationDrawerOpen(true)}
          title="通知 & アクティビティ"
          className="relative p-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <Bell className="w-4 h-4 text-neutral-300" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold ring-2 ring-[#070708] animate-pulse">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        {/* PWA App Install Quick Action */}
        {!isInstalled && (
          <button
            type="button"
            onClick={handlePwaClick}
            title="ホーム画面に追加してアプリ化（バックグラウンド再生安定化）"
            className="hidden sm:flex px-2.5 sm:px-3 py-2 bg-gradient-to-r from-red-600/20 to-rose-600/20 hover:from-red-600/30 hover:to-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm shadow-rose-950/40"
          >
            <Smartphone className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>アプリ化</span>
          </button>
        )}

        {/* Spotify Wrapped & Listening Analytics Quick Action */}
        <button
          type="button"
          onClick={() => setWrappedModalOpen(true)}
          title="Spotify Wrapped & リスニング分析（あなたの再生履歴と年間統計）"
          className="px-2.5 sm:px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm shadow-red-950/40"
        >
          <BarChart2 className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Wrapped</span>
        </button>

        {/* Account Status Button */}
        <button
          type="button"
          onClick={() => setAccountModalOpen(true)}
          title={currentUser ? `ログイン中: ${currentUser.username}${currentUser.email ? ` (${currentUser.email})` : ''}` : 'ゲスト利用中 (アカウント登録・ログイン)'}
          className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer border ${
            currentUser
              ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700/80'
              : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
          }`}
        >
          {currentUser ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono truncate max-w-[110px]">
                {currentUser.username}
              </span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span>アカウント</span>
            </>
          )}
        </button>

        {/* Master Admin Console Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            title="管理者コンソールを開く (マスター認証済み)"
            className="px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">👑 管理者</span>
          </button>
        )}

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

        {/* 10-Band Equalizer Quick Toggle */}
        <button
          type="button"
          onClick={() => setEqModalOpen(true)}
          title="イコライザー & 重低音ブースト"
          className="px-2.5 sm:px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden lg:inline">EQ</span>
        </button>

        {/* Terms of Service Button */}
        <button
          type="button"
          onClick={() => setTermsModalOpen(true)}
          title="利用規約・DM監査規程・プライバシーポリシー"
          className="px-2.5 sm:px-3 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden xl:inline">利用規約</span>
        </button>
      </div>

      {showPwaModal && (
        <IOSInstallGuideModal onClose={() => setShowPwaModal(false)} />
      )}
    </header>
  );
};
