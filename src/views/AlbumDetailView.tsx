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
  Share2,
  Tv,
  ListPlus,
} from 'lucide-react';

export const AlbumDetailView: React.FC = () => {
  const {
    selectedEntityId,
    navigateTo,
    playTrack,
    togglePlay,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    likedAlbumIds,
    toggleLikeAlbum,
    likedPlaylistIds,
    toggleLikePlaylist,
    currentTrack,
    isPlaying,
    setPlayerMode,
    setVideoLayout,
    openShareModal,
    showToast,
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
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full transition-all shadow-md shadow-red-600/30 cursor-pointer"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  const isAlbumPlaying = isPlaying && tracks.some((t) => t.id === currentTrack?.id);
  const isPlaylistEntity = Boolean(
    header.id?.startsWith('VL') || header.id?.startsWith('PL') || header.id?.startsWith('RD')
  );
  const isHeaderLiked = isPlaylistEntity
    ? likedPlaylistIds.has(header.id)
    : likedAlbumIds.has(header.id);

  const handleToggleHeaderHeart = () => {
    if (isPlaylistEntity) {
      toggleLikePlaylist({
        id: header.id,
        title: header.title,
        author: header.artist,
        itemCount: `${tracks.length}曲`,
        thumbnail: header.thumbnail,
      });
    } else {
      toggleLikeAlbum({ ...header, trackCount: tracks.length });
    }
  };

  const handlePlayHeader = () => {
    if (tracks.length === 0) return;
    if (tracks.some((t) => t.id === currentTrack?.id)) {
      togglePlay();
    } else {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="pb-24">
      {/* Full-bleed Spotify-style vertical gradient header */}
      <div className="-mx-4 sm:-mx-6 md:-mx-8 -mt-6 px-4 sm:px-6 md:px-8 pt-4 pb-6 bg-gradient-to-b from-[#4f1118] via-[#22090c] to-[#070708]">
        {/* Top Back Button */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center text-white/85 hover:text-white transition-colors cursor-pointer"
          aria-label="戻る"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Centered cover on mobile, side-by-side on desktop */}
        <div className="mt-2 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
          <div className="w-52 h-52 sm:w-56 sm:h-56 mx-auto sm:mx-0 rounded-md overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.75)] bg-neutral-900 shrink-0">
            <SafeImage
              src={header.thumbnail}
              alt={header.title}
              useBase64
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5 text-left">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {header.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-white font-bold">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                <SafeImage
                  src={header.thumbnail}
                  alt={header.artist}
                  useBase64
                  className="w-full h-full object-cover"
                />
              </div>
              {header.artistId ? (
                <button
                  type="button"
                  onClick={() => navigateTo('artist', header.artistId)}
                  className="hover:underline cursor-pointer truncate"
                >
                  {header.artist}
                </button>
              ) : (
                <span className="truncate">{header.artist}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
              <span>{isPlaylistEntity ? 'プレイリスト' : 'アルバム'}</span>
              {header.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{header.year}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{tracks.length}曲</span>
            </div>
          </div>
        </div>

        {/* Spotify Action Bar: Heart, Share, Add Queue on Left; Big Play Circle on Right */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleHeaderHeart}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 hover:text-white transition-transform active:scale-110 cursor-pointer"
              title={isHeaderLiked ? 'お気に入り解除' : 'お気に入りに追加'}
              aria-label={isHeaderLiked ? 'お気に入り解除' : 'お気に入りに追加'}
            >
              <Heart
                className={`w-6 h-6 ${isHeaderLiked ? 'fill-red-500 text-red-500' : 'text-neutral-300'}`}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                openShareModal('playlist', {
                  name: header.title,
                  tracks,
                })
              }
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="シェア"
              aria-label="シェア"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  tracks.forEach((t) => addToQueue(t));
                  showToast(`${tracks.length}曲をキューに追加しました`, 'success', 2200);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="すべてキューに追加"
                aria-label="すべてキューに追加"
              >
                <ListPlus className="w-5 h-5" />
              </button>
            )}
          </div>

          {tracks.length > 0 && (
            <button
              type="button"
              onClick={handlePlayHeader}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={isAlbumPlaying ? '一時停止' : '再生'}
              aria-label={isAlbumPlaying ? '一時停止' : '再生'}
            >
              {isAlbumPlaying ? (
                <Pause className="w-6 h-6 fill-white" />
              ) : (
                <Play className="w-6 h-6 fill-white ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Clean Spotify Track List */}
      <div className="mt-2 space-y-0.5">
        {tracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id;
          const isLiked = likedTrackIds.has(track.id);

          return (
            <div
              key={track.id}
              onClick={() => playTrack(track, tracks)}
              className={`flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-lg group transition-colors cursor-pointer ${
                isCurrent ? 'bg-white/5' : 'hover:bg-white/5'
              }`}
            >
              {/* Playlist shows thumbnail; Album shows clean index on sm+ */}
              {isPlaylistEntity ? (
                <SafeImage
                  src={track.thumbnail}
                  alt={track.title}
                  useBase64
                  className="w-11 h-11 rounded object-cover bg-neutral-800 shrink-0"
                />
              ) : (
                <div className="hidden sm:flex w-7 text-center shrink-0 items-center justify-center">
                  {isCurrent && isPlaying ? (
                    <span className="flex items-end justify-center gap-0.5 h-3 w-3">
                      <span className="w-0.5 bg-red-500 animate-pulse h-full" />
                      <span className="w-0.5 bg-red-500 animate-pulse h-2" />
                      <span className="w-0.5 bg-red-500 animate-pulse h-3" />
                    </span>
                  ) : (
                    <>
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          isCurrent ? 'text-red-500 font-bold' : 'text-neutral-400 group-hover:hidden'
                        }`}
                      >
                        {track.index}
                      </span>
                      <Play
                        className={`w-3.5 h-3.5 fill-current text-white hidden ${
                          !isCurrent ? 'group-hover:block' : ''
                        }`}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Title + Artist */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[15px] font-semibold truncate leading-snug ${
                    isCurrent ? 'text-red-500' : 'text-white'
                  }`}
                >
                  {track.title}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {track.artist || header.artist}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(track, tracks);
                    setPlayerMode('video');
                    setVideoLayout('theater');
                  }}
                  className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="MVで観る"
                >
                  <Tv className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeTrack(track);
                  }}
                  className={`min-w-[40px] min-h-[40px] flex items-center justify-center transition-all cursor-pointer ${
                    isLiked
                      ? 'text-red-500 opacity-100'
                      : 'text-neutral-400 hover:text-white opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                  title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
                  aria-label={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
                >
                  <Heart className={`w-4.5 h-4.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToQueue(track);
                    showToast(`「${track.title}」をキューに追加しました`, 'info', 2000);
                  }}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="キューに追加"
                  aria-label="キューに追加"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {track.duration && (
                  <span className="hidden sm:inline-block w-11 text-right text-xs font-mono text-neutral-400 tabular-nums">
                    {track.duration}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
