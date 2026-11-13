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
  Check,
  Search,
  RotateCw,
  X,
  Volume2,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { CommentEmotionData, Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { SafeImage } from './SafeImage';

interface MoodOption {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const MOODS: MoodOption[] = [
  { id: 'energy', name: 'テンションUP', icon: Flame, description: '熱い・鳥肌' },
  { id: 'relax', name: 'チル・リラックス', icon: Coffee, description: '癒し・落ち着く' },
  { id: 'drive', name: 'ドライブ・爽快', icon: Car, description: '疾走感・爽快' },
  { id: 'focus', name: '集中・作業用', icon: Headphones, description: '作業・勉強' },
  { id: 'emotional', name: 'エモい・夜', icon: Moon, description: '夜・刺さる' },
  { id: 'sad', name: '切ない・バラード', icon: Droplets, description: '泣ける・共感' },
  { id: 'happy', name: '元気・ポジティブ', icon: Sparkles, description: '応援・笑顔' },
  { id: 'nostalgic', name: '懐かしい・名曲', icon: Radio, description: '青春・名曲' },
];

const MOOD_NAME_MAP: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.id, m.name])
);

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
  const { playTrack, addToQueue, toggleLikeTrack, likedTrackIds, currentTrack, isPlaying } =
    usePlayer();

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
    analyzedTotalComments?: number;
    topEmotionTags?: string[];
    tracks: Track[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [addedQueueNotice, setAddedQueueNotice] = useState<boolean>(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Current playing track YouTube comment emotion extraction
  const [currentTrackAnalysis, setCurrentTrackAnalysis] = useState<{
    trackTitle: string;
    trackArtist: string;
    data: CommentEmotionData;
  } | null>(null);
  const [analyzingCurrent, setAnalyzingCurrent] = useState<boolean>(false);

  const [, startTransition] = useTransition();

  const fetchRecommendation = async (mood: string, artist: string, forceRefresh = false) => {
    setLoading(true);
    try {
      const effectiveArtist = artist === '指定なし' ? undefined : artist;
      const res = await api.getMoodRecommendation(mood, effectiveArtist, forceRefresh);
      if (res && res.tracks) {
        startTransition(() => {
          setRecData(res);
          setExpandedTrackId(res.tracks[0]?.id || null);
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

  const handleAnalyzeCurrentTrack = async () => {
    if (!currentTrack || analyzingCurrent) return;
    setAnalyzingCurrent(true);
    try {
      const analysis = await api.getTrackCommentEmotions(
        currentTrack.id,
        currentTrack.title,
        currentTrack.artist
      );
      setCurrentTrackAnalysis({
        trackTitle: currentTrack.title,
        trackArtist: currentTrack.artist,
        data: analysis,
      });
      if (analysis.dominantMood && MOOD_NAME_MAP[analysis.dominantMood]) {
        setSelectedMood(analysis.dominantMood);
      }
    } catch (err) {
      console.error('[CurrentTrackCommentEmotion] Error:', err);
    } finally {
      setAnalyzingCurrent(false);
    }
  };

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

  const handlePlayAll = (shuffle = false) => {
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
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-600 text-white rounded flex items-center gap-1">
              <MessageSquareText className="w-3 h-3" />
              YouTubeコメント感情解析
            </span>
            {recData?.analyzedTotalComments ? (
              <span className="text-xs text-neutral-400 font-mono">
                {recData.analyzedTotalComments}件のコメントから感情抽出
              </span>
            ) : null}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            今の気分 × アーティスト選曲
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {currentTrack && (
            <button
              type="button"
              onClick={handleAnalyzeCurrentTrack}
              disabled={analyzingCurrent}
              className="px-3.5 py-1.5 rounded-full bg-red-950/60 hover:bg-red-900/70 border border-red-600/60 text-xs font-bold text-red-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {analyzingCurrent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
              ) : (
                <MessageSquareText className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>再生中の曲のコメントから判定</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchRecommendation(selectedMood, selectedArtist, true)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 text-red-500 ${loading ? 'animate-spin' : ''}`} />
            再解析
          </button>
        </div>
      </div>

      {/* Analyzed Result Banner for Current Playing Track */}
      {currentTrackAnalysis && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-950/25 border border-red-700/40 relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white">
                  抽出感情: {currentTrackAnalysis.data.dominantMoodName}
                </span>
                <span className="text-xs font-bold text-white truncate">
                  {currentTrackAnalysis.trackTitle}
                </span>
                <span className="text-[11px] text-neutral-400">
                  ({currentTrackAnalysis.data.analyzedCount}件解析)
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1.5">
                {currentTrackAnalysis.data.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentTrackAnalysis.data.emotionTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-black/50 border border-red-800/40 text-[11px] font-semibold text-red-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              {currentTrackAnalysis.data.sampleComments?.[0] && (
                <div className="mt-2.5 text-[11px] text-neutral-400 bg-black/40 rounded-lg px-2.5 py-1.5 border border-neutral-800/80 line-clamp-2">
                  <span className="text-neutral-300 font-semibold">
                    {currentTrackAnalysis.data.sampleComments[0].author}:
                  </span>{' '}
                  {currentTrackAnalysis.data.sampleComments[0].text}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCurrentTrackAnalysis(null)}
              className="p-1 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Select Mood */}
      <div className="mb-5 relative z-10">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 block">
          1. 今の気分
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
                  <div
                    className={`text-xs font-bold truncate ${
                      isSelected ? 'text-white' : 'text-neutral-200'
                    }`}
                  >
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

      {/* Step 2: Select Artist (Optional) */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            2. アーティスト <span className="text-neutral-500 font-normal">(選択なし可)</span>
          </label>

          {!isCustomInputOpen && (
            <button
              type="button"
              onClick={() => setIsCustomInputOpen(true)}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Search className="w-3 h-3" />
              アーティスト入力
            </button>
          )}
        </div>

        {isCustomInputOpen && (
          <form onSubmit={handleCustomArtistSubmit} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={customArtistInput}
                onChange={(e) => setCustomArtistInput(e.target.value)}
                placeholder="アーティスト名 (例: あいみょん、Creepy Nuts、ヨルシカ...)"
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

        <div className="flex flex-wrap gap-2">
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
            指定なし
          </button>

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

      {/* Loading Indicator */}
      {loading && !recData && (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          <span>YouTubeコメントを取得して感情を抽出中...</span>
        </div>
      )}

      {/* Step 3: Mix Result Presentation */}
      {recData && (
        <div className="bg-[#0e0e13] border border-neutral-800/90 rounded-xl overflow-hidden relative z-10">
          {loading && (
            <div className="bg-red-950/60 border-b border-red-800/40 px-4 py-1.5 text-[11px] text-red-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
              <span>YouTubeコメントから感情を再抽出中...</span>
            </div>
          )}

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

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-red-500 tracking-wider">
                    {activeMoodObj.name}
                  </span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">
                    {recData.tracks.length}曲
                  </span>
                  {recData.topEmotionTags && recData.topEmotionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recData.topEmotionTags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-[10px] text-red-300 font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
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

          {addedQueueNotice && (
            <div className="bg-red-600/90 text-white text-xs font-semibold py-1.5 px-4 text-center">
              全曲を再生キューに追加しました
            </div>
          )}

          {/* Tracklist with Real YouTube Comment Emotions */}
          <div className="divide-y divide-neutral-800/50">
            {recData.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);
              const emo = track.commentEmotion;
              const matchPct = emo?.emotionScores?.[selectedMood] ?? null;
              const isExpanded = expandedTrackId === track.id;

              const topScores = emo?.emotionScores
                ? Object.entries(emo.emotionScores)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                : [];

              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={isCurrent ? 'bg-red-950/25' : ''}
                >
                  <div
                    onClick={() => playTrack(track, recData.tracks)}
                    className={`group flex items-center gap-3 px-3 sm:px-4 py-2.5 transition-colors cursor-pointer select-none ${
                      isCurrent ? 'text-red-400' : 'hover:bg-[#16161e] text-neutral-200'
                    }`}
                  >
                    {/* Track Number */}
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
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-neutral-900 relative shadow-sm">
                      <SafeImage
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Title, Artist & Extracted Emotion Tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isCurrent ? 'text-red-400 font-bold' : 'text-white group-hover:text-red-400'
                          }`}
                        >
                          {track.title}
                        </span>
                        {matchPct !== null && matchPct > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600/20 border border-red-600/40 text-[10px] font-mono font-bold text-red-400 shrink-0">
                            {matchPct}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <span className="text-[11px] text-neutral-400 truncate">
                          {track.artist}
                        </span>
                        {emo?.emotionTags?.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800/90 text-neutral-300 border border-neutral-700/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Comment Expand Button & Actions */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {emo && emo.analyzedCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTrackId(isExpanded ? null : track.id);
                          }}
                          className={`px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-red-600 text-white border-red-500'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700/80'
                          }`}
                          title="YouTubeコメント感情を表示"
                        >
                          <MessageSquareText className="w-3 h-3" />
                          <span className="hidden xs:inline">{emo.analyzedCount}件</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}

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

                      {track.duration && (
                        <span className="text-xs text-neutral-500 font-mono w-10 text-right hidden sm:inline-block">
                          {track.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded YouTube Comment Emotion Breakdown Drawer */}
                  {isExpanded && emo && (
                    <div className="px-4 pb-3.5 pt-2 bg-[#0a0a0d] border-t border-neutral-800/60 space-y-3">
                      {/* Emotion Summary & Dominant Mood */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">
                            最多感情: {emo.dominantMoodName}
                          </span>
                          <span className="text-neutral-300">{emo.summary}</span>
                        </div>
                      </div>

                      {/* Emotion Score Bars */}
                      {topScores.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {topScores.map(([mId, score]) => (
                            <div
                              key={mId}
                              className="bg-[#121218] border border-neutral-800/80 rounded-lg px-2.5 py-1.5"
                            >
                              <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-neutral-300 font-semibold truncate">
                                  {MOOD_NAME_MAP[mId] || mId}
                                </span>
                                <span className="text-red-400 font-mono font-bold">
                                  {score}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actual Quoted YouTube Comments */}
                      {emo.sampleComments && emo.sampleComments.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            抽出元のYouTubeコメント
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {emo.sampleComments.slice(0, 4).map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="bg-[#131319] border border-neutral-800/80 rounded-lg p-2.5 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400">
                                  <span className="font-bold text-neutral-300 truncate">
                                    {c.author}
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0 text-neutral-400">
                                    <ThumbsUp className="w-2.5 h-2.5 text-red-500" />
                                    {c.likes}
                                  </span>
                                </div>
                                <p className="text-neutral-200 text-[11px] leading-relaxed line-clamp-2">
                                  {c.text}
                                </p>
                                {c.matchedEmotions && c.matchedEmotions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {c.matchedEmotions.map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-1.5 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-800/40 text-[9px]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
