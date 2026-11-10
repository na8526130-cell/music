import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Moon, Clock, X, Check, Timer } from 'lucide-react';

function formatTimerSeconds(secs: number): string {
  if (secs <= 0) return '0:00';
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins}分${remainingSecs < 10 ? '0' : ''}${remainingSecs}秒`;
}

export const SleepTimerModal: React.FC = () => {
  const {
    sleepTimerModalOpen,
    setSleepTimerModalOpen,
    sleepTimerRemaining,
    sleepTimerMode,
    setSleepTimer,
    clearSleepTimer,
  } = usePlayer();

  if (!sleepTimerModalOpen) return null;

  const presets = [
    { label: '5分', value: 5 },
    { label: '10分', value: 10 },
    { label: '15分', value: 15 },
    { label: '30分', value: 30 },
    { label: '45分', value: 45 },
    { label: '1時間 (60分)', value: 60 },
    { label: 'この曲の終わりで停止', value: 'end_of_track' as const },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#1c0407] via-[#120305] to-black border border-red-900/50 p-6 shadow-2xl text-white space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Moon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                スリープタイマー
              </h2>
              <p className="text-[11px] text-neutral-400">
                おやすみ前の自動再生停止
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSleepTimerModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timer Status Banner */}
        {(sleepTimerRemaining !== null || sleepTimerMode === 'end_of_track') && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Timer className="w-4 h-4 text-red-400 animate-pulse" />
              <span>
                {sleepTimerMode === 'end_of_track' ? (
                  <strong className="text-red-300">現在の曲が終わったら停止</strong>
                ) : (
                  <span>
                    残り時間:{' '}
                    <strong className="text-red-300 font-mono text-sm">
                      {formatTimerSeconds(sleepTimerRemaining || 0)}
                    </strong>
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={clearSleepTimer}
              className="text-[11px] font-bold text-red-400 hover:text-red-300 hover:underline cursor-pointer shrink-0"
            >
              オフにする
            </button>
          </div>
        )}

        {/* Preset Options List (Spotify Style) */}
        <div className="space-y-1.5 divide-y divide-neutral-900/80">
          {presets.map((item) => {
            const isSelected =
              sleepTimerMode === item.value ||
              (typeof item.value === 'number' &&
                sleepTimerRemaining !== null &&
                sleepTimerMode === item.value);

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setSleepTimer(item.value)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600/25 text-red-300 border border-red-500/40'
                    : 'text-neutral-200 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <span>{item.label}</span>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-red-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Turn Off button if active */}
        {(sleepTimerRemaining !== null || sleepTimerMode !== null) && (
          <button
            type="button"
            onClick={clearSleepTimer}
            className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold border border-neutral-800 transition-colors cursor-pointer"
          >
            タイマーをオフにする
          </button>
        )}
      </div>
    </div>
  );
};
