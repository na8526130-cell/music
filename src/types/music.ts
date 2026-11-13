export interface YouTubeCommentSample {
  author: string;
  text: string;
  likes: string;
  likesNum?: number;
  matchedEmotions?: string[];
}

export interface CommentEmotionData {
  videoId: string;
  dominantMood: string;
  dominantMoodName: string;
  emotionScores: Record<string, number>;
  emotionTags: string[];
  summary: string;
  sampleComments: YouTubeCommentSample[];
  analyzedCount: number;
  source?: string;
}

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
  isLocal?: boolean;
  audioUrl?: string;
  commentEmotion?: CommentEmotionData;
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

export interface OriconTrack extends Track {
  rank: number;
  metric?: string;
  rankType?: 'streaming' | 'digital';
}

export interface ExploreData {
  trending: Track[];
  newReleases: Album[];
  moodsAndGenres: { title: string; params: string }[];
  musicVideos: Track[];
  oriconRanking?: OriconTrack[];
  oriconDigital?: OriconTrack[];
}

export interface TrackTimestampItem {
  timeSeconds: number;
  timeLabel: string;
  label: string;
  source: 'description' | 'comment';
  author?: string;
  likes?: string;
  likesNum?: number;
}

export interface HeatMarker {
  timeSeconds: number;
  timeLabel: string;
  percent: number;
  heat: number; // 0..1
  mentions: number;
  topLabel: string;
}

export interface TrackTimestampsData {
  videoId: string;
  durationSeconds: number;
  timestamps: TrackTimestampItem[];
  heatMarkers: HeatMarker[];
  highlightStartSec: number;
  highlightLabel?: string;
  totalCommentTimestamps: number;
}

export interface ArtistLiveSetlist {
  id: string;
  title: string;
  sourceTitle: string;
  sourceVideoId?: string;
  sourcePlaylistId?: string;
  sourceType: 'live-video' | 'playlist';
  thumbnail: string;
  tracks: (Track & { setlistIndex: number; timestampSec?: number })[];
}

export type ViewType = 'home' | 'search' | 'library' | 'artist' | 'album' | 'playlist' | 'party';
export type PlayerMode = 'cover' | 'video';
export type VideoLayout = 'theater' | 'pip';
export type RepeatMode = 'off' | 'all' | 'one';
