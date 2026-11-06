import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { socialSocket } from '../services/socialSocket';
import { DirectMessage, ConversationSummary } from '../types/social';
import { SafeImage } from './SafeImage';
import {
  X,
  Send,
  Music2,
  FolderPlus,
  Play,
  Heart,
  Smile,
  ShieldAlert,
  Search,
  Check,
  CheckCheck,
  Disc3,
  Sparkles,
  User,
  Plus,
} from 'lucide-react';

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😭', '🎸'];

export const DirectMessageModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    currentTrack,
    playTrack,
    userPlaylists,
    createUserPlaylist,
    addToUserPlaylist,
  } = usePlayer();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations
  const loadConversations = () => {
    if (!currentUser) return;
    setLoadingConv(true);
    api.getConversations(currentUser.username)
      .then((res) => {
        setConversations(res.conversations || []);
      })
      .finally(() => setLoadingConv(false));
  };

  // Load messages for selected user
  const loadMessages = (targetUser: string) => {
    if (!currentUser) return;
    setLoadingMessages(true);
    api.getMessages(currentUser.username, targetUser)
      .then((res) => {
        setMessages(res.messages || []);
        setTimeout(scrollToBottom, 100);
      })
      .finally(() => setLoadingMessages(false));
  };

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    loadConversations();

    // Listen to real-time events
    const unsubDm = socialSocket.on('dm:new', (payload: any) => {
      const msg: DirectMessage = payload.message;
      if (!msg) return;

      // Update active messages if chatting with sender or recipient
      if (
        selectedUser &&
        (msg.sender.toLowerCase() === selectedUser.toLowerCase() ||
          msg.recipient.toLowerCase() === selectedUser.toLowerCase())
      ) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
        // Mark read
        api.markDirectMessageRead(msg.conversationId, currentUser.username, msg.sender);
      }
      loadConversations();
    });

    const unsubReact = socialSocket.on('dm:reaction_updated', (payload: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
        )
      );
    });

    const unsubRead = socialSocket.on('dm:read_ack', (payload: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === payload.conversationId ? { ...m, read: true } : m
        )
      );
      loadConversations();
    });

    const unsubPresence = socialSocket.on('presence:update', () => {
      loadConversations();
    });

    return () => {
      unsubDm();
      unsubReact();
      unsubRead();
      unsubPresence();
    };
  }, [isOpen, currentUser?.username, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser);
    }
  }, [selectedUser]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !selectedUser || !inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    try {
      const res = await api.sendDirectMessage({
        sender: currentUser.username,
        recipient: selectedUser,
        content: textToSend,
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setTimeout(scrollToBottom, 100);
      }
      loadConversations();
    } catch (err: any) {
      alert(err.message || '送信に失敗しました');
    }
  };

  const handleShareCurrentTrack = async () => {
    if (!currentUser || !selectedUser || !currentTrack) return;
    try {
      const res = await api.sendDirectMessage({
        sender: currentUser.username,
        recipient: selectedUser,
        trackCard: {
          videoId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          thumbnail: currentTrack.thumbnail,
          duration: currentTrack.duration,
        },
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setTimeout(scrollToBottom, 100);
      }
      loadConversations();
    } catch (err: any) {
      alert(err.message || '曲のシェアに失敗しました');
    }
  };

  const handleSharePlaylist = async (pl: any) => {
    if (!currentUser || !selectedUser) return;
    setPlaylistPickerOpen(false);
    try {
      const res = await api.sendDirectMessage({
        sender: currentUser.username,
        recipient: selectedUser,
        playlistCard: {
          id: pl.id,
          name: pl.name,
          author: currentUser.username,
          trackCount: pl.tracks?.length || 0,
          thumbnail: pl.tracks?.[0]?.thumbnail || '',
          tracks: pl.tracks || [],
        },
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setTimeout(scrollToBottom, 100);
      }
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'プレイリストのシェアに失敗しました');
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    setActiveReactionMessageId(null);
    try {
      await api.reactDirectMessage(messageId, emoji, currentUser.username);
    } catch {}
  };

  const handleImportSharedPlaylist = (plCard: any) => {
    createUserPlaylist(`[受信] ${plCard.name}`);
    alert(`プレイリスト「${plCard.name}」(${plCard.trackCount}曲) をライブラリに追加しました！`);
  };

  const isUserBlocked = selectedUser && blockedUsers.includes(selectedUser.toLowerCase());

  const handleToggleBlock = async () => {
    if (!currentUser || !selectedUser) return;
    try {
      if (isUserBlocked) {
        await api.unblockUser(currentUser.username, selectedUser);
        setBlockedUsers((prev) => prev.filter((u) => u !== selectedUser.toLowerCase()));
      } else {
        if (!confirm(`${selectedUser} をブロックしますか？相手からのメッセージを受け取らなくなります。`)) return;
        await api.blockUser(currentUser.username, selectedUser);
        setBlockedUsers((prev) => [...prev, selectedUser.toLowerCase()]);
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101014] border border-neutral-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-hidden">
        {/* Left Sidebar: Conversations & Contacts */}
        <div className={`w-full md:w-80 border-r border-neutral-800 flex flex-col bg-neutral-950/60 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
                <Music2 className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white text-base">ダイレクトメッセージ</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Search filter */}
          <div className="p-3 border-b border-neutral-800/80">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="ユーザーを検索..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/60">
            {!currentUser ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                DMを利用するにはアカウント登録またはログインが必要です
              </div>
            ) : loadingConv ? (
              <div className="p-6 text-center text-xs text-neutral-500 animate-pulse">
                会話を読み込み中...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                まだメッセージ相手がいません
              </div>
            ) : (
              conversations
                .filter((c) => c.withUser.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((c) => {
                  const isSelected = selectedUser === c.withUser;
                  return (
                    <button
                      key={c.withUser}
                      type="button"
                      onClick={() => setSelectedUser(c.withUser)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-800/80 border-l-4 border-red-500'
                          : 'hover:bg-neutral-900/70'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-bold text-sm">
                          {c.withUser[0]?.toUpperCase()}
                        </div>
                        {c.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-neutral-950" title="オンライン" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-sm font-bold text-white truncate">
                            {c.withUser}
                          </span>
                          {c.lastMessage && (
                            <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                              {new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        {/* Now Playing live status badge */}
                        {c.nowPlaying ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400 truncate mb-0.5 font-medium">
                            <Disc3 className="w-3 h-3 animate-spin shrink-0 text-emerald-500" />
                            <span className="truncate">🎧 {c.nowPlaying.title}</span>
                          </div>
                        ) : c.lastMessage ? (
                          <p className="text-xs text-neutral-400 truncate">
                            {c.lastMessage.trackCard
                              ? `🎵 [曲] ${c.lastMessage.trackCard.title}`
                              : c.lastMessage.playlistCard
                              ? `📁 [プレイリスト] ${c.lastMessage.playlistCard.name}`
                              : c.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-500 italic">新しいメッセージを開始</p>
                        )}
                      </div>

                      {c.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Main: Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#0d0d10] ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-950/80">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden p-1 text-neutral-400 hover:text-white"
                  >
                    ←
                  </button>
                  <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {selectedUser[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base truncate">
                        {selectedUser}
                      </span>
                      {conversations.find((c) => c.withUser === selectedUser)?.isOnline && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                          オンライン
                        </span>
                      )}
                    </div>
                    {conversations.find((c) => c.withUser === selectedUser)?.nowPlaying && (
                      <p className="text-xs text-emerald-400 truncate flex items-center gap-1 font-medium">
                        <Disc3 className="w-3 h-3 animate-spin shrink-0" />
                        <span>再生中: {conversations.find((c) => c.withUser === selectedUser)?.nowPlaying?.artist} - {conversations.find((c) => c.withUser === selectedUser)?.nowPlaying?.title}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    title={isUserBlocked ? 'ブロック解除' : 'このユーザーをブロック'}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isUserBlocked
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {isUserBlocked ? 'ブロック中' : 'ブロック'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-neutral-500 animate-pulse">
                    メッセージを読み込み中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-neutral-500">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                    <p className="text-sm font-semibold text-neutral-400">{selectedUser} さんとのチャット</p>
                    <p className="text-xs mt-1">「今聴いてる曲をシェア」ボタンで音楽を送り合ってみましょう！</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender.toLowerCase() === currentUser?.username.toLowerCase();
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3.5 shadow-md relative ${
                            isMe
                              ? 'bg-red-600 text-white rounded-br-none'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-none'
                          }`}
                        >
                          {/* Text content */}
                          {m.content && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                              {m.content}
                            </p>
                          )}

                          {/* Rich Track Card */}
                          {m.trackCard && (
                            <div className="mt-1 p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
                              <SafeImage
                                src={m.trackCard.thumbnail}
                                alt={m.trackCard.title}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 shadow"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] uppercase font-bold text-red-300 tracking-wider">
                                  シェアされた楽曲
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                                  {m.trackCard.title}
                                </h4>
                                <p className="text-xs text-neutral-300 truncate">
                                  {m.trackCard.artist}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  playTrack({
                                    id: m.trackCard!.videoId,
                                    title: m.trackCard!.title,
                                    artist: m.trackCard!.artist,
                                    thumbnail: m.trackCard!.thumbnail,
                                    duration: m.trackCard!.duration,
                                  })
                                }
                                title="この曲を再生"
                                className="w-9 h-9 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center shrink-0 shadow-lg cursor-pointer transition-transform hover:scale-105"
                              >
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </button>
                            </div>
                          )}

                          {/* Rich Playlist Card */}
                          {m.playlistCard && (
                            <div className="mt-1 p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                                  <FolderPlus className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                                    プレイリスト交換
                                  </span>
                                  <h4 className="text-sm font-bold text-white truncate">
                                    {m.playlistCard.name}
                                  </h4>
                                  <p className="text-xs text-neutral-300 font-mono">
                                    {m.playlistCard.trackCount}曲収録
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleImportSharedPlaylist(m.playlistCard)}
                                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <FolderPlus className="w-3.5 h-3.5" />
                                <span>ライブラリに保存する</span>
                              </button>
                            </div>
                          )}

                          {/* Timestamp and Read status */}
                          <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${isMe ? 'text-red-200 justify-end' : 'text-neutral-500 justify-start'}`}>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && (
                              <span>
                                {m.read ? (
                                  <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                                    <CheckCheck className="w-3 h-3" />
                                    <span>既読</span>
                                  </span>
                                ) : (
                                  <Check className="w-3 h-3 text-red-300" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Reaction bar popover button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionMessageId(
                                activeReactionMessageId === m.id ? null : m.id
                              )
                            }
                            title="リアクションをつける"
                            className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-1 rounded-full shadow border border-neutral-700 transition-opacity"
                          >
                            <Smile className="w-3 h-3" />
                          </button>

                          {/* Reaction picker dropdown */}
                          {activeReactionMessageId === m.id && (
                            <div className="absolute top-0 right-8 z-30 bg-neutral-900 border border-neutral-700 rounded-full px-2 py-1 shadow-2xl flex items-center gap-1 animate-in zoom-in-95">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleAddReaction(m.id, emoji)}
                                  className="hover:scale-125 transition-transform p-1 text-base cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Display existing reactions */}
                        {m.reactions && Object.keys(m.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(m.reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleAddReaction(m.id, emoji)}
                                title={users.join(', ')}
                                className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs flex items-center gap-1 hover:border-neutral-700 cursor-pointer"
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-mono text-neutral-400 font-bold">{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Share Action Bar */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex flex-col gap-2">
                {/* Quick Share Buttons */}
                <div className="flex items-center gap-2 text-xs">
                  {currentTrack && (
                    <button
                      type="button"
                      onClick={handleShareCurrentTrack}
                      title={`現在再生中の「${currentTrack.title}」をチャットで送信`}
                      className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Music2 className="w-3.5 h-3.5 text-red-400" />
                      <span>今聴いてる曲をシェア</span>
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPlaylistPickerOpen(!playlistPickerOpen)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>プレイリスト送信</span>
                    </button>

                    {playlistPickerOpen && (
                      <div className="absolute bottom-8 left-0 w-64 bg-neutral-900 border border-neutral-700 rounded-xl p-2 shadow-2xl z-40 max-h-48 overflow-y-auto">
                        <div className="text-[11px] font-bold text-neutral-400 px-2 py-1">
                          送信するプレイリストを選択:
                        </div>
                        {userPlaylists.length === 0 ? (
                          <div className="text-xs text-neutral-500 p-2">
                            作成済みプレイリストがありません
                          </div>
                        ) : (
                          userPlaylists.map((pl) => (
                            <button
                              key={pl.id}
                              type="button"
                              onClick={() => handleSharePlaylist(pl)}
                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-white truncate flex items-center justify-between"
                            >
                              <span className="truncate">{pl.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {pl.tracks.length}曲
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Input row */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`${selectedUser} にメッセージを送信...`}
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-lg shadow-red-600/30"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">送信</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                <Music2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">メッセージを選択してください</h3>
              <p className="text-xs max-w-sm">
                左側のユーザー一覧から相手を選ぶと、楽曲やプレイリストのプライベート交換、チャットが始まります。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
