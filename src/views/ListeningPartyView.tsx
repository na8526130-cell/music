import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { socialSocket } from '../services/socialSocket';
import { ListeningPartyRoom } from '../types/social';
import { SafeImage } from '../components/SafeImage';
import {
  Radio,
  Users,
  Play,
  Pause,
  SkipForward,
  MessageSquare,
  Send,
  Plus,
  Sparkles,
  Music,
  Headphones,
  Coffee,
  Mic2,
  Disc3,
  RefreshCw,
  Crown,
  Volume2,
  X,
  Trophy,
} from 'lucide-react';

const CATEGORY_META = {
  rock: { label: '邦ロック', icon: Music, color: 'text-red-400', bg: 'bg-red-500/10' },
  chill: { label: 'チル・Lo-Fi', icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  vocaloid: { label: 'ボカロ/アニソン', icon: Mic2, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  free: { label: 'フリーラウンジ', icon: Headphones, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  custom: { label: 'カスタム', icon: Disc3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const ListeningPartyView: React.FC = () => {
  const {
    currentUser,
    currentTrack,
    playTrack,
    isPlaying,
    togglePlay,
    progress,
    seekTo,
    setQuizModalOpen,
    setCollabModalOpen,
  } = usePlayer();

  const [rooms, setRooms] = useState<ListeningPartyRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ListeningPartyRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState<'rock' | 'chill' | 'vocaloid' | 'free' | 'custom'>('custom');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadRooms = () => {
    setLoading(true);
    api.getPartyRooms()
      .then((res) => setRooms(res.rooms || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRooms();

    // Socket event listeners
    const unsubRoomState = socialSocket.on('party:room_state', (payload: any) => {
      if (payload.room) {
        setRooms((prev) =>
          prev.map((r) => (r.id === payload.room.id ? payload.room : r))
        );
        if (activeRoomId === payload.room.id) {
          setActiveRoom(payload.room);
          setTimeout(scrollChatToBottom, 100);
        }
      }
    });

    const unsubSync = socialSocket.on('party:playback_sync', (payload: any) => {
      if (activeRoomId) {
        // If participant, sync playback with host
        if (payload.currentTrack) {
          if (!currentTrack || currentTrack.id !== payload.currentTrack.id) {
            playTrack(payload.currentTrack);
          }
          if (typeof payload.positionSec === 'number') {
            const timeDiff = Math.abs(progress - payload.positionSec);
            if (timeDiff > 3) {
              seekTo(payload.positionSec);
            }
          }
        }
      }
    });

    const unsubChat = socialSocket.on('party:new_chat', (payload: any) => {
      if (activeRoomId === payload.roomId) {
        setActiveRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            chatMessages: [...prev.chatMessages, payload.message],
          };
        });
        setTimeout(scrollChatToBottom, 100);
      }
    });

    const unsubCreated = socialSocket.on('party:room_created', (payload: any) => {
      if (payload.room) {
        setRooms((prev) => [...prev, payload.room]);
      }
    });

    return () => {
      unsubRoomState();
      unsubSync();
      unsubChat();
      unsubCreated();
    };
  }, [activeRoomId, currentTrack?.id, progress]);

  const handleJoinRoom = (room: ListeningPartyRoom) => {
    const username = currentUser ? currentUser.username : '匿名リスナー';
    setActiveRoomId(room.id);
    setActiveRoom(room);
    socialSocket.joinParty(room.id, username);

    // If room has current track, immediately sync playback
    if (room.currentTrack) {
      playTrack(room.currentTrack);
      if (room.positionSec) {
        setTimeout(() => seekTo(room.positionSec), 500);
      }
    }
  };

  const handleLeaveRoom = () => {
    if (activeRoomId) {
      const username = currentUser ? currentUser.username : '匿名リスナー';
      socialSocket.leaveParty(activeRoomId, username);
      setActiveRoomId(null);
      setActiveRoom(null);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !chatInput.trim()) return;
    const username = currentUser ? currentUser.username : '匿名リスナー';
    socialSocket.sendPartyChat(activeRoomId, chatInput.trim(), username);
    setChatInput('');
  };

  const isHost = activeRoom && currentUser && activeRoom.hostUsername.toLowerCase() === currentUser.username.toLowerCase();

  // Host broadcasts playback sync whenever track or play state changes
  const handleHostPlay = (track: any) => {
    if (!activeRoomId) return;
    playTrack(track);
    socialSocket.syncParty({
      roomId: activeRoomId,
      currentTrack: track,
      isPlaying: true,
      positionSec: 0,
      trackChanged: true,
    });
  };

  const handleHostTogglePlay = () => {
    if (!activeRoomId || !activeRoom) return;
    togglePlay();
    socialSocket.syncParty({
      roomId: activeRoomId,
      currentTrack: currentTrack,
      isPlaying: !isPlaying,
      positionSec: progress,
    });
  };

  const handleManualResync = () => {
    if (activeRoom?.currentTrack) {
      playTrack(activeRoom.currentTrack);
      seekTo(activeRoom.positionSec);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const host = currentUser ? currentUser.username : 'DJ_Zero';
      const res = await api.createPartyRoom({
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        category: newRoomCategory,
        hostUsername: host,
        initialTrack: currentTrack || undefined,
      });
      setCreateModalOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      if (res.room) {
        handleJoinRoom(res.room);
      }
    } catch (err: any) {
      alert(err.message || 'ルーム作成に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-red-500 animate-pulse" />
            <span>リスニングパーティー ＆ 同時試聴ラウンジ</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            同じ部屋の仲間と完全に同じ秒数で音楽を同時再生しながら、リアルタイムチャットで語り合えます。
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadRooms}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
            title="最新ルーム情報を再取得"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setQuizModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">イントロクイズ対戦</span>
            <span className="sm:hidden">クイズ</span>
          </button>
          <button
            type="button"
            onClick={() => setCollabModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">共同プレイリスト</span>
            <span className="sm:hidden">共同作成</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ルームを新規開設</span>
          </button>
        </div>
      </div>

      {/* Main Room View or Lounge Grid */}
      {activeRoom ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Room Player & Stage */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#101014] border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              {/* Room Header bar */}
              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white truncate">{activeRoom.name}</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono font-bold">
                        同期中
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate">{activeRoom.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualResync}
                    title="ホストの再生位置に強制再同期"
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-emerald-400 border border-neutral-800 flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ホストに再同期</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 hover:text-white font-medium cursor-pointer"
                  >
                    退室する
                  </button>
                </div>
              </div>

              {/* Now Playing Hero */}
              {activeRoom.currentTrack || currentTrack ? (
                (() => {
                  const track = activeRoom.currentTrack || currentTrack!;
                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-neutral-900/90 to-neutral-950/80 border border-neutral-800">
                      <SafeImage
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl object-cover shadow-2xl shrink-0"
                      />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                            セッション再生中
                          </span>
                          <span className="text-neutral-600">•</span>
                          <span className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>ホスト: {activeRoom.hostUsername}</span>
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-2xl font-black text-white truncate leading-tight">
                          {track.title}
                        </h3>
                        <p className="text-sm font-semibold text-neutral-300 truncate mt-0.5">
                          {track.artist}
                        </p>

                        {/* Progress */}
                        <div className="mt-4 flex items-center gap-3">
                          <span className="text-xs font-mono text-neutral-400">
                            {formatSeconds(progress)}
                          </span>
                          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-600 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (progress / (track.durationSeconds || 240)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-neutral-400">
                            {track.duration || '0:00'}
                          </span>
                        </div>

                        {/* Host Playback Controls */}
                        {isHost && (
                          <div className="mt-4 flex items-center justify-center sm:justify-start gap-3">
                            <span className="text-xs text-amber-400 font-bold mr-1">👑 ホスト操作:</span>
                            <button
                              type="button"
                              onClick={handleHostTogglePlay}
                              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              <span>{isPlaying ? '一時停止 (全員)' : '再生 (全員)'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-16 text-center text-neutral-500">
                  <Music className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
                  <p className="text-base font-bold text-neutral-300">まだ曲がセットされていません</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    ホストが曲を再生すると、ルーム内の参加者全員のプレイヤーで同時に流れ始めます。
                  </p>
                </div>
              )}

              {/* Participants list */}
              <div className="mt-6 pt-4 border-t border-neutral-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>参加中のリスナー ({activeRoom.participants?.length || 0}人)</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeRoom.participants?.map((p) => (
                    <div
                      key={p.username}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{p.username}</span>
                      {p.isHost && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          ホスト
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live Room Chat */}
          <div className="bg-[#101014] border border-neutral-800 rounded-2xl flex flex-col h-[600px] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-white text-sm">ルームライブチャット</h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">リアルタイム</span>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeRoom.chatMessages?.map((m) => {
                if (m.type === 'system' || m.type === 'track_change') {
                  return (
                    <div key={m.id} className="text-center my-1.5">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 font-medium">
                        {m.text}
                      </span>
                    </div>
                  );
                }
                const isMe = currentUser && m.username.toLowerCase() === currentUser.username.toLowerCase();
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-neutral-400">{m.username}</span>
                      <span className="text-[9px] text-neutral-600 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium leading-relaxed max-w-[85%] break-words ${
                        isMe
                          ? 'bg-red-600 text-white rounded-br-none'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="ルームでチャットを送信..."
                className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Room Lounges List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
          {rooms.map((room) => {
            const meta = CATEGORY_META[room.category] || CATEGORY_META.free;
            const Icon = meta.icon;
            return (
              <div
                key={room.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#101014] hover:bg-neutral-900/80 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${meta.bg} ${meta.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{meta.label}</span>
                    </span>

                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{room.participants?.length || 0}人参加中</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors mb-1">
                    {room.name}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
                    {room.description}
                  </p>

                  {/* Current Playing Track Preview */}
                  {room.currentTrack ? (
                    <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex items-center gap-3">
                      <SafeImage
                        src={room.currentTrack.thumbnail}
                        alt={room.currentTrack.title}
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                          再生中の曲
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">
                          {room.currentTrack.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {room.currentTrack.artist}
                        </p>
                      </div>
                      <Volume2 className="w-4 h-4 text-neutral-500 shrink-0" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 text-xs text-neutral-500 text-center">
                      現在再生中の曲はありません（入室して好きな曲を流せます）
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>ホスト: <span className="font-semibold text-neutral-300">{room.hostUsername}</span></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleJoinRoom(room)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/30 cursor-pointer group-hover:scale-105"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>部屋に入る</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121216] border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500" />
                <span>新しいリスニングルームを開設</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">ルーム名 (必須):</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="例: 深夜のボカロ神曲語り場"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">説明 (任意):</label>
                <textarea
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="どんな曲を聴き合う部屋か教えてください"
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">カテゴリ:</label>
                <select
                  value={newRoomCategory}
                  onChange={(e) => setNewRoomCategory(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="rock">🎸 邦ロック・オルタナ</option>
                  <option value="chill">☕ チル・Lo-Fi・R&B</option>
                  <option value="vocaloid">🎤 ボカロ・アニソン</option>
                  <option value="free">🎧 フリーラウンジ</option>
                  <option value="custom">✨ その他カスタム</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  開設して入室
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
