import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  FileText,
  Tv,
  Music,
  ShieldCheck,
  Sun,
  HelpCircle,
  Radio,
  Sliders,
  Sparkles,
} from 'lucide-react';

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    progress,
    duration,
    seekTo,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    repeatMode,
    cycleRepeat,
    isShuffle,
    toggleShuffle,
    playerMode,
    setPlayerMode,
    lyricsOpen,
    setLyricsOpen,
    queueOpen,
    setQueueOpen,
    likedTrackIds,
    toggleLikeTrack,
    navigateTo,
    queue,
    backgroundPlaybackEnabled,
    toggleBackgroundPlayback,
    wakeLockActive,
    toggleWakeLock,
    setBgGuideOpen,
    crossfadeDuration,
    setCrossfadeDuration,
    endlessRadioActive,
    toggleEndlessRadio,
    startRadioForTrack,
  } = usePlayer();

  const [crossfadeMenuOpen, setCrossfadeMenuOpen] = useState(false);

  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverPositionSec, setHoverPositionSec] = useState(0);

  if (!currentTrack) {
    return null;
  }

  const isLiked = likedTrackIds.has(currentTrack.id);
  const percent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pos * duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPositionSec(pos * duration);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f]/98 backdrop-blur-xl border-t border-neutral-800/80 px-4 md:px-6 py-2.5 shadow-2xl">
      {/* Mini top progress indicator bar for high-precision scrub */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-neutral-800 cursor-pointer group"
        onClick={handleProgressClick}
        onMouseMove={handleProgressMouseMove}
        onMouseEnter={() => setIsHoveringProgress(true)}
        onMouseLeave={() => setIsHoveringProgress(false)}
      >
        <div
          className="h-full bg-red-600 transition-all duration-100 relative group-hover:bg-red-500"
          style={{ width: `${percent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
        </div>
        {isHoveringProgress && duration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-white font-mono pointer-events-none"
            style={{ left: `${(hoverPositionSec / duration) * 100}%` }}
          >
            {formatSeconds(hoverPositionSec)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Left Section: Track Info */}
        <div className="flex items-center gap-3.5 min-w-0 w-1/4 sm:w-1/3">
          <div className="relative group shrink-0">
            <SafeImage
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              useBase64
              className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover bg-neutral-800 shadow"
            />
            {/* Visualizer dot */}
            {isPlaying && (
              <span className="absolute bottom-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 pr-2">
            <h4
              className="text-sm font-semibold text-white truncate hover:underline cursor-pointer"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
              <button
                type="button"
                onClick={() => {
                  if (currentTrack.artistId) {
                    navigateTo('artist', currentTrack.artistId);
                  }
                }}
                className="hover:text-white truncate hover:underline"
              >
                {currentTrack.artist || 'Unknown Artist'}
              </button>
              {currentTrack.album && (
                <>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="truncate hidden sm:inline text-neutral-500">{currentTrack.album}</span>
                </>
              )}
            </div>
          </div>

          {/* Like button */}
          <button
            type="button"
            onClick={() => toggleLikeTrack(currentTrack)}
            title={isLiked ? 'お気に入りから削除' : 'お気に入りに追加'}
            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors shrink-0"
          >
            <Heart
              className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>

          {/* Quick Radio station trigger button */}
          <button
            type="button"
            onClick={() => startRadioForTrack(currentTrack)}
            title="この曲からエンドレス・ラジオを開始（類似曲を自動補充）"
            className="p-1.5 text-neutral-400 hover:text-purple-400 transition-colors shrink-0 hidden md:block"
          >
            <Sparkles className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>
        </div>

        {/* Center Section: Playback Controls & Timeline */}
        <div className="flex flex-col items-center justify-center gap-1 max-w-xl w-1/2">
          {/* Action buttons */}
          <div className="flex items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={toggleShuffle}
              title={isShuffle ? 'シャッフル解除' : 'シャッフル再生'}
              className={`p-1.5 transition-colors ${
                isShuffle ? 'text-red-500' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={prevTrack}
              title="前の曲"
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? '一時停止' : '再生'}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => nextTrack(true)}
              title="次の曲"
              className="p-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              title={`リピート: ${repeatMode}`}
              className={`p-1.5 transition-colors ${
                repeatMode !== 'off' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Time & Slider */}
          <div className="w-full hidden sm:flex items-center gap-2.5 text-xs font-mono text-neutral-400">
            <span className="w-10 text-right tabular-nums">{formatSeconds(progress)}</span>
            <div
              className="relative flex-1 h-1.5 bg-neutral-800 rounded-full cursor-pointer overflow-hidden group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-neutral-300 group-hover:bg-red-500 transition-colors rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-10 text-left tabular-nums">{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Right Section: Extras, Mode Toggle, Volume */}
        <div className="flex items-center justify-end gap-2 md:gap-3 w-1/4 sm:w-1/3">
          {/* Background Playback Toggle & Guide */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleBackgroundPlayback}
              title={
                backgroundPlaybackEnabled
                  ? 'バックグラウンド再生: 有効 (画面オフ・他アプリ・別タブでも停止しません)'
                  : 'バックグラウンド再生: 無効 (クリックして有効化)'
              }
              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                backgroundPlaybackEnabled
                  ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  backgroundPlaybackEnabled ? 'text-emerald-400' : 'text-neutral-500'
                }`}
              />
              <span className="hidden xl:inline text-[11px] font-medium">BG再生</span>
              {backgroundPlaybackEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setBgGuideOpen(true)}
              className="p-1 text-neutral-500 hover:text-white text-xs rounded hover:bg-neutral-800 transition-colors"
              title="バックグラウンド再生の使い方（スマホのロック画面再生方法など）"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Endless Radio Mode Toggle */}
          <button
            type="button"
            onClick={toggleEndlessRadio}
            title={
              endlessRadioActive
                ? 'エンドレス・ラジオ: ON (キューの残りが少なくなると類似曲を自動補充し無限再生)'
                : 'エンドレス・ラジオ: OFF (クリックして有効化)'
            }
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
              endlessRadioActive
                ? 'bg-purple-950/70 border border-purple-800/60 text-purple-300'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${endlessRadioActive ? 'text-purple-400' : 'text-neutral-500'}`}
            />
            <span className="hidden xl:inline text-[11px] font-medium">ラジオ</span>
            {endlessRadioActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          {/* Crossfade Selector Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCrossfadeMenuOpen((prev) => !prev)}
              title={`曲間のクロスフェード: ${
                crossfadeDuration > 0 ? `${crossfadeDuration}秒 (シームレスDJ再生)` : 'オフ'
              }`}
              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                crossfadeDuration > 0
                  ? 'bg-amber-950/60 border border-amber-800/50 text-amber-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders
                className={`w-3.5 h-3.5 ${
                  crossfadeDuration > 0 ? 'text-amber-400' : 'text-neutral-500'
                }`}
              />
              <span className="hidden xl:inline text-[11px] font-medium">
                {crossfadeDuration > 0 ? `${crossfadeDuration}s` : 'フェード切'}
              </span>
            </button>

            {crossfadeMenuOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 w-48 p-2 rounded-xl bg-[#14141a] border border-white/10 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 border-b border-white/5 pb-1 mb-1">
                  曲間のクロスフェード設定
                </div>
                {[0, 2, 4, 6, 8].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setCrossfadeDuration(sec);
                      setCrossfadeMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      crossfadeDuration === sec
                        ? 'bg-red-600 text-white font-medium'
                        : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{sec === 0 ? 'オフ（通常再生）' : `${sec} 秒フェード`}</span>
                    {crossfadeDuration === sec && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
                <div className="text-[10px] text-neutral-500 px-2 pt-1 border-t border-white/5">
                  ※曲の終わりで音量を絞り、隙間なく次へ繋ぎます
                </div>
              </div>
            )}
          </div>

          {/* Screen Wake Lock Toggle */}
          <button
            type="button"
            onClick={toggleWakeLock}
            title={wakeLockActive ? '画面常時点灯: ON' : '画面常時点灯: OFF (スリープ防止)'}
            className={`hidden 2xl:flex p-1.5 rounded-md text-xs items-center gap-1 transition-colors ${
              wakeLockActive
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {/* Song / Video mode switch */}
          <div className="hidden lg:flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPlayerMode('cover')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                playerMode === 'cover'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="カバーアート / オーディオモード"
            >
              <Music className="w-3.5 h-3.5" />
              <span>曲</span>
            </button>
            <button
              type="button"
              onClick={() => setPlayerMode('video')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                playerMode === 'video'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="YouTube ミュージックビデオモード (ピクチャーインピクチャー)"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>動画</span>
            </button>
          </div>

          {/* Lyrics Drawer Toggle */}
          <button
            type="button"
            onClick={() => setLyricsOpen((prev) => !prev)}
            title="歌詞を表示 (InnerTube)"
            className={`p-2 rounded-lg transition-colors ${
              lyricsOpen ? 'bg-red-600/20 text-red-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Queue Drawer Toggle */}
          <button
            type="button"
            onClick={() => setQueueOpen((prev) => !prev)}
            title="キュー / 次の曲"
            className={`relative p-2 rounded-lg transition-colors ${
              queueOpen ? 'bg-red-600/20 text-red-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4 md:w-5 md:h-5" />
            {queue.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'ミュート解除' : 'ミュート'}
              className="text-neutral-400 hover:text-white p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 lg:w-20 accent-red-600 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
