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
  X,
  Clock,
  Sparkles,
  Guitar,
  Car,
  Flame,
  Moon,
  ArrowRightLeft,
} from 'lucide-react';
import {
  getSearchConversions,
  SearchConversionCandidate,
} from '../utils/searchConverter';

type SearchFilterType = 'all' | 'song' | 'video' | 'album' | 'artist' | 'playlist';

const GENRE_COVERS_CACHE_KEY = 'yt_music_genre_covers_v1';

interface BrowseCategory {
  id: string;
  title: string;
  query: string;
  color: string;
  defaultCover?: string;
  icon: React.ElementType;
}

const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    id: 'jpop',
    title: '音楽・J-Pop',
    query: 'J-Pop ヒット曲',
    color: 'bg-[#dc148c]',
    defaultCover: '/assets/images/genre_tokyo_nightpop_1793266768910.jpg',
    icon: Music,
  },
  {
    id: 'new-releases',
    title: 'ニューリリース',
    query: '最新曲 J-Pop 2026',
    color: 'bg-[#608108]',
    defaultCover: '/assets/images/hero_ytmusic_curated_1793266769181.jpg',
    icon: Sparkles,
  },
  {
    id: 'ballad',
    title: 'バラード・切ない',
    query: 'back number 水平線',
    color: 'bg-[#b02897]',
    icon: Heart,
  },
  {
    id: 'rock',
    title: 'ロック・バンド',
    query: 'Vaundy 怪獣の花唄',
    color: 'bg-[#1e3264]',
    icon: Guitar,
  },
  {
    id: 'chill',
    title: 'チル・深夜',
    query: '夜 チル 邦楽 Lo-Fi',
    color: 'bg-[#006450]',
    defaultCover: '/assets/images/genre_cyber_lofi_1793266769512.jpg',
    icon: Moon,
  },
  {
    id: 'anime',
    title: 'アニメ・ボカロ',
    query: 'YOASOBI アイドル',
    color: 'bg-[#8400e7]',
    icon: Tv,
  },
  {
    id: 'drive',
    title: 'ドライブ・爽快',
    query: 'Mrs. GREEN APPLE ライラック',
    color: 'bg-[#bc5900]',
    icon: Car,
  },
  {
    id: 'kpop',
    title: 'K-Pop',
    query: 'ILLIT Magnetic K-Pop',
    color: 'bg-[#e8115b]',
    icon: Flame,
  },
];

