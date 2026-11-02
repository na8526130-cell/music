import React, { useState } from 'react';
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
} from 'lucide-react';

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
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'playlists'>('liked');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

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

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
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
        </div>
      </div>

      {/* Highlighted Import Action Banner */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-red-950/40 via-neutral-900 to-purple-950/40 border border-red-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <Link2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/30 text-red-300 border border-red-500/40 uppercase tracking-wider">
                一括インポート機能
              </span>
              <span className="text-xs text-neutral-400">YouTube & Spotify 対応</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              プレイリストURLから全曲を一発インポート
            </h2>
            <p className="text-xs text-neutral-300 max-w-xl">
              YouTubeの再生リストURLやSpotifyのURLを貼り付けるだけで、楽曲を自動解析して一括再生・マイプレイリストへ保存できます。
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Link2 className="w-4 h-4" />
          <span>URLからインポートする</span>
        </button>
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

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteUserPlaylist(pl.id);
                  }}
                  className="p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                {currentSelectedPlaylist.tracks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playTrack(currentSelectedPlaylist.tracks[0], currentSelectedPlaylist.tracks)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>再生</span>
                  </button>
                )}
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
    </div>
  );
};
