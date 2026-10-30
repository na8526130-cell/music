import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Album, Track } from '../types/music';
import {
  ArrowLeft,
  Play,
  Heart,
  Plus,
  Loader2,
  Disc,
  Clock,
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
        <p className="text-xs">InnerTubeからアルバム収録曲を取得中...</p>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-neutral-400 text-sm">アルバム情報の読み込みに失敗しました</p>
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="px-4 py-2 bg-neutral-800 text-white text-xs rounded-lg"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>戻る</span>
      </button>

      {/* Album Header */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <img
          src={header.thumbnail}
          alt={header.title}
          referrerPolicy="no-referrer"
          className="w-44 h-44 sm:w-52 sm:h-52 rounded-xl object-cover shadow-2xl bg-neutral-800 shrink-0"
        />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-red-400">
            <Disc className="w-4 h-4 text-red-500" />
            <span>アルバム</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {header.title}
          </h1>

          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-neutral-300">
            {header.artistId ? (
              <button
                type="button"
                onClick={() => navigateTo('artist', header.artistId)}
                className="font-medium text-white hover:underline"
              >
                {header.artist}
              </button>
            ) : (
              <span className="font-medium text-white">{header.artist}</span>
            )}
            {header.year && (
              <>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-400">{header.year}年</span>
              </>
            )}
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-400">{tracks.length}曲</span>
          </div>

          {tracks.length > 0 && (
            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => playTrack(tracks[0], tracks)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>アルバムを再生</span>
              </button>

              <button
                type="button"
                onClick={() => tracks.forEach((t) => addToQueue(t))}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>すべてキューに追加</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist Table */}
      <div className="space-y-2">
        <div className="px-4 py-2 flex items-center text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">曲名</span>
          <span className="w-24 text-right flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>時間</span>
          </span>
        </div>

        <div className="divide-y divide-neutral-800/50">
          {tracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = likedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/40 rounded-xl group transition-colors ${
                  isCurrent ? 'bg-red-950/20' : ''
                }`}
              >
                <span className="w-8 text-center text-xs font-mono font-medium text-neutral-500">
                  {track.index}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => playTrack(track, tracks)}
                    className="p-1.5 text-neutral-400 group-hover:text-white rounded hover:bg-neutral-800"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>

                  <div className="min-w-0">
                    <p
                      onClick={() => playTrack(track, tracks)}
                      className={`text-sm font-medium truncate cursor-pointer hover:underline ${
                        isCurrent ? 'text-red-400 font-semibold' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleLikeTrack(track)}
                    className="p-1.5 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500 opacity-100' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => addToQueue(track)}
                    className="p-1.5 text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="キューに追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
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
