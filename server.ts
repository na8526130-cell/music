import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Innertube, UniversalCache } from 'youtubei.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory logger for InnerTube API calls
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

const apiLogs: InnerTubeLog[] = [];

function recordLog(log: Omit<InnerTubeLog, 'id' | 'timestamp'>) {
  const entry: InnerTubeLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  apiLogs.unshift(entry);
  if (apiLogs.length > 60) {
    apiLogs.pop();
  }
  return entry;
}

let innertubeInstance: Innertube | null = null;
let initPromise: Promise<Innertube> | null = null;

async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) return innertubeInstance;
  if (!initPromise) {
    initPromise = (async () => {
      console.log('[InnerTube] Initializing YouTube InnerTube client...');
      const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
      });
      console.log('[InnerTube] YouTube InnerTube client ready.');
      innertubeInstance = yt;
      return yt;
    })().catch((err) => {
      initPromise = null;
      console.error('[InnerTube] Initialization error:', err);
      throw err;
    });
  }
  return initPromise;
}

// Helpers to extract clean thumbnails
function getBestThumbnail(thumbnails: any[]): string {
  if (!thumbnails || !thumbnails.length) return '';
  const last = thumbnails[thumbnails.length - 1];
  return last?.url || thumbnails[0]?.url || '';
}

