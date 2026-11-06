import React, { useState } from 'react';
import { X, Users, Copy, Check, Plus, Play, Music, Share2, Sparkles, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types/music';

interface CollabPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CollabMember {
  name: string;
  avatar: string;
  isHost?: boolean;
}

export const CollabPlaylistModal: React.FC<CollabPlaylistModalProps> = ({ isOpen, onClose }) => {
  const { currentTrack, queue, playTrack, currentUser } = usePlayer();

  const [roomCode, setRoomCode] = useState<string>('COLLAB-7492');
  const [copied, setCopied] = useState<boolean>(false);
  const [playlistTitle, setPlaylistTitle] = useState<string>('週末ドライブ作業用BGM 🚗');

  const [members, setMembers] = useState<CollabMember[]>([
    { name: currentUser?.username || 'あなた', avatar: '🎧', isHost: true },
    { name: 'Aoi', avatar: '🌸' },
    { name: 'Ken_DJ', avatar: '⚡' },
  ]);

  const [collabTracks, setCollabTracks] = useState<Track[]>([
    {
      id: 'collab-1',
      title: '怪獣の花唄',
      artist: 'Vaundy',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      duration: '03:45',
      durationSeconds: 225,
    },
    {
      id: 'collab-2',
      title: 'Subtitle',
      artist: 'Official髭男dism',
      thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
      duration: '05:04',
      durationSeconds: 304,
    },
  ]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?collab=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddCurrentSong = () => {
    if (!currentTrack) return;
    if (collabTracks.some((t) => t.id === currentTrack.id)) return;
    setCollabTracks((prev) => [...prev, currentTrack]);
  };

  const handleRemoveTrack = (id: string) => {
    setCollabTracks((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>共同編集プレイリスト</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  リアルタイム同期
                </span>
              </h3>
              <p className="text-xs text-neutral-400">友達と一緒に1つのプレイリストを同時編集</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Room Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <input
                type="text"
                value={playlistTitle}
                onChange={(e) => setPlaylistTitle(e.target.value)}
                className="bg-transparent font-bold text-sm sm:text-base text-white focus:outline-none border-b border-transparent focus:border-emerald-500 pb-0.5"
              />
              <p className="text-xs text-neutral-400 mt-1">招待コード: <span className="font-mono text-emerald-400 font-bold">{roomCode}</span></p>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">招待リンクコピー済</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>招待URLをコピー</span>
                </>
              )}
            </button>
          </div>

          {/* Active Members */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-400">参加中のメンバー ({members.length}人):</span>
            <div className="flex items-center gap-2 flex-wrap">
              {members.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-xs text-neutral-200"
                >
                  <span>{m.avatar}</span>
                  <span className="font-medium">{m.name}</span>
                  {m.isHost && (
                    <span className="text-[9px] px-1 bg-emerald-500/30 text-emerald-300 rounded font-bold">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Collaborative Track List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>リストの楽曲 ({collabTracks.length}曲)</span>
              </h4>

              <div className="flex items-center gap-2">
                {currentTrack && (
                  <button
                    type="button"
                    onClick={handleAddCurrentSong}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>再生中の曲を追加</span>
                  </button>
                )}
                {collabTracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playTrack(collabTracks[0], collabTracks)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>全曲再生</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-inner">
              {collabTracks.map((track, idx) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800/40 transition-colors group"
                >
                  <span className="w-5 text-center text-xs font-mono text-neutral-500">
                    {idx + 1}
                  </span>
                  <img
                    src={track.thumbnail}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover bg-neutral-900 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => playTrack(track, collabTracks)}
                      className="text-xs font-semibold text-white truncate cursor-pointer hover:underline"
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                    {track.duration}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveTrack(track.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
