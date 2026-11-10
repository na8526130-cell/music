import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  Heart,
  History,
  ListPlus,
  Play,
  Shuffle,
  Trash2,
  Library,
  Plus,
  Link2,
  Share2,
  FolderDown,
  UploadCloud,
  Music,
  FileAudio,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { parseLocalAudioFile } from '../services/localTracks';
import {
  getAllOfflineTracks,
  deleteOfflineTrack,
  seedDemoOfflineTrack,
} from '../services/offlineStorage';
import { Track } from '../types/music';

export const LibraryView: React.FC = () => {
  const {
    likedTracks,
    recentTracks,
    userPlaylists,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    createUserPlaylist,
    deleteUserPlaylist,
    currentTrack,
    setImportModalOpen,
    openAddToPlaylistModal,
    openShareModal,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'playlists' | 'local'>('liked');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Local tracks state & IndexedDB persistence
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isAddingDemo, setIsAddingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persistently stored tracks from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    getAllOfflineTracks()
      .then((stored) => {
        if (isMounted) {
          setLocalTracks(stored);
        }
      })
      .catch((err) => console.warn('[LibraryView] Could not load offline tracks:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAudioFiles = async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;

    setIsProcessingFiles(true);
    const parsed: Track[] = [];
    for (const file of audioFiles) {
      try {
        const track = await parseLocalAudioFile(file);
        parsed.push(track);
      } catch (err) {
        console.warn('Failed to parse audio file:', file.name, err);
      }
    }
    setLocalTracks((prev) => [...parsed, ...prev]);
    setIsProcessingFiles(false);
  };

  const handleSeedDemo = async () => {
    setIsAddingDemo(true);
    try {
      const demo = await seedDemoOfflineTrack();
      setLocalTracks((prev) => [demo, ...prev.filter((t) => t.id !== demo.id)]);
    } catch (err) {
      console.warn('Failed to seed demo track:', err);
    } finally {
      setIsAddingDemo(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAudioFiles(e.dataTransfer.files);
    }
  };

  const removeLocalTrack = async (id: string) => {
    await deleteOfflineTrack(id).catch(() => {});
    setLocalTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createUserPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const currentSelectedPlaylist = userPlaylists.find((p) => p.id === selectedPlaylistId);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-neutral-800/80 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            マイ コレクション
          </span>
          <h1 className="text-2xl font-bold text-white mt-0.5">
            ライブラリ (Library)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab switch */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab('liked');
                setSelectedPlaylistId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'liked' && !selectedPlaylistId
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>お気に入り ({likedTracks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                setSelectedPlaylistId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'history' && !selectedPlaylistId
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>最近の再生 ({recentTracks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('playlists')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'playlists' || selectedPlaylistId
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Library className="w-3.5 h-3.5 text-red-500" />
              <span>プレイリスト ({userPlaylists.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('local');
                setSelectedPlaylistId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'local' && !selectedPlaylistId
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>ローカル音源 ({localTracks.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>URLインポート</span>
          </button>
        </div>
      </div>

      {/* Liked Tracks View */}
      {activeTab === 'liked' && !selectedPlaylistId && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-red-950/40 to-neutral-900/60 border border-red-500/20 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-600/30">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">お気に入りの曲</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  ハートを付けたお気に入りのトラック ({likedTracks.length}曲)
                </p>
              </div>
            </div>

            {likedTracks.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => playTrack(likedTracks[0], likedTracks)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>すべて再生</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
                    playTrack(shuffled[0], shuffled);
                  }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl flex items-center gap-1.5"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>シャッフル</span>
                </button>
              </div>
            )}
          </div>

          {likedTracks.length === 0 ? (
            <div className="py-20 text-center space-y-2 text-neutral-400">
              <Heart className="w-10 h-10 mx-auto text-neutral-600" />
              <p className="text-sm font-medium text-neutral-300">お気に入りの曲がまだありません</p>
              <p className="text-xs text-neutral-500">
                楽曲のハートアイコンをクリックすると、ここに追加されます。
              </p>
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
              {likedTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                      isCurrent ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500">
                      {idx + 1}
                    </span>
                    <div className="relative shrink-0">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-lg object-cover bg-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={() => playTrack(track, likedTracks)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => playTrack(track, likedTracks)}
                        className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                          isCurrent ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleLikeTrack(track)}
                        className="p-1.5 text-red-500 hover:text-neutral-400"
                        title="お気に入りから削除"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddToPlaylistModal(track)}
                        className="p-1.5 text-neutral-400 hover:text-white"
                        title="プレイリストに追加"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addToQueue(track)}
                        className="p-1.5 text-neutral-400 hover:text-white"
                        title="キューに追加"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-neutral-400 tabular-nums">
                        {track.duration}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Play History View */}
      {activeTab === 'history' && !selectedPlaylistId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" />
              <span>再生履歴 (直近{recentTracks.length}曲)</span>
            </h2>
          </div>

          {recentTracks.length === 0 ? (
            <div className="py-20 text-center text-xs text-neutral-500">
              再生履歴はまだありません。
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
              {recentTracks.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors"
                >
                  <span className="w-6 text-center text-xs font-mono text-neutral-500">
                    {idx + 1}
                  </span>
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover bg-neutral-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => playTrack(track)}
                      className="text-sm font-medium text-white truncate cursor-pointer hover:underline"
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAddToPlaylistModal(track)}
                      className="p-1.5 text-neutral-400 hover:text-white"
                      title="プレイリストに追加"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => playTrack(track)}
                      className="p-1.5 text-neutral-300 hover:text-white"
                      title="再生"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlists View */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">作成したプレイリスト</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-white/10 shadow transition-colors cursor-pointer"
                title="YouTubeまたはSpotifyのプレイリストURLから一括登録"
              >
                <Link2 className="w-3.5 h-3.5 text-red-400" />
                <span>URLから一括インポート</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingPlaylist(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新規プレイリスト作成</span>
              </button>
            </div>
          </div>

          {/* New Playlist input form modal/drawer */}
          {isCreatingPlaylist && (
            <form
              onSubmit={handleCreatePlaylist}
              className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center gap-3"
            >
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="プレイリスト名を入力..."
                className="flex-1 bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
              >
                作成
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingPlaylist(false)}
                className="px-3 py-2 text-neutral-400 hover:text-white text-xs"
              >
                キャンセル
              </button>
            </form>
          )}

          {/* Playlists grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylistId(pl.id)}
                className="p-4 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800 rounded-xl cursor-pointer flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                    <ListPlus className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-400">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-neutral-400">{pl.tracks.length}曲</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openShareModal('playlist', { name: pl.name, tracks: pl.tracks });
                    }}
                    className="p-1.5 text-neutral-400 hover:text-blue-400"
                    title="共有リンクを発行"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteUserPlaylist(pl.id);
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-400"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Selected playlist tracks detail view */}
          {currentSelectedPlaylist && (
            <div className="pt-6 border-t border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{currentSelectedPlaylist.name}</h3>
                  <p className="text-xs text-neutral-400">{currentSelectedPlaylist.tracks.length}曲</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openShareModal('playlist', {
                        name: currentSelectedPlaylist.name,
                        tracks: currentSelectedPlaylist.tracks,
                      })
                    }
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    title="このプレイリストの共有リンクを発行"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>共有</span>
                  </button>
                  {currentSelectedPlaylist.tracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        playTrack(
                          currentSelectedPlaylist.tracks[0],
                          currentSelectedPlaylist.tracks
                        )
                      }
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>再生</span>
                    </button>
                  )}
                </div>
              </div>

              {currentSelectedPlaylist.tracks.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  このプレイリストにはまだ曲がありません。検索画面やお気に入りから曲を追加できます。
                </div>
              ) : (
                <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60">
                  {currentSelectedPlaylist.tracks.map((track, idx) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors"
                    >
                      <span className="w-6 text-center text-xs font-mono text-neutral-500">
                        {idx + 1}
                      </span>
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover bg-neutral-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          onClick={() => playTrack(track, currentSelectedPlaylist.tracks)}
                          className="text-sm font-semibold text-white truncate cursor-pointer hover:underline"
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">{track.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Local Tracks View */}
      {activeTab === 'local' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-gradient-to-r from-cyan-950/40 via-neutral-900 to-blue-950/40 border border-cyan-500/20 rounded-2xl shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-cyan-600 flex items-center justify-center text-white shadow-xl shadow-cyan-600/30 shrink-0">
                <FolderDown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ローカル音源</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {localTracks.length}曲
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus"
                multiple
                onChange={(e) => e.target.files && handleAudioFiles(e.target.files)}
                className="hidden"
              />

              {/* Instant sample audio generator for offline testing */}
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={isAddingDemo}
                className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                title="音源ファイルが手元にない場合でも、ブラウザ内で直接Lo-Fiサウンドを自動合成してオフライン再生を即座に試せます"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAddingDemo ? '生成中...' : '🎵 サンプル音源を追加'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFiles}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-transform active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isProcessingFiles ? '保存中...' : 'ファイルを選択'}</span>
              </button>

              {localTracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => playTrack(localTracks[0], localTracks)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>すべて再生</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
                : 'border-neutral-700/60 hover:border-neutral-600 bg-neutral-900/30'
            }`}
          >
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                <FileAudio className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ここに音声ファイルをドラッグ＆ドロップ
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  またはクリックしてパソコン・スマホ内のMP3、WAV、FLAC、M4Aファイルを選択
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {['.MP3', '.WAV', '.FLAC', '.M4A', '.AAC'].map((ext) => (
                  <span
                    key={ext}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50"
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Local Tracks List */}
          {localTracks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <span>読み込み済みのローカル曲 ({localTracks.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setLocalTracks([])}
                  className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                >
                  すべてクリア
                </button>
              </div>

              <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
                {localTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                        isCurrent ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => playTrack(track, localTracks)}
                        className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-cyan-400 hover:bg-neutral-700 transition-colors shrink-0"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>

                      <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <FileAudio className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          onClick={() => playTrack(track, localTracks)}
                          className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                            isCurrent ? 'text-cyan-400 font-bold' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {track.artist} • ローカル音源
                        </p>
                      </div>

                      <span className="text-xs font-mono text-neutral-400 shrink-0">
                        {track.duration}
                      </span>

                      <button
                        type="button"
                        onClick={() => openAddToPlaylistModal(track)}
                        title="プレイリストに追加"
                        className="p-2 text-neutral-500 hover:text-white transition-colors"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeLocalTrack(track.id)}
                        title="削除"
                        className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
