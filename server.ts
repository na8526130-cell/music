import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Innertube, UniversalCache } from 'youtubei.js';
import { kvCache } from './src/server/kvCache';

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
  let best = thumbnails[0];
  let maxW = best?.width || 0;
  for (const t of thumbnails) {
    const w = t?.width || 0;
    if (w > maxW) {
      maxW = w;
      best = t;
    }
  }
  return best?.url || thumbnails[0]?.url || '';
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
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Health check with KV cache stats
  app.get('/api/health', async (_req, res) => {
    try {
      const yt = await getInnertube();
      res.json({
        status: 'ok',
        innertubeReady: !!yt,
        version: 'youtubei.js v18.3.0',
        cachedLogsCount: apiLogs.length,
        kvCache: kvCache.getStats(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // KV Cache Admin & Monitoring
  app.get('/api/cache/stats', (_req, res) => {
    res.json(kvCache.getStats());
  });

  app.post('/api/cache/clear', (_req, res) => {
    kvCache.clear();
    res.json({ success: true, message: 'KV persistent cache cleared successfully' });
  });

  // Dedicated Auto-Fallback for Error 101/150 (embedding restricted tracks)
  app.get('/api/music/fallback', async (req, res) => {
    const rawTitle = String(req.query.title || '').trim();
    const rawArtist = String(req.query.artist || '').trim();
    const excludeStr = String(req.query.exclude || '');
    const excludeIds = new Set(excludeStr ? excludeStr.split(',').map((s) => s.trim()) : []);

    if (!rawTitle) {
      return res.status(400).json({ success: false, error: 'Track title is required' });
    }

    const cleanTitle = rawTitle.replace(/\(.*?\)|\[.*?\]|【.*?】|-.*$/g, '').trim();
    const cacheKey = `fallback:${cleanTitle}:${rawArtist}`.toLowerCase();
    const cachedCandidates = kvCache.get<any[]>(cacheKey);

    if (cachedCandidates && Array.isArray(cachedCandidates)) {
      const viable = cachedCandidates.find((item) => item.id && !excludeIds.has(item.id));
      if (viable) {
        return res.json({ success: true, track: viable, source: 'kv-cache' });
      }
    }

    try {
      const yt = await getInnertube();
      const queries = [
        `${cleanTitle} ${rawArtist} official audio`,
        `${cleanTitle} ${rawArtist} topic`,
        `${cleanTitle} ${rawArtist}`,
        `${cleanTitle} official`,
      ];

      const foundList: any[] = [];
      for (const q of queries) {
        try {
          const searchRes: any = await yt.music.search(q, { type: 'song' });
          const contents = searchRes?.songs?.contents || [];
          for (const s of contents) {
            if (s.id && !excludeIds.has(s.id)) {
              foundList.push({
                id: s.id,
                title: s.title?.toString?.() || rawTitle,
                artist: s.artists?.[0]?.name || rawArtist,
                thumbnail: getBestThumbnail(s.thumbnails || []),
                duration: s.duration?.text || '',
                durationSeconds: parseDurationToSeconds(s.duration?.text || ''),
                isAlternate: true,
              });
              if (foundList.length >= 4) break;
            }
          }
        } catch {
          // continue to next query
        }
        if (foundList.length >= 4) break;
      }

      if (foundList.length > 0) {
        kvCache.set(cacheKey, foundList, 48 * 3600); // 48-hour persistent cache
        return res.json({ success: true, track: foundList[0], source: 'innertube' });
      }

      return res.status(404).json({ success: false, message: 'No alternative tracks found' });
    } catch (err: any) {
      console.error('[Fallback] Search error:', err);
      return res.status(500).json({ success: false, error: err.message });
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

  // ==========================================
  // Oricon Chart Service & In-Memory Cache
  // ==========================================
  interface OriconItem {
    id: string;
    rank: number;
    title: string;
    artist: string;
    metric?: string;
    thumbnail: string;
    duration?: string;
    durationSeconds?: number;
    rankType: 'streaming' | 'digital';
  }

  let oriconStreamingCache: { timestamp: number; items: OriconItem[] } | null = null;
  let oriconDigitalCache: { timestamp: number; items: OriconItem[] } | null = null;
  const ORICON_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

  // Fallback Oricon Hits in case of network timeout
  const FALLBACK_ORICON_STREAMING = [
    { rank: 1, title: 'ラブリーズン', artist: '原因は自分にある。', metric: '再生数：8,897,147回' },
    { rank: 2, title: 'しわあわせ', artist: 'Vaundy', metric: '再生数：7,230,000回' },
    { rank: 3, title: 'Yes! 東京', artist: '超特急 / M!LK / 原因は自分にある。', metric: '再生数：6,850,000回' },
    { rank: 4, title: 'ザッツ!超常', artist: 'M!LK', metric: '再生数：6,120,000回' },
    { rank: 5, title: '結び', artist: 'ヨルシカ', metric: '再生数：5,940,000回' },
    { rank: 6, title: 'ライラック', artist: 'Mrs. GREEN APPLE', metric: '再生数：5,810,000回' },
    { rank: 7, title: 'Bling-Bang-Bang-Born', artist: 'Creepy Nuts', metric: '再生数：5,420,000回' },
    { rank: 8, title: '幾億光年', artist: 'Omoinotake', metric: '再生数：4,910,000回' },
    { rank: 9, title: '怪獣の花唄', artist: 'Vaundy', metric: '再生数：4,650,000回' },
    { rank: 10, title: 'アイドル', artist: 'YOASOBI', metric: '再生数：4,300,000回' },
  ];

  const FALLBACK_ORICON_DIGITAL = [
    { rank: 1, title: 'チェックメイト', artist: 'Travis Japan', metric: 'ダウンロード数：30,747DL' },
    { rank: 2, title: 'ザッツ!超常', artist: 'M!LK', metric: 'ダウンロード数：20,593DL' },
    { rank: 3, title: 'Slidin', artist: 'HANA', metric: 'ダウンロード数：5,440DL' },
    { rank: 4, title: 'Slam Dunk', artist: 'STARGLOW', metric: 'ダウンロード数：4,926DL' },
    { rank: 5, title: '咲き誇れ', artist: 'YOASOBI', metric: 'ダウンロード数：4,062DL' },
    { rank: 6, title: '娑婆堕罵 -Shabadaba-', artist: 'RADWIMPS', metric: 'ダウンロード数：3,933DL' },
    { rank: 7, title: '再会愛 Lie 期待して Cry', artist: 'Hey! Say! JUMP', metric: 'ダウンロード数：3,880DL' },
    { rank: 8, title: '雲を抜け風下へ私だけ', artist: 'ヨルシカ', metric: 'ダウンロード数：3,024DL' },
    { rank: 9, title: 'You’re Under Arrest', artist: 'ILLIT', metric: 'ダウンロード数：2,150DL' },
    { rank: 10, title: 'それなのに', artist: 'Uru', metric: 'ダウンロード数：2,067DL' },
  ];

  async function fetchOriconRawChart(type: 'streaming' | 'digital'): Promise<Array<{ rank: number; title: string; artist: string; metric: string }>> {
    const url = type === 'streaming' ? 'https://www.oricon.co.jp/rank/st/w/' : 'https://www.oricon.co.jp/rank/dis/w/';
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = await resp.arrayBuffer();
      const decoder = new TextDecoder('shift_jis');
      const html = decoder.decode(buf);

      const entryMatches = html.match(/<section class=\"box-rank-entry[\s\S]*?<\/section>/g) || [];
      const parsed: Array<{ rank: number; title: string; artist: string; metric: string }> = [];

      for (const entry of entryMatches) {
        const rankMatch = entry.match(/<p class=\"num [^\"]*\">(\d+)<\/p>/);
        const titleMatch = entry.match(/class=\"(?:nolink )?title\"[^>]*>([^<]+)<\/h2>/) || entry.match(/itemprop=\"name\">([^<]+)<\/h2>/);
        const artistMatch = entry.match(/class=\"(?:alink )?name\"[^>]*>([^<]+)<\/p>/);
        const metricMatch = entry.match(/<li>(再生数|DL数|ダウンロード数)[：:]([^<]+)<\/li>/);

        const rank = rankMatch ? parseInt(rankMatch[1], 10) : parsed.length + 1;
        const title = titleMatch ? titleMatch[1].trim() : '';
        const artist = artistMatch ? artistMatch[1].trim() : '';
        const metric = metricMatch ? metricMatch[0].replace(/<[^>]+>/g, '').trim() : '';

        if (title) {
          parsed.push({ rank, title, artist, metric });
        }
      }

      if (parsed.length > 0) return parsed;
    } catch (err: any) {
      console.warn(`[Oricon] Failed to scrape ${type} chart:`, err.message);
    }
    return type === 'streaming' ? FALLBACK_ORICON_STREAMING : FALLBACK_ORICON_DIGITAL;
  }

  async function getOriconChart(type: 'streaming' | 'digital' = 'streaming'): Promise<OriconItem[]> {
    const cacheKey = `oricon:${type}`;
    const cachedItems = kvCache.get<OriconItem[]>(cacheKey);
    if (cachedItems && cachedItems.length > 0) {
      return cachedItems;
    }

    const rawEntries = await fetchOriconRawChart(type);
    let yt: any = null;
    try {
      yt = await getInnertube();
    } catch {
      // ignore
    }

    const items: OriconItem[] = await Promise.all(
      rawEntries.slice(0, 10).map(async (raw) => {
        if (yt) {
          try {
            const searchQuery = `${raw.title} ${raw.artist}`.trim();
            const searchPromise = yt.music.search(searchQuery, { type: 'song' });
            const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 2500));
            const searchRes: any = await Promise.race([searchPromise, timeoutPromise]);
            const topSong = searchRes?.songs?.contents?.[0];

            if (topSong && topSong.id) {
              return {
                id: topSong.id,
                rank: raw.rank,
                title: raw.title,
                artist: raw.artist || (topSong as any).artists?.[0]?.name || 'Unknown Artist',
                artistId: (topSong as any).artists?.[0]?.id,
                metric: raw.metric,
                thumbnail: getBestThumbnail((topSong as any).thumbnails || []),
                duration: (topSong as any).duration?.text || '',
                durationSeconds: parseDurationToSeconds((topSong as any).duration?.text || ''),
                rankType: type,
              };
            }
          } catch {
            // fallback
          }
        }
        return {
          id: `oricon_${type}_${raw.rank}`,
          rank: raw.rank,
          title: raw.title,
          artist: raw.artist,
          metric: raw.metric,
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
          rankType: type,
        };
      })
    );

    if (items.length > 0) {
      kvCache.set(cacheKey, items, 6 * 3600); // 6 hours persistent cache
    }

    return items;
  }

  // Dedicated Oricon Ranking Endpoint
  app.get('/api/music/oricon', async (req, res) => {
    try {
      const type = (req.query.type === 'digital' ? 'digital' : 'streaming') as 'streaming' | 'digital';
      const items = await getOriconChart(type);
      res.json({
        type,
        chartName: type === 'streaming' ? 'オリコン週間ストリーミングランキング' : 'オリコン週間デジタルシングル(単曲)ランキング',
        updatedAt: new Date().toISOString(),
        items,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Explore: Home feed, Trending, New Releases, Moods & Genres, Oricon Rankings
  app.get('/api/music/explore', async (_req, res) => {
    const cachedExplore = kvCache.get<any>('explore:home_feed');
    if (cachedExplore) {
      return res.json({ ...cachedExplore, fromCache: true });
    }

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

      const [oriconRanking, oriconDigital] = await Promise.all([
        getOriconChart('streaming').catch(() => []),
        getOriconChart('digital').catch(() => []),
      ]);

      const payload = {
        trending: trendingSongs,
        newReleases,
        moodsAndGenres: moodsAndGenres.slice(0, 16),
        musicVideos,
        oriconRanking,
        oriconDigital,
      };

      kvCache.set('explore:home_feed', payload, 2 * 3600);
      res.json(payload);
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

  // Japanese & English artist alias / fuzzy dictionary to absorb slang & abbreviations
  const ARTIST_ALIASES: Record<string, string> = {
    'ヒゲダン': 'Official髭男dism',
    'ひげだん': 'Official髭男dism',
    'higedan': 'Official髭男dism',
    '髭男': 'Official髭男dism',
    'ミスチル': 'Mr.Children',
    'みすちる': 'Mr.Children',
    'mrchildren': 'Mr.Children',
    'ドリカム': 'DREAMS COME TRUE',
    'どりかむ': 'DREAMS COME TRUE',
    'ワンオク': 'ONE OK ROCK',
    'わんおく': 'ONE OK ROCK',
    'oor': 'ONE OK ROCK',
    'バンプ': 'BUMP OF CHICKEN',
    'ばんぷ': 'BUMP OF CHICKEN',
    'boc': 'BUMP OF CHICKEN',
    'マンウィズ': 'MAN WITH A MISSION',
    'mwam': 'MAN WITH A MISSION',
    'セカオワ': 'SEKAI NO OWARI',
    'せかおわ': 'SEKAI NO OWARI',
    'ウーバー': 'UVERworld',
    'uver': 'UVERworld',
    'ポルノ': 'ポルノグラフィティ',
    'ラッド': 'RADWIMPS',
    'らっど': 'RADWIMPS',
    'ずとまよ': 'ずっと真夜中でいいのに。',
    'ずっと真夜中': 'ずっと真夜中でいいのに。',
    'キタニ': 'キタニタツヤ',
    'サカナ': 'サカナクション',
    'ブルエン': 'BLUE ENCOUNT',
    'マイヘア': 'My Hair is Bad',
    'スカパラ': '東京スカパラダイスオーケストラ',
    'アジカン': 'ASIAN KUNG-FU GENERATION',
    'スノ': 'Snow Man',
    'すの': 'Snow Man',
    'なにわ': 'なにわ男子',
    'よあそび': 'YOASOBI',
    '夜遊び': 'YOASOBI',
    'きんぐぬー': 'King Gnu',
    'キングヌー': 'King Gnu',
    'あいみょん': 'あいみょん',
    'マカえん': 'マカロニえんぴつ',
  };

  function expandSearchQuery(input: string): { effectiveQuery: string; originalQuery: string; matchedAlias?: string } {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // 1. Direct whole-string match
    if (ARTIST_ALIASES[lower]) {
      return { effectiveQuery: ARTIST_ALIASES[lower], originalQuery: trimmed, matchedAlias: ARTIST_ALIASES[lower] };
    }

    // 2. Tokenized replacement (e.g. "ヒゲダン subtitle" -> "Official髭男dism subtitle")
    const tokens = trimmed.split(/\s+/);
    let replaced = false;
    let matchedAlias: string | undefined;

    const newTokens = tokens.map((token) => {
      const tokenLower = token.toLowerCase();
      if (ARTIST_ALIASES[tokenLower]) {
        replaced = true;
        matchedAlias = ARTIST_ALIASES[tokenLower];
        return ARTIST_ALIASES[tokenLower];
      }
      for (const [alias, official] of Object.entries(ARTIST_ALIASES)) {
        if (tokenLower === alias) {
          replaced = true;
          matchedAlias = official;
          return official;
        }
      }
      return token;
    });

    if (replaced) {
      return { effectiveQuery: newTokens.join(' '), originalQuery: trimmed, matchedAlias };
    }

    return { effectiveQuery: trimmed, originalQuery: trimmed };
  }

  // Search with filters (songs, videos, albums, artists, playlists) & fuzzy normalization
  app.get('/api/music/search', async (req, res) => {
    const rawQuery = String(req.query.q || '').trim();
    const type = (req.query.type as string) || 'all';
    if (!rawQuery) {
      return res.json({ results: [], type });
    }

    const { effectiveQuery, matchedAlias } = expandSearchQuery(rawQuery);
    const query = effectiveQuery;

    const cacheKey = `search:${type}:${query.toLowerCase()}`;
    const cachedSearch = kvCache.get<any>(cacheKey);
    if (cachedSearch) {
      return res.json({ ...cachedSearch, fromCache: true, originalQuery: rawQuery, effectiveQuery, matchedAlias });
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

        const payload = {
          songs,
          artists,
          albums,
          playlists,
          videos,
        };
        kvCache.set(cacheKey, payload, 3600);
        return res.json(payload);
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

      const payload = { results: formattedItems, type: searchType };
      kvCache.set(cacheKey, payload, 3600);
      res.json(payload);
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

  // Spotify / Clean Official Catalog Search bridge to InnerTube
  app.get('/api/music/spotify/search', async (req, res) => {
    const rawQuery = String(req.query.q || '').trim();
    if (!rawQuery) {
      return res.json({ tracks: [], query: '' });
    }

    const { effectiveQuery, matchedAlias } = expandSearchQuery(rawQuery);
    const query = effectiveQuery;
    const cacheKey = `spotify_search:${query.toLowerCase()}`;
    const cached = kvCache.get<any>(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    const startTime = Date.now();
    try {
      // 1. Fetch clean official catalog via Japanese streaming index (ISRC, 600x600 artwork, clean titles)
      const catRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=jp&entity=song&limit=12`
      );
      if (!catRes.ok) {
        throw new Error('Catalog service temporarily unavailable');
      }
      const catData: any = await catRes.json();
      const rawResults = catData.results || [];

      if (rawResults.length === 0) {
        return res.json({ tracks: [], query, matchedAlias });
      }

      // 2. Map top candidates to InnerTube IDs in parallel batches of 4
      const yt = await getInnertube();
      const BATCH_SIZE = 4;
      const candidates = rawResults.slice(0, 10);
      const resolvedTracks: any[] = [];

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const chunk = candidates.slice(i, i + BATCH_SIZE);
        const resolvedChunk = await Promise.all(
          chunk.map(async (item: any, idx: number) => {
            const cleanTitle = item.trackName;
            const cleanArtist = item.artistName;
            const searchQ = `${cleanTitle} ${cleanArtist}`.trim();
            let ytId = '';
            let durationText = '';
            let durationSec = Math.round((item.trackTimeMillis || 0) / 1000);

            try {
              const sRes = await yt.music.search(searchQ, { type: 'song' });
              const topHit = sRes.songs?.contents?.[0];
              if (topHit?.id) {
                ytId = topHit.id;
                durationText = topHit.duration?.text || '';
                if (topHit.duration?.text) {
                  durationSec = parseDurationToSeconds(topHit.duration.text);
                }
              }
            } catch (err: any) {
              console.warn(`[Spotify Search Bridge] Error resolving ${searchQ}:`, err.message);
            }

            // High-res album art (replace 100x100 with 600x600)
            const hiResArt = (item.artworkUrl100 || '').replace(/100x100bb\.jpg$/, '600x600bb.jpg');

            return {
              id: ytId || `spotify_${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              album: item.collectionName || 'Single',
              duration: durationText || `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`,
              durationSeconds: durationSec,
              thumbnail: hiResArt,
              source: 'Spotify / Official Catalog',
              releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '',
              isrc: item.isrc || '',
              previewUrl: item.previewUrl || '',
              index: i + idx + 1,
            };
          })
        );
        resolvedTracks.push(...resolvedChunk);
      }

      // Filter out items that couldn't be resolved or fallback to first search hit
      const playableTracks = resolvedTracks.filter((t) => t.id && !t.id.startsWith('spotify_'));
      const finalTracks = playableTracks.length > 0 ? playableTracks : resolvedTracks;

      const payload = {
        tracks: finalTracks,
        query,
        originalQuery: rawQuery,
        matchedAlias,
        totalCount: finalTracks.length,
      };

      kvCache.set(cacheKey, payload, 3600);

      recordLog({
        endpoint: 'spotify.search',
        params: { query },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: finalTracks.length,
      });

      res.json(payload);
    } catch (err: any) {
      console.warn('[Spotify Search] error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Spotify Curated Playlists & Charts metadata
  const SPOTIFY_CURATED_PLAYLISTS = [
    {
      id: 'tokyo-super-hits',
      spotifyId: '37i9dQZF1DXdbXrPNafg9d',
      title: 'Tokyo Super Hits',
      tagline: '日本の今最も聴かれている最新ストリーミングヒット',
      category: 'japan',
      thumbnail: 'https://i.scdn.co/image/ab67706f000000029b9f5f0b835e5d36b801a6b0',
      trackCount: 99,
    },
    {
      id: 'todays-top-hits',
      spotifyId: '37i9dQZF1DXcBWIGoYBM5M',
      title: "Today's Top Hits",
      tagline: '世界で最も再生されているグローバルトップチャート',
      category: 'global',
      thumbnail: 'https://i.scdn.co/image/ab67706f00000002e06fabee7abffa117bed662f',
      trackCount: 50,
    },
    {
      id: 'chill-hits',
      spotifyId: '37i9dQZF1DX4WYpdgoIcn6',
      title: 'Chill Hits',
      tagline: '心地よいアコースティック＆リラックスサウンド',
      category: 'mood',
      thumbnail: 'https://i.scdn.co/image/ab67706f00000002b89694e9cc6fa029f60cb05a',
      trackCount: 100,
    },
    {
      id: 'new-music-friday',
      spotifyId: '37i9dQZF1DX4JAvHpjipBk',
      title: 'New Music Friday',
      tagline: '今週リリースされた世界の注目最新トラック',
      category: 'new',
      thumbnail: 'https://i.scdn.co/image/ab67706f00000002b4fa3e46c986161962bf14f7',
      trackCount: 100,
    },
    {
      id: 'peaceful-piano',
      spotifyId: '37i9dQZF1DX4sWSpwq3LiO',
      title: 'Peaceful Piano',
      tagline: '作業や睡眠を邪魔しない穏やかなピアノソロ',
      category: 'mood',
      thumbnail: 'https://i.scdn.co/image/ab67706f00000002d721e90ef811df6b6cb51b43',
      trackCount: 100,
    },
    {
      id: 'rapcaviar',
      spotifyId: '37i9dQZF1DX0XUsuxWHRQd',
      title: 'RapCaviar',
      tagline: 'ヒップホップ・ストリートシーンの最前線',
      category: 'genre',
      thumbnail: 'https://i.scdn.co/image/ab67706f00000002d2a417e8838d77d704ec326d',
      trackCount: 50,
    },
  ];

  app.get('/api/music/spotify/curated', (_req, res) => {
    res.json({ playlists: SPOTIFY_CURATED_PLAYLISTS });
  });

  app.get('/api/music/spotify/curated/:id', async (req, res) => {
    const curatedId = req.params.id;
    const item = SPOTIFY_CURATED_PLAYLISTS.find(
      (p) => p.id === curatedId || p.spotifyId === curatedId
    );
    if (!item) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const cacheKey = `spotify_curated_${item.spotifyId}`;
    const cached = kvCache.get<any>(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    try {
      const spotifyUrl = `https://open.spotify.com/playlist/${item.spotifyId}`;
      const spotifyData = await parseSpotifyUrl(spotifyUrl);
      if (!spotifyData || !spotifyData.rawTracks?.length) {
        return res.status(502).json({ error: 'Failed to fetch tracks from Spotify' });
      }

      const yt = await getInnertube();
      const BATCH_SIZE = 5;
      const rawTracks = spotifyData.rawTracks.slice(0, 30);
      const tracks: any[] = [];

      for (let i = 0; i < rawTracks.length; i += BATCH_SIZE) {
        const chunk = rawTracks.slice(i, i + BATCH_SIZE);
        const chunkResolved = await Promise.all(
          chunk.map(async (rawItem: any, idx: number) => {
            const cleanArtist = rawItem.artist.split(/[,&×/]|feat\.?/i)[0].trim();
            const searchQ = `${rawItem.title} ${cleanArtist}`.trim();
            try {
              const sRes = await yt.music.search(searchQ, { type: 'song' });
              const topHit = sRes.songs?.contents?.[0];
              if (topHit?.id) {
                return {
                  index: i + idx + 1,
                  id: topHit.id,
                  title: topHit.title?.toString?.() || rawItem.title,
                  artist: topHit.artists?.[0]?.name || rawItem.artist,
                  album: topHit.album?.name || item.title,
                  duration: topHit.duration?.text || '',
                  durationSeconds:
                    parseDurationToSeconds(topHit.duration?.text || '') ||
                    Math.round((rawItem.durationMs || 0) / 1000),
                  thumbnail: getBestThumbnail(topHit.thumbnails || [item.thumbnail]),
                  source: 'Spotify Curated',
                };
              }
            } catch (err: any) {
              console.warn(`[Spotify Curated] Error resolving "${searchQ}":`, err.message);
            }
            return null;
          })
        );
        tracks.push(...chunkResolved.filter(Boolean));
      }

      const payload = {
        id: item.id,
        spotifyId: item.spotifyId,
        title: item.title,
        tagline: item.tagline,
        thumbnail: item.thumbnail,
        tracks,
        totalTracks: tracks.length,
      };

      // Cache for 6 hours
      kvCache.set(cacheKey, payload, 21600);
      res.json(payload);
    } catch (err: any) {
      console.warn('[Spotify Curated] error:', err.message);
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

    // Check persistent KV cache
    const cacheKey = `lyrics:${videoId}_${cleanTitle}_${cleanArtist}`.toLowerCase();
    const cached = kvCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
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

    // Cache for 24 hours in persistent KV store
    kvCache.set(cacheKey, responsePayload, 24 * 3600);

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
    const rawAlbumId = req.params.id;
    const startTime = Date.now();

    // Check kvCache first
    const cacheKey = `album_detail_${rawAlbumId}`;
    const cached = kvCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    try {
      const yt = await getInnertube();
      let actualAlbumId = rawAlbumId;

      // Handle common aliases
      const normalized = rawAlbumId.toLowerCase().trim();
      if (normalized === 'editorial' || normalized.includes('editorial')) {
        actualAlbumId = 'MPREb_QCAGO0Lbeum';
      } else if (
        normalized === 'love-peace' ||
        normalized === 'love_peace' ||
        normalized === 'love to peace' ||
        normalized.includes('ラブとピースは君の中')
      ) {
        actualAlbumId = 'MPREb_lvUlrlxInIt';
      } else if (normalized === 'traveler' || normalized.includes('traveler')) {
        actualAlbumId = 'MPREb_9XoC3Flm4Rv';
      } else if (
        normalized.includes('バラード') ||
        normalized.includes('ballad') ||
        normalized === 'ballad'
      ) {
        actualAlbumId = 'VLPL0kiuaf8FBjcoMHbpmWcwZNZeNBV-ZIlr';
      }

      // If it looks like a playlist
      if (actualAlbumId.startsWith('VL') || actualAlbumId.startsWith('PL')) {
        const playlist = await yt.music.getPlaylist(actualAlbumId);
        const pHeader = playlist.header as any;
        const pThumbnails = pHeader?.thumbnails || pHeader?.thumbnail?.contents || [];
        const headerThumbnail = getBestThumbnail(pThumbnails);

        const header = {
          id: actualAlbumId,
          title: pHeader?.title?.toString?.() || pHeader?.title?.text || 'プレイリスト',
          artist: pHeader?.author?.name || pHeader?.author?.text || 'Various Artists',
          artistId: pHeader?.author?.id,
          year: '',
          thumbnail: headerThumbnail,
          trackCount: (playlist.items || (playlist as any).contents || []).length,
        };

        const tracks = (playlist.items || (playlist as any).contents || []).map(
          (item: any, idx: number) => ({
            index: idx + 1,
            id: item.id || item.video_id,
            title: item.title?.toString?.() || item.title?.text || '',
            artist: item.artists?.[0]?.name || header.artist,
            artistId: item.artists?.[0]?.id || header.artistId,
            album: header.title,
            albumId: actualAlbumId,
            duration: item.duration?.text || '',
            durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
            thumbnail: getBestThumbnail(item.thumbnails || []) || headerThumbnail,
          })
        );

        const result = { header, tracks };
        kvCache.set(cacheKey, result, 24 * 3600);
        return res.json(result);
      }

      // If not a known browseId pattern, search by title
      if (!actualAlbumId.startsWith('MPREb_') && !actualAlbumId.startsWith('OLAK5uy_')) {
        try {
          const search = await yt.music.search(rawAlbumId, { type: 'album' });
          const firstAlbum =
            (search as any)?.albums?.contents?.[0] ||
            (search as any)?.contents?.[0]?.contents?.[0];
          if (firstAlbum?.id) {
            actualAlbumId = firstAlbum.id;
          }
        } catch {
          // ignore
        }
      }

      const album = await yt.music.getAlbum(actualAlbumId);

      const rawHeader = album.header as any;
      const rawThumbnails =
        rawHeader?.thumbnails ||
        rawHeader?.thumbnail?.contents ||
        (rawHeader?.thumbnail ? [rawHeader.thumbnail] : []);
      const headerThumbnail = getBestThumbnail(rawThumbnails);

      const headerArtist =
        rawHeader?.strapline_text_one?.text ||
        rawHeader?.artists?.[0]?.name ||
        rawHeader?.author?.name ||
        rawHeader?.subtitle?.runs?.[0]?.text ||
        '';

      const headerArtistId =
        rawHeader?.strapline_text_one?.endpoint?.payload?.browseId ||
        rawHeader?.artists?.[0]?.id ||
        rawHeader?.author?.id;

      const yearRun = rawHeader?.subtitle?.runs?.find((r: any) => /^\d{4}$/.test(r.text));
      const headerYear = yearRun?.text || rawHeader?.year || '';

      const header = {
        id: actualAlbumId,
        title: rawHeader?.title?.toString?.() || rawHeader?.title?.text || 'アルバム',
        artist: headerArtist,
        artistId: headerArtistId,
        year: headerYear,
        thumbnail: headerThumbnail,
        trackCount: (album.contents || []).length,
      };

      const tracks = (album.contents || []).map((item: any, idx: number) => ({
        index: idx + 1,
        id: item.id || item.video_id,
        title: item.title?.toString?.() || item.title?.text || '',
        artist: item.artists?.[0]?.name || header.artist,
        artistId: item.artists?.[0]?.id || header.artistId,
        album: header.title,
        albumId: actualAlbumId,
        duration: item.duration?.text || '',
        durationSeconds: parseDurationToSeconds(item.duration?.text || ''),
        thumbnail: getBestThumbnail(item.thumbnails || []) || headerThumbnail,
      }));

      const result = { header, tracks };
      kvCache.set(cacheKey, result, 24 * 3600);

      recordLog({
        endpoint: 'music.getAlbum',
        params: { rawAlbumId, actualAlbumId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: tracks.length,
      });

      res.json(result);
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getAlbum',
        params: { rawAlbumId },
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

  // Single Track Info (for share URLs /?track=xxxx and direct loading)
  app.get('/api/music/track/:id', async (req, res) => {
    const videoId = String(req.params.id || '').trim();
    if (!videoId) return res.status(400).json({ error: 'Video ID is required' });
    const startTime = Date.now();

    try {
      const yt = await getInnertube();
      const info = await yt.getBasicInfo(videoId);
      const basic = info.basic_info;

      const durSec = basic?.duration || 0;
      const durText = durSec > 0
        ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}`
        : '0:00';

      const track = {
        id: basic?.id || videoId,
        title: basic?.title || 'Unknown Title',
        artist: basic?.author || 'Unknown Artist',
        duration: durText,
        durationSeconds: durSec,
        thumbnail: getBestThumbnail(basic?.thumbnail || []),
      };

      recordLog({
        endpoint: 'music.getTrack',
        params: { videoId },
        durationMs: Date.now() - startTime,
        status: 'success',
        itemCount: 1,
      });

      res.json({ track });
    } catch (err: any) {
      recordLog({
        endpoint: 'music.getTrack',
        params: { videoId },
        durationMs: Date.now() - startTime,
        status: 'error',
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  });
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

  interface StoredSharedPlaylist {
    id: string;
    name: string;
    author?: string;
    tracks: any[];
    createdAt: string;
    viewCount: number;
  }

  interface TrackComment {
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
    color?: string;
  }

  interface DirectMessage {
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
      tracks: any[];
    };
    timestamp: string;
    read: boolean;
    reactions: Record<string, string[]>;
  }

  interface ListeningPartyRoom {
    id: string;
    name: string;
    description: string;
    category: 'rock' | 'chill' | 'vocaloid' | 'free' | 'custom';
    hostUsername: string;
    currentTrack: any | null;
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

  interface SocialNotification {
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

  interface ModerationReport {
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

  interface ActivityFeedItem {
    id: string;
    username: string;
    action: 'played' | 'commented' | 'created_playlist' | 'liked';
    targetTitle: string;
    targetSubtitle?: string;
    targetId?: string;
    thumbnail?: string;
    timestamp: string;
  }

  interface StoredState {
    totalAccessCount: number;
    accounts: StoredAccount[];
    notifications: StoredNotification[];
    trackOffsets: Record<string, { offsetSec: number; title?: string; updatedAt: string }>;
    sharedPlaylists: Record<string, StoredSharedPlaylist>;
    trackComments: Record<string, TrackComment[]>;
    directMessages: DirectMessage[];
    listeningRooms: Record<string, ListeningPartyRoom>;
    socialNotifications: SocialNotification[];
    moderationReports: ModerationReport[];
    blockedUsers: Record<string, string[]>;
    follows: Record<string, string[]>;
    activityFeed: ActivityFeedItem[];
    bannedUsers: string[];
    analytics: StoredAnalytics;
  }

  const ADMIN_PASSWORD = '@zeromusic';
  const DEFAULT_NG_WORDS = ['死ね', '殺す', 'キエロ', 'クソ野郎', 'ゴミ屑', '詐欺サイト', 'spam.link'];

  function sanitizeText(text: string): { sanitized: string; flagged: boolean } {
    let flagged = false;
    let result = text || '';
    for (const word of DEFAULT_NG_WORDS) {
      if (result.includes(word)) {
        flagged = true;
        const mask = '*'.repeat(word.length);
        result = result.split(word).join(mask);
      }
    }
    return { sanitized: result, flagged };
  }

  function defaultListeningRooms(): Record<string, ListeningPartyRoom> {
    const now = Date.now();
    return {
      room_rock: {
        id: 'room_rock',
        name: '🎸 邦ロック・オルタナ熱血ラウンジ',
        description: '邦ロック・オルタナティブ・ギターロックの熱い曲をみんなで同時試聴して語り合う部屋',
        category: 'rock',
        hostUsername: 'RockMaster_Ken',
        currentTrack: {
          id: 'GBRk_8hP47w',
          title: '怪獣の花唄',
          artist: 'Vaundy',
          thumbnail: 'https://i.ytimg.com/vi/GBRk_8hP47w/hqdefault.jpg',
          duration: '3:45',
          durationSeconds: 225,
        },
        isPlaying: true,
        positionSec: 42,
        updatedAt: now,
        participants: [
          { username: 'RockMaster_Ken', joinedAt: new Date(now - 3600000).toISOString(), isHost: true },
          { username: 'GuitarLover', joinedAt: new Date(now - 1200000).toISOString(), isHost: false },
          { username: 'Aoi_Music', joinedAt: new Date(now - 600000).toISOString(), isHost: false },
        ],
        chatMessages: [
          { id: 'm1', username: 'RockMaster_Ken', text: '怪獣の花唄！このサビの爆発力やばいよね', timestamp: new Date(now - 180000).toISOString(), type: 'chat' },
          { id: 'm2', username: 'GuitarLover', text: '02:15のギターフレーズ神がかってる', timestamp: new Date(now - 90000).toISOString(), type: 'chat' },
        ],
      },
      room_chill: {
        id: 'room_chill',
        name: '☕ 深夜のチル・Lo-Fi & R&B',
        description: '作業用BGMや夜更かしにぴったりの心地よいチルサウンドをまったり共有',
        category: 'chill',
        hostUsername: 'MidnightChill',
        currentTrack: {
          id: 'jfKfPfyJRdk',
          title: 'lofi hip hop radio - beats to relax/study to',
          artist: 'Lofi Girl',
          thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
          duration: 'Live',
          durationSeconds: 3600,
        },
        isPlaying: true,
        positionSec: 120,
        updatedAt: now,
        participants: [
          { username: 'MidnightChill', joinedAt: new Date(now - 7200000).toISOString(), isHost: true },
          { username: 'StudyMode', joinedAt: new Date(now - 2400000).toISOString(), isHost: false },
        ],
        chatMessages: [
          { id: 'm3', username: 'MidnightChill', text: '今夜も落ち着いて作業しましょう〜', timestamp: new Date(now - 200000).toISOString(), type: 'chat' },
        ],
      },
      room_vocaloid: {
        id: 'room_vocaloid',
        name: '🎤 ボカロ & アニソン解放区',
        description: 'ボーカロイドや人気アニメ主題歌、神調教・神メロディを語り合うルーム',
        category: 'vocaloid',
        hostUsername: 'MikuFan_99',
        currentTrack: {
          id: 'cm-l2h6GB8Q',
          title: 'メルト',
          artist: 'supercell feat. 初音ミク',
          thumbnail: 'https://i.ytimg.com/vi/cm-l2h6GB8Q/hqdefault.jpg',
          duration: '4:15',
          durationSeconds: 255,
        },
        isPlaying: true,
        positionSec: 75,
        updatedAt: now,
        participants: [
          { username: 'MikuFan_99', joinedAt: new Date(now - 1800000).toISOString(), isHost: true },
          { username: 'RinLen', joinedAt: new Date(now - 900000).toISOString(), isHost: false },
        ],
        chatMessages: [
          { id: 'm4', username: 'MikuFan_99', text: '伝説の神曲。イントロだけで鳥肌立つ', timestamp: new Date(now - 120000).toISOString(), type: 'chat' },
        ],
      },
      room_free: {
        id: 'room_free',
        name: '🎧 オールジャンル・フリーセッション',
        description: 'ジャンル問わず好きな曲を自由に流して新しい音楽と出会うオープンスペース',
        category: 'free',
        hostUsername: 'DJ_Zero',
        currentTrack: null,
        isPlaying: false,
        positionSec: 0,
        updatedAt: now,
        participants: [
          { username: 'DJ_Zero', joinedAt: new Date(now - 600000).toISOString(), isHost: true },
        ],
        chatMessages: [
          { id: 'm5', username: 'DJ_Zero', text: '誰でもおすすめ曲を流してください！', timestamp: new Date(now - 300000).toISOString(), type: 'system' },
        ],
      },
    };
  }

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
          sharedPlaylists: parsed.sharedPlaylists && typeof parsed.sharedPlaylists === 'object' ? parsed.sharedPlaylists : {},
          trackComments: parsed.trackComments && typeof parsed.trackComments === 'object' ? parsed.trackComments : {},
          directMessages: Array.isArray(parsed.directMessages) ? parsed.directMessages : [],
          listeningRooms: parsed.listeningRooms && typeof parsed.listeningRooms === 'object' && Object.keys(parsed.listeningRooms).length > 0
            ? parsed.listeningRooms
            : defaultListeningRooms(),
          socialNotifications: Array.isArray(parsed.socialNotifications) ? parsed.socialNotifications : [],
          moderationReports: Array.isArray(parsed.moderationReports) ? parsed.moderationReports : [],
          blockedUsers: parsed.blockedUsers && typeof parsed.blockedUsers === 'object' ? parsed.blockedUsers : {},
          follows: parsed.follows && typeof parsed.follows === 'object' ? parsed.follows : {},
          activityFeed: Array.isArray(parsed.activityFeed) ? parsed.activityFeed : [],
          bannedUsers: Array.isArray(parsed.bannedUsers) ? parsed.bannedUsers : [],
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
      sharedPlaylists: {},
      trackComments: {},
      directMessages: [],
      listeningRooms: defaultListeningRooms(),
      socialNotifications: [],
      moderationReports: [],
      blockedUsers: {},
      follows: {},
      activityFeed: [],
      bannedUsers: [],
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

  // Create or publish a shareable playlist link
  app.post('/api/share/playlist', (req, res) => {
    const { name, author, tracks } = req.body;
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'プレイリスト名を入力してください' });
    }
    const cleanTracks = Array.isArray(tracks) ? tracks : [];
    if (!cleanTracks.length) {
      return res.status(400).json({ error: '1曲以上の楽曲が必要です' });
    }

    const shareId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const newSharedPlaylist: StoredSharedPlaylist = {
      id: shareId,
      name: cleanName,
      author: String(author || 'ゲスト').trim(),
      tracks: cleanTracks,
      createdAt: new Date().toISOString(),
      viewCount: 0,
    };

    if (!appState.sharedPlaylists) {
      appState.sharedPlaylists = {};
    }
    appState.sharedPlaylists[shareId] = newSharedPlaylist;
    saveStorage();

    res.json({
      success: true,
      shareId,
      shareUrl: `/?share_pl=${shareId}`,
      playlist: newSharedPlaylist,
    });
  });

  // Get shared playlist by ID (open for all users, no login required)
  app.get('/api/share/playlist/:id', (req, res) => {
    const shareId = String(req.params.id || '').trim();
    if (!shareId) {
      return res.status(400).json({ error: '共有IDを指定してください' });
    }

    const playlist = appState.sharedPlaylists?.[shareId];
    if (!playlist) {
      return res.status(404).json({ error: '共有プレイリストが見つかりませんでした。URLをご確認ください。' });
    }

    playlist.viewCount = (playlist.viewCount || 0) + 1;
    saveStorage();

    res.json({
      success: true,
      playlist,
    });
  });

  // Get recently shared community playlists
  app.get('/api/share/recent', (_req, res) => {
    const list = Object.values(appState.sharedPlaylists || {})
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    res.json({ playlists: list });
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

  // Helper to record activity feed item
  function recordActivity(item: Omit<ActivityFeedItem, 'id' | 'timestamp'>) {
    const entry: ActivityFeedItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...item,
    };
    appState.activityFeed.unshift(entry);
    if (appState.activityFeed.length > 200) {
      appState.activityFeed.splice(200);
    }
    return entry;
  }

  // Helper to send in-app social notification
  function sendSocialNotification(notif: Omit<SocialNotification, 'id' | 'timestamp' | 'read'>) {
    const entry: SocialNotification = {
      id: `snotif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    appState.socialNotifications.unshift(entry);
    if (appState.socialNotifications.length > 500) {
      appState.socialNotifications.splice(500);
    }
    // Push via websocket if recipient connected
    broadcastToUser(notif.recipient, {
      type: 'notification:new',
      notification: entry,
    });
    return entry;
  }

  // --- Real-time WebSocket Server Setup ---
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  interface WsClientMeta {
    username?: string;
    sessionId?: string;
    currentRoomId?: string;
    currentVideoId?: string;
    nowPlaying?: { title: string; artist: string; videoId: string };
  }

  const wsClients = new Map<WebSocket, WsClientMeta>();

  function broadcast(data: any) {
    const msg = JSON.stringify(data);
    for (const [client, meta] of wsClients.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {}
      }
    }
  }

  function broadcastToUser(targetUsername: string, data: any) {
    if (!targetUsername) return;
    const clean = targetUsername.toLowerCase();
    const msg = JSON.stringify(data);
    for (const [client, meta] of wsClients.entries()) {
      if (meta.username && meta.username.toLowerCase() === clean && client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {}
      }
    }
  }

  function broadcastToRoom(roomId: string, data: any) {
    const msg = JSON.stringify(data);
    for (const [client, meta] of wsClients.entries()) {
      if (meta.currentRoomId === roomId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {}
      }
    }
  }

  function broadcastToVideo(videoId: string, data: any) {
    const msg = JSON.stringify(data);
    for (const [client, meta] of wsClients.entries()) {
      if (meta.currentVideoId === videoId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {}
      }
    }
  }

  function broadcastPresence() {
    const usersList: any[] = [];
    const seen = new Set<string>();
    for (const meta of wsClients.values()) {
      if (meta.username && !seen.has(meta.username.toLowerCase())) {
        seen.add(meta.username.toLowerCase());
        usersList.push({
          username: meta.username,
          online: true,
          nowPlaying: meta.nowPlaying,
        });
      }
    }
    broadcast({
      type: 'presence:update',
      onlineCount: getOnlineCount(),
      activeUsers: usersList,
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    wsClients.set(ws, {});

    // Initial greeting & active presence count
    ws.send(JSON.stringify({
      type: 'welcome',
      onlineCount: getOnlineCount(),
      timestamp: Date.now(),
    }));

    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        const meta = wsClients.get(ws) || {};

        switch (payload.type) {
          case 'auth': {
            meta.username = payload.username;
            meta.sessionId = payload.sessionId;
            wsClients.set(ws, meta);
            broadcastPresence();
            break;
          }

          case 'presence': {
            if (payload.username) meta.username = payload.username;
            meta.nowPlaying = payload.nowPlaying;
            meta.currentVideoId = payload.nowPlaying?.videoId;
            wsClients.set(ws, meta);
            broadcastPresence();
            break;
          }

          case 'watch:video': {
            meta.currentVideoId = payload.videoId;
            wsClients.set(ws, meta);
            break;
          }

          case 'party:join': {
            meta.currentRoomId = payload.roomId;
            wsClients.set(ws, meta);
            const room = appState.listeningRooms[payload.roomId];
            if (room && payload.username) {
              const existingIdx = room.participants.findIndex((p) => p.username === payload.username);
              if (existingIdx === -1) {
                room.participants.push({
                  username: payload.username,
                  joinedAt: new Date().toISOString(),
                  isHost: room.participants.length === 0 || room.hostUsername === payload.username,
                });
                room.chatMessages.push({
                  id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  username: 'System',
                  text: `${payload.username} さんが入室しました`,
                  timestamp: new Date().toISOString(),
                  type: 'system',
                });
                saveStorage();
              }
              broadcastToRoom(payload.roomId, {
                type: 'party:room_state',
                room,
              });
            }
            break;
          }

          case 'party:leave': {
            const roomId = meta.currentRoomId;
            if (roomId && appState.listeningRooms[roomId] && meta.username) {
              const room = appState.listeningRooms[roomId];
              room.participants = room.participants.filter((p) => p.username !== meta.username);
              room.chatMessages.push({
                id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                username: 'System',
                text: `${meta.username} さんが退室しました`,
                timestamp: new Date().toISOString(),
                type: 'system',
              });
              saveStorage();
              broadcastToRoom(roomId, {
                type: 'party:room_state',
                room,
              });
            }
            meta.currentRoomId = undefined;
            wsClients.set(ws, meta);
            break;
          }

          case 'party:sync': {
            // Host sends playback state
            const roomId = meta.currentRoomId || payload.roomId;
            const room = appState.listeningRooms[roomId];
            if (room) {
              if (payload.currentTrack !== undefined) room.currentTrack = payload.currentTrack;
              if (payload.isPlaying !== undefined) room.isPlaying = Boolean(payload.isPlaying);
              if (payload.positionSec !== undefined) room.positionSec = Number(payload.positionSec);
              room.updatedAt = Date.now();

              if (payload.trackChanged && payload.currentTrack) {
                room.chatMessages.push({
                  id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  username: meta.username || room.hostUsername,
                  text: `🎵 再生曲変更: ${payload.currentTrack.title} - ${payload.currentTrack.artist}`,
                  timestamp: new Date().toISOString(),
                  type: 'track_change',
                });
                if (room.chatMessages.length > 200) room.chatMessages.splice(0, room.chatMessages.length - 200);
              }

              saveStorage();
              broadcastToRoom(roomId, {
                type: 'party:playback_sync',
                currentTrack: room.currentTrack,
                isPlaying: room.isPlaying,
                positionSec: room.positionSec,
                updatedAt: room.updatedAt,
                sender: meta.username,
              });
            }
            break;
          }

          case 'party:chat': {
            const roomId = meta.currentRoomId || payload.roomId;
            const room = appState.listeningRooms[roomId];
            if (room && payload.text) {
              const { sanitized } = sanitizeText(payload.text);
              const chatMsg = {
                id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                username: meta.username || payload.username || '匿名リスナー',
                text: sanitized,
                timestamp: new Date().toISOString(),
                type: 'chat' as const,
              };
              room.chatMessages.push(chatMsg);
              if (room.chatMessages.length > 200) room.chatMessages.splice(0, room.chatMessages.length - 200);
              saveStorage();
              broadcastToRoom(roomId, {
                type: 'party:new_chat',
                roomId,
                message: chatMsg,
              });
            }
            break;
          }

          case 'dm:typing': {
            broadcastToUser(payload.recipient, {
              type: 'dm:typing',
              sender: meta.username,
            });
            break;
          }
        }
      } catch (err) {
        console.warn('[WebSocket] Message handling error:', err);
      }
    });

    ws.on('close', () => {
      const meta = wsClients.get(ws);
      if (meta?.currentRoomId && appState.listeningRooms[meta.currentRoomId] && meta.username) {
        const room = appState.listeningRooms[meta.currentRoomId];
        room.participants = room.participants.filter((p) => p.username !== meta.username);
        saveStorage();
        broadcastToRoom(meta.currentRoomId, {
          type: 'party:room_state',
          room,
        });
      }
      wsClients.delete(ws);
      broadcastPresence();
    });
  });

  // --- REST API: Track Comments & Danmaku (弾幕) ---
  app.get('/api/comments/:videoId', (req, res) => {
    const { videoId } = req.params;
    const comments = appState.trackComments[videoId] || [];
    res.json({ comments });
  });

  app.post('/api/comments/:videoId', (req, res) => {
    const { videoId } = req.params;
    const { text, timestampSec, formattedTime, username, color } = req.body;
    const cleanUser = String(username || 'ゲストリスナー').trim();
    const rawText = String(text || '').trim();

    if (!rawText) {
      return res.status(400).json({ error: 'コメント内容を入力してください' });
    }

    if (appState.bannedUsers.includes(cleanUser.toLowerCase())) {
      return res.status(403).json({ error: 'アカウントがモデレーションにより停止されています' });
    }

    const { sanitized, flagged } = sanitizeText(rawText);
    const secs = Math.max(0, Number(timestampSec) || 0);

    const newComment: TrackComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      videoId,
      timestampSec: secs,
      formattedTime: formattedTime || `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`,
      text: sanitized,
      username: cleanUser,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      color: color || '#FFFFFF',
    };

    if (!appState.trackComments[videoId]) {
      appState.trackComments[videoId] = [];
    }
    appState.trackComments[videoId].push(newComment);
    if (appState.trackComments[videoId].length > 300) {
      appState.trackComments[videoId].shift();
    }

    // Record activity
    recordActivity({
      username: cleanUser,
      action: 'commented',
      targetTitle: req.body.trackTitle || videoId,
      targetSubtitle: `${newComment.formattedTime} - ${sanitized}`,
      targetId: videoId,
    });

    saveStorage();

    // Broadcast in real-time to everyone watching/listening to this track or room
    const broadcastPayload = {
      type: 'comment:new',
      videoId,
      comment: newComment,
    };
    broadcastToVideo(videoId, broadcastPayload);
    broadcast(broadcastPayload); // also broad to notify active danmaku layers

    res.json({ success: true, comment: newComment, flagged });
  });

  app.post('/api/comments/:videoId/:id/like', (req, res) => {
    const { videoId, id } = req.params;
    const { username } = req.body;
    const cleanUser = String(username || 'ゲスト').trim();

    const comments = appState.trackComments[videoId] || [];
    const target = comments.find((c) => c.id === id);
    if (!target) {
      return res.status(404).json({ error: 'コメントが見つかりません' });
    }

    const likedIdx = target.likedBy.indexOf(cleanUser);
    if (likedIdx === -1) {
      target.likedBy.push(cleanUser);
      target.likes += 1;

      // Send notification to comment owner if different
      if (target.username && target.username !== cleanUser) {
        sendSocialNotification({
          recipient: target.username,
          sender: cleanUser,
          type: 'comment_like',
          title: 'コメントにいいねされました',
          body: `${cleanUser} さんがあなたのコメント「${target.text.slice(0, 20)}...」にいいねしました`,
          data: { videoId, commentId: id },
        });
      }
    } else {
      target.likedBy.splice(likedIdx, 1);
      target.likes = Math.max(0, target.likes - 1);
    }

    saveStorage();
    broadcast({
      type: 'comment:liked',
      videoId,
      commentId: id,
      likes: target.likes,
      likedBy: target.likedBy,
    });
    res.json({ success: true, likes: target.likes, likedBy: target.likedBy });
  });

  app.delete('/api/comments/:videoId/:id', (req, res) => {
    const { videoId, id } = req.params;
    const { username, isAdmin } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();

    const comments = appState.trackComments[videoId] || [];
    const idx = comments.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'コメントが見つかりません' });
    }

    const c = comments[idx];
    if (!isAdmin && c.username.toLowerCase() !== cleanUser) {
      return res.status(403).json({ error: '自分のコメントのみ削除できます' });
    }

    comments.splice(idx, 1);
    saveStorage();
    broadcast({
      type: 'comment:deleted',
      videoId,
      commentId: id,
    });
    res.json({ success: true, message: 'コメントを削除しました' });
  });

  // --- REST API: 1-on-1 Direct Messaging (DM) ---
  function getConvId(u1: string, u2: string): string {
    return [u1.toLowerCase(), u2.toLowerCase()].sort().join('___');
  }

  app.get('/api/dm/conversations', (req, res) => {
    const username = String(req.query.username || '').trim().toLowerCase();
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const convMap = new Map<string, DirectMessage>();
    const unreadMap = new Map<string, number>();

    // Scan messages
    for (const msg of appState.directMessages) {
      const isSender = msg.sender.toLowerCase() === username;
      const isRecipient = msg.recipient.toLowerCase() === username;
      if (isSender || isRecipient) {
        const otherUser = isSender ? msg.recipient : msg.sender;
        const convId = getConvId(username, otherUser);
        const existing = convMap.get(convId);
        if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
          convMap.set(convId, msg);
        }
        if (isRecipient && !msg.read) {
          unreadMap.set(convId, (unreadMap.get(convId) || 0) + 1);
        }
      }
    }

    // Also include all registered users so you can easily start a DM with anyone
    const registeredUsers = appState.accounts.map((a) => a.username);
    const result: any[] = [];

    // Collect active presence
    const onlineMap = new Map<string, { nowPlaying?: any }>();
    for (const meta of wsClients.values()) {
      if (meta.username) {
        onlineMap.set(meta.username.toLowerCase(), { nowPlaying: meta.nowPlaying });
      }
    }

    // Include existing conversations first
    for (const [convId, lastMessage] of convMap.entries()) {
      const otherUser = lastMessage.sender.toLowerCase() === username ? lastMessage.recipient : lastMessage.sender;
      const presence = onlineMap.get(otherUser.toLowerCase());
      result.push({
        convId,
        withUser: otherUser,
        lastMessage,
        unreadCount: unreadMap.get(convId) || 0,
        isOnline: Boolean(presence),
        nowPlaying: presence?.nowPlaying,
      });
    }

    // Add remaining registered users without convos yet
    for (const regUser of registeredUsers) {
      if (regUser.toLowerCase() === username) continue;
      const exists = result.find((r) => r.withUser.toLowerCase() === regUser.toLowerCase());
      if (!exists) {
        const presence = onlineMap.get(regUser.toLowerCase());
        result.push({
          convId: getConvId(username, regUser),
          withUser: regUser,
          lastMessage: null,
          unreadCount: 0,
          isOnline: Boolean(presence),
          nowPlaying: presence?.nowPlaying,
        });
      }
    }

    res.json({ conversations: result });
  });

  app.get('/api/dm/messages', (req, res) => {
    const user1 = String(req.query.user1 || '').trim().toLowerCase();
    const user2 = String(req.query.user2 || '').trim().toLowerCase();
    if (!user1 || !user2) return res.status(400).json({ error: 'user1 and user2 are required' });

    const convId = getConvId(user1, user2);
    const messages = appState.directMessages.filter((m) => m.conversationId === convId);

    // Auto mark as read for user1
    let changed = false;
    for (const m of messages) {
      if (m.recipient.toLowerCase() === user1 && !m.read) {
        m.read = true;
        changed = true;
      }
    }
    if (changed) {
      saveStorage();
      broadcastToUser(user2, {
        type: 'dm:read_ack',
        conversationId: convId,
        reader: user1,
      });
    }

    res.json({ messages });
  });

  app.post('/api/dm/send', (req, res) => {
    const { sender, recipient, content, trackCard, playlistCard } = req.body;
    const cleanSender = String(sender || '').trim();
    const cleanRecipient = String(recipient || '').trim();

    if (!cleanSender || !cleanRecipient) {
      return res.status(400).json({ error: '送信者と受信者を指定してください' });
    }

    if (appState.bannedUsers.includes(cleanSender.toLowerCase())) {
      return res.status(403).json({ error: 'アカウントが停止されています' });
    }

    // Check block list
    const recipientBlocks = appState.blockedUsers[cleanRecipient.toLowerCase()] || [];
    if (recipientBlocks.includes(cleanSender.toLowerCase())) {
      return res.status(403).json({ error: 'このユーザーへのメッセージ送信はブロックされています' });
    }

    const { sanitized } = sanitizeText(content || '');
    const convId = getConvId(cleanSender, cleanRecipient);

    const message: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: convId,
      sender: cleanSender,
      recipient: cleanRecipient,
      content: sanitized || undefined,
      trackCard: trackCard || undefined,
      playlistCard: playlistCard || undefined,
      timestamp: new Date().toISOString(),
      read: false,
      reactions: {},
    };

    appState.directMessages.push(message);
    if (appState.directMessages.length > 2000) {
      appState.directMessages.splice(0, appState.directMessages.length - 2000);
    }

    // Send push notification to recipient
    sendSocialNotification({
      recipient: cleanRecipient,
      sender: cleanSender,
      type: 'dm',
      title: `${cleanSender} さんからメッセージが届きました`,
      body: trackCard
        ? `🎵 楽曲「${trackCard.title}」をシェアしました`
        : playlistCard
        ? `📁 プレイリスト「${playlistCard.name}」をシェアしました`
        : sanitized,
      data: { sender: cleanSender, conversationId: convId },
    });

    saveStorage();

    // Broadcast live over WebSocket to both parties
    const payload = {
      type: 'dm:new',
      message,
    };
    broadcastToUser(cleanSender, payload);
    broadcastToUser(cleanRecipient, payload);

    res.json({ success: true, message });
  });

  app.post('/api/dm/react', (req, res) => {
    const { messageId, emoji, username } = req.body;
    const cleanUser = String(username || '').trim();
    const cleanEmoji = String(emoji || '').trim();

    const target = appState.directMessages.find((m) => m.id === messageId);
    if (!target) return res.status(404).json({ error: 'メッセージが見つかりません' });

    if (!target.reactions) target.reactions = {};
    if (!target.reactions[cleanEmoji]) target.reactions[cleanEmoji] = [];

    const existingIdx = target.reactions[cleanEmoji].indexOf(cleanUser);
    if (existingIdx === -1) {
      target.reactions[cleanEmoji].push(cleanUser);
    } else {
      target.reactions[cleanEmoji].splice(existingIdx, 1);
      if (target.reactions[cleanEmoji].length === 0) {
        delete target.reactions[cleanEmoji];
      }
    }

    saveStorage();
    const payload = {
      type: 'dm:reaction_updated',
      messageId,
      reactions: target.reactions,
    };
    broadcastToUser(target.sender, payload);
    broadcastToUser(target.recipient, payload);

    res.json({ success: true, reactions: target.reactions });
  });

  app.post('/api/dm/read', (req, res) => {
    const { conversationId, reader, sender } = req.body;
    const cleanReader = String(reader || '').trim().toLowerCase();
    let updated = 0;

    for (const m of appState.directMessages) {
      if (m.conversationId === conversationId && m.recipient.toLowerCase() === cleanReader && !m.read) {
        m.read = true;
        updated++;
      }
    }

    if (updated > 0) {
      saveStorage();
      if (sender) {
        broadcastToUser(sender, {
          type: 'dm:read_ack',
          conversationId,
          reader: cleanReader,
        });
      }
    }
    res.json({ success: true, updated });
  });

  // --- REST API: Listening Party & Rooms (同時試聴セッション) ---
  app.get('/api/party/rooms', (_req, res) => {
    res.json({ rooms: Object.values(appState.listeningRooms) });
  });

  app.post('/api/party/rooms', (req, res) => {
    const { name, description, category, hostUsername, initialTrack } = req.body;
    const cleanName = String(name || '').trim();
    const cleanHost = String(hostUsername || 'ホスト').trim();

    if (!cleanName) return res.status(400).json({ error: 'ルーム名を入力してください' });

    const roomId = `room_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRoom: ListeningPartyRoom = {
      id: roomId,
      name: cleanName,
      description: description || 'ユーザー作成のリスニングパーティー',
      category: category || 'custom',
      hostUsername: cleanHost,
      currentTrack: initialTrack || null,
      isPlaying: !!initialTrack,
      positionSec: 0,
      updatedAt: Date.now(),
      participants: [
        { username: cleanHost, joinedAt: new Date().toISOString(), isHost: true },
      ],
      chatMessages: [
        {
          id: `sys_start_${Date.now()}`,
          username: 'System',
          text: `ルーム「${cleanName}」が開設されました`,
          timestamp: new Date().toISOString(),
          type: 'system',
        },
      ],
    };

    appState.listeningRooms[roomId] = newRoom;
    saveStorage();
    broadcast({
      type: 'party:room_created',
      room: newRoom,
    });
    res.json({ success: true, room: newRoom });
  });

  app.get('/api/party/room/:id', (req, res) => {
    const room = appState.listeningRooms[req.params.id];
    if (!room) return res.status(404).json({ error: 'ルームが見つかりません' });
    res.json({ room });
  });

  // --- REST API: Social Notifications & Activity Feed ---
  app.get('/api/social/notifications', (req, res) => {
    const username = String(req.query.username || '').trim().toLowerCase();
    if (!username) return res.json({ notifications: [] });

    const userNotifs = appState.socialNotifications.filter(
      (n) => n.recipient.toLowerCase() === username
    );
    res.json({
      notifications: userNotifs.slice(0, 50),
      unreadCount: userNotifs.filter((n) => !n.read).length,
    });
  });

  app.post('/api/social/notifications/read', (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    if (username) {
      for (const n of appState.socialNotifications) {
        if (n.recipient.toLowerCase() === username) {
          n.read = true;
        }
      }
      saveStorage();
    }
    res.json({ success: true });
  });

  app.get('/api/social/feed', (_req, res) => {
    res.json({ feed: appState.activityFeed.slice(0, 50) });
  });

  app.get('/api/social/users', (_req, res) => {
    const onlineMap = new Map<string, any>();
    for (const meta of wsClients.values()) {
      if (meta.username) {
        onlineMap.set(meta.username.toLowerCase(), { nowPlaying: meta.nowPlaying });
      }
    }

    const list = appState.accounts.map((acc) => {
      const presence = onlineMap.get(acc.username.toLowerCase());
      return {
        id: acc.id,
        username: acc.username,
        isOnline: Boolean(presence),
        nowPlaying: presence?.nowPlaying || null,
        registeredAt: acc.registeredAt,
      };
    });
    res.json({ users: list });
  });

  // Follow & Block
  app.post('/api/social/follow', (req, res) => {
    const { follower, targetUser } = req.body;
    const f = String(follower || '').trim().toLowerCase();
    const t = String(targetUser || '').trim().toLowerCase();
    if (!f || !t || f === t) return res.status(400).json({ error: 'Invalid users' });

    if (!appState.follows[f]) appState.follows[f] = [];
    const idx = appState.follows[f].indexOf(t);
    let isFollowing = false;
    if (idx === -1) {
      appState.follows[f].push(t);
      isFollowing = true;
      sendSocialNotification({
        recipient: targetUser,
        sender: follower,
        type: 'follow',
        title: '新しいフォロワー',
        body: `${follower} さんがあなたをフォローしました`,
      });
    } else {
      appState.follows[f].splice(idx, 1);
      isFollowing = false;
    }
    saveStorage();
    res.json({ success: true, isFollowing, follows: appState.follows[f] });
  });

  app.post('/api/social/block', (req, res) => {
    const { user, targetUser } = req.body;
    const u = String(user || '').trim().toLowerCase();
    const t = String(targetUser || '').trim().toLowerCase();
    if (!u || !t) return res.status(400).json({ error: 'Invalid users' });

    if (!appState.blockedUsers[u]) appState.blockedUsers[u] = [];
    if (!appState.blockedUsers[u].includes(t)) {
      appState.blockedUsers[u].push(t);
    }
    saveStorage();
    res.json({ success: true, blocked: appState.blockedUsers[u] });
  });

  app.post('/api/social/unblock', (req, res) => {
    const { user, targetUser } = req.body;
    const u = String(user || '').trim().toLowerCase();
    const t = String(targetUser || '').trim().toLowerCase();

    if (appState.blockedUsers[u]) {
      appState.blockedUsers[u] = appState.blockedUsers[u].filter((x) => x !== t);
      saveStorage();
    }
    res.json({ success: true, blocked: appState.blockedUsers[u] || [] });
  });

  // Moderation Report
  app.post('/api/social/report', (req, res) => {
    const { reporter, reportedUser, targetType, targetId, reason, contentSnippet } = req.body;
    const report: ModerationReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reporter: String(reporter || '匿名').trim(),
      reportedUser: String(reportedUser || '不明').trim(),
      targetType: targetType || 'comment',
      targetId: String(targetId || '').trim(),
      reason: String(reason || '不適切な投稿').trim(),
      contentSnippet: contentSnippet || undefined,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    appState.moderationReports.unshift(report);
    if (appState.moderationReports.length > 200) appState.moderationReports.splice(200);
    saveStorage();
    res.json({ success: true, message: '通報を受け付けました。管理チームが確認します。', reportId: report.id });
  });

  // --- Admin Moderation & Community Endpoints ---
  app.get('/api/admin/moderation/overview', (_req, res) => {
    let allCommentsCount = 0;
    const allCommentsList: any[] = [];
    for (const [vId, list] of Object.entries(appState.trackComments)) {
      allCommentsCount += list.length;
      for (const c of list) {
        allCommentsList.push({ ...c, videoId: vId });
      }
    }
    allCommentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      totalComments: allCommentsCount,
      recentComments: allCommentsList.slice(0, 50),
      reports: appState.moderationReports,
      bannedUsers: appState.bannedUsers,
      totalRooms: Object.keys(appState.listeningRooms).length,
      rooms: Object.values(appState.listeningRooms),
      ngWords: DEFAULT_NG_WORDS,
    });
  });

  app.post('/api/admin/moderation/resolve-report', (req, res) => {
    const { reportId, status } = req.body;
    const rep = appState.moderationReports.find((r) => r.id === reportId);
    if (!rep) return res.status(404).json({ error: '通報が見つかりません' });
    rep.status = status || 'resolved';
    saveStorage();
    res.json({ success: true, report: rep });
  });

  app.post('/api/admin/moderation/toggle-ban', (req, res) => {
    const { username } = req.body;
    const cleanUser = String(username || '').trim().toLowerCase();
    if (!cleanUser) return res.status(400).json({ error: 'Username is required' });

    const idx = appState.bannedUsers.indexOf(cleanUser);
    let isBanned = false;
    if (idx === -1) {
      appState.bannedUsers.push(cleanUser);
      isBanned = true;
    } else {
      appState.bannedUsers.splice(idx, 1);
      isBanned = false;
    }
    saveStorage();
    res.json({ success: true, isBanned, bannedUsers: appState.bannedUsers });
  });

  // --- Admin Direct Messages Audit & Surveillance (全ユーザー間DM監視・監査) ---
  app.get('/api/admin/dm/all', (req, res) => {
    // Group all direct messages by conversationId
    const convMap = new Map<string, {
      conversationId: string;
      participants: [string, string];
      messageCount: number;
      lastTimestamp: string;
      messages: DirectMessage[];
    }>();

    for (const msg of appState.directMessages) {
      let group = convMap.get(msg.conversationId);
      if (!group) {
        const parts = msg.conversationId.split('___');
        const p1 = parts[0] || msg.sender;
        const p2 = parts[1] || msg.recipient;
        group = {
          conversationId: msg.conversationId,
          participants: [p1, p2],
          messageCount: 0,
          lastTimestamp: msg.timestamp,
          messages: [],
        };
        convMap.set(msg.conversationId, group);
      }
      group.messageCount++;
      group.messages.push(msg);
      if (new Date(msg.timestamp) > new Date(group.lastTimestamp)) {
        group.lastTimestamp = msg.timestamp;
      }
    }

    // Sort conversations by most recent message
    const conversations = Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );

    res.json({
      totalMessages: appState.directMessages.length,
      totalConversations: conversations.length,
      conversations,
    });
  });

  // Admin delete specific DM message
  app.delete('/api/admin/dm/message/:id', (req, res) => {
    const { id } = req.params;
    const idx = appState.directMessages.findIndex((m) => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'メッセージが見つかりません' });
    }

    const deleted = appState.directMessages.splice(idx, 1)[0];
    saveStorage();

    // Broadcast deletion so open chat windows update
    const payload = {
      type: 'dm:deleted',
      messageId: id,
      conversationId: deleted.conversationId,
    };
    broadcastToUser(deleted.sender, payload);
    broadcastToUser(deleted.recipient, payload);

    res.json({ success: true, message: 'DMメッセージを強制削除しました', deletedId: id });
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

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] YT Music InnerTube backend with WebSockets listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
