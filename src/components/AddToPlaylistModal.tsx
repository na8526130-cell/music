import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types/music';
import { X, Plus, Check, ListMusic, Music, Sparkles } from 'lucide-react';

export const AddToPlaylistModal: React.FC = () => {
  const {
    addToPlaylistModalOpen,
    setAddToPlaylistModalOpen,
    trackToAddToPlaylist,
    userPlaylists,
    createUserPlaylist,
    addToUserPlaylist,
    removeFromUserPlaylist,
  } = usePlayer();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!addToPlaylistModalOpen || !trackToAddToPlaylist) {
    return null;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleTogglePlaylist = (playlistId: string, playlistName: string, isAlreadyIn: boolean) => {
    if (isAlreadyIn) {
      removeFromUserPlaylist(playlistId, trackToAddToPlaylist.id);
      showToast(`「${playlistName}」から削除しました`);
    } else {
      addToUserPlaylist(playlistId, trackToAddToPlaylist);
      showToast(`「${playlistName}」に追加しました！`);
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    // Create and add
    const newId = `pl_${Date.now()}`;
    createUserPlaylist(name);
    // Add to newly created playlist
    setTimeout(() => {
      addToUserPlaylist(newId, trackToAddToPlaylist);
      showToast(`プレイリスト「${name}」を作成して曲を追加しました！`);
      setNewPlaylistName('');
    }, 50);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={() => setAddToPlaylistModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-[#111116] border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
              <ListMusic className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">プレイリストに追加</h2>
              <p className="text-[11px] text-neutral-400">保存先を選択または新規作成</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddToPlaylistModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Track Preview */}
        <div className="flex items-center gap-3 p-3 my-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <img
            src={trackToAddToPlaylist.thumbnail}
            alt={trackToAddToPlaylist.title}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-lg object-cover bg-neutral-800 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {trackToAddToPlaylist.title}
            </h3>
            <p className="text-xs text-neutral-400 truncate">{trackToAddToPlaylist.artist}</p>
          </div>
        </div>

        {/* Create New Playlist Form */}
        <form onSubmit={handleCreateAndAdd} className="mb-4">
          <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5">
            新しいプレイリストを作成
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="プレイリスト名を入力"
              className="flex-1 bg-neutral-900 border border-neutral-700/80 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newPlaylistName.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>作成して追加</span>
            </button>
          </div>
        </form>

        {/* Existing Playlists List */}
        <div>
          <span className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
            マイ プレイリスト ({userPlaylists.length})
          </span>

          {userPlaylists.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
              まだプレイリストがありません。上のフォームから作成してください。
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {userPlaylists.map((pl) => {
                const isAlreadyIn = pl.tracks.some((t) => t.id === trackToAddToPlaylist.id);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => handleTogglePlaylist(pl.id, pl.name, isAlreadyIn)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isAlreadyIn
                        ? 'bg-red-950/20 border-red-500/40 text-white'
                        : 'bg-neutral-900/50 hover:bg-neutral-800/60 border-neutral-800/80 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isAlreadyIn
                            ? 'bg-red-600 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{pl.name}</p>
                        <p className="text-[11px] text-neutral-400">{pl.tracks.length}曲</p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isAlreadyIn
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'border-neutral-700 bg-neutral-800/60 text-transparent hover:border-neutral-500'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>端末内に自動保存中</span>
          </span>
          <button
            type="button"
            onClick={() => setAddToPlaylistModalOpen(false)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
