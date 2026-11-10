import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Album, Track } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  Plus,
  Loader2,
  Disc,
  Clock,
  Sparkles,
  Tv,
} from 'lucide-react';

export const AlbumDetailView: React.FC = () => {
  const {
    selectedEntityId,
    navigateTo,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    currentTrack,
    isPlaying,
    setPlayerMode,
    setVideoLayout,
  } = usePlayer();

  const [header, setHeader] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<(Track & { index: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEntityId) return;
    let active = true;
    setLoading(true);

    api
      .getAlbum(selectedEntityId)
      .then((res) => {
        if (!active) return;
        setHeader(res.header);
        setTracks(res.tracks || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEntityId]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs font-medium text-white">アルバムの曲一覧を読み込み中...</p>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500 mx-auto">
          <Disc className="w-6 h-6" />
        </div>
        <p className="text-neutral-400 text-sm">アルバム情報の読み込みに失敗しました</p>
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/30 cursor-pointer"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  const isAlbumPlaying =
    isPlaying && tracks.some((t) => t.id === currentTrack?.id);

  return (
    <div className="space-y-8 pb-24">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>ホームに戻る</span>
      </button>

      {/* Album Header Banner (Spotify Red & Black Style) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-red-950/70 via-[#14080a] to-[#070708] border border-red-900/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 shadow-2xl">
        {/* Subtle crimson radial glow behind cover */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-xl overflow-hidden shadow-2xl shadow-black/80 bg-neutral-900 shrink-0 border border-red-950/60">
          <SafeImage
            src={header.thumbnail}
            alt={header.title}
            useBase64
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 flex-1 text-center sm:text-left space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest">
            <Disc className="w-4 h-4 text-red-500" />
            <span>
              {header.id?.startsWith('VL') || header.id?.startsWith('PL')
                ? 'プレイリスト'
                : 'アルバム'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {header.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-300">
            {header.artistId ? (
              <button
                type="button"
                onClick={() => navigateTo('artist', header.artistId)}
                className="font-bold text-white hover:text-red-400 hover:underline cursor-pointer"
              >
                {header.artist}
              </button>
            ) : (
              <span className="font-bold text-white">{header.artist}</span>
            )}
            {header.year && (
              <>
                <span aria-hidden="true" className="text-neutral-600">•</span>
                <span className="text-neutral-400">{header.year}年</span>
              </>
            )}
            <span aria-hidden="true" className="text-neutral-600">•</span>
            <span className="text-neutral-400">{tracks.length}曲</span>
          </div>

          {tracks.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => playTrack(tracks[0], tracks)}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-extrabold rounded-full inline-flex items-center gap-2.5 shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>アルバムを再生</span>
              </button>

              <button
                type="button"
                onClick={() => tracks.forEach((t) => addToQueue(t))}
                className="px-4 py-3 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 text-xs font-bold rounded-full border border-neutral-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>すべてキューに追加</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Album Tracklist Table (Spotify Style) */}
      <div className="space-y-2">
        <div className="px-4 py-2.5 flex items-center text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">タイトル</span>
          <span className="w-24 text-right flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>時間</span>
          </span>
        </div>

        <div className="divide-y divide-neutral-900/80">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = likedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, tracks)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl group transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-red-950/30 border border-red-900/30'
                    : 'hover:bg-neutral-900/80 border border-transparent'
                }`}
              >
                {/* Track Number / Play Indicator */}
                <div className="w-8 text-center shrink-0 flex items-center justify-center">
                  {isCurrent && isPlaying ? (
                    <span className="flex items-end justify-center gap-0.5 h-3 w-3">
                      <span className="w-0.5 bg-red-500 animate-pulse h-full" />
                      <span className="w-0.5 bg-red-500 animate-pulse h-2" />
                      <span className="w-0.5 bg-red-500 animate-pulse h-3" />
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-mono font-medium ${
                        isCurrent ? 'text-red-400 font-bold' : 'text-neutral-500 group-hover:hidden'
                      }`}
                    >
                      {track.index}
                    </span>
                  )}
                  <Play
                    className={`w-3.5 h-3.5 fill-current text-white hidden ${
                      !isCurrent ? 'group-hover:block' : ''
                    }`}
                  />
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm truncate font-medium ${
                      isCurrent ? 'text-red-400 font-bold' : 'text-white group-hover:text-red-400'
                    } transition-colors`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {track.artist || header.artist}
                  </p>
                </div>

                {/* Actions & Duration */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* MV Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track, tracks);
                      setPlayerMode('video');
                      setVideoLayout('theater');
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="MVで観る"
                  >
                    <Tv className="w-3.5 h-3.5" />
                  </button>

                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLikeTrack(track);
                    }}
                    className={`p-1.5 transition-all cursor-pointer ${
                      isLiked
                        ? 'text-red-500'
                        : 'text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isLiked ? 'いいね解除' : 'いいね'}
                  >
                    <Heart
                      className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`}
                    />
                  </button>

                  {/* Add to queue */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToQueue(track);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="キューに追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Duration */}
                  <span className="w-12 text-right text-xs font-mono text-neutral-400 tabular-nums">
                    {track.duration}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
