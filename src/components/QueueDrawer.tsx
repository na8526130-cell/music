import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Track } from '../types/music';
import { X, Trash2, Play, Plus, Sparkles, Music } from 'lucide-react';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentTrack,
    queueOpen,
    setQueueOpen,
    playTrack,
    removeFromQueue,
    clearQueue,
    addToQueue,
  } = usePlayer();

  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!queueOpen || !currentTrack) return;
    setLoadingRelated(true);
    api
      .getRelated(currentTrack.id)
      .then((res) => {
        setRelatedTracks(res.slice(0, 10));
        setLoadingRelated(false);
      })
      .catch(() => {
        setLoadingRelated(false);
      });
  }, [queueOpen, currentTrack?.id]);

  if (!queueOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] z-50 bg-[#0d0d10] border-l border-neutral-800 shadow-2xl flex flex-col backdrop-blur-2xl transition-transform"
      aria-label="キュー管理パネル"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-[#121215]">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            再生キュー ({queue.length}曲)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <button
              type="button"
              onClick={clearQueue}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-neutral-800"
              title="キューをクリア"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>クリア</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-6">
        {/* Now Playing */}
        {currentTrack && (
          <div>
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-2 px-2">
              再生中
            </span>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-red-600/10 border border-red-500/20">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded object-cover shadow shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-neutral-300 truncate">{currentTrack.artist}</p>
              </div>
              <span className="text-xs text-neutral-400 font-mono pr-2">{currentTrack.duration}</span>
            </div>
          </div>
        )}

        {/* Next Up in Queue */}
        <div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 px-2">
            次の曲
          </span>
          {queue.length <= 1 ? (
            <div className="text-center py-6 text-xs text-neutral-500 px-4">
              キューに待機中の楽曲はありません。下のInnerTube関連おすすめから追加できます。
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track, idx) => {
                if (idx === queueIndex) return null;
                const isPast = idx < queueIndex;
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/60 group transition-colors ${
                      isPast ? 'opacity-40' : ''
                    }`}
                  >
                    <span className="w-5 text-center text-xs font-mono text-neutral-500">
                      {idx + 1}
                    </span>
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{track.title}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400 hidden group-hover:hidden sm:inline">
                      {track.duration}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => playTrack(track, queue)}
                        className="p-1.5 text-neutral-300 hover:text-white rounded hover:bg-neutral-700"
                        title="今すぐ再生"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(idx)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-700"
                        title="キューから削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended Tracks (InnerTube Related API) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>InnerTube 関連おすすめ曲</span>
            </span>
          </div>

          {loadingRelated ? (
            <div className="text-center py-4 text-xs text-neutral-500">
              おすすめ曲を取得中...
            </div>
          ) : (
            <div className="space-y-1">
              {relatedTracks.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/50 group transition-colors"
                >
                  <img
                    src={rel.thumbnail}
                    alt={rel.title}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{rel.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{rel.artist}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => addToQueue(rel)}
                      className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded flex items-center gap-1 transition-colors"
                      title="キューの末尾に追加"
                    >
                      <Plus className="w-3 h-3" />
                      <span>追加</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => playTrack(rel)}
                      className="p-1.5 text-neutral-300 hover:text-white rounded hover:bg-neutral-700"
                      title="直接再生"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
