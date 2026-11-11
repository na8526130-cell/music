import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { ExploreData, Track, OriconTrack } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import { getOfflineMeta, saveOfflineMeta } from '../services/offlineStorage';
import {
  Play,
  Disc,
  Radio,
  Plus,
  Heart,
  Loader2,
  Tv,
  WifiOff,
  FolderDown,
  Settings,
  Flame,
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
    startRadioForTrack,
    setPlayerMode,
    setVideoLayout,
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
  const [oriconList, setOriconList] = useState<OriconTrack[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.getExplore(), api.getHigedanSpotlight().catch(() => null)])
      .then(([res, higedan]) => {
        if (!active) return;
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
      })
      .catch(async (err) => {
        if (!active) return;
        console.warn('[HomeExploreView] Loading offline cache:', err);
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
          setError(err.message || '読み込みに失敗しました');
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'おはようございます';
    if (hour >= 12 && hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  // Featured Albums matching Spotify layout in reference image
  const featuredAlbums = [
    {
      id: 'MPREb_QCAGO0Lbeum',
      title: 'Editorial',
      artist: 'Official髭男dism',
      thumbnail:
        'https://yt3.googleusercontent.com/zZy89DQBNNe9nMoOeR-xiJKiINPI1Y1YzePRO2Fwt4pj20Tm_FkBHnQODMAoxapzaT_tiSacaKR3TiVb=w544-h544-s-l90-rj',
    },
    {
      id: 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr',
      title: '髭男 バラード',
      artist: 'Official髭男dism',
      thumbnail:
        'https://yt3.googleusercontent.com/_QkISoahOqF00bUAvG3XhY1zWTBI_IDWtDP2NN9waMIh64ehHX2V5BD1i36gA2eP7vj1z7M54=w544-h544-l90-rj',
    },
    {
      id: 'MPREb_lvUlrlxInIt',
      title: 'ラブとピースは君の中',
      artist: 'Official髭男dism',
      thumbnail:
        'https://yt3.googleusercontent.com/I5rbAVpj4T33O8YLLoxUUXMryMtRZW5z8LkVjWV0SGo9a=w544-h544-s-l90-rj',
    },
    {
      id: 'MPREb_9XoC3Flm4Rv',
      title: 'Traveler',
      artist: 'Official髭男dism',
      thumbnail:
        'https://yt3.googleusercontent.com/WSbzA6F1eC3E-q_y9y_j4aKz5eR1E4aKx8uH6p-B0Y2x9_c4_t4=w544-h544-s-l90-rj',
    },
    {
      id: 'MPREb_vJz07HnN0uA',
      title: 'Rejoice',
      artist: 'Official髭男dism',
      thumbnail:
        higedanData?.songs[0]?.thumbnail ||
        'https://yt3.googleusercontent.com/zZy89DQBNNe9nMoOeR-xiJKiINPI1Y1YzePRO2Fwt4pj20Tm_FkBHnQODMAoxapzaT_tiSacaKR3TiVb=w544-h544-s-l90-rj',
    },
  ];

  // Spotify Style Popular Radio Stations (Red & Black Theme)
  const popularRadios = [
    {
      id: 'radio-higedan',
      title: 'Official髭男dism Radio',
      subtitle: 'Official髭男dism, Vaundy, YOASOBI',
      thumbnail:
        higedanData?.songs[0]?.thumbnail ||
        'https://yt3.googleusercontent.com/zZy89DQBNNe9nMoOeR-xiJKiINPI1Y1YzePRO2Fwt4pj20Tm_FkBHnQODMAoxapzaT_tiSacaKR3TiVb=w544-h544-s-l90-rj',
      track: higedanData?.songs[0],
    },
    {
      id: 'radio-vaundy',
      title: 'Vaundy Radio',
      subtitle: 'Vaundy, King Gnu, 藤井 風',
      thumbnail:
        oriconList[1]?.thumbnail ||
        'https://i.ytimg.com/vi/TQ8WlA2GXbk/hqdefault.jpg',
      track: oriconList[1]
        ? {
            id: oriconList[1].id,
            title: oriconList[1].title,
            artist: oriconList[1].artist,
            thumbnail: oriconList[1].thumbnail,
          }
        : undefined,
    },
    {
      id: 'radio-yoasobi',
      title: 'YOASOBI Radio',
      subtitle: 'YOASOBI, ヨルシカ, ずっと真夜中でいいのに。',
      thumbnail:
        oriconList[0]?.thumbnail ||
        'https://i.ytimg.com/vi/PZX2npwj6jY/hqdefault.jpg',
      track: oriconList[0]
        ? {
            id: oriconList[0].id,
            title: oriconList[0].title,
            artist: oriconList[0].artist,
            thumbnail: oriconList[0].thumbnail,
          }
        : undefined,
    },
    {
      id: 'radio-kinggnu',
      title: 'King Gnu Radio',
      subtitle: 'King Gnu, millennium parade, back number',
      thumbnail:
        oriconList[2]?.thumbnail ||
        'https://i.ytimg.com/vi/bt8wNQJaKAk/hqdefault.jpg',
      track: oriconList[2]
        ? {
            id: oriconList[2].id,
            title: oriconList[2].title,
            artist: oriconList[2].artist,
            thumbnail: oriconList[2].thumbnail,
          }
        : undefined,
    },
    {
      id: 'radio-backnumber',
      title: 'back number Radio',
      subtitle: 'back number, 優里, DISH//',
      thumbnail:
        oriconList[3]?.thumbnail ||
        'https://i.ytimg.com/vi/R9XE1n46ucM/hqdefault.jpg',
      track: oriconList[3]
        ? {
            id: oriconList[3].id,
            title: oriconList[3].title,
            artist: oriconList[3].artist,
            thumbnail: oriconList[3].thumbnail,
          }
        : undefined,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs font-medium text-neutral-300">読み込み中...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500">
          <WifiOff className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-white">ネットワークに接続できません</p>
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
        >
          <FolderDown className="w-4 h-4" />
          <span>マイライブラリ</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Offline banner if from cache */}
      {isFromCache && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-neutral-300 text-xs">
          <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
          <span>オフラインモードで表示しています</span>
        </div>
      )}

      {/* Header Greeting & Settings (Spotify layout matching reference image) */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            {getGreeting()}
          </h1>
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="p-2 -mr-1 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
            title="マイライブラリ"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Albums / Playlists Cards Row (Clicking an album shows its tracklist!) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {featuredAlbums.map((album) => (
            <div
              key={album.id}
              onClick={() => navigateTo('album', album.id)}
              className="group p-3 bg-[#121216] hover:bg-[#1a1a22] border border-neutral-800/80 hover:border-red-600/50 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all shadow-lg hover:shadow-2xl hover:shadow-red-950/20"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-neutral-900 relative shadow-md">
                <SafeImage
                  src={album.thumbnail}
                  alt={album.title}
                  useBase64
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Floating Red Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                  {album.title}
                </h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{album.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 人気の Radio Section (Spotify layout matching reference image) */}
      <section className="space-y-3">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>人気の Radio</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {popularRadios.map((station) => (
            <div
              key={station.id}
              onClick={() => {
                if (station.track) {
                  startRadioForTrack(station.track);
                } else if (higedanData?.songs?.[0]) {
                  startRadioForTrack(higedanData.songs[0]);
                }
              }}
              className="group p-3 bg-[#121216] hover:bg-[#1a1a22] border border-neutral-800/80 hover:border-red-600/50 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all shadow-lg hover:shadow-2xl hover:shadow-red-950/20"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-neutral-900 relative shadow-md">
                <SafeImage
                  src={station.thumbnail}
                  alt={station.title}
                  useBase64
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Spotify Radio Badge (Red & Black) */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-black tracking-wider text-white shadow">
                  RADIO
                </div>
                {/* Floating Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/40">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                  {station.title}
                </h3>
                <p className="text-xs text-neutral-400 truncate mt-0.5">{station.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 人気の曲 (Top Songs Ranking) */}
      {oriconList.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <span>人気の曲</span>
            </h2>
            <button
              type="button"
              onClick={() => playTrack(oriconList[0], oriconList)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full inline-flex items-center gap-1.5 shadow-md shadow-red-600/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              <span>全曲再生</span>
            </button>
          </div>

          <div className="bg-[#121216] border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
            {oriconList.slice(0, 10).map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id || idx}
                  onClick={() => playTrack(track, oriconList)}
                  className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors cursor-pointer ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                    {idx + 1}
                  </span>

                  <div className="relative shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 shadow">
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
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
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

      {/* 注目のリリース (New Releases - Clicking an album opens its tracklist!) */}
      {data?.newReleases && data.newReleases.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Disc className="w-5 h-5 text-red-500" />
              <span>注目のリリース</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {data.newReleases.slice(0, 12).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.id) {
                    navigateTo('album', item.id);
                  }
                }}
                className="group p-3 bg-[#121216] hover:bg-[#1a1a22] border border-neutral-800/80 hover:border-red-600/50 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all shadow-md hover:shadow-xl hover:shadow-red-950/20"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-neutral-900 relative shadow">
                  <SafeImage
                    src={item.thumbnail}
                    alt={item.title}
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
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{item.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 注目のミュージックビデオ (Music Videos) */}
      {data?.musicVideos && data.musicVideos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Tv className="w-5 h-5 text-red-500" />
              <span>注目のミュージックビデオ</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
            {data.musicVideos.slice(0, 8).map((vid) => (
              <div
                key={vid.id}
                onClick={() => {
                  playTrack(vid);
                  setPlayerMode('video');
                  setVideoLayout('theater');
                }}
                className="group p-3 bg-[#121216] hover:bg-[#1a1a22] border border-neutral-800/80 hover:border-red-600/50 rounded-2xl cursor-pointer flex flex-col gap-2 transition-all shadow-md hover:shadow-xl hover:shadow-red-950/20"
              >
                <div className="aspect-video rounded-xl overflow-hidden bg-neutral-900 relative shadow">
                  <SafeImage
                    src={vid.thumbnail}
                    alt={vid.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                  {vid.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {vid.duration}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{vid.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
