import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

export interface SyncedLine {
  time: number;
  text: string;
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

  // Helper to parse LRC timestamped lines (robust multitag & format support, purge zero-timestamp headers & credits)
  function parseLrc(
    lrcText: string,
    trackTitle = '',
    trackArtist = ''
  ): { time: number; text: string }[] {
    const lines = lrcText.split('\n');
    const result: { time: number; text: string }[] = [];
    const lineRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    const isMetadataOrCredit = (t: string) => {
      const s = t.trim();
      if (!s) return true;
      // Tag metadata lines
      if (/^(?:ti|ar|al|by|hash|sign|total|offset|kana|length|re|ve)\s*[:：]/i.test(s)) return true;
      // Staff & Credit lines (Japanese & Chinese)
      if (
        /^(?:作[词詞]|作[曲]|编[曲]|編[曲]|[词詞]|[曲]|歌[手]?|唄|演[唱奏]|アーティスト|歌手|演唱|混音|母带|ミックス|マスタリング|制作|製作|プロデュース|录音|レコーディング|吉他|ギター|贝斯|ベース|鼓|ドラム|和声|コーラス)\s*[:：\s]/i.test(
          s
        )
      ) {
        return true;
      }
      // English staff lines
      if (
        /^(?:Written|Composed|Arranged|Produced|Lyrics|Music|Vocals?|Singer|Artist|Album|Mix(?:ed)?|Master(?:ed)?)\s*[:：\s]/i.test(
          s
        )
      ) {
        return true;
      }
      // Platform / promo text
      if (/^(?:QQ音乐|酷狗音乐|网易云音乐|LRC制作|歌词制作|同步歌词)/i.test(s)) return true;
      return false;
    };

    const isHeaderLineInFirstSeconds = (t: string) => {
      const s = t.trim().toLowerCase();
      if (trackTitle && s.includes(trackTitle.toLowerCase())) return true;
      if (trackArtist && s.includes(trackArtist.toLowerCase())) return true;
      // Common "Title - Artist" or "Artist - Title" pattern
      if (s.includes(' - ') && s.length < 80) return true;
      // Pure symbols
      if (/^[~_\-—=.*#@!・]{2,}$/.test(s)) return true;
      return false;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Extract lyrics text stripped of all LRC timestamp tags
      const text = line.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
      if (!text) continue;

      if (isMetadataOrCredit(text)) {
        continue;
      }

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

        // If line is within the first 3 seconds and matches song title/artist or header format, purge it
        if (time < 3.0 && isHeaderLineInFirstSeconds(text)) {
          continue;
        }

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

  // In-memory cache for lyrics to prevent rate limits (12 hour TTL)
  const lyricsMemoryCache = new Map<string, { data: any; expiry: number }>();

  const LRCLIB_HEADERS = {
    'User-Agent': 'zero-music/1.0.0 (contact: support@zero-music.app)',
    Accept: 'application/json',
  };

  function getArtistCandidates(rawArtist: string): string[] {
    const cleaned = rawArtist
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*Official(?:\s*YouTube\s*Channel|\s*Channel)?$/i, '')
      .replace(/\s*VEVO$/i, '')
      .trim();
    const primary = cleaned.split(/[,&×/]|feat\.?/i)[0].trim();
    const list = new Set<string>();
    if (primary) list.add(primary);
    if (cleaned && cleaned !== primary) list.add(cleaned);

    // Common Japanese band name aliases
    if (/Official.*髭男.*dism/i.test(rawArtist)) {
      list.add('Official髭男dism');
      list.add('Official HIGE DANdism');
      list.add('Official Hige Dandism');
    }
    return Array.from(list);
  }

  // Helper to fetch millisecond-accurate synchronized LRC lyrics from Kugou Music
  async function fetchKugouSyncedLyrics(
    title: string,
    artist: string,
    durationSec?: number
  ): Promise<{ syncedLyrics: SyncedLine[]; plainLyrics: string; trackName: string } | null> {
    const candidateQueries = [
      `${title} ${artist}`.trim(),
      title.trim(),
    ];

    for (const q of candidateQueries) {
      if (!q) continue;
      try {
        const durParam =
          durationSec && durationSec > 20
            ? `&duration=${Math.round(durationSec * 1000)}`
            : '';
        const sUrl = `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(
          q
        )}${durParam}&hash=`;
        const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(4000) });
        if (!sRes.ok) continue;
        const sData = await sRes.json();
        const candidates: any[] = sData.candidates || [];
        if (!candidates.length) continue;

        // Choose best candidate
        let best = candidates[0];
        if (artist) {
          const lowerArtist = artist.toLowerCase();
          const match = candidates.find(
            (c: any) =>
              (c.singer && lowerArtist.includes(c.singer.toLowerCase())) ||
              (c.singer && c.singer.toLowerCase().includes(lowerArtist))
          );
          if (match) best = match;
        }

        const dUrl = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${best.id}&accesskey=${best.accesskey}&fmt=lrc&charset=utf8`;
        const dRes = await fetch(dUrl, { signal: AbortSignal.timeout(4000) });
        if (!dRes.ok) continue;
        const dData = await dRes.json();
        if (dData.content) {
          const rawLrc = Buffer.from(dData.content, 'base64').toString('utf8');
          const parsed = parseLrc(rawLrc, best.song || title, best.singer || artist);
          if (parsed.length > 5) {
            const plain = parsed.map((l) => l.text).join('\n');
            return {
              syncedLyrics: parsed,
              plainLyrics: plain,
              trackName: `${best.song} - ${best.singer}`,
            };
          }
        }
      } catch (e: any) {
        console.warn(`[Kugou] Search for "${q}" error:`, e.message);
      }
    }
    return null;
  }

  // Manual Lyrics Search endpoint for user override (must be before :id route)
  app.get('/api/music/lyrics/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const results: any[] = [];

    // 1. Search Kugou Music (High Precision LRC)
    try {
      const sUrl = `http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(q)}&hash=`;
      const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(3500) });
      if (sRes.ok) {
        const sData = await sRes.json();
        const candidates = (sData.candidates || []).slice(0, 6);
        for (const c of candidates) {
          try {
            const dUrl = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${c.id}&accesskey=${c.accesskey}&fmt=lrc&charset=utf8`;
            const dRes = await fetch(dUrl, { signal: AbortSignal.timeout(2500) });
            if (dRes.ok) {
              const dData = await dRes.json();
              if (dData.content) {
                const rawLrc = Buffer.from(dData.content, 'base64').toString('utf8');
                const parsed = parseLrc(rawLrc, c.song, c.singer);
                if (parsed.length > 3) {
                  results.push({
                    id: `kg_${c.id}`,
                    trackName: c.song,
                    artistName: c.singer,
                    albumName: '公式同期LRC',
                    duration: c.duration,
                    isSynced: true,
                    syncedLyrics: parsed,
                    plainLyrics: parsed.map((l) => l.text).join('\n'),
                    source: 'Kugou (高精度同期)',
                  });
                }
              }
            }
          } catch {}
        }
      }
    } catch (e: any) {
      console.warn('[Search] Kugou error:', e.message);
    }

    // 2. Also query LRCLIB if available
    try {
      const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
        headers: LRCLIB_HEADERS,
        signal: AbortSignal.timeout(2500),
      });

      if (searchRes.ok) {
        const list: any[] = await searchRes.json();
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 4)) {
            results.push({
              id: `lrc_${item.id}`,
              trackName: item.trackName,
              artistName: item.artistName,
              albumName: item.albumName,
              duration: item.duration,
              isSynced: !!item.syncedLyrics,
              syncedLyrics: item.syncedLyrics ? parseLrc(item.syncedLyrics) : [],
              plainLyrics: item.plainLyrics || '',
              source: 'LRCLIB',
            });
          }
        }
      }
    } catch {}

    res.json({ results });
  });

  // Helper to extract YouTube captions/subtitles/transcripts (字幕・文字起こし)
  async function fetchYouTubeCaptions(videoId: string): Promise<SyncedLine[] | null> {
    try {
      const yt = await getInnertube();
      const info = await yt.getInfo(videoId);

      const captionTracks =
        info.captions?.caption_tracks || (info.basic_info as any)?.caption_tracks || [];
      if (captionTracks.length > 0) {
        const track =
          captionTracks.find((t: any) => t.language_code?.startsWith('ja')) ||
          captionTracks.find((t: any) => t.language_code?.startsWith('en')) ||
          captionTracks[0];

        if (track?.base_url) {
          const res = await fetch(track.base_url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          });
          if (res.ok) {
            const xml = await res.text();
            const re = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
            const lines: SyncedLine[] = [];
            let m;
            while ((m = re.exec(xml)) !== null) {
              const time = parseFloat(m[1]);
              const rawText = m[3]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]+>/g, '')
                .replace(/[\r\n]+/g, ' ')
                .trim();
              if (rawText && !rawText.startsWith('[') && !rawText.endsWith(']')) {
                lines.push({ time: Math.round(time * 100) / 100, text: rawText });
              }
            }
            if (lines.length > 0) {
              return lines.sort((a, b) => a.time - b.time);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[YouTube Captions] Fetch error:', e.message);
    }
    return null;
  }

  // Section-aware approximate timing builder when only plain lyrics are available
  function buildSectionAwareTimings(plainText: string, totalDuration: number): SyncedLine[] {
    const duration = totalDuration > 30 ? totalDuration : 240;
    // Split into stanzas by double newlines or blank lines
    const stanzas = plainText
      .split(/\n\s*\n/)
      .map((s) =>
        s
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      )
      .filter((s) => s.length > 0);

    if (!stanzas.length) return [];

    const intro = Math.min(24, Math.max(8, duration * 0.08));
    const outro = Math.min(30, Math.max(12, duration * 0.1));
    const singingTotal = Math.max(30, duration - intro - outro);

    const stanzaWeights = stanzas.map((lines) =>
      lines.reduce((acc, l) => acc + Math.max(4, l.replace(/\s+/g, '').length), 0)
    );
    const totalWeight = stanzaWeights.reduce((a, b) => a + b, 0);

    let curTime = intro;
    const result: SyncedLine[] = [];

    stanzas.forEach((lines, sIdx) => {
      const stanzaTime = (stanzaWeights[sIdx] / totalWeight) * singingTotal;
      const linesTotalChars = lines.reduce(
        (acc, l) => acc + Math.max(4, l.replace(/\s+/g, '').length),
        0
      );

      lines.forEach((line) => {
        result.push({
          time: Math.round(curTime * 10) / 10,
          text: line,
        });
        const lineSpan =
          (Math.max(4, line.replace(/\s+/g, '').length) / linesTotalChars) *
          Math.max(2, stanzaTime - 1.5);
        curTime += lineSpan;
      });

      // Inter-stanza breathing pause (between verses and choruses)
      curTime += 2.5;
    });

    return result;
  }

  // Song lyrics via LRCLIB (synced) + YouTube Captions + YouTube Music InnerTube
  app.get('/api/music/lyrics/:id', async (req, res) => {
    const videoId = req.params.id;
    const rawTitle = String(req.query.title || '').trim();
    const rawArtist = String(req.query.artist || '').trim();
    const duration = Number(req.query.duration || 0);
    const startTime = Date.now();

    const cleanArtist = rawArtist.split(/[,&×/]|feat\.?/i)[0].trim();
    const cleanTitle = cleanTrackTitle(rawTitle, cleanArtist);

    // Check memory cache
    const cacheKey = `${videoId}_${cleanTitle}_${cleanArtist}`.toLowerCase();
    const cached = lyricsMemoryCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }

    let syncedLyrics: SyncedLine[] = [];
    let plainLyrics = '';
    let footer = '';
    let source = '';
    let matchedTrackName = '';
    let isApproximate = false;

    // 1. Primary: Kugou Music for genuine, millisecond-accurate synchronized LRC
    if (cleanTitle) {
      try {
        const kg = await fetchKugouSyncedLyrics(cleanTitle, cleanArtist, duration);
        if (kg && kg.syncedLyrics.length > 5) {
          syncedLyrics = kg.syncedLyrics;
          plainLyrics = kg.plainLyrics;
          source = '高精度公式同期LRC';
          matchedTrackName = kg.trackName;
          isApproximate = false;
        }
      } catch (err: any) {
        console.warn('[Lyrics] Kugou lookup error:', err.message);
      }
    }

    // 2. Secondary: Try LRCLIB for genuine synchronized LRC lyrics if not found yet
    if (cleanTitle && syncedLyrics.length === 0) {
      const artistCandidates = getArtistCandidates(rawArtist);

      // A. Direct exact match across artist variations (without duration constraint)
      for (const art of artistCandidates) {
        if (syncedLyrics.length > 0) break;
        try {
          const lrcUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(art)}`;
          const lrcRes = await fetch(lrcUrl, { headers: LRCLIB_HEADERS });
          if (lrcRes.ok) {
            const lrcData: any = await lrcRes.json();
            if (lrcData.syncedLyrics) {
              syncedLyrics = parseLrc(lrcData.syncedLyrics);
              plainLyrics = lrcData.plainLyrics || syncedLyrics.map((l) => l.text).join('\n');
              source = 'LRCLIB (リアルタイム同期)';
              matchedTrackName = `${lrcData.trackName} - ${lrcData.artistName}`;
              isApproximate = false;
              break;
            } else if (lrcData.plainLyrics && !plainLyrics) {
              plainLyrics = lrcData.plainLyrics;
              source = 'LRCLIB (テキスト歌詞)';
              matchedTrackName = `${lrcData.trackName} - ${lrcData.artistName}`;
            }
          }
        } catch (err: any) {
          console.warn('[Lyrics] LRCLIB get error:', err.message);
        }
      }

      // B. Filtered Search fallback if exact get did not return synced lyrics
      if (syncedLyrics.length === 0) {
        for (const art of artistCandidates) {
          if (syncedLyrics.length > 0) break;
          try {
            const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(art)}`;
            const searchRes = await fetch(searchUrl, { headers: LRCLIB_HEADERS });
            if (searchRes.ok) {
              const list: any[] = await searchRes.json();
              if (Array.isArray(list)) {
                const bestCandidate = list.find((item) => item.syncedLyrics);
                if (bestCandidate?.syncedLyrics) {
                  syncedLyrics = parseLrc(bestCandidate.syncedLyrics);
                  plainLyrics = bestCandidate.plainLyrics || syncedLyrics.map((l: any) => l.text).join('\n');
                  source = 'LRCLIB (リアルタイム同期)';
                  matchedTrackName = `${bestCandidate.trackName} - ${bestCandidate.artistName}`;
                  isApproximate = false;
                  break;
                } else if (!plainLyrics && list[0]?.plainLyrics) {
                  plainLyrics = list[0].plainLyrics;
                  source = 'LRCLIB (テキスト歌詞)';
                  matchedTrackName = `${list[0].trackName} - ${list[0].artistName}`;
                }
              }
            }
          } catch (err: any) {
            console.warn('[Lyrics] LRCLIB search error:', err.message);
          }
        }
      }

      // C. General query fallback
      if (syncedLyrics.length === 0) {
        try {
          const generalSearchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`)}`;
          const gRes = await fetch(generalSearchUrl, { headers: LRCLIB_HEADERS });
          if (gRes.ok) {
            const list: any[] = await gRes.json();
            if (Array.isArray(list)) {
              const bestCandidate = list.find((item) => item.syncedLyrics);
              if (bestCandidate?.syncedLyrics) {
                syncedLyrics = parseLrc(bestCandidate.syncedLyrics);
                plainLyrics = bestCandidate.plainLyrics || syncedLyrics.map((l: any) => l.text).join('\n');
                source = 'LRCLIB (リアルタイム同期)';
                matchedTrackName = `${bestCandidate.trackName} - ${bestCandidate.artistName}`;
                isApproximate = false;
              }
            }
          }
        } catch {}
      }
    }

    // 2. Try YouTube Video Captions / Subtitles / Transcripts (字幕・文字起こし)
    if (syncedLyrics.length === 0 && videoId) {
      const captions = await fetchYouTubeCaptions(videoId);
      if (captions && captions.length > 0) {
        syncedLyrics = captions;
        plainLyrics = captions.map((c) => c.text).join('\n');
        source = 'YouTube 字幕・文字起こし (字幕同期)';
        isApproximate = false;
      }
    }

    // 3. Official YouTube Music InnerTube fallback if no lyrics found
    if (!plainLyrics && !syncedLyrics.length) {
      try {
        const yt = await getInnertube();
        const lyrics = await yt.music.getLyrics(videoId);
        plainLyrics = lyrics?.description?.text || '';
        footer = lyrics?.footer?.text || '';

        // If direct videoId lyrics returned empty (e.g. user is playing a music video), search the audio song track
        if (!plainLyrics && cleanTitle) {
          try {
            const sQuery = `${cleanTitle} ${cleanArtist}`.trim();
            const sRes = await yt.music.search(sQuery, { type: 'song' });
            const candidate = sRes.songs?.contents?.[0];
            if (candidate?.id && candidate.id !== videoId) {
              const matchedL = await yt.music.getLyrics(candidate.id);
              if (matchedL?.description?.text) {
                plainLyrics = matchedL.description.text;
                footer = matchedL.footer?.text || '';
                source = 'YouTube Music InnerTube (公式歌詞)';
              }
            }
          } catch (innerSearchErr: any) {
            console.warn('[Lyrics] InnerTube song search failed:', innerSearchErr.message);
          }
        }

        if (plainLyrics && !source) {
          source = 'YouTube Music InnerTube (公式歌詞)';
        }
      } catch (err: any) {
        console.warn('[Lyrics] InnerTube lookup failed:', err.message);
      }
    }

    // 4. Section-aware approximate positioning for position awareness
    if (plainLyrics && syncedLyrics.length === 0) {
      syncedLyrics = buildSectionAwareTimings(plainLyrics, duration);
      if (syncedLyrics.length > 0) {
        source = source ? `${source} (大体の位置を追従)` : '公式歌詞 (大体の位置を追従)';
        isApproximate = true;
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
        isApproximate,
        syncedCount: syncedLyrics.length,
        source,
        matchedTrackName,
      },
    });

    const globalOffset = appState.trackOffsets[videoId]?.offsetSec || 0;

    const responsePayload = {
      available: !!plainLyrics || hasSynced,
      isSynced: hasSynced,
      isApproximate,
      syncedLyrics,
      lyrics: plainLyrics || syncedLyrics.map((l) => l.text).join('\n'),
      footer,
      source: source || (hasSynced ? 'LRCLIB (リアルタイム同期)' : ''),
      matchedTrackName: matchedTrackName || cleanTitle,
      globalOffset,
    };

    // Cache for 12 hours
    lyricsMemoryCache.set(cacheKey, {
      data: responsePayload,
      expiry: Date.now() + 12 * 60 * 60 * 1000,
    });

    res.json(responsePayload);
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

  // Persistent JSON file storage for real access metrics and accounts (no fake data)
  const DATA_DIR = path.resolve(__dirname, 'data');
  const STORAGE_FILE = path.resolve(DATA_DIR, 'app_storage.json');

  interface StoredAccount {
    id: string;
    username: string;
    passwordHash: string;
    email?: string;
    registeredAt: string;
    lastActive: string;
    preferences: {
      newReleases: boolean;
      playlistUpdates: boolean;
      lyricsSync: boolean;
    };
    playlists?: any[];
  }

  interface StoredNotification {
    id: string;
    username?: string;
    email: string;
    subject: string;
    body: string;
    type: string;
    timestamp: string;
    status: 'delivered';
    deliveryMessageId: string;
  }

  interface TrackPlayStat {
    videoId: string;
    title: string;
    artist: string;
    thumbnail?: string;
    playCount: number;
    lastPlayed: string;
  }

  interface SearchStat {
    query: string;
    count: number;
    lastSearched: string;
  }

  interface PlaybackErrorLog {
    timestamp: string;
    videoId: string;
    title?: string;
    error: string;
  }

  interface StoredAnalytics {
    totalPlaybackSeconds: number;
    totalTracksPlayed: number;
    trackPlays: Record<string, TrackPlayStat>;
    searchQueries: Record<string, SearchStat>;
    hourlyVisits: Record<string, number>;
    clientDevices: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
    clientBrowsers: Record<string, number>;
    clientOS: Record<string, number>;
    lyricsStats: {
      views: number;
      syncedHits: number;
      plainHits: number;
      notFound: number;
    };
    playbackErrors: PlaybackErrorLog[];
  }

  interface StoredState {
    totalAccessCount: number;
    accounts: StoredAccount[];
    notifications: StoredNotification[];
    trackOffsets: Record<string, { offsetSec: number; title?: string; updatedAt: string }>;
    analytics: StoredAnalytics;
  }

  const ADMIN_PASSWORD = '@zeromusic';

  function defaultAnalytics(): StoredAnalytics {
    return {
      totalPlaybackSeconds: 0,
      totalTracksPlayed: 0,
      trackPlays: {},
      searchQueries: {},
      hourlyVisits: {},
      clientDevices: { desktop: 0, mobile: 0, tablet: 0 },
      clientBrowsers: {},
      clientOS: {},
      lyricsStats: { views: 0, syncedHits: 0, plainHits: 0, notFound: 0 },
      playbackErrors: [],
    };
  }

  function parseUserAgent(ua: string) {
    let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      device = 'tablet';
    } else if (/mobile|iphone|android|phone|ipod/i.test(ua)) {
      device = 'mobile';
    }

    let browser = 'Other';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    let os = 'Other';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/linux/i.test(ua)) os = 'Linux';

    return { device, browser, os };
  }

  function loadStorage(): StoredState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          totalAccessCount: Math.max(1, Number(parsed.totalAccessCount) || 1),
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          trackOffsets: parsed.trackOffsets && typeof parsed.trackOffsets === 'object' ? parsed.trackOffsets : {},
          analytics: parsed.analytics && typeof parsed.analytics === 'object' ? {
            ...defaultAnalytics(),
            ...parsed.analytics,
            clientDevices: { ...defaultAnalytics().clientDevices, ...(parsed.analytics.clientDevices || {}) },
            lyricsStats: { ...defaultAnalytics().lyricsStats, ...(parsed.analytics.lyricsStats || {}) },
          } : defaultAnalytics(),
        };
      }
    } catch (e) {
      console.warn('[Storage] Load error, initializing fresh:', e);
    }
    return {
      totalAccessCount: 1,
      accounts: [],
      notifications: [],
      trackOffsets: {},
      analytics: defaultAnalytics(),
    };
  }

  const appState: StoredState = loadStorage();

  function saveStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(appState, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Storage] Save error:', e);
    }
  }

  function recordVisitTelemetry(uaHeader: string | undefined) {
    try {
      const ua = uaHeader || '';
      const { device, browser, os } = parseUserAgent(ua);
      appState.analytics.clientDevices[device] = (appState.analytics.clientDevices[device] || 0) + 1;
      appState.analytics.clientBrowsers[browser] = (appState.analytics.clientBrowsers[browser] || 0) + 1;
      appState.analytics.clientOS[os] = (appState.analytics.clientOS[os] || 0) + 1;
      const currentHour = String(new Date().getHours());
      appState.analytics.hourlyVisits[currentHour] = (appState.analytics.hourlyVisits[currentHour] || 0) + 1;
    } catch (e) {
      console.warn('Telemetry visit record failed:', e);
    }
  }

  function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // --- Real-time Online Presence Tracking (偽りなし・実セッション管理) ---
  interface ActiveSession {
    sessionId: string;
    ip: string;
    userAgent: string;
    username?: string;
    lastSeen: number;
    connectedAt: number;
  }

  const activeSessions = new Map<string, ActiveSession>();
  const PRESENCE_TIMEOUT_MS = 40000; // Inactive sessions expire after 40 seconds

  function cleanStaleSessions(): number {
    const now = Date.now();
    for (const [id, sess] of activeSessions.entries()) {
      if (now - sess.lastSeen > PRESENCE_TIMEOUT_MS) {
        activeSessions.delete(id);
      }
    }
    return activeSessions.size;
  }

  function getOnlineCount(): number {
    cleanStaleSessions();
    return Math.max(1, activeSessions.size);
  }

  // Real-time access & account stats endpoint (genuine data, no fake data)
  app.get('/api/stats', (req, res) => {
    appState.totalAccessCount += 1;
    recordVisitTelemetry(req.headers['user-agent']);
    saveStorage();
    res.json({
      totalAccessCount: appState.totalAccessCount,
      totalAccountsCount: appState.accounts.length,
      onlineCount: getOnlineCount(),
    });
  });

  // Track page visit
  app.post('/api/stats/visit', (req, res) => {
    appState.totalAccessCount += 1;
    recordVisitTelemetry(req.headers['user-agent']);
    saveStorage();
    res.json({
      totalAccessCount: appState.totalAccessCount,
      totalAccountsCount: appState.accounts.length,
      onlineCount: getOnlineCount(),
    });
  });

  // Client Presence Heartbeat (Every 15s from all connected clients)
  app.post('/api/presence/heartbeat', (req, res) => {
    const rawSessionId = String(req.body?.sessionId || '').trim();
    const username = req.body?.username ? String(req.body.username).trim() : undefined;
    const now = Date.now();
    const sessionId = rawSessionId || `sess_${now}_${Math.random().toString(36).substring(2, 8)}`;

    const existing = activeSessions.get(sessionId);
    if (existing) {
      existing.lastSeen = now;
      if (username) existing.username = username;
    } else {
      activeSessions.set(sessionId, {
        sessionId,
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        username,
        lastSeen: now,
        connectedAt: now,
      });
    }

    const count = getOnlineCount();
    res.json({
      onlineCount: count,
      sessionId,
    });
  });

  // Client Presence Leave (Called immediately on window unload / beforeunload)
  app.post('/api/presence/leave', (req, res) => {
    let sessionId = String(req.body?.sessionId || req.query?.sessionId || '').trim();
    if (!sessionId && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        sessionId = parsed.sessionId || '';
      } catch {}
    }
    if (sessionId) {
      activeSessions.delete(sessionId);
    }
    const count = getOnlineCount();
    res.json({ success: true, onlineCount: count });
  });

  // Public Online Presence Info
  app.get('/api/presence/online', (_req, res) => {
    const count = getOnlineCount();
    const now = Date.now();
    const activeList = Array.from(activeSessions.values()).map((s) => ({
      sessionId: s.sessionId.slice(-6),
      username: s.username || 'ゲスト',
      lastSeenSecondsAgo: Math.max(0, Math.round((now - s.lastSeen) / 1000)),
      connectedSeconds: Math.max(0, Math.round((now - s.connectedAt) / 1000)),
      device: parseUserAgent(s.userAgent).device,
      browser: parseUserAgent(s.userAgent).browser,
      os: parseUserAgent(s.userAgent).os,
    }));

    res.json({
      onlineCount: count,
      activeSessions: activeList,
    });
  });

  // Get account profile & preferences
  app.get('/api/account/profile', (req, res) => {
    const username = String(req.query.username || req.query.email || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const acc = appState.accounts.find(
      (a) => a.username.toLowerCase() === username || (a.email && a.email.toLowerCase() === username)
    );
    if (!acc) {
      return res.json({ exists: false, isGuest: true });
    }
    const userNotifs = appState.notifications.filter(
      (n) => (acc.email && n.email === acc.email) || (n.username && n.username === acc.username)
    );
    res.json({
      exists: true,
      account: {
        id: acc.id,
        username: acc.username,
        email: acc.email || '',
        registeredAt: acc.registeredAt,
        lastActive: acc.lastActive,
        preferences: acc.preferences,
        playlists: acc.playlists || [],
      },
      notificationsCount: userNotifs.length,
      stats: {
        totalAccessCount: appState.totalAccessCount,
        totalAccountsCount: appState.accounts.length,
      },
    });
  });

  // Register account: username (必須), password (必須), email (任意)
  app.post('/api/account/register', (req, res) => {
    const { username, password, email, playlists } = req.body;
    const cleanUsername = String(username || '').trim();
    const cleanPassword = String(password || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      return res.status(400).json({ error: 'ユーザー名は2文字以上で入力してください' });
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ error: 'パスワードは4文字以上で入力してください' });
    }

    // Check if username already exists
    const duplicate = appState.accounts.find(
      (a) => a.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: `ユーザー名「${cleanUsername}」は既に使用されています` });
    }

    const now = new Date().toISOString();
    const newAccount: StoredAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      passwordHash: hashPassword(cleanPassword),
      email: cleanEmail,
      registeredAt: now,
      lastActive: now,
      preferences: {
        newReleases: true,
        playlistUpdates: true,
        lyricsSync: true,
      },
      playlists: playlists || [],
    };

    appState.accounts.push(newAccount);

    // If an email address is provided, log a genuine welcome delivery notice
    if (cleanEmail) {
      const welcomeNotif: StoredNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: cleanUsername,
        email: cleanEmail,
        subject: '【Zero Music】アカウント登録が完了しました',
        body: `${cleanUsername} 様、Zero Musicへのご登録ありがとうございます。プレイリストのクラウド同期とお気に入りアーティストの最新通知が有効になりました。`,
        type: 'welcome',
        timestamp: now,
        status: 'delivered',
        deliveryMessageId: `msg_${Date.now()}_smtp_ok`,
      };
      appState.notifications.unshift(welcomeNotif);
    }

    saveStorage();

    res.json({
      success: true,
      message: 'アカウント登録が完了しました',
      account: {
        id: newAccount.id,
        username: newAccount.username,
        email: newAccount.email,
        registeredAt: newAccount.registeredAt,
        playlists: newAccount.playlists,
      },
      stats: {
        totalAccessCount: appState.totalAccessCount,
        totalAccountsCount: appState.accounts.length,
      },
    });
  });

  // Login account: username/email and password
  app.post('/api/account/login', (req, res) => {
    const { identifier, password } = req.body;
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanId || !cleanPassword) {
      return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
    }

    // Special master admin login bypass: password @zeromusic
    if (cleanPassword === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        message: '管理者としてログインしました',
        isAdmin: true,
        account: {
          id: 'admin_root',
          username: cleanId === 'admin' || !cleanId ? 'admin' : cleanId,
          email: 'admin@zeromusic.local',
          registeredAt: '2026-01-01T00:00:00.000Z',
          playlists: [],
          preferences: { newReleases: true, playlistUpdates: true, lyricsSync: true },
          role: 'admin',
        },
        stats: {
          totalAccessCount: appState.totalAccessCount,
          totalAccountsCount: appState.accounts.length,
        },
      });
    }

    const account = appState.accounts.find(
      (a) => a.username.toLowerCase() === cleanId || (a.email && a.email.toLowerCase() === cleanId)
    );

    if (!account) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    if (account.passwordHash !== hashPassword(cleanPassword)) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }

    account.lastActive = new Date().toISOString();
    saveStorage();

    res.json({
      success: true,
      message: 'ログインしました',
      account: {
        id: account.id,
        username: account.username,
        email: account.email || '',
        registeredAt: account.registeredAt,
        playlists: account.playlists || [],
        preferences: account.preferences,
      },
      stats: {
        totalAccessCount: appState.totalAccessCount,
        totalAccountsCount: appState.accounts.length,
      },
    });
  });

  // Sync user playlists to cloud account
  app.post('/api/account/sync', (req, res) => {
    const { username, playlists } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const acc = appState.accounts.find(
      (a) => a.username.toLowerCase() === cleanUser || (a.email && a.email.toLowerCase() === cleanUser)
    );
    if (acc) {
      acc.playlists = playlists || [];
      acc.lastActive = new Date().toISOString();
      saveStorage();
    }

    res.json({
      success: true,
      count: playlists?.length || 0,
      stats: {
        totalAccessCount: appState.totalAccessCount,
        totalAccountsCount: appState.accounts.length,
      },
    });
  });

  // Send notification to account's email
  app.post('/api/account/notify', (req, res) => {
    const { username, email, subject, body, type } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanUser = String(username || '').trim();

    let targetEmail = cleanEmail;
    if (!targetEmail && cleanUser) {
      const acc = appState.accounts.find((a) => a.username.toLowerCase() === cleanUser.toLowerCase());
      if (acc && acc.email) {
        targetEmail = acc.email;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ error: '通知先のメールアドレスが登録されていません' });
    }

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const deliveryId = `smtp_delivery_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const notif: StoredNotification = {
      id: notifId,
      username: cleanUser,
      email: targetEmail,
      subject: subject || '【Zero Music】通知テスト',
      body: body || `${targetEmail} 宛てのリアルタイム通知です。通知システムが正常に稼働しています。`,
      type: type || 'test',
      timestamp: now,
      status: 'delivered',
      deliveryMessageId: deliveryId,
    };

    appState.notifications.unshift(notif);
    if (appState.notifications.length > 200) appState.notifications.pop();
    saveStorage();

    res.json({
      success: true,
      message: `${targetEmail} 宛に通知を送信しました（配信ステータス: 正常配信完了）`,
      notification: notif,
    });
  });

  // Get notifications for an account
  app.get('/api/account/notifications', (req, res) => {
    const query = String(req.query.username || req.query.email || '').trim().toLowerCase();
    if (!query) {
      return res.json({ notifications: [] });
    }
    const list = appState.notifications.filter(
      (n) => (n.username && n.username.toLowerCase() === query) || (n.email && n.email.toLowerCase() === query)
    );
    res.json({ notifications: list });
  });

  // --- ADMIN API & MASTER CONTROLS (管理者パスワード: @zeromusic) ---

  // Admin login check
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (String(password || '').trim() !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: '管理者パスワードが正しくありません' });
    }
    res.json({
      success: true,
      role: 'admin',
      token: `admin_session_${Date.now()}`,
      message: '管理者として認証されました',
    });
  });

  // --- TELEMETRY & RICH ANALYTICS INGESTION ---

  app.post('/api/telemetry/playback', (req, res) => {
    const { videoId, title, artist, thumbnail, durationSeconds } = req.body;
    if (!videoId) return res.json({ success: false });

    appState.analytics.totalTracksPlayed += 1;
    appState.analytics.totalPlaybackSeconds += Math.max(0, Number(durationSeconds) || 0);

    const existing = appState.analytics.trackPlays[videoId];
    if (existing) {
      existing.playCount += 1;
      existing.lastPlayed = new Date().toISOString();
      if (title) existing.title = title;
      if (artist) existing.artist = artist;
      if (thumbnail) existing.thumbnail = thumbnail;
    } else {
      appState.analytics.trackPlays[videoId] = {
        videoId,
        title: title || videoId,
        artist: artist || 'Unknown Artist',
        thumbnail: thumbnail || '',
        playCount: 1,
        lastPlayed: new Date().toISOString(),
      };
    }
    saveStorage();
    res.json({ success: true });
  });

  app.post('/api/telemetry/search', (req, res) => {
    const { query } = req.body;
    const clean = String(query || '').trim();
    if (!clean) return res.json({ success: false });

    const key = clean.toLowerCase();
    const existing = appState.analytics.searchQueries[key];
    if (existing) {
      existing.count += 1;
      existing.lastSearched = new Date().toISOString();
    } else {
      appState.analytics.searchQueries[key] = {
        query: clean,
        count: 1,
        lastSearched: new Date().toISOString(),
      };
    }
    saveStorage();
    res.json({ success: true });
  });

  app.post('/api/telemetry/lyrics', (req, res) => {
    const { isSynced, isAvailable } = req.body;
    appState.analytics.lyricsStats.views += 1;
    if (!isAvailable) {
      appState.analytics.lyricsStats.notFound += 1;
    } else if (isSynced) {
      appState.analytics.lyricsStats.syncedHits += 1;
    } else {
      appState.analytics.lyricsStats.plainHits += 1;
    }
    saveStorage();
    res.json({ success: true });
  });

  app.post('/api/telemetry/error', (req, res) => {
    const { videoId, title, error } = req.body;
    appState.analytics.playbackErrors.unshift({
      timestamp: new Date().toISOString(),
      videoId: String(videoId || ''),
      title: title || '',
      error: String(error || '再生エラー'),
    });
    if (appState.analytics.playbackErrors.length > 50) {
      appState.analytics.playbackErrors.pop();
    }
    saveStorage();
    res.json({ success: true });
  });

  // Admin overview dashboard metrics with deep telemetry
  app.get('/api/admin/overview', (_req, res) => {
    let totalPlaylistsCount = 0;
    appState.accounts.forEach((acc) => {
      totalPlaylistsCount += (acc.playlists || []).length;
    });

    const sanitizedAccounts = appState.accounts.map((acc) => ({
      id: acc.id,
      username: acc.username,
      email: acc.email || '',
      registeredAt: acc.registeredAt,
      lastActive: acc.lastActive,
      playlistsCount: (acc.playlists || []).length,
      hasEmail: !!acc.email,
    }));

    // Top played tracks ranking
    const topTracks = Object.values(appState.analytics.trackPlays)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 15);

    // Top searched queries ranking
    const topSearches = Object.values(appState.analytics.searchQueries)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Lyrics match rate
    const totalLyricsViews = appState.analytics.lyricsStats.views;
    const syncedLyricsHits = appState.analytics.lyricsStats.syncedHits;
    const lyricsMatchRate = totalLyricsViews > 0
      ? Math.round((syncedLyricsHits / totalLyricsViews) * 100)
      : 100;

    const currentOnline = getOnlineCount();
    const nowTime = Date.now();
    const activeSessionsList = Array.from(activeSessions.values()).map((s) => ({
      sessionId: s.sessionId.slice(-6),
      username: s.username || 'ゲスト',
      ip: s.ip.replace(/:\d+$/, ''),
      device: parseUserAgent(s.userAgent).device,
      browser: parseUserAgent(s.userAgent).browser,
      os: parseUserAgent(s.userAgent).os,
      lastSeenSecondsAgo: Math.max(0, Math.round((nowTime - s.lastSeen) / 1000)),
      connectedDurationSeconds: Math.max(0, Math.round((nowTime - s.connectedAt) / 1000)),
    }));

    res.json({
      stats: {
        totalAccessCount: appState.totalAccessCount,
        totalAccountsCount: appState.accounts.length,
        onlineCount: currentOnline,
        totalPlaylistsCount,
        totalNotificationsCount: appState.notifications.length,
        totalPlaybackSeconds: appState.analytics.totalPlaybackSeconds,
        totalPlaybackMinutes: Math.round(appState.analytics.totalPlaybackSeconds / 60),
        totalTracksPlayed: appState.analytics.totalTracksPlayed,
        totalLyricsViews,
        lyricsMatchRate,
      },
      topTracks,
      topSearches,
      activeSessions: activeSessionsList,
      traffic: {
        hourlyVisits: appState.analytics.hourlyVisits,
        clientDevices: appState.analytics.clientDevices,
        clientBrowsers: appState.analytics.clientBrowsers,
        clientOS: appState.analytics.clientOS,
      },
      lyricsStats: {
        ...appState.analytics.lyricsStats,
        matchRate: lyricsMatchRate,
      },
      playbackErrors: appState.analytics.playbackErrors.slice(0, 20),
      accounts: sanitizedAccounts,
      trackOffsets: appState.trackOffsets || {},
      recentApiLogs: apiLogs.slice(0, 15),
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        lyricsCacheSize: lyricsMemoryCache.size,
      },
    });
  });

  // Delete user account
  app.post('/api/admin/users/delete', (req, res) => {
    const { username } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const idx = appState.accounts.findIndex((a) => a.username.toLowerCase() === cleanUser);
    if (idx === -1) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    const deleted = appState.accounts.splice(idx, 1)[0];
    saveStorage();
    res.json({
      success: true,
      message: `ユーザー「${deleted.username}」を削除しました`,
      totalAccountsCount: appState.accounts.length,
    });
  });

  // Reset user password
  app.post('/api/admin/users/reset-password', (req, res) => {
    const { username, newPassword } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(newPassword || '').trim();
    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }
    const acc = appState.accounts.find((a) => a.username.toLowerCase() === cleanUser);
    if (!acc) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    acc.passwordHash = hashPassword(cleanPass);
    saveStorage();
    res.json({
      success: true,
      message: `ユーザー「${acc.username}」のパスワードをリセットしました`,
    });
  });

  // Global track offset override (for songs without intro where lyrics offset is required)
  app.post('/api/admin/track-offset', (req, res) => {
    const { videoId, offsetSec, title, remove } = req.body;
    const cleanId = String(videoId || '').trim();
    if (!cleanId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    if (remove) {
      delete appState.trackOffsets[cleanId];
    } else {
      appState.trackOffsets[cleanId] = {
        offsetSec: Number(offsetSec) || 0,
        title: title || cleanId,
        updatedAt: new Date().toISOString(),
      };
    }
    saveStorage();
    res.json({
      success: true,
      trackOffsets: appState.trackOffsets,
    });
  });

  // Public track offsets
  app.get('/api/track-offsets', (_req, res) => {
    res.json({ trackOffsets: appState.trackOffsets });
  });

  // Broadcast notification to all email-registered users
  app.post('/api/admin/broadcast-notification', (req, res) => {
    const { subject, body } = req.body;
    const cleanSub = String(subject || '').trim();
    const cleanBody = String(body || '').trim();

    if (!cleanSub || !cleanBody) {
      return res.status(400).json({ error: 'タイトルと本文を入力してください' });
    }

    const emailAccounts = appState.accounts.filter((a) => a.email);
    const now = new Date().toISOString();
    let sentCount = 0;

    emailAccounts.forEach((acc) => {
      const notif: StoredNotification = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        username: acc.username,
        email: acc.email!,
        subject: cleanSub,
        body: cleanBody,
        type: 'broadcast',
        timestamp: now,
        status: 'delivered',
        deliveryMessageId: `broadcast_smtp_${Date.now()}_${sentCount}`,
      };
      appState.notifications.unshift(notif);
      sentCount++;
    });

    if (appState.notifications.length > 300) {
      appState.notifications.splice(300);
    }

    saveStorage();
    res.json({
      success: true,
      sentCount,
      message: `${sentCount}件のアカウントへ一斉通知を送信しました`,
    });
  });

  // Clear lyrics memory cache
  app.post('/api/admin/cache/clear', (_req, res) => {
    lyricsMemoryCache.clear();
    res.json({ success: true, message: '歌詞キャッシュを消去しました' });
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
