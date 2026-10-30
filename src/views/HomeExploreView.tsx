import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { ExploreData, Track } from '../types/music';
import { SafeImage } from '../components/SafeImage';
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
  } = usePlayer();

  const [data, setData] = useState<ExploreData | null>(null);
  const [higedanData, setHigedanData] = useState<{
    artist: string;
    tagline: string;
    songs: Track[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.getExplore(), api.getHigedanSpotlight().catch(() => null)])
      .then(([res, higedan]) => {
        if (active) {
          setData(res);
          if (higedan) {
            setHigedanData(higedan);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
          <p className="text-sm font-medium text-white">YouTube Music InnerTube から音楽データを取得中...</p>
          <p className="text-xs text-neutral-500 mt-1">トレンド、最新リリース、ジャンルカタログを同期しています</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Curated Spotlight */}
      <section className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="YouTube Music InnerTube Experience"
            className="w-full h-full object-cover opacity-45 mix-blend-screen scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-transparent to-[#0a0a0c]/80" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-2xl flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
            <Sparkles className="w-4 h-4 text-red-500" />
            <span>YouTube InnerTube API パワード</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-400 font-mono">v18.3.0</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            高音質と公式歌詞を、<br />
            もっと自由に。
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            YouTube Music公式のInnerTube APIを経由し、楽曲検索、歌詞同期、関連トラックレコメンド、アルバムおよびアーティストカタログをリアルタイムに直接ストリーミング再生します。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {data?.trending && data.trending[0] && (
              <button
                type="button"
                onClick={() => playTrack(data.trending[0], data.trending)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>トレンド1位を再生 ({data.trending[0].title.slice(0, 16)}...)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              className="px-4 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-sm font-medium rounded-xl border border-neutral-700/80 flex items-center gap-2 transition-all"
            >
              <Radio className="w-4 h-4 text-red-500" />
              <span>InnerTube API 通信を確認</span>
            </button>
          </div>
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
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/40 hover:to-red-600/40 text-amber-200 hover:text-white border border-amber-500/40 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-950 via-amber-950/20 to-neutral-950 border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              {higedanData.songs[0]?.thumbnail ? (
                <SafeImage
                  src={higedanData.songs[0].thumbnail}
                  alt={higedanData.artist}
                  useBase64
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-500/30 shadow-xl shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold shrink-0 text-lg">
                  髭男
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
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

            <div className="flex items-center gap-2.5 shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => playTrack(higedanData.songs[0], higedanData.songs)}
                className="px-4 py-2.5 bg-white text-black font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 hover:bg-neutral-200 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>全曲シャッフル再生</span>
              </button>
              <button
                type="button"
                onClick={() => startRadioForTrack(higedanData.songs[0])}
                className="px-4 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-purple-300" />
                <span>髭男ラジオを開始</span>
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
                      ? 'bg-amber-950/30 border-amber-500/50 shadow-md'
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
              InnerTube 特集
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
              InnerTube 特集
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

      {/* Trending Songs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">急上昇 & トレンド楽曲</h2>
              <p className="text-xs text-neutral-400">YouTube Musicで今もっとも聴かれているトップ楽曲</p>
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
                <p className="text-xs text-neutral-400">YouTube Musicに新着配信されたアルバム・シングル</p>
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
                <p className="text-xs text-neutral-400">公式MVを高画質・高音質で視聴</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.musicVideos.slice(0, 8).map((vid) => (
              <div
                key={vid.id}
                onClick={() => playTrack(vid)}
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
