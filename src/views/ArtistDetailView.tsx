import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Artist, Track, Album } from '../types/music';
import {
  ArrowLeft,
  Play,
  Heart,
  Plus,
  Loader2,
  Users,
  Disc,
} from 'lucide-react';

export const ArtistDetailView: React.FC = () => {
  const {
    selectedEntityId,
    navigateTo,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    currentTrack,
  } = usePlayer();

  const [header, setHeader] = useState<Artist | null>(null);
  const [topSongs, setTopSongs] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [singles, setSingles] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEntityId) return;
    let active = true;
    setLoading(true);

    api
      .getArtist(selectedEntityId)
      .then((res) => {
        if (!active) return;
        setHeader(res.header);
        setTopSongs(res.topSongs || []);
        setAlbums(res.albums || []);
        setSingles(res.singles || []);
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
        <p className="text-xs">InnerTubeからアーティスト情報を取得中...</p>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-neutral-400 text-sm">アーティスト情報の読み込みに失敗しました</p>
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
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>戻る</span>
      </button>

      {/* Artist Profile Header */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <img
          src={header.thumbnail}
          alt={header.name}
          referrerPolicy="no-referrer"
          className="w-36 h-36 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl bg-neutral-800 shrink-0"
        />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-red-400">
            <Users className="w-4 h-4 text-red-500" />
            <span>YouTube Music 公式アーティスト</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {header.name}
          </h1>

          {header.subscribers && (
            <p className="text-sm text-neutral-400 font-medium">
              チャンネル登録者: {header.subscribers}
            </p>
          )}

          {header.description && (
            <p className="text-xs text-neutral-300 max-w-2xl line-clamp-3 leading-relaxed pt-1">
              {header.description}
            </p>
          )}

          {topSongs.length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => playTrack(topSongs[0], topSongs)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>トップ楽曲を再生</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">人気の曲 (Top Songs)</h2>
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
            {topSongs.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                    {idx + 1}
                  </span>

                  <div className="relative shrink-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={() => playTrack(track, topSongs)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => playTrack(track, topSongs)}
                      className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                        isCurrent ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleLikeTrack(track)}
                      className="p-1.5 text-neutral-400 hover:text-red-500"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => addToQueue(track)}
                      className="p-1.5 text-neutral-400 hover:text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-neutral-400 tabular-nums">
                      {track.duration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc className="w-4 h-4 text-red-500" />
            <span>アルバム</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => navigateTo('album', album.id)}
                className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                  <img
                    src={album.thumbnail}
                    alt={album.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{album.title}</h4>
                  {album.year && <p className="text-[11px] text-neutral-400 mt-0.5">{album.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Singles & EPs */}
      {singles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc className="w-4 h-4 text-neutral-400" />
            <span>シングル & EP</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {singles.map((single) => (
              <div
                key={single.id}
                onClick={() => navigateTo('album', single.id)}
                className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                  <img
                    src={single.thumbnail}
                    alt={single.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{single.title}</h4>
                  {single.year && <p className="text-[11px] text-neutral-400 mt-0.5">{single.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
