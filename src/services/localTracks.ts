import { Track } from '../types/music';
import { saveOfflineTrack } from './offlineStorage';

export interface LocalAudioMetadata {
  title: string;
  artist: string;
  durationSeconds: number;
  duration: string;
  fileUrl: string;
  fileName: string;
}

export async function parseLocalAudioFile(file: File): Promise<Track> {
  const tempUrl = URL.createObjectURL(file);
  const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

  let artist = 'ローカル音源';
  let title = fileNameWithoutExt;

  if (fileNameWithoutExt.includes(' - ')) {
    const parts = fileNameWithoutExt.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  // Get duration via Audio element
  const durationSeconds = await new Promise<number>((resolve) => {
    const audio = new Audio(tempUrl);
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration || 180));
    };
    audio.onerror = () => {
      resolve(180);
    };
  });

  try {
    URL.revokeObjectURL(tempUrl);
  } catch {}

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Persist directly to IndexedDB for permanent offline access
  return saveOfflineTrack(file, title, artist, 'マイ・ローカル音源', durationSeconds, durationText);
}
