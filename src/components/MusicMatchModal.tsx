import React, { useState } from 'react';
import { X, Sparkles, Heart, MessageSquare, Music, Users, Compass, RefreshCw } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { Track } from '../types/music';

interface MusicMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MatchCandidate {
  username: string;
  avatar: string;
  score: number;
  badge: string;
  topArtists: string[];
  sharedTags: string[];
  recommendedTrack: Track;
}

export const MusicMatchModal: React.FC<MusicMatchModalProps> = ({ isOpen, onClose }) => {
  const { likedTracks, recentTracks, openDmWithUser, playTrack } = usePlayer();
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [customUserSearch, setCustomUserSearch] = useState<string>('');

  // Extract user's favorite artists
  const userArtists = Array.from(
    new Set([...likedTracks, ...recentTracks].map((t) => t.artist))
  );

  const mockCandidates: MatchCandidate[] = [
    {
      username: 'Aoi_Sound',
      avatar: '🎧',
      score: 94,
      badge: 'ソウルメイト級の音楽性',
      topArtists: ['Vaundy', 'Official髭男dism', 'Mrs. GREEN APPLE'],
      sharedTags: ['邦ロック', 'キャッチー', 'エモーショナル'],
      recommendedTrack: {
        id: 'dQw4w9WgXcQ',
        title: '怪獣の花唄',
        artist: 'Vaundy',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
        duration: '03:45',
        durationSeconds: 225,
      },
    },
    {
      username: 'ChilLover_Ken',
      avatar: '☕',
      score: 87,
      badge: '深夜のLo-Fi仲間',
      topArtists: ['藤井 風', '羊文学', 'KIRINJI'],
      sharedTags: ['チルアウト', 'Lo-Fi', 'シティポップ'],
      recommendedTrack: {
        id: 'dQw4w9WgXcQ2',
        title: 'まつり',
        artist: '藤井 風',
        thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
        duration: '03:46',
        durationSeconds: 226,
      },
    },
    {
      username: 'RockSpirits_Ryota',
      avatar: '⚡',
      score: 79,
      badge: 'フェス友候補',
      topArtists: ['ONE OK ROCK', 'King Gnu', 'MAN WITH A MISSION'],
      sharedTags: ['ラウドロック', 'オルタナティブ', '疾走感'],
      recommendedTrack: {
        id: 'dQw4w9WgXcQ3',
        title: '一途',
        artist: 'King Gnu',
        thumbnail: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop',
        duration: '03:10',
        durationSeconds: 190,
      },
    },
  ];

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>音楽の好みの近さ マッチング診断</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                  AI Taste Match
                </span>
              </h3>
              <p className="text-xs text-neutral-400">再生履歴やお気に入り曲から趣味が合うリスナーを発見</p>
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
          {/* My Taste Summary Card */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-neutral-400">あなたのリスニング傾向</span>
              <p className="text-xs text-neutral-200">
                お気に入り曲: <span className="text-white font-bold">{likedTracks.length}曲</span> •
                最近再生: <span className="text-white font-bold">{recentTracks.length}曲</span>
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {userArtists.slice(0, 4).map((art) => (
                  <span
                    key={art}
                    className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                  >
                    {art}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartAnalysis}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-pink-400' : ''}`} />
              <span>再診断</span>
            </button>
          </div>

          {/* Matched Users */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-400" />
              <span>おすすめの趣味一致リスナー</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {mockCandidates.map((cand) => (
                <div
                  key={cand.username}
                  className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 hover:border-pink-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-xl shrink-0">
                      {cand.avatar}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          @{cand.username}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950/70 text-pink-300 border border-pink-500/40 font-mono font-semibold">
                          {cand.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                        <span>よく聴く: {cand.topArtists.join(', ')}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        {cand.sharedTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Score & Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800/50">
                    <div className="text-right">
                      <span className="text-xs text-neutral-400 mr-1.5">一致度</span>
                      <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 font-mono">
                        {cand.score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openDmWithUser(cand.username);
                        }}
                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-transform active:scale-95 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>DMで話す</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playTrack(cand.recommendedTrack);
                        }}
                        title="おすすめ曲を再生"
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl transition-colors"
                      >
                        <Music className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
