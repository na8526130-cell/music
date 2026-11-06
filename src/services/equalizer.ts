export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export type EqFrequency = typeof EQ_FREQUENCIES[number];

export type EqPresetKey =
  | 'flat'
  | 'bass_boost'
  | 'vocal'
  | 'acoustic'
  | 'rock'
  | 'club'
  | 'pop'
  | 'electronic'
  | 'custom';

export interface EqPreset {
  id: EqPresetKey;
  label: string;
  description: string;
  gains: number[]; // 10 values in dB (-12 to +12)
  bassBoost: number; // 0 to 12 dB
}

export const EQ_PRESETS: Record<EqPresetKey, EqPreset> = {
  flat: {
    id: 'flat',
    label: 'フラット (Flat)',
    description: '補正なしの原音のままの周波数バランス',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: 0,
  },
  bass_boost: {
    id: 'bass_boost',
    label: '重低音ブースト (Bass Boost)',
    description: 'キックドラムとベースラインを強力に強調し迫力の重低音を実現',
    gains: [9, 7, 5, 3, 0, 0, 0, 1, 2, 3],
    bassBoost: 8,
  },
  vocal: {
    id: 'vocal',
    label: 'ボーカル強調 (Vocal)',
    description: '中高音域を持ち上げ、歌詞の聴き取りやすさと歌声の輪郭を際立たせる',
    gains: [-3, -2, 0, 2, 4, 6, 5, 3, 1, 0],
    bassBoost: 0,
  },
  acoustic: {
    id: 'acoustic',
    label: 'アコースティック (Acoustic)',
    description: '生楽器やギターの温かみと空気感を自然に再現',
    gains: [3, 3, 1, 1, 2, 3, 4, 4, 3, 2],
    bassBoost: 0,
  },
  rock: {
    id: 'rock',
    label: 'ロック (Rock)',
    description: '重いボトムと鮮明なハイエンドの王道V字カーブ',
    gains: [6, 4, 2, -1, -2, 0, 2, 4, 6, 6],
    bassBoost: 3,
  },
  club: {
    id: 'club',
    label: 'クラブ (Club)',
    description: 'フロアを揺らすサブベースとスナップ感のあるハイハット',
    gains: [8, 6, 4, 2, 0, 0, 2, 4, 5, 5],
    bassBoost: 5,
  },
  pop: {
    id: 'pop',
    label: 'ポップ (Pop)',
    description: '幅広いボーカル曲にマッチするバランスの良い明瞭なサウンド',
    gains: [-1, 1, 3, 4, 3, 2, 1, 2, 3, 3],
    bassBoost: 0,
  },
  electronic: {
    id: 'electronic',
    label: 'エレクトロニック (EDM)',
    description: 'シンセサイザーの倍音とタイトな重低音を両立',
    gains: [7, 6, 2, 0, -2, 2, 1, 3, 6, 7],
    bassBoost: 4,
  },
  custom: {
    id: 'custom',
    label: 'カスタム (Custom)',
    description: 'ユーザーが自由に調整した音質プロファイル',
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: 0,
  },
};

export interface EqualizerSettings {
  enabled: boolean;
  preset: EqPresetKey;
  gains: number[]; // 10 values
  bassBoost: number; // 0 to 12 dB
}

const STORAGE_KEY = 'yt_music_equalizer_v1';

