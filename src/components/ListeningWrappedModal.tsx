import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';
import {
  Sparkles,
  Play,
  Heart,
  X,
  Trophy,
  Flame,
  Clock,
  Music,
  Share2,
  Calendar,
} from 'lucide-react';

export const ListeningWrappedModal: React.FC = () => {
  const {
    wrappedModalOpen,
    setWrappedModalOpen,
    listeningStats,
    playTrack,
    likedTracks,
    setStoryModalOpen,
  } = usePlayer();

  if (!wrappedModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#240306] via-[#120103] to-black border border-red-900/50 p-6 sm:p-7 shadow-2xl text-white space-y-6 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  あなたの Spotify Wrapped
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30 uppercase">
                  STATS
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                あなただけのリスニング記録とトップランキング
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWrappedModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Stat Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/30 space-y-1">
            <Clock className="w-4 h-4 text-red-400 mx-auto" />
            <p className="text-lg sm:text-xl font-black text-white font-mono">
              {listeningStats.totalMinutes}
              <span className="text-xs text-neutral-400 font-sans ml-1">分</span>
            </p>
            <p className="text-[10px] text-neutral-400">総再生時間</p>
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/30 space-y-1">
            <Flame className="w-4 h-4 text-red-400 mx-auto" />
            <p className="text-lg sm:text-xl font-black text-white font-mono">
              {listeningStats.topTracks.length}
              <span className="text-xs text-neutral-400 font-sans ml-1">曲</span>
            </p>
            <p className="text-[10px] text-neutral-400">再生履歴</p>
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/30 space-y-1">
            <Heart className="w-4 h-4 text-red-400 mx-auto fill-red-500" />
            <p className="text-lg sm:text-xl font-black text-white font-mono">
              {likedTracks.length}
              <span className="text-xs text-neutral-400 font-sans ml-1">曲</span>
            </p>
            <p className="text-[10px] text-neutral-400">お気に入り</p>
          </div>
        </div>

        {/* Listening Personality Tag */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/50 via-neutral-900 to-black border border-red-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-400" />
            <span>
              あなたのリスニング傾向:{' '}
              <strong className="text-red-300">{listeningStats.timeOfDay}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">リアルタイム集計</span>
        </div>

        {/* Top 5 Songs Podium */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-red-400" />
            <span>最も聴いたトップ5楽曲</span>
          </h3>

          {listeningStats.topTracks.length > 0 ? (
            <div className="space-y-1.5 divide-y divide-neutral-900/80">
              {listeningStats.topTracks.slice(0, 5).map((item, idx) => (
                <div
                  key={item.track.id || idx}
                  onClick={() => playTrack(item.track)}
                  className="flex items-center justify-between gap-3 py-2 px-2 hover:bg-neutral-900/80 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 text-center text-xs font-mono font-bold ${
                        idx === 0
                          ? 'text-red-400 text-sm font-black'
                          : 'text-neutral-500'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                      <SafeImage
                        src={item.track.thumbnail}
                        alt={item.track.title}
                        useBase64
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                        {item.track.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {item.track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-900/40">
                      {item.count}回 再生
                    </span>
                    <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-4 text-center">
              曲を再生すると、ここにあなたのトップ楽曲が自動集計されます
            </p>
          )}
        </div>

        {/* Top Artists */}
        {listeningStats.topArtists.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-red-400" />
              <span>お気に入りトップアーティスト</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {listeningStats.topArtists.slice(0, 4).map((art, i) => (
                <div
                  key={art.artist}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs"
                >
                  <span className="w-4 text-center font-mono font-bold text-red-400">
                    #{i + 1}
                  </span>
                  <span className="font-semibold text-white">{art.artist}</span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {art.count}回
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Button (Story Generator integration) */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setWrappedModalOpen(false);
              setStoryModalOpen(true);
            }}
            className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Wrapped画像を生成して共有</span>
          </button>
          <button
            type="button"
            onClick={() => setWrappedModalOpen(false)}
            className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl border border-neutral-800 transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
