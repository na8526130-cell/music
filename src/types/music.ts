export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  duration?: string;
  durationSeconds?: number;
  thumbnail: string;
  views?: string;
}

export interface Artist {
  id: string;
  name: string;
  subscribers?: string;
  thumbnail: string;
  description?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: string;
  thumbnail: string;
  trackCount?: number;
}

export interface Playlist {
  id: string;
  title: string;
  author?: string;
  itemCount?: string;
  thumbnail: string;
}

export interface InnerTubeLog {
  id: string;
  timestamp: string;
  endpoint: string;
  params: any;
  durationMs: number;
  status: 'success' | 'error';
  itemCount?: number;
  error?: string;
  sampleResponse?: any;
}

export interface SyncedLine {
  time: number;
  text: string;
}

export interface LyricsData {
  available: boolean;
  isSynced: boolean;
  isApproximate?: boolean;
  syncedLyrics?: SyncedLine[];
  lyrics: string;
  footer?: string;
  source?: string;
  error?: string;
  globalOffset?: number;
}

export interface ExploreData {
  trending: Track[];
  newReleases: Album[];
  moodsAndGenres: { title: string; params: string }[];
  musicVideos: Track[];
}

export type ViewType = 'home' | 'search' | 'library' | 'artist' | 'album' | 'playlist';
export type PlayerMode = 'cover' | 'video';
export type RepeatMode = 'off' | 'all' | 'one';
