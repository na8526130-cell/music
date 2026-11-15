import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { ExploreData, Track, OriconTrack, Artist } from '../types/music';
import { SafeImage } from '../components/SafeImage';
import { MoodRecommendationSection } from '../components/MoodRecommendationSection';
import { getOfflineMeta, saveOfflineMeta } from '../services/offlineStorage';
import {
  Play,
  Plus,
  Heart,
  Loader2,
  WifiOff,
  FolderDown,
  Settings,
  Radio,
  ListMusic,
  Tv,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface FavoriteArtistChip {
  id: string;
  name: string;
  thumbnail: string;
  hasChannelId: boolean;
}

const ARTIST_META_CACHE_KEY = 'yt_music_home_artists_v1';

interface CachedArtistMeta {
  id?: string;
  thumbnail?: string;
  track?: Track;
}

const DEFAULT_ARTISTS: FavoriteArtistChip[] = [
  {
    id: 'UC84Rm0a3gimYXPtqp5O_JRw',
    name: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/zZy89DQBNNe9nMoOeR-xiJKiINPI1Y1YzePRO2Fwt4pj20Tm_FkBHnQODMAoxapzaT_tiSacaKR3TiVb=w544-h544-s-l90-rj',
    hasChannelId: true,
  },
  {
    id: 'artist-mrs-green-apple',
    name: 'Mrs. GREEN APPLE',
    thumbnail: '',
    hasChannelId: false,
  },
  {
    id: 'artist-vaundy',
    name: 'Vaundy',
    thumbnail: '',
    hasChannelId: false,
  },
  {
    id: 'artist-yoasobi',
    name: 'YOASOBI',
    thumbnail: '',
    hasChannelId: false,
  },
  {
    id: 'artist-king-gnu',
    name: 'King Gnu',
    thumbnail: '',
    hasChannelId: false,
  },
  {
    id: 'artist-radwimps',
    name: 'RADWIMPS',
    thumbnail: '',
    hasChannelId: false,
  },
  {
    id: 'artist-back-number',
    name: 'back number',
    thumbnail: '',
    hasChannelId: false,
  },
];

type HigedanAlbumCategory = 'all' | 'studio' | 'ep' | 'live' | 'instrumental';

interface HomeAlbumItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  year?: string;
  category: Exclude<HigedanAlbumCategory, 'all'>;
  categoryLabel: string;
}

const HIGEDAN_CHANNEL_ID = 'UC84Rm0a3gimYXPtqp5O_JRw';

