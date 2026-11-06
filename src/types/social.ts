import { Track } from './music';

export interface TrackComment {
  id: string;
  videoId: string;
  timestampSec: number;
  formattedTime: string;
  text: string;
  username: string;
  userAvatar?: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  color?: string; // Danmaku color e.g. '#FFFFFF', '#EF4444', '#38BDF8', '#FACC15', '#4ADE80', '#F472B6'
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  sender: string;
  recipient: string;
  content?: string;
  trackCard?: {
    videoId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration?: string;
  };
  playlistCard?: {
    id: string;
    name: string;
    author: string;
    trackCount: number;
    thumbnail?: string;
    tracks: Track[];
  };
  timestamp: string;
  read: boolean;
  reactions: Record<string, string[]>; // { '❤️': ['user1'], '🔥': ['user2'] }
}

export interface ConversationSummary {
  withUser: string;
  lastMessage: DirectMessage;
  unreadCount: number;
  isOnline: boolean;
  nowPlaying?: {
    title: string;
    artist: string;
    videoId: string;
  };
}

export interface ListeningPartyRoom {
  id: string;
  name: string;
  description: string;
  category: 'rock' | 'chill' | 'vocaloid' | 'free' | 'custom';
  hostUsername: string;
  currentTrack: Track | null;
  isPlaying: boolean;
  positionSec: number;
  updatedAt: number;
  participants: {
    username: string;
    joinedAt: string;
    isHost: boolean;
    nowPlaying?: string;
  }[];
  chatMessages: {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    type: 'chat' | 'system' | 'track_change';
  }[];
}

export interface SocialNotification {
  id: string;
  recipient: string;
  sender: string;
  type: 'dm' | 'comment_like' | 'room_invite' | 'follow' | 'broadcast';
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface ActivityFeedItem {
  id: string;
  username: string;
  action: 'played' | 'commented' | 'created_playlist' | 'liked';
  targetTitle: string;
  targetSubtitle?: string;
  targetId?: string;
  thumbnail?: string;
  timestamp: string;
}

export interface ModerationReport {
  id: string;
  reporter: string;
  reportedUser: string;
  targetType: 'comment' | 'message' | 'room';
  targetId: string;
  reason: string;
  contentSnippet?: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}
