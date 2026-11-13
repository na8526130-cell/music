import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types/music';
import { api } from '../services/api';
import { SafeImage } from './SafeImage';
import {
  X,
  Share2,
  Copy,
  Check,
  Music,
  ListMusic,
  ExternalLink,
  MessageCircle,
  Loader2,
  Globe,
  ShieldCheck,
  Code,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'track' | 'playlist';
  playlistToShare?: { name: string; tracks: Track[] } | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  initialType = 'track',
  playlistToShare,
}) => {
  const { currentTrack, userPlaylists, queue, currentUser } = usePlayer();

  const [shareType, setShareType] = useState<'track' | 'playlist'>(initialType);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState<number>(0);
  const [useCurrentQueue, setUseCurrentQueue] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [embedCopied, setEmbedCopied] = useState<boolean>(false);
  const [discordCopied, setDiscordCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Update shareType when modal opens or initialType changes
  useEffect(() => {
    if (isOpen) {
      setShareType(initialType);
      setCopied(false);
      setEmbedCopied(false);
      setDiscordCopied(false);
      setError('');
    }
  }, [isOpen, initialType]);

  // Compute target URL based on selection
  useEffect(() => {
    if (!isOpen) return;

    if (shareType === 'track') {
      if (currentTrack) {
        const origin = window.location.origin;
        setShareUrl(`${origin}/?track=${currentTrack.id}`);
      } else {
        setShareUrl('');
      }
      return;
    }

    // Playlist share: generate cloud share link via API
    let targetTracks: Track[] = [];
    let targetName = 'お気に入りプレイリスト';

    if (playlistToShare) {
      targetTracks = playlistToShare.tracks;
      targetName = playlistToShare.name;
    } else if (useCurrentQueue) {
      targetTracks = queue;
      targetName = '再生中キューのコレクション';
    } else if (userPlaylists[selectedPlaylistIndex]) {
      targetTracks = userPlaylists[selectedPlaylistIndex].tracks;
      targetName = userPlaylists[selectedPlaylistIndex].name;
    }

    if (!targetTracks.length) {
      setShareUrl('');
      return;
    }

    setLoading(true);
    setError('');

    api
      .sharePlaylist({
        name: targetName,
        author: currentUser?.username || 'Zero Musicユーザー',
        tracks: targetTracks,
      })
      .then((res) => {
        const origin = window.location.origin;
        setShareUrl(`${origin}${res.shareUrl}`);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '共有URLの作成に失敗しました');
        setLoading(false);
      });
  }, [
    isOpen,
    shareType,
    currentTrack?.id,
    selectedPlaylistIndex,
    useCurrentQueue,
    playlistToShare,
    queue,
    userPlaylists,
  ]);

  if (!isOpen) return null;

  const copyText = (text: string) => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    };
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    copyText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyNocookieEmbed = () => {
    if (!currentTrack) return;
    const safeTitle = currentTrack.title.replace(/"/g, '&quot;');
    const code = `<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/${currentTrack.id}" title="${safeTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    copyText(code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title:
            shareType === 'track' && currentTrack
              ? `${currentTrack.title} - ${currentTrack.artist} | Zero Music`
              : 'プレイリストをシェア | Zero Music',
          text: 'Zero Musicで高音質・同期歌詞付きで再生しよう！',
          url: shareUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleTwitterShare = () => {
    const text =
      shareType === 'track' && currentTrack
        ? `🎵「${currentTrack.title} - ${currentTrack.artist}」をZero Musicで聴こう！ #ZeroMusic`
        : `🎶 プレイリストをZero Musicで共有しました！ #ZeroMusic`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const handleLineShare = () => {
    const text =
      shareType === 'track' && currentTrack
        ? `「${currentTrack.title}」をZero Musicで聴いてみて！\n${shareUrl}`
        : `プレイリストを共有します！\n${shareUrl}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDiscordCopy = () => {
    if (!currentTrack) return;
    const text = `🎧 Listening to **${currentTrack.title}** by **${currentTrack.artist}** on Zero Music\n🔗 ${shareUrl}`;
    navigator.clipboard.writeText(text);
    setDiscordCopied(true);
    setTimeout(() => setDiscordCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#121216]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/30">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                共有 &amp; nocookie埋め込み
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Tabs: Track vs Playlist */}
          <div className="flex bg-neutral-900/80 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setShareType('track')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                shareType === 'track'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>再生中の曲を共有</span>
            </button>
            <button
              type="button"
              onClick={() => setShareType('playlist')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                shareType === 'playlist'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>プレイリストを共有</span>
            </button>
          </div>

          {/* Track Preview */}
          {shareType === 'track' && (
            <div>
              {currentTrack ? (
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-neutral-900/60 border border-white/5">
                  <SafeImage
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    useBase64
                    className="w-14 h-14 rounded-lg object-cover bg-neutral-800 shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {currentTrack.title}
                    </h4>
                    <p className="text-xs text-neutral-400 truncate">{currentTrack.artist}</p>
                    <span className="text-[11px] text-red-400 font-mono">
                      youtube-nocookie.com/embed/{currentTrack.id}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-neutral-400 bg-neutral-900/40 rounded-xl">
                  現在再生中の楽曲がありません。
                </div>
              )}
            </div>
          )}

          {/* Playlist Picker */}
          {shareType === 'playlist' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">
                共有するプレイリストを選択:
              </label>

              {userPlaylists.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {userPlaylists.map((pl, idx) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => {
                        setUseCurrentQueue(false);
                        setSelectedPlaylistIndex(idx);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        !useCurrentQueue && selectedPlaylistIndex === idx
                          ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                          : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate">{pl.name}</span>
                      <span className="text-[11px] text-neutral-400 font-mono shrink-0 ml-2">
                        {pl.tracks.length} 曲
                      </span>
                    </button>
                  ))}

                  {/* Also option to share current queue */}
                  {queue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCurrentQueue(true)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        useCurrentQueue
                          ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                          : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate">現在の再生キュー ({queue.length} 曲)</span>
                      <span className="text-[11px] text-blue-400 font-mono shrink-0 ml-2">
                        キュー共有
                      </span>
                    </button>
                  )}
                </div>
              ) : queue.length > 0 ? (
                <div className="p-3 bg-neutral-900/60 rounded-xl text-xs text-neutral-300 flex items-center justify-between">
                  <span>現在の再生キュー（{queue.length}曲）を共有します</span>
                  <span className="text-blue-400 font-mono text-[11px]">選択中</span>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-neutral-400 bg-neutral-900/40 rounded-xl">
                  共有可能なプレイリストがありません。ライブラリでプレイリストを作成するか、楽曲を再生してください。
                </div>
              )}
            </div>
          )}

          {/* Generated Share URL Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                専用共有リンク (クリックでコピー)
              </span>
              {copied && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  コピーしました！
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-neutral-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-neutral-300 font-mono truncate select-all">
                {loading ? (
                  <span className="text-neutral-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    共有URLを生成中...
                  </span>
                ) : shareUrl ? (
                  shareUrl
                ) : (
                  <span className="text-neutral-500">URL未生成</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!shareUrl || loading}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  copied
                    ? 'bg-neutral-800 text-red-400 border border-red-600/50'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '完了' : 'コピー'}</span>
              </button>
            </div>

            {shareType === 'track' && currentTrack && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopyNocookieEmbed}
                  className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-red-900/50 text-xs font-semibold text-neutral-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] truncate">
                    <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate">
                      &lt;iframe src=&quot;https://www.youtube-nocookie.com/embed/{currentTrack.id}&quot;&gt;
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-red-400 shrink-0 ml-2">
                    {embedCopied ? <Check className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{embedCopied ? 'コピー完了' : '埋め込みコピー'}</span>
                  </span>
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Quick Social Share Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              type="button"
              onClick={handleTwitterShare}
              disabled={!shareUrl || loading}
              className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-xs text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span>X (Twitter)</span>
            </button>
            <button
              type="button"
              onClick={handleLineShare}
              disabled={!shareUrl || loading}
              className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-xs text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <MessageCircle className="w-3.5 h-3.5 text-red-400" />
              <span>LINE</span>
            </button>
            <button
              type="button"
              onClick={handleDiscordCopy}
              disabled={!currentTrack}
              className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-xs text-neutral-200 font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {discordCopied ? <Check className="w-3.5 h-3.5 text-red-400" /> : null}
              <span>{discordCopied ? 'コピー完了' : 'Discord共有'}</span>
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={!shareUrl || loading}
              className="py-2.5 px-3 rounded-xl bg-red-950/50 hover:bg-red-900/50 border border-red-800/40 text-xs text-red-300 font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>端末シェア</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
