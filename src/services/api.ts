import { Track, Album, Artist, Playlist, LyricsData, ExploreData, InnerTubeLog } from '../types/music';

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
};

