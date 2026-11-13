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
  ListPlus,
  Share2,
  AppWindow,
  MessageSquare,
  Maximize2,
  Gauge,
  Zap,
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
    shuffleMode,
    cycleShuffleMode,
    playbackRate,
    setPlaybackRate,
    playerMode,
    setPlayerMode,
    setVideoLayout,
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
    emotionRadioMood,
    startRadioForTrack,
    digestMode,
    toggleDigestMode,
    digestRemainingSec,
    trackTimestamps,
    openAddToPlaylistModal,
    eqModalOpen,
    setEqModalOpen,
    openShareModal,
    floatingPlayerVisible,
    setFloatingPlayerVisible,
    setFloatingPlayerCollapsed,
    commentsModalOpen,
    setCommentsModalOpen,
    danmakuEnabled,
    setDanmakuEnabled,
    setStoryModalOpen,
    fullScreenPlayerOpen,
    setFullScreenPlayerOpen,
  } = usePlayer();

  const [crossfadeMenuOpen, setCrossfadeMenuOpen] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

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
    <>
      {/* MOBILE MINI-PLAYER (Floating pill matching Image 1, docked above BottomTabBar) */}
      <div
        onClick={() => setFullScreenPlayerOpen(true)}
        className="sm:hidden fixed bottom-[68px] left-2 right-2 z-40 bg-[#14080a]/95 backdrop-blur-xl border border-red-950/50 rounded-xl p-2 shadow-2xl flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <SafeImage
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              useBase64
              className="w-10 h-10 rounded-lg object-cover bg-neutral-800 shadow"
            />
            {isPlaying && (
              <span className="absolute bottom-0.5 right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Mobile right quick actions (Heart + Play/Pause) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleLikeTrack(currentTrack);
            }}
            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
            title={isLiked ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Heart
              className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-1.5 text-white hover:text-red-400 transition-colors"
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Thin bottom progress line along bottom of mobile card */}
        <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-neutral-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 rounded-full transition-all duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* DESKTOP PLAYER BAR (Full controls bar across bottom on tablet / desktop) */}
      <footer className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0c]/98 backdrop-blur-xl border-t border-red-950/40 px-4 md:px-6 py-2.5 shadow-2xl">
        {/* Mini top progress indicator bar for high-precision scrub */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-neutral-800 cursor-pointer group"
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseEnter={() => setIsHoveringProgress(true)}
          onMouseLeave={() => setIsHoveringProgress(false)}
        >
          {/* Heatmap red markers from YouTube comments/chapters */}
          {trackTimestamps?.heatMarkers?.map((m, idx) => (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-1 bg-red-500 rounded-full pointer-events-none z-10"
              style={{
                left: `${m.percent}%`,
                opacity: 0.35 + m.heat * 0.65,
                boxShadow: m.heat > 0.65 ? '0 0 6px rgba(239,68,68,0.9)' : undefined,
              }}
            />
          ))}
          <div
            className="h-full bg-red-600 transition-all duration-100 relative group-hover:bg-red-500 z-20"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
          {isHoveringProgress && duration > 0 && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-white font-mono pointer-events-none whitespace-nowrap z-30"
              style={{ left: `${(hoverPositionSec / duration) * 100}%` }}
            >
              {formatSeconds(hoverPositionSec)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Track Info (Clicking opens FullScreenPlayer) */}
          <div className="flex items-center gap-3.5 min-w-0 w-1/4 sm:w-1/3">
            <div
              className="relative group shrink-0 cursor-pointer"
              onClick={() => setFullScreenPlayerOpen(true)}
              title="フルスクリーン表示"
            >
              <SafeImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                useBase64
                className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover bg-neutral-800 shadow group-hover:opacity-90 transition-opacity"
              />
              {isPlaying && (
                <span className="absolute bottom-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                </span>
              )}
            </div>

            <div className="flex flex-col min-w-0 pr-2">
              <h4
                className="text-sm font-semibold text-white truncate hover:text-red-400 cursor-pointer transition-colors"
                title={currentTrack.title}
                onClick={() => setFullScreenPlayerOpen(true)}
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
                  <button
                    type="button"
                    onClick={() => {
                      const albumTarget = currentTrack.albumId || currentTrack.album;
                      if (albumTarget) {
                        navigateTo('album', albumTarget);
                      }
                    }}
                    className="truncate hidden sm:inline text-neutral-500 hover:text-white hover:underline cursor-pointer"
                    title="アルバムの曲一覧を表示"
                  >
                    {currentTrack.album}
                  </button>
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

          {/* Add to Playlist button */}
          <button
            type="button"
            onClick={() => openAddToPlaylistModal(currentTrack)}
            title="プレイリストに追加"
            className="p-1.5 text-neutral-400 hover:text-white transition-colors shrink-0"
          >
            <ListPlus className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Quick Radio station trigger button */}
          <button
            type="button"
            onClick={() => startRadioForTrack(currentTrack)}
            title="この曲からエンドレス・ラジオを開始（類似曲を自動補充）"
            className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors shrink-0 hidden md:block"
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
              onClick={cycleShuffleMode}
              title={
                shuffleMode === 'smart'
                  ? 'スマートシャッフル: ON (類似おすすめ曲を自動注入)'
                  : shuffleMode === 'on'
                  ? '通常シャッフル: ON'
                  : 'シャッフル: OFF'
              }
              className={`relative p-1.5 transition-colors cursor-pointer ${
                shuffleMode !== 'off' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              {shuffleMode === 'smart' && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold text-red-400 animate-pulse select-none">
                  ✨
                </span>
              )}
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
              {trackTimestamps?.heatMarkers?.map((m, idx) => (
                <span
                  key={idx}
                  title={`${m.timeLabel} ${m.topLabel}`}
                  className="absolute top-0 bottom-0 w-1.5 -translate-x-1/2 bg-red-500 rounded-full z-10 pointer-events-none"
                  style={{ left: `${m.percent}%`, opacity: 0.4 + m.heat * 0.6 }}
                />
              ))}
              <div
                className="h-full bg-neutral-300 group-hover:bg-red-500 transition-colors rounded-full relative z-20"
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
                  ? 'バックグラウンド再生: 有効'
                  : 'バックグラウンド再生: 無効'
              }
              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                backgroundPlaybackEnabled
                  ? 'bg-red-950/70 border border-red-800/60 text-red-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  backgroundPlaybackEnabled ? 'text-red-400' : 'text-neutral-500'
                }`}
              />
              <span className="hidden xl:inline text-[11px] font-medium">BG再生</span>
              {backgroundPlaybackEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setBgGuideOpen(true)}
              className="p-1 text-neutral-500 hover:text-white text-xs rounded hover:bg-neutral-800 transition-colors"
              title="バックグラウンド再生の使い方"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Digest 25s Highlight Mode Toggle */}
          <button
            type="button"
            onClick={toggleDigestMode}
            title="ダイジェスト再生（サビ・盛り上がり箇所を25秒ずつ連続再生）"
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              digestMode
                ? 'bg-red-600 text-white border border-red-400 shadow-sm shadow-red-900/40'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${digestMode ? 'text-white fill-white' : 'text-neutral-500'}`} />
            <span className="hidden xl:inline text-[11px] font-bold">
              {digestMode ? `${digestRemainingSec}s` : 'ダイジェスト'}
            </span>
          </button>

          {/* Endless Emotion Radio Mode Toggle */}
          <button
            type="button"
            onClick={toggleEndlessRadio}
            title={
              endlessRadioActive
                ? `感情ラジオ ON${emotionRadioMood ? ` (${emotionRadioMood.name})` : ''}`
                : '感情ラジオ OFF'
            }
            className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              endlessRadioActive
                ? 'bg-red-950/70 border border-red-800/60 text-red-300'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${endlessRadioActive ? 'text-red-400' : 'text-neutral-500'}`}
            />
            <span className="hidden xl:inline text-[11px] font-medium max-w-[84px] truncate">
              {endlessRadioActive && emotionRadioMood ? emotionRadioMood.name : '感情ラジオ'}
            </span>
            {endlessRadioActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
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
                  ? 'bg-red-950/60 border border-red-800/50 text-red-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders
                className={`w-3.5 h-3.5 ${
                  crossfadeDuration > 0 ? 'text-red-400' : 'text-neutral-500'
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



          {/* Spotify Playback Speed Selector */}
          <div className="relative hidden xl:block">
            <button
              type="button"
              onClick={() => setSpeedMenuOpen((prev) => !prev)}
              title={`再生速度: ${playbackRate}x`}
              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer ${
                playbackRate !== 1
                  ? 'bg-red-950/70 border border-red-700/60 text-red-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px] font-bold">{playbackRate}x</span>
            </button>
            {speedMenuOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 w-32 p-1.5 rounded-xl bg-[#14141a] border border-white/10 shadow-2xl z-50 text-xs space-y-0.5 animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 border-b border-white/5 pb-1 mb-1">
                  再生速度
                </div>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      setSpeedMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-red-600 text-white font-bold'
                        : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
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
                ? 'bg-red-950/60 text-red-300 border border-red-800/50'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {/* Song / MV Video mode switch */}
          <div className="hidden sm:flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPlayerMode('cover')}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                playerMode === 'cover'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="カバーアート / 音声モード"
            >
              <Music className="w-3.5 h-3.5" />
              <span>曲</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlayerMode('video');
                setVideoLayout('theater');
              }}
              className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                playerMode === 'video'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm ring-1 ring-red-400'
                  : 'text-neutral-400 hover:text-red-400'
              }`}
              title="YouTube ミュージックビデオ（MV）モード"
            >
              <Tv className="w-3.5 h-3.5 text-red-400" />
              <span>MV</span>
            </button>
          </div>

          {/* Lyrics Drawer Toggle */}
          <button
            type="button"
            onClick={() => setLyricsOpen((prev) => !prev)}
            title="歌詞を表示"
            className={`p-2 rounded-lg transition-colors ${
              lyricsOpen ? 'bg-red-600/20 text-red-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Timestamped Comments & Danmaku Toggle */}
          <button
            type="button"
            onClick={() => setCommentsModalOpen(true)}
            title="タイムスタンプ付き弾幕コメントを開く (SoundCloud / ニコニコ風)"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              commentsModalOpen ? 'bg-red-600/20 text-red-500' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
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

          {/* Equalizer & Heavy Bass Boost Button */}
          <button
            type="button"
            onClick={() => setEqModalOpen((prev) => !prev)}
            title="10バンド・オーディオイコライザー & 重低音ブースト"
            className={`p-2 rounded-lg transition-colors ${
              eqModalOpen
                ? 'bg-red-600/20 text-red-400'
                : 'text-neutral-400 hover:text-red-400'
            }`}
          >
            <Sliders className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Share Track / Playlist Button */}
          <button
            type="button"
            onClick={() => openShareModal('track')}
            title="ワンクリックで友達にシェア (URL発行)"
            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
          >
            <Share2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Instagram Story Card Generator Button */}
          <button
            type="button"
            onClick={() => setStoryModalOpen(true)}
            title="Instagramストーリーズ風 楽曲シェア画像を生成"
            className="p-2 rounded-lg text-neutral-400 hover:text-pink-400 transition-colors"
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Mini Floating Player Toggle */}
          <button
            type="button"
            onClick={() => {
              setFloatingPlayerVisible((prev) => !prev);
              setFloatingPlayerCollapsed(false);
            }}
            title={
              floatingPlayerVisible
                ? '画面隅のミニプレイヤーを隠す'
                : '画面隅のミニフローティングプレイヤーを表示'
            }
            className={`hidden sm:flex p-2 rounded-lg transition-colors ${
              floatingPlayerVisible
                ? 'text-red-500'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <AppWindow className="w-4 h-4 md:w-5 md:h-5" />
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

          {/* Full Screen Player Maximize Button */}
          <button
            type="button"
            onClick={() => setFullScreenPlayerOpen(true)}
            title="フルスクリーン再生画面を開く"
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </footer>
    </>
  );
};
