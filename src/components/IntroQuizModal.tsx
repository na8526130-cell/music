import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Trophy, Sparkles, Volume2, Timer, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Track } from '../types/music';
import { usePlayer } from '../context/PlayerContext';

interface IntroQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Question {
  correctTrack: Track;
  choices: Track[];
}

export const IntroQuizModal: React.FC<IntroQuizModalProps> = ({ isOpen, onClose }) => {
  const { queue, likedTracks, recentTracks, playTrack, currentTrack } = usePlayer();

  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'revealed' | 'finished'>('lobby');
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastRoundPoints, setLastRoundPoints] = useState<number>(0);

  const timerRef = useRef<any>(null);

  // Generate 5 questions from available pool
  const setupGame = () => {
    // Pool of tracks from queue, liked, and recent tracks
    const pool = Array.from(
      new Map([...queue, ...likedTracks, ...recentTracks].map((t) => [t.id, t])).values()
    );

    if (pool.length < 4) {
      // Need at least 4 tracks
      return false;
    }

    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const newQuestions: Question[] = [];

    const numQuestions = Math.min(5, shuffledPool.length);
    for (let i = 0; i < numQuestions; i++) {
      const correct = shuffledPool[i];
      const distractors = pool.filter((t) => t.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const choices = [correct, ...distractors].sort(() => Math.random() - 0.5);
      newQuestions.push({ correctTrack: correct, choices });
    }

    setQuestions(newQuestions);
    setCurrentRound(0);
    setScore(0);
    setStreak(0);
    setGameState('playing');
    setTimeLeft(10);
    setSelectedChoiceId(null);
    return true;
  };

  const startRound = (roundIdx: number) => {
    if (roundIdx >= questions.length) {
      setGameState('finished');
      return;
    }
    const q = questions[roundIdx];
    setSelectedChoiceId(null);
    setTimeLeft(10);
    setGameState('playing');

    // Play 5 seconds intro of the correct track
    playTrack(q.correctTrack);

    // Stop playback after 5 seconds to test memory
    setTimeout(() => {
      // Keep going if still in round
    }, 5000);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAnswer(null); // Time's up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, currentRound]);

  const handleAnswer = (choiceId: string | null) => {
    if (gameState !== 'playing') return;
    clearInterval(timerRef.current);
    setSelectedChoiceId(choiceId);
    setGameState('revealed');

    const q = questions[currentRound];
    if (choiceId === q.correctTrack.id) {
      // Correct!
      const timeBonus = timeLeft * 100;
      const streakBonus = streak * 250;
      const pts = 1000 + timeBonus + streakBonus;
      setLastRoundPoints(pts);
      setScore((prev) => prev + pts);
      setStreak((prev) => prev + 1);
    } else {
      setLastRoundPoints(0);
      setStreak(0);
    }
  };

  const nextRound = () => {
    const nextIdx = currentRound + 1;
    if (nextIdx >= questions.length) {
      setGameState('finished');
    } else {
      setCurrentRound(nextIdx);
      startRound(nextIdx);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>イントロ当て音楽クイズ</span>
                {streak > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    🔥 {streak}連続正解!
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400">イントロ数秒を聴いて曲名を早押し回答</p>
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

        {/* Lobby State */}
        {gameState === 'lobby' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-amber-400 shadow-xl">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">あなたの音楽IQを試そう！</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                再生リストやお気に入り曲から出題される5問のイントロクイズ。早い回答ほど高得点！
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const ok = setupGame();
                if (ok) startRound(0);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>クイズをスタート (全5問)</span>
            </button>
          </div>
        )}

        {/* Playing or Revealed State */}
        {(gameState === 'playing' || gameState === 'revealed') && questions[currentRound] && (
          <div className="p-6 space-y-6">
            {/* Round & Timer Header */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">
                第 {currentRound + 1} / {questions.length} 問
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 text-amber-400 font-bold border border-neutral-700">
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
              <span className="text-white font-bold">スコア: {score} pt</span>
            </div>

            {/* Sound waveform badge */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Volume2 className="w-7 h-7 animate-bounce" />
              </div>
              <p className="text-xs text-neutral-300 font-medium">
                {gameState === 'playing' ? '🎵 イントロ再生中... 曲名を選んでください' : '正解判定'}
              </p>

              {gameState === 'revealed' && (
                <div className="mt-2 text-sm font-bold flex items-center justify-center gap-1.5">
                  {selectedChoiceId === questions[currentRound].correctTrack.id ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> 正解！ (+{lastRoundPoints} pt)
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> 残念！ 正解は「{questions[currentRound].correctTrack.title}」
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-1 gap-2.5">
              {questions[currentRound].choices.map((choice) => {
                const isSelected = selectedChoiceId === choice.id;
                const isCorrect = choice.id === questions[currentRound].correctTrack.id;

                let btnStyle = 'bg-neutral-800/80 hover:bg-neutral-700/80 text-white border-neutral-700/70';
                if (gameState === 'revealed') {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-red-950/80 border-red-500 text-red-200';
                  } else {
                    btnStyle = 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-50';
                  }
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={gameState === 'revealed'}
                    onClick={() => handleAnswer(choice.id)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${btnStyle}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 overflow-hidden shrink-0">
                      <img
                        src={choice.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{choice.title}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{choice.artist}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Next Round Button */}
            {gameState === 'revealed' && (
              <button
                type="button"
                onClick={nextRound}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                {currentRound + 1 < questions.length ? '次の問題へ' : '結果を見る'}
              </button>
            )}
          </div>
        )}

        {/* Finished State */}
        {gameState === 'finished' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
              <Trophy className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                GAME CLEAR!
              </span>
              <h4 className="text-2xl font-black text-white mt-1">最終スコア: {score} pt</h4>
              <p className="text-xs text-neutral-400 mt-2">
                {score >= 4000
                  ? '👑 神レベルの音楽オタク！イントロ神です！'
                  : score >= 2500
                  ? '🎸 かなりの音楽通！素晴らしい耳を持っています！'
                  : '🎧 いいチャレンジでした！もっと音楽を聴きまくろう！'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const ok = setupGame();
                  if (ok) startRound(0);
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>もう一度プレイ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
