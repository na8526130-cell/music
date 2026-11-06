import { Track } from '../types/music';

export interface LocalAudioMetadata {
  title: string;
  artist: string;
  durationSeconds: number;
  duration: string;
  fileUrl: string;
  fileName: string;
}

export async function parseLocalAudioFile(file: File): Promise<Track> {
  const fileUrl = URL.createObjectURL(file);
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
    const audio = new Audio(fileUrl);
    audio.onloadedmetadata = () => {
      resolve(Math.round(audio.duration || 180));
    };
    audio.onerror = () => {
      resolve(180);
    };
  });

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const track: Track = {
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    artist,
    album: 'マイ・ローカル音源',
    duration: durationText,
    durationSeconds,
    thumbnail:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop&crop=faces',
    isLocal: true,
    audioUrl: fileUrl,
  };

  return track;
}
