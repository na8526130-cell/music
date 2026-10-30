import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Tv, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    __ytPlayer: any;
  }
}

// 1-second lossless silent WAV data URI to keep the browser's native AudioSession active in the background
const SILENT_AUDIO_LOOP =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD///8=';

export const YouTubePlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playerMode,
    setPlayerMode,
    backgroundPlaybackEnabled,
    userIntendedPlayingRef,
    onPlayerTimeUpdate,
    onPlayerStateChange,
    onPlayerTrackEnded,
  } = usePlayer();

  const playerRef = useRef<any>(null);
  const isApiLoaded = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<any>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      isApiLoaded.current = true;
      initPlayer();
    };
  }, []);

  const sendIframePlayCommand = () => {
    try {
      const iframe = document.querySelector('iframe#yt-player-target, #yt-player-target iframe') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    } catch {
      // ignore
    }
  };

  const initPlayer = () => {
    if (playerRef.current) return;
    try {
      playerRef.current = new window.YT.Player('yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: currentTrack ? currentTrack.id : '',
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            window.__ytPlayer = event.target;
            event.target.setVolume(volume);
            if (isMuted) {
              event.target.mute();
            }
            if (currentTrack) {
              event.target.loadVideoById(currentTrack.id);
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
        },
      });
      window.__ytPlayer = playerRef.current;
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

  return (
    <>
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
        - When in video mode: rendered as floating or docked 16:9 view.
        - When in cover mode: placed at fixed bottom-4 right-4 with 10px by 10px dimensions
          inside the viewport so Chrome/Safari never flags it as "detached" or "unrenderable",
          allowing the audio thread to remain active in background tabs.
      */}
      <div
        ref={containerRef}
        className={`transition-all duration-300 ${
          playerMode === 'video' && currentTrack
            ? 'fixed bottom-24 right-4 sm:right-6 z-40 w-80 sm:w-96 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-700/80 ring-1 ring-white/10'
            : 'fixed bottom-4 right-4 w-10 h-10 overflow-hidden pointer-events-none opacity-90 z-0'
        }`}
      >
        {playerMode === 'video' && currentTrack && (
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between bg-black/75 backdrop-blur-md rounded-lg px-2.5 py-1 pointer-events-auto">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <Tv className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-[11px] text-white font-medium truncate">
                {currentTrack.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {backgroundPlaybackEnabled && (
                <span title="バックグラウンド再生中" className="flex items-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
              <button
                type="button"
                onClick={() => setPlayerMode('cover')}
                className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
                title="動画を閉じてカバーモードへ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div id="yt-player-target" className="w-full h-full" />
      </div>
    </>
  );
};