// Format duration in seconds
function parseDurationToSeconds(durationText: string): number {
  if (!durationText) return 0;
  const parts = durationText.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', async (_req, res) => {
    try {
      const yt = await getInnertube();
      res.json({
        status: 'ok',
        innertubeReady: !!yt,
        version: 'youtubei.js v18.3.0',
        cachedLogsCount: apiLogs.length,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // InnerTube API Call Logs
  app.get('/api/innertube/logs', (_req, res) => {
    res.json({ logs: apiLogs });
  });

  // Direct InnerTube Execution Tester (for developers to inspect raw InnerTube responses)
  app.post('/api/innertube/execute', async (req, res) => {
    const startTime = Date.now();
    const { action, query, id, type } = req.body;
    try {
      const yt = await getInnertube();
      let result: any = null;

      if (action === 'music.search') {
        result = await yt.music.search(query || '', { type: type || 'song' });
      } else if (action === 'music.getLyrics') {
        result = await yt.music.getLyrics(id || '');
      } else if (action === 'music.getRelated') {
        result = await yt.music.getRelated(id || '');
      } else if (action === 'music.getArtist') {
        result = await yt.music.getArtist(id || '');
      } else if (action === 'music.getAlbum') {
        result = await yt.music.getAlbum(id || '');
      } else if (action === 'music.getPlaylist') {
        result = await yt.music.getPlaylist(id || '');
      } else if (action === 'music.getExplore') {
        result = await yt.music.getExplore();
      } else if (action === 'getSearchSuggestions') {
        result = await yt.getSearchSuggestions(query || '');
      } else {
        return res.status(400).json({ error: `Unsupported InnerTube action: ${action}` });
      }

      const durationMs = Date.now() - startTime;
      recordLog({
        endpoint: action,
        params: { query, id, type },
        durationMs,
        status: 'success',
        sampleResponse: result,
      });

      res.json({ success: true, durationMs, data: result });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      recordLog({
        endpoint: action || 'unknown',
        params: req.body,
        durationMs,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Explore: Home feed, Trending, New Releases, Moods & Genres
  app.get('/api/music/explore', async (_req, res) => {
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const explore = await yt.music.getExplore();

      const trendingSongs: any[] = [];
      const newReleases: any[] = [];
      const moodsAndGenres: any[] = [];
      const musicVideos: any[] = [];

      for (const section of (explore as any).sections || []) {
        const title = (section.header?.title?.toString?.() || section.title?.toString?.() || '').toLowerCase();
        const rawItems = section.contents || [];

        if (title.includes('trending') || title.includes('急上昇')) {
          for (const item of rawItems) {
            trendingSongs.push({
              id: item.id || item.video_id,
              title: item.title?.toString?.() || 'Unknown Title',
              artist: (item.artists && item.artists[0]?.name) || item.author?.name || 'Unknown Artist',
              artistId: (item.artists && item.artists[0]?.id) || item.author?.id,
              album: item.album?.name,
              albumId: item.album?.id,
              duration: item.duration?.text || '',
              durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
              views: item.views?.text || '',
            });
          }
        } else if (title.includes('new') || title.includes('albums') || title.includes('新着') || title.includes('リリース')) {
          for (const item of rawItems) {
            newReleases.push({
              id: item.id,
              title: item.title?.toString?.() || 'Unknown Title',
              artist: (item.artists && item.artists[0]?.name) || item.author?.name || 'Unknown Artist',
              artistId: (item.artists && item.artists[0]?.id) || item.author?.id,
              year: item.year || '',
              type: item.item_type || 'Album',
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        } else if (title.includes('mood') || title.includes('genre') || title.includes('気分') || title.includes('ジャンル')) {
          for (const item of rawItems) {
            if (item.button_text) {
              moodsAndGenres.push({
                title: item.button_text?.toString?.() || 'Mood',
                params: item.endpoint?.payload?.params || '',
              });
            }
          }
        } else if (title.includes('video') || title.includes('動画')) {
          for (const item of rawItems) {
            musicVideos.push({
              id: item.id || item.video_id,
              title: item.title?.toString?.() || 'Unknown Video',
              artist: (item.artists && item.artists[0]?.name) || item.author?.name || 'Unknown Artist',
              views: item.views?.text || '',
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        }
      }

      // If trending is empty in explore, fetch a quick default search for trending hits
      if (trendingSongs.length === 0) {
        const fallbackSearch = await yt.music.search('J-POP ヒット チャート', { type: 'song' });
        for (const item of (fallbackSearch.songs?.contents || []).slice(0, 15)) {
          trendingSongs.push({
            id: item.id,
            title: (item as any).title?.toString?.() || 'Track',
            artist: (item as any).artists?.[0]?.name || 'Artist',
            artistId: (item as any).artists?.[0]?.id,
            album: (item as any).album?.name,
            duration: (item as any).duration?.text || '',
            durationSeconds: parseDurationToSeconds((item as any).duration?.text || ''),
            thumbnail: getBestThumbnail((item as any).thumbnails || []),
          });
        }
      }

      const durationMs = Date.now() - startTime;
      recordLog({
        endpoint: 'music.getExplore',
        params: {},
        durationMs,
        status: 'success',
        itemCount: trendingSongs.length + newReleases.length,
      });

      res.json({
        trending: trendingSongs,
        newReleases,
        moodsAndGenres: moodsAndGenres.slice(0, 16),
        musicVideos,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      recordLog({
        endpoint: 'music.getExplore',
        params: {},
        durationMs,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Search autocomplete suggestions
  app.get('/api/music/suggestions', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ suggestions: [] });
    }
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const suggestions = await yt.getSearchSuggestions(query);
      recordLog({
        endpoint: 'getSearchSuggestions',
        params: { query },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: suggestions?.length || 0,
      });
      res.json({ suggestions: suggestions || [] });
    } catch (err: any) {
      res.json({ suggestions: [] });
    }
  });

  // Search with filters (songs, videos, albums, artists, playlists)
  app.get('/api/music/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const type = (req.query.type as string) || 'all';
    if (!query) {
      return res.json({ results: [], type });
    }
    const startTime = Date.now();
    try {
      const yt = await getInnertube();

      if (type === 'all') {
        const [songRes, artistRes, albumRes, playlistRes, videoRes] = await Promise.all([
          yt.music.search(query, { type: 'song' }).catch(() => null),
          yt.music.search(query, { type: 'artist' }).catch(() => null),
          yt.music.search(query, { type: 'album' }).catch(() => null),
          yt.music.search(query, { type: 'playlist' }).catch(() => null),
          yt.music.search(query, { type: 'video' }).catch(() => null),
        ]);

        const songs = (songRes?.songs?.contents || []).slice(0, 10).map((item: any) => ({
          type: 'song',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || '',
          artistId: item.artists?.[0]?.id,
          album: item.album?.name || '',
          albumId: item.album?.id,
          duration: item.duration?.text || '',
          durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));

        const artists = (artistRes?.artists?.contents || []).slice(0, 6).map((item: any) => ({
          type: 'artist',
          id: item.id,
          name: item.name?.toString?.() || item.title?.toString?.() || '',
          subscribers: item.subscribers || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));

        const albums = (albumRes?.albums?.contents || []).slice(0, 6).map((item: any) => ({
          type: 'album',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || item.author?.name || '',
          year: item.year || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));

        const playlists = (playlistRes?.playlists?.contents || []).slice(0, 6).map((item: any) => ({
          type: 'playlist',
          id: item.id,
          title: item.title?.toString?.() || '',
          author: item.author?.name || item.author?.toString?.() || '',
          itemCount: item.item_count || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));

        const videos = (videoRes?.videos?.contents || []).slice(0, 6).map((item: any) => ({
          type: 'video',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || item.author?.name || '',
          views: item.views?.text || '',
          duration: item.duration?.text || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));

        recordLog({
          endpoint: 'music.search',
          params: { query, type: 'all' },
          durationMs: Date.now() - startTime,
          status: 'success',
          itemCount: songs.length + artists.length + albums.length + playlists.length + videos.length,
        });

        return res.json({
          songs,
          artists,
          albums,
          playlists,
          videos,
        });
      }

      // Filtered specific type
      const searchType = (['song', 'video', 'album', 'artist', 'playlist'].includes(type)
        ? type
        : 'song') as 'song' | 'video' | 'album' | 'artist' | 'playlist';

      const searchResult = await yt.music.search(query, { type: searchType });
      let formattedItems: any[] = [];

      if (searchType === 'song' && searchResult.songs?.contents) {
        formattedItems = searchResult.songs.contents.map((item: any) => ({
          type: 'song',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || '',
          artistId: item.artists?.[0]?.id,
          album: item.album?.name || '',
          albumId: item.album?.id,
          duration: item.duration?.text || '',
          durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));
      } else if (searchType === 'artist' && searchResult.artists?.contents) {
        formattedItems = searchResult.artists.contents.map((item: any) => ({
          type: 'artist',
          id: item.id,
          name: item.name?.toString?.() || item.title?.toString?.() || '',
          subscribers: item.subscribers || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));
      } else if (searchType === 'album' && searchResult.albums?.contents) {
        formattedItems = searchResult.albums.contents.map((item: any) => ({
          type: 'album',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || item.author?.name || '',
          year: item.year || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));
      } else if (searchType === 'playlist' && searchResult.playlists?.contents) {
        formattedItems = searchResult.playlists.contents.map((item: any) => ({
          type: 'playlist',
          id: item.id,
          title: item.title?.toString?.() || '',
          author: item.author?.name || '',
          itemCount: item.item_count || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));
      } else if (searchType === 'video' && searchResult.videos?.contents) {
        formattedItems = searchResult.videos.contents.map((item: any) => ({
          type: 'video',
          id: item.id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || item.author?.name || '',
          views: item.views?.text || '',
          duration: item.duration?.text || '',
          thumbnail: getBestThumbnail(item.thumbnails || []),
        }));
      }

      recordLog({
        endpoint: `music.search[${searchType}]`,
        params: { query, type: searchType },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: formattedItems.length,
      });

      res.json({ results: formattedItems, type: searchType });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.search',
        params: { query, type },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to clean track titles for high-precision metadata and lyrics matching
  function cleanTrackTitle(rawTitle: string, artistName: string): string {
    let t = rawTitle;
    // Normalize full-width brackets
    t = t.replace(/（/g, '(').replace(/）/g, ')').replace(/［/g, '[').replace(/］/g, ']');
    // Remove Japanese brackets: 【...】, 「...」, 『...』
    t = t.replace(/【.*?】/g, ' ').replace(/「(.*?)」/g, '$1').replace(/『(.*?)』/g, '$1');
    // Remove typical YouTube video tags, tie-ins, and descriptions in brackets or parentheses
    t = t.replace(
      /\s*\([^)]*(?:MV|music video|official|audio|ver\.|version|feat|ft\.|live|remaster|主題歌|テーマ|エンディング|オープニング|アニメ|劇|映画|LIVE|配信|先行)[^)]*\)\s*/gi,
      ' '
    );
    t = t.replace(
      /\s*\[[^\]]*(?:MV|music video|official|audio|ver\.|version|feat|ft\.|live|remaster|主題歌|テーマ|エンディング|オープニング|アニメ|劇|映画|LIVE|配信|先行)[^\]]*\]\s*/gi,
      ' '
    );
    // Remove leading/trailing artist if formatted like "Artist - Title" or "Title / Artist"
    if (artistName) {
      const escapedArtist = artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp(`^${escapedArtist}\\s*[-–—:/]\\s*`, 'i'), '');
      t = t.replace(new RegExp(`\\s*[-–—:/]\\s*${escapedArtist}$`, 'i'), '');
    }
    // Remove romaji sub-titles like "Japanese - Romaji"
    t = t.replace(/\s*-\s*[a-zA-Z\s]{4,}$/, '');
    // Remove quotes and trailing single/ep
    t = t.replace(/["'“”]/g, '').replace(/\s*-\s*Single$/i, '').trim();
    return t || rawTitle;
  }

  // Helper to parse LRC timestamped lines (robust multitag & format support)
  function parseLrc(lrcText: string): { time: number; text: string }[] {
    const lines = lrcText.split('\n');
    const result: { time: number; text: string }[] = [];
    const lineRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Extract lyrics text stripped of all LRC timestamp tags
      const text = line.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
      if (!text) continue;

      let match;
      lineRegex.lastIndex = 0;
      while ((match = lineRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        let millis = 0;
        if (match[3]) {
          millis =
            match[3].length === 2
              ? parseInt(match[3], 10) * 10
              : parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        }
        const time = minutes * 60 + seconds + millis / 1000;
        result.push({ time, text });
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }

  // Helper to synthesize line timings when only plain text lyrics are available
  function synthesizeSyncedLyrics(
    plainText: string,
    totalDurationSeconds: number
  ): { time: number; text: string }[] {
    const rawLines = plainText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!rawLines.length) return [];

    const duration = totalDurationSeconds > 30 ? totalDurationSeconds : 210;
    // Intro instrumental estimation: ~5% to 8% of song duration (between 4s and 16s)
    const introTime = Math.min(16, Math.max(5, duration * 0.06));
    // Outro buffer
    const outroBuffer = Math.min(15, Math.max(8, duration * 0.05));
    const singingDuration = Math.max(20, duration - introTime - outroBuffer);

    // Weight each line by character count
    const weights = rawLines.map((l) => Math.max(3, l.replace(/\s+/g, '').length));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let currentTime = introTime;
    const synced: { time: number; text: string }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      synced.push({
        time: Math.round(currentTime * 100) / 100,
        text: rawLines[i],
      });
      const lineSpan = (weights[i] / totalWeight) * singingDuration;
      currentTime += lineSpan;
    }

    return synced;
  }

  // Image Proxy & Base64 Endpoint
  app.get('/api/proxy/image', async (req, res) => {
    const imageUrl = String(req.query.url || '').trim();
    const format = String(req.query.format || '');
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const imgRes = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://music.youtube.com/',
        },
      });

      if (!imgRes.ok) {
        return res.status(imgRes.status).send('Failed to fetch image');
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (format === 'base64') {
        const base64Data = `data:${contentType};base64,${buffer.toString('base64')}`;
        return res.json({ base64: base64Data, contentType });
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send('Image proxy error: ' + err.message);
    }
  });

  // Manual Lyrics Search endpoint for user override (must be before :id route)
  app.get('/api/music/lyrics/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    try {
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (searchRes.ok) {
        const list: any[] = await searchRes.json();
        const results = list.slice(0, 10).map((item) => ({
          id: item.id,
          trackName: item.trackName,
          artistName: item.artistName,
          albumName: item.albumName,
          duration: item.duration,
          isSynced: !!item.syncedLyrics,
          syncedLyrics: item.syncedLyrics ? parseLrc(item.syncedLyrics) : [],
          plainLyrics: item.plainLyrics || '',
        }));
        return res.json({ results });
      }
      res.json({ results: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Song lyrics via LRCLIB (synced) + YouTube Music InnerTube (official fallback)
  app.get('/api/music/lyrics/:id', async (req, res) => {
    const videoId = req.params.id;
    const rawTitle = String(req.query.title || '').trim();
    const rawArtist = String(req.query.artist || '').trim();
    const duration = Number(req.query.duration || 0);
    const startTime = Date.now();

    const cleanArtist = rawArtist.split(/[,&×/]|feat\.?/i)[0].trim();
    const cleanTitle = cleanTrackTitle(rawTitle, cleanArtist);

    let syncedLyrics: { time: number; text: string }[] = [];
    let plainLyrics = '';
    let footer = '';
    let source = '';
    let matchedTrackName = '';

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };

    // 1. Try LRCLIB for accurate synchronized lyrics
    if (cleanTitle) {
      try {
        // A. Direct exact match with duration
        let lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}${
          duration > 0 ? `&duration=${Math.round(duration)}` : ''
        }`;

        let lrcRes = await fetch(lrcUrl, { headers });
        if (!lrcRes.ok) {
          // B. Direct match without duration constraint
          lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
          lrcRes = await fetch(lrcUrl, { headers });
        }

        if (lrcRes.ok) {
          const lrcData: any = await lrcRes.json();
          if (lrcData.syncedLyrics) {
            syncedLyrics = parseLrc(lrcData.syncedLyrics);
            plainLyrics = lrcData.plainLyrics || syncedLyrics.map((l) => l.text).join('\n');
            source = 'LRCLIB (リアルタイム同期)';
            matchedTrackName = lrcData.trackName || cleanTitle;
          } else if (lrcData.plainLyrics) {
            plainLyrics = lrcData.plainLyrics;
            source = 'LRCLIB (テキスト)';
            matchedTrackName = lrcData.trackName || cleanTitle;
          }
        }

        // C. Filtered Search fallback if exact get returned 404
        if (!plainLyrics && !syncedLyrics.length) {
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`;
          const searchRes = await fetch(searchUrl, { headers });
          if (searchRes.ok) {
            const list: any[] = await searchRes.json();
            // Verify candidate matches title and duration (+/- 15s)
            const cleanTitleNorm = cleanTitle.toLowerCase().replace(/[\s\-_]/g, '');
            const candidates = list.filter((item) => {
              if (!item.trackName) return false;
              const itemTitleNorm = item.trackName.toLowerCase().replace(/[\s\-_]/g, '');
              const titleMatches =
                cleanTitleNorm.includes(itemTitleNorm) ||
                itemTitleNorm.includes(cleanTitleNorm) ||
                (item.artistName && cleanArtist.toLowerCase().includes(item.artistName.toLowerCase()));

              if (!titleMatches) return false;

              // If duration known, ensure duration is within 15 seconds
              if (duration > 10 && item.duration > 10) {
                if (Math.abs(item.duration - duration) > 18) {
                  return false;
                }
              }
              return true;
            });

            const bestCandidate = candidates.find((item) => item.syncedLyrics) || candidates[0];
            if (bestCandidate?.syncedLyrics) {
              syncedLyrics = parseLrc(bestCandidate.syncedLyrics);
              plainLyrics = bestCandidate.plainLyrics || syncedLyrics.map((l: any) => l.text).join('\n');
              source = 'LRCLIB (リアルタイム同期)';
              matchedTrackName = bestCandidate.trackName;
            } else if (bestCandidate?.plainLyrics) {
              plainLyrics = bestCandidate.plainLyrics;
              source = 'LRCLIB (テキスト)';
              matchedTrackName = bestCandidate.trackName;
            }
          }
        }
      } catch (err: any) {
        console.warn('[Lyrics] LRCLIB lookup failed:', err.message);
      }
    }

    // 2. Official YouTube Music InnerTube fallback (honest unsynced plain text)
    if (!plainLyrics && !syncedLyrics.length) {
      try {
        const yt = await getInnertube();
        const lyrics = await yt.music.getLyrics(videoId);
        plainLyrics = lyrics?.description?.text || '';
        footer = lyrics?.footer?.text || '';
        if (plainLyrics) {
          source = 'YouTube Music InnerTube (公式歌詞)';
        }
      } catch (err: any) {
        console.warn('[Lyrics] InnerTube lookup failed:', err.message);
      }
    }

    // 3. If we have plain text lyrics but no hardcoded LRC sync, synthesize line timings
    if (plainLyrics && syncedLyrics.length === 0) {
      syncedLyrics = synthesizeSyncedLyrics(plainLyrics, duration);
      if (syncedLyrics.length > 0) {
        source = source ? `${source} (自動同期)` : 'スマート自動同期';
      }
    }

    const hasSynced = syncedLyrics.length > 0;
    const durationMs = Date.now() - startTime;
    recordLog({
      endpoint: 'music.getLyrics',
      params: { videoId, title: rawTitle, artist: rawArtist, cleanTitle },
      durationMs,
      status: plainLyrics || hasSynced ? 'success' : 'error',
      sampleResponse: {
        isSynced: hasSynced,
        syncedCount: syncedLyrics.length,
        source,
        matchedTrackName,
      },
    });

    res.json({
      available: !!plainLyrics || hasSynced,
      isSynced: hasSynced,
      syncedLyrics,
      lyrics: plainLyrics || syncedLyrics.map((l) => l.text).join('\n'),
      footer,
      source: source || (hasSynced ? '同期歌詞' : ''),
      matchedTrackName: matchedTrackName || cleanTitle,
    });
  });

  // Related songs for Up Next auto-queue
  app.get('/api/music/related/:id', async (req, res) => {
    const videoId = req.params.id;
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const related = await yt.music.getRelated(videoId);
      const items: any[] = [];

      for (const section of (related as any).sections || []) {
        for (const item of section.contents || []) {
          if (item.id || item.video_id) {
            items.push({
              id: item.id || item.video_id,
              title: item.title?.toString?.() || '',
              artist: item.artists?.[0]?.name || item.author?.name || '',
              artistId: item.artists?.[0]?.id || item.author?.id,
              album: item.album?.name,
              duration: item.duration?.text || '',
              durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        }
      }

      recordLog({
        endpoint: 'music.getRelated',
        params: { videoId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: items.length,
      });

      res.json({ related: items.slice(0, 20) });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getRelated',
        params: { videoId },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.json({ related: [] });
    }
  });

  // Artist profile details
  app.get('/api/music/artist/:id', async (req, res) => {
    const artistId = req.params.id;
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const artist = await yt.music.getArtist(artistId);

      const header = {
        name: (artist.header as any)?.title?.toString?.() || 'Artist',
        description: (artist.header as any)?.description?.text || '',
        subscribers: (artist.header as any)?.subscribers?.text || '',
        thumbnail: getBestThumbnail((artist.header as any)?.thumbnails || []),
      };

      const topSongs: any[] = [];
      const albums: any[] = [];
      const singles: any[] = [];

      for (const section of (artist.sections || []) as any[]) {
        const title = (section.title?.toString?.() || section.header?.title?.toString?.() || '').toLowerCase();
        const contents = section.contents || [];

        if (title.includes('song') || title.includes('曲') || title.includes('トップ')) {
          for (const item of contents as any[]) {
            topSongs.push({
              id: item.id || item.video_id,
              title: item.title?.toString?.() || '',
              artist: header.name,
              artistId,
              album: item.album?.name || '',
              duration: item.duration?.text || '',
              durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        } else if (title.includes('album') || title.includes('アルバム')) {
          for (const item of contents as any[]) {
            albums.push({
              id: item.id,
              title: item.title?.toString?.() || '',
              year: item.year || '',
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        } else if (title.includes('single') || title.includes('シングル') || title.includes('ep')) {
          for (const item of contents as any[]) {
            singles.push({
              id: item.id,
              title: item.title?.toString?.() || '',
              year: item.year || '',
              thumbnail: getBestThumbnail(item.thumbnails || [item.thumbnail]),
            });
          }
        }
      }

      recordLog({
        endpoint: 'music.getArtist',
        params: { artistId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: topSongs.length + albums.length + singles.length,
      });

      res.json({
        header,
        topSongs: topSongs.slice(0, 20),
        albums,
        singles,
      });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getArtist',
        params: { artistId },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Album details with tracklist
  app.get('/api/music/album/:id', async (req, res) => {
    const albumId = req.params.id;
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const album = await yt.music.getAlbum(albumId);

      const header = {
        title: (album.header as any)?.title?.toString?.() || 'Album',
        artist: (album.header as any)?.artists?.[0]?.name || (album.header as any)?.author?.name || '',
        artistId: (album.header as any)?.artists?.[0]?.id || (album.header as any)?.author?.id,
        year: (album.header as any)?.year || '',
        thumbnail: getBestThumbnail((album.header as any)?.thumbnails || []),
        trackCount: (album.contents || []).length,
      };

      const tracks = (album.contents || []).map((item: any, idx: number) => ({
        index: idx + 1,
        id: item.id || item.video_id,
        title: item.title?.toString?.() || '',
        artist: item.artists?.[0]?.name || header.artist,
        artistId: item.artists?.[0]?.id || header.artistId,
        album: header.title,
        albumId,
        duration: item.duration?.text || '',
        durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
        thumbnail: header.thumbnail,
      }));

      recordLog({
        endpoint: 'music.getAlbum',
        params: { albumId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: tracks.length,
      });

      res.json({ header, tracks });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getAlbum',
        params: { albumId },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Playlist details
  app.get('/api/music/playlist/:id', async (req, res) => {
    const playlistId = req.params.id;
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const playlist = await yt.music.getPlaylist(playlistId);

      const header = {
        title: (playlist.header as any)?.title?.toString?.() || 'Playlist',
        author: (playlist.header as any)?.author?.name || '',
        thumbnail: getBestThumbnail((playlist.header as any)?.thumbnails || []),
        itemCount: (playlist.items || []).length,
      };

      const tracks = (playlist.items || []).map((item: any, idx: number) => ({
        index: idx + 1,
        id: item.id || item.video_id,
        title: item.title?.toString?.() || '',
        artist: item.artists?.[0]?.name || item.author?.name || '',
        duration: item.duration?.text || '',
        durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
        thumbnail: getBestThumbnail(item.thumbnails || [header.thumbnail]),
      }));

      recordLog({
        endpoint: 'music.getPlaylist',
        params: { playlistId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: tracks.length,
      });

      res.json({ header, tracks });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getPlaylist',
        params: { playlistId },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Official髭男dism Featured Spotlight
  let higedanCache: any = null;
  let higedanCacheTime = 0;

  app.get('/api/music/featured/higedan', async (_req, res) => {
    if (higedanCache && Date.now() - higedanCacheTime < 10 * 60 * 1000) {
      return res.json(higedanCache);
    }
    const startTime = Date.now();
    try {
      const yt = await getInnertube();
      const search = await yt.music.search('Official髭男dism', { type: 'song' });

      const topHits = (search.songs?.contents || []).slice(0, 16).map((item: any, idx: number) => ({
        index: idx + 1,
        id: item.id,
        title: item.title?.toString?.() || '',
        artist: 'Official髭男dism',
        album: item.album?.name || 'Official髭男dism',
        duration: item.duration?.text || '',
        durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
        thumbnail: getBestThumbnail(item.thumbnails || []),
      }));

      const result = {
        artist: 'Official髭男dism',
        tagline: '国民的ピアノPOPバンド「ヒゲダン」の名曲コレクション',
        songs: topHits,
      };

      higedanCache = result;
      higedanCacheTime = Date.now();

      recordLog({
        endpoint: 'music.featured.higedan',
        params: {},
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: topHits.length,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to extract tracks from any Spotify URL (playlists, albums, tracks, intl links, shortlinks)
  async function parseSpotifyUrl(rawUrl: string): Promise<{
    title: string;
    author: string;
    thumbnail: string;
    rawTracks: { title: string; artist: string; durationMs?: number }[];
  } | null> {
    let target = rawUrl.trim();
    // Follow redirect for shortlinks like spotify.link
    if (target.includes('spotify.link')) {
      try {
        const headRes = await fetch(target, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          redirect: 'follow',
        });
        target = headRes.url;
      } catch (e) {
        console.warn('[Spotify] Failed to follow redirect:', e);
      }
    }

    // Match pattern: open.spotify.com/(intl-xx/)?(playlist|album|track)/id or spotify:(playlist|album|track):id
    const match = target.match(
      /(?:spotify\.com\/(?:[a-zA-Z-]+\/)?(playlist|album|track)\/([a-zA-Z0-9]+)|spotify:(playlist|album|track):([a-zA-Z0-9]+))/i
    );
    if (!match) return null;

    const entityType = (match[1] || match[3]).toLowerCase();
    const entityId = match[2] || match[4];

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
    };

    // 1. Primary: fetch embed page
    let embedHtml = '';
    try {
      const embedRes = await fetch(`https://open.spotify.com/embed/${entityType}/${entityId}`, { headers });
      if (embedRes.ok) {
        embedHtml = await embedRes.text();
      }
    } catch (err: any) {
      console.warn('[Spotify] Embed fetch error:', err.message);
    }

    // 2. Secondary: if embed page failed, try oEmbed
    if (!embedHtml) {
      try {
        const oembedRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`,
          { headers }
        );
        if (oembedRes.ok) {
          const oembedData: any = await oembedRes.json();
          if (oembedData.iframe_url) {
            const ifRes = await fetch(oembedData.iframe_url, { headers });
            if (ifRes.ok) {
              embedHtml = await ifRes.text();
            }
          }
        }
      } catch (err: any) {
        console.warn('[Spotify] oEmbed fallback error:', err.message);
      }
    }

    if (embedHtml) {
      const scriptMatch = embedHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        try {
          const data = JSON.parse(scriptMatch[1]);
          const entity = data.props?.pageProps?.state?.data?.entity;
          if (entity) {
            const title = entity.title || entity.name || 'Spotify プレイリスト';
            const author =
              entity.subtitle ||
              entity.authors?.[0]?.name ||
              entity.artists?.[0]?.name ||
              'Spotify';
            const thumbnail =
              entity.coverArt?.sources?.[0]?.url ||
              entity.visualIdentity?.image?.[0]?.url ||
              '';

            let rawTracks: { title: string; artist: string; durationMs?: number }[] = [];
            if (entityType === 'track') {
              rawTracks = [{ title, artist: author, durationMs: entity.duration }];
            } else {
              rawTracks = (entity.trackList || []).map((t: any) => ({
                title: t.title || '',
                artist: t.subtitle || author,
                durationMs: t.duration,
              }));
            }

            if (rawTracks.length > 0) {
              return { title, author, thumbnail, rawTracks };
            }
          }
        } catch (parseErr) {
          console.warn('[Spotify] NEXT_DATA parse error:', parseErr);
        }
      }
    }

    // 3. Fallback: try oembed
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`, { headers });
      if (oembedRes.ok) {
        const data: any = await oembedRes.json();
        return {
          title: data.title || 'Spotify Playlist',
          author: data.provider_name || 'Spotify',
          thumbnail: data.thumbnail_url || '',
          rawTracks: [],
        };
      }
    } catch {}

    return null;
  }

  // Playlist URL import (YouTube / Spotify)
  app.post('/api/music/playlist/import', async (req, res) => {
    const rawUrl = String(req.body.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const startTime = Date.now();
    try {
      const yt = await getInnertube();

      // 1. Spotify URL parsing (playlists, albums, tracks)
      if (rawUrl.includes('spotify.com') || rawUrl.includes('spotify.link') || rawUrl.startsWith('spotify:')) {
        try {
          const spotifyData = await parseSpotifyUrl(rawUrl);
          if (spotifyData) {
            const playlistTitle = spotifyData.title;
            const thumbnail = spotifyData.thumbnail;
            const author = spotifyData.author;
            const rawTracks = spotifyData.rawTracks;

            let tracks: any[] = [];

            if (rawTracks.length > 0) {
              // Process tracks in parallel batches of 5 to resolve quickly and accurately
              const BATCH_SIZE = 5;
              const maxTracks = Math.min(rawTracks.length, 40);

              for (let i = 0; i < maxTracks; i += BATCH_SIZE) {
                const chunk = rawTracks.slice(i, i + BATCH_SIZE);
                const chunkResolved = await Promise.all(
                  chunk.map(async (rawItem, chunkIdx) => {
                    const cleanArtist = rawItem.artist.split(/[,&×/]|feat\.?/i)[0].trim();
                    const searchQuery = `${rawItem.title} ${cleanArtist}`.trim();
                    try {
                      let sRes = await yt.music.search(searchQuery, { type: 'song' });
                      let topHit = sRes.songs?.contents?.[0];

                      if (!topHit) {
                        // Fallback 1: search with just track title
                        const sRes2 = await yt.music.search(rawItem.title, { type: 'song' });
                        topHit = sRes2.songs?.contents?.[0];
                      }
                      if (!topHit) {
                        // Fallback 2: search video
                        const sRes3 = await yt.music.search(searchQuery, { type: 'video' });
                        topHit = sRes3.videos?.contents?.[0];
                      }

                      if (topHit) {
                        return {
                          index: i + chunkIdx + 1,
                          id: topHit.id,
                          title: topHit.title?.toString?.() || rawItem.title,
                          artist: topHit.artists?.[0]?.name || rawItem.artist,
                          album: topHit.album?.name || playlistTitle,
                          duration: topHit.duration?.text || '',
                          durationSeconds:
                            parseDurationToSeconds(topHit.duration?.text || '') ||
                            Math.round((rawItem.durationMs || 0) / 1000),
                          thumbnail: getBestThumbnail(topHit.thumbnails || [thumbnail]),
                        };
                      }
                    } catch (searchErr) {
                      console.warn(`[Spotify Import] Failed to resolve track "${searchQuery}":`, searchErr);
                    }
                    return null;
                  })
                );

                for (const r of chunkResolved) {
                  if (r) tracks.push(r);
                }
              }
            }

            // Re-index sequentially
            tracks = tracks.map((t, idx) => ({ ...t, index: idx + 1 }));

            if (tracks.length > 0) {
              recordLog({
                endpoint: 'playlist.import[Spotify]',
                params: { rawUrl },
                durationMs: Date.now() - startTime,
                status: 'success',
                itemCount: tracks.length,
              });

              return res.json({
                title: playlistTitle,
                author,
                thumbnail,
                tracks,
                source: 'Spotify',
                totalOriginal: rawTracks.length,
              });
            }
          }
        } catch (spotifyErr: any) {
          console.warn('Spotify import error:', spotifyErr);
        }
      }

      // 2. YouTube Playlist URL parsing
      let playlistId = '';
      const listMatch = rawUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (listMatch) {
        playlistId = listMatch[1];
      } else if (rawUrl.startsWith('PL') || rawUrl.startsWith('RD') || rawUrl.startsWith('VL') || rawUrl.startsWith('OLAK5uy')) {
        playlistId = rawUrl;
      }

      if (!playlistId) {
        const plSearch = await yt.music.search(rawUrl, { type: 'playlist' });
        const first = plSearch.playlists?.contents?.[0];
        if (first?.id) {
          playlistId = first.id;
        }
      }

      if (playlistId) {
        const pl = await yt.music.getPlaylist(playlistId);
        const header = {
          title: (pl.header as any)?.title?.toString?.() || 'Imported Playlist',
          author: (pl.header as any)?.author?.name || 'YouTube Music',
          thumbnail: getBestThumbnail((pl.header as any)?.thumbnails || []),
        };

        const tracks = (pl.items || []).map((item: any, idx: number) => ({
          index: idx + 1,
          id: item.id || item.video_id,
          title: item.title?.toString?.() || '',
          artist: item.artists?.[0]?.name || item.author?.name || header.author,
          duration: item.duration?.text || '',
          durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
          thumbnail: getBestThumbnail(item.thumbnails || [header.thumbnail]),
        }));

        recordLog({
          endpoint: 'playlist.import[YouTube]',
          params: { playlistId },
          durationMs: Date.now() - startTime,
          status: 'success',
          itemCount: tracks.length,
        });

        return res.json({
          title: header.title,
          author: header.author,
          thumbnail: header.thumbnail,
          tracks,
          source: 'YouTube',
        });
      }

      return res.status(404).json({ error: 'プレイリストを読み込めませんでした。URLをご確認ください。' });
    } catch (err: any) {
      recordLog({
        endpoint: 'playlist.import',
        params: { rawUrl },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Vite or static files
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] YT Music InnerTube backend listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
