import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { equalizer } from '../services/equalizer';
import {
  X,
  Tv,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MessageSquare,
  FileText,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

declare global {
  interface Window {
    YT: any;
    YTConfig: any;
    onYouTubeIframeAPIReady: () => void;
    __ytPlayer: any;
  }
}

const YOUTUBE_NOCOOKIE_HOST = 'https://www.youtube-nocookie.com';

// 1-second lossless silent WAV data URI to keep the browser's native AudioSession active in the background
const SILENT_AUDIO_LOOP =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD///8=';

export const YouTubePlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    seekTo,
    togglePlay,
    prevTrack,
    nextTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playerMode,
    setPlayerMode,
    videoLayout,
    setVideoLayout,
    danmakuEnabled,
    setDanmakuEnabled,
    setLyricsOpen,
    backgroundPlaybackEnabled,
    userIntendedPlayingRef,
    onPlayerTimeUpdate,
    onPlayerStateChange,
    onPlayerTrackEnded,
    onPlayerError,
    trackTimestamps,
    digestMode,
    toggleDigestMode,
    digestRemainingSec,
  } = usePlayer();

  const playerRef = useRef<any>(null);
  const isApiLoaded = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const [copiedEmbed, setCopiedEmbed] = React.useState(false);

  const copyTextWithFallback = (text: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // ignore
    }
  };

  const handleCopyNocookieEmbed = () => {
    if (!currentTrack) return;
    const safeTitle = currentTrack.title.replace(/"/g, '&quot;');
    const code = `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${currentTrack.id}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    copyTextWithFallback(code);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  // Sync local audio playback (MP3, WAV, FLAC, M4A)
  useEffect(() => {
    const audio = localAudioRef.current;
    if (!audio) return;

    if (currentTrack?.isLocal && currentTrack.audioUrl) {
      equalizer.connectLocalAudio(audio);

      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }

      if (audio.src !== currentTrack.audioUrl) {
        audio.src = currentTrack.audioUrl;
        audio.load();
      }

      audio.volume = isMuted ? 0 : volume / 100;

      if (isPlaying) {
        audio.play().catch(() => {});
        onPlayerStateChange(true);
      } else {
        audio.pause();
        onPlayerStateChange(false);
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, volume, isMuted, onPlayerStateChange]);

  // Keep currentTrack ref synced to prevent stale closures
  const currentTrackRef = useRef(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    // Ensure YTConfig uses youtube-nocookie.com BEFORE iframe_api loads
    window.YTConfig = {
      ...(window.YTConfig || {}),
      host: YOUTUBE_NOCOOKIE_HOST,
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      // Official API script loads from youtube.com; YTConfig.host & player host enforce youtube-nocookie.com embeds
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') {
        try { prevReady(); } catch {}
      }
      isApiLoaded.current = true;
      initPlayer();
    };

    // Fallback polling in case the script loaded or callback fired before listener attached
    const timer = setInterval(() => {
      if (window.YT && window.YT.Player && !playerRef.current) {
        clearInterval(timer);
        initPlayer();
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  const sendIframePlayCommand = () => {
    try {
      const iframe = (ytContainerRef.current?.querySelector('iframe') ||
        document.querySelector('iframe#yt-player-frame-mount, iframe')) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    } catch {
      // ignore
    }
  };

  const initPlayer = () => {
    if (playerRef.current) return;
    if (!ytContainerRef.current) return;

    // Isolate YouTube API from React virtual DOM: create dynamic node inside container
    ytContainerRef.current.innerHTML = '';
    const mountEl = document.createElement('div');
    mountEl.id = 'yt-player-frame-mount';
    ytContainerRef.current.appendChild(mountEl);

    // Enforce youtube-nocookie.com host on YTConfig prior to player instantiation
    window.YTConfig = {
      ...(window.YTConfig || {}),
      host: YOUTUBE_NOCOOKIE_HOST,
    };

    const activeTrack = currentTrackRef.current;
    try {
      playerRef.current = new window.YT.Player(mountEl, {
        host: YOUTUBE_NOCOOKIE_HOST,
        height: '100%',
        width: '100%',
        videoId: activeTrack ? activeTrack.id : '',
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            window.__ytPlayer = event.target;
            // Enforce nocookie domain & cross-origin embed attributes on generated iframe
            const iframeEl = ytContainerRef.current?.querySelector('iframe');
            if (iframeEl) {
              iframeEl.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              iframeEl.setAttribute(
                'allow',
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              );
              iframeEl.setAttribute('allowfullscreen', '');
              if (iframeEl.src && /youtube\.com\/embed/i.test(iframeEl.src)) {
                iframeEl.src = iframeEl.src.replace(
                  /https?:\/\/(www\.)?youtube\.com\/embed/i,
                  `${YOUTUBE_NOCOOKIE_HOST}/embed`
                );
              }
            }
            event.target.setVolume(volume);
            if (isMuted) {
              event.target.mute();
            }
            const trackToPlay = currentTrackRef.current;
            if (trackToPlay) {
              event.target.loadVideoById(trackToPlay.id);
              lastTrackIdRef.current = trackToPlay.id;
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              onPlayerStateChange(true);
              startAudioHardwareKeepAlive();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              // Critical: check if the pause was forced by browser hiding the tab/locking the screen
              if (
                backgroundPlaybackEnabled &&
                userIntendedPlayingRef.current &&
                (document.hidden || !document.hasFocus())
              ) {
                // Background pause detected -> Counter it by auto-resuming playback!
                sendIframePlayCommand();
                setTimeout(() => {
                  if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                    playerRef.current.playVideo();
                  }
                }, 100);
                return;
              }

              onPlayerStateChange(false);
              stopAudioHardwareKeepAlive();
            } else if (event.data === window.YT.PlayerState.ENDED) {
              onPlayerStateChange(false);
              stopAudioHardwareKeepAlive();
              onPlayerTrackEnded();
            }
          },
          onError: (event: any) => {
            const errCodes: Record<number, string> = {
              2: '無効な動画パラメータ',
              5: 'HTML5プレーヤーエラー',
              100: '動画が見つかりません/非公開',
              101: '埋め込み再生不許可',
              150: '埋め込み再生不許可 (配信者制限)',
            };
            const errorMsg = errCodes[event.data] || `プレーヤーエラー (${event.data})`;
            api.recordErrorTelemetry({
              videoId: currentTrack?.id,
              title: currentTrack?.title,
              error: errorMsg,
            });
            // Trigger automatic fallback bypass for embedding restrictions
            if (typeof onPlayerError === 'function') {
              onPlayerError(event.data, errorMsg);
            }
          },
        },
      });
      window.__ytPlayer = playerRef.current;
      // Immediately ensure generated iframe attributes enforce nocookie + strict-origin referrer policy
      const createdIframe = ytContainerRef.current?.querySelector('iframe');
      if (createdIframe) {
        createdIframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        createdIframe.setAttribute(
          'allow',
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        );
        createdIframe.setAttribute('allowfullscreen', '');
        if (createdIframe.src && /youtube\.com\/embed/i.test(createdIframe.src)) {
          createdIframe.src = createdIframe.src.replace(
            /https?:\/\/(www\.)?youtube\.com\/embed/i,
            `${YOUTUBE_NOCOOKIE_HOST}/embed`
          );
        }
      }
    } catch (e) {
      console.error('[YouTubePlayer] Error creating YT.Player:', e);
    }
  };

  // Web Audio API hardware session maintainer (prevents mobile OS from killing audio session)
  const startAudioHardwareKeepAlive = () => {
    if (!backgroundPlaybackEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      if (audioCtxRef.current && !oscillatorRef.current) {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.frequency.setValueAtTime(30, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.00001, audioCtxRef.current.currentTime); // Inaudible to human ear
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        oscillatorRef.current = osc;
      }

      if (keepAliveAudioRef.current && keepAliveAudioRef.current.paused) {
        keepAliveAudioRef.current.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const stopAudioHardwareKeepAlive = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (keepAliveAudioRef.current && !keepAliveAudioRef.current.paused) {
        keepAliveAudioRef.current.pause();
      }
    } catch {
      // ignore
    }
  };

  // Listen to visibilitychange and blur events to aggressively prevent YouTube's background pause
  useEffect(() => {
    const handleBackgroundEvent = () => {
      if (backgroundPlaybackEnabled && userIntendedPlayingRef.current) {
        // Immediate play push
        sendIframePlayCommand();
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }

        // Staggered recovery to defeat YouTube's 100ms delayed blur handler
        [60, 180, 400, 1000].forEach((ms) => {
          setTimeout(() => {
            if (userIntendedPlayingRef.current && playerRef.current) {
              sendIframePlayCommand();
              playerRef.current.playVideo();
            }
          }, ms);
        });

        startAudioHardwareKeepAlive();
      }
    };

    document.addEventListener('visibilitychange', handleBackgroundEvent);
    window.addEventListener('blur', handleBackgroundEvent);

    return () => {
      document.removeEventListener('visibilitychange', handleBackgroundEvent);
      window.removeEventListener('blur', handleBackgroundEvent);
    };
  }, [backgroundPlaybackEnabled, userIntendedPlayingRef]);

  // Sync track change
  const lastTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTrack || !playerRef.current) return;

    const iframeEl = ytContainerRef.current?.querySelector('iframe');
    if (iframeEl && iframeEl.src && /youtube\.com\/embed/i.test(iframeEl.src)) {
      iframeEl.src = iframeEl.src.replace(
        /https?:\/\/(www\.)?youtube\.com\/embed/i,
        `${YOUTUBE_NOCOOKIE_HOST}/embed`
      );
    }

    if (lastTrackIdRef.current !== currentTrack.id) {
      lastTrackIdRef.current = currentTrack.id;
      if (typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(currentTrack.id);
      }
    }
  }, [currentTrack]);

  // Sync play/pause state
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      const state = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
      if (isPlaying && state !== window.YT?.PlayerState?.PLAYING && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === window.YT?.PlayerState?.PLAYING && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } catch {
      // ignore
    }
  }, [isPlaying]);

  // Sync volume & mute
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(volume);
      }
      if (isMuted && typeof playerRef.current.mute === 'function') {
        playerRef.current.mute();
      } else if (!isMuted && typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
      }
    } catch {
      // ignore
    }
  }, [volume, isMuted]);

  // Progress update timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const current = playerRef.current.getCurrentTime() || 0;
          const total = playerRef.current.getDuration() || 0;
          onPlayerTimeUpdate(current, total);
        } catch {
          // ignore
        }
      }
    }, 80);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onPlayerTimeUpdate]);

  // Expose local audio element globally for seek and pause commands
  useEffect(() => {
    (window as any).__localAudio = localAudioRef.current;
    return () => {
      (window as any).__localAudio = null;
    };
  }, []);

  return (
    <>
      {/* Native HTML5 audio for local files (MP3, WAV, FLAC, M4A) */}
      <audio
        ref={localAudioRef}
        playsInline
        preload="auto"
        onTimeUpdate={(e) => {
          if (currentTrack?.isLocal) {
            onPlayerTimeUpdate(e.currentTarget.currentTime, e.currentTarget.duration || currentTrack.durationSeconds || 0);
          }
        }}
        onEnded={() => {
          if (currentTrack?.isLocal) {
            onPlayerTrackEnded();
          }
        }}
        className="hidden pointer-events-none"
      />

      {/* Hidden native HTML5 audio keep-alive element */}
      <audio
        ref={keepAliveAudioRef}
        src={SILENT_AUDIO_LOOP}
        loop
        playsInline
        preload="auto"
        className="hidden pointer-events-none"
      />

      {/*
        The YouTube player container:
        - When in video mode with 'theater' layout: full screen/ambient theater overlay.
        - When in video mode with 'pip' layout: docked floating PiP 16:9 view at bottom right.
        - When in cover mode: placed at fixed bottom-4 right-4 with 10px by 10px dimensions
          inside the viewport so Chrome/Safari never flags it as "detached" or "unrenderable",
          allowing the audio thread to remain active in background tabs.
        Crucial: #yt-player-target stays inside the same DOM container tree so iframe NEVER unmounts!
      */}
      <div
        ref={containerRef}
        className={`transition-all duration-300 ${
          playerMode === 'video'
            ? videoLayout === 'theater'
              ? 'fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200'
              : 'fixed bottom-24 right-4 sm:right-6 z-40 w-80 sm:w-96 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/80 ring-1 ring-white/10 group animate-in slide-in-from-bottom-4 duration-200'
            : 'fixed bottom-4 right-4 w-10 h-10 overflow-hidden pointer-events-none opacity-0 z-0'
        }`}
      >
        {/* Theater View: Top Cinema Header */}
        {playerMode === 'video' && videoLayout === 'theater' && (
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between pb-2 sm:pb-3 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-full bg-red-600/25 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm shadow-red-950/50">
                <Tv className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube 公式MVシアター</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              </span>
              <button
                type="button"
                onClick={handleCopyNocookieEmbed}
                disabled={!currentTrack}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-red-900/50 text-[10px] font-mono text-neutral-200 hover:text-white shrink-0 cursor-pointer transition-colors disabled:opacity-40"
                title="youtube-nocookie.com 埋め込みHTMLをコピー"
              >
                {copiedEmbed ? (
                  <Check className="w-3 h-3 text-red-500" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-red-500" />
                )}
                <span className="sm:hidden">{copiedEmbed ? 'コピー完了' : 'nocookie'}</span>
                <span className="hidden sm:inline">{copiedEmbed ? 'nocookieコピー完了' : 'youtube-nocookie.com'}</span>
                {!copiedEmbed && <Copy className="w-2.5 h-2.5 opacity-60" />}
              </button>
              <div className="min-w-0">
                <h3 className="text-white font-extrabold text-sm sm:text-base truncate drop-shadow-md">
                  {currentTrack ? currentTrack.title : 'MVシアター'}
                </h3>
                <p className="text-xs text-neutral-400 truncate">
                  {currentTrack ? currentTrack.artist : '曲を選択'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Danmaku Toggle */}
              <button
                type="button"
                onClick={() => setDanmakuEnabled((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  danmakuEnabled
                    ? 'bg-red-950/60 text-red-300 border-red-600/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
                title="弾幕コメント表示切替"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">弾幕 {danmakuEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* Switch to Floating PiP Mode */}
              <button
                type="button"
                onClick={() => setVideoLayout('pip')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="小画面 (PiP) にして他のページを閲覧"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">小画面 (PiP)</span>
              </button>

              {/* Back to Audio Only */}
              <button
                type="button"
                onClick={() => setPlayerMode('cover')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                title="動画を閉じて音声モードに戻す"
              >
                <Music className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">音声のみ</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPlayerMode('cover')}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Stage Frame */}
        <div
          className={`${
            playerMode === 'video' && videoLayout === 'theater'
              ? 'w-full flex-1 min-h-0 flex items-center justify-center p-1 sm:p-4 my-auto relative'
              : 'w-full h-full relative'
          }`}
        >
          {/* Ambient red & black backlight in theater mode */}
          {playerMode === 'video' && videoLayout === 'theater' && (
            <div className="absolute -inset-2 bg-gradient-to-r from-red-700/25 via-red-950/20 to-black rounded-3xl blur-2xl -z-10 pointer-events-none" />
          )}

          <div
            className={`${
              playerMode === 'video' && videoLayout === 'theater'
                ? 'relative w-full max-w-5xl aspect-video max-h-[78vh] rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/80 bg-black flex items-center justify-center'
                : 'w-full h-full relative'
            }`}
          >
            {/* 1. Permanent player mount - ISOLATED from React Virtual DOM */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div ref={ytContainerRef} className="w-full h-full" />
            </div>

            {/* 2. Floating PiP Top Hover Controls */}
            {playerMode === 'video' && videoLayout === 'pip' && currentTrack && (
              <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between bg-black/80 backdrop-blur-md rounded-lg px-2.5 py-1.5 pointer-events-auto border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <Tv className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="text-[11px] text-white font-semibold truncate drop-shadow-sm">
                    {currentTrack.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyNocookieEmbed}
                    className="text-neutral-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="youtube-nocookie.com 埋め込みHTMLをコピー"
                  >
                    {copiedEmbed ? (
                      <Check className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoLayout('theater')}
                    className="text-neutral-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="大画面シアターモードに拡大"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerMode('cover')}
                    className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="動画を閉じてカバーモードへ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 3. If no track is playing yet in theater mode */}
            {playerMode === 'video' && videoLayout === 'theater' && !currentTrack && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-neutral-900/90 text-white pointer-events-auto">
                <Tv className="w-12 h-12 text-red-500 mb-3 animate-pulse" />
                <h4 className="text-lg font-bold mb-1">公式MVシアター</h4>
                <p className="text-xs text-neutral-400 max-w-md mb-4">
                  youtube-nocookie.com 埋め込み再生
                </p>
                <button
                  type="button"
                  onClick={() => setPlayerMode('cover')}
                  className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-red-900/40"
                >
                  楽曲一覧に戻る
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Theater View: Bottom Cinema Controls */}
        {playerMode === 'video' && videoLayout === 'theater' && currentTrack && (
          <div className="w-full max-w-5xl mx-auto pt-3 shrink-0">
            {/* Scrub Bar with Comment Heatmap Markers */}
            <div
              className="w-full h-1.5 bg-neutral-800 rounded-full cursor-pointer relative overflow-hidden group hover:h-2.5 transition-all mb-2"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seekTo(pos * duration);
              }}
            >
              {trackTimestamps?.heatMarkers?.map((m, idx) => (
                <span
                  key={idx}
                  title={`${m.timeLabel} ${m.topLabel}`}
                  className="absolute top-0 bottom-0 w-1.5 -translate-x-1/2 bg-red-500 rounded-full z-10 pointer-events-none"
                  style={{ left: `${m.percent}%`, opacity: 0.45 + m.heat * 0.55 }}
                />
              ))}
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full relative z-20"
                style={{
                  width: `${duration > 0 ? Math.min(100, (progress / duration) * 100) : 0}%`,
                }}
              />
            </div>

            {/* Quick Playback Bar */}
            <div className="flex items-center justify-between text-xs text-neutral-400 gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={prevTrack}
                  className="p-1.5 hover:text-white transition-colors cursor-pointer"
                  title="前の曲"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 transition-transform active:scale-95 cursor-pointer"
                  title={isPlaying ? '一時停止' : '再生'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => nextTrack(true)}
                  className="p-1.5 hover:text-white transition-colors cursor-pointer"
                  title="次の曲"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <span className="font-mono text-neutral-300">
                  {formatSeconds(progress)} / {formatSeconds(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleDigestMode}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 border transition-colors cursor-pointer ${
                    digestMode
                      ? 'bg-red-600 text-white border-red-400 font-bold'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                  }`}
                  title="サビ・見どころ25秒ダイジェスト再生"
                >
                  <Zap className={`w-3.5 h-3.5 ${digestMode ? 'fill-white' : 'text-red-400'}`} />
                  <span className="text-[11px] font-mono">
                    {digestMode ? `${digestRemainingSec}s` : 'ダイジェスト'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyNocookieEmbed}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white flex items-center gap-1.5 border border-red-900/50 transition-colors cursor-pointer"
                  title="youtube-nocookie.com 埋め込みHTMLをコピー"
                >
                  {copiedEmbed ? (
                    <Check className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className="text-[11px] font-mono">
                    {copiedEmbed ? 'コピー完了' : 'nocookie埋め込み'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLyricsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer"
                  title="歌詞を見る"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">歌詞</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    title={isMuted ? 'ミュート解除' : 'ミュート'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-16 sm:w-24 h-1 accent-red-600 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
