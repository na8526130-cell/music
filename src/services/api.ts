import { Track, Album, Artist, Playlist, LyricsData, ExploreData, InnerTubeLog, OriconTrack } from '../types/music';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getExplore(): Promise<ExploreData> {
    const res = await fetch('/api/music/explore');
    if (!res.ok) throw new Error('Failed to fetch explore');
    return res.json();
  },

  async getOriconRanking(type: 'streaming' | 'digital' = 'streaming'): Promise<OriconTrack[]> {
    try {
      const res = await fetch(`/api/music/oricon?type=${type}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch {
      return [];
    }
  },

  async getSuggestions(query: string): Promise<string[]> {
    if (!query) return [];
    try {
      const res = await fetch(`/api/music/suggestions?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return [];
    }
  },

  async search(query: string, type: 'all' | 'song' | 'video' | 'album' | 'artist' | 'playlist' = 'all') {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&type=${type}`);
    if (!res.ok) throw new Error('Failed to execute search');
    return res.json();
  },

  async searchSpotify(query: string): Promise<{ tracks: Track[]; query: string; originalQuery?: string; matchedAlias?: string }> {
    try {
      const res = await fetch(`/api/music/spotify/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return { tracks: [], query };
      return res.json();
    } catch {
      return { tracks: [], query };
    }
  },

  async getSpotifyCurated(): Promise<{
    playlists: {
      id: string;
      spotifyId: string;
      title: string;
      tagline: string;
      category: string;
      thumbnail: string;
      trackCount: number;
    }[];
  }> {
    try {
      const res = await fetch('/api/music/spotify/curated');
      if (!res.ok) return { playlists: [] };
      return res.json();
    } catch {
      return { playlists: [] };
    }
  },

  async getSpotifyCuratedPlaylist(id: string): Promise<{
    id: string;
    spotifyId: string;
    title: string;
    tagline: string;
    thumbnail: string;
    tracks: Track[];
    totalTracks: number;
  } | null> {
    try {
      const res = await fetch(`/api/music/spotify/curated/${id}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async getLyrics(
    videoId: string,
    title?: string,
    artist?: string,
    duration?: number
  ): Promise<LyricsData> {
    try {
      const params = new URLSearchParams();
      if (title) params.append('title', title);
      if (artist) params.append('artist', artist);
      if (duration) params.append('duration', String(duration));
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/music/lyrics/${videoId}${queryStr}`);
      if (!res.ok) return { available: false, isSynced: false, lyrics: '' };
      return res.json();
    } catch (err: any) {
      return { available: false, isSynced: false, lyrics: '', error: err.message };
    }
  },

  async getRelated(videoId: string): Promise<Track[]> {
    try {
      const res = await fetch(`/api/music/related/${videoId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.related || [];
    } catch {
      return [];
    }
  },

  async getArtist(artistId: string): Promise<{
    header: Artist;
    topSongs: Track[];
    albums: Album[];
    singles: Album[];
  }> {
    const res = await fetch(`/api/music/artist/${artistId}`);
    if (!res.ok) throw new Error('Failed to fetch artist');
    return res.json();
  },

  async getAlbum(albumId: string): Promise<{
    header: Album;
    tracks: (Track & { index: number })[];
  }> {
    const res = await fetch(`/api/music/album/${albumId}`);
    if (!res.ok) throw new Error('Failed to fetch album');
    return res.json();
  },

  async getPlaylist(playlistId: string): Promise<{
    header: Playlist;
    tracks: (Track & { index: number })[];
  }> {
    const res = await fetch(`/api/music/playlist/${playlistId}`);
    if (!res.ok) throw new Error('Failed to fetch playlist');
    return res.json();
  },

  async getInnerTubeLogs(): Promise<{ logs: InnerTubeLog[] }> {
    const res = await fetch('/api/innertube/logs');
    if (!res.ok) return { logs: [] };
    return res.json();
  },

  async executeInnerTube(body: { action: string; query?: string; id?: string; type?: string }) {
    const res = await fetch('/api/music/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async getHigedanSpotlight(): Promise<{
    artist: string;
    tagline: string;
    songs: Track[];
  }> {
    const res = await fetch('/api/music/featured/higedan');
    if (!res.ok) throw new Error('Failed to fetch Higedan spotlight');
    return res.json();
  },

  async importPlaylist(url: string): Promise<{
    title: string;
    author: string;
    thumbnail: string;
    tracks: Track[];
    source: string;
  }> {
    const res = await fetch('/api/music/playlist/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'プレイリストのインポートに失敗しました');
    }
    return res.json();
  },

  async searchLyrics(query: string): Promise<any[]> {
    const res = await fetch(`/api/music/lyrics/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  },

  async getImageBase64(url: string): Promise<string> {
    try {
      const res = await fetch(`/api/proxy/image?url=${encodeURIComponent(url)}&format=base64`);
      if (!res.ok) return url;
      const data = await res.json();
      return data.base64 || url;
    } catch {
      return url;
    }
  },

  async getStats(): Promise<{ totalAccessCount: number; totalAccountsCount: number; onlineCount: number }> {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return { totalAccessCount: 1, totalAccountsCount: 0, onlineCount: 1 };
      return res.json();
    } catch {
      return { totalAccessCount: 1, totalAccountsCount: 0, onlineCount: 1 };
    }
  },

  async recordVisit(): Promise<{ totalAccessCount: number; totalAccountsCount: number; onlineCount: number }> {
    try {
      const res = await fetch('/api/stats/visit', { method: 'POST' });
      if (!res.ok) return { totalAccessCount: 1, totalAccountsCount: 0, onlineCount: 1 };
      return res.json();
    } catch {
      return { totalAccessCount: 1, totalAccountsCount: 0, onlineCount: 1 };
    }
  },

  // Real-time Presence API
  async sendPresenceHeartbeat(sessionId: string, username?: string): Promise<{ onlineCount: number; sessionId: string }> {
    try {
      const res = await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, username }),
      });
      if (!res.ok) return { onlineCount: 1, sessionId };
      return res.json();
    } catch {
      return { onlineCount: 1, sessionId };
    }
  },

  sendPresenceLeave(sessionId: string) {
    try {
      const payload = JSON.stringify({ sessionId });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/presence/leave', blob);
      } else {
        fetch('/api/presence/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  },

  async getOnlinePresence(): Promise<{ onlineCount: number; activeSessions: any[] }> {
    try {
      const res = await fetch('/api/presence/online');
      if (!res.ok) return { onlineCount: 1, activeSessions: [] };
      return res.json();
    } catch {
      return { onlineCount: 1, activeSessions: [] };
    }
  },

  async getAccountProfile(username: string) {
    const res = await fetch(`/api/account/profile?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async registerAccount(data: {
    username: string;
    password: string;
    email?: string;
    playlists?: any[];
  }) {
    const res = await fetch('/api/account/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '登録に失敗しました');
    }
    return res.json();
  },

  async loginAccount(data: { identifier: string; password: string }) {
    const res = await fetch('/api/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ログインに失敗しました');
    }
    return res.json();
  },

  async syncAccountPlaylists(username: string, playlists: any[]) {
    const res = await fetch('/api/account/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, playlists }),
    });
    return res.json();
  },

  async sendNotification(data: {
    username?: string;
    email?: string;
    subject?: string;
    body?: string;
    type?: string;
  }) {
    const res = await fetch('/api/account/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '通知送信に失敗しました');
    }
    return res.json();
  },

  async getAccountNotifications(query: string) {
    const res = await fetch(`/api/account/notifications?username=${encodeURIComponent(query)}`);
    if (!res.ok) return { notifications: [] };
    return res.json();
  },

  // Admin Master API methods (Password: @zeromusic)
  async adminLogin(password: string) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '管理者パスワードが正しくありません');
    }
    return res.json();
  },

  async getAdminOverview() {
    const res = await fetch('/api/admin/overview');
    if (!res.ok) throw new Error('管理者情報の取得に失敗しました');
    return res.json();
  },

  async deleteUser(username: string) {
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ユーザー削除に失敗しました');
    }
    return res.json();
  },

  async resetUserPassword(username: string, newPassword: string) {
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'パスワードリセットに失敗しました');
    }
    return res.json();
  },

  // Telemetry & Real Usage Analytics
  async recordPlaybackTelemetry(data: {
    videoId: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
    durationSeconds?: number;
  }) {
    fetch('/api/telemetry/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  },

  async recordSearchTelemetry(query: string) {
    fetch('/api/telemetry/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }).catch(() => {});
  },

  async recordLyricsTelemetry(data: { isSynced: boolean; isAvailable: boolean }) {
    fetch('/api/telemetry/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  },

  async recordErrorTelemetry(data: { videoId?: string; title?: string; error: string }) {
    fetch('/api/telemetry/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  },

  async setTrackOffset(data: { videoId: string; offsetSec: number; title?: string; remove?: boolean }) {
    const res = await fetch('/api/admin/track-offset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'オフセット設定に失敗しました');
    }
    return res.json();
  },

  async getTrackOffsets() {
    const res = await fetch('/api/track-offsets');
    if (!res.ok) return { trackOffsets: {} };
    return res.json();
  },

  async broadcastNotification(subject: string, body: string) {
    const res = await fetch('/api/admin/broadcast-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '一斉配信に失敗しました');
    }
    return res.json();
  },

  async clearLyricsCache() {
    const res = await fetch('/api/admin/cache/clear', { method: 'POST' });
    if (!res.ok) throw new Error('キャッシュ消去に失敗しました');
    return res.json();
  },

  async getTrack(videoId: string): Promise<{ track: Track }> {
    const res = await fetch(`/api/music/track/${videoId}`);
    if (!res.ok) throw new Error('楽曲の取得に失敗しました');
    return res.json();
  },

  async sharePlaylist(payload: { name: string; author?: string; tracks: Track[] }) {
    const res = await fetch('/api/share/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'プレイリストの共有に失敗しました');
    }
    return res.json();
  },

  async getSharedPlaylist(shareId: string): Promise<{
    playlist: {
      id: string;
      name: string;
      author?: string;
      tracks: Track[];
      createdAt: string;
      viewCount: number;
    };
  }> {
    const res = await fetch(`/api/share/playlist/${shareId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '共有プレイリストが見つかりません');
    }
    return res.json();
  },

  async getRecentSharedPlaylists() {
    const res = await fetch('/api/share/recent');
    if (!res.ok) return { playlists: [] };
    return res.json();
  },

  // --- Track Comments & Danmaku ---
  async getComments(videoId: string) {
    const res = await fetch(`/api/comments/${videoId}`);
    if (!res.ok) return { comments: [] };
    return res.json();
  },

  async postComment(
    videoId: string,
    payload: {
      text: string;
      timestampSec: number;
      formattedTime: string;
      username: string;
      color?: string;
      trackTitle?: string;
    }
  ) {
    const res = await fetch(`/api/comments/${videoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'コメントの投稿に失敗しました');
    }
    return res.json();
  },

  async likeComment(videoId: string, commentId: string, username: string) {
    const res = await fetch(`/api/comments/${videoId}/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error('いいねに失敗しました');
    return res.json();
  },

  async deleteComment(videoId: string, commentId: string, username: string, isAdmin?: boolean) {
    const res = await fetch(`/api/comments/${videoId}/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, isAdmin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'コメント削除に失敗しました');
    }
    return res.json();
  },

  // --- Direct Messaging (DM) ---
  async getConversations(username: string) {
    const res = await fetch(`/api/dm/conversations?username=${encodeURIComponent(username)}`);
    if (!res.ok) return { conversations: [] };
    return res.json();
  },

  async getMessages(user1: string, user2: string) {
    const res = await fetch(
      `/api/dm/messages?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
    );
    if (!res.ok) return { messages: [] };
    return res.json();
  },

  async sendDirectMessage(payload: {
    sender: string;
    recipient: string;
    content?: string;
    trackCard?: any;
    playlistCard?: any;
  }) {
    const res = await fetch('/api/dm/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'メッセージの送信に失敗しました');
    }
    return res.json();
  },

  async reactDirectMessage(messageId: string, emoji: string, username: string) {
    const res = await fetch('/api/dm/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji, username }),
    });
    return res.json();
  },

  async markDirectMessageRead(conversationId: string, reader: string, sender?: string) {
    const res = await fetch('/api/dm/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, reader, sender }),
    });
    return res.json();
  },

  // --- Listening Party & Lounges ---
  async getPartyRooms() {
    const res = await fetch('/api/party/rooms');
    if (!res.ok) return { rooms: [] };
    return res.json();
  },

  async createPartyRoom(payload: {
    name: string;
    description?: string;
    category?: string;
    hostUsername: string;
    initialTrack?: any;
  }) {
    const res = await fetch('/api/party/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'ルーム作成に失敗しました');
    }
    return res.json();
  },

  async getPartyRoom(roomId: string) {
    const res = await fetch(`/api/party/room/${roomId}`);
    if (!res.ok) throw new Error('ルームが見つかりません');
    return res.json();
  },

  // --- Social Notifications & Activity Feed ---
  async getSocialNotifications(username: string) {
    const res = await fetch(`/api/social/notifications?username=${encodeURIComponent(username)}`);
    if (!res.ok) return { notifications: [], unreadCount: 0 };
    return res.json();
  },

  async markSocialNotificationsRead(username: string) {
    const res = await fetch('/api/social/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  },

  async getActivityFeed() {
    const res = await fetch('/api/social/feed');
    if (!res.ok) return { feed: [] };
    return res.json();
  },

  async getSocialUsers() {
    const res = await fetch('/api/social/users');
    if (!res.ok) return { users: [] };
    return res.json();
  },

  async followUser(follower: string, targetUser: string) {
    const res = await fetch('/api/social/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower, targetUser }),
    });
    return res.json();
  },

  async blockUser(user: string, targetUser: string) {
    const res = await fetch('/api/social/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, targetUser }),
    });
    return res.json();
  },

  async unblockUser(user: string, targetUser: string) {
    const res = await fetch('/api/social/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, targetUser }),
    });
    return res.json();
  },

  async sendModerationReport(payload: {
    reporter: string;
    reportedUser: string;
    targetType: string;
    targetId: string;
    reason: string;
    contentSnippet?: string;
  }) {
    const res = await fetch('/api/social/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('通報の送信に失敗しました');
    return res.json();
  },

  // --- Admin Moderation & Community Control ---
  async getModerationOverview() {
    const res = await fetch('/api/admin/moderation/overview');
    if (!res.ok) throw new Error('モデレーション情報の取得に失敗しました');
    return res.json();
  },

  async resolveModerationReport(reportId: string, status: 'resolved' | 'dismissed') {
    const res = await fetch('/api/admin/moderation/resolve-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, status }),
    });
    return res.json();
  },

  async toggleBanUser(username: string) {
    const res = await fetch('/api/admin/moderation/toggle-ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  },

  // --- Admin All Direct Messages Inspection (全ユーザー間DM監視・監査) ---
  async getAdminAllDms() {
    const res = await fetch('/api/admin/dm/all');
    if (!res.ok) throw new Error('DMログの取得に失敗しました');
    return res.json();
  },

  async deleteAdminDmMessage(messageId: string) {
    const res = await fetch(`/api/admin/dm/message/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'メッセージの削除に失敗しました');
    }
    return res.json();
  },
};

