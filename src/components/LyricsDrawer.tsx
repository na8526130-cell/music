import React, { useEffect, useState, useRef, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { LyricsData, SyncedLine } from '../types/music';
import { SafeImage } from './SafeImage';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Maximize2,
  Minimize2,
  Radio,
  AlignLeft,
  ChevronDown,
  Search,
  Sliders,
  RotateCcw,
  Mic2,
} from 'lucide-react';

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const LyricsDrawer: React.FC = () => {
  const { currentTrack, lyricsOpen, setLyricsOpen, progress, duration, seekTo } =
    usePlayer();

  const [data, setData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('large');
  const [isImmersive, setIsImmersive] = useState(false);
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');
  const [userScrolled, setUserScrolled] = useState(false);

  // Timing offset in seconds (+: lyrics display earlier, -: lyrics display later)
  const [timingOffset, setTimingOffset] = useState<number>(0);
  const [showOffsetControls, setShowOffsetControls] = useState(false);

  // Manual lyrics search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<any>(null);
  const activeLineElementRef = useRef<HTMLDivElement | null>(null);

  // Reset offset and fetch lyrics on track change
  useEffect(() => {
    if (!lyricsOpen || !currentTrack) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setUserScrolled(false);
    setTimingOffset(0);
    setSearchOpen(false);

    api
      .getLyrics(
        currentTrack.id,
        currentTrack.title,
        currentTrack.artist,
        currentTrack.durationSeconds || duration
      )
      .then((res) => {
        if (!cancelled) {
          let processed = res;
          // If syncedLyrics is empty but plain lyrics exist, synthesize on client as guaranteed fallback
          if ((!processed.syncedLyrics || processed.syncedLyrics.length === 0) && processed.lyrics) {
            const rawLines = processed.lyrics
              .split('\n')
              .map((l: string) => l.trim())
              .filter(Boolean);
            if (rawLines.length > 0) {
              const dur = currentTrack.durationSeconds || duration || 210;
              const intro = Math.min(16, Math.max(5, dur * 0.06));
              const singing = Math.max(20, dur - intro - 10);
              const totalW = rawLines.reduce((s: number, l: string) => s + Math.max(3, l.length), 0);
              let cur = intro;
              const syn = rawLines.map((l: string) => {
                const item = { time: Math.round(cur * 10) / 10, text: l };
                cur += (Math.max(3, l.length) / totalW) * singing;
                return item;
              });
              processed = { ...processed, syncedLyrics: syn, isSynced: true };
            }
          }
          setData(processed);
          setViewMode('synced');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData({ available: false, isSynced: false, lyrics: '', error: err.message });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lyricsOpen, currentTrack?.id]);

  // Determine active singing line with timing offset applied
  const effectiveProgress = progress + timingOffset;

  const activeLineIndex = useMemo(() => {
    if (!data?.syncedLyrics || data.syncedLyrics.length === 0) return -1;
    const lines = data.syncedLyrics;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (effectiveProgress >= lines[i].time - 0.2) {
        return i;
      }
    }
    return -1;
  }, [data?.syncedLyrics, effectiveProgress]);

  // Smooth auto-scroll to center the active singing line
  useEffect(() => {
    if (userScrolled || viewMode !== 'synced') return;

    if (activeLineElementRef.current && containerRef.current) {
      activeLineElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, userScrolled, viewMode]);

  // Detect user manual scroll to prevent fighting the user
  const handleScroll = () => {
    setUserScrolled(true);
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserScrolled(false);
    }, 4500);
  };

  const handleResumeAutoScroll = () => {
    setUserScrolled(false);
    if (activeLineElementRef.current) {
      activeLineElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  if (!lyricsOpen) return null;

  const handleCopy = () => {
    const textToCopy =
      data?.syncedLyrics && data.syncedLyrics.length > 0
        ? data.syncedLyrics.map((l) => l.text).join('\n')
        : data?.lyrics;

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLineClick = (line: SyncedLine) => {
    seekTo(Math.max(0, line.time - timingOffset));
    setUserScrolled(false);
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await api.searchLyrics(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleApplySearchResult = (item: any) => {
    setData({
      available: true,
      isSynced: item.isSynced,
      syncedLyrics: item.syncedLyrics || [],
      lyrics: item.plainLyrics || (item.syncedLyrics ? item.syncedLyrics.map((l: any) => l.text).join('\n') : ''),
      source: `手動検索: ${item.trackName} - ${item.artistName}`,
    });
    setViewMode(item.isSynced ? 'synced' : 'plain');
    setSearchOpen(false);
    setUserScrolled(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 bg-[#0a0a0d]/98 border-l border-neutral-800 shadow-2xl flex flex-col backdrop-blur-3xl transition-all duration-300 ${
        isImmersive
          ? 'w-full md:w-[720px] lg:w-[860px]'
          : 'w-full sm:w-[460px] md:w-[500px]'
      }`}
      aria-label="同期歌詞パネル"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-[#101014]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span>リアルタイム同期歌詞</span>
            {data?.isSynced && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-[10px] font-mono text-red-400">
                <Radio className="w-2.5 h-2.5 animate-pulse text-red-500" />
                <span>SYNC</span>
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Search Toggle */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen((prev) => !prev);
              if (!searchQuery && currentTrack) {
                setSearchQuery(`${currentTrack.title} ${currentTrack.artist || ''}`.trim());
              }
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              searchOpen ? 'bg-red-600/30 text-red-400' : 'text-neutral-400 hover:text-white'
            }`}
            title="歌詞が違う場合に曲名で再検索"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Timing Offset Toggle */}
          {data?.isSynced && (
            <button
              type="button"
              onClick={() => setShowOffsetControls((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1 ${
                timingOffset !== 0
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                  : showOffsetControls
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="歌詞のタイミング微調整（ズレ補正）"
            >
              <Sliders className="w-4 h-4" />
              {timingOffset !== 0 && <span>{timingOffset > 0 ? `+${timingOffset}s` : `${timingOffset}s`}</span>}
            </button>
          )}

          {/* Mode Switcher: Synced / Full text */}
          {data?.syncedLyrics && data.syncedLyrics.length > 0 && (
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('synced')}
                className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                  viewMode === 'synced'
                    ? 'bg-neutral-800 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="リアルタイム同期（カラオケ）表示"
              >
                <Radio className="w-3 h-3 text-red-500" />
                <span>同期</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('plain')}
                className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
                  viewMode === 'plain'
                    ? 'bg-neutral-800 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="全文テキスト表示"
              >
                <AlignLeft className="w-3 h-3" />
                <span>全文</span>
              </button>
            </div>
          )}

          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() => setFontSize((f) => (f === 'normal' ? 'large' : 'normal'))}
            className="px-2 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg font-mono transition-colors"
            title="文字サイズ変更"
          >
            {fontSize === 'normal' ? 'A+' : 'A-'}
          </button>

          {/* Immersive / Full-width toggle */}
          <button
            type="button"
            onClick={() => setIsImmersive((prev) => !prev)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors hidden sm:inline-flex"
            title={isImmersive ? '通常表示に戻す' : '歌詞をワイド表示'}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Copy Button */}
          {(data?.lyrics || data?.syncedLyrics) && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="歌詞をコピー"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setLyricsOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Search Dropdown panel */}
      {searchOpen && (
        <div className="p-4 bg-[#14141a] border-b border-neutral-800 space-y-3 animate-in fade-in">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="曲名やアーティスト名で歌詞を検索..."
              className="flex-1 bg-neutral-900 border border-neutral-700 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>検索</span>
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800/60 border border-neutral-800 rounded-lg bg-neutral-900/50">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleApplySearchResult(item)}
                  className="p-2.5 hover:bg-neutral-800/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{item.trackName}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{item.artistName} • {item.albumName || 'Single'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.isSynced ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-600/30 text-red-300 font-mono">同期可</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 font-mono">テキスト</span>
                    )}
                    <button className="px-2 py-1 bg-white text-black text-[11px] font-bold rounded">適用</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timing Offset Adjuster Bar */}
      {showOffsetControls && data?.isSynced && (
        <div className="px-6 py-2 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>タイミングズレ調整:</span>
            <span className="font-mono font-bold text-amber-400">
              {timingOffset > 0 ? `+${timingOffset.toFixed(1)}s` : `${timingOffset.toFixed(1)}s`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTimingOffset((prev) => Math.round((prev - 0.5) * 10) / 10)}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px] font-mono"
              title="歌詞を0.5秒遅らせる"
            >
              -0.5s
            </button>
            <button
              onClick={() => setTimingOffset(0)}
              className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded"
              title="リセット (0秒)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setTimingOffset((prev) => Math.round((prev + 0.5) * 10) / 10)}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[11px] font-mono"
              title="歌詞を0.5秒早める"
            >
              +0.5s
            </button>
          </div>
        </div>
      )}

      {/* Song Info Bar */}
      {currentTrack && (
        <div className="px-6 py-3 bg-neutral-900/40 border-b border-neutral-800/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <SafeImage
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              useBase64
              className="w-11 h-11 rounded-lg object-cover shadow bg-neutral-800 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentTrack.title}</p>
              <p className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data?.source && (
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                {data.source}
              </span>
            )}
            <span className="text-xs font-mono font-medium text-neutral-400 tabular-nums">
              {formatSeconds(progress)} / {formatSeconds(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Resume Auto-scroll floating toast */}
      {userScrolled && viewMode === 'synced' && data?.isSynced && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleResumeAutoScroll}
            className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold rounded-full shadow-xl flex items-center gap-1.5 backdrop-blur transition-all animate-bounce"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>再生中の歌詞にスクロール</span>
          </button>
        </div>
      )}

      {/* Lyrics Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 sm:px-10 pt-[32vh] pb-[42vh] text-neutral-200 scroll-smooth space-y-4 relative"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-xs">リアルタイム同期歌詞を取得中...</p>
          </div>
        ) : data?.syncedLyrics && data.syncedLyrics.length > 0 ? (
          /* Real-time Synchronized Karaoke View */
          <div className="space-y-4">
            {/* Intro State when track is playing before vocal onset */}
            {activeLineIndex === -1 && data.syncedLyrics.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-600/20 via-red-500/10 to-transparent border border-red-500/30 flex items-center justify-between shadow-lg shadow-red-950/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex items-end gap-1 h-5">
                    <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 bg-red-400 rounded-full animate-bounce h-5" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 bg-rose-400 rounded-full animate-bounce h-4" style={{ animationDelay: '300ms' }} />
                    <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2" style={{ animationDelay: '450ms' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                      <span>イントロ演奏中...</span>
                      <span className="text-[10px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-mono">INTRO</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">間もなく歌唱パートが始まります</p>
                  </div>
                </div>
                {data.syncedLyrics[0] && (
                  <span className="text-xs font-mono font-bold text-red-400 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/40">
                    歌い出し {formatSeconds(data.syncedLyrics[0].time)}
                  </span>
                )}
              </div>
            )}

            {data.syncedLyrics.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              const isPast = activeLineIndex !== -1 && idx < activeLineIndex;
              const pastDistance = activeLineIndex !== -1 && isPast ? activeLineIndex - idx : 0;
              const futureDistance = activeLineIndex !== -1 && idx > activeLineIndex ? idx - activeLineIndex : 0;

              // Calculate active line singing progress percentage
              let lineProgress = 0;
              if (isActive && data.syncedLyrics) {
                const nextLine = data.syncedLyrics[idx + 1];
                const lineDuration = nextLine ? Math.max(0.5, nextLine.time - line.time) : 4.0;
                const elapsed = Math.max(0, effectiveProgress - line.time);
                lineProgress = Math.min(100, Math.max(0, (elapsed / lineDuration) * 100));
              }

              // Determine inline style for exact opacity and blur depth
              let lineStyle: React.CSSProperties = {};
              if (isActive) {
                lineStyle = {};
              } else if (isPast) {
                if (pastDistance === 1) {
                  lineStyle = { opacity: 0.6 };
                } else if (pastDistance === 2) {
                  lineStyle = { opacity: 0.4 };
                } else {
                  lineStyle = { opacity: 0.25, filter: 'blur(0.6px)' };
                }
              } else {
                if (futureDistance === 1) {
                  lineStyle = { opacity: 0.7 };
                } else if (futureDistance === 2) {
                  lineStyle = { opacity: 0.45 };
                } else {
                  lineStyle = { opacity: 0.25 };
                }
              }

              return (
                <div
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLineElementRef : null}
                  onClick={() => handleLineClick(line)}
                  style={lineStyle}
                  className={`group relative rounded-xl transition-all duration-300 cursor-pointer select-none ${
                    isActive
                      ? 'py-4 px-5 bg-gradient-to-r from-red-600/30 via-red-500/15 to-transparent border-l-4 border-red-500 rounded-r-2xl shadow-[0_0_35px_rgba(239,68,68,0.35)] scale-[1.02]'
                      : isPast
                      ? pastDistance === 1
                        ? 'py-2 px-4 hover:opacity-100 hover:bg-white/[0.04]'
                        : pastDistance === 2
                        ? 'py-1.5 px-4 hover:opacity-90'
                        : 'py-1 px-4 hover:opacity-80'
                      : futureDistance === 1
                      ? 'py-2 px-4 hover:opacity-100 hover:bg-white/[0.04]'
                      : futureDistance === 2
                      ? 'py-1.5 px-4 hover:opacity-90'
                      : 'py-1 px-4 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isActive && (
                        <span className="flex h-3 w-3 relative shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_12px_#ef4444]"></span>
                        </span>
                      )}

                      <p
                        style={
                          isActive
                            ? {
                                textShadow:
                                  '0 0 16px rgba(255, 255, 255, 0.9), 0 0 32px rgba(239, 68, 68, 0.85), 0 0 60px rgba(220, 38, 38, 0.6)',
                              }
                            : undefined
                        }
                        className={`leading-relaxed tracking-normal font-sans transition-all duration-200 flex-1 ${
                          isActive
                            ? 'text-white font-black text-2xl sm:text-3xl tracking-wide'
                            : isPast
                            ? pastDistance === 1
                              ? 'text-neutral-400 font-medium text-lg sm:text-xl'
                              : pastDistance === 2
                              ? 'text-neutral-500 font-normal text-base sm:text-lg'
                              : 'text-neutral-600 font-normal text-sm sm:text-base'
                            : futureDistance === 1
                            ? 'text-neutral-300 font-medium text-lg sm:text-xl'
                            : futureDistance === 2
                            ? 'text-neutral-400 font-normal text-base sm:text-lg'
                            : 'text-neutral-500 font-normal text-sm sm:text-base'
                        } ${fontSize === 'large' ? 'sm:scale-105' : ''}`}
                      >
                        {line.text}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-mono shrink-0 tabular-nums transition-colors ${
                        isActive
                          ? 'text-red-400 font-bold opacity-100 shadow-sm'
                          : 'text-neutral-600 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {formatSeconds(line.time)}
                    </span>
                  </div>

                  {/* Active line singing progress bar (karaoke shimmer) */}
                  {isActive && (
                    <div className="w-full h-1.5 bg-white/15 rounded-full mt-3 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-rose-400 to-amber-300 rounded-full shadow-[0_0_14px_rgba(239,68,68,1)] transition-all duration-75 ease-linear"
                        style={{ width: `${lineProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : data?.available && data?.lyrics ? (
          /* Plain Text Lyrics View */
          <div className="space-y-4 pt-4">
            <div
              className={`leading-relaxed whitespace-pre-line font-sans ${
                fontSize === 'large' ? 'text-lg md:text-xl font-medium' : 'text-sm md:text-base'
              }`}
            >
              {data.lyrics}
            </div>
            {data.footer && (
              <p className="pt-6 text-xs text-neutral-500 italic border-t border-neutral-800/60">
                {data.footer}
              </p>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-3 text-neutral-400 py-24">
            <p className="text-sm font-medium text-neutral-300">歌詞が見つかりませんでした</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              曲名表記が異なる場合は、上部の検索アイコンから曲名で直接検索して適用できます。
            </p>
            <button
              onClick={() => {
                setSearchOpen(true);
                if (currentTrack) setSearchQuery(currentTrack.title);
              }}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-red-500" />
              <span>曲名で手動検索する</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