const HIGEDAN_ALL_ALBUMS: HomeAlbumItem[] = [
  // スタジオ・フルアルバム
  {
    id: 'MPREb_KVsxzaWluhH',
    title: 'Rejoice',
    artist: 'Official髭男dism',
    thumbnail: '/assets/covers/rejoice.jpg',
    year: '2024',
    category: 'studio',
    categoryLabel: 'アルバム',
  },
  {
    id: 'MPREb_QCAGO0Lbeum',
    title: 'Editorial',
    artist: 'Official髭男dism',
    thumbnail: '/assets/covers/editorial.jpg',
    year: '2021',
    category: 'studio',
    categoryLabel: 'アルバム',
  },
  {
    id: 'MPREb_9XoC3Flm4Rv',
    title: 'Traveler',
    artist: 'Official髭男dism',
    thumbnail: '/assets/covers/traveler.jpg',
    year: '2019',
    category: 'studio',
    categoryLabel: 'アルバム',
  },
  {
    id: 'MPREb_YzLb9pRbx9F',
    title: 'エスカパレード',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/u-fn9CV7q-hRd8C1HDtZaXO1_ALKhP6PnpduWucUEtt36BLBd7tGf6LWut7sEXSyOt5sjWXiOn2DZi2J=w544-h544-l90-rj',
    year: '2018',
    category: 'studio',
    categoryLabel: 'アルバム',
  },
  // ミニアルバム
  {
    id: 'MPREb_aXDLR6CYO4T',
    title: 'レポート',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/XLQus3qol8pPLwuKkaAq6-QKs1lPH17QeJaoqupluaShpEDnYtmDbZ0-e5xr7-qHUQjD5ej3bb3gtF4=w544-h544-s-l90-rj',
    year: '2017',
    category: 'studio',
    categoryLabel: 'ミニアルバム',
  },
  {
    id: 'MPREb_mcPLWbEQM8y',
    title: 'MAN IN THE MIRROR',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/H1ZIqxKiFEWcbSg5x_5pDXmyyJiEhBw4qEUmiUkIA9_wZ_wdAjni5Y6fDXbFOsNxeoIR6SxIipiFDhu2=w544-h544-l90-rj',
    year: '2016',
    category: 'studio',
    categoryLabel: 'ミニアルバム',
  },
  {
    id: 'MPREb_lvUlrlxInIt',
    title: 'ラブとピースは君の中',
    artist: 'Official髭男dism',
    thumbnail: '/assets/covers/love_peace.jpg',
    year: '2015',
    category: 'studio',
    categoryLabel: 'ミニアルバム',
  },
  // EP
  {
    id: 'MPREb_5ZALdIZMcms',
    title: 'ミックスナッツEP',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/sHzfH8LR7ybsBpPCxF8h2wQYQc5Lj1ki_X5Uc7DpK19lUBMTKX0QrEiVKuEXuBBolpnBL_gfmln6Mhqp=w544-h544-l90-rj',
    year: '2022',
    category: 'ep',
    categoryLabel: 'EP',
  },
  {
    id: 'MPREb_ATFaBvGwqjc',
    title: 'HELLO EP',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/sI7_9lx2mav0Fod45Qf1RTMvqZJJbjOFbV7jnSunl4Vrh8Ept83YL7C4QMyd5njAafv5WmuR-R7CPZX0-Q=w544-h544-l90-rj',
    year: '2020',
    category: 'ep',
    categoryLabel: 'EP',
  },
  {
    id: 'MPREb_jBGGslW7Dc1',
    title: 'Stand By You EP',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/aeGT2ozpn6E-BdrW00KxU3BT25f87QndfXzsuy8Y_nQ7Df7Yn6d5sxryuNOV8DRsKnMueUZRLGjsKKA=w544-h544-l90-rj',
    year: '2018',
    category: 'ep',
    categoryLabel: 'EP',
  },
  {
    id: 'MPREb_C5oM1XPI8wm',
    title: 'LADY',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/pPVNoFKqNsXUO8HxD5UHpYN1PgwXy9rD3dzWF_ET2Pa2BelZsrd8kTLxeMi6WPStsVanohFCxiX18n2F=w544-h544-l90-rj',
    year: '2017',
    category: 'ep',
    categoryLabel: 'EP',
  },
  {
    id: 'MPREb_IRrBxLWvXCc',
    title: "What's Going On?",
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/ht0Sx8rSlphwJ1t796h_XopU92BjiEmXo0sV8yvwknJjAgDW0CRQExBNuqHc_Eo11liv61YbRjNMn2zY=w544-h544-l90-rj',
    year: '2016',
    category: 'ep',
    categoryLabel: 'EP',
  },
  // ライブアルバム
  {
    id: 'MPREb_tEj9ZUiT8om',
    title: 'OFFICIAL HIGE DANDISM LIVE at STADIUM 2025',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/WSbzf8dQJofD6MWOBS9SlcP1EHGmNrBUuWjFAJSikzI9IeuvujGaOUrPbHm7_0ljssFwRukmQJ6wPRs=w544-h544-l90-rj',
    year: '2025',
    category: 'live',
    categoryLabel: 'ライブアルバム',
  },
  {
    id: 'MPREb_4QKRdv5JG9J',
    title: 'Official髭男dism Arena Tour 2024 - Rejoice - (Live)',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/VUpaSAAx-BPvT3zz79GZ5ucqNSfw8bQPYbLKB4aG2hudT2zbCID0HEXwThOQmvRgNKcJgFq27pFQXyekvg=w544-h544-l90-rj',
    year: '2024',
    category: 'live',
    categoryLabel: 'ライブアルバム',
  },
  {
    id: 'MPREb_PkQZnvvlozt',
    title: 'one-man tour 2021-2022 -Editorial-@さいたまスーパーアリーナ',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/YknVLazXVK9znDn4PCm_Mrqt-VjGZLNL1eKdXXK588u-N_U7H3TcF6t42yfqCcr6ZJAUbYD11L9SeutdzQ=w544-h544-l90-rj',
    year: '2022',
    category: 'live',
    categoryLabel: 'ライブアルバム',
  },
  {
    id: 'MPREb_WDKYjtNdDlW',
    title: 'Official髭男dism ONLINE LIVE 2020 - Arena Travelers - (Live)',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/Z2f8QUf4xnFhlR0gGmlbuJmlk1yLUjB-u68u9qooOHshhiTMvlyVYTiXEZxOdugTDblrHPTArgi3R-Y=w544-h544-l90-rj',
    year: '2020',
    category: 'live',
    categoryLabel: 'ライブアルバム',
  },
  {
    id: 'MPREb_3VLGsScgzZH',
    title: 'Official髭男dism one-man tour 2019@日本武道館',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/PXleIRlQfniKVnPNrKJu6DLuvvZPgkgZdY0icaOBr3I9tTjUixNMu_iHM9lp37OYOxMLV2qd2BRb4JQ=w544-h544-s-l90-rj',
    year: '2019',
    category: 'live',
    categoryLabel: 'ライブアルバム',
  },
  // インストゥルメンタル
  {
    id: 'MPREb_fLP2Rrrqytc',
    title: 'Editorial (Instrumental)',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/Q8KWq_USjuJ7VaGDqAs4v7xJp21cy2ZTJg9afVhXKtRvdYaRoDd9v6JxLQPbHo_hGNqEfoQLFVhT1YwmWg=w544-h544-l90-rj',
    year: '2021',
    category: 'instrumental',
    categoryLabel: 'インスト',
  },
  {
    id: 'MPREb_wHkCT0jtfeX',
    title: 'Traveler-Instrumentals-',
    artist: 'Official髭男dism',
    thumbnail:
      'https://yt3.googleusercontent.com/hg5g9EE_VedOBeGS9dPpII3E8GCgaj6MfL465wh7U4hBkIZqvPkpQqMpTkC8LAf08V6aTeiuUKspE-P0=w544-h544-s-l90-rj',
    year: '2019',
    category: 'instrumental',
    categoryLabel: 'インスト',
  },
];

