import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Artist, Track, Album } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import {
  ArrowLeft,
  Play,
  Heart,
  Plus,
  Loader2,
  Users,
  Disc,
  Radio,
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
    startRadioForTrack,
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
        <p className="text-xs">アーティスト情報を読み込み中...</p>
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

      {/* Artist Profile Header (Red & Black Spotify Style) */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#240407] via-[#120204] to-black border border-red-900/40 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <div className="relative shrink-0">
          <SafeImage
            src={header.thumbnail}
            alt={header.name}
            useBase64
            className="w-36 h-36 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl bg-neutral-800 border-2 border-red-600/30"
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-red-400">
            <Users className="w-4 h-4 text-red-500" />
            <span>公式アーティスト</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            {header.name}
          </h1>

          {header.subscribers && (
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              登録者数: {header.subscribers}
            </p>
          )}

          {header.description && (
            <p className="text-xs text-neutral-300 max-w-2xl line-clamp-3 leading-relaxed pt-1">
              {header.description}
            </p>
          )}

          {topSongs.length > 0 && (
            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => playTrack(topSongs[0], topSongs)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>全曲再生</span>
              </button>
              <button
                type="button"
                onClick={() => startRadioForTrack(topSongs[0])}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 text-red-400" />
                <span>アーティスト・ラジオ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>人気の曲 (Top Songs)</span>
          </h2>
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
            {topSongs.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id || idx}
                  className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors cursor-pointer ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                  onClick={() => playTrack(track, topSongs)}
                >
                  <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                    {idx + 1}
                  </span>

                  <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-neutral-800">
                    <SafeImage
                      src={track.thumbnail}
                      alt={track.title}
                      useBase64
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div
                      className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-red-400 font-bold' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {track.album || track.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                      title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                      title="キューに追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {track.duration && (
                      <span className="text-xs font-mono text-neutral-400 tabular-nums">
                        {track.duration}
                      </span>
                    )}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-red-500" />
              <span>アルバム</span>
            </h2>
            <span className="text-xs text-neutral-400 font-mono">{albums.length}件</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => navigateTo('album', album.id)}
                className="group p-3 bg-neutral-900/40 hover:bg-neutral-800/70 border border-neutral-800/80 hover:border-red-600/40 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all shadow-md hover:shadow-xl hover:shadow-red-950/20"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 relative shadow">
                  <SafeImage
                    src={album.thumbnail}
                    alt={album.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                    {album.title}
                  </h4>
                  {album.year && (
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{album.year}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Singles & EPs */}
      {singles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-neutral-400" />
              <span>シングル & EP</span>
            </h2>
            <span className="text-xs text-neutral-400 font-mono">{singles.length}件</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {singles.map((single) => (
              <div
                key={single.id}
                onClick={() => navigateTo('album', single.id)}
                className="group p-3 bg-neutral-900/40 hover:bg-neutral-800/70 border border-neutral-800/80 hover:border-red-600/40 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all shadow-md hover:shadow-xl hover:shadow-red-950/20"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 relative shadow">
                  <SafeImage
                    src={single.thumbnail}
                    alt={single.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                    {single.title}
                  </h4>
                  {single.year && (
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{single.year}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};