export const SearchView: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    likedAlbumIds,
    toggleLikeAlbum,
    likedPlaylistIds,
    toggleLikePlaylist,
    navigateTo,
    currentTrack,
    openAddToPlaylistModal,
    showToast,
  } = usePlayer();

  const [inputVal, setInputVal] = useState(searchQuery);
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
  const [spotifyTracks, setSpotifyTracks] = useState<Track[]>([]);
  const [matchedAlias, setMatchedAlias] = useState<string | null>(null);
  const [effectiveQuery, setEffectiveQuery] = useState<string | null>(null);
  const [rawMode, setRawMode] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [localConversions, setLocalConversions] = useState<SearchConversionCandidate[]>([]);
  const [genreCovers, setGenreCovers] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(GENRE_COVERS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data && parsed?.ts && Date.now() - parsed.ts < 12 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Instant local conversions + debounced InnerTube autocomplete suggestions
  useEffect(() => {
    const clean = inputVal.trim();
    if (!clean) {
      setLocalConversions([]);
      setSuggestions([]);
      return;
    }

    setLocalConversions(getSearchConversions(clean));

    const timer = setTimeout(async () => {
      try {
        const res = await api.getSuggestionsWithConversions(clean);
        setSuggestions(res.suggestions || []);
        if (res.conversions && res.conversions.length > 0) {
          setLocalConversions(res.conversions);
        }
      } catch {}
    }, 180);

    return () => clearTimeout(timer);
  }, [inputVal]);

  // Fetch genuine thumbnails for genre cards that don't have local bespoke art
  useEffect(() => {
    const missing = BROWSE_CATEGORIES.filter((c) => !c.defaultCover && !genreCovers[c.id]);
    if (missing.length === 0) return;

    let active = true;
    Promise.all(
      missing.map(async (cat) => {
        try {
          const res = await api.search(cat.query, 'song');
          const thumb = res?.results?.[0]?.thumbnail || res?.songs?.[0]?.thumbnail;
          return thumb ? [cat.id, thumb] : null;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (!active) return;
      const next: Record<string, string> = { ...genreCovers };
      let changed = false;
      entries.forEach((pair) => {
        if (pair && pair[1]) {
          next[pair[0]] = pair[1];
          changed = true;
        }
      });
      if (changed) {
        setGenreCovers(next);
        try {
          localStorage.setItem(
            GENRE_COVERS_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: next })
          );
        } catch {}
      }
    });

    return () => {
      active = false;
    };
  }, [genreCovers]);

  // InnerTube search
  useEffect(() => {
    if (!searchQuery.trim() || provider !== 'innertube') return;
    let active = true;
    setLoading(true);

    api
      .search(searchQuery, filter, rawMode)
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
        setEffectiveQuery(res.effectiveQuery || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Search error:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, filter, provider, rawMode]);

  // Spotify search
  useEffect(() => {
    if (!searchQuery.trim() || provider !== 'spotify') return;
    let active = true;
    setLoading(true);

    api
      .searchSpotify(searchQuery, rawMode)
      .then((res) => {
        if (!active) return;
        setSpotifyTracks(res.tracks || []);
        setMatchedAlias(res.matchedAlias || null);
        setEffectiveQuery(res.effectiveQuery || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Spotify search error:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, provider, rawMode]);

  const executeSearch = (q: string, useRaw = false) => {
    const clean = q.trim();
    if (!clean) return;
    setRawMode(useRaw);
    setIsSuggestOpen(false);
    setInputVal(clean);
    setSearchQuery(clean);
    addRecentSearch(clean);
    api.recordSearchTelemetry(clean);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(inputVal, false);
  };

  const filterOptions: { id: SearchFilterType; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'song', label: '楽曲' },
    { id: 'artist', label: 'アーティスト' },
    { id: 'album', label: 'アルバム' },
    { id: 'playlist', label: 'プレイリスト' },
    { id: 'video', label: '動画' },
  ];

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Spotify-style Search Header & White Input Bar (IMG_0222, IMG_0223) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">検索</h1>
          {hasQuery && (
            <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-full">
              <button
                type="button"
                onClick={() => setProvider('innertube')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  provider === 'innertube' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                YouTube Music
              </button>
              <button
                type="button"
                onClick={() => setProvider('spotify')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  provider === 'spotify' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Spotify
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <form onSubmit={handleFormSubmit} className="relative">
            <Search className="w-5 h-5 text-neutral-800 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onFocus={() => setIsSuggestOpen(true)}
              onChange={(e) => {
                setInputVal(e.target.value);
                setIsSuggestOpen(true);
                if (!e.target.value.trim()) {
                  setSearchQuery('');
                  setRawMode(false);
                }
              }}
              placeholder="何を聴きたいですか？（ひらがな・略称・ローマ字OK）"
              className="w-full h-11 sm:h-12 bg-white text-neutral-950 placeholder-neutral-600 pl-11 pr-10 rounded-md text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 shadow-lg"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchQuery('');
                  setRawMode(false);
                  setIsSuggestOpen(false);
                }}
                aria-label="検索をクリア"
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-600 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>

          {/* Live Search Conversions & Autocomplete Dropdown */}
          {isSuggestOpen && inputVal.trim().length > 0 && (localConversions.length > 0 || suggestions.length > 0) && (
            <div className="mt-2 bg-[#141418] border border-white/10 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/5">
              {localConversions.map((conv) => (
                <button
                  key={`conv-${conv.query}`}
                  type="button"
                  onClick={() => executeSearch(conv.query, false)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white truncate block">
                        {conv.label}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {conv.kind === 'alias'
                          ? 'アーティスト・曲名に変換'
                          : conv.kind === 'kana'
                          ? 'カタカナに変換'
                          : 'ローマ字から変換'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-red-400 shrink-0">
                    変換検索
                  </span>
                </button>
              ))}

              {suggestions
                .filter((s) => !localConversions.some((c) => c.query.toLowerCase() === s.toLowerCase()))
                .slice(0, 6)
                .map((s) => (
                  <button
                    key={`sug-${s}`}
                    type="button"
                    onClick={() => executeSearch(s, false)}
                    className="w-full px-4 py-2.5 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Active Search Conversion Notice */}
        {hasQuery &&
          !rawMode &&
          effectiveQuery &&
          effectiveQuery.toLowerCase() !== searchQuery.trim().toLowerCase() && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-red-950/30 border border-red-800/40 text-xs">
              <div className="flex items-center gap-2 text-neutral-200 min-w-0">
                <ArrowRightLeft className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">
                  「<strong className="text-white">{effectiveQuery}</strong>」に変換して検索結果を表示中
                </span>
              </div>
              <button
                type="button"
                onClick={() => executeSearch(searchQuery, true)}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer shrink-0"
              >
                変換せず「{searchQuery}」で検索
              </button>
            </div>
          )}
      </div>

      {/* Empty Search Query -> Spotify Recent Searches (IMG_0223) + Browse Categories Grid (IMG_0222) */}
      {!hasQuery ? (
        <div className="space-y-8">
          {/* 最近の検索 (Recent Searches matching IMG_0223) */}
          {recentSearches.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base sm:text-lg font-black text-white">最近の検索</h2>
              <div className="space-y-1">
                {recentSearches.map((q) => (
                  <div
                    key={q}
                    onClick={() => executeSearch(q)}
                    className="flex items-center justify-between gap-3 py-2 px-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{q}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">最近の検索</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(q);
                      }}
                      aria-label={`${q} を履歴から削除`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="px-5 py-2 rounded-full border border-neutral-600 hover:border-white text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  検索履歴を削除
                </button>
              </div>
            </section>
          )}

          {/* すべてのジャンル (Browse Categories Grid matching IMG_0222) */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-white">すべてのジャンル</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {BROWSE_CATEGORIES.map((cat) => {
                const coverSrc = genreCovers[cat.id] || cat.defaultCover;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => executeSearch(cat.query)}
                    className={`${cat.color} relative h-24 sm:h-28 rounded-lg p-3.5 text-left overflow-hidden shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer`}
                  >
                    <span className="relative z-10 text-sm sm:text-base font-black text-white leading-tight block max-w-[68%] drop-shadow-sm">
                      {cat.title}
                    </span>
                    <div className="absolute -bottom-1 -right-2 w-16 h-16 sm:w-20 sm:h-20 rounded shadow-2xl overflow-hidden rotate-[25deg] bg-black/25 flex items-center justify-center">
                      {coverSrc ? (
                        <SafeImage
                          src={coverSrc}
                          alt={cat.title}
                          useBase64={coverSrc.startsWith('http')}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CatIcon className="w-8 h-8 text-white/80" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* Active Search Results */
        <div className="space-y-5">
          {/* Segmented Horizontal Filter Chips (YouTube Music mode) */}
          {provider === 'innertube' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {filterOptions.map((opt) => {
                const isActive = filter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'bg-[#232329] text-neutral-200 hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {matchedAlias && (
                <span className="text-xs text-neutral-400 whitespace-nowrap pl-1">
                  · {matchedAlias}
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className={`w-8 h-8 animate-spin ${provider === 'spotify' ? 'text-emerald-500' : 'text-red-500'}`} />
              <p className="text-xs">検索中...</p>
            </div>
          ) : provider === 'spotify' ? (
            <div className="space-y-4">
              {spotifyTracks.length === 0 ? (
                <div className="py-20 text-center space-y-2 text-neutral-400">
                  <p className="text-sm font-medium text-neutral-300">該当する楽曲が見つかりませんでした</p>
                  <p className="text-xs text-neutral-500">キーワードを変えるか、YouTube Music検索をお試しください。</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {spotifyTracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isLiked = likedTrackIds.has(track.id);
                    return (
                      <div
                        key={track.id || idx}
                        onClick={() => playTrack(track, spotifyTracks)}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
                          isCurrent ? 'bg-white/5' : ''
                        }`}
                      >
                        <SafeImage
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover bg-neutral-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            楽曲 · {track.artist}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeTrack(track);
                            }}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-red-500 cursor-pointer"
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
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : filter === 'all' ? (
            resultsAll.songs.length === 0 &&
            resultsAll.artists.length === 0 &&
            resultsAll.albums.length === 0 &&
            resultsAll.videos.length === 0 &&
            resultsAll.playlists.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <p className="text-base font-semibold text-neutral-300">
                  「{searchQuery}」の検索結果が見つかりませんでした
                </p>
                <p className="text-xs text-neutral-500">別のキーワードでお試しください。</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Artists row (Circular Spotify cards) */}
                {resultsAll.artists.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-red-500" />
                        <span>アーティスト</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFilter('artist')}
                        className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                      >
                        すべて見る
                      </button>
                    </div>
                    <div className="flex sm:grid sm:grid-cols-4 md:grid-cols-5 gap-3.5 overflow-x-auto sm:overflow-visible pb-2 scrollbar-none">
                      {resultsAll.artists.slice(0, 5).map((artist) => (
                        <div
                          key={artist.id}
                          onClick={() => navigateTo('artist', artist.id)}
                          className="w-32 sm:w-auto shrink-0 cursor-pointer text-center flex flex-col items-center gap-2 group"
                        >
                          <SafeImage
                            src={artist.thumbnail}
                            alt={artist.name}
                            useBase64
                            className="w-28 h-28 rounded-full object-cover bg-neutral-800 shadow-lg group-hover:scale-105 transition-transform"
                          />
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate w-full">
                            {artist.name}
                          </h4>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Songs */}
                {resultsAll.songs.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-red-500" />
                        <span>楽曲</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFilter('song')}
                        className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                      >
                        すべて見る
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {resultsAll.songs.slice(0, 6).map((track) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isLiked = likedTrackIds.has(track.id);
                        return (
                          <div
                            key={track.id}
                            onClick={() => playTrack(track, resultsAll.songs)}
                            className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
                              isCurrent ? 'bg-white/5' : ''
                            }`}
                          >
                            <SafeImage
                              src={track.thumbnail}
                              alt={track.title}
                              useBase64
                              className="w-12 h-12 rounded object-cover bg-neutral-800 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                                {track.title}
                              </p>
                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                曲 · {track.artist}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLikeTrack(track);
                                }}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-red-500 cursor-pointer"
                                title="お気に入り"
                              >
                                <Heart className={`w-4.5 h-4.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAddToPlaylistModal(track);
                                }}
                                className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                                title="プレイリストに追加"
                              >
                                <ListPlus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToQueue(track);
                                  showToast(`「${track.title}」をキューに追加しました`, 'info', 2000);
                                }}
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                                title="キューに追加"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Albums */}
                {resultsAll.albums.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Disc className="w-4 h-4 text-red-500" />
                        <span>アルバム</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFilter('album')}
                        className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                      >
                        すべて見る
                      </button>
                    </div>
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3.5 overflow-x-auto md:overflow-visible pb-2 scrollbar-none">
                      {resultsAll.albums.map((album) => {
                        const isLikedAlbum = likedAlbumIds.has(album.id);
                        return (
                          <div
                            key={album.id}
                            onClick={() => navigateTo('album', album.id)}
                            className="group w-36 sm:w-40 md:w-auto shrink-0 cursor-pointer flex flex-col gap-2"
                          >
                            <div className="aspect-square rounded-md overflow-hidden bg-neutral-800 relative">
                              <SafeImage
                                src={album.thumbnail}
                                alt={album.title}
                                useBase64
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLikeAlbum(album);
                                }}
                                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                  isLikedAlbum
                                    ? 'bg-black/75 text-red-500 opacity-100'
                                    : 'bg-black/60 text-white/80 hover:text-red-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                                }`}
                                title={isLikedAlbum ? 'お気に入り解除' : 'お気に入りに追加'}
                              >
                                <Heart className={`w-4 h-4 ${isLikedAlbum ? 'fill-red-500 text-red-500' : ''}`} />
                              </button>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">{album.title}</h4>
                              <p className="text-[11px] text-neutral-400 truncate">アルバム · {album.artist}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Playlists */}
                {resultsAll.playlists.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-red-500" />
                        <span>プレイリスト</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFilter('playlist')}
                        className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                      >
                        すべて見る
                      </button>
                    </div>
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-6 gap-3.5 overflow-x-auto md:overflow-visible pb-2 scrollbar-none">
                      {resultsAll.playlists.map((pl) => {
                        const isLikedPl = likedPlaylistIds.has(pl.id);
                        return (
                          <div
                            key={pl.id}
                            onClick={() => navigateTo('album', pl.id)}
                            className="group w-36 sm:w-40 md:w-auto shrink-0 cursor-pointer flex flex-col gap-2"
                          >
                            <div className="aspect-square rounded-md overflow-hidden bg-neutral-800 relative">
                              <SafeImage
                                src={pl.thumbnail}
                                alt={pl.title}
                                useBase64
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLikePlaylist(pl);
                                }}
                                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                  isLikedPl
                                    ? 'bg-black/75 text-red-500 opacity-100'
                                    : 'bg-black/60 text-white/80 hover:text-red-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                                }`}
                                title={isLikedPl ? 'お気に入り解除' : 'お気に入りに追加'}
                              >
                                <Heart className={`w-4 h-4 ${isLikedPl ? 'fill-red-500 text-red-500' : ''}`} />
                              </button>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">{pl.title}</h4>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {pl.author || 'プレイリスト'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Videos */}
                {resultsAll.videos.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Tv className="w-4 h-4 text-red-500" />
                        <span>ミュージックビデオ</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFilter('video')}
                        className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                      >
                        すべて見る
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {resultsAll.videos.map((vid) => (
                        <div
                          key={vid.id}
                          onClick={() => playTrack(vid)}
                          className="cursor-pointer flex flex-col gap-2 group"
                        >
                          <div className="aspect-video rounded-md overflow-hidden bg-neutral-800 relative">
                            <SafeImage
                              src={vid.thumbnail}
                              alt={vid.title}
                              useBase64
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-7 h-7 fill-white text-white" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{vid.title}</h4>
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
            /* Filtered Mode */
            <div>
              {resultsFiltered.length === 0 ? (
                <div className="py-20 text-center text-sm text-neutral-500">
                  該当する結果が見つかりませんでした。
                </div>
              ) : filter === 'song' ? (
                <div className="space-y-0.5">
                  {resultsFiltered.map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isLiked = likedTrackIds.has(track.id);
                    return (
                      <div
                        key={track.id}
                        onClick={() => playTrack(track, resultsFiltered)}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
                          isCurrent ? 'bg-white/5' : ''
                        }`}
                      >
                        <SafeImage
                          src={track.thumbnail}
                          alt={track.title}
                          useBase64
                          className="w-12 h-12 rounded object-cover bg-neutral-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-red-500' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeTrack(track);
                            }}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-red-500 cursor-pointer"
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
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
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
                      className="cursor-pointer text-center flex flex-col items-center gap-2.5 group"
                    >
                      <SafeImage
                        src={artist.thumbnail}
                        alt={artist.name}
                        useBase64
                        className="w-28 h-28 rounded-full object-cover shadow-lg bg-neutral-800 group-hover:scale-105 transition-transform"
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
                  {resultsFiltered.map((item) => {
                    const isPl = filter === 'playlist';
                    const isAlbum = filter === 'album';
                    const isLikedCard = isPl
                      ? likedPlaylistIds.has(item.id)
                      : isAlbum
                      ? likedAlbumIds.has(item.id)
                      : false;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isAlbum || isPl) navigateTo('album', item.id);
                          else if (filter === 'video') playTrack(item);
                        }}
                        className="cursor-pointer flex flex-col gap-2 group"
                      >
                        <div className="aspect-square rounded-md overflow-hidden bg-neutral-800 relative">
                          <SafeImage
                            src={item.thumbnail}
                            alt={item.title}
                            useBase64
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {(isAlbum || isPl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPl) toggleLikePlaylist(item);
                                else toggleLikeAlbum(item);
                              }}
                              className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                isLikedCard
                                  ? 'bg-black/75 text-red-500 opacity-100'
                                  : 'bg-black/60 text-white/80 hover:text-red-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
                              }`}
                              title={isLikedCard ? 'お気に入り解除' : 'お気に入りに追加'}
                            >
                              <Heart className={`w-4 h-4 ${isLikedCard ? 'fill-red-500 text-red-500' : ''}`} />
                            </button>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h4>
                          <p className="text-[11px] text-neutral-400 truncate">{item.artist || item.author}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
