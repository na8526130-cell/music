import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Track, ViewType, PlayerMode, RepeatMode } from '../types/music';
import { api } from '../services/api';

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
  repeatMode: RepeatMode;
  isShuffle: boolean;
  lyricsOpen: boolean;
  queueOpen: boolean;
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

  // Crossfade & Endless Radio & Playlist Import
  crossfadeDuration: number;
  setCrossfadeDuration: (sec: number) => void;
  endlessRadioActive: boolean;
  toggleEndlessRadio: () => void;
  startRadioForTrack: (seedTrack: Track) => Promise<void>;
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
  addToUserPlaylist: (playlistId: string, track: Track) => void;
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
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [lyricsOpen, setLyricsOpen] = useState<boolean>(false);
  const [queueOpen, setQueueOpen] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [bgGuideOpen, setBgGuideOpen] = useState<boolean>(false);

  // Crossfade duration in seconds (0 = off, 2, 4, 6, 8)
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(4);
  // Endless radio station mode
  const [endlessRadioActive, setEndlessRadioActive] = useState<boolean>(true);
  // Playlist Import Modal open
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);

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
    (track: Track, customQueue?: Track[]) => {
      userIntendedPlayingRef.current = true;
      isTransitioningEarlyRef.current = false;
      setCurrentTrack(track);
      setProgress(0);
      setIsPlaying(true);

      // Record genuine telemetry
      api.recordPlaybackTelemetry({
        videoId: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        durationSeconds: track.durationSeconds,
      });

      // Reset volume to target volume when new track begins
      const win = window as any;
      if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
        win.__ytPlayer.setVolume(targetVolumeRef.current);
      }

      // Update history
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== track.id);
        return [track, ...filtered];
      });

      if (customQueue && customQueue.length > 0) {
        setQueue(customQueue);
        const idx = customQueue.findIndex((t) => t.id === track.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      } else {
        setQueue((prevQueue) => {
          const existingIdx = prevQueue.findIndex((t) => t.id === track.id);
          if (existingIdx >= 0) {
            setQueueIndex(existingIdx);
            return prevQueue;
          } else {
            const newQueue = [...prevQueue, track];
            setQueueIndex(newQueue.length - 1);
            return newQueue;
          }
        });
      }

      // Auto-fetch related songs in background if queue is short
      api.getRelated(track.id).then((related) => {
        if (related && related.length > 0) {
          setQueue((curr) => {
            if (curr.length <= 3) {
              const existingIds = new Set(curr.map((t) => t.id));
              const fresh = related.filter((r) => !existingIds.has(r.id)).slice(0, 10);
              return [...curr, ...fresh];
            }
            return curr;
          });
        }
      });
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
    const win = window as any;
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

      if (repeatMode === 'one' && !isManualSkip && currentTrack) {
        repeatCurrentTrack();
        return;
      }

      let nextIdx = queueIndex + 1;
      if (isShuffle) {
        nextIdx = Math.floor(Math.random() * queue.length);
      }

      if (nextIdx < queue.length) {
        setQueueIndex(nextIdx);
        setCurrentTrack(queue[nextIdx]);
        setProgress(0);
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);
        // Restore target volume
        const win = window as any;
        if (win.__ytPlayer) {
          if (typeof win.__ytPlayer.setVolume === 'function') {
            win.__ytPlayer.setVolume(targetVolumeRef.current);
          }
          if (typeof win.__ytPlayer.loadVideoById === 'function') {
            win.__ytPlayer.loadVideoById(queue[nextIdx].id);
          }
        }
        dispatchPlayCommand();
      } else if (repeatMode === 'all' && queue.length > 0) {
        setQueueIndex(0);
        setCurrentTrack(queue[0]);
        setProgress(0);
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);
        const win = window as any;
        if (win.__ytPlayer) {
          if (typeof win.__ytPlayer.setVolume === 'function') {
            win.__ytPlayer.setVolume(targetVolumeRef.current);
          }
          if (typeof win.__ytPlayer.loadVideoById === 'function') {
            win.__ytPlayer.loadVideoById(queue[0].id);
          } else if (typeof win.__ytPlayer.seekTo === 'function') {
            win.__ytPlayer.seekTo(0, true);
            win.__ytPlayer.playVideo();
          }
        }
        dispatchPlayCommand();
      } else {
        userIntendedPlayingRef.current = false;
        setIsPlaying(false);
      }
    },
    [queue, queueIndex, repeatMode, isShuffle, currentTrack, repeatCurrentTrack, dispatchPlayCommand]
  );

  const prevTrack = useCallback(() => {
    isTransitioningEarlyRef.current = false;
    if (progress > 3) {
      seekTo(0);
      return;
    }
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      setCurrentTrack(queue[prevIdx]);
      setProgress(0);
      userIntendedPlayingRef.current = true;
      setIsPlaying(true);
      const win = window as any;
      if (win.__ytPlayer && typeof win.__ytPlayer.setVolume === 'function') {
        win.__ytPlayer.setVolume(targetVolumeRef.current);
      }
      dispatchPlayCommand();
    } else {
      seekTo(0);
    }
  }, [progress, queueIndex, queue, seekTo, dispatchPlayCommand]);

  // MediaSession OS Controls (Lock Screen, Notification Center, Media Keys, Bluetooth)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentTrack) {
      const artwork = currentTrack.thumbnail
        ? [
            { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
            { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'YouTube Music',
        artwork,
      });
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    try {
      // Direct synchronous lockscreen/remote play action
      navigator.mediaSession.setActionHandler('play', () => {
        userIntendedPlayingRef.current = true;
        setIsPlaying(true);
        dispatchPlayCommand();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        userIntendedPlayingRef.current = false;
        setIsPlaying(false);
        dispatchPauseCommand();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.max(0, progress - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        seekTo(Math.min(duration || 0, progress + offset));
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        userIntendedPlayingRef.current = false;
        setIsPlaying(false);
        dispatchPauseCommand();
      });
    } catch (e) {
      console.warn('[MediaSession] Action handler error:', e);
    }
  }, [
    currentTrack,
    isPlaying,
    progress,
    duration,
    dispatchPlayCommand,
    dispatchPauseCommand,
    prevTrack,
    nextTrack,
    seekTo,
  ]);

  // Position state update
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator &&
      duration > 0 &&
      typeof navigator.mediaSession.setPositionState === 'function'
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(duration, Math.max(0, progress)),
        });
      } catch {
        // ignore
      }
    }
  }, [progress, duration]);

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

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

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

      // 2. Early gapless transition trigger
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

      // 3. Endless Radio auto-replenish queue when reaching near the end
      if (endlessRadioActive && currentTrack && !isFetchingRadioRef.current) {
        const remainingTracksInQueue = queue.length - 1 - queueIndex;
        if (remainingTracksInQueue <= 2) {
          isFetchingRadioRef.current = true;
          api
            .getRelated(currentTrack.id)
            .then((related) => {
              if (related && related.length > 0) {
                setQueue((curr) => {
                  const existingIds = new Set(curr.map((t) => t.id));
                  const fresh = related.filter((r) => !existingIds.has(r.id));
                  if (fresh.length > 0) {
                    return [...curr, ...fresh];
                  }
                  return curr;
                });
              }
            })
            .catch((err) => console.warn('Endless radio replenishment error:', err))
            .finally(() => {
              setTimeout(() => {
                isFetchingRadioRef.current = false;
              }, 4000);
            });
        }
      }
    },
    [crossfadeDuration, isMuted, nextTrack, endlessRadioActive, currentTrack, queue.length, queueIndex]
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

  const onPlayerTrackEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  return (
    <PlayerContext.Provider
      value={{
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
        lyricsOpen,
        queueOpen,
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
        startRadioForTrack,
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
