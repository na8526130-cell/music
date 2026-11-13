import React, { useState, useEffect, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { socialSocket } from '../services/socialSocket';
import { TrackComment } from '../types/social';
import { CommentEmotionData } from '../types/music';
import { SafeImage } from './SafeImage';
import {
  X,
  MessageSquare,
  Clock,
  Heart,
  Send,
  Trash2,
  Flag,
  Sparkles,
  Play,
  Check,
  Eye,
  EyeOff,
  ThumbsUp,
  Loader2,
  Flame,
} from 'lucide-react';

const DANMAKU_COLORS = [
  { label: '白 (通常)', value: '#FFFFFF' },
  { label: '情熱レッド', value: '#EF4444' },
  { label: 'サイアン', value: '#38BDF8' },
  { label: 'ネオンイエロー', value: '#FACC15' },
  { label: 'ライムグリーン', value: '#4ADE80' },
  { label: 'ピンク', value: '#F472B6' },
];

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const TrackCommentsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentTrack,
    progress,
    seekTo,
    currentUser,
    danmakuEnabled,
    setDanmakuEnabled,
    isAdmin,
    trackTimestamps,
  } = usePlayer();

  const [comments, setComments] = useState<TrackComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<'timestamp' | 'newest'>('timestamp');
  const [inputText, setInputText] = useState('');
  const [customTimeSec, setCustomTimeSec] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [submitting, setSubmitting] = useState(false);
  const [reportModalComment, setReportModalComment] = useState<TrackComment | null>(null);
  const [reportReason, setReportReason] = useState('不適切な表現・スパム');
  const [reportSuccess, setReportSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<'danmaku' | 'youtube' | 'timestamps'>('youtube');
  const [ytEmotion, setYtEmotion] = useState<CommentEmotionData | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  // Sync custom time with player progress when modal opens or user clicks current time
  useEffect(() => {
    if (isOpen) {
      setCustomTimeSec(Math.floor(progress));
    }
  }, [isOpen]);

  const loadComments = () => {
    if (!currentTrack) return;
    setLoading(true);
    api.getComments(currentTrack.id)
      .then((res) => {
        setComments(res.comments || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen || !currentTrack) return;
    loadComments();
    setYtLoading(true);
    api.getTrackCommentEmotions(currentTrack.id, currentTrack.title, currentTrack.artist)
      .then((res) => setYtEmotion(res))
      .catch(() => setYtEmotion(null))
      .finally(() => setYtLoading(false));

    const unsubNew = socialSocket.on('comment:new', (payload: any) => {
      if (payload.videoId === currentTrack.id && payload.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.comment.id)) return prev;
          return [...prev, payload.comment];
        });
      }
    });

    const unsubLiked = socialSocket.on('comment:liked', (payload: any) => {
      if (payload.videoId === currentTrack.id) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === payload.commentId
              ? { ...c, likes: payload.likes, likedBy: payload.likedBy }
              : c
          )
        );
      }
    });

    const unsubDeleted = socialSocket.on('comment:deleted', (payload: any) => {
      if (payload.videoId === currentTrack.id) {
        setComments((prev) => prev.filter((c) => c.id !== payload.commentId));
      }
    });

    return () => {
      unsubNew();
      unsubLiked();
      unsubDeleted();
    };
  }, [isOpen, currentTrack?.id]);

  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortMode === 'timestamp') {
      return list.sort((a, b) => a.timestampSec - b.timestampSec);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [comments, sortMode]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrack || !inputText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const username = currentUser ? currentUser.username : 'ゲストリスナー';
      const formattedTime = formatSeconds(customTimeSec);
      const res = await api.postComment(currentTrack.id, {
        text: inputText.trim(),
        timestampSec: customTimeSec,
        formattedTime,
        username,
        color: selectedColor,
        trackTitle: currentTrack.title,
      });

      if (res.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === res.comment.id)) return prev;
          return [...prev, res.comment];
        });
      }
      setInputText('');
    } catch (err: any) {
      alert(err.message || 'コメント投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (c: TrackComment) => {
    if (!currentTrack) return;
    const username = currentUser ? currentUser.username : 'ゲスト';
    try {
      const res = await api.likeComment(currentTrack.id, c.id, username);
      setComments((prev) =>
        prev.map((item) =>
          item.id === c.id ? { ...item, likes: res.likes, likedBy: res.likedBy } : item
        )
      );
    } catch {}
  };

  const handleDelete = async (c: TrackComment) => {
    if (!currentTrack) return;
    if (!confirm('このコメントを削除しますか？')) return;
    const username = currentUser ? currentUser.username : '';
    try {
      await api.deleteComment(currentTrack.id, c.id, username, isAdmin);
      setComments((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err: any) {
      alert(err.message || '削除に失敗しました');
    }
  };

  const handleSendReport = async () => {
    if (!reportModalComment) return;
    try {
      await api.sendModerationReport({
        reporter: currentUser ? currentUser.username : '匿名ユーザー',
        reportedUser: reportModalComment.username,
        targetType: 'comment',
        targetId: reportModalComment.id,
        reason: reportReason,
        contentSnippet: reportModalComment.text,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportModalComment(null);
      }, 1500);
    } catch (e: any) {
      alert(e.message || '通報に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101014] border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span>タイムスタンプ付き弾幕コメント</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/50 font-mono">
                  {comments.length}件
                </span>
              </h2>
              {currentTrack && (
                <p className="text-xs text-neutral-400 truncate">
                  再生中: <span className="text-neutral-200 font-semibold">{currentTrack.title}</span> — {currentTrack.artist}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Danmaku On/Off Toggle */}
            <button
              type="button"
              onClick={() => setDanmakuEnabled(!danmakuEnabled)}
              title={danmakuEnabled ? '弾幕表示をOFFにする' : '弾幕表示をONにする'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                danmakuEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {danmakuEnabled ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">弾幕</span>
              <span>{danmakuEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Tabs & Filter bar */}
        <div className="px-4 py-2.5 bg-neutral-900/50 border-b border-neutral-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-bold ${
                activeTab === 'youtube'
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
              }`}
            >
              YouTubeコメント感情 {ytEmotion?.analyzedCount ? `(${ytEmotion.analyzedCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timestamps')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-bold ${
                activeTab === 'timestamps'
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
              }`}
            >
              見どころ・目次 {trackTimestamps?.timestamps?.length ? `(${trackTimestamps.timestamps.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('danmaku')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer font-bold ${
                activeTab === 'danmaku'
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
              }`}
            >
              タイムスタンプコメント ({comments.length})
            </button>
          </div>

          {activeTab === 'danmaku' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSortMode('timestamp')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  sortMode === 'timestamp'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                秒数順
              </button>
              <button
                type="button"
                onClick={() => setSortMode('newest')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  sortMode === 'newest'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                最新順
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {activeTab === 'timestamps' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px]">
            {trackTimestamps && trackTimestamps.heatMarkers.length > 0 && (
              <div className="p-3 rounded-xl bg-red-950/25 border border-red-700/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-red-200 font-semibold">
                  <Flame className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    最も盛り上がる見どころ: {formatSeconds(trackTimestamps.highlightStartSec)}
                    {trackTimestamps.highlightLabel ? ` (${trackTimestamps.highlightLabel})` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => seekTo(trackTimestamps.highlightStartSec)}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  ジャンプ
                </button>
              </div>
            )}

            {trackTimestamps && trackTimestamps.timestamps.length > 0 ? (
              <div className="space-y-2">
                {trackTimestamps.timestamps.map((item, idx) => (
                  <button
                    key={`${item.timeSeconds}-${idx}`}
                    type="button"
                    onClick={() => seekTo(item.timeSeconds)}
                    className="w-full p-3 rounded-xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-red-600/50 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-md bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-xs font-bold flex items-center gap-1 shrink-0">
                        <Play className="w-3 h-3 fill-current" />
                        <span>{item.timeLabel}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">
                          {item.label}
                        </p>
                        {item.author && (
                          <p className="text-[11px] text-neutral-400 truncate">
                            {item.author}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                      {item.source === 'description' ? '概要欄' : `👍 ${item.likes || '0'}`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-500">
                この動画の概要欄・コメントからタイムスタンプが見つかりませんでした
              </div>
            )}
          </div>
        ) : activeTab === 'youtube' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[240px]">
            {ytLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                <span>YouTubeコメントを取得して感情を抽出中...</span>
              </div>
            ) : !ytEmotion ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                YouTubeコメントを取得できませんでした
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-xl bg-red-950/25 border border-red-700/40 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-red-600 text-white text-xs font-black">
                      最多感情: {ytEmotion.dominantMoodName}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {ytEmotion.analyzedCount}件のコメントから抽出
                    </span>
                  </div>
                  <p className="text-xs text-neutral-200 font-medium">{ytEmotion.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ytEmotion.emotionTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-black/60 border border-red-800/40 text-[11px] font-semibold text-red-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    実際のYouTubeコメント
                  </div>
                  {ytEmotion.sampleComments.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span className="font-bold text-neutral-200 truncate">{c.author}</span>
                        <span className="flex items-center gap-1 shrink-0 font-mono">
                          <ThumbsUp className="w-3 h-3 text-red-500" />
                          {c.likes}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">
                        {c.text}
                      </p>
                      {c.matchedEmotions && c.matchedEmotions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.matchedEmotions.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-[10px] text-red-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
        <>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {loading ? (
            <div className="py-12 text-center text-sm text-neutral-500 animate-pulse">
              コメントを読み込み中...
            </div>
          ) : sortedComments.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-400 font-medium">まだコメントがありません</p>
              <p className="text-xs text-neutral-500 mt-1">
                「02:15 ここのギター神！」のように再生位置を指定して一番乗りで感想を投稿してみましょう！
              </p>
            </div>
          ) : (
            sortedComments.map((c) => {
              const isLiked = currentUser && c.likedBy?.includes(currentUser.username);
              const isOwner = currentUser && c.username.toLowerCase() === currentUser.username.toLowerCase();
              return (
                <div
                  key={c.id}
                  className="group p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Timestamp Jump Button */}
                    <button
                      type="button"
                      onClick={() => seekTo(c.timestampSec)}
                      title={`この秒数 (${c.formattedTime}) にジャンプして再生`}
                      className="px-2 py-1 rounded-md bg-neutral-800 hover:bg-red-600/30 border border-neutral-700 hover:border-red-500/50 text-red-400 hover:text-red-300 font-mono text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer group-hover:scale-105"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{c.formattedTime}</span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-neutral-300 truncate">
                          {c.username}
                        </span>
                        {c.color && c.color !== '#FFFFFF' && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.color }}
                            title={`弾幕カラー: ${c.color}`}
                          />
                        )}
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium leading-relaxed break-words"
                        style={{ color: c.color || '#FFFFFF' }}
                      >
                        {c.text}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Like, Report, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleLike(c)}
                      title="いいね"
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                        isLiked
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                      <span className="font-mono text-[11px]">{c.likes || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportModalComment(c)}
                      title="不適切なコメントを通報"
                      className="p-1 text-neutral-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>

                    {(isOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        title="コメントを削除"
                        className="p-1 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Post Form */}
        <form onSubmit={handlePost} className="p-4 bg-neutral-900/90 border-t border-neutral-800 flex flex-col gap-2.5">
          {/* Timestamp selector & Danmaku color chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">秒数指定:</span>
              <button
                type="button"
                onClick={() => setCustomTimeSec(Math.floor(progress))}
                className="px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-mono font-bold transition-colors cursor-pointer"
              >
                現在位置 ({formatSeconds(progress)}) をセット
              </button>
              <input
                type="number"
                min="0"
                max={Math.floor(currentTrack?.durationSeconds || 600)}
                value={customTimeSec}
                onChange={(e) => setCustomTimeSec(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded text-white font-mono text-center"
              />
              <span className="font-mono text-neutral-400">({formatSeconds(customTimeSec)})</span>
            </div>

            {/* Danmaku color selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">弾幕色:</span>
              {DANMAKU_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  title={c.label}
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    selectedColor === c.value ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="「ここの転調最高！」「ギターソロ神」などコメントを入力..."
              maxLength={150}
              className="flex-1 bg-neutral-800 border border-neutral-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || submitting}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-lg shadow-red-600/30"
            >
              <Send className="w-4 h-4" />
              <span>投稿</span>
            </button>
          </div>
        </form>
        </>
        )}

        {/* Report Modal Backdrop */}
        {reportModalComment && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                <span>コメントの通報</span>
              </h3>
              <p className="text-xs text-neutral-400 mb-3">
                対象: 「{reportModalComment.text}」 ({reportModalComment.username})
              </p>

              {reportSuccess ? (
                <div className="py-4 text-center text-emerald-400 flex items-center justify-center gap-2 text-sm font-bold">
                  <Check className="w-5 h-5" />
                  <span>通報を受け付けました</span>
                </div>
              ) : (
                <>
                  <label className="block text-xs text-neutral-300 mb-1 font-medium">通報理由:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-white mb-4 focus:outline-none"
                  >
                    <option value="不適切な表現・スパム">不適切な表現・スパム</option>
                    <option value="誹謗中傷・嫌がらせ">誹謗中傷・嫌がらせ</option>
                    <option value="曲と無関係な宣伝">曲と無関係な宣伝</option>
                    <option value="ネタバレ・不快な内容">ネタバレ・不快な内容</option>
                  </select>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalComment(null)}
                      className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-neutral-800"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSendReport}
                      className="px-3.5 py-1.5 rounded-lg text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                      送信する
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