export const HomeExploreView: React.FC = () => {
  const {
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    likedTracks,
    likedAlbumIds,
    toggleLikeAlbum,
    likedPlaylistIds,
    toggleLikePlaylist,
    followedArtists,
    recentTracks,
    userPlaylists,
    currentTrack,
    navigateTo,
    openFavoritesView,
    setSearchQuery,
    startRadioForTrack,
    setPlayerMode,
    setVideoLayout,
    showToast,
  } = usePlayer();

  const [data, setData] = useState<ExploreData | null>(null);
  const [higedanData, setHigedanData] = useState<{
    artist: string;
    tagline: string;
    songs: Track[];
  } | null>(null);
  const [albumCategory, setAlbumCategory] = useState<HigedanAlbumCategory>('all');
  const [extraHigedanAlbums, setExtraHigedanAlbums] = useState<HomeAlbumItem[]>([]);
  const albumShelfRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const scrollAlbumShelf = (direction: 'left' | 'right') => {
    const el = albumShelfRef.current;
    if (!el) return;
    const offset = Math.max(280, el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'right' ? offset : -offset,
      behavior: 'smooth',
    });
  };

  // Oricon Chart States
  const [oriconList, setOriconList] = useState<OriconTrack[]>([]);
  const [artistMetaMap, setArtistMetaMap] = useState<Record<string, CachedArtistMeta>>(() => {
    try {
      const raw = localStorage.getItem(ARTIST_META_CACHE_KEY);
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
    const targets = ['Mrs. GREEN APPLE', 'Vaundy', 'YOASOBI', 'King Gnu', 'RADWIMPS', 'back number'];
    const missing = targets.filter((name) => !artistMetaMap[name]?.thumbnail);
    if (missing.length === 0) return;

    let active = true;
    Promise.all(
      missing.map(async (name) => {
        try {
          const [artistRes, songRes] = await Promise.all([
            api.search(name, 'artist').catch(() => null),
            api.search(name, 'song').catch(() => null),
          ]);
          const firstArtist = artistRes?.results?.[0] || artistRes?.artists?.[0];
          const firstSong = songRes?.results?.[0] || songRes?.songs?.[0];
          const thumb = firstArtist?.thumbnail || firstSong?.thumbnail;
          const channelId = firstArtist?.id?.startsWith('UC') ? firstArtist.id : firstSong?.artistId;
          if (!thumb && !firstSong) return null;
          return [
            name,
            {
              id: channelId,
              thumbnail: thumb,
              track: firstSong,
            } as CachedArtistMeta,
          ] as const;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (!active) return;
      const next = { ...artistMetaMap };
      let changed = false;
      entries.forEach((entry) => {
        if (entry) {
          next[entry[0]] = entry[1];
          changed = true;
        }
      });
      if (changed) {
        setArtistMetaMap(next);
        try {
          localStorage.setItem(
            ARTIST_META_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: next })
          );
        } catch {}
      }
    });

    return () => {
      active = false;
    };
  }, [artistMetaMap]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      api.getExplore(),
      api.getHigedanSpotlight().catch(() => null),
      api.getArtist(HIGEDAN_CHANNEL_ID).catch(() => null),
    ])
      .then(([res, higedan, artistProfile]) => {
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
        if (artistProfile?.albums && Array.isArray(artistProfile.albums)) {
          const knownIds = new Set(HIGEDAN_ALL_ALBUMS.map((a) => a.id));
          const knownTitles = new Set(HIGEDAN_ALL_ALBUMS.map((a) => a.title.toLowerCase()));
          const additions: HomeAlbumItem[] = artistProfile.albums
            .filter(
              (a) =>
                a.id &&
                a.title &&
                !knownIds.has(a.id) &&
                !knownTitles.has(a.title.trim().toLowerCase())
            )
            .map((a) => {
              const lower = a.title.toLowerCase();
              const isInst = lower.includes('instrumental');
              const isLive = lower.includes('live') || lower.includes('tour') || lower.includes('武道館') || lower.includes('アリーナ');
              return {
                id: a.id,
                title: a.title,
                artist: 'Official髭男dism',
                thumbnail: a.thumbnail,
                year: a.year || '',
                category: isInst ? 'instrumental' : isLive ? 'live' : 'studio',
                categoryLabel: isInst ? 'インスト' : isLive ? 'ライブアルバム' : 'アルバム',
              };
            });
          if (additions.length > 0) {
            setExtraHigedanAlbums(additions);
          }
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
    if (hour >= 5 && hour < 12) return 'おはよう';
    if (hour >= 12 && hour < 18) return 'こんにちは';
    return 'こんばんは';
  };

  const allHigedanAlbums = useMemo<HomeAlbumItem[]>(() => {
    return [...HIGEDAN_ALL_ALBUMS, ...extraHigedanAlbums];
  }, [extraHigedanAlbums]);

  const visibleHigedanAlbums = useMemo<HomeAlbumItem[]>(() => {
    if (albumCategory === 'all') return allHigedanAlbums;
    return allHigedanAlbums.filter((a) => a.category === albumCategory);
  }, [allHigedanAlbums, albumCategory]);

  // Spotify Style Popular Radio Stations
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
      thumbnail: artistMetaMap['Vaundy']?.thumbnail || '',
      track: artistMetaMap['Vaundy']?.track,
    },
    {
      id: 'radio-yoasobi',
      title: 'YOASOBI Radio',
      subtitle: 'YOASOBI, ヨルシカ, ずっと真夜中でいいのに。',
      thumbnail: artistMetaMap['YOASOBI']?.thumbnail || '',
      track: artistMetaMap['YOASOBI']?.track,
    },
    {
      id: 'radio-kinggnu',
      title: 'King Gnu Radio',
      subtitle: 'King Gnu, millennium parade, back number',
      thumbnail: artistMetaMap['King Gnu']?.thumbnail || '',
      track: artistMetaMap['King Gnu']?.track,
    },
    {
      id: 'radio-backnumber',
      title: 'back number Radio',
      subtitle: 'back number, 優里, DISH//',
      thumbnail: artistMetaMap['back number']?.thumbnail || '',
      track: artistMetaMap['back number']?.track,
    },
  ];

  // Combine followed artists + artists from user history/likes + defaults
  const favoriteArtistsShelf = useMemo<FavoriteArtistChip[]>(() => {
    const map = new Map<string, FavoriteArtistChip>();
    const addChip = (chip: FavoriteArtistChip) => {
      const key = chip.name.trim().toLowerCase();
      if (!key) return;
      const existing = map.get(key);
      if (!existing || (!existing.hasChannelId && chip.hasChannelId)) {
        map.set(key, chip);
      }
    };

    followedArtists.forEach((a: Artist) => {
      addChip({
        id: a.id,
        name: a.name,
        thumbnail: a.thumbnail,
        hasChannelId: Boolean(a.id && a.id.startsWith('UC')),
      });
    });

    [...recentTracks, ...likedTracks].forEach((t) => {
      if (t.artist && t.artistId && t.artistId.startsWith('UC')) {
        addChip({
          id: t.artistId,
          name: t.artist,
          thumbnail: t.thumbnail,
          hasChannelId: true,
        });
      }
    });

    DEFAULT_ARTISTS.forEach((d) => {
      const cached = artistMetaMap[d.name];
      const realId = cached?.id && cached.id.startsWith('UC') ? cached.id : d.id;
      addChip({
        id: realId,
        name: d.name,
        thumbnail: cached?.thumbnail || d.thumbnail,
        hasChannelId: Boolean(realId && realId.startsWith('UC')),
      });
    });
    return Array.from(map.values()).slice(0, 10);
  }, [followedArtists, recentTracks, likedTracks, artistMetaMap]);

  const handleOpenArtistChip = (artist: FavoriteArtistChip) => {
    if (artist.hasChannelId && artist.id) {
      navigateTo('artist', artist.id);
    } else {
      setSearchQuery(artist.name);
      navigateTo('search');
    }
  };

  const handlePlayChart = async (
    chartType: 'japan' | 'global' | 'viral' | 'hothits',
    label: string
  ) => {
    if (chartType === 'japan' && oriconList.length > 0) {
      playTrack(oriconList[0], oriconList);
      showToast(`「${label}」を再生中`, 'success', 2200);
      const el = document.getElementById('oricon-ranking-section');
      el?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (chartType === 'viral' && data?.trending && data.trending.length > 0) {
      playTrack(data.trending[0], data.trending);
      showToast(`「${label}」を再生中`, 'success', 2200);
      return;
    }
    const query =
      chartType === 'global'
        ? 'Global Top 50 hits 2026'
        : chartType === 'viral'
        ? '急上昇 J-Pop ヒット'
        : chartType === 'hothits'
        ? 'Hot Hits Japan J-Pop'
        : '日本 トップ50 ヒット曲';
    try {
      showToast(`「${label}」を読み込み中...`, 'info', 1800);
      const res = await api.search(query, 'song');
      const tracks: Track[] = res?.results || res?.songs || [];
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch {
      showToast('チャートの読み込みに失敗しました', 'warning', 2200);
    }
  };

  const handlePlayThisIs = async (artistName: string) => {
    try {
      showToast(`「This Is ${artistName}」を読み込み中...`, 'info', 1800);
      const res = await api.search(`${artistName} 人気曲`, 'song');
      const tracks: Track[] = res?.results || res?.songs || [];
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
        return;
      }
    } catch {}
    setSearchQuery(artistName);
    navigateTo('search');
  };

  const chartCards = [
    {
      id: 'chart-jp',
      heading: 'Top 50',
      subHeading: 'JAPAN',
      title: 'トップ50 - 日本',
      gradient: 'from-[#f45b43] via-[#d93a32] to-[#8e1416]',
      type: 'japan' as const,
    },
    {
      id: 'chart-global',
      heading: 'Top 50',
      subHeading: 'GLOBAL',
      title: 'トップ50 - グローバル',
      gradient: 'from-[#206b76] via-[#1c3d6e] to-[#131836]',
      type: 'global' as const,
    },
    {
      id: 'chart-viral',
      heading: 'Viral 50',
      subHeading: 'JAPAN',
      title: 'バイラル 50 - 日本',
      gradient: 'from-[#d946ef] via-[#9333ea] to-[#3b0764]',
      type: 'viral' as const,
    },
    {
      id: 'chart-hothits',
      heading: 'HOT HITS',
      subHeading: 'JAPAN',
      title: 'Hot Hits Japan',
      gradient: 'from-[#b91c1c] via-[#7f1d1d] to-[#180608]',
      type: 'hothits' as const,
    },
  ];

  const thisIsCards = [
    {
      name: 'Official髭男dism',
      bandColor: 'bg-[#d4a574] text-neutral-950',
      thumbnail:
        'https://yt3.googleusercontent.com/zZy89DQBNNe9nMoOeR-xiJKiINPI1Y1YzePRO2Fwt4pj20Tm_FkBHnQODMAoxapzaT_tiSacaKR3TiVb=w544-h544-s-l90-rj',
    },
    {
      name: 'Mrs. GREEN APPLE',
      bandColor: 'bg-[#73d2b0] text-neutral-950',
      thumbnail: artistMetaMap['Mrs. GREEN APPLE']?.thumbnail || '',
    },
    {
      name: 'Vaundy',
      bandColor: 'bg-[#ef4444] text-white',
      thumbnail: artistMetaMap['Vaundy']?.thumbnail || '',
    },
    {
      name: 'YOASOBI',
      bandColor: 'bg-[#e11d48] text-white',
      thumbnail: artistMetaMap['YOASOBI']?.thumbnail || '',
    },
    {
      name: 'back number',
      bandColor: 'bg-[#e5c1a1] text-neutral-950',
      thumbnail: artistMetaMap['back number']?.thumbnail || '',
    },
    {
      name: 'King Gnu',
      bandColor: 'bg-[#f59e0b] text-neutral-950',
      thumbnail: artistMetaMap['King Gnu']?.thumbnail || '',
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
    <div className="space-y-8 pb-24">
      {/* Offline banner */}
      {isFromCache && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-neutral-300 text-xs">
          <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
          <span>オフラインモードで表示しています</span>
        </div>
      )}

      {/* 1. Greeting + Compact Horizontal-Scroll Official髭男dism Albums Shelf */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {getGreeting()}
          </h1>
          <button
            type="button"
            onClick={() => navigateTo('library')}
            className="w-10 h-10 -mr-2 flex items-center justify-center text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="マイライブラリ・設定"
            aria-label="マイライブラリを開く"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              Official髭男dism アルバム
            </h2>
            <span className="text-[11px] font-bold text-neutral-400 shrink-0 tabular-nums">
              {visibleHigedanAlbums.length}作品
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => scrollAlbumShelf('left')}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="左へスクロール"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollAlbumShelf('right')}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="右へスクロール"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('artist', HIGEDAN_CHANNEL_ID)}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-0.5 py-1 cursor-pointer shrink-0"
            >
              <span>アーティスト</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          {(
            [
              { id: 'all', label: `すべて (${allHigedanAlbums.length})` },
              {
                id: 'studio',
                label: `フル・ミニ (${allHigedanAlbums.filter((a) => a.category === 'studio').length})`,
              },
              {
                id: 'ep',
                label: `EP (${allHigedanAlbums.filter((a) => a.category === 'ep').length})`,
              },
              {
                id: 'live',
                label: `ライブ (${allHigedanAlbums.filter((a) => a.category === 'live').length})`,
              },
              {
                id: 'instrumental',
                label: `インスト (${allHigedanAlbums.filter((a) => a.category === 'instrumental').length})`,
              },
            ] as const
          ).map((tab) => {
            const active = albumCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAlbumCategory(tab.id);
                  albumShelfRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'bg-[#18181d] hover:bg-[#222228] text-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Horizontal Scrollable Compact Album Cards */}
        <div
          ref={albumShelfRef}
          className="flex gap-3 overflow-x-auto pb-1.5 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory"
        >
          {visibleHigedanAlbums.map((album) => {
            const isPl =
              album.id.startsWith('VL') ||
              album.id.startsWith('PL') ||
              album.id.startsWith('RD');
            const isLikedItem = isPl
              ? likedPlaylistIds.has(album.id)
              : likedAlbumIds.has(album.id);
            return (
              <div
                key={album.id}
                onClick={() => navigateTo('album', album.id)}
                className="w-[116px] sm:w-[132px] md:w-[142px] shrink-0 snap-start group cursor-pointer flex flex-col gap-1.5"
              >
                <div className="aspect-square rounded-md overflow-hidden bg-neutral-900 relative shadow-md">
                  <SafeImage
                    src={album.thumbnail}
                    alt={album.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPl) {
                        toggleLikePlaylist({
                          id: album.id,
                          title: album.title,
                          author: album.artist,
                          thumbnail: album.thumbnail,
                        });
                      } else {
                        toggleLikeAlbum({
                          id: album.id,
                          title: album.title,
                          artist: album.artist,
                          thumbnail: album.thumbnail,
                        });
                      }
                    }}
                    className={`absolute top-1 right-1 z-10 w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                      isLikedItem
                        ? 'bg-black/75 text-red-500 opacity-100'
                        : 'bg-black/55 text-white/85 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                    }`}
                    title={isLikedItem ? 'お気に入り解除' : 'お気に入りに追加'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${isLikedItem ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </button>
                  <div className="hidden md:flex absolute bottom-2 right-2 w-9 h-9 rounded-full bg-red-600 text-white items-center justify-center shadow-xl shadow-black/60 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs sm:text-[13px] font-bold text-white truncate leading-snug group-hover:text-red-400 transition-colors">
                    {album.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {[album.year, album.categoryLabel].filter(Boolean).join(' • ') || album.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. おすすめステーション (Spotify Radio Shelf) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
            おすすめステーション
          </h2>
        </div>

        <div className="flex md:grid md:grid-cols-5 gap-3.5 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
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
              className="w-[144px] sm:w-[164px] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col gap-2"
            >
              <div className="aspect-square rounded-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-950 relative shadow-lg">
                <SafeImage
                  src={station.thumbnail}
                  alt={station.title}
                  useBase64
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 pointer-events-none" />
                <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-black tracking-wider text-white bg-black/70 px-1.5 py-0.5 rounded">
                  <Radio className="w-3 h-3 text-red-500" />
                  <span>RADIO</span>
                </div>
                <div className="hidden md:flex absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-red-600 text-white items-center justify-center shadow-xl shadow-black/60 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-[13px] sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                  {station.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{station.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 最近再生したコンテンツ (Liked Songs Tile + Recent Tracks) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
            最近再生したコンテンツ
          </h2>
          {recentTracks.length > 0 && (
            <button
              type="button"
              onClick={() => navigateTo('library')}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-0.5 py-1.5 cursor-pointer"
            >
              <span>すべて表示</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none snap-x snap-mandatory">
          {/* お気に入りの曲 Shortcut Card (Red & Black Gradient matching IMG_0205) */}
          <button
            type="button"
            onClick={openFavoritesView}
            className="w-[144px] sm:w-[160px] shrink-0 snap-start group text-left cursor-pointer flex flex-col gap-2"
          >
            <div className="aspect-square w-full rounded-md overflow-hidden bg-gradient-to-br from-red-600 via-rose-700 to-[#14080b] flex items-center justify-center shadow-lg relative">
              <Heart className="w-12 h-12 text-white fill-white drop-shadow-md group-hover:scale-110 transition-transform" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                お気に入りの曲
              </h3>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {likedTracks.length}曲
              </p>
            </div>
          </button>

          {recentTracks.slice(0, 12).map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`recent-${track.id}`}
                onClick={() => playTrack(track, recentTracks)}
                className="w-[144px] sm:w-[160px] shrink-0 snap-start group cursor-pointer flex flex-col gap-2"
              >
                <div className="aspect-square rounded-md overflow-hidden bg-neutral-900 relative shadow-lg">
                  <SafeImage
                    src={track.thumbnail}
                    alt={track.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className={`hidden md:flex absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white items-center justify-center shadow-xl transition-all pointer-events-none ${
                      isCurrent
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h3
                    className={`text-[13px] sm:text-sm font-bold line-clamp-2 leading-snug transition-colors ${
                      isCurrent ? 'text-red-400' : 'text-white group-hover:text-red-400'
                    }`}
                  >
                    {track.title}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{track.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. 自分のプレイリスト (when user has created playlists) */}
      {userPlaylists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
              自分のプレイリスト
            </h2>
            <button
              type="button"
              onClick={() => navigateTo('library')}
              className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-0.5 py-1.5 cursor-pointer"
            >
              <span>ライブラリ</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none snap-x snap-mandatory">
            {userPlaylists.map((pl) => {
              const cover = pl.tracks[0]?.thumbnail;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (pl.tracks.length > 0) {
                      playTrack(pl.tracks[0], pl.tracks);
                    } else {
                      navigateTo('library');
                    }
                  }}
                  className="w-[144px] sm:w-[160px] shrink-0 snap-start group cursor-pointer flex flex-col gap-2"
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-neutral-900 relative shadow-lg flex items-center justify-center">
                    {cover ? (
                      <SafeImage
                        src={cover}
                        alt={pl.name}
                        useBase64
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ListMusic className="w-10 h-10 text-neutral-600" />
                    )}
                    <div className="hidden md:flex absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {pl.tracks.length}曲
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. あなたのお気に入りアーティスト (Circular Portraits matching IMG_0209) */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
          あなたのお気に入りアーティスト
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-none snap-x snap-mandatory">
          {favoriteArtistsShelf.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => handleOpenArtistChip(artist)}
              className="w-[124px] sm:w-[144px] shrink-0 snap-start group flex flex-col items-center text-center gap-2.5 cursor-pointer"
            >
              <div className="w-[124px] h-[124px] sm:w-[144px] sm:h-[144px] rounded-full overflow-hidden bg-neutral-900 shadow-lg ring-1 ring-white/5 group-hover:ring-red-500/60 transition-all">
                <SafeImage
                  src={artist.thumbnail}
                  alt={artist.name}
                  useBase64
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[13px] font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors w-full">
                {artist.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 5.5 チャート (Top 50 Japan / Global / Viral / Hot Hits matching IMG_0210) */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
          チャート
        </h2>

        <div className="flex md:grid md:grid-cols-4 gap-3.5 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
          {chartCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handlePlayChart(card.type, card.title)}
              className="w-[144px] sm:w-[164px] md:w-auto shrink-0 snap-start group text-left cursor-pointer flex flex-col gap-2"
            >
              <div
                className={`aspect-square w-full rounded-md overflow-hidden bg-gradient-to-br ${card.gradient} relative shadow-lg flex flex-col items-center justify-center p-4`}
              >
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight text-center leading-none">
                  {card.heading}
                </span>
                <div className="w-12 h-px bg-white/35 my-2.5" />
                <span className="text-[11px] font-bold tracking-[0.22em] text-white/90 uppercase">
                  {card.subHeading}
                </span>
                <div className="hidden md:flex absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-red-600 text-white items-center justify-center shadow-xl shadow-black/60 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>
              <span className="text-[13px] sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 5.6 アーティスト特集 (THIS IS ... matching IMG_0210 & IMG_0211) */}
      <section className="space-y-3">
        <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
          アーティスト特集
        </h2>

        <div className="flex md:grid md:grid-cols-6 gap-3.5 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
          {thisIsCards.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handlePlayThisIs(item.name)}
              className="w-[144px] sm:w-[164px] md:w-auto shrink-0 snap-start group text-left cursor-pointer flex flex-col gap-2"
            >
              <div className="aspect-square w-full rounded-md overflow-hidden bg-white relative shadow-lg flex flex-col">
                <div className="bg-white px-2.5 pt-2 pb-1 text-center shrink-0">
                  <span className="text-[11px] font-black tracking-[0.18em] text-neutral-950 uppercase">
                    THIS IS
                  </span>
                </div>
                <div className={`relative flex-1 flex flex-col justify-end ${item.bandColor}`}>
                  <div className="absolute inset-x-3 -top-0.5 bottom-6 rounded-sm overflow-hidden shadow-md bg-neutral-900">
                    <SafeImage
                      src={item.thumbnail}
                      alt={item.name}
                      useBase64
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="relative z-10 px-2 pb-1 pt-0.5 text-center">
                    <span className="text-[11px] font-black tracking-tight truncate block">
                      {item.name}
                    </span>
                  </div>
                </div>
                <div className="hidden md:flex absolute bottom-7 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none z-20">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
              <span className="text-[13px] sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                This Is {item.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 6. 今の気分 × アーティスト レコメンドセクション */}
      <MoodRecommendationSection />

      {/* 7. 人気の曲 (Oricon / Top Songs Ranking) */}
      {oriconList.length > 0 && (
        <section id="oricon-ranking-section" className="space-y-3 scroll-mt-20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
              人気の曲
            </h2>
            <button
              type="button"
              onClick={() => playTrack(oriconList[0], oriconList)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full inline-flex items-center gap-1.5 shadow-md shadow-red-600/30 cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              <span>全曲再生</span>
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {oriconList.slice(0, 10).map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id || idx}
                  onClick={() => playTrack(track, oriconList)}
                  className={`flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-lg hover:bg-white/5 group transition-colors cursor-pointer ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span
                    className={`w-6 text-center text-sm font-mono font-bold tabular-nums shrink-0 ${
                      isCurrent ? 'text-red-500' : 'text-neutral-400'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="relative shrink-0 w-12 h-12 rounded overflow-hidden bg-neutral-900">
                    <SafeImage
                      src={track.thumbnail}
                      alt={track.title}
                      useBase64
                      className="w-full h-full object-cover"
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

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                      title={isLiked ? 'お気に入り解除' : 'お気に入りに追加'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="キューに追加"
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
        </section>
      )}

      {/* 8. 注目のリリース (New Releases Shelf) */}
      {data?.newReleases && data.newReleases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
            注目のリリース
          </h2>

          <div className="flex md:grid md:grid-cols-6 gap-3.5 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
            {data.newReleases.slice(0, 12).map((item) => {
              const isLikedItem = item.id ? likedAlbumIds.has(item.id) : false;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id) {
                      navigateTo('album', item.id);
                    }
                  }}
                  className="w-[136px] sm:w-[152px] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col gap-2"
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-neutral-900 relative shadow-lg">
                    <SafeImage
                      src={item.thumbnail}
                      alt={item.title}
                      useBase64
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeAlbum(item);
                        }}
                        className={`absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                          isLikedItem
                            ? 'bg-black/75 text-red-500 opacity-100'
                            : 'bg-black/55 text-white/85 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                        }`}
                        title={isLikedItem ? 'お気に入り解除' : 'お気に入りに追加'}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLikedItem ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </button>
                    )}
                    <div className="hidden md:flex absolute bottom-2 right-2 w-10 h-10 rounded-full bg-red-600 text-white items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{item.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 9. 注目のミュージックビデオ (Music Videos Shelf) */}
      {data?.musicVideos && data.musicVideos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
              注目のミュージックビデオ
            </h2>
          </div>

          <div className="flex md:grid md:grid-cols-4 gap-3.5 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory">
            {data.musicVideos.slice(0, 8).map((vid) => (
              <div
                key={vid.id}
                onClick={() => {
                  playTrack(vid);
                  setPlayerMode('video');
                  setVideoLayout('theater');
                }}
                className="w-[220px] sm:w-[240px] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col gap-2"
              >
                <div className="aspect-video rounded-md overflow-hidden bg-neutral-900 relative shadow-lg">
                  <SafeImage
                    src={vid.thumbnail}
                    alt={vid.title}
                    useBase64
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                  {vid.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-white">
                      {vid.duration}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                    {vid.title}
                  </h4>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{vid.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
