import React, { useEffect, useState, useMemo } from 'react';
import {
  equalizer,
  EqualizerSettings,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  EqPresetKey,
} from '../services/equalizer';
import { usePlayer } from '../context/PlayerContext';
import { SpectrumVisualizer } from './SpectrumVisualizer';
import {
  X,
  Sliders,
  RotateCcw,
  Volume2,
  Sparkles,
  Zap,
  Activity,
  Check,
  Disc,
  Radio,
  FastForward,
} from 'lucide-react';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const {
    crossfadeDuration,
    setCrossfadeDuration,
    endlessRadioActive,
    toggleEndlessRadio,
  } = usePlayer();
  const [settings, setSettings] = useState<EqualizerSettings>(equalizer.getSettings());

  useEffect(() => {
    return equalizer.subscribe((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  // Format frequency label
  const formatFreq = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
  };

  // Generate SVG path for the EQ curve visualizer
  const svgCurvePath = useMemo(() => {
    const width = 500;
    const height = 110;
    const paddingX = 25;
    const usableW = width - paddingX * 2;
    const centerY = height / 2;

    const points = settings.gains.map((gain, idx) => {
      const x = paddingX + (idx / (settings.gains.length - 1)) * usableW;
      // Boost bass on the left edge if bassBoost is active
      const effectiveGain =
        idx === 0
          ? gain + settings.bassBoost * 0.7
          : idx === 1
          ? gain + settings.bassBoost * 0.4
          : gain;
      // Invert Y because SVG coordinates go down: -12dB -> bottom, +12dB -> top
      const y = centerY - (effectiveGain / 16) * (height / 2 - 12);
      return { x, y: Math.max(8, Math.min(height - 8, y)) };
    });

    if (points.length === 0) return '';

    // Catmull-Rom or cubic bezier curve
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    return d;
  }, [settings.gains, settings.bassBoost]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#14151c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  10バンド・プロフェッショナルEQ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-red-950/80 text-red-400 border border-red-800/40">
                  WEB AUDIO DSP
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Web Audio API フィルタと重低音ブーストによる音質カスタム調整
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Master EQ Toggle */}
            <button
              type="button"
              onClick={() => equalizer.setEnabled(!settings.enabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                settings.enabled
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{settings.enabled ? 'EQ有効' : 'バイパス (OFF)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Preset Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                プリセット選択
              </span>
              <span className="text-[11px] text-neutral-500">
                {EQ_PRESETS[settings.preset]?.description || ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {(Object.keys(EQ_PRESETS) as EqPresetKey[]).map((key) => {
                const preset = EQ_PRESETS[key];
                const isSelected = settings.preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => equalizer.setPreset(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-600/90 to-red-700/90 border-red-500 text-white shadow-md shadow-red-900/30'
                        : 'bg-neutral-900/70 border-white/5 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <div className="truncate font-semibold">{preset.label.split(' ')[0]}</div>
                    <div className="text-[10px] text-neutral-400 truncate opacity-80">
                      {preset.label.split('(')[1]?.replace(')', '') || preset.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Frequency Response Curve Visualizer */}
          <div className="relative p-3 rounded-2xl bg-gradient-to-b from-[#0a0a0f] to-[#12131a] border border-white/5 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 px-2 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                周波数レスポンスカーブ
              </span>
              <span>+12 dB / 0 dB / -12 dB</span>
            </div>

            <div className="h-28 w-full relative">
              <svg
                viewBox="0 0 500 110"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Reference Grid lines */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="#ffffff" strokeOpacity="0.06" />
                <line
                  x1="20"
                  y1="55"
                  x2="480"
                  y2="55"
                  stroke="#ffffff"
                  strokeOpacity="0.15"
                  strokeDasharray="4 4"
                />
                <line x1="20" y1="90" x2="480" y2="90" stroke="#ffffff" strokeOpacity="0.06" />

                {/* Filled Area Gradient */}
                <defs>
                  <linearGradient id="eqFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                    <stop offset="60%" stopColor="#ef4444" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Curve fill to center line */}
                {svgCurvePath && (
                  <>
                    <path
                      d={`${svgCurvePath} L 475 55 L 25 55 Z`}
                      fill="url(#eqFillGradient)"
                      className="transition-all duration-150"
                    />
                    <path
                      d={svgCurvePath}
                      fill="none"
                      stroke={settings.enabled ? '#ef4444' : '#737373'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="transition-all duration-150"
                    />
                  </>
                )}

                {/* Dots on the curve */}
                {settings.gains.map((gain, idx) => {
                  const x = 25 + (idx / 9) * 450;
                  const effectiveGain =
                    idx === 0
                      ? gain + settings.bassBoost * 0.7
                      : idx === 1
                      ? gain + settings.bassBoost * 0.4
                      : gain;
                  const y = 55 - (effectiveGain / 16) * 43;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={Math.max(8, Math.min(102, y))}
                      r="3.5"
                      fill={settings.enabled ? '#ffffff' : '#a3a3a3'}
                      stroke={settings.enabled ? '#ef4444' : '#525252'}
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Real-time Spectrum Visualizer */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                リアルタイム周波数スペクトラム・オーディオビジュアライザー
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                FFT 64-Band Dual Neon Engine
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/60 border border-neutral-800/80">
              <SpectrumVisualizer height={54} barCount={48} showControls mode="bars" />
            </div>
          </div>

          {/* Advanced DJ & Audio Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Seamless Crossfade Setting */}
            <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 text-amber-400 flex items-center justify-center">
                    <FastForward className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">クロスフェード</h5>
                    <p className="text-[10px] text-neutral-400">曲間シームレス移行</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {crossfadeDuration > 0 ? `${crossfadeDuration}秒` : 'OFF'}
                </span>
              </div>
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                  <span onClick={() => setCrossfadeDuration(0)} className="cursor-pointer hover:text-white">切</span>
                  <span onClick={() => setCrossfadeDuration(3)} className="cursor-pointer hover:text-white">3s</span>
                  <span onClick={() => setCrossfadeDuration(5)} className="cursor-pointer hover:text-white">5s</span>
                  <span onClick={() => setCrossfadeDuration(8)} className="cursor-pointer hover:text-white">8s</span>
                  <span onClick={() => setCrossfadeDuration(12)} className="cursor-pointer hover:text-white">12s</span>
                </div>
              </div>
            </div>

            {/* Smart Endless Radio / Auto-DJ */}
            <div
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                endlessRadioActive
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                  : 'bg-neutral-900/60 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      endlessRadioActive ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">スマート自動選曲</h5>
                    <p className="text-[10px] text-neutral-400">オートDJ・無限再生</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleEndlessRadio}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                    endlessRadioActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {endlessRadioActive ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                キューが尽きると関連曲を自動発掘し、BGMを止めずに流し続けます。
              </p>
            </div>
          </div>

          {/* Heavy Bass Boost Section */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  settings.bassBoost > 0
                    ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-900/30'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Zap
                  className={`w-5 h-5 ${settings.bassBoost > 4 ? 'animate-bounce text-amber-300' : ''}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">重低音ブースト (Bass Boost)</h4>
                  {settings.bassBoost > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      +{settings.bassBoost} dB
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">
                  超低音域（40Hz〜70Hz）のパンチとベース振動を増幅します
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-64">
              <span className="text-xs text-neutral-500 font-mono">0dB</span>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={settings.bassBoost}
                onChange={(e) => equalizer.setBassBoost(parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <span className="text-xs text-amber-400 font-mono font-bold">+12dB</span>
            </div>
          </div>

          {/* 10-Band Sliders Console */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-red-500" />
                10バンド周波数ゲイン (-12dB 〜 +12dB)
              </span>
              <button
                type="button"
                onClick={() => equalizer.resetToFlat()}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-white/5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>フラットにリセット</span>
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-4 rounded-2xl bg-[#0b0c10] border border-white/5">
              {EQ_FREQUENCIES.map((freq, idx) => {
                const gain = settings.gains[idx] || 0;
                return (
                  <div key={freq} className="flex flex-col items-center gap-2 group">
                    {/* Gain dB value label */}
                    <span
                      className={`text-[11px] font-mono font-semibold transition-colors ${
                        gain > 0
                          ? 'text-red-400'
                          : gain < 0
                          ? 'text-cyan-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {gain > 0 ? `+${gain}` : `${gain}`}
                    </span>

                    {/* Vertical slider wrapper */}
                    <div className="relative h-44 flex items-center justify-center py-2">
                      {/* Center 0dB guideline */}
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 pointer-events-none" />

                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={gain}
                        onChange={(e) => equalizer.setBandGain(idx, parseFloat(e.target.value))}
                        onDoubleClick={() => equalizer.setBandGain(idx, 0)}
                        style={{
                          transform: 'rotate(-90deg)',
                          width: '150px',
                        }}
                        className="accent-red-600 bg-neutral-800 rounded-lg cursor-pointer h-1.5 focus:outline-none"
                        title={`${formatFreq(freq)}Hz: ${gain}dB (ダブルクリックで0dBに戻す)`}
                      />
                    </div>

                    {/* Frequency label */}
                    <div className="text-center mt-1">
                      <span className="text-[11px] font-mono text-neutral-300 font-semibold block">
                        {formatFreq(freq)}
                      </span>
                      <span className="text-[9px] text-neutral-500 block">Hz</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 text-center">
              ※ スライダーをダブルクリックすると即座に 0dB（標準）に戻せます
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#14151c] border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Disc className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>イヤホン・スピーカーどちらでも最適な音響にリアルタイム補正されます</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
