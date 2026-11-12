import React, { useState, useEffect, useTransition } from 'react';
import {
  Flame,
  Coffee,
  Car,
  Headphones,
  Moon,
  Droplets,
  Sparkles,
  Radio,
  Play,
  Shuffle,
  Plus,
  Heart,
  Music2,
  Check,
  Search,
  RotateCw,
  X,
  Volume2,
} from 'lucide-react';
import { api } from '../services/api';
import { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';

interface MoodOption {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const MOODS: MoodOption[] = [
  { id: 'energy', name: 'テンションUP', icon: Flame, color: 'text-red-500', description: '疾走感・ハイエナジー' },
  { id: 'relax', name: 'チル・リラックス', icon: Coffee, color: 'text-emerald-400', description: 'ゆったり・アコースティック' },
  { id: 'drive', name: 'ドライブ・爽快', icon: Car, color: 'text-cyan-400', description: '爽快・ビート感' },
  { id: 'focus', name: '集中・作業用', icon: Headphones, color: 'text-indigo-400', description: '落ち着く・BGM' },
  { id: 'emotional', name: 'エモい・夜', icon: Moon, color: 'text-purple-400', description: '夜更かし・シティポップ' },
  { id: 'sad', name: '切ない・バラード', icon: Droplets, color: 'text-blue-400', description: '心に染みる名バラード' },
  { id: 'happy', name: '元気・ポジティブ', icon: Sparkles, color: 'text-amber-400', description: '明るい・前向き' },
  { id: 'nostalgic', name: '懐かしい・名曲', icon: Radio, color: 'text-rose-400', description: '色褪せない名曲' },
];

const POPULAR_ARTISTS = [
  'Official髭男dism',
  'Vaundy',
  'YOASOBI',
  'King Gnu',
  'Mrs. GREEN APPLE',
  'back number',
  '米津玄師',
  '優里',
  '藤井 風',
  'Ado',
];

export const MoodRecommendationSection: React.FC = () => {
  const { playTrack, addToQueue, toggleLikeTrack, likedTrackIds, currentTrack, isPlaying } = usePlayer();

  const [selectedMood, setSelectedMood] = useState<string>('energy');
  const [selectedArtist, setSelectedArtist] = useState<string>('指定なし');
  const [customArtistInput, setCustomArtistInput] = useState<string>('');
  const [isCustomInputOpen, setIsCustomInputOpen] = useState<boolean>(false);

  const [recData, setRecData] = useState<{
    mood: { id: string; name: string; icon: string; tagline: string };
    artist: string | null;
    title: string;
    tagline: string;
    cover: string;
    tracks: Track[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [addedQueueNotice, setAddedQueueNotice] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Fetch recommendation whenever mood or artist changes
  const fetchRecommendation = async (mood: string, artist: string) => {
    setLoading(true);
    try {
      const effectiveArtist = artist === '指定なし' ? undefined : artist;
      const res = await api.getMoodRecommendation(mood, effectiveArtist);
      if (res && res.tracks) {
        startTransition(() => {
          setRecData(res);
        });
      }
    } catch (err) {
      console.error('[MoodRecommendation] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation(selectedMood, selectedArtist);
  }, [selectedMood, selectedArtist]);

  const handleSelectArtist = (artist: string) => {
    setSelectedArtist(artist);
    if (artist !== 'custom') {
      setCustomArtistInput('');
    }
  };

  const handleCustomArtistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customArtistInput.trim();
    if (clean) {
      setSelectedArtist(clean);
    }
  };

  // Playback handlers
  const handlePlayAll = (shuffle: boolean = false) => {
    if (!recData?.tracks || recData.tracks.length === 0) return;
    const tracksToPlay = shuffle
      ? [...recData.tracks].sort(() => Math.random() - 0.5)
      : recData.tracks;
    playTrack(tracksToPlay[0], tracksToPlay);
  };

  const handleAddAllToQueue = () => {
    if (!recData?.tracks) return;
    recData.tracks.forEach((t) => addToQueue(t));
    setAddedQueueNotice(true);
    setTimeout(() => setAddedQueueNotice(false), 2000);
  };

  const activeMoodObj = MOODS.find((m) => m.id === selectedMood) || MOODS[0];
  const ActiveIcon = activeMoodObj.icon;

  return (
    <section className="bg-gradient-to-b from-[#141419] to-[#0c0c0f] border border-neutral-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Subtle Crimson Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded">
              Spotify Mood Mix
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              気分とアーティストからおすすめを自動選曲
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            今の気分 × アーティスト選曲
          </h2>
        </div>

        <button
          type="button"
          onClick={() => fetchRecommendation(selectedMood, selectedArtist)}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 text-red-500 ${loading ? 'animate-spin' : ''}`} />
          曲を更新
        </button>
      </div>

      {/* Step 1: Select Mood */}
      <div className="mb-5 relative z-10">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 block">
          1. 今の気分を選ぶ
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.id;
            const Icon = mood.icon;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => setSelectedMood(mood.id)}
                className={`flex items-center sm:flex-col sm:justify-center gap-2 p-2.5 sm:py-3 rounded-xl border text-left sm:text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-950/40 border-red-600 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-500/50'
                    : 'bg-[#16161c] hover:bg-[#1e1e26] border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                    {mood.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 sm:hidden truncate">
                    {mood.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Artist (Optional / None allowed) */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            2. アーティストを選ぶ <span className="text-neutral-500 font-normal lowercase">(選択なしでも可)</span>
          </label>

          {!isCustomInputOpen && (
            <button
              type="button"
              onClick={() => setIsCustomInputOpen(true)}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Search className="w-3 h-3" />
              他のアーティストを入力
            </button>
          )}
        </div>

        {/* Custom Artist Search Bar */}
        {isCustomInputOpen && (
          <form onSubmit={handleCustomArtistSubmit} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={customArtistInput}
                onChange={(e) => setCustomArtistInput(e.target.value)}
                placeholder="アーティスト名を入力 (例: あいみょん、Creepy Nuts、ヨルシカ...)"
                className="w-full bg-[#181822] border border-red-600/50 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none pr-8"
                autoFocus
              />
              {customArtistInput && (
                <button
                  type="button"
                  onClick={() => setCustomArtistInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              決定
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomInputOpen(false);
                setCustomArtistInput('');
              }}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg cursor-pointer"
            >
              閉じる
            </button>
          </form>
        )}

        {/* Artist Chips Row */}
        <div className="flex flex-wrap gap-2">
          {/* Default Unselected Chip */}
          <button
            type="button"
            onClick={() => handleSelectArtist('指定なし')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedArtist === '指定なし'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-[#181820] hover:bg-[#20202a] text-neutral-300 border border-neutral-800'
            }`}
          >
            {selectedArtist === '指定なし' && <Check className="w-3.5 h-3.5" />}
            指定なし (全アーティストMix)
          </button>

          {/* Popular Artists */}
          {POPULAR_ARTISTS.map((artist) => {
            const isSelected = selectedArtist === artist;
            return (
              <button
                key={artist}
                type="button"
                onClick={() => handleSelectArtist(artist)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-[#181820] hover:bg-[#20202a] text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {artist}
              </button>
            );
          })}

          {/* Custom Artist Chip if not in popular list */}
          {selectedArtist !== '指定なし' && !POPULAR_ARTISTS.includes(selectedArtist) && (
            <button
              type="button"
              onClick={() => handleSelectArtist(selectedArtist)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-md shadow-red-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {selectedArtist}
            </button>
          )}
        </div>
      </div>

      {/* Step 3: Mix Result Presentation */}
      {recData && (
        <div className="bg-[#0e0e13] border border-neutral-800/90 rounded-xl overflow-hidden relative z-10">
          {/* Mix Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/40 via-[#181822] to-[#121216] border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-xl shrink-0 bg-neutral-900 relative">
                <SafeImage
                  src={recData.cover}
                  alt={recData.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-md bg-black/70 backdrop-blur-sm flex items-center justify-center text-red-400">
                  <ActiveIcon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-red-500 tracking-wider">
                    {activeMoodObj.name}
                  </span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">
                    {recData.tracks.length}曲セレクト
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  {recData.title}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                  {recData.tagline}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePlayAll(false)}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                全曲再生
              </button>

              <button
                type="button"
                onClick={() => handlePlayAll(true)}
                className="p-2 sm:px-3 sm:py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="シャッフル再生"
              >
                <Shuffle className="w-4 h-4 text-neutral-300" />
                <span className="hidden sm:inline">シャッフル</span>
              </button>

              <button
                type="button"
                onClick={handleAddAllToQueue}
                className="p-2 sm:px-3 sm:py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="すべてキューに追加"
              >
                <Plus className="w-4 h-4 text-neutral-300" />
                <span className="hidden sm:inline">キューに追加</span>
              </button>
            </div>
          </div>

          {/* Queue Notice Feedback */}
          {addedQueueNotice && (
            <div className="bg-red-600/90 text-white text-xs font-semibold py-1.5 px-4 text-center animate-fade-in">
              全曲を再生キューに追加しました
            </div>
          )}

          {/* Tracklist Table */}
          <div className="divide-y divide-neutral-800/50">
            {recData.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, recData.tracks)}
                  className={`group flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-red-950/30 text-red-400'
                      : 'hover:bg-[#16161e] text-neutral-200'
                  }`}
                >
                  {/* Track Number / Playing indicator */}
                  <div className="w-6 text-center text-xs text-neutral-500 group-hover:hidden shrink-0 font-mono">
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 text-red-500 animate-pulse mx-auto" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="w-6 hidden group-hover:flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                  </div>

                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-900 relative shadow-sm">
                    <SafeImage
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Artist */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isCurrent ? 'text-red-400 font-bold' : 'text-white group-hover:text-red-400'
                      }`}
                    >
                      {track.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {track.artist}
                    </div>
                  </div>

                  {/* Duration & Quick Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(track);
                      }}
                      className={`p-1.5 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer ${
                        isLiked ? 'text-red-500' : 'text-neutral-500 hover:text-white'
                      }`}
                      title={isLiked ? 'お気に入りから削除' : 'お気に入りに追加'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>

                    {/* Add to Queue Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track);
                      }}
                      className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      title="キューに追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Duration */}
                    {track.duration && (
                      <span className="text-xs text-neutral-500 font-mono w-10 text-right hidden sm:inline-block">
                        {track.duration}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
