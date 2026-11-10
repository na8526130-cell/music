import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { ExploreData, Track, OriconTrack } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import { getOfflineMeta, saveOfflineMeta } from '../services/offlineStorage';
import {
  Play,
  Flame,
  Disc,
  Radio,
  Plus,
  Heart,
  Loader2,
  Tv,
  ArrowRight,
  Sparkles,
  Crown,
  Trophy,
  Headphones,
  Download,
  TrendingUp,
  WifiOff,
  FolderDown,
  Settings,
  BarChart2,
  ListMusic,
} from 'lucide-react';

export const HomeExploreView: React.FC = () => {
  const {
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    currentTrack,
    isPlaying,
    navigateTo,
    setSearchQuery,
    setInspectorOpen,
    startRadioForTrack,
    setPlayerMode,
    setVideoLayout,
    setWrappedModalOpen,
    listeningStats,
  } = usePlayer();

  const [data, setData] = useState<ExploreData | null>(null);
  const [higedanData, setHigedanData] = useState<{
    artist: string;
    tagline: string;
    songs: Track[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Oricon Chart States
  const [oriconType, setOriconType] = useState<'streaming' | 'digital'>('streaming');
  const [oriconList, setOriconList] = useState<OriconTrack[]>([]);
  const [oriconLoading, setOriconLoading] = useState(false);

  // Spotify Curated Playlists States
  const [spotifyCurated, setSpotifyCurated] = useState<any[]>([]);
  const [spotifyLoadingId, setSpotifyLoadingId] = useState<string | null>(null);
  const [expandedSpotifyPlaylist, setExpandedSpotifyPlaylist] = useState<any | null>(null);

  useEffect(() => {
    api
      .getSpotifyCurated()
      .then((res) => {
        if (res?.playlists) setSpotifyCurated(res.playlists);
      })
      .catch(() => {});
  }, []);

  const handlePlaySpotifyCurated = async (pl: any) => {
    setSpotifyLoadingId(pl.id);
    try {
      const full = await api.getSpotifyCuratedPlaylist(pl.id);
      if (full && full.tracks && full.tracks.length > 0) {
        playTrack(full.tracks[0], full.tracks);
        setExpandedSpotifyPlaylist(full);
      }
    } finally {
      setSpotifyLoadingId(null);
    }
  };

  const handleToggleSpotifyTracks = async (pl: any) => {
    if (expandedSpotifyPlaylist?.id === pl.id) {
      setExpandedSpotifyPlaylist(null);
      return;
    }
    setSpotifyLoadingId(pl.id);
    try {
      const full = await api.getSpotifyCuratedPlaylist(pl.id);
      if (full) {
        setExpandedSpotifyPlaylist(full);
      }
    } finally {
      setSpotifyLoadingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.getExplore(), api.getHigedanSpotlight().catch(() => null)])
      .then(([res, higedan]) => {
        if (active) {
          setData(res);
          saveOfflineMeta('cached_explore', res).catch(() => {});
          if (res.oriconRanking) {
            setOriconList(res.oriconRanking);
          }
          if (higedan) {
            setHigedanData(higedan);
            saveOfflineMeta('cached_higedan', higedan).catch(() => {});
          }
          setIsFromCache(false);
          setLoading(false);
        }
      })
      .catch(async (err) => {
        if (active) {
          console.warn('[HomeExploreView] Network request failed, loading offline cache:', err);
          const cachedExplore = await getOfflineMeta<ExploreData>('cached_explore');
          const cachedHigedan = await getOfflineMeta<any>('cached_higedan');
          if (cachedExplore && active) {
            setData(cachedExplore);
            if (cachedExplore.oriconRanking) {
              setOriconList(cachedExplore.oriconRanking);
            }
            if (cachedHigedan) {
              setHigedanData(cachedHigedan);
            }
            setIsFromCache(true);
            setError(null);
          } else if (active) {
            setError(err.message || 'ネットワークに接続されていません');
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSwitchOriconType = async (type: 'streaming' | 'digital') => {
    setOriconType(type);
    if (type === 'digital' && data?.oriconDigital && data.oriconDigital.length > 0) {
      setOriconList(data.oriconDigital);
      return;
    }
    if (type === 'streaming' && data?.oriconRanking && data.oriconRanking.length > 0) {
      setOriconList(data.oriconRanking);
      return;
    }

    setOriconLoading(true);
    try {
      const items = await api.getOriconRanking(type);
      setOriconList(items);
    } catch {
      // ignore
    } finally {
      setOriconLoading(false);
    }
  };

  const handleQuickGenreClick = (genre: string) => {
    setSearchQuery(genre);
    navigateTo('search');
  };

  const heroImage = '/src/assets/images/hero_ytmusic_curated_1793266769181.jpg';
  const tokyoNightImage = '/src/assets/images/genre_tokyo_nightpop_1793266768910.jpg';
  const lofiStudioImage = '/src/assets/images/genre_cyber_lofi_1793266769512.jpg';

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-white">音楽データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shadow-xl">
          <WifiOff className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">オフライン</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            保存済みのローカル音源はオフラインでもそのまま再生できます。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full justify-center">
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="w-full sm:w-auto px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-transform active:scale-95 cursor-pointer"
          >
            <FolderDown className="w-4 h-4" />
            <span>ローカル音源を開く</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors cursor-pointer"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Offline Cache Notice Banner */}
      {isFromCache && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>オフラインモード:</strong> キャッシュされたカタログを表示しています。
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="text-[11px] font-bold text-cyan-400 hover:underline shrink-0"
          >
            ローカル音源へ &rarr;
          </button>
        </div>
      )}

      {/* Spotify Top Greeting & Settings */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return 'おはようございます';
              if (hour >= 12 && hour < 18) return 'こんにちは';
              return 'こんばんは';
            })()}
          </h1>

          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="p-2 -mr-1 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            title="設定 / ライブラリ"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* 6-Card Quick Access Grid (Spotify Home Style matching Image 1) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              id: 'editorial',
              title: 'Editorial',
              thumbnail:
                higedanData?.songs[0]?.thumbnail ||
                heroImage,
              action: () => {
                navigateTo('album', 'MPREb_QCAGO0Lbeum');
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (higedanData?.songs && higedanData.songs.length > 0) {
                  playTrack(higedanData.songs[0], higedanData.songs);
                }
              },
            },
            {
              id: 'ballad',
              title: '髭男 バラード',
              thumbnail:
                higedanData?.songs[1]?.thumbnail ||
                tokyoNightImage,
              action: () => {
                navigateTo('album', 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr');
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (higedanData?.songs && higedanData.songs.length > 1) {
                  playTrack(higedanData.songs[1], higedanData.songs);
                }
              },
            },
            {
              id: 'love-peace',
              title: 'ラブとピースは君の中',
              thumbnail:
                higedanData?.songs[2]?.thumbnail ||
                lofiStudioImage,
              action: () => {
                navigateTo('album', 'MPREb_lvUlrlxInIt');
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (higedanData?.songs && higedanData.songs.length > 2) {
                  playTrack(higedanData.songs[2], higedanData.songs);
                }
              },
            },
            {
              id: 'higedan-artist',
              title: 'Official髭男dism',
              thumbnail:
                higedanData?.songs[0]?.thumbnail ||
                heroImage,
              action: () => {
                if (higedanData?.songs && higedanData.songs[0]?.artistId) {
                  navigateTo('artist', higedanData.songs[0].artistId);
                } else {
                  navigateTo('artist', 'UC84Rm0a3gimYXPtqp5O_JRw');
                }
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (higedanData?.songs && higedanData.songs.length > 0) {
                  playTrack(higedanData.songs[0], higedanData.songs);
                }
              },
            },
            {
              id: 'liked-songs',
              title: 'お気に入りの曲',
              isLikedCard: true,
              thumbnail: '',
              action: () => {
                navigateTo('library');
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                navigateTo('library');
              },
            },
            {
              id: 'oricon-top',
              title: 'オリコン週間ランキング',
              thumbnail:
                oriconList[0]?.thumbnail ||
                heroImage,
              action: () => {
                const el = document.getElementById('oricon-ranking-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              },
              onPlayClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (oriconList.length > 0) {
                  playTrack(oriconList[0], oriconList);
                }
              },
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={item.action}
              className="group relative bg-[#18181c]/90 hover:bg-[#25252c] transition-all rounded-lg overflow-hidden flex items-center gap-3 cursor-pointer border border-white/5 hover:border-red-600/40 shadow-md pr-2 sm:pr-3"
            >
              {item.isLikedCard ? (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-l-lg bg-gradient-to-br from-red-600 via-rose-700 to-neutral-900 flex items-center justify-center text-white shrink-0 shadow">
                  <Heart className="w-6 h-6 fill-white" />
                </div>
              ) : (
                <SafeImage
                  src={item.thumbnail}
                  alt={item.title}
                  useBase64
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover shrink-0 rounded-l-lg bg-neutral-800"
                />
              )}

              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                  {item.title}
                </h3>
              </div>

              {/* Hover Floating Red Play Button (Spotify style) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={item.onPlayClick}
                  className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  title="再生"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 人気の Radio Section (Spotify Radio Cards matching Image 1) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>人気の Radio</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            {
              id: 'higedan-radio',
              title: 'Official髭男dism Radio',
              station: 'Official髭男dism',
              bgGradient: 'from-[#3a060a] via-[#1a0204] to-[#0a0102]',
              avatar: higedanData?.songs[0]?.thumbnail || heroImage,
              action: () => {
                if (higedanData?.songs && higedanData.songs.length > 0) {
                  startRadioForTrack(higedanData.songs[0]);
                }
              },
            },
            {
              id: 'jpop-radio',
              title: 'J-POP Hits Radio',
              station: 'J-POP',
              bgGradient: 'from-[#38070c] via-[#170204] to-[#0a0102]',
              avatar: oriconList[0]?.thumbnail || heroImage,
              action: () => {
                if (oriconList.length > 0) {
                  startRadioForTrack(oriconList[0]);
                }
              },
            },
            {
              id: 'vaundy-radio',
              title: 'Vaundy Radio',
              station: 'Vaundy',
              bgGradient: 'from-[#42090e] via-[#1a0305] to-[#0a0102]',
              avatar: tokyoNightImage,
              action: () => handleQuickGenreClick('Vaundy'),
            },
            {
              id: 'king-gnu-radio',
              title: 'King Gnu Radio',
              station: 'King Gnu',
              bgGradient: 'from-[#320609] via-[#150204] to-[#0a0102]',
              avatar: lofiStudioImage,
              action: () => handleQuickGenreClick('King Gnu'),
            },
            {
              id: 'yuuri-radio',
              title: '優里 Radio',
              station: '優里',
              bgGradient: 'from-[#3d080d] via-[#180204] to-[#0a0102]',
              avatar: oriconList[1]?.thumbnail || heroImage,
              action: () => handleQuickGenreClick('優里'),
            },
            {
              id: 'yoasobi-radio',
              title: 'YOASOBI Radio',
              station: 'YOASOBI',
              bgGradient: 'from-[#460910] via-[#1d0306] to-[#0a0102]',
              avatar: oriconList[2]?.thumbnail || heroImage,
              action: () => handleQuickGenreClick('YOASOBI'),
            },
          ].map((station) => (
            <div
              key={station.id}
              onClick={station.action}
              className={`group relative aspect-[3/4] bg-gradient-to-b ${station.bgGradient} border border-red-950/40 rounded-2xl p-3 flex flex-col justify-between cursor-pointer hover:border-red-600/40 hover:shadow-2xl hover:shadow-red-950/40 transition-all overflow-hidden`}
            >
              {/* Radio Header Tag */}
              <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-red-400 font-mono">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-500" />
                  <span>RADIO</span>
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px]">
                  ▶
                </span>
              </div>

              {/* Circular Artist Collage (Spotify Radio Iconic Layout) */}
              <div className="my-auto relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-red-600/20 blur-xl group-hover:scale-125 transition-transform" />
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-red-500/30 shadow-xl relative z-10">
                  <SafeImage
                    src={station.avatar}
                    alt={station.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Station Label */}
              <div className="space-y-0.5 relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                  {station.station}
                </h4>
                <p className="text-[10px] text-neutral-400 truncate">
                  ステーション
                </p>
              </div>

              {/* Floating Play Button */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl">
                <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spotify Wrapped / リスニング記録 バナー */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#240407] via-[#120204] to-black border border-red-900/40 p-5 sm:p-6 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-radial from-red-600/15 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-xl shadow-red-600/30 shrink-0">
              <BarChart2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider">
                  Spotify Wrapped
                </span>
                <span className="text-xs text-neutral-400">あなただけのパーソナル分析</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                あなたのリスニング記録 & ストーリー
              </h3>
              <p className="text-xs text-neutral-400">
                総再生時間: <span className="text-white font-mono font-bold">{listeningStats.totalMinutesListened}分</span> · 
                聴いた曲数: <span className="text-white font-mono font-bold">{listeningStats.totalPlayedTracks}曲</span>
                {listeningStats.topArtists.length > 0 && (
                  <> · 最も聴いたアーティスト: <span className="text-red-400 font-bold">{listeningStats.topArtists[0].artist}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setWrappedModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>Wrappedを開く</span>
            </button>
          </div>
        </div>
      </section>

      {/* Spotify あなた専用の Daily Mix (Made for You) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>あなた専用の Daily Mix</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                MADE FOR YOU
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              あなたの好みに合わせた日替わりミックスプレイリスト
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[
            {
              id: 'daily-mix-1',
              mixNum: 1,
              title: 'Daily Mix 1',
              genre: 'J-POP & ピアノポップ',
              artists: ['Official髭男dism', 'Vaundy', '優里'],
              targetAlbum: 'MPREb_QCAGO0Lbeum', // Editorial
              bgTop: 'bg-[#3b080d]',
              border: 'border-red-950/60 hover:border-red-600/50',
              avatar: higedanData?.songs[0]?.thumbnail || heroImage,
            },
            {
              id: 'daily-mix-2',
              mixNum: 2,
              title: 'Daily Mix 2',
              genre: 'エレクトロ & アニメソング',
              artists: ['YOASOBI', 'Ado', 'Eve'],
              targetAlbum: 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr',
              bgTop: 'bg-[#2d070b]',
              border: 'border-red-950/60 hover:border-red-600/50',
              avatar: oriconList[0]?.thumbnail || tokyoNightImage,
            },
            {
              id: 'daily-mix-3',
              mixNum: 3,
              title: 'Daily Mix 3',
              genre: 'オルタナティブ & ロック',
              artists: ['米津玄師', 'King Gnu', '藤井 風'],
              targetAlbum: 'MPREb_lvUlrlxInIt',
              bgTop: 'bg-[#36090e]',
              border: 'border-red-950/60 hover:border-red-600/50',
              avatar: oriconList[1]?.thumbnail || lofiStudioImage,
            },
            {
              id: 'daily-mix-4',
              mixNum: 4,
              title: 'Daily Mix 4',
              genre: '深夜チル & R&B/City Pop',
              artists: ['iri', '宇多田ヒカル', 'Vaundy'],
              targetAlbum: 'MPREb_QCAGO0Lbeum',
              bgTop: 'bg-[#250508]',
              border: 'border-red-950/60 hover:border-red-600/50',
              avatar: tokyoNightImage,
            },
          ].map((mix) => (
            <div
              key={mix.id}
              onClick={() => navigateTo('album', mix.targetAlbum)}
              className={`group relative rounded-2xl overflow-hidden border ${mix.border} bg-[#0e0e12] flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-red-950/40 transition-all hover:scale-[1.01] active:scale-[0.99]`}
            >
              {/* Top Half (Spotify Two-Tone Split Layout) */}
              <div className={`${mix.bgTop} p-4 pb-6 relative overflow-hidden flex flex-col justify-between h-32`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-red-300 tracking-wider">
                    DAILY MIX
                  </span>
                  <div className="flex items-center gap-0.5 text-red-400">
                    <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-red-500 rounded-full" />
                    <span className="w-1 h-2 bg-red-400 rounded-full" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                    Daily Mix {mix.mixNum}
                  </h3>
                  <p className="text-[11px] text-red-200/80 font-medium mt-1">
                    {mix.genre}
                  </p>
                </div>

                {/* Subtle dark gradient overlay to blend into bottom */}
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0e0e12] to-transparent pointer-events-none" />
              </div>

              {/* Bottom Half */}
              <div className="p-4 bg-[#0e0e12] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-neutral-800">
                    <SafeImage
                      src={mix.avatar}
                      alt={mix.title}
                      useBase64
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-300 font-medium truncate">
                      {mix.artists.join(', ')}
                    </p>
                    <p className="text-[10px] text-neutral-500">クリックして曲一覧を表示</p>
                  </div>
                </div>
              </div>

              {/* Floating Spotify Red Play Button */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (higedanData?.songs && higedanData.songs.length > 0) {
                      playTrack(higedanData.songs[mix.mixNum - 1] || higedanData.songs[0], higedanData.songs);
                    } else if (oriconList.length > 0) {
                      playTrack(oriconList[mix.mixNum - 1] || oriconList[0], oriconList);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  title="今すぐ再生"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spotify "This Is" アーティスト特選シリーズ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>This Is アーティスト特選シリーズ</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                THIS IS
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Spotify公式スタイルのアーティスト別ベスト盤コレクション
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            {
              id: 'this-is-higedan',
              artist: 'Official髭男dism',
              artistId: 'UC84Rm0a3gimYXPtqp5O_JRw',
              targetAlbum: 'MPREb_QCAGO0Lbeum',
              avatar: higedanData?.songs[0]?.thumbnail || heroImage,
              bg: 'from-[#3a060a] to-[#0c0203]',
            },
            {
              id: 'this-is-vaundy',
              artist: 'Vaundy',
              artistId: 'UCB47iN_LgJgE6f4r2RzJ22A',
              targetAlbum: 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr',
              avatar: tokyoNightImage,
              bg: 'from-[#42090e] to-[#0c0203]',
            },
            {
              id: 'this-is-yoasobi',
              artist: 'YOASOBI',
              artistId: 'UCvpredjG93ifbCP1Y77JyFA',
              targetAlbum: 'MPREb_lvUlrlxInIt',
              avatar: oriconList[0]?.thumbnail || heroImage,
              bg: 'from-[#38070c] to-[#0c0203]',
            },
            {
              id: 'this-is-yonezu',
              artist: '米津玄師',
              artistId: 'UCvg_HS4OmwzbPdVU95q56DA',
              targetAlbum: 'MPREb_QCAGO0Lbeum',
              avatar: oriconList[1]?.thumbnail || lofiStudioImage,
              bg: 'from-[#320609] to-[#0c0203]',
            },
            {
              id: 'this-is-ado',
              artist: 'Ado',
              artistId: 'UC4W_o136zD1sWvK2i_0Sj_Q',
              targetAlbum: 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr',
              avatar: oriconList[2]?.thumbnail || heroImage,
              bg: 'from-[#3d080d] to-[#0c0203]',
            },
            {
              id: 'this-is-king-gnu',
              artist: 'King Gnu',
              artistId: 'UC0k5PqL_wY3fH_N08dM5e_w',
              targetAlbum: 'MPREb_lvUlrlxInIt',
              avatar: tokyoNightImage,
              bg: 'from-[#2e0508] to-[#0c0203]',
            },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.artistId) {
                  navigateTo('artist', item.artistId);
                } else {
                  navigateTo('album', item.targetAlbum);
                }
              }}
              className={`group relative aspect-[3/4] bg-gradient-to-b ${item.bg} border border-red-950/40 rounded-2xl p-3 flex flex-col justify-between cursor-pointer hover:border-red-600/50 hover:shadow-2xl hover:shadow-red-950/40 transition-all overflow-hidden`}
            >
              {/* Spotify "This Is" Minimal Header */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-widest text-red-400 font-mono">
                  THIS IS
                </span>
                <h4 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                  {item.artist}
                </h4>
              </div>

              {/* Square / Rounded Artist Image */}
              <div className="my-auto relative aspect-square rounded-xl overflow-hidden bg-neutral-800 shadow-xl border border-white/10">
                <SafeImage
                  src={item.avatar}
                  alt={item.artist}
                  useBase64
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Action hint */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                <span>曲一覧を見る</span>
                <span className="text-white group-hover:translate-x-0.5 transition-transform">→</span>
              </div>

              {/* Hover Floating Play */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.artistId) {
                      navigateTo('artist', item.artistId);
                    } else {
                      navigateTo('album', item.targetAlbum);
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  title="開く"
                >
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Moods & Quick Genres */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>気分とジャンル (Moods & Genres)</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => handleQuickGenreClick('Official髭男dism')}
            className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-200 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>Official髭男dism</span>
          </button>
          {[
            'J-POP ヒット',
            'Tokyo City Pop',
            'Anime OST',
            'Lofi & Chill',
            'Workout Energy',
            'Focus Study',
            'Rock & Alternative',
            'R&B & Soul',
            'Vocaloid / ボカロ',
          ].map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => handleQuickGenreClick(genre)}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Official髭男dism Special Spotlight Section */}
      {higedanData && higedanData.songs.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#160204] via-black to-[#160204] border border-red-900/40 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-600/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              {higedanData.songs[0]?.thumbnail ? (
                <SafeImage
                  src={higedanData.songs[0].thumbnail}
                  alt={higedanData.artist}
                  useBase64
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-red-500/30 shadow-xl shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-300 font-bold shrink-0 text-lg">
                  髭男
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    おすすめ特選アーティスト
                  </span>
                  <span className="text-xs text-neutral-400">{higedanData.artist}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Official髭男dism 特選ヒット・コレクション
                </h2>
                <p className="text-xs text-neutral-300 line-clamp-1 max-w-xl">
                  {higedanData.tagline || 'Pretender, Subtitle, Mixed Nuts, Cry Baby などの大ヒット曲を厳選'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => navigateTo('artist', higedanData.songs[0]?.artistId || 'UC84Rm0a3gimYXPtqp5O_JRw')}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="アルバム・楽曲一覧を表示"
              >
                <Disc className="w-4 h-4 text-red-400" />
                <span>アルバム一覧</span>
              </button>
              <button
                type="button"
                onClick={() => playTrack(higedanData.songs[0], higedanData.songs)}
                className="px-4 py-2.5 bg-white text-black font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 hover:bg-neutral-200 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>全曲再生</span>
              </button>
              <button
                type="button"
                onClick={() => startRadioForTrack(higedanData.songs[0])}
                className="px-4 py-2.5 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-red-300" />
                <span>髭男ラジオ</span>
              </button>
            </div>
          </div>

          {/* Tracks grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {higedanData.songs.slice(0, 9).map((track, i) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);
              return (
                <div
                  key={track.id || i}
                  onClick={() => playTrack(track, higedanData.songs)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                    isCurrent
                      ? 'bg-red-950/40 border-red-500/50 shadow-md'
                      : 'bg-neutral-900/50 border-neutral-800/80 hover:bg-neutral-800/70 hover:border-neutral-700'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                    <SafeImage
                      src={track.thumbnail}
                      alt={track.title}
                      useBase64
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-amber-400 font-bold' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {track.artist || 'Official髭男dism'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-white/10 transition-colors"
                      title={isLiked ? 'いいね解除' : 'いいね'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      title="キューに追加"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Curated Bento Feature Split: Tokyo City Pop & Cyber Lofi */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          onClick={() => handleQuickGenreClick('Japanese City Pop 80s 90s')}
          className="group relative rounded-2xl overflow-hidden border border-neutral-800 h-64 sm:h-72 cursor-pointer shadow-xl transition-all hover:border-neutral-700"
        >
          <img
            src={tokyoNightImage}
            alt="Tokyo Nightpop"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 p-6 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
              特集
            </span>
            <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
              Tokyo Night City Pop & Retro Vibes
            </h3>
            <p className="text-xs text-neutral-300 line-clamp-2">
              ネオン煌めく東京の夜を彩るシティポップと最新J-POPの名曲コレクション。
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white pt-1">
              <span>プレイリストを探索</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        <div
          onClick={() => handleQuickGenreClick('Lofi Hip Hop Chill Study')}
          className="group relative rounded-2xl overflow-hidden border border-neutral-800 h-64 sm:h-72 cursor-pointer shadow-xl transition-all hover:border-neutral-700"
        >
          <img
            src={lofiStudioImage}
            alt="Cyber Lofi Studio"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 p-6 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
              特集
            </span>
            <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
              Nocturnal Studio & Deep Focus Beats
            </h3>
            <p className="text-xs text-neutral-300 line-clamp-2">
              作業効率や深夜の作業に寄り添う心地よいローファイ・ビートとアンビエント。
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white pt-1">
              <span>ステーションを再生</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Oricon Weekly Ranking Section (公式オリコンランキング) */}
      <section id="oricon-ranking-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black border border-red-500/30 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black shadow-lg shadow-red-600/25 shrink-0">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>オリコン週間ランキング</span>
                  <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider">
                    ORICON
                  </span>
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {oriconType === 'streaming' ? 'ストリーミング再生数' : 'デジタルシングル'}ランキング
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Type Tabs */}
            <div className="flex items-center bg-black/80 border border-neutral-800 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => handleSwitchOriconType('streaming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  oriconType === 'streaming'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>ストリーミング</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchOriconType('digital')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  oriconType === 'digital'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>デジタルDL</span>
              </button>
            </div>

            {/* Play All button */}
            {oriconList.length > 0 && (
              <button
                type="button"
                onClick={() => playTrack(oriconList[0], oriconList)}
                className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
                title="オリコンランキングを全曲連続再生"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>全曲再生</span>
              </button>
            )}
          </div>
        </div>

        {oriconLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400 bg-neutral-900/30 rounded-2xl border border-neutral-800/60">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-xs">最新のオリコンランキングを取得中...</p>
          </div>
        ) : oriconList.length > 0 ? (
          <div className="space-y-4">
            {/* Top 3 Podium Spotlight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {oriconList.slice(0, 3).map((item, idx) => {
                const isCurrent = currentTrack?.id === item.id;
                const medalGradients = [
                  'from-red-600/25 via-red-950/20 to-neutral-950 border-red-500/50 shadow-red-950/40',
                  'from-neutral-500/20 via-neutral-900/20 to-neutral-950 border-neutral-600/40 shadow-neutral-950/30',
                  'from-rose-950/30 via-neutral-950 to-neutral-950 border-red-900/40 shadow-black',
                ];
                const medalBadges = [
                  'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-red-600/40',
                  'bg-gradient-to-r from-neutral-200 to-neutral-400 text-black shadow-neutral-500/30',
                  'bg-gradient-to-r from-red-900 to-rose-950 text-white shadow-red-950/30 border border-red-700/40',
                ];

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => playTrack(item, oriconList)}
                    className={`relative p-3.5 rounded-2xl border bg-gradient-to-b ${medalGradients[idx]} transition-all cursor-pointer group flex flex-col justify-between gap-3 overflow-hidden shadow-lg hover:scale-[1.01] active:scale-[0.99] ${
                      isCurrent ? 'ring-2 ring-red-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-md flex items-center gap-1 ${medalBadges[idx]}`}>
                          <Trophy className="w-3 h-3" />
                          <span>#{item.rank || idx + 1}</span>
                        </span>
                        {item.metric && (
                          <span className="text-[10px] font-mono font-bold text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-md truncate max-w-[170px]">
                            {item.metric}
                          </span>
                        )}
                      </div>

                      {/* MV Quick Play Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(item, oriconList);
                          setPlayerMode('video');
                          setVideoLayout('theater');
                        }}
                        className="px-2 py-1 bg-black/60 hover:bg-red-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors border border-white/10 cursor-pointer"
                        title="ミュージックビデオ（MV）で観る"
                      >
                        <Tv className="w-3 h-3 text-red-400 group-hover:text-white" />
                        <span>MV</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/10 shadow-md">
                        <SafeImage
                          src={item.thumbnail}
                          alt={item.title}
                          useBase64
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-extrabold text-white truncate group-hover:text-red-400 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                          {item.artist}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ranks 4 to 10 in a clean ranked list */}
            {oriconList.length > 3 && (
              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
                {oriconList.slice(3, 10).map((item, idx) => {
                  const isCurrent = currentTrack?.id === item.id;
                  const isLiked = likedTrackIds.has(item.id);

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => playTrack(item, oriconList)}
                      className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors cursor-pointer ${
                        isCurrent ? 'bg-red-950/30' : ''
                      }`}
                    >
                      <span className="w-7 text-center text-xs font-mono font-bold text-neutral-500 group-hover:text-red-400 tabular-nums">
                        #{item.rank || idx + 4}
                      </span>

                      <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-neutral-800">
                        <SafeImage
                          src={item.thumbnail}
                          alt={item.title}
                          useBase64
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isCurrent ? 'text-red-400 font-bold' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                          {item.artist}
                        </p>
                      </div>

                      {item.metric && (
                        <span className="hidden md:inline-block text-[11px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 truncate">
                          {item.metric}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(item, oriconList);
                            setPlayerMode('video');
                            setVideoLayout('theater');
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                          title="MVで観る"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLikeTrack(item);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-white/10 transition-colors"
                          title={isLiked ? 'いいね解除' : 'いいね'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(item);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          title="キューに追加"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Spotify Curated Playlists & Charts Section */}
      {spotifyCurated.length > 0 && (
        <section id="spotify-curated-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black border border-red-500/30 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-lg shadow-red-600/25 shrink-0">
                <Disc className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Spotify プレイリスト</span>
                    <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider">
                      SPOTIFY
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  人気プレイリストと最新ヒット
                </p>
              </div>
            </div>
          </div>

          {/* Curated Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {spotifyCurated.map((pl) => {
              const isLoading = spotifyLoadingId === pl.id;
              const isExpanded = expandedSpotifyPlaylist?.id === pl.id;

              return (
                <div
                  key={pl.id}
                  className={`group relative bg-neutral-900/60 border rounded-2xl p-3 flex flex-col justify-between transition-all hover:bg-neutral-800/80 hover:border-red-500/40 hover:shadow-xl hover:shadow-red-950/30 ${
                    isExpanded
                      ? 'border-red-500 bg-neutral-900 ring-1 ring-red-500'
                      : 'border-neutral-800/80'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Thumbnail with overlay play */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-800 shadow">
                      <SafeImage
                        src={pl.thumbnail}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => handlePlaySpotifyCurated(pl)}
                        disabled={isLoading}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        title="このプレイリストを今すぐ再生"
                      >
                        <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-transform">
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Metadata */}
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                          {pl.title}
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">
                          {pl.trackCount}曲
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-snug">
                        {pl.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-3 mt-2 border-t border-neutral-800/60">
                    <button
                      type="button"
                      onClick={() => handlePlaySpotifyCurated(pl)}
                      disabled={isLoading}
                      className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>再生</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSpotifyTracks(pl)}
                      className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                        isExpanded
                          ? 'bg-neutral-800 text-white border-red-500/50'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700/60 hover:border-neutral-600 hover:text-white'
                      }`}
                    >
                      {isExpanded ? '閉じる' : '曲一覧'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Expanded Tracklist Drawer */}
          {expandedSpotifyPlaylist && (
            <div className="p-4 sm:p-5 bg-neutral-900/90 border border-red-500/30 rounded-2xl space-y-3 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow">
                    <SafeImage
                      src={expandedSpotifyPlaylist.thumbnail}
                      alt={expandedSpotifyPlaylist.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{expandedSpotifyPlaylist.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                        {expandedSpotifyPlaylist.tracks?.length || 0}曲
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">{expandedSpotifyPlaylist.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {expandedSpotifyPlaylist.tracks?.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        playTrack(
                          expandedSpotifyPlaylist.tracks[0],
                          expandedSpotifyPlaylist.tracks
                        )
                      }
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>全曲再生</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedSpotifyPlaylist(null)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Tracks table */}
              <div className="divide-y divide-neutral-800/60 max-h-80 overflow-y-auto scrollbar-thin">
                {expandedSpotifyPlaylist.tracks?.map((track: any, idx: number) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => playTrack(track, expandedSpotifyPlaylist.tracks)}
                      className={`flex items-center gap-3 py-2 px-2 hover:bg-neutral-800/50 rounded-lg group transition-colors cursor-pointer ${
                        isCurrent ? 'bg-red-950/30' : ''
                      }`}
                    >
                      <span className="text-xs font-mono text-neutral-500 w-5 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded overflow-hidden bg-neutral-800 shrink-0">
                        <SafeImage
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCurrent ? 'text-red-400 font-bold' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                        {track.duration}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(track);
                        }}
                        className="p-1 text-neutral-400 hover:text-white"
                        title="キューに追加"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Trending Songs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">急上昇 & トレンド楽曲</h2>
              <p className="text-xs text-neutral-400">今もっとも聴かれているトップ楽曲</p>
            </div>
          </div>

          {data?.trending && data.trending.length > 0 && (
            <button
              type="button"
              onClick={() => playTrack(data.trending[0], data.trending)}
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <span>すべて再生</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
          {data?.trending && data.trending.length > 0 ? (
            data.trending.slice(0, 10).map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500 tabular-nums">
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
                      onClick={() => playTrack(track, data.trending)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => playTrack(track, data.trending)}
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
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                      title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => addToQueue(track)}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                      title="キューに追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-mono text-neutral-400 w-10 text-right tabular-nums">
                      {track.duration || '--:--'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500">
              トレンド曲が読み込めませんでした
            </div>
          )}
        </div>
      </section>

      {/* New Releases Carousel / Grid */}
      {data?.newReleases && data.newReleases.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                <Disc className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">注目の最新リリース</h2>
                <p className="text-xs text-neutral-400">新着アルバム・シングル</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.newReleases.slice(0, 12).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.id) {
                    navigateTo('album', item.id);
                  }
                }}
                className="group p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl transition-all cursor-pointer flex flex-col gap-2"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {item.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Music Videos Section */}
      {data?.musicVideos && data.musicVideos.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">注目のミュージックビデオ</h2>
                <p className="text-xs text-neutral-400">ミュージックビデオ</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.musicVideos.slice(0, 8).map((vid) => (
              <div
                key={vid.id}
                onClick={() => {
                  playTrack(vid);
                  setPlayerMode('video');
                  setVideoLayout('theater');
                }}
                className="group p-2.5 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl transition-all cursor-pointer flex flex-col gap-2"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-800">
                  <img
                    src={vid.thumbnail}
                    alt={vid.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                  {vid.views && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-neutral-300 font-mono">
                      {vid.views}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {vid.artist}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
