import { Track } from '../types/music';

const DB_NAME = 'ZeroMusicOfflineDB';
const DB_VERSION = 1;
const STORE_TRACKS = 'offline_tracks';
const STORE_META = 'cached_meta';

export interface StoredOfflineTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  blob: Blob;
  fileName?: string;
  fileType: string;
  addedAt: number;
}

// Active blob URLs cache to prevent memory leaks and reuse existing URLs
const activeBlobUrls = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

export function openOfflineDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save an audio file (File or Blob) to IndexedDB for offline playback
 */
export async function saveOfflineTrack(
  file: File | Blob,
  title: string,
  artist = 'ローカル音源',
  album = 'オフライン保存',
  durationSeconds = 180,
  durationText = '3:00'
): Promise<Track> {
  const db = await openOfflineDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileType = file.type || 'audio/mpeg';

  const stored: StoredOfflineTrack = {
    id,
    title,
    artist,
    album,
    duration: durationText,
    durationSeconds,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop&crop=faces',
    blob: file,
    fileName: file instanceof File ? file.name : `${title}.mp3`,
    fileType,
    addedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.put(stored);

    req.onsuccess = () => {
      // Create active blob URL
      const audioUrl = URL.createObjectURL(file);
      activeBlobUrls.set(id, audioUrl);

      resolve({
        id: stored.id,
        title: stored.title,
        artist: stored.artist,
        album: stored.album,
        duration: stored.duration,
        durationSeconds: stored.durationSeconds,
        thumbnail: stored.thumbnail,
        isLocal: true,
        audioUrl,
      });
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all offline tracks stored in IndexedDB
 */
export async function getAllOfflineTracks(): Promise<Track[]> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_TRACKS], 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as StoredOfflineTrack[];
        const tracks: Track[] = (results || []).map((s) => {
          let audioUrl = activeBlobUrls.get(s.id);
          if (!audioUrl) {
            try {
              audioUrl = URL.createObjectURL(s.blob);
              activeBlobUrls.set(s.id, audioUrl);
            } catch {
              audioUrl = '';
            }
          }

          return {
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            duration: s.duration,
            durationSeconds: s.durationSeconds,
            thumbnail: s.thumbnail,
            isLocal: true,
            audioUrl,
          };
        });
        resolve(tracks);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Error fetching offline tracks:', err);
    return [];
  }
}

/**
 * Prepare an offline track for active playback, ensuring an active blob URL exists
 */
export async function getPlayableOfflineTrack(track: Track): Promise<Track> {
  if (!track.isLocal) return track;
  if (track.audioUrl && activeBlobUrls.has(track.id)) {
    return track;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_TRACKS], 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.get(track.id);

      req.onsuccess = () => {
        const item = req.result as StoredOfflineTrack;
        if (item && item.blob) {
          const url = URL.createObjectURL(item.blob);
          activeBlobUrls.set(track.id, url);
          resolve({ ...track, audioUrl: url });
        } else {
          resolve(track);
        }
      };

      req.onerror = () => resolve(track);
    });
  } catch {
    return track;
  }
}

/**
 * Delete a track from IndexedDB offline storage
 */
export async function deleteOfflineTrack(id: string): Promise<void> {
  const db = await openOfflineDB();
  if (activeBlobUrls.has(id)) {
    try {
      URL.revokeObjectURL(activeBlobUrls.get(id)!);
    } catch {}
    activeBlobUrls.delete(id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persistent metadata cache in IndexedDB (for explore feeds, chart backups, lyrics)
 */
export async function saveOfflineMeta(key: string, data: any): Promise<void> {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction([STORE_META], 'readwrite');
    const store = tx.objectStore(STORE_META);
    store.put({ key, data, updatedAt: Date.now() });
  } catch (err) {
    console.warn('[OfflineDB] Failed to save meta:', key, err);
  }
}

export async function getOfflineMeta<T>(key: string): Promise<T | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_META], 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Generate a clean, synthesized 16-bit 44.1kHz stereo Lofi Chill Loop in pure WAV format
 * Allows instant offline testing without needing external audio files.
 */
export function generateLofiWavBlob(): Blob {
  const sampleRate = 44100;
  const durationSec = 14;
  const numChannels = 2;
  const numSamples = sampleRate * durationSec;
  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Synthesize musical progression (Chords: Dm9 -> G13 -> Cmaj9 -> Am7)
  const chordFreqs = [
    [146.83, 220.0, 261.63, 329.63], // Dm9
    [196.0, 246.94, 329.63, 392.0],  // G13
    [130.81, 196.0, 246.94, 329.63], // Cmaj9
    [220.0, 261.63, 329.63, 392.0],  // Am7
  ];

  let offset = 44;
  const chordDuration = durationSec / 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIndex = Math.floor(t / chordDuration) % chordFreqs.length;
    const currentChord = chordFreqs[chordIndex];
    const chordTime = t % chordDuration;

    // Soft envelope for mellow electric piano / pad feel
    const env = Math.sin((chordTime / chordDuration) * Math.PI) * 0.45;

    let sampleL = 0;
    let sampleR = 0;

    // Harmonic sum
    for (let c = 0; c < currentChord.length; c++) {
      const freq = currentChord[c];
      const tone = Math.sin(2 * Math.PI * freq * t) * 0.35 +
                   Math.sin(4 * Math.PI * freq * t) * 0.12;
      const pan = (c / (currentChord.length - 1)) * 0.4 - 0.2; // subtle stereo width
      sampleL += tone * env * (0.5 - pan);
      sampleR += tone * env * (0.5 + pan);
    }

    // Warm sub-bass pulse
    const bassFreq = currentChord[0] / 2;
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.35 * env;
    sampleL += bass;
    sampleR += bass;

    // Gentle vinyl lofi crackle / noise
    const crackle = (Math.random() * 2 - 1) * 0.008;
    sampleL += crackle;
    sampleR += crackle;

    // Clamping & 16-bit PCM conversion
    const intSampleL = Math.max(-1, Math.min(1, sampleL)) * 32767;
    const intSampleR = Math.max(-1, Math.min(1, sampleR)) * 32767;

    view.setInt16(offset, intSampleL, true);
    view.setInt16(offset + 2, intSampleR, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Seed a demo offline track so users can test offline playback immediately
 */
export async function seedDemoOfflineTrack(): Promise<Track> {
  const wavBlob = generateLofiWavBlob();
  return saveOfflineTrack(
    wavBlob,
    'Midnight Tokyo (オフライン試聴デモ)',
    'Zero Music Audio Lab',
    'オフライン・パック Vol.1',
    14,
    '0:14'
  );
}
