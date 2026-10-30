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
};
