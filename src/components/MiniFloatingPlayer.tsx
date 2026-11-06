import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  FileText,
  Sliders,
  Share2,
  X,
  Minimize2,
  Maximize2,
  Music,
  Radio,
  ChevronDown,
  MessageSquare,
  Tv,
} from 'lucide-react';

export const MiniFloatingPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    prevTrack,
    nextTrack,
    progress,
    duration,
    seekTo,
    likedTrackIds,
    toggleLikeTrack,
    activeSyncedLyricText,
    currentLyrics,
    setLyricsOpen,
    setEqModalOpen,
    openShareModal,
    setCommentsModalOpen,
    floatingPlayerVisible,
    setFloatingPlayerVisible,
    floatingPlayerCollapsed,
    setFloatingPlayerCollapsed,
    lyricsOpen,
    playerMode,
    setPlayerMode,
    setVideoLayout,
  } = usePlayer();

  const [isHovered, setIsHovered] = useState(false);

  // If there's no track or user dismissed floating player or lyrics drawer is fully open in immersive mode, don't show
  if (!currentTrack || !floatingPlayerVisible || lyricsOpen) {
    return null;
  }

  const isLiked = likedTrackIds.has(currentTrack.id);
  const percent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pos * duration);
  };

  // Compact Pill Badge View
  if (floatingPlayerCollapsed) {
    return (
      <div
        className="fixed bottom-24 right-4 sm:right-6 z-40 bg-[#14151c]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 group cursor-pointer hover:border-red-500/40 transition-all max-w-[280px] sm:max-w-xs"
        onClick={() => setFloatingPlayerCollapsed(false)}
        title="クリックしてミニプレイヤーを展開"
      >
        <div className="relative shrink-0">
          <SafeImage
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            useBase64
            className="w-7 h-7 rounded-full object-cover bg-neutral-800"
          />
          {isPlaying && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-white truncate">
            {activeSyncedLyricText ? (
              <span className="text-red-400 font-medium">♪ {activeSyncedLyricText}</span>
            ) : (
              currentTrack.title
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="p-1 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors shrink-0"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFloatingPlayerCollapsed(false);
          }}
          className="p-1 text-neutral-400 hover:text-white transition-colors shrink-0"
          title="展開"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Full Floating Mini Card View
  return (
    <div
      className="fixed bottom-24 right-4 sm:right-6 z-40 w-[310px] sm:w-[350px] bg-[#12131a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-all duration-200 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[10px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold tracking-wider uppercase text-neutral-300">
            Mini Player & Live Lyrics
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFloatingPlayerCollapsed(true)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="コンパクトに最小化"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setFloatingPlayerVisible(false)}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="閉じる (プレイヤーバーから再度表示可能)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Track Info Row */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0 group">
          <SafeImage
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            useBase64
            className="w-12 h-12 rounded-xl object-cover bg-neutral-800 shadow"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center gap-0.5">
              <span className="w-1 h-3 bg-red-500 animate-pulse" />
              <span
                className="w-1 h-4 bg-red-400 animate-pulse"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-2 bg-red-500 animate-pulse"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pr-1">
          <h4 className="text-xs font-bold text-white truncate hover:text-red-400 transition-colors" title={currentTrack.title}>
            {currentTrack.title}
          </h4>
          <p className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</p>
        </div>

        <button
          type="button"
          onClick={() => toggleLikeTrack(currentTrack)}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-white'
          }`}
          title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Live Synced Lyric Box */}
      <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-neutral-900/90 to-[#181924]/90 border border-white/5 relative overflow-hidden group">
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            <Music className={`w-3.5 h-3.5 ${activeSyncedLyricText ? 'text-red-400 animate-pulse' : 'text-neutral-500'}`} />
          </div>
          <div className="min-w-0 flex-1">
            {activeSyncedLyricText ? (
              <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2 drop-shadow-sm transition-all animate-in fade-in">
                {activeSyncedLyricText}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 italic flex items-center gap-1.5">
                <Music className="w-3 h-3 text-neutral-600" />
                <span>
                  {currentLyrics?.isSynced
                    ? '♪ 前奏 / 間奏中 ♪'
                    : currentLyrics?.available
                    ? '♪ 演奏中 ♪'
                    : '歌詞を検索中...'}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Click to expand full lyrics */}
        <button
          type="button"
          onClick={() => setLyricsOpen(true)}
          className="absolute right-2 top-2 text-[10px] text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800/80 px-1.5 py-0.5 rounded flex items-center gap-1"
        >
          <span>全画面歌詞</span>
        </button>
      </div>

      {/* Mini Progress Bar */}
      <div
        className="mt-2.5 h-1.5 bg-neutral-800 rounded-full cursor-pointer relative overflow-hidden group"
        onClick={handleScrub}
      >
        <div
          className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Controls & Quick Action Buttons */}
      <div className="mt-2.5 flex items-center justify-between pt-1">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevTrack}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="前の曲"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30 transition-transform active:scale-95"
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => nextTrack(true)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="次の曲"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feature Action Buttons: MV, EQ, Comments, Share, Lyrics */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setPlayerMode('video');
              setVideoLayout('theater');
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              playerMode === 'video'
                ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400'
                : 'text-neutral-400 hover:text-red-400 hover:bg-white/5'
            }`}
            title="YouTube ミュージックビデオ（MV）を見る"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEqModalOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
            title="イコライザー & 重低音ブースト"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCommentsModalOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
            title="タイムスタンプ付き弾幕コメントを開く"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openShareModal('track')}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-white/5 transition-colors"
            title="曲を共有 (ワンクリックURL)"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setLyricsOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="フル歌詞ドロワーを開く"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
