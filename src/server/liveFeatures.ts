import { Innertube } from 'youtubei.js';
import { kvCache } from './kvCache';
import { parseLikesCount, resolveRealYouTubeVideoId } from './commentEmotion';
import { normalizeArtistName } from '../utils/artistNames';

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
  heat: number;
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
  tracks: {
    id: string;
    title: string;
    artist: string;
    duration?: string;
    durationSeconds?: number;
    thumbnail: string;
    setlistIndex: number;
    timestampSec?: number;
  }[];
}

export function formatTimeSec(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${rem < 10 ? '0' : ''}${rem}`;
  }
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export function parseTimestampToSec(raw: string): number | null {
  const parts = raw.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n) || n < 0)) return null;
  if (parts.length === 2) {
    const [m, s] = parts;
    if (s >= 60 || m > 600) return null;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (m >= 60 || s >= 60 || h > 24) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function cleanTimestampLabel(line: string, tsMatch: string): string {
  const idx = line.indexOf(tsMatch);
  const before = line
    .slice(0, idx)
    .replace(/^\s*(?:\d{1,2}[.)、]|[-・•*#【\[])\s*/, '')
    .replace(/(?:\d{1,2}:)?\d{1,2}:\d{2}/g, '')
    .trim();
  const after = line
    .slice(idx + tsMatch.length)
    .replace(/^(?:[\s\-–—|:：/\]】)」』]+|(?:\d{1,2}:)?\d{1,2}:\d{2})+/g, '')
    .trim();
  const combined = (after || before || '').replace(/\s+/g, ' ').trim();
  return combined.slice(0, 72) || '見どころ';
}

function extractTimestampsFromText(
  text: string,
  maxDuration: number,
  source: 'description' | 'comment',
  author?: string,
  likes?: string,
  likesNum?: number
): TrackTimestampItem[] {
  if (!text) return [];
  const results: TrackTimestampItem[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip clock opening/closing times in descriptions like "18:00開場 / 19:00開演"
    if (/(?:開場|開演|終演|配信開始|予定)\s*$/.test(trimmed)) continue;

    const matches = Array.from(
      trimmed.matchAll(/(?<![\d:])(\d{1,2}:\d{2}(?::\d{2})?)(?![\d:])/g)
    );
    for (const m of matches) {
      const tsStr = m[1];
      const sec = parseTimestampToSec(tsStr);
      if (sec === null) continue;
      if (maxDuration > 0 && sec > maxDuration - 1) continue;
      const label = cleanTimestampLabel(trimmed, tsStr);
      results.push({
        timeSeconds: sec,
        timeLabel: formatTimeSec(sec),
        label,
        source,
        author,
        likes,
        likesNum,
      });
    }
  }
  return results;
}

function extractVideoIdAndTitle(v: any): { id: string; title: string; author: string; duration: string } {
  const id = String(v?.id || v?.content_id || '').trim();
  const title = (
    v?.title?.text ||
    v?.metadata?.title?.text ||
    v?.title?.toString?.() ||
    ''
  ).trim();
  const author = (
    v?.author?.name ||
    v?.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text ||
    ''
  ).trim();
  const duration = (v?.duration?.text || '').trim();
  return { id, title, author, duration };
}

export async function extractTrackTimestampsAndHeatmap(
  yt: Innertube,
  rawVideoId: string,
  title = '',
  artist = '',
  durationHint = 0,
  maxCommentPages = 6
): Promise<TrackTimestampsData> {
  const videoId = (await resolveRealYouTubeVideoId(yt, rawVideoId, title, artist)) || rawVideoId;
  const cacheKey = `yt_timestamps_v4_${videoId}`;
  const cached = kvCache.get<TrackTimestampsData>(cacheKey);
  if (cached) {
    if (durationHint > 0 && cached.durationSeconds === 0) {
      return { ...cached, durationSeconds: durationHint };
    }
    return cached;
  }

  let durationSeconds = durationHint > 0 ? Math.floor(durationHint) : 0;
  const descriptionItems: TrackTimestampItem[] = [];
  const commentItems: TrackTimestampItem[] = [];

  // 1. Fetch description & chapters via getBasicInfo (and fallback getInfo if short_description is empty)
  try {
    const basic: any = await yt.getBasicInfo(videoId);
    const basicDur = Number(basic?.basic_info?.duration || 0);
    if (basicDur > 0) durationSeconds = basicDur;

    let descText =
      basic?.basic_info?.short_description ||
      basic?.secondary_info?.description?.text ||
      '';

    if (!descText) {
      try {
        const fullInfo: any = await yt.getInfo(videoId);
        const fullDur = Number(fullInfo?.basic_info?.duration || 0);
        if (fullDur > 0 && durationSeconds === 0) durationSeconds = fullDur;
        descText =
          fullInfo?.secondary_info?.description?.text ||
          fullInfo?.basic_info?.short_description ||
          '';
      } catch {
        // ignore getInfo fallback errors
      }
    }

    if (descText) {
      descriptionItems.push(
        ...extractTimestampsFromText(descText, durationSeconds, 'description')
      );
    }
  } catch (err: any) {
    console.warn(`[Timestamps] getBasicInfo failed for ${videoId}:`, err?.message);
  }

  // 2. Fetch raw YouTube comments (up to maxCommentPages pages until timestamp mentions are collected)
  const rawCommentBodies: { text: string; author: string; likes: string; likesNum: number }[] = [];
  const collectComments = (list: any[]) => {
    for (const item of list || []) {
      const c = item?.comment || item;
      const text = (c?.content?.text || c?.content?.toString?.() || '').trim();
      const author = (c?.author?.name || '').trim() || 'Listener';
      const likes = String(c?.vote_count || c?.like_count || '0').trim();
      if (!text) continue;
      rawCommentBodies.push({
        text,
        author,
        likes,
        likesNum: parseLikesCount(likes),
      });
    }
  };

  try {
    let page: any = await yt.getComments(videoId);
    collectComments(page?.contents || []);

    let pageNum = 1;
    let tsHits = rawCommentBodies.filter((c) => /(?<![\d:])\d{1,2}:\d{2}/.test(c.text)).length;
    while (pageNum < maxCommentPages && tsHits < 5 && typeof page?.getContinuation === 'function') {
      try {
        page = await page.getContinuation();
        const prevLen = rawCommentBodies.length;
        collectComments(page?.contents || []);
        if (rawCommentBodies.length === prevLen) break;
        tsHits = rawCommentBodies.filter((c) => /(?<![\d:])\d{1,2}:\d{2}/.test(c.text)).length;
        pageNum += 1;
      } catch {
        break;
      }
    }
  } catch (err: any) {
    console.warn(`[Timestamps] getComments failed for ${videoId}:`, err?.message);
  }

  // Fallback to Official MV if audio/topic video had no comments at all
  if (rawCommentBodies.length === 0 && descriptionItems.length === 0 && title) {
    try {
      const mvRes: any = await yt.search(`${title} ${artist} Official Video`.trim(), { type: 'video' });
      const mvCandidates = (mvRes?.videos || mvRes?.results || []).map(extractVideoIdAndTitle);
      const mv = mvCandidates.find(
        (v: any) => v.id && v.id !== videoId && /^[a-zA-Z0-9_-]{11}$/.test(v.id)
      );
      if (mv?.id) {
        let mvPage: any = await yt.getComments(mv.id);
        collectComments(mvPage?.contents || []);
        if (
          rawCommentBodies.filter((c) => /(?<![\d:])\d{1,2}:\d{2}/.test(c.text)).length < 3 &&
          typeof mvPage?.getContinuation === 'function'
        ) {
          mvPage = await mvPage.getContinuation().catch(() => null);
          if (mvPage?.contents) collectComments(mvPage.contents);
        }
      }
    } catch {
      // ignore
    }
  }

  for (const c of rawCommentBodies) {
    commentItems.push(
      ...extractTimestampsFromText(c.text, durationSeconds, 'comment', c.author, c.likes, c.likesNum)
    );
  }

  // Merge and deduplicate closely spaced items (keeping description chapters + top liked comment timestamps)
  const mergedMap = new Map<number, TrackTimestampItem>();
  for (const item of descriptionItems) {
    if (!mergedMap.has(item.timeSeconds)) {
      mergedMap.set(item.timeSeconds, item);
    }
  }
  const sortedComments = [...commentItems].sort((a, b) => (b.likesNum || 0) - (a.likesNum || 0));
  for (const item of sortedComments) {
    if (!mergedMap.has(item.timeSeconds)) {
      mergedMap.set(item.timeSeconds, item);
    }
  }

  const timestamps = Array.from(mergedMap.values())
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
    .slice(0, 60);

  // Build heatmap buckets from comment timestamp density + likes
  const effectiveDuration =
    durationSeconds > 0
      ? durationSeconds
      : Math.max(...timestamps.map((t) => t.timeSeconds), 240);

  const bucketSize = effectiveDuration > 1200 ? 30 : effectiveDuration > 600 ? 15 : 8;
  const buckets = new Map<
    number,
    { weight: number; mentions: number; bestSec: number; bestLikes: number; topLabel: string }
  >();

  for (const cItem of commentItems) {
    if (effectiveDuration > 0 && cItem.timeSeconds >= effectiveDuration) continue;
    const bIdx = Math.floor(cItem.timeSeconds / bucketSize);
    const weight = 1 + Math.log10((cItem.likesNum || 0) + 1) * 0.7;
    const prev = buckets.get(bIdx);
    if (!prev) {
      buckets.set(bIdx, {
        weight,
        mentions: 1,
        bestSec: cItem.timeSeconds,
        bestLikes: cItem.likesNum || 0,
        topLabel: cItem.label,
      });
    } else {
      const isBetter = (cItem.likesNum || 0) > prev.bestLikes;
      buckets.set(bIdx, {
        weight: prev.weight + weight,
        mentions: prev.mentions + 1,
        bestSec: isBetter ? cItem.timeSeconds : prev.bestSec,
        bestLikes: isBetter ? cItem.likesNum || 0 : prev.bestLikes,
        topLabel: isBetter ? cItem.label : prev.topLabel,
      });
    }
  }

  // Also include description chapters if comment timestamps are absent
  if (buckets.size === 0 && descriptionItems.length > 0) {
    for (const dItem of descriptionItems) {
      if (effectiveDuration > 0 && dItem.timeSeconds >= effectiveDuration) continue;
      const bIdx = Math.floor(dItem.timeSeconds / bucketSize);
      if (!buckets.has(bIdx)) {
        buckets.set(bIdx, {
          weight: 1,
          mentions: 1,
          bestSec: dItem.timeSeconds,
          bestLikes: 0,
          topLabel: dItem.label,
        });
      }
    }
  }

  const maxWeight = Math.max(...Array.from(buckets.values()).map((b) => b.weight), 1);
  const heatMarkers: HeatMarker[] = Array.from(buckets.values())
    .map((b) => ({
      timeSeconds: b.bestSec,
      timeLabel: formatTimeSec(b.bestSec),
      percent: effectiveDuration > 0 ? Math.min(99, Math.max(1, (b.bestSec / effectiveDuration) * 100)) : 0,
      heat: Math.min(1, Math.max(0.25, b.weight / maxWeight)),
      mentions: b.mentions,
      topLabel: b.topLabel,
    }))
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
    .slice(0, 28);

  // Determine highlightStartSec for Digest Mode (prefer hottest point between 10% and 82% of track)
  const midMarkers = heatMarkers.filter(
    (m) => effectiveDuration <= 60 || (m.timeSeconds >= effectiveDuration * 0.1 && m.timeSeconds <= effectiveDuration * 0.82)
  );
  const hottest = (midMarkers.length > 0 ? midMarkers : heatMarkers).sort(
    (a, b) => b.heat - a.heat || b.mentions - a.mentions
  )[0];

  const defaultChorusSec =
    effectiveDuration > 45 ? Math.round(effectiveDuration * 0.32) : 0;

  const highlightStartSec = hottest ? hottest.timeSeconds : defaultChorusSec;
  const highlightLabel = hottest ? hottest.topLabel : undefined;

  const result: TrackTimestampsData = {
    videoId,
    durationSeconds: effectiveDuration,
    timestamps,
    heatMarkers,
    highlightStartSec,
    highlightLabel,
    totalCommentTimestamps: commentItems.length,
  };

  const ttlSec = timestamps.length > 0 ? 6 * 3600 : 600;
  kvCache.set(cacheKey, result, ttlSec);
  return result;
}

function cleanSetlistSongTitle(raw: string, artistName: string): string {
  return raw
    .replace(/^\s*(?:M?\d{1,2}|EN\d?|アンコール\d?)[.)：:\s]+/i, '')
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*(?:live|ver\.?|version|short|mc|encore|アンコール)[^)]*\)/gi, '')
    .replace(new RegExp(artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
    .replace(/^[\s\-–—/|:：・「」『』]+|[\s\-–—/|:：・「」『』]+$/g, '')
    .trim();
}

export async function fetchRealArtistLiveSetlists(
  yt: Innertube,
  artistName: string
): Promise<ArtistLiveSetlist[]> {
  const cleanArtist = artistName.trim();
  if (!cleanArtist) return [];

  const cacheKey = `artist_live_setlists_v4_${cleanArtist.toLowerCase()}`;
  const cached = kvCache.get<ArtistLiveSetlist[]>(cacheKey);
  if (cached) return cached;

  const setlists: ArtistLiveSetlist[] = [];
  const seenSources = new Set<string>();

  try {
    // 1. Search real live tour playlists on YouTube first (fast + exact tracks)
    const plRes = await yt.search(`${cleanArtist} セトリ ライブ`, { type: 'playlist' }).catch(() => null);

    const candidatePlaylists: { plId: string; plTitle: string }[] = [];
    const rawPlaylists = (
      (plRes as any)?.playlists ||
      (plRes as any)?.results ||
      []
    ).slice(0, 8);

    for (const pl of rawPlaylists) {
      const plId = String(pl?.id || pl?.content_id || '').trim();
      const plTitle = (
        pl?.title?.text ||
        pl?.metadata?.title?.text ||
        pl?.title?.toString?.() ||
        ''
      ).trim();
      if (!plId || !plTitle) continue;
      if (!/(live|tour|fes|フェス|ライブ|ツアー|セトリ|セットリスト|武道館|dome|arena|公演|zép?p|ホール|スタジアム)/i.test(plTitle)) {
        continue;
      }
      if (seenSources.has(plId)) continue;
      seenSources.add(plId);
      candidatePlaylists.push({ plId, plTitle });
      if (candidatePlaylists.length >= 4) break;
    }

    // Fetch playlist contents in parallel
    const resolvedPlaylists = await Promise.all(
      candidatePlaylists.map(async ({ plId, plTitle }) => {
        try {
          const plData: any = await yt.getPlaylist(plId);
          const items = (plData?.videos || plData?.items || []).slice(0, 20);
          const tracks = items
            .map((v: any) => extractVideoIdAndTitle(v))
            .filter((v: any) => v.id && /^[a-zA-Z0-9_-]{11}$/.test(v.id) && v.title)
            .map((v: any, idx: number) => ({
              id: v.id,
              title: cleanSetlistSongTitle(v.title, cleanArtist) || v.title,
              artist: normalizeArtistName(v.author || cleanArtist) || cleanArtist,
              duration: v.duration || '',
              durationSeconds: parseTimestampToSec(v.duration || '') || 0,
              thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
              setlistIndex: idx + 1,
            }))
            .filter((t: any) => t.title.length > 0);

          if (tracks.length >= 3) {
            return {
              id: `pl_${plId}`,
              title: plTitle,
              sourceTitle: plTitle,
              sourcePlaylistId: plId,
              sourceType: 'playlist' as const,
              thumbnail: tracks[0].thumbnail,
              tracks,
            };
          }
        } catch {
          // ignore broken playlists
        }
        return null;
      })
    );

    for (const pl of resolvedPlaylists) {
      if (pl) setlists.push(pl);
      if (setlists.length >= 4) break;
    }

    // 2. Only fall back to parsing live concert video descriptions/comments if playlists yielded < 2 setlists
    if (setlists.length < 2) {
      const vidRes = await yt.search(`${cleanArtist} ライブ セトリ セットリスト`, { type: 'video' }).catch(() => null);
      const liveVideos = (
        (vidRes as any)?.videos ||
        (vidRes as any)?.results ||
        []
      )
        .map(extractVideoIdAndTitle)
        .slice(0, 3);

      for (const v of liveVideos) {
        if (setlists.length >= 3) break;
        const vidId = v.id;
        const vidTitle = v.title;
        if (!vidId || !/^[a-zA-Z0-9_-]{11}$/.test(vidId) || seenSources.has(vidId)) continue;
        seenSources.add(vidId);

        const tsData = await extractTrackTimestampsAndHeatmap(yt, vidId, vidTitle, cleanArtist, 0, 2);
        const descCount = tsData.timestamps.filter((x) => x.source === 'description').length;
        const songCandidates = tsData.timestamps
          .filter((t) => {
            const clean = cleanSetlistSongTitle(t.label, cleanArtist);
            if (clean.length < 2 || clean.length > 42) return false;
            if (/^(mc|talk|トーク|休憩|登場|挨拶|アンコール|encore|opening|ending|op|ed|見どころ)$/i.test(clean)) {
              return false;
            }
            return descCount >= 3 || t.source === 'description';
          })
          .slice(0, 10);

        if (songCandidates.length >= 3) {
          const uniqueSongs: { label: string; timestampSec: number }[] = [];
          const seenSongNames = new Set<string>();
          for (const s of songCandidates) {
            const name = cleanSetlistSongTitle(s.label, cleanArtist);
            const norm = name.toLowerCase();
            if (seenSongNames.has(norm)) continue;
            seenSongNames.add(norm);
            uniqueSongs.push({ label: name, timestampSec: s.timeSeconds });
            if (uniqueSongs.length >= 8) break;
          }

          const resolvedTracks = (
            await Promise.all(
              uniqueSongs.map(async (song, idx) => {
                try {
                  const sRes: any = await yt.search(`${cleanArtist} ${song.label} Official`, { type: 'video' });
                  const hit = ((sRes?.videos || sRes?.results || []) as any[])
                    .map(extractVideoIdAndTitle)
                    .find((cand) => cand.id && /^[a-zA-Z0-9_-]{11}$/.test(cand.id));
                  if (!hit) return null;
                  return {
                    id: hit.id,
                    title: song.label,
                    artist: normalizeArtistName(cleanArtist) || cleanArtist,
                    duration: hit.duration || '',
                    durationSeconds: parseTimestampToSec(hit.duration || '') || 0,
                    thumbnail: `https://i.ytimg.com/vi/${hit.id}/hqdefault.jpg`,
                    setlistIndex: idx + 1,
                    timestampSec: song.timestampSec,
                  };
                } catch {
                  return null;
                }
              })
            )
          ).filter((x): x is NonNullable<typeof x> => x !== null);

          if (resolvedTracks.length >= 3) {
            setlists.push({
              id: `vid_${vidId}`,
              title: vidTitle,
              sourceTitle: vidTitle,
              sourceVideoId: vidId,
              sourceType: 'live-video',
              thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              tracks: resolvedTracks,
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[ArtistSetlists] Failed for ${cleanArtist}:`, err?.message);
  }

  if (setlists.length > 0) {
    kvCache.set(cacheKey, setlists, 6 * 3600);
  }
  return setlists;
}
