import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';
import { SyncedLine } from '../types/music';
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Share2,
  ListMusic,
  Sliders,
  FileText,
  ListPlus,
  Radio,
  ExternalLink,
  Sparkles,
  X,
  Disc,
  Gauge,
  Volume2,
  Award,
  Zap,
  Clock,
  Flame,
} from 'lucide-react';

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const FullScreenPlayerModal: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    progress,
    duration,
    seekTo,
    nextTrack,
    prevTrack,
    repeatMode,
    cycleRepeat,
    isShuffle,
    toggleShuffle,
    likedTrackIds,
    toggleLikeTrack,
    fullScreenPlayerOpen,
    setFullScreenPlayerOpen,
    navigateTo,
    openAddToPlaylistModal,
    openShareModal,
    setEqModalOpen,
    setQueueOpen,
    lyricsOpen,
    setLyricsOpen,
    currentLyrics,
    startRadioForTrack,
    playbackRate,
    setPlaybackRate,
    shuffleMode,
    cycleShuffleMode,
    audioQuality,
    setAudioQuality,
    setWrappedModalOpen,
    digestMode,
    toggleDigestMode,
    digestRemainingSec,
    trackTimestamps,
    endlessRadioActive,
    toggleEndlessRadio,
    emotionRadioMood,
  } = usePlayer();

  const [menuOpen, setMenuOpen] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [inlineLyricsExpanded, setInlineLyricsExpanded] = useState(false);
  const [timestampsExpanded, setTimestampsExpanded] = useState(false);

  if (!fullScreenPlayerOpen || !currentTrack) return null;

  const isLiked = likedTrackIds.has(currentTrack.id);
  const percent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pos * duration);
  };

  // Find active line of synced lyrics
  const activeLyricIndex = currentLyrics?.syncedLyrics
    ? currentLyrics.syncedLyrics.findIndex((line: SyncedLine, i: number) => {
        const nextLine = currentLyrics.syncedLyrics![i + 1];
        if (nextLine) {
          return progress >= line.time && progress < nextLine.time;
        }
        return progress >= line.time;
      })
    : -1;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#2b0407] via-[#110103] to-[#040001] text-white overflow-y-auto flex flex-col justify-between animate-in slide-in-from-bottom duration-300">
      {/* Background radial glow in deep crimson red */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full mx-auto min-h-full flex flex-col justify-between p-6 sm:p-8">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-4 py-2">
          <button
            type="button"
            onClick={() => setFullScreenPlayerOpen(false)}
            className="p-2 -ml-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="閉じる"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              再生中のアルバム
            </span>
            <button
              type="button"
              onClick={() => {
                const targetAlbum = currentTrack.albumId || currentTrack.album || currentTrack.title;
                if (targetAlbum) {
                  navigateTo('album', targetAlbum);
                  setFullScreenPlayerOpen(false);
                }
              }}
              className="text-xs sm:text-sm font-semibold text-white truncate hover:text-red-400 hover:underline transition-colors block mx-auto max-w-full cursor-pointer"
              title="アルバムの曲一覧を表示"
            >
              {currentTrack.album || currentTrack.title}
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-2 -mr-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="メニュー"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-11 w-52 bg-[#18181e] border border-neutral-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    const targetAlbum = currentTrack.albumId || currentTrack.album || currentTrack.title;
                    if (targetAlbum) {
                      navigateTo('album', targetAlbum);
                      setFullScreenPlayerOpen(false);
                    }
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Disc className="w-4 h-4 text-red-500" />
                  <span>アルバムの曲一覧を表示</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddToPlaylistModal(currentTrack)}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ListPlus className="w-4 h-4 text-red-500" />
                  <span>プレイリストに追加</span>
                </button>
                <button
                  type="button"
                  onClick={() => startRadioForTrack(currentTrack)}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>この曲のRadioを開始</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWrappedModalOpen(true)}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Award className="w-4 h-4 text-red-500" />
                  <span>リスニング記録 (Wrapped)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextQ =
                      audioQuality === 'high'
                        ? 'normal'
                        : audioQuality === 'normal'
                        ? 'low'
                        : audioQuality === 'low'
                        ? 'auto'
                        : 'high';
                    setAudioQuality(nextQ);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-red-500" />
                  <span>
                    音質: {audioQuality === 'high' ? '最高音質 (320kbps)' : audioQuality === 'normal' ? '標準 (160kbps)' : audioQuality === 'low' ? '低音質 (節約)' : '自動'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEqModalOpen(true)}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-red-500" />
                  <span>イコライザー調整</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentTrack.artistId) {
                      navigateTo('artist', currentTrack.artistId);
                      setFullScreenPlayerOpen(false);
                    }
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                  <span>アーティストを表示</span>
                </button>
                <button
                  type="button"
                  onClick={() => openShareModal('track')}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-red-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-neutral-400" />
                  <span>楽曲を共有</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Center Artwork */}
        <div className="my-auto py-6 flex items-center justify-center">
          <div className="relative w-full aspect-square max-w-[320px] sm:max-w-[360px] md:max-w-[380px] rounded-2xl overflow-hidden shadow-2xl shadow-black/90 border border-red-950/40">
            <SafeImage
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              useBase64
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>再生中</span>
              </div>
            )}
          </div>
        </div>

        {/* Track Title, Artist & Like */}
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {currentTrack.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (currentTrack.artistId) {
                    navigateTo('artist', currentTrack.artistId);
                    setFullScreenPlayerOpen(false);
                  }
                }}
                className="text-sm sm:text-base text-neutral-400 hover:text-white font-medium truncate block mt-0.5 transition-colors cursor-pointer"
              >
                {currentTrack.artist}
              </button>
            </div>

            <button
              type="button"
              onClick={() => toggleLikeTrack(currentTrack)}
              className="p-2 -mr-2 text-neutral-400 hover:text-red-500 transition-transform active:scale-125 cursor-pointer shrink-0"
              title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
            >
              <Heart
                className={`w-7 h-7 transition-colors ${
                  isLiked ? 'text-red-500 fill-red-500' : 'text-neutral-400 hover:text-white'
                }`}
              />
            </button>
          </div>

          {/* Scrubber Timeline with YouTube Comment Heatmap Markers */}
          <div className="space-y-1.5">
            <div
              className="relative h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer group transition-all"
              onClick={handleProgressClick}
            >
              {trackTimestamps?.heatMarkers?.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(m.timeSeconds);
                  }}
                  title={`${m.timeLabel} ${m.topLabel} (${m.mentions}件の言及)`}
                  className="absolute -top-0.5 -bottom-0.5 w-2 -translate-x-1/2 rounded-full bg-red-500 z-10 cursor-pointer hover:scale-125 transition-transform"
                  style={{
                    left: `${m.percent}%`,
                    opacity: 0.45 + m.heat * 0.55,
                    boxShadow: m.heat > 0.6 ? '0 0 8px rgba(239,68,68,0.95)' : undefined,
                  }}
                />
              ))}
              <div
                className="h-full bg-red-600 rounded-full relative group-hover:bg-red-500 transition-colors z-20 pointer-events-none"
                style={{ width: `${percent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 tabular-nums">
              <span>{formatSeconds(progress)}</span>
              {trackTimestamps && trackTimestamps.heatMarkers.length > 0 && (
                <button
                  type="button"
                  onClick={() => seekTo(trackTimestamps.highlightStartSec)}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  title="一番盛り上がっているポイントへジャンプ"
                >
                  <Flame className="w-3 h-3" />
                  <span>見どころ {formatSeconds(trackTimestamps.highlightStartSec)}</span>
                </button>
              )}
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Primary Controls Row */}
          <div className="flex items-center justify-between pt-1">
            {/* Smart Shuffle */}
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={cycleShuffleMode}
                className={`p-2 transition-colors cursor-pointer relative ${
                  shuffleMode !== 'off' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                }`}
                title={
                  shuffleMode === 'smart'
                    ? '✨ スマートシャッフル: おすすめ曲を織り交ぜて再生中'
                    : shuffleMode === 'on'
                    ? 'シャッフル再生: ON'
                    : 'シャッフル再生: OFF'
                }
              >
                <Shuffle className="w-5 h-5" />
                {shuffleMode === 'smart' && (
                  <span className="absolute -top-0.5 -right-0.5 text-[10px] font-black text-red-400 animate-pulse">
                    ✨
                  </span>
                )}
              </button>
              {shuffleMode !== 'off' && <span className="w-1 h-1 rounded-full bg-red-500 -mt-1" />}
            </div>

            {/* Prev */}
            <button
              type="button"
              onClick={prevTrack}
              className="p-2 text-neutral-200 hover:text-white transition-transform active:scale-90 cursor-pointer"
              title="前の曲"
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>

            {/* Big Circular Play / Pause (White circle in Spotify style) */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl cursor-pointer"
              title={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-black" />
              ) : (
                <Play className="w-7 h-7 fill-black ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={() => nextTrack(true)}
              className="p-2 text-neutral-200 hover:text-white transition-transform active:scale-90 cursor-pointer"
              title="次の曲"
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>

            {/* Repeat */}
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={cycleRepeat}
                className={`p-2 transition-colors cursor-pointer ${
                  repeatMode !== 'off' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                }`}
                title={`リピート: ${repeatMode}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
              {repeatMode !== 'off' && <span className="w-1 h-1 rounded-full bg-red-500 -mt-1" />}
            </div>
          </div>

          {/* Bottom Action Utilities */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-neutral-400 border-t border-white/5 relative">
            {/* Speed Control Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  playbackRate !== 1.0
                    ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                    : 'bg-white/10 text-neutral-300 hover:text-white'
                }`}
                title="再生速度"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackRate}x</span>
              </button>

              {speedMenuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-2 w-32 p-1 bg-[#18181e] border border-neutral-800 rounded-xl shadow-2xl z-50 text-xs space-y-0.5 animate-in fade-in"
                  onClick={() => setSpeedMenuOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase">
                    再生速度
                  </div>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                        playbackRate === rate
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Digest 25s Mode Pill */}
            <button
              type="button"
              onClick={toggleDigestMode}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                digestMode
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/10 text-neutral-300 hover:text-white'
              }`}
              title="サビ・盛り上がり箇所を25秒連続再生"
            >
              <Zap className={`w-3.5 h-3.5 ${digestMode ? 'fill-white' : ''}`} />
              <span>{digestMode ? `ダイジェスト ${digestRemainingSec}s` : 'ダイジェスト'}</span>
            </button>

            {/* Emotion Radio Pill */}
            <button
              type="button"
              onClick={toggleEndlessRadio}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                endlessRadioActive
                  ? 'bg-red-950/80 text-red-300 border border-red-700/50'
                  : 'bg-white/10 text-neutral-400 hover:text-white'
              }`}
              title="YouTubeコメント感情に合う曲を自動補充"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="max-w-[78px] truncate">
                {endlessRadioActive && emotionRadioMood ? emotionRadioMood.name : '感情ラジオ'}
              </span>
            </button>

            {/* Timestamps / Chapters Pill */}
            <button
              type="button"
              onClick={() => {
                setTimestampsExpanded((prev) => !prev);
                setInlineLyricsExpanded(false);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                timestampsExpanded
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/10 text-neutral-300 hover:text-white'
              }`}
              title="見どころ・タイムスタンプ"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                見どころ{trackTimestamps?.timestamps?.length ? ` (${trackTimestamps.timestamps.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInlineLyricsExpanded((prev) => !prev);
                setTimestampsExpanded(false);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                inlineLyricsExpanded
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>歌詞</span>
            </button>

            <button
              type="button"
              onClick={() => openShareModal('track')}
              className="p-1.5 hover:text-white transition-colors cursor-pointer"
              title="共有"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="p-1.5 hover:text-white transition-colors cursor-pointer"
              title="再生キュー"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Timestamps / Setlist Jump Sheet */}
        {timestampsExpanded && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-b from-red-950/60 to-black/90 border border-red-500/20 shadow-2xl space-y-3 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>曲中の見どころ・タイムスタンプ</span>
              </span>
              <button
                type="button"
                onClick={() => setTimestampsExpanded(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {trackTimestamps && trackTimestamps.timestamps.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {trackTimestamps.timestamps.map((item, idx) => (
                  <button
                    key={`${item.timeSeconds}-${idx}`}
                    type="button"
                    onClick={() => seekTo(item.timeSeconds)}
                    className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-black/50 hover:bg-red-950/50 border border-white/5 hover:border-red-600/40 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-red-600/25 border border-red-500/40 text-red-400 font-mono text-xs font-bold shrink-0">
                        {item.timeLabel}
                      </span>
                      <span className="text-xs text-neutral-100 font-medium truncate">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0">
                      {item.source === 'description' ? '概要欄' : `👍 ${item.likes || '0'}`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-4 text-center">
                タイムスタンプ付きコメント・概要欄チャプターは見つかりませんでした
              </p>
            )}
          </div>
        )}

        {/* Inline Lyrics Preview Card (Spotify-style expandable lyrics sheet) */}
        {inlineLyricsExpanded && (
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-b from-red-950/70 to-black/90 border border-red-500/20 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>歌詞</span>
              </span>
              <button
                type="button"
                onClick={() => setInlineLyricsExpanded(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentLyrics?.syncedLyrics && currentLyrics.syncedLyrics.length > 0 ? (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
                {currentLyrics.syncedLyrics.map((line: SyncedLine, idx: number) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <p
                      key={idx}
                      onClick={() => seekTo(line.time)}
                      className={`text-sm sm:text-base font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'text-white text-lg scale-102 font-black drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            ) : currentLyrics?.lyrics ? (
              <div className="max-h-56 overflow-y-auto pr-2 text-xs sm:text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {currentLyrics.lyrics}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-4 text-center">
                歌詞情報を読み込み中、または未登録です
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
