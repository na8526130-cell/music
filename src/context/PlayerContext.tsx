import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Track,
  ViewType,
  PlayerMode,
  VideoLayout,
  RepeatMode,
  LyricsData,
  TrackTimestampsData,
} from '../types/music';
import { api } from '../services/api';
import { equalizer } from '../services/equalizer';
import { socialSocket } from '../services/socialSocket';
import { getPlayableOfflineTrack } from '../services/offlineStorage';

interface UserPlaylist {
  id: string;
  name: string;
  createdAt: string;
  tracks: Track[];
}

interface PlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playerMode: PlayerMode;
  togglePlayerMode: () => void;
  videoLayout: VideoLayout;
  setVideoLayout: React.Dispatch<React.SetStateAction<VideoLayout>>;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  lyricsOpen: boolean;
  queueOpen: boolean;
  fullScreenPlayerOpen: boolean;
  setFullScreenPlayerOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Spotify Features: Playback Speed, Smart Shuffle, Audio Quality & Wrapped
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;

  shuffleMode: 'off' | 'on' | 'smart';
  cycleShuffleMode: () => void;

  audioQuality: 'auto' | 'low' | 'normal' | 'high';
  setAudioQuality: (q: 'auto' | 'low' | 'normal' | 'high') => void;

  wrappedModalOpen: boolean;
  setWrappedModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  listeningStats: {
    totalMinutes: number;
    totalMinutesListened: number;
    totalPlayedTracks: number;
    topTracks: { track: Track; count: number; seconds: number }[];
    topArtists: { artist: string; count: number }[];
    timeOfDay: string;
  };
  inspectorOpen: boolean;
  activeView: ViewType;
  selectedEntityId: string | null;
  searchQuery: string;
  likedTrackIds: Set<string>;
  likedTracks: Track[];
  recentTracks: Track[];
  userPlaylists: UserPlaylist[];

  // Background Playback & WakeLock & Guide
  backgroundPlaybackEnabled: boolean;
  setBackgroundPlaybackEnabled: (val: boolean) => void;
  toggleBackgroundPlayback: () => void;
  wakeLockActive: boolean;
  toggleWakeLock: () => void;
  bgGuideOpen: boolean;
  setBgGuideOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerDocumentPiP: () => Promise<boolean>;

  // Crossfade & Endless Emotion Radio & Digest Mode & Playlist Import
  crossfadeDuration: number;
  setCrossfadeDuration: (sec: number) => void;
  endlessRadioActive: boolean;
  toggleEndlessRadio: () => void;
  emotionRadioMood: { id: string; name: string } | null;
  startRadioForTrack: (seedTrack: Track) => Promise<void>;
  digestMode: boolean;
  toggleDigestMode: () => void;
  digestRemainingSec: number;
  trackTimestamps: TrackTimestampsData | null;
  importModalOpen: boolean;
  setImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Action Handlers
  playTrack: (track: Track, customQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  nextTrack: (isManualSkip?: boolean) => void;
  prevTrack: () => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlayerMode: (mode: PlayerMode) => void;
  setLyricsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQueueOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveView: (view: ViewType) => void;
  navigateTo: (view: ViewType, entityId?: string) => void;
  setSearchQuery: (query: string) => void;
  toggleLikeTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  createUserPlaylist: (name: string) => void;
  saveTracksAsPlaylist: (name: string, tracks: Track[]) => void;
  addToUserPlaylist: (playlistId: string, trackTrack: Track) => void;
  removeFromUserPlaylist: (playlistId: string, trackId: string) => void;
  deleteUserPlaylist: (playlistId: string) => void;

  // Account & Real Stats System (偽はいらん)
  currentUser: { username: string; email?: string } | null;
  accountEmail: string | null;
  accountModalOpen: boolean;
  setAccountModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  registerUserAccount: (username: string, password: string, email?: string) => Promise<any>;
  loginUserAccount: (identifier: string, password: string) => Promise<any>;
  logoutAccount: () => void;
  stats: { totalAccessCount: number; totalAccountsCount: number; onlineCount: number };
  onlineCount: number;
  refreshStats: () => Promise<void>;

  // Admin Master Control (パスワード: @zeromusic)
  isAdmin: boolean;
  adminModalOpen: boolean;
  setAdminModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  adminLoginWithPassword: (password: string) => Promise<any>;
  trackOffsets: Record<string, { offsetSec: number; title?: string }>;
  refreshTrackOffsets: () => Promise<void>;

  // Add to Playlist Modal
  addToPlaylistModalOpen: boolean;
  setAddToPlaylistModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  trackToAddToPlaylist: Track | null;
  openAddToPlaylistModal: (track: Track) => void;

  // Real-time Synced Lyrics for Mini Player & Components
  currentLyrics: LyricsData | null;
  activeSyncedLyricText: string;

  // Equalizer Modal
  eqModalOpen: boolean;
  setEqModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Share Modal & URL Sharing
  shareModalOpen: boolean;
  setShareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareModalPayload: { type: 'track' | 'playlist'; playlist?: { name: string; tracks: Track[] } } | null;
  openShareModal: (type?: 'track' | 'playlist', playlist?: { name: string; tracks: Track[] }) => void;

  // Mini Floating Player
  floatingPlayerVisible: boolean;
  setFloatingPlayerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  floatingPlayerCollapsed: boolean;
  setFloatingPlayerCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  // Social, Comments, DM, Listening Party & Notifications
  danmakuEnabled: boolean;
  setDanmakuEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  commentsModalOpen: boolean;
  setCommentsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dmModalOpen: boolean;
  setDmModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dmTargetUser: string | null;
  openDmWithUser: (username?: string) => void;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;

  // Terms of Service & Privacy Policy (利用規約 & プライバシーポリシー)
  termsModalOpen: boolean;
  setTermsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Creative & Community Modals
  storyModalOpen: boolean;
  setStoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  quizModalOpen: boolean;
  setQuizModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  matchModalOpen: boolean;
  setMatchModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  collabModalOpen: boolean;
  setCollabModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Toast notifications & Playback error auto-fallback
  toastNotification: { message: string; type: 'info' | 'success' | 'warning' } | null;
  setToastNotification: React.Dispatch<React.SetStateAction<{ message: string; type: 'info' | 'success' | 'warning' } | null>>;
  showToast: (message: string, type?: 'info' | 'success' | 'warning', duration?: number) => void;
  onPlayerError: (errorCode: number, errorMsg?: string) => Promise<void>;

  // Internal bridge with YouTube player
  userIntendedPlayingRef: React.MutableRefObject<boolean>;
  onPlayerTimeUpdate: (current: number, total: number) => void;
  onPlayerStateChange: (isPlayingState: boolean) => void;
  onPlayerTrackEnded: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const STORAGE_KEYS = {
  LIKED: 'yt_music_liked_tracks_v1',
  HISTORY: 'yt_music_recent_tracks_v1',
  PLAYLISTS: 'yt_music_user_playlists_v1',
  BG_PLAY: 'yt_music_background_playback_v1',
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('cover');
  const [videoLayout, setVideoLayout] = useState<VideoLayout>('theater');

  const togglePlayerMode = useCallback(() => {
    setPlayerMode((prev) => {
      const next = prev === 'cover' ? 'video' : 'cover';
      if (next === 'video') {
        setVideoLayout('theater');
      }
      return next;
    });
  }, []);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [lyricsOpen, setLyricsOpen] = useState<boolean>(false);
  const [queueOpen, setQueueOpen] = useState<boolean>(false);
  const [fullScreenPlayerOpen, setFullScreenPlayerOpen] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [bgGuideOpen, setBgGuideOpen] = useState<boolean>(false);

  // Crossfade duration in seconds (0 = off, 2, 4, 6, 8)
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(4);
  // Endless emotion radio station mode
  const [endlessRadioActive, setEndlessRadioActive] = useState<boolean>(true);
  const [emotionRadioMood, setEmotionRadioMood] = useState<{ id: string; name: string } | null>(null);
  // Digest 25s highlight mode
  const [digestMode, setDigestMode] = useState<boolean>(false);
  const [digestRemainingSec, setDigestRemainingSec] = useState<number>(25);
  const [trackTimestamps, setTrackTimestamps] = useState<TrackTimestampsData | null>(null);
  // Playlist Import Modal open
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);


  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);
  const [shuffleMode, setShuffleMode] = useState<'off' | 'on' | 'smart'>('off');

  const [audioQuality, setAudioQualityState] = useState<'auto' | 'low' | 'normal' | 'high'>(() => {
    try {
      return (localStorage.getItem('yt_audio_quality') as any) || 'high';
    } catch {
      return 'high';
    }
  });

  const [wrappedModalOpen, setWrappedModalOpen] = useState<boolean>(false);
  const [historyStats, setHistoryStats] = useState<Record<string, { track: Track; count: number; seconds: number }>>(() => {
    try {
      const saved = localStorage.getItem('yt_listening_history_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const targetVolumeRef = useRef<number>(80);
  const isTransitioningEarlyRef = useRef<boolean>(false);
  const isFetchingRadioRef = useRef<boolean>(false);

  // Intent tracker: true when user actively intends playback, false ONLY when user pressed pause
  const userIntendedPlayingRef = useRef<boolean>(false);

  // Background playback & Wakelock state
  const [backgroundPlaybackEnabled, setBackgroundPlaybackEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BG_PLAY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  const [activeView, setActiveView] = useState<ViewType>('home');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persisted state
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIKED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentTracks, setRecentTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return saved ? JSON.parse(saved) : [
        {
          id: 'favorites',
          name: 'My Best Hits',
          createdAt: new Date().toISOString(),
          tracks: [],
        },
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(likedTracks));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [likedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(recentTracks.slice(0, 50)));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [recentTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(userPlaylists));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [userPlaylists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BG_PLAY, JSON.stringify(backgroundPlaybackEnabled));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, [backgroundPlaybackEnabled]);

  // Real Stats & Account Session persistence (偽はいらん)
  const [currentUser, setCurrentUser] = useState<{ username: string; email?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('yt_music_user_session_v1');
      if (saved) return JSON.parse(saved);
      const email = localStorage.getItem('yt_music_user_email_v1');
      if (email) return { username: email.split('@')[0], email };
      return null;
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState<{ totalAccessCount: number; totalAccountsCount: number; onlineCount: number }>({
    totalAccessCount: 1,
    totalAccountsCount: 0,
    onlineCount: 1,
  });
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const sessionIdRef = useRef<string>('');

  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);

  // Fetch real stats from server
  const refreshStats = useCallback(async () => {
    try {
      const s = await api.getStats();
      if (s && typeof s.totalAccessCount === 'number') {
        setStats(s);
        if (typeof s.onlineCount === 'number') {
          setOnlineCount(s.onlineCount);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh stats:', e);
    }
  }, []);

  // Record real visit on startup and initialize real stats
  useEffect(() => {
    api
      .recordVisit()
      .then((s) => {
        if (s && typeof s.totalAccessCount === 'number') {
          setStats(s);
          if (typeof s.onlineCount === 'number') {
            setOnlineCount(s.onlineCount);
          }
        }
      })
      .catch(() => {});

    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, [refreshStats]);

  // Real-time Active Presence Heartbeat (Every 15s, with instant leave on window close)
  useEffect(() => {
    if (!sessionIdRef.current) {
      try {
        let id = sessionStorage.getItem('zm_presence_session_id');
        if (!id) {
          id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          sessionStorage.setItem('zm_presence_session_id', id);
        }
        sessionIdRef.current = id;
      } catch {
        sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }

    const currentSessionId = sessionIdRef.current;

    const sendHeartbeat = async () => {
      try {
        const res = await api.sendPresenceHeartbeat(currentSessionId, currentUser?.username);
        if (res && typeof res.onlineCount === 'number') {
          setOnlineCount(res.onlineCount);
          setStats((prev) => ({ ...prev, onlineCount: res.onlineCount }));
        }
      } catch {}
    };

    // Immediate initial heartbeat
    sendHeartbeat();

    // 15 seconds heartbeat loop
    const heartbeatTimer = setInterval(sendHeartbeat, 15000);

    // Immediate update when returning to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Instant leave beacon when tab or browser closes
    const handleUnload = () => {
      api.sendPresenceLeave(currentSessionId);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [currentUser?.username]);

  // Add to Playlist modal state
  const [addToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState<boolean>(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);

  const openAddToPlaylistModal = useCallback((track: Track) => {
    setTrackToAddToPlaylist(track);
    setAddToPlaylistModalOpen(true);
  }, []);

  // Track Offsets for lyrics sync adjustment
  const [trackOffsets, setTrackOffsets] = useState<Record<string, { offsetSec: number; title?: string }>>({});

  const refreshTrackOffsets = useCallback(async () => {
    try {
      const res = await api.getTrackOffsets();
      setTrackOffsets(res.trackOffsets || {});
    } catch {}
  }, []);

  useEffect(() => {
    refreshTrackOffsets();
  }, [refreshTrackOffsets]);

  // Real-time Lyrics for Floating Player and general consumers
  const [currentLyrics, setCurrentLyrics] = useState<LyricsData | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setCurrentLyrics(null);
      return;
    }
    let cancelled = false;
    api
      .getLyrics(
        currentTrack.id,
        currentTrack.title,
        currentTrack.artist,
        currentTrack.durationSeconds || duration
      )
      .then((res) => {
        if (!cancelled) {
          setCurrentLyrics(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentLyrics(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  // Auto-fetch real YouTube timestamps & comment heatmap for active track
  useEffect(() => {
    if (!currentTrack || currentTrack.isLocal) {
      setTrackTimestamps(null);
      return;
    }
    let cancelled = false;
    setTrackTimestamps(null);
    api
      .getTrackTimestamps(
        currentTrack.id,
        currentTrack.title,
        currentTrack.artist,
        currentTrack.durationSeconds || 0
      )
      .then((res) => {
        if (!cancelled && res && res.success) {
          setTrackTimestamps(res);
        }
      })
      .catch(() => {
        if (!cancelled) setTrackTimestamps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id]);

  // Equalizer Modal state & sync
  const [eqModalOpen, setEqModalOpen] = useState<boolean>(false);

  useEffect(() => {
    equalizer.notifyPlaybackState(isPlaying);
  }, [isPlaying]);

  // Share Modal state & helper
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareModalPayload, setShareModalPayload] = useState<{
    type: 'track' | 'playlist';
    playlist?: { name: string; tracks: Track[] };
  } | null>(null);

  const openShareModal = useCallback(
    (type: 'track' | 'playlist' = 'track', playlist?: { name: string; tracks: Track[] }) => {
      setShareModalPayload({ type, playlist });
      setShareModalOpen(true);
    },
    []
  );

  // Floating Mini Player state
  const [floatingPlayerVisible, setFloatingPlayerVisible] = useState<boolean>(true);
  const [floatingPlayerCollapsed, setFloatingPlayerCollapsed] = useState<boolean>(false);

  // Social, Comments, DM, Listening Party & Notifications
  const [danmakuEnabled, setDanmakuEnabled] = useState<boolean>(true);
  const [commentsModalOpen, setCommentsModalOpen] = useState<boolean>(false);
  const [dmModalOpen, setDmModalOpen] = useState<boolean>(false);
  const [dmTargetUser, setDmTargetUser] = useState<string | null>(null);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState<boolean>(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [termsModalOpen, setTermsModalOpen] = useState<boolean>(false);
  const [storyModalOpen, setStoryModalOpen] = useState<boolean>(false);
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [matchModalOpen, setMatchModalOpen] = useState<boolean>(false);
  const [collabModalOpen, setCollabModalOpen] = useState<boolean>(false);

  const openDmWithUser = useCallback((username?: string) => {
    if (username) setDmTargetUser(username);
    setDmModalOpen(true);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!currentUser) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const res = await api.getSocialNotifications(currentUser.username);
      setUnreadNotificationCount(res.unreadCount || 0);
    } catch {}
  }, [currentUser]);

  // Sync user presence and nowPlaying over WebSocket
  useEffect(() => {
    socialSocket.setUser(currentUser ? currentUser.username : null);
    refreshNotifications();
  }, [currentUser, refreshNotifications]);

  useEffect(() => {
    socialSocket.setNowPlaying(
      currentTrack
        ? { title: currentTrack.title, artist: currentTrack.artist, videoId: currentTrack.id }
        : null
    );
  }, [currentTrack]);

  useEffect(() => {
    const unsub = socialSocket.on('notification:new', () => {
      refreshNotifications();
    });
    return () => unsub();
  }, [refreshNotifications]);

  // Live active synced lyric line
  const activeSyncedLyricText = useMemo(() => {
    if (!currentLyrics?.syncedLyrics || currentLyrics.syncedLyrics.length === 0) {
      return '';
    }
    const offset =
      currentTrack && trackOffsets[currentTrack.id]
        ? trackOffsets[currentTrack.id].offsetSec
        : currentLyrics.globalOffset || 0;
    const effProgress = progress + offset;
    const lines = currentLyrics.syncedLyrics;

    if (effProgress < lines[0].time - 0.1) {
      return '';
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      if (effProgress >= lines[i].time - 0.1) {
        return lines[i].text;
      }
    }
    return '';
  }, [currentLyrics, progress, currentTrack?.id, trackOffsets]);

  // URL parameters handler on mount (?track=xxx or ?share_pl=xxx)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    const sharePlId = params.get('share_pl');

    if (trackId) {
      api
        .getTrack(trackId)
        .then((res) => {
          if (res.track) {
            playTrack(res.track);
            window.history.replaceState({}, '', window.location.pathname);
          }
        })
        .catch((e) => {
          console.warn('[Share] Failed to load shared track from URL:', e);
        });
    } else if (sharePlId) {
      api
        .getSharedPlaylist(sharePlId)
        .then((res) => {
          if (res.playlist && Array.isArray(res.playlist.tracks)) {
            const imported: UserPlaylist = {
              id: `shared_${sharePlId}_${Date.now()}`,
              name: res.playlist.name,
              createdAt: new Date().toISOString(),
              tracks: res.playlist.tracks,
            };
            setUserPlaylists((prev) => [imported, ...prev]);
            if (res.playlist.tracks.length > 0) {
              playTrack(res.playlist.tracks[0], res.playlist.tracks);
            }
            window.history.replaceState({}, '', window.location.pathname);
          }
        })
        .catch((e) => {
          console.warn('[Share] Failed to load shared playlist from URL:', e);
        });
    }
  }, []);

  // Register account with username, password, arbitrary email (no example)
  const registerUserAccount = useCallback(
    async (username: string, password: string, email?: string) => {
      const res = await api.registerAccount({
        username: username.trim(),
        password: password.trim(),
        email: email?.trim() || undefined,
        playlists: userPlaylists,
      });

      const user = {
        username: res.account.username,
        email: res.account.email || '',
      };
      setCurrentUser(user);

      if (res.stats) {
        setStats(res.stats);
      }

      try {
        localStorage.setItem('yt_music_user_session_v1', JSON.stringify(user));
        if (user.email) {
          localStorage.setItem('yt_music_user_email_v1', user.email);
        }
      } catch {}

      return res;
    },
    [userPlaylists]
  );

  // Login account
  const loginUserAccount = useCallback(async (identifier: string, password: string) => {
    const res = await api.loginAccount({
      identifier: identifier.trim(),
      password: password.trim(),
    });

    const user = {
      username: res.account.username,
      email: res.account.email || '',
    };
    setCurrentUser(user);

    if (res.account.playlists && Array.isArray(res.account.playlists) && res.account.playlists.length > 0) {
      setUserPlaylists(res.account.playlists);
    }

    if (res.isAdmin || res.account?.role === 'admin') {
      setIsAdmin(true);
      try {
        localStorage.setItem('yt_music_is_admin_v1', 'true');
      } catch {}
    }

    if (res.stats) {
      setStats(res.stats);
    }

    try {
      localStorage.setItem('yt_music_user_session_v1', JSON.stringify(user));
      if (user.email) {
        localStorage.setItem('yt_music_user_email_v1', user.email);
      }
    } catch {}

    return res;
  }, []);

  // Admin Master Login with password @zeromusic
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yt_music_is_admin_v1') === 'true';
    } catch {
      return false;
    }
  });
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);

  const adminLoginWithPassword = useCallback(async (password: string) => {
    const res = await api.adminLogin(password);
    if (res.success) {
      setIsAdmin(true);
      setCurrentUser({ username: 'admin', email: 'admin@zeromusic.local' });
      try {
        localStorage.setItem('yt_music_is_admin_v1', 'true');
        localStorage.setItem('yt_music_user_session_v1', JSON.stringify({ username: 'admin', email: 'admin@zeromusic.local' }));
      } catch {}
    }
    return res;
  }, []);

  const logoutAccount = useCallback(() => {
    setCurrentUser(null);
    setIsAdmin(false);
    try {
      localStorage.removeItem('yt_music_user_session_v1');
      localStorage.removeItem('yt_music_user_email_v1');
      localStorage.removeItem('yt_music_is_admin_v1');
    } catch {}
  }, []);

  // Auto-sync playlists to cloud when registered
  useEffect(() => {
    if (currentUser?.username && userPlaylists.length > 0) {
      api.syncAccountPlaylists(currentUser.username, userPlaylists).catch(() => {});
    }
  }, [currentUser?.username, userPlaylists]);

  const accountEmail = currentUser?.email || null;

  const likedTrackIds = new Set(likedTracks.map((t) => t.id));

  const toggleBackgroundPlayback = useCallback(() => {
    setBackgroundPlaybackEnabled((prev) => !prev);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      if (wakeLockActive && wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
        setWakeLockActive(false);
      } else {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = lock;
          setWakeLockActive(true);
          lock.addEventListener('release', () => setWakeLockActive(false));
        } catch (err) {
          console.warn('Wake Lock request error:', err);
        }
      }
    }
  }, [wakeLockActive]);

  const navigateTo = useCallback((view: ViewType, entityId?: string) => {
    setActiveView(view);
    if (entityId !== undefined) {
      setSelectedEntityId(entityId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Send raw commands to player instance and iframe postMessage
  const dispatchPlayCommand = useCallback(() => {
    const win = window as any;
    if (win.__localAudio) {
      try {
        win.__localAudio.play().catch(() => {});
      } catch {}
    }
    if (win.__ytPlayer && typeof win.__ytPlayer.playVideo === 'function') {
      win.__ytPlayer.playVideo();
    }
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((ifr) => {
      try {
        ifr.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      } catch {
        // ignore
      }
    });
  }, []);

  const dispatchPauseCommand = useCallback(() => {
    const win = window as any;
    if (win.__localAudio) {
      try {
        win.__localAudio.pause();
      } catch {}
    }
    if (win.__ytPlayer && typeof win.__ytPlayer.pauseVideo === 'function') {
      win.__ytPlayer.pauseVideo();
    }
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((ifr) => {
      try {
        ifr.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } catch {
        // ignore
      }
    });
  }, []);

  const playTrack = useCallback(
    async (track: Track, customQueue?: Track[]) => {
      userIntendedPlayingRef.current = true;
      isTransitioningEarlyRef.current = false;

      let resolvedTrack = track;
      if (track.isLocal) {
        resolvedTrack = await getPlayableOfflineTrack(track);
      }

      setCurrentTrack(resolvedTrack);
      setProgress(0);
      setIsPlaying(true);

      // Record genuine telemetry (skip when offline or for local tracks)
      if (!resolvedTrack.isLocal && navigator.onLine) {
        try {
          api.recordPlaybackTelemetry({
            videoId: resolvedTrack.id,
            title: resolvedTrack.title,
            artist: resolvedTrack.artist,
            thumbnail: resolvedTrack.thumbnail,
            durationSeconds: resolvedTrack.durationSeconds,
          }).catch(() => {});
        } catch {}
      }

      // Reset volume to target volume when new track begins
      const win = window as any;
      if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
        win.__ytPlayer.setVolume(targetVolumeRef.current);
      }

      // Update history & stats
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== resolvedTrack.id);
        return [resolvedTrack, ...filtered];
      });

      setHistoryStats((prev) => {
        const existing = prev[resolvedTrack.id] || { track: resolvedTrack, count: 0, seconds: 0 };
        const updated = {
          ...prev,
          [resolvedTrack.id]: {
            track: resolvedTrack,
            count: existing.count + 1,
            seconds: existing.seconds + (resolvedTrack.durationSeconds || 180),
          },
        };
        try {
          localStorage.setItem('yt_listening_history_v1', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (customQueue && customQueue.length > 0) {
        setQueue(customQueue);
        const idx = customQueue.findIndex((t) => t.id === resolvedTrack.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      } else {
        setQueue((prevQueue) => {
          const existingIdx = prevQueue.findIndex((t) => t.id === resolvedTrack.id);
          if (existingIdx >= 0) {
            setQueueIndex(existingIdx);
            return prevQueue;
          } else {
            const newQueue = [...prevQueue, resolvedTrack];
            setQueueIndex(newQueue.length - 1);
            return newQueue;
          }
        });
      }

      digestJumpedTrackRef.current = null;
      digestStartPlaySecRef.current = null;

      // Auto-fetch emotion-matched & related songs in background if queue is short, online, and not local track
      if (!resolvedTrack.isLocal && navigator.onLine) {
        (async () => {
          try {
            const emotionRes = await api.getTrackCommentEmotions(
              resolvedTrack.id,
              resolvedTrack.title,
              resolvedTrack.artist
            );
            if (emotionRes?.dominantMood) {
              setEmotionRadioMood({
                id: emotionRes.dominantMood,
                name: emotionRes.dominantMoodName || emotionRes.dominantMood,
              });
            }
            const [moodRec, related] = await Promise.all([
              emotionRes?.dominantMood ? api.getMoodRecommendation(emotionRes.dominantMood).catch(() => null) : Promise.resolve(null),
              api.getRelated(resolvedTrack.id).catch(() => []),
            ]);
            const pool = [...(moodRec?.tracks || []), ...(related || [])];
            if (pool.length > 0) {
              setQueue((curr) => {
                if (curr.length <= 3) {
                  const existingIds = new Set(curr.map((t) => t.id));
                  const fresh = pool.filter((r) => r.id && !existingIds.has(r.id)).slice(0, 8);
                  return [...curr, ...fresh];
                }
                return curr;
              });
            }
          } catch {}
        })();
      }
    },
    []
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      userIntendedPlayingRef.current = false;
      setIsPlaying(false);
      dispatchPauseCommand();
    } else {
      userIntendedPlayingRef.current = true;
      setIsPlaying(true);
      dispatchPlayCommand();
    }
  }, [isPlaying, dispatchPauseCommand, dispatchPlayCommand]);

  const pause = useCallback(() => {
    userIntendedPlayingRef.current = false;
    setIsPlaying(false);
    dispatchPauseCommand();
  }, [dispatchPauseCommand]);

  const resume = useCallback(() => {
    userIntendedPlayingRef.current = true;
    setIsPlaying(true);
    dispatchPlayCommand();
  }, [dispatchPlayCommand]);

  const seekTo = useCallback((seconds: number) => {
    setProgress(seconds);
    if (digestStartPlaySecRef.current !== null) {
      digestStartPlaySecRef.current = seconds;
      setDigestRemainingSec(25);
    }
    const win = window as any;
    if (win.__localAudio) {
      try {
        win.__localAudio.currentTime = seconds;
      } catch {}
    }
    if (win.__ytPlayer && typeof win.__ytPlayer.seekTo === 'function') {
      win.__ytPlayer.seekTo(seconds, true);
    }
  }, []);

  const repeatCurrentTrack = useCallback(() => {
    if (!currentTrack) return;
    isTransitioningEarlyRef.current = false;
    setProgress(0);
    userIntendedPlayingRef.current = true;
    setIsPlaying(true);

    const win = window as any;
    if (win.__ytPlayer) {
      if (typeof win.__ytPlayer.setVolume === 'function') {
        win.__ytPlayer.setVolume(targetVolumeRef.current);
      }
      if (typeof win.__ytPlayer.seekTo === 'function') {
        win.__ytPlayer.seekTo(0, true);
      }
      if (typeof win.__ytPlayer.playVideo === 'function') {
        win.__ytPlayer.playVideo();
      }
    }
    dispatchPlayCommand();
  }, [currentTrack, dispatchPlayCommand]);

  const nextTrack = useCallback(
    (isManualSkip = false) => {
      if (queue.length === 0) return;
      isTransitioningEarlyRef.current = false;
      digestJumpedTrackRef.current = null;
      digestStartPlaySecRef.current = null;

      if (repeatMode === 'one' && !isManualSkip && currentTrack) {
        repeatCurrentTrack();
        return;
      }

      let nextIdx = queueIndex + 1;
      if (isShuffle) {
        nextIdx = Math.floor(Math.random() * queue.length);
      }

      if (nextIdx < queue.length) {
        const rawNext = queue[nextIdx];
        setQueueIndex(nextIdx);
        setProgress(0);
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);

        if (rawNext.isLocal) {
          getPlayableOfflineTrack(rawNext).then((resolved) => {
            setCurrentTrack(resolved);
            dispatchPlayCommand();
          });
        } else {
          setCurrentTrack(rawNext);
          const win = window as any;
          if (win.__ytPlayer) {
            if (typeof win.__ytPlayer.setVolume === 'function') {
              win.__ytPlayer.setVolume(targetVolumeRef.current);
            }
            if (typeof win.__ytPlayer.loadVideoById === 'function') {
              win.__ytPlayer.loadVideoById(rawNext.id);
            }
          }
          dispatchPlayCommand();
        }
      } else if (repeatMode === 'all' && queue.length > 0) {
        const rawFirst = queue[0];
        setQueueIndex(0);
        setProgress(0);
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);

        if (rawFirst.isLocal) {
          getPlayableOfflineTrack(rawFirst).then((resolved) => {
            setCurrentTrack(resolved);
            dispatchPlayCommand();
          });
        } else {
          setCurrentTrack(rawFirst);
          const win = window as any;
          if (win.__ytPlayer) {
            if (typeof win.__ytPlayer.setVolume === 'function') {
              win.__ytPlayer.setVolume(targetVolumeRef.current);
            }
            if (typeof win.__ytPlayer.loadVideoById === 'function') {
              win.__ytPlayer.loadVideoById(rawFirst.id);
            } else if (typeof win.__ytPlayer.seekTo === 'function') {
              win.__ytPlayer.seekTo(0, true);
              win.__ytPlayer.playVideo();
            }
          }
          dispatchPlayCommand();
        }
      } else if (endlessRadioActive && currentTrack && !currentTrack.isLocal && navigator.onLine) {
        // Endless Emotion Radio: immediately fetch matching track when hitting queue end
        (async () => {
          try {
            const emotionRes = await api.getTrackCommentEmotions(
              currentTrack.id,
              currentTrack.title,
              currentTrack.artist
            );
            const domMood = emotionRes?.dominantMood || 'emotional';
            setEmotionRadioMood({
              id: domMood,
              name: emotionRes?.dominantMoodName || '感情マッチ',
            });
            const [moodRec, related] = await Promise.all([
              api.getMoodRecommendation(domMood).catch(() => null),
              api.getRelated(currentTrack.id).catch(() => []),
            ]);
            const existingIds = new Set(queue.map((t) => t.id));
            const fresh = [...(moodRec?.tracks || []), ...(related || [])].filter(
              (r) => r.id && !existingIds.has(r.id)
            );
            if (fresh.length > 0) {
              const nextItem = fresh[0];
              const newQueue = [...queue, ...fresh.slice(0, 6)];
              setQueue(newQueue);
              setQueueIndex(queue.length);
              setProgress(0);
              digestJumpedTrackRef.current = null;
              digestStartPlaySecRef.current = null;
              setCurrentTrack(nextItem);
              userIntendedPlayingRef.current = true;
              setIsPlaying(true);
              const win = window as any;
              if (win.__ytPlayer && typeof win.__ytPlayer.loadVideoById === 'function') {
                win.__ytPlayer.loadVideoById(nextItem.id);
              }
              dispatchPlayCommand();
              return;
            }
          } catch {}
          userIntendedPlayingRef.current = false;
          setIsPlaying(false);
        })();
      } else {
        userIntendedPlayingRef.current = false;
        setIsPlaying(false);
      }
    },
    [queue, queueIndex, repeatMode, isShuffle, currentTrack, endlessRadioActive, repeatCurrentTrack, dispatchPlayCommand]
  );

  const prevTrack = useCallback(() => {
    isTransitioningEarlyRef.current = false;
    digestJumpedTrackRef.current = null;
    digestStartPlaySecRef.current = null;
    if (progress > 3) {
      seekTo(0);
      return;
    }
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      const rawPrev = queue[prevIdx];
      setQueueIndex(prevIdx);
      setProgress(0);
      userIntendedPlayingRef.current = true;
      setIsPlaying(true);

      if (rawPrev.isLocal) {
        getPlayableOfflineTrack(rawPrev).then((resolved) => {
          setCurrentTrack(resolved);
          dispatchPlayCommand();
        });
      } else {
        setCurrentTrack(rawPrev);
        const win = window as any;
        if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
          win.__ytPlayer.setVolume(targetVolumeRef.current);
        }
        dispatchPlayCommand();
      }
    } else {
      seekTo(0);
    }
  }, [progress, queueIndex, queue, seekTo, dispatchPlayCommand]);

  // Refs for stable MediaSession callbacks (prevents 80ms handler churn on iOS/Android)
  const progressRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  const lastPositionSyncRef = useRef<number>(0);
  const digestJumpedTrackRef = useRef<string | null>(null);
  const digestStartPlaySecRef = useRef<number | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // 1) MediaSession Metadata (only updates when track identity/artwork changes)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;

    const resolveAbsUrl = (url?: string) => {
      if (!url) return '';
      if (/^https?:\/\//i.test(url)) return url;
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
      }
      return url;
    };

    const ytId = !currentTrack.isLocal && /^[a-zA-Z0-9_-]{11}$/.test(currentTrack.id) ? currentTrack.id : null;
    const primaryThumb = resolveAbsUrl(currentTrack.thumbnail);
    const artworkList: MediaImage[] = ytId
      ? [
          { src: `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' },
          { src: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
          { src: `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`, sizes: '640x480', type: 'image/jpeg' },
        ]
      : primaryThumb
      ? [
          { src: primaryThumb, sizes: '192x192', type: 'image/jpeg' },
          { src: primaryThumb, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [];

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Zero Music',
        artwork: artworkList,
      });
    } catch {
      // ignore
    }
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.album,
    currentTrack?.thumbnail,
  ]);

  // 2) MediaSession Action Handlers (stable refs so AirPods / lock screen buttons stay responsive)
  const mediaActionsRef = useRef({
    play: () => {},
    pause: () => {},
    prev: () => {},
    next: () => {},
    seekTo: (_sec: number) => {},
  });

  useEffect(() => {
    mediaActionsRef.current = {
      play: () => {
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);
        dispatchPlayCommand();
      },
      pause: () => {
        userIntendedPlayingRef.current = false;
        setIsPlaying(false);
        dispatchPauseCommand();
      },
      prev: () => prevTrack(),
      next: () => nextTrack(true),
      seekTo: (sec: number) => seekTo(sec),
    };
  }, [dispatchPlayCommand, dispatchPauseCommand, prevTrack, nextTrack, seekTo]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safeBind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // unsupported action on this browser
      }
    };

    safeBind('play', () => mediaActionsRef.current.play());
    safeBind('pause', () => mediaActionsRef.current.pause());
    safeBind('previoustrack', () => mediaActionsRef.current.prev());
    safeBind('nexttrack', () => mediaActionsRef.current.next());
    safeBind('seekto', (details) => {
      if (details.seekTime !== undefined) {
        mediaActionsRef.current.seekTo(details.seekTime);
        if (
          typeof ms.setPositionState === 'function' &&
          durationRef.current > 0
        ) {
          try {
            ms.setPositionState({
              duration: durationRef.current,
              playbackRate: playbackRateRef.current || 1,
              position: Math.min(durationRef.current, Math.max(0, details.seekTime)),
            });
          } catch {}
        }
      }
    });
    safeBind('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      mediaActionsRef.current.seekTo(Math.max(0, progressRef.current - offset));
    });
    safeBind('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      const maxDur = durationRef.current || 0;
      mediaActionsRef.current.seekTo(
        maxDur > 0 ? Math.min(maxDur, progressRef.current + offset) : progressRef.current + offset
      );
    });
    safeBind('stop', () => mediaActionsRef.current.pause());

    return () => {
      (['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward', 'stop'] as MediaSessionAction[]).forEach(
        (act) => safeBind(act, null)
      );
    };
  }, []);

  // 3) Sync playbackState & throttled setPositionState (every ~1s or on state change)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    if (duration > 0 && typeof navigator.mediaSession.setPositionState === 'function') {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: playbackRate || 1,
          position: Math.min(duration, Math.max(0, progressRef.current)),
        });
        lastPositionSyncRef.current = Date.now();
      } catch {}
    }
  }, [isPlaying, duration, playbackRate]);

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      duration <= 0 ||
      typeof navigator.mediaSession.setPositionState !== 'function'
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastPositionSyncRef.current >= 950) {
      lastPositionSyncRef.current = now;
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: playbackRate || 1,
          position: Math.min(duration, Math.max(0, progress)),
        });
      } catch {}
    }
  }, [progress, duration, playbackRate]);

  // Document Picture-in-Picture trigger (for desktop Chrome / Edge)
  const triggerDocumentPiP = useCallback(async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 360,
          height: 180,
        });

        const container = document.createElement('div');
        container.style.cssText =
          'background:#0d0d10;color:#fff;font-family:sans-serif;padding:12px;display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;justify-content:center;align-items:center;text-align:center;';

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:bold;font-size:13px;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        titleEl.textContent = currentTrack?.title || 'YouTube Music';

        const artistEl = document.createElement('div');
        artistEl.style.cssText = 'font-size:11px;color:#aaa;';
        artistEl.textContent = currentTrack?.artist || '';

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:12px;margin-top:6px;';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '⏮';
        prevBtn.style.cssText = 'background:#222;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;';
        prevBtn.onclick = () => prevTrack();

        const playBtn = document.createElement('button');
        playBtn.textContent = isPlaying ? '⏸' : '▶';
        playBtn.style.cssText = 'background:#dc2626;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;';
        playBtn.onclick = () => togglePlay();

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '⏭';
        nextBtn.style.cssText = 'background:#222;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;';
        nextBtn.onclick = () => nextTrack();

        btnRow.appendChild(prevBtn);
        btnRow.appendChild(playBtn);
        btnRow.appendChild(nextBtn);

        container.appendChild(titleEl);
        container.appendChild(artistEl);
        container.appendChild(btnRow);

        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.appendChild(container);
        return true;
      } catch (err) {
        console.warn('PiP window failed:', err);
        return false;
      }
    }
    return false;
  }, [currentTrack, isPlaying, prevTrack, nextTrack, togglePlay]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    targetVolumeRef.current = clamped;
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    const win = window as any;
    if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
      win.__ytPlayer.setVolume(clamped);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const win = window as any;
      if (win.__ytPlayer) {
        if (next && typeof win.__ytPlayer.mute === 'function') {
          win.__ytPlayer.mute();
        } else if (!next && typeof win.__ytPlayer.unMute === 'function') {
          win.__ytPlayer.unMute();
        }
      }
      return next;
    });
  }, []);

  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info', duration = 4000) => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, duration);
  }, []);

  const cycleShuffleMode = useCallback(async () => {
    setShuffleMode((prev) => {
      if (prev === 'off') {
        setIsShuffle(true);
        showToast('🔀 シャッフル再生: ON', 'info', 1500);
        return 'on';
      }
      if (prev === 'on') {
        setIsShuffle(true);
        if (currentTrack) {
          api.getRelated(currentTrack.id).then((related) => {
            if (related && related.length > 0) {
              setQueue((curr) => {
                const newItems = related.slice(0, 5).filter((r) => !curr.some((c) => c.id === r.id));
                return [...curr, ...newItems];
              });
              showToast('✨ スマートシャッフル: おすすめ曲をキューに追加しました', 'success', 2500);
            }
          }).catch(() => {});
        }
        return 'smart';
      }
      setIsShuffle(false);
      showToast('シャッフル再生: OFF', 'info', 1500);
      return 'off';
    });
  }, [currentTrack, showToast]);

  const toggleShuffle = useCallback(() => {
    cycleShuffleMode();
  }, [cycleShuffleMode]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    try {
      const win = window as any;
      if (win.__ytPlayer && typeof win.__ytPlayer.setPlaybackRate === 'function') {
        win.__ytPlayer.setPlaybackRate(rate);
      }
      const localAudio = document.querySelector('audio#local-audio-element') as HTMLAudioElement;
      if (localAudio) {
        localAudio.playbackRate = rate;
      }
    } catch {}
    showToast(`再生速度: ${rate}x`, 'info', 1500);
  }, [showToast]);

  const setAudioQuality = useCallback((q: 'auto' | 'low' | 'normal' | 'high') => {
    setAudioQualityState(q);
    try {
      localStorage.setItem('yt_audio_quality', q);
    } catch {}
    const labels = {
      auto: '自動',
      low: '低音質 (データ節約)',
      normal: '標準 (160kbps)',
      high: '最高音質 (320kbps相当)',
    };
    showToast(`音質設定: ${labels[q]}`, 'success', 2000);
  }, [showToast]);


  // Calculate Spotify Wrapped listening stats
  const listeningStats = useMemo(() => {
    const items = Object.values(historyStats);
    const totalSecs = items.reduce((acc, curr) => acc + (curr.seconds || 0), 0);
    const sortedTracks = [...items].sort((a, b) => b.count - a.count);

    const artistCounts: Record<string, number> = {};
    items.forEach((item) => {
      const art = item.track.artist || 'Unknown';
      artistCounts[art] = (artistCounts[art] || 0) + item.count;
    });
    const sortedArtists = Object.entries(artistCounts)
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count);

    const hr = new Date().getHours();
    let timeOfDay = '深夜型リスナー 🌙';
    if (hr >= 5 && hr < 11) timeOfDay = '朝活・爽快リスナー 🌅';
    else if (hr >= 11 && hr < 17) timeOfDay = '日中・作業集中リスナー ☀️';
    else if (hr >= 17 && hr < 23) timeOfDay = '夜のリラックスリスナー 🌆';

    const totalMins = Math.round(totalSecs / 60);
    return {
      totalMinutes: totalMins,
      totalMinutesListened: totalMins,
      totalPlayedTracks: sortedTracks.length,
      topTracks: sortedTracks,
      topArtists: sortedArtists,
      timeOfDay,
    };
  }, [historyStats]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleEndlessRadio = useCallback(() => {
    setEndlessRadioActive((prev) => !prev);
  }, []);

  const toggleDigestMode = useCallback(() => {
    setDigestMode((prev) => {
      const next = !prev;
      digestJumpedTrackRef.current = null;
      digestStartPlaySecRef.current = null;
      setDigestRemainingSec(25);
      if (next && currentTrack && duration > 45) {
        const targetHighlight =
          trackTimestamps?.highlightStartSec && trackTimestamps.highlightStartSec > 5
            ? trackTimestamps.highlightStartSec
            : Math.round(duration * 0.32);
        digestJumpedTrackRef.current = currentTrack.id;
        digestStartPlaySecRef.current = targetHighlight;
        seekTo(targetHighlight);
        showToast('⚡ ダイジェスト再生 ON（サビ・見どころ25秒連続再生）', 'info', 2500);
      } else if (!next) {
        showToast('ダイジェスト再生 OFF', 'info', 1500);
      }
      return next;
    });
  }, [currentTrack, duration, trackTimestamps, seekTo, showToast]);

  const startRadioForTrack = useCallback(
    async (seedTrack: Track) => {
      setEndlessRadioActive(true);
      playTrack(seedTrack, [seedTrack]);
      try {
        const related = await api.getRelated(seedTrack.id);
        if (related && related.length > 0) {
          setQueue([seedTrack, ...related]);
        }
      } catch (e) {
        console.warn('Failed to start radio:', e);
      }
    },
    [playTrack]
  );

  const toggleLikeTrack = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
    setQueueIndex((curr) => {
      if (index < curr) return curr - 1;
      return curr;
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
  }, [currentTrack]);

  const createUserPlaylist = useCallback((name: string) => {
    if (!name.trim()) return;
    const newPl: UserPlaylist = {
      id: `pl_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      tracks: [],
    };
    setUserPlaylists((prev) => [newPl, ...prev]);
  }, []);

  const saveTracksAsPlaylist = useCallback((name: string, tracks: Track[]) => {
    if (!name.trim() || !tracks || tracks.length === 0) return;
    const newPl: UserPlaylist = {
      id: `pl_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      tracks,
    };
    setUserPlaylists((prev) => [newPl, ...prev]);
  }, []);

  const addToUserPlaylist = useCallback((playlistId: string, track: Track) => {
    setUserPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const exists = pl.tracks.some((t) => t.id === track.id);
          if (exists) return pl;
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      })
    );
  }, []);

  const removeFromUserPlaylist = useCallback((playlistId: string, trackId: string) => {
    setUserPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
        }
        return pl;
      })
    );
  }, []);

  const deleteUserPlaylist = useCallback((playlistId: string) => {
    setUserPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  // Internal listeners from YouTube player with Crossfade & Endless Radio
  const onPlayerTimeUpdate = useCallback(
    (current: number, total: number) => {
      setProgress(current);
      if (total > 0) setDuration(total);

      const targetVol = targetVolumeRef.current;
      const win = window as any;

      // 1. Crossfade volume modulation
      if (crossfadeDuration > 0 && total > crossfadeDuration * 2 && targetVol > 0 && !isMuted) {
        // Fade in during initial seconds only during continuous playlist transition
        if (isTransitioningEarlyRef.current && current < crossfadeDuration) {
          const fadeInFactor = Math.min(1, Math.max(0.4, current / crossfadeDuration));
          const fadeVol = Math.round(targetVol * fadeInFactor);
          if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
            win.__ytPlayer.setVolume(fadeVol);
          }
        } else if (current >= crossfadeDuration && isTransitioningEarlyRef.current) {
          isTransitioningEarlyRef.current = false;
        }
        // Fade out near end of track
        else if (total - current <= crossfadeDuration) {
          const remaining = Math.max(0, total - current);
          const fadeOutFactor = Math.max(0, remaining / crossfadeDuration);
          const fadeVol = Math.round(targetVol * fadeOutFactor);
          if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
            win.__ytPlayer.setVolume(fadeVol);
          }
        }
      }

      // 2. Digest Highlight Mode (25s highlight clip per track)
      if (digestMode && currentTrack && total > 35 && userIntendedPlayingRef.current) {
        if (digestJumpedTrackRef.current !== currentTrack.id) {
          const targetStart =
            trackTimestamps?.highlightStartSec &&
            trackTimestamps.highlightStartSec > 4 &&
            trackTimestamps.highlightStartSec < total - 12
              ? trackTimestamps.highlightStartSec
              : Math.round(total * 0.32);
          digestJumpedTrackRef.current = currentTrack.id;
          digestStartPlaySecRef.current = targetStart;
          setDigestRemainingSec(25);
          if (Math.abs(current - targetStart) > 3) {
            seekTo(targetStart);
            return;
          }
        } else if (digestStartPlaySecRef.current !== null) {
          const elapsedClip = current - digestStartPlaySecRef.current;
          const remainingClip = Math.max(0, Math.ceil(25 - elapsedClip));
          setDigestRemainingSec(remainingClip);
          if (elapsedClip >= 25 && !isTransitioningEarlyRef.current) {
            isTransitioningEarlyRef.current = true;
            nextTrack(true);
            return;
          }
        }
      }

      // 3. Early gapless transition trigger
      const earlyCutoff = crossfadeDuration > 0 ? Math.min(1.0, crossfadeDuration * 0.25) : 0.4;
      if (
        total > 15 &&
        total - current <= earlyCutoff &&
        !isTransitioningEarlyRef.current &&
        userIntendedPlayingRef.current
      ) {
        isTransitioningEarlyRef.current = true;
        nextTrack();
      }

      // 4. Endless Emotion Radio auto-replenish queue (YouTube comment emotion matching)
      if (endlessRadioActive && currentTrack && !currentTrack.isLocal && !isFetchingRadioRef.current) {
        const remainingTracksInQueue = queue.length - 1 - queueIndex;
        if (remainingTracksInQueue <= 2) {
          isFetchingRadioRef.current = true;
          (async () => {
            try {
              const emotionRes = await api.getTrackCommentEmotions(
                currentTrack.id,
                currentTrack.title,
                currentTrack.artist
              );
              const domMood = emotionRes?.dominantMood || 'emotional';
              const domName = emotionRes?.dominantMoodName || '感情マッチ';
              setEmotionRadioMood({ id: domMood, name: domName });

              const moodRec = await api.getMoodRecommendation(domMood);
              const emotionMatches = moodRec?.tracks || [];
              const related = emotionMatches.length >= 3 ? [] : await api.getRelated(currentTrack.id);
              const combined = [...emotionMatches, ...related];

              if (combined.length > 0) {
                setQueue((curr) => {
                  const existingIds = new Set(curr.map((t) => t.id));
                  const fresh = combined.filter((r) => r.id && !existingIds.has(r.id)).slice(0, 6);
                  return fresh.length > 0 ? [...curr, ...fresh] : curr;
                });
              }
            } catch (err) {
              console.warn('Emotion radio replenishment error:', err);
              try {
                const related = await api.getRelated(currentTrack.id);
                if (related && related.length > 0) {
                  setQueue((curr) => {
                    const existingIds = new Set(curr.map((t) => t.id));
                    const fresh = related.filter((r) => !existingIds.has(r.id));
                    return fresh.length > 0 ? [...curr, ...fresh] : curr;
                  });
                }
              } catch {}
            } finally {
              setTimeout(() => {
                isFetchingRadioRef.current = false;
              }, 5000);
            }
          })();
        }
      }
    },
    [
      crossfadeDuration,
      isMuted,
      nextTrack,
      endlessRadioActive,
      currentTrack,
      queue.length,
      queueIndex,
      digestMode,
      trackTimestamps,
      seekTo,
    ]
  );

  // State change from YouTube player
  const onPlayerStateChange = useCallback(
    (isPlayingState: boolean) => {
      if (!isPlayingState) {
        // Check if user actually pressed pause vs YouTube automatically pausing on background/blur
        if (userIntendedPlayingRef.current && (document.hidden || !document.hasFocus())) {
          // Overrule auto-pause on background tab
          dispatchPlayCommand();
          setTimeout(dispatchPlayCommand, 100);
          setTimeout(dispatchPlayCommand, 300);
          return;
        }
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
    },
    [dispatchPlayCommand]
  );

  const fallbackInProgressRef = useRef<boolean>(false);
  const triedIdsRef = useRef<Set<string>>(new Set());

  const onPlayerError = useCallback(
    async (errorCode: number, _errorMsg?: string) => {
      if (!currentTrack) return;

      // Error 101/150: The owner has disabled embedding on other websites
      // Error 100: Video not found/removed
      // Error 2: Invalid parameter
      if (errorCode === 101 || errorCode === 150 || errorCode === 100 || errorCode === 2) {
        if (fallbackInProgressRef.current) return;
        fallbackInProgressRef.current = true;
        triedIdsRef.current.add(currentTrack.id);

        showToast(`⚠️ 埋め込み制限（エラー${errorCode}）を検知。代替の公式音源へ自動切替中...`, 'warning', 3500);

        try {
          const excludeParam = encodeURIComponent(Array.from(triedIdsRef.current).join(','));
          const res = await fetch(
            `/api/music/fallback?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(
              currentTrack.artist
            )}&exclude=${excludeParam}`
          );
          const data = await res.json();

          if (data.success && data.track && data.track.id) {
            const alternate = data.track;
            const updatedTrack: Track = {
              ...currentTrack,
              id: alternate.id,
              title: alternate.title || currentTrack.title,
              artist: alternate.artist || currentTrack.artist,
              thumbnail: alternate.thumbnail || currentTrack.thumbnail,
              duration: alternate.duration || currentTrack.duration,
              durationSeconds: alternate.durationSeconds || currentTrack.durationSeconds,
            };

            // Update in queue
            setQueue((prev) =>
              prev.map((t, idx) => (idx === queueIndex || t.id === currentTrack.id ? updatedTrack : t))
            );
            setCurrentTrack(updatedTrack);
            setIsPlaying(true);
            userIntendedPlayingRef.current = true;

            showToast(`✅ 埋め込み可能な代替音源（公式トピック版）へ自動切替しました`, 'success', 4000);

            setTimeout(() => {
              fallbackInProgressRef.current = false;
            }, 1500);
            return;
          }
        } catch (err) {
          console.warn('[AutoFallback] Failed to fetch alternative:', err);
        }

        // If fallback fails, skip to next track in queue smoothly
        showToast(`⚠️ 再生可能な代替音源が見つからないため、次の曲へスキップします`, 'info', 3000);
        setTimeout(() => {
          fallbackInProgressRef.current = false;
          nextTrack();
        }, 1200);
      }
    },
    [currentTrack, queueIndex, nextTrack, showToast]
  );

  const onPlayerTrackEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  return (
    <PlayerContext.Provider
      value={{
        toastNotification,
        setToastNotification,
        showToast,
        onPlayerError,

        currentTrack,
        queue,
        queueIndex,
        isPlaying,
        progress,
        duration,
        volume,
        isMuted,
        playerMode,
        repeatMode,
        isShuffle,
        shuffleMode,
        cycleShuffleMode,
        playbackRate,
        setPlaybackRate,
        audioQuality,
        setAudioQuality,
        wrappedModalOpen,
        setWrappedModalOpen,
        listeningStats,
        lyricsOpen,
        queueOpen,
        fullScreenPlayerOpen,
        setFullScreenPlayerOpen,
        inspectorOpen,
        activeView,
        selectedEntityId,
        searchQuery,
        likedTrackIds,
        likedTracks,
        recentTracks,
        userPlaylists,

        backgroundPlaybackEnabled,
        setBackgroundPlaybackEnabled,
        toggleBackgroundPlayback,
        wakeLockActive,
        toggleWakeLock,
        bgGuideOpen,
        setBgGuideOpen,
        triggerDocumentPiP,

        crossfadeDuration,
        setCrossfadeDuration,
        endlessRadioActive,
        toggleEndlessRadio,
        emotionRadioMood,
        startRadioForTrack,
        digestMode,
        toggleDigestMode,
        digestRemainingSec,
        trackTimestamps,
        importModalOpen,
        setImportModalOpen,

        playTrack,
        togglePlay,
        pause,
        resume,
        seekTo,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        setPlayerMode,
        togglePlayerMode,
        videoLayout,
        setVideoLayout,
        setLyricsOpen,
        setQueueOpen,
        setInspectorOpen,
        setActiveView,
        navigateTo,
        setSearchQuery,
        toggleLikeTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        createUserPlaylist,
        saveTracksAsPlaylist,
        addToUserPlaylist,
        removeFromUserPlaylist,
        deleteUserPlaylist,

        currentUser,
        accountEmail,
        accountModalOpen,
        setAccountModalOpen,
        registerUserAccount,
        loginUserAccount,
        logoutAccount,
        stats,
        onlineCount,
        refreshStats,

        isAdmin,
        adminModalOpen,
        setAdminModalOpen,
        adminLoginWithPassword,
        trackOffsets,
        refreshTrackOffsets,

        addToPlaylistModalOpen,
        setAddToPlaylistModalOpen,
        trackToAddToPlaylist,
        openAddToPlaylistModal,

        currentLyrics,
        activeSyncedLyricText,

        eqModalOpen,
        setEqModalOpen,

        shareModalOpen,
        setShareModalOpen,
        shareModalPayload,
        openShareModal,

        floatingPlayerVisible,
        setFloatingPlayerVisible,
        floatingPlayerCollapsed,
        setFloatingPlayerCollapsed,

        danmakuEnabled,
        setDanmakuEnabled,
        commentsModalOpen,
        setCommentsModalOpen,
        dmModalOpen,
        setDmModalOpen,
        dmTargetUser,
        openDmWithUser,
        notificationDrawerOpen,
        setNotificationDrawerOpen,
        unreadNotificationCount,
        refreshNotifications,
        termsModalOpen,
        setTermsModalOpen,
        storyModalOpen,
        setStoryModalOpen,
        quizModalOpen,
        setQuizModalOpen,
        matchModalOpen,
        setMatchModalOpen,
        collabModalOpen,
        setCollabModalOpen,

        userIntendedPlayingRef,
        onPlayerTimeUpdate,
        onPlayerStateChange,
        onPlayerTrackEnded,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};