class EqualizerService {
  private settings: EqualizerSettings;
  private audioCtx: AudioContext | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private bandFilters: BiquadFilterNode[] = [];
  private subBassOsc: OscillatorNode | null = null;
  private subBassGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private listeners: Set<(settings: EqualizerSettings) => void> = new Set();
  private isAudioPlaying: boolean = false;
  private simulatedFftBuffer: Uint8Array | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private connectedAudioEl: HTMLAudioElement | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): EqualizerSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.gains) && parsed.gains.length === 10) {
          return {
            enabled: parsed.enabled !== undefined ? !!parsed.enabled : true,
            preset: parsed.preset || 'flat',
            gains: parsed.gains.map((g: any) => Math.max(-12, Math.min(12, Number(g) || 0))),
            bassBoost: Math.max(0, Math.min(12, Number(parsed.bassBoost) || 0)),
          };
        }
      }
    } catch (e) {
      console.warn('[Equalizer] Failed to load settings from storage:', e);
    }

    return {
      enabled: true,
      preset: 'flat',
      gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: 0,
    };
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
    this.listeners.forEach((fn) => fn({ ...this.settings }));
  }

  public getSettings(): EqualizerSettings {
    return { ...this.settings, gains: [...this.settings.gains] };
  }

  public subscribe(fn: (settings: EqualizerSettings) => void): () => void {
    this.listeners.add(fn);
    fn(this.getSettings());
    return () => this.listeners.delete(fn);
  }

  // Initialize Web Audio graph
  public initAudioContext(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioCtx = new AudioCtx();

      // Master Gain Node
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Low-shelf Bass Boost filter at 65Hz
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.setValueAtTime(65, this.audioCtx.currentTime);
      this.bassFilter.gain.setValueAtTime(
        this.settings.enabled ? this.settings.bassBoost : 0,
        this.audioCtx.currentTime
      );

      // 10 Peaking Band Filters
      this.bandFilters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(freq, this.audioCtx!.currentTime);
        filter.Q.setValueAtTime(1.4, this.audioCtx!.currentTime);
        filter.gain.setValueAtTime(
          this.settings.enabled ? this.settings.gains[index] : 0,
          this.audioCtx!.currentTime
        );
        return filter;
      });

      // Analyser Node for Visualizer
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.82;

      // Chain the filters: Bass -> Band 0..9 -> Master Gain -> Analyser -> Destination
      let lastNode: AudioNode = this.bassFilter;
      for (const filter of this.bandFilters) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(this.masterGain);
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      // Sub-harmonic bass resonance generator
      this.initSubBassResonance();

      return this.audioCtx;
    } catch (e) {
      console.warn('[Equalizer] Failed to initialize Web Audio graph:', e);
      return null;
    }
  }

  private initSubBassResonance() {
    if (!this.audioCtx) return;
    try {
      if (!this.subBassGain) {
        this.subBassGain = this.audioCtx.createGain();
        this.subBassGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.subBassGain.connect(this.audioCtx.destination);
      }

      if (!this.subBassOsc) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(45, this.audioCtx.currentTime); // Deep resonant 45Hz sub-bass
        osc.connect(this.subBassGain);
        osc.start();
        this.subBassOsc = osc;
      }
      this.updateSubBassLevel();
    } catch {
      // ignore
    }
  }

  private updateSubBassLevel() {
    if (!this.subBassGain || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      if (this.settings.enabled && this.isAudioPlaying && this.settings.bassBoost > 0) {
        // Compute subtle acoustic harmonic resonance (max 0.04 to prevent clipping)
        const target = (this.settings.bassBoost / 12) * 0.035;
        this.subBassGain.gain.cancelScheduledValues(now);
        this.subBassGain.gain.linearRampToValueAtTime(target, now + 0.1);
      } else {
        this.subBassGain.gain.cancelScheduledValues(now);
        this.subBassGain.gain.linearRampToValueAtTime(0.00001, now + 0.1);
      }
    } catch {
      // ignore
    }
  }

  public notifyPlaybackState(isPlaying: boolean) {
    this.isAudioPlaying = isPlaying;
    if (this.audioCtx && this.audioCtx.state === 'suspended' && isPlaying) {
      this.audioCtx.resume().catch(() => {});
    }
    this.updateSubBassLevel();
  }

  public applyToAudioNodes() {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const isEnabled = this.settings.enabled;

    // Apply Bass Boost gain
    if (this.bassFilter) {
      const targetBass = isEnabled ? this.settings.bassBoost : 0;
      this.bassFilter.gain.cancelScheduledValues(now);
      this.bassFilter.gain.linearRampToValueAtTime(targetBass, now + 0.05);
    }

    // Apply 10 Bands
    this.bandFilters.forEach((filter, index) => {
      const targetGain = isEnabled ? this.settings.gains[index] : 0;
      filter.gain.cancelScheduledValues(now);
      filter.gain.linearRampToValueAtTime(targetGain, now + 0.05);
    });

    this.updateSubBassLevel();
  }

  // Connect native HTML5 audio element (for local MP3/audio files) into Web Audio graph
  public connectLocalAudio(audioEl: HTMLAudioElement) {
    if (!audioEl || this.connectedAudioEl === audioEl) return;
    this.initAudioContext();
    if (!this.audioCtx || !this.bassFilter) return;

    try {
      this.connectedAudioEl = audioEl;
      if (!this.mediaElementSource) {
        this.mediaElementSource = this.audioCtx.createMediaElementSource(audioEl);
        this.mediaElementSource.connect(this.bassFilter);
      }
    } catch (e) {
      console.warn('[Equalizer] Note: media element source already connected or blocked:', e);
    }
  }

  public getFrequencyData(binCount = 64): Uint8Array {
    if (!this.simulatedFftBuffer || this.simulatedFftBuffer.length !== binCount) {
      this.simulatedFftBuffer = new Uint8Array(binCount);
    }

    if (!this.isAudioPlaying) {
      this.simulatedFftBuffer.fill(0);
      return this.simulatedFftBuffer;
    }

    const t = performance.now() * 0.003;
    const bassFactor = this.settings.enabled ? 1 + this.settings.bassBoost * 0.08 : 1;

    for (let i = 0; i < binCount; i++) {
      const freqRatio = i / binCount;
      // High-resolution multi-harmonic audio frequency simulation
      const wave1 = Math.sin(t * 4 + i * 0.25) * 0.5 + 0.5;
      const wave2 = Math.cos(t * 7 - i * 0.4) * 0.5 + 0.5;
      const wave3 = Math.sin(t * 11 + i * 0.8) * 0.5 + 0.5;
      const beatPulse = Math.pow(Math.sin(t * 2.2), 6) * (i < 12 ? 1.4 : 0.6);

      // Low frequencies have higher energy
      const baseEnergy = Math.max(0.1, 1 - freqRatio * 0.65);
      const composite = (wave1 * 0.4 + wave2 * 0.35 + wave3 * 0.25 + beatPulse) * baseEnergy;

      let val = composite * 220;
      if (i < 8) val *= bassFactor;

      // Add mild noise jitter for organic sound spectrum
      val += (Math.random() - 0.5) * 14;
      this.simulatedFftBuffer[i] = Math.max(0, Math.min(255, Math.round(val)));
    }

    return this.simulatedFftBuffer;
  }

  public setEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    this.applyToAudioNodes();
    this.saveSettings();
  }

  public setPreset(key: EqPresetKey) {
    if (key === 'custom') {
      this.settings.preset = 'custom';
      this.saveSettings();
      return;
    }

    const preset = EQ_PRESETS[key];
    if (!preset) return;

    this.settings.preset = key;
    this.settings.gains = [...preset.gains];
    this.settings.bassBoost = preset.bassBoost;
    this.applyToAudioNodes();
    this.saveSettings();
  }

  public setBandGain(bandIndex: number, gainDb: number) {
    if (bandIndex < 0 || bandIndex >= 10) return;
    const clamped = Math.max(-12, Math.min(12, Math.round(gainDb * 10) / 10));
    this.settings.gains[bandIndex] = clamped;
    this.settings.preset = 'custom';
    this.applyToAudioNodes();
    this.saveSettings();
  }

  public setBassBoost(valDb: number) {
    const clamped = Math.max(0, Math.min(12, Math.round(valDb * 10) / 10));
    this.settings.bassBoost = clamped;
    this.settings.preset = 'custom';
    this.applyToAudioNodes();
    this.saveSettings();
  }

  public resetToFlat() {
    this.setPreset('flat');
  }
}

export const equalizer = new EqualizerService();
