import React, { useState } from 'react';
import {
  X,
  Link2,
  Sparkles,
  Play,
  ListPlus,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Music2,
  ListMusic,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Track } from '../types/music';
import { SafeImage } from './SafeImage';

export const PlaylistImportModal: React.FC = () => {
  const {
    importModalOpen,
    setImportModalOpen,
    playTrack,
    createUserPlaylist,
    addToUserPlaylist,
    userPlaylists,
  } = usePlayer();

  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    title: string;
    author: string;
    thumbnail?: string;
    tracks: Track[];
    source?: string;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!importModalOpen) return null;

  const handleClose = () => {
    setImportModalOpen(false);
    setError(null);
  };

  const handleImport = async (urlToUse?: string) => {
    const targetUrl = (urlToUse || inputUrl).trim();
    if (!targetUrl) {
      setError('プレイリストのURLを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await api.importPlaylist(targetUrl);
      if (!res.tracks || res.tracks.length === 0) {
        setError('プレイリストから曲を読み込めませんでした。URLが公開されているかご確認ください。');
        setParsedData(null);
      } else {
        setParsedData(res);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'インポート中にエラーが発生しました。有効なURLかご確認ください。');
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = () => {
    if (!parsedData || parsedData.tracks.length === 0) return;
    playTrack(parsedData.tracks[0], parsedData.tracks);
    setImportModalOpen(false);
  };

  const handleSaveToLibrary = () => {
    if (!parsedData || parsedData.tracks.length === 0) return;
    const playlistName = parsedData.title || `インポート: ${new Date().toLocaleDateString()}`;

    // Create new playlist
    createUserPlaylist(playlistName);

    // Let user playlist state propagate or find freshly created
    setTimeout(() => {
      // Find the created playlist by name
      const targetPl = userPlaylists.find((p) => p.name === playlistName) || userPlaylists[0];
      if (targetPl) {
        parsedData.tracks.forEach((track) => {
          addToUserPlaylist(targetPl.id, track);
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 200);
  };

  const handleSampleClick = (sampleUrl: string) => {
    setInputUrl(sampleUrl);
    handleImport(sampleUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#111116] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#16161d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/20">
              <Link2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                プレイリスト一括インポート
              </h2>
              <p className="text-xs text-neutral-400">
                YouTube または Spotify のプレイリストURLを貼り付けてライブラリに追加
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* URL Input Form */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
              プレイリスト / アルバム URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  placeholder="https://www.youtube.com/playlist?list=... または Spotify URL"
                  className="w-full bg-[#1b1b22] border border-white/15 focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => handleImport()}
                disabled={loading || !inputUrl.trim()}
                className="px-5 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-95"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>解析</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Samples */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-400">ワンタップで試す:</span>
            <button
              onClick={() =>
                handleSampleClick(
                  'https://open.spotify.com/playlist/37i9dQZF1DXdbXrPNafg9d'
                )
              }
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Spotify Tokyo Super Hits
            </button>
            <button
              onClick={() =>
                handleSampleClick(
                  'https://open.spotify.com/playlist/37i9dQZEVXbKXQhVTyLWIo'
                )
              }
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Spotify 日本 Top 50
            </button>
            <button
              onClick={() =>
                handleSampleClick(
                  'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
                )
              }
              className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Spotify Global Hits
            </button>
            <button
              onClick={() =>
                handleSampleClick(
                  'https://www.youtube.com/playlist?list=PLDIoUOhQQPlXr63I_vwF9GD8sAKh77dWU'
                )
              }
              className="px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 transition-colors font-medium cursor-pointer"
            >
              YouTube 髭男公式リスト
            </button>
          </div>

          {/* Loading status message */}
          {loading && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 animate-pulse">
              <Loader2 size={18} className="animate-spin text-red-500 shrink-0" />
              <div className="text-xs text-neutral-300">
                <p className="font-semibold text-white">プレイリストを解析中...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">読み込みに失敗しました</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Parsed Result Display */}
          {parsedData && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-[#181822] border border-white/10 flex items-center gap-4">
                {parsedData.thumbnail ? (
                  <SafeImage
                    src={parsedData.thumbnail}
                    alt={parsedData.title}
                    className="w-16 h-16 rounded-lg object-cover shadow-md border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    <ListMusic size={28} className="text-neutral-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base truncate">{parsedData.title}</h3>
                    {parsedData.source && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/10 text-neutral-300 border border-white/10 shrink-0">
                        {parsedData.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {parsedData.author} • {parsedData.tracks.length} 曲検出
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handlePlayNow}
                  className="flex-1 py-3 px-4 bg-white text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <Play size={16} fill="black" />
                  <span>今すぐ全曲再生</span>
                </button>
                <button
                  onClick={handleSaveToLibrary}
                  className="flex-1 py-3 px-4 bg-[#252530] hover:bg-[#2e2e3c] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-emerald-400">ライブラリに保存済み！</span>
                    </>
                  ) : (
                    <>
                      <ListPlus size={16} />
                      <span>マイプレイリストに保存</span>
                    </>
                  )}
                </button>
              </div>

              {/* Track list preview */}
              <div className="border border-white/10 rounded-xl bg-[#0e0e12] overflow-hidden">
                <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 text-xs font-semibold text-neutral-400 flex justify-between">
                  <span>トラックリストプレビュー ({parsedData.tracks.length}曲)</span>
                  <span>時間</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                  {parsedData.tracks.map((track, i) => (
                    <div
                      key={track.id || i}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-xs text-neutral-200 transition-colors group"
                    >
                      <span className="w-5 text-neutral-500 font-mono text-[11px] text-right">
                        {i + 1}
                      </span>
                      {track.thumbnail && (
                        <SafeImage
                          src={track.thumbnail}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{track.title}</p>
                        <p className="text-neutral-400 text-[11px] truncate">{track.artist}</p>
                      </div>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {track.duration ||
                          (track.durationSeconds
                            ? `${Math.floor(track.durationSeconds / 60)}:${String(
                                track.durationSeconds % 60
                              ).padStart(2, '0')}`
                            : '--:--')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Guide Notes */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-300">💡 対応している形式</p>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[11px]">
              <li>Spotify プレイリスト / アルバム / 楽曲 URL (`open.spotify.com/playlist/...`, `spotify.link/...`)</li>
              <li>YouTube プレイリスト URL (`youtube.com/playlist?list=...`)</li>
              <li>YouTube Music プレイリスト / アルバム URL (`music.youtube.com/playlist?list=...`)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
