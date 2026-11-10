import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Track, Album, Artist, Playlist } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import {
  Play,
  Plus,
  Heart,
  Loader2,
  Music,
  Tv,
  Disc,
  Users,
  ListMusic,
  Search,
  ListPlus,
} from 'lucide-react';

type SearchFilterType = 'all' | 'song' | 'video' | 'album' | 'artist' | 'playlist';

export const SearchView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    navigateTo,
    currentTrack,
    openAddToPlaylistModal,
  } = usePlayer();

  const [provider, setProvider] = useState<'innertube' | 'spotify'>('innertube');
  const [filter, setFilter] = useState<SearchFilterType>('all');
  const [loading, setLoading] = useState(false);
  const [resultsAll, setResultsAll] = useState<{
    songs: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
    videos: Track[];
  }>({ songs: [], artists: [], albums: [], playlists: [], videos: [] });
  const [resultsFiltered, setResultsFiltered] = useState<any[]>([]);

  // Spotify search state
  const [spotifyTracks, setSpotifyTracks] = useState<Track[]>([]);
  const [matchedAlias, setMatchedAlias] = useState<string | null>(null);

  // InnerTube search
  useEffect(() => {
    if (!searchQuery.trim() || provider !== 'innertube') return;
    let active = true;
    setLoading(true);

    api
      .search(searchQuery, filter)
      .then((res) => {
        if (!active) return;
        if (filter === 'all') {
          setResultsAll({
            songs: res.songs || [],
            artists: res.artists || [],
            albums: res.albums || [],
            playlists: res.playlists || [],
            videos: res.videos || [],
          });
        } else {
          setResultsFiltered(res.results || []);
        }
        setMatchedAlias(res.matchedAlias || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Search error:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, filter, provider]);

  // Spotify search
  useEffect(() => {
    if (!searchQuery.trim() || provider !== 'spotify') return;
    let active = true;
    setLoading(true);

    api
      .searchSpotify(searchQuery)
      .then((res) => {
        if (!active) return;
        setSpotifyTracks(res.tracks || []);
        setMatchedAlias(res.matchedAlias || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Spotify search error:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, provider]);

  const filterOptions: { id: SearchFilterType; label: string; icon: any }[] = [
    { id: 'all', label: 'すべて', icon: Search },
    { id: 'song', label: '楽曲 (Songs)', icon: Music },
    { id: 'video', label: '動画 (Videos)', icon: Tv },
    { id: 'album', label: 'アルバム (Albums)', icon: Disc },
    { id: 'artist', label: 'アーティスト (Artists)', icon: Users },
    { id: 'playlist', label: 'プレイリスト (Playlists)', icon: ListMusic },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              {provider === 'spotify' ? 'Spotify' : 'YouTube Music'}
            </span>
            {matchedAlias && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {matchedAlias}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            「{searchQuery}」の検索結果
          </h1>
        </div>

        {/* Engine Provider Switcher + Filter Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Provider Toggle */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => setProvider('innertube')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                provider === 'innertube'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-red-500" />
              <span>YouTube Music</span>
            </button>
            <button
              type="button"
              onClick={() => setProvider('spotify')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                provider === 'spotify'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Spotify 検索</span>
            </button>
          </div>

          {/* Segmented Filter Control (Only for YouTube Music) */}
          {provider === 'innertube' && (
            <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto scrollbar-none">
              {filterOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = filter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-500' : ''}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 className={`w-8 h-8 animate-spin ${provider === 'spotify' ? 'text-emerald-500' : 'text-red-500'}`} />
          <p className="text-xs">
            検索中...
          </p>
        </div>
      ) : provider === 'spotify' ? (
        /* Spotify Mode Results */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 bg-neutral-900/60 border border-emerald-500/25 rounded-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Spotify 楽曲</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {spotifyTracks.length}件の楽曲
                </p>
              </div>
            </div>

            {spotifyTracks.length > 0 && (
              <button
                type="button"
                onClick={() => playTrack(spotifyTracks[0], spotifyTracks)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0 cursor-pointer active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>すべて再生</span>
              </button>
            )}
          </div>

          {spotifyTracks.length === 0 ? (
            <div className="py-20 text-center space-y-2 text-neutral-400">
              <p className="text-sm font-medium text-neutral-300">Spotifyカタログに該当する楽曲が見つかりませんでした</p>
              <p className="text-xs text-neutral-500">
                キーワードを変更するか、「YouTube Music」タブでの検索をお試しください。
              </p>
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
              {spotifyTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);

                return (
                  <div
                    key={track.id || idx}
                    className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                      isCurrent ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <span className="text-xs font-mono text-neutral-500 w-5 text-right shrink-0">
                      {idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => playTrack(track, spotifyTracks)}
                      className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:bg-neutral-700 transition-colors shrink-0 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>

                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0 relative shadow">
                      <SafeImage
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => playTrack(track, spotifyTracks)}
                        className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                          isCurrent ? 'text-emerald-400 font-bold' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {track.artist} • {track.album}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 shrink-0 hidden sm:inline-block">
                      Spotify
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleLikeTrack(track)}
                        title="お気に入り"
                        className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddToPlaylistModal(track)}
                        title="プレイリストに追加"
                        className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addToQueue(track)}
                        title="キューに追加"
                        className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-neutral-400 tabular-nums ml-2">
                        {track.duration}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : filter === 'all' ? (
        /* ALL Mode View */
        resultsAll.songs.length === 0 &&
        resultsAll.artists.length === 0 &&
        resultsAll.albums.length === 0 &&
        resultsAll.videos.length === 0 &&
        resultsAll.playlists.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="text-base font-semibold text-neutral-300">
              「{searchQuery}」の検索結果が見つかりませんでした
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              キーワードを変更するか、上部の「楽曲」や「動画」タブから個別の検索をお試しください。
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFilter('song')}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 rounded-lg cursor-pointer transition-colors"
              >
                楽曲 (Songs) で探す
              </button>
              <button
                type="button"
                onClick={() => setFilter('video')}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-200 rounded-lg cursor-pointer transition-colors"
              >
                動画 (Videos) で探す
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-10">
          {/* Top Songs */}
          {resultsAll.songs.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-red-500" />
                  <span>楽曲</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFilter('song')}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  すべて見る
                </button>
              </div>

              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-lg">
                {resultsAll.songs.slice(0, 6).map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isLiked = likedTrackIds.has(track.id);
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                        isCurrent ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <span className="w-5 text-center text-xs font-mono text-neutral-500">
                        {idx + 1}
                      </span>
                      <div className="relative shrink-0">
                        <SafeImage
                          src={track.thumbnail}
                          alt={track.title}
                          useBase64
                          className="w-11 h-11 rounded-lg object-cover bg-neutral-800"
                        />
                        <button
                          type="button"
                          onClick={() => playTrack(track, resultsAll.songs)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          onClick={() => playTrack(track, resultsAll.songs)}
                          className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                            isCurrent ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
                          <button
                            type="button"
                            onClick={() => {
                              if (track.artistId) navigateTo('artist', track.artistId);
                            }}
                            className="hover:text-white truncate hover:underline"
                          >
                            {track.artist}
                          </button>
                          {track.album && (
                            <>
                              <span aria-hidden="true" className="text-neutral-600">·</span>
                              <span className="truncate hidden sm:inline text-neutral-500">{track.album}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLikeTrack(track)}
                          title="お気に入り"
                          className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddToPlaylistModal(track)}
                          title="プレイリストに追加"
                          className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => addToQueue(track)}
                          title="キューに追加"
                          className="p-1.5 text-neutral-400 hover:text-white transition-colors"
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

          {/* Artists */}
          {resultsAll.artists.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  <span>アーティスト</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFilter('artist')}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  すべて見る
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {resultsAll.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => navigateTo('artist', artist.id)}
                    className="p-4 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-2xl cursor-pointer text-center flex flex-col items-center gap-3 transition-all hover:scale-102"
                  >
                    <SafeImage
                      src={artist.thumbnail}
                      alt={artist.name}
                      useBase64
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-md bg-neutral-800"
                    />
                    <div className="min-w-0 w-full">
                      <h4 className="text-sm font-bold text-white truncate">{artist.name}</h4>
                      {artist.subscribers && (
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{artist.subscribers}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {resultsAll.albums.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Disc className="w-4 h-4 text-red-500" />
                  <span>アルバム</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFilter('album')}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  すべて見る
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {resultsAll.albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => navigateTo('album', album.id)}
                    className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                      <SafeImage
                        src={album.thumbnail}
                        alt={album.title}
                        useBase64
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{album.title}</h4>
                      <p className="text-[11px] text-neutral-400 truncate">{album.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Videos */}
          {resultsAll.videos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-red-500" />
                  <span>ミュージックビデオ</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFilter('video')}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  すべて見る
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {resultsAll.videos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => playTrack(vid)}
                    className="p-2.5 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
                  >
                    <div className="aspect-video rounded-lg overflow-hidden bg-neutral-800 relative group">
                      <SafeImage
                        src={vid.thumbnail}
                        alt={vid.title}
                        useBase64
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-6 h-6 fill-white text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{vid.title}</h4>
                      <p className="text-[11px] text-neutral-400 truncate">{vid.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        )
      ) : (
        /* Filtered List Mode */
        <div>
          {resultsFiltered.length === 0 ? (
            <div className="py-20 text-center text-sm text-neutral-500">
              該当する{filterOptions.find((o) => o.id === filter)?.label}が見つかりませんでした。
            </div>
          ) : filter === 'song' ? (
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-lg">
              {resultsFiltered.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                      isCurrent ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-mono text-neutral-500">
                      {idx + 1}
                    </span>
                    <div className="relative shrink-0">
                      <SafeImage
                        src={track.thumbnail}
                        alt={track.title}
                        useBase64
                        className="w-11 h-11 rounded-lg object-cover bg-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={() => playTrack(track, resultsFiltered)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => playTrack(track, resultsFiltered)}
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
                        title="お気に入り"
                        className="p-1.5 text-neutral-400 hover:text-red-500"
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddToPlaylistModal(track)}
                        title="プレイリストに追加"
                        className="p-1.5 text-neutral-400 hover:text-white"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addToQueue(track)}
                        title="キューに追加"
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
          ) : filter === 'artist' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
              {resultsFiltered.map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => navigateTo('artist', artist.id)}
                  className="p-4 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-2xl cursor-pointer text-center flex flex-col items-center gap-3 transition-all hover:scale-102"
                >
                  <SafeImage
                    src={artist.thumbnail}
                    alt={artist.name}
                    useBase64
                    className="w-28 h-28 rounded-full object-cover shadow-md bg-neutral-800"
                  />
                  <h4 className="text-sm font-bold text-white truncate w-full">{artist.name}</h4>
                  {artist.subscribers && (
                    <p className="text-xs text-neutral-400 truncate">{artist.subscribers}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {resultsFiltered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (filter === 'album') navigateTo('album', item.id);
                    else if (filter === 'video') playTrack(item);
                  }}
                  className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                    <SafeImage
                      src={item.thumbnail}
                      alt={item.title}
                      useBase64
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                    <p className="text-[11px] text-neutral-400 truncate">{item.artist || item.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
