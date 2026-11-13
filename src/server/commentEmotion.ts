import { Innertube } from 'youtubei.js';
import { GoogleGenAI, Type } from '@google/genai';
import { kvCache } from './kvCache';
import { normalizeArtistName } from '../utils/artistNames';

export type MoodId =
  | 'energy'
  | 'relax'
  | 'drive'
  | 'focus'
  | 'emotional'
  | 'sad'
  | 'happy'
  | 'nostalgic';

export interface MoodDefinition {
  id: MoodId;
  name: string;
  icon: string;
  tagline: string;
  keywords: string;
  defaultCover: string;
  searchQueries: string[];
}

export const MOOD_DEFINITIONS: Record<MoodId, MoodDefinition> = {
  energy: {
    id: 'energy',
    name: 'テンションUP',
    icon: 'Flame',
    tagline: 'YouTubeコメントで「盛り上がる・熱い・鳥肌」と評されるハイエナジー選曲',
    keywords: 'アップテンポ 盛り上がる ロック',
    defaultCover: '/assets/covers/editorial.jpg',
    searchQueries: [
      'Ado Official Video',
      'King Gnu Official Video',
      'YOASOBI Official Video',
      'Vaundy Official Video',
    ],
  },
  relax: {
    id: 'relax',
    name: 'チル・リラックス',
    icon: 'Coffee',
    tagline: 'YouTubeコメントで「癒される・落ち着く・心地よい」の声が多いメロウ選曲',
    keywords: 'チル アコースティック 落ち着く 癒し',
    defaultCover: '/assets/covers/ballad.jpg',
    searchQueries: [
      '藤井 風 Official Video',
      'Vaundy napori 踊り子 Official',
      'Official髭男dism アコースティック',
      'ヨルシカ Official Video',
    ],
  },
  drive: {
    id: 'drive',
    name: 'ドライブ・爽快',
    icon: 'Car',
    tagline: 'YouTubeコメントで「ドライブ・爽快・風を感じる」と語られる疾走チューン',
    keywords: 'ドライブ 爽快 夏 疾走感',
    defaultCover: '/assets/covers/traveler.jpg',
    searchQueries: [
      'Mrs. GREEN APPLE 青と夏 ライラック Official',
      'Official髭男dism Hello パラボラ Official',
      'サカナクション 新宝島 Official',
      'YOASOBI 群青 Official',
    ],
  },
  focus: {
    id: 'focus',
    name: '集中・作業用',
    icon: 'Headphones',
    tagline: 'YouTubeコメントで「作業・勉強が捗る・ずっと聴ける」と支持される楽曲',
    keywords: '勉強 作業用 集中 ピアノ',
    defaultCover: '/assets/covers/editorial.jpg',
    searchQueries: [
      '米津玄師 地球儀 Official',
      'ヨルシカ 晴る ただ君に晴れ Official',
      'ずっと真夜中でいいのに。 Official',
      '藤井 風 満ちてゆく Official',
    ],
  },
  emotional: {
    id: 'emotional',
    name: 'エモい・夜',
    icon: 'Moon',
    tagline: 'YouTubeコメントで「エモい・夜に聴きたい・歌詞が刺さる」が集まる楽曲',
    keywords: 'エモい 夜 深夜 切ない',
    defaultCover: '/assets/covers/rejoice.jpg',
    searchQueries: [
      'Official髭男dism Subtitle Official',
      'YOASOBI 夜に駆ける Official',
      'Vaundy 踊り子 Tokyo Flash Official',
      'King Gnu 白日 Official',
    ],
  },
  sad: {
    id: 'sad',
    name: '切ない・バラード',
    icon: 'Droplets',
    tagline: 'YouTubeコメントで「泣ける・涙が出る・失恋に染みる」と共感が集まるバラード',
    keywords: 'バラード 泣ける 切ない 失恋',
    defaultCover: '/assets/covers/love_peace.jpg',
    searchQueries: [
      'Official髭男dism Pretender Laughter Official',
      'back number 水平線 クリスマスソング Official',
      '優里 ドライフラワー ベテルギウス Official',
      '米津玄師 Lemon Official',
    ],
  },
  happy: {
    id: 'happy',
    name: '元気・ポジティブ',
    icon: 'Sparkles',
    tagline: 'YouTubeコメントで「元気が出る・救われた・明日も頑張れる」が届く応援歌',
    keywords: '元気 応援 明るい ポジティブ',
    defaultCover: '/assets/covers/rejoice.jpg',
    searchQueries: [
      'Mrs. GREEN APPLE ケセラセラ ダンスホール Official',
      'Official髭男dism Universe Hello Official',
      '緑黄色社会 Mela! Official',
      'WANIMA やってみよう Official',
    ],
  },
  nostalgic: {
    id: 'nostalgic',
    name: '懐かしい・名曲',
    icon: 'Radio',
    tagline: 'YouTubeコメントで「青春を思い出す・何年経っても色褪せない」と語られる名曲',
    keywords: '名曲 青春 懐かしい',
    defaultCover: '/assets/covers/traveler.jpg',
    searchQueries: [
      'Official髭男dism 115万キロのフィルム 宿命 Official',
      'back number 高嶺の花子さん Official',
      'スピッツ チェリー 楓 Official',
      'RADWIMPS 前前前世 スパークル Official',
    ],
  },
};

export interface RawYouTubeComment {
  author: string;
  text: string;
  likes: string;
  likesNum: number;
}

export interface AnalyzedCommentItem extends RawYouTubeComment {
  matchedEmotions: string[];
}

export interface CommentEmotionResult {
  videoId: string;
  dominantMood: MoodId;
  dominantMoodName: string;
  emotionScores: Record<MoodId, number>;
  emotionTags: string[];
  summary: string;
  sampleComments: AnalyzedCommentItem[];
  analyzedCount: number;
  source: 'gemini+youtube-comments' | 'youtube-comments';
}

interface LexiconRule {
  pattern: RegExp;
  mood: MoodId;
  weight: number;
  tag: string;
}

const EMOTION_LEXICON: LexiconRule[] = [
  // Sad / 切ない・バラード
  { pattern: /(泣け|泣いた|涙|号泣|涙腺|泣きそう|ボロ泣き|😭😭|😢|🥹)/g, mood: 'sad', weight: 3.2, tag: '泣ける' },
  { pattern: /(切な|苦し|胸が痛|胸が締め|切なすぎ|哀愁|💔)/g, mood: 'sad', weight: 3.0, tag: '切ない' },
  { pattern: /(失恋|別れ|振られ|元彼|元カノ|片思い|叶わない|忘れられ)/g, mood: 'sad', weight: 3.0, tag: '失恋・共感' },
  { pattern: /(バラード|心に沁み|心に染み|悲しい|寂しい|会いたい)/g, mood: 'sad', weight: 2.3, tag: '心に染みる' },

  // Emotional / エモい・夜
  { pattern: /(エモい|エモすぎ|エモ|センチメンタル|エモーショナル)/g, mood: 'emotional', weight: 3.2, tag: 'エモい' },
  { pattern: /(深夜|夜中|夜更かし|真夜中|夜の|寝る前|🌙|🌃)/g, mood: 'emotional', weight: 2.4, tag: '夜に聴きたい' },
  { pattern: /(歌詞が深|歌詞刺さ|歌詞が刺|刺さる|世界観|余韻|儚い|深い|解釈)/g, mood: 'emotional', weight: 2.5, tag: '歌詞が刺さる' },
  { pattern: /(冬|雪|雨の日|夕暮れ|黄昏)/g, mood: 'emotional', weight: 1.8, tag: '情景が浮かぶ' },

  // Energy / テンションUP
  { pattern: /(鳥肌|ぶち上げ|ブチ上げ|ブチ上が|テンション|テンション上|爆音|熱い|激アツ|🔥|⚡)/g, mood: 'energy', weight: 3.2, tag: '鳥肌・熱い' },
  { pattern: /(盛り上|ライブ|フェス|生で聴き|コール|最強|カッコよ|かっこいい|かっこよすぎ|ヤバい|やばい)/g, mood: 'energy', weight: 2.5, tag: '盛り上がる' },
  { pattern: /(中毒|沼|ヘビロテ|リピート止まら|脳内再生|ロック|バンド)/g, mood: 'energy', weight: 2.2, tag: '中毒性' },
  { pattern: /(神曲|名曲すぎ|天才|圧巻|圧倒的)/g, mood: 'energy', weight: 1.4, tag: '神曲' },

  // Happy / 元気・ポジティブ
  { pattern: /(元気出|元気が|元気もら|勇気|励まされ|救われた|救われ|頑張れる|がんば|明日も|前向き)/g, mood: 'happy', weight: 3.3, tag: '元気が出る' },
  { pattern: /(笑顔|幸せ|ハッピー|明るい|ポジティブ|楽しい|希望|✨|😊|☀️)/g, mood: 'happy', weight: 2.6, tag: '前向き・笑顔' },
  { pattern: /(応援|背中を押|力をもら|ありがとう|最高の一日)/g, mood: 'happy', weight: 2.4, tag: '背中を押される' },

  // Relax / チル・リラックス
  { pattern: /(癒さ|癒し|落ち着|心地よい|心地いい|チル|まったり|穏やか|優しい声|優しい曲|☕)/g, mood: 'relax', weight: 3.2, tag: '癒される' },
  { pattern: /(眠れる|睡眠|寝落ち|カフェ|休日|朝に聴|ゆったり|安心感|透き通る)/g, mood: 'relax', weight: 2.6, tag: '落ち着く' },
  { pattern: /(アコースティック|透明感|綺麗|美しい声|きれい)/g, mood: 'relax', weight: 2.0, tag: '透明感・心地よい' },

  // Drive / ドライブ・爽快
  { pattern: /(ドライブ|車内|車で|高速|海|海岸|青空|風|爽やか|爽快|🚗)/g, mood: 'drive', weight: 3.5, tag: 'ドライブに最高' },
  { pattern: /(夏|夏休み|旅|旅行|走りたく|疾走|電車|散歩|景色|自転車)/g, mood: 'drive', weight: 2.4, tag: '爽快・疾走感' },

  // Focus / 集中・作業用
  { pattern: /(作業|勉強|受験|テスト|課題|集中|仕事|通勤|通学|🎧)/g, mood: 'focus', weight: 3.3, tag: '作業・勉強に集中' },
  { pattern: /(ずっと聴|無限ループ|BGM|何周も|聞き流|耳が幸せ|ピアノ|アレンジ)/g, mood: 'focus', weight: 2.3, tag: 'ずっと聴ける' },

  // Nostalgic / 懐かしい・名曲
  { pattern: /(懐かし|なつかし|青春|学生|高校|中学|小学|卒業|あの頃|当時|昔)/g, mood: 'nostalgic', weight: 3.3, tag: '青春・懐かしい' },
  { pattern: /(色褪せ|時代|名曲|何年経っ|何年たっ|思い出|記憶|思い出す|📻)/g, mood: 'nostalgic', weight: 2.7, tag: '色褪せない名曲' },
];

export function parseLikesCount(raw: string): number {
  if (!raw) return 0;
  const s = String(raw).trim().replace(/,/g, '');
  const manMatch = s.match(/([\d.]+)\s*万/);
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000);
  const kMatch = s.match(/([\d.]+)\s*[Kk]/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = s.match(/([\d.]+)\s*[Mm]/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function isNoiseComment(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return true;
  if (/字幕をONにすると歌詞が表示されます|Turn on subtitles/i.test(t)) return true;
  // Full lyrics copy-paste detection
  if (/作詞[:：]|作曲[:：]|編曲[:：]|【歌詞】/.test(t) && t.length > 140) return true;
  const lineCount = t.split('\n').length;
  if (lineCount >= 10 && t.length > 260) return true;
  // Multi-timestamp tracklist spam
  const timestamps = t.match(/\d{1,2}:\d{2}/g);
  if (timestamps && timestamps.length >= 4) return true;
  // Discography / year list comments (e.g. "2018 ... \n2019 ... \n2020 ...")
  const yearLines = t.match(/(?:^|\n)\s*(?:19|20)\d{2}\s+[^\n]+/g);
  if (yearLines && yearLines.length >= 3) return true;
  return false;
}

export async function fetchRealYouTubeComments(
  yt: Innertube,
  videoId: string
): Promise<RawYouTubeComment[]> {
  const cacheKey = `yt_comments_raw_v2_${videoId}`;
  const cached = kvCache.get<RawYouTubeComment[]>(cacheKey);
  if (cached) return cached;

  const comments: RawYouTubeComment[] = [];
  try {
    const res: any = await yt.getComments(videoId);
    const items = res?.contents || [];
    for (const item of items) {
      const c = item?.comment || item;
      const text = (c?.content?.text || c?.content?.toString?.() || '').trim();
      const author = (c?.author?.name || '').trim() || 'YouTube Listener';
      const likes = String(c?.vote_count || c?.like_count || '0').trim();
      if (!text || isNoiseComment(text)) continue;
      comments.push({
        author,
        text,
        likes,
        likesNum: parseLikesCount(likes),
      });
    }

    // Load 1 continuation page if fewer than 12 genuine reaction comments
    if (comments.length < 12 && typeof res?.getContinuation === 'function') {
      try {
        const nextPage = await res.getContinuation();
        for (const item of nextPage?.contents || []) {
          const c = item?.comment || item;
          const text = (c?.content?.text || c?.content?.toString?.() || '').trim();
          const author = (c?.author?.name || '').trim() || 'YouTube Listener';
          const likes = String(c?.vote_count || c?.like_count || '0').trim();
          if (!text || isNoiseComment(text)) continue;
          comments.push({
            author,
            text,
            likes,
            likesNum: parseLikesCount(likes),
          });
        }
      } catch {
        // Ignore continuation failures
      }
    }
  } catch (err: any) {
    console.warn(`[YouTube Comments] Failed to fetch for ${videoId}:`, err?.message);
  }

  if (comments.length > 0) {
    kvCache.set(cacheKey, comments.slice(0, 30), 6 * 3600);
  }
  return comments.slice(0, 30);
}

function extractEmotionsLexicon(
  videoId: string,
  comments: RawYouTubeComment[]
): CommentEmotionResult {
  const rawScores: Record<MoodId, number> = {
    energy: 0,
    relax: 0,
    drive: 0,
    focus: 0,
    emotional: 0,
    sad: 0,
    happy: 0,
    nostalgic: 0,
  };

  const tagWeightMap = new Map<string, number>();
  const analyzedComments: AnalyzedCommentItem[] = [];

  for (const c of comments) {
    const likeFactor = 1 + Math.log10(c.likesNum + 1) * 0.45;
    const commentMatchedTags = new Set<string>();

    for (const rule of EMOTION_LEXICON) {
      const matches = c.text.match(rule.pattern);
      if (matches && matches.length > 0) {
        const hitScore = rule.weight * Math.min(matches.length, 2) * likeFactor;
        rawScores[rule.mood] += hitScore;
        tagWeightMap.set(rule.tag, (tagWeightMap.get(rule.tag) || 0) + hitScore);
        commentMatchedTags.add(rule.tag);
      }
    }

    analyzedComments.push({
      ...c,
      matchedEmotions: Array.from(commentMatchedTags),
    });
  }

  // Normalize mood scores to 0..100
  const maxRaw = Math.max(...Object.values(rawScores), 0.1);
  const emotionScores: Record<MoodId, number> = {
    energy: 0,
    relax: 0,
    drive: 0,
    focus: 0,
    emotional: 0,
    sad: 0,
    happy: 0,
    nostalgic: 0,
  };

  (Object.keys(rawScores) as MoodId[]).forEach((mood) => {
    if (rawScores[mood] <= 0) {
      emotionScores[mood] = comments.length > 0 ? 12 : 0;
    } else {
      // Scale cleanly between 28 and 98
      const ratio = rawScores[mood] / maxRaw;
      emotionScores[mood] = Math.min(98, Math.round(28 + ratio * 70));
    }
  });

  // Sort moods to find dominant
  const sortedMoods = (Object.keys(rawScores) as MoodId[]).sort(
    (a, b) => rawScores[b] - rawScores[a]
  );
  const dominantMood: MoodId =
    rawScores[sortedMoods[0]] > 0 ? sortedMoods[0] : 'emotional';
  const dominantMoodName = MOOD_DEFINITIONS[dominantMood].name;

  // Pick top emotion tags actually triggered
  const topTags = Array.from(tagWeightMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  const emotionTags =
    topTags.length > 0
      ? topTags
      : comments.length > 0
      ? ['好評コメント多数', 'リスナー共感']
      : ['コメント未取得'];

  // Pick representative comments strictly prioritizing those that actually express detected emotions
  const sortedComments = [...analyzedComments].sort((a, b) => {
    const hasEmoA = a.matchedEmotions.length > 0 ? 10000000 : 0;
    const hasEmoB = b.matchedEmotions.length > 0 ? 10000000 : 0;
    const scoreA = hasEmoA + a.matchedEmotions.length * 100000 + a.likesNum;
    const scoreB = hasEmoB + b.matchedEmotions.length * 100000 + b.likesNum;
    return scoreB - scoreA;
  });

  const sampleComments = sortedComments.slice(0, 4);

  const tagPhrase = emotionTags.slice(0, 2).map((t) => `「${t}」`).join('・');
  const summary =
    comments.length > 0
      ? `YouTubeコメント${comments.length}件から ${tagPhrase} の感情を抽出`
      : 'YouTubeコメントを取得できませんでした';

  return {
    videoId,
    dominantMood,
    dominantMoodName,
    emotionScores,
    emotionTags,
    summary,
    sampleComments,
    analyzedCount: comments.length,
    source: 'youtube-comments',
  };
}

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

async function refineWithGemini(
  videoId: string,
  title: string,
  artist: string,
  comments: RawYouTubeComment[],
  lexiconResult: CommentEmotionResult
): Promise<CommentEmotionResult> {
  const ai = getGeminiClient();
  if (!ai || comments.length === 0) return lexiconResult;

  try {
    const commentLines = comments
      .slice(0, 18)
      .map((c, idx) => `[${idx + 1}] (${c.likes} likes) ${c.text.replace(/\s+/g, ' ').slice(0, 140)}`)
      .join('\n');

    const prompt = `楽曲「${title} - ${artist}」に寄せられた実際のYouTubeコメント一覧から、リスナーの感情を分析してください。

YouTubeコメント:
${commentLines}

上記のコメント内容のみを根拠に、以下の8つの気分への適合度(0〜100の整数)、最も強い感情ID、短い日本語感情タグ(最大4個)、日本語1文の感情要約(35文字以内)をJSONで返してください。`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dominantMood: {
              type: Type.STRING,
              enum: ['energy', 'relax', 'drive', 'focus', 'emotional', 'sad', 'happy', 'nostalgic'],
            },
            emotionScores: {
              type: Type.OBJECT,
              properties: {
                energy: { type: Type.INTEGER },
                relax: { type: Type.INTEGER },
                drive: { type: Type.INTEGER },
                focus: { type: Type.INTEGER },
                emotional: { type: Type.INTEGER },
                sad: { type: Type.INTEGER },
                happy: { type: Type.INTEGER },
                nostalgic: { type: Type.INTEGER },
              },
              required: ['energy', 'relax', 'drive', 'focus', 'emotional', 'sad', 'happy', 'nostalgic'],
            },
            emotionTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: { type: Type.STRING },
          },
          required: ['dominantMood', 'emotionScores', 'emotionTags', 'summary'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const domMood = (MOOD_DEFINITIONS[parsed.dominantMood as MoodId]
      ? parsed.dominantMood
      : lexiconResult.dominantMood) as MoodId;

    return {
      ...lexiconResult,
      dominantMood: domMood,
      dominantMoodName: MOOD_DEFINITIONS[domMood].name,
      emotionScores: parsed.emotionScores || lexiconResult.emotionScores,
      emotionTags:
        Array.isArray(parsed.emotionTags) && parsed.emotionTags.length > 0
          ? parsed.emotionTags.slice(0, 4)
          : lexiconResult.emotionTags,
      summary: parsed.summary || lexiconResult.summary,
      source: 'gemini+youtube-comments',
    };
  } catch (err: any) {
    console.warn('[Gemini Comment Analysis] Fallback to lexicon:', err?.message);
    return lexiconResult;
  }
}

export async function resolveRealYouTubeVideoId(
  yt: Innertube,
  rawId: string,
  title?: string,
  artist?: string
): Promise<string | null> {
  if (/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
    return rawId;
  }
  const query = `${title || ''} ${artist || ''} Official`.trim();
  if (!query) return null;

  const cacheKey = `yt_resolve_id_${query.toLowerCase()}`;
  const cached = kvCache.get<string>(cacheKey);
  if (cached) return cached;

  try {
    const res: any = await yt.search(query, { type: 'video' });
    const first = res?.videos?.[0];
    if (first?.id && /^[a-zA-Z0-9_-]{11}$/.test(first.id)) {
      kvCache.set(cacheKey, first.id, 24 * 3600);
      return first.id;
    }
  } catch (err: any) {
    console.warn('[YouTube Resolve] Failed:', err?.message);
  }
  return null;
}

export async function analyzeTrackCommentsEmotion(
  yt: Innertube,
  rawVideoId: string,
  title = '',
  artist = ''
): Promise<CommentEmotionResult> {
  const videoId = (await resolveRealYouTubeVideoId(yt, rawVideoId, title, artist)) || rawVideoId;
  const cacheKey = `yt_emotion_v3_${videoId}`;
  const cached = kvCache.get<CommentEmotionResult>(cacheKey);
  if (cached) return cached;

  let comments = await fetchRealYouTubeComments(yt, videoId);
  let effectiveVideoId = videoId;

  // If no comments were returned (e.g. Topic/Auto-generated audio with comments disabled),
  // try finding the Official MV for this song to read real fan comments!
  if (comments.length === 0 && title) {
    try {
      const mvQuery = `${title} ${artist} Official Video`.trim();
      const sRes: any = await yt.search(mvQuery, { type: 'video' });
      const mvCandidate = (sRes?.videos || []).find(
        (v: any) => v?.id && v.id !== videoId && /^[a-zA-Z0-9_-]{11}$/.test(v.id)
      );
      if (mvCandidate?.id) {
        const mvComments = await fetchRealYouTubeComments(yt, mvCandidate.id);
        if (mvComments.length > 0) {
          comments = mvComments;
          effectiveVideoId = mvCandidate.id;
        }
      }
    } catch {
      // Ignore fallback search failure
    }
  }

  const lexiconResult = extractEmotionsLexicon(effectiveVideoId, comments);
  const finalResult = await refineWithGemini(effectiveVideoId, title, artist, comments, lexiconResult);

  if (comments.length > 0) {
    kvCache.set(cacheKey, finalResult, 6 * 3600);
  }
  return finalResult;
}

// Clean track title extracted from YouTube video titles
function cleanSongMetadata(rawTitle: string, rawAuthor: string, requestedArtist?: string): {
  title: string;
  artist: string;
} {
  let title = rawTitle
    .replace(/［[^］]*Official[^］]*］/gi, '')
    .replace(/\[[^\]]*Official[^\]]*\]/gi, '')
    .replace(/\([^)]*Official[^)]*\)/gi, '')
    .replace(/【[^】]*歌詞[^】]*】/gi, '')
    .replace(/\[[^\]]*MV[^\]]*\]/gi, '')
    .replace(/\([^)]*Music Video[^)]*\)/gi, '')
    .replace(/Music Video/gi, '')
    .replace(/Official Video/gi, '')
    .replace(/Official Audio/gi, '')
    .trim();

  let artist = rawAuthor.replace(/\s*-\s*Topic$/i, '').trim();

  // Split "Artist - Song Title" or "Song Title / Artist"
  const dashSplit = title.split(/\s+[-–—]\s+/);
  if (dashSplit.length === 2) {
    const [left, right] = dashSplit;
    if (
      requestedArtist &&
      right.toLowerCase().includes(requestedArtist.toLowerCase())
    ) {
      title = left.trim();
      artist = right.trim();
    } else {
      artist = left.trim();
      title = right.trim();
    }
  } else if (title.includes(' / ')) {
    const slashSplit = title.split(/\s+\/\s+/);
    if (slashSplit.length === 2) {
      title = slashSplit[0].trim();
      if (!requestedArtist) artist = slashSplit[1].trim();
    }
  }

  // Normalize Official HIGE DANDISM channel naming if matching requested artist
  if (requestedArtist && /髭男|hige\s*dan/i.test(artist) && /髭男|hige\s*dan/i.test(requestedArtist)) {
    artist = 'Official髭男dism';
  } else if (requestedArtist && artist.toLowerCase() === requestedArtist.toLowerCase()) {
    artist = requestedArtist;
  }

  return {
    title: title.replace(/^["「]|["」]$/g, '').trim() || rawTitle,
    artist: normalizeArtistName(artist || requestedArtist || 'Artist'),
  };
}

function isAuthenticMusicVideo(rawTitle: string, rawAuthor: string, durationSeconds: number): boolean {
  const lower = rawTitle.toLowerCase();
  const authorLower = rawAuthor.toLowerCase();

  if (durationSeconds > 0 && (durationSeconds < 75 || durationSeconds > 540)) {
    return false; // Skip <75s shorts/teasers and >9min medleys/1-hour BGM loops
  }

  // Filter out AI-generated imitation/slop channels
  if (/(ai\s*song|ai\s*music|suno|udio|bgm\s*channel)/i.test(authorLower)) {
    return false;
  }

  // Filter titles with excessive emoji spam (common on AI slop uploads)
  const emojiMatches = rawTitle.match(/[\u{1F300}-\u{1FAFF}]/gu);
  if (emojiMatches && emojiMatches.length >= 3) {
    return false;
  }

  const blacklist = [
    '風',
    'aiソング',
    'ai生成',
    'ai作曲',
    '歌ってみた',
    '弾いてみた',
    '叩いてみた',
    'カバー',
    'cover',
    'カラオケ',
    'karaoke',
    'リアクション',
    'reaction',
    'メドレー',
    'medley',
    '1時間',
    '作業用bgm',
    '耐久',
    'nightcore',
    'slowed',
    'remix',
    '#shorts',
    'shorts',
    'trailer',
    'teaser',
    'ティザー',
    'ダイジェスト',
    'オルゴール',
    'ピアノver',
    'piano ver',
    'mad',
    '弾き語り',
    '歌い方',
    'ボイトレ',
    'ボイストレーナー',
    '歌う',
    '解説',
    'レッスン',
    'reaction',
  ];
  return !blacklist.some((bad) => lower.includes(bad));
}

function matchesRequestedArtist(rawTitle: string, rawAuthor: string, requestedArtist: string): boolean {
  const normReq = requestedArtist.toLowerCase().trim();
  const auth = rawAuthor.toLowerCase();
  const title = rawTitle.toLowerCase();

  // Official channel aliases for top Japanese artists
  const aliasMap: { req: RegExp; author: RegExp }[] = [
    { req: /official髭男dism|髭男/i, author: /hige\s*dan|髭男/i },
    { req: /vaundy/i, author: /vaundy/i },
    { req: /yoasobi/i, author: /yoasobi|ayase/i },
    { req: /king\s*gnu/i, author: /king\s*gnu/i },
    { req: /mrs\.?\s*green\s*apple/i, author: /mrs\.?\s*green\s*apple/i },
    { req: /back\s*number/i, author: /back\s*number/i },
    { req: /米津玄師/i, author: /米津玄師|kenshi\s*yonezu/i },
    { req: /優里/i, author: /優里|yuuri/i },
    { req: /藤井\s*風/i, author: /藤井\s*風|fujii\s*kaze/i },
    { req: /ado/i, author: /\bado\b/i },
  ];

  for (const entry of aliasMap) {
    if (entry.req.test(requestedArtist)) {
      return entry.author.test(rawAuthor) || entry.author.test(rawTitle);
    }
  }

  return auth.includes(normReq) || title.includes(normReq);
}

function parseDurationSeconds(text: string): number {
  if (!text) return 0;
  const parts = text.split(':').map((n) => parseInt(n, 10));
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  return 0;
}

export interface RecommendedTrackWithEmotion {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  commentEmotion: CommentEmotionResult;
}

export async function generateCommentBasedMoodRecommendations(
  yt: Innertube,
  moodId: MoodId,
  rawArtist?: string
): Promise<{
  tracks: RecommendedTrackWithEmotion[];
  analyzedTotalComments: number;
  topEmotionTags: string[];
}> {
  const mood = MOOD_DEFINITIONS[moodId] || MOOD_DEFINITIONS.energy;
  const artistFilter =
    rawArtist && rawArtist !== '指定なし' && rawArtist !== 'all' ? rawArtist.trim() : undefined;

  const queries = artistFilter
    ? [
        `${artistFilter} ${mood.keywords} Official`,
        `${artistFilter} Official Video`,
      ]
    : mood.searchQueries;

  const searchResults = await Promise.all(
    queries.map(async (q) => {
      const qCacheKey = `yt_search_mood_v5_${q.toLowerCase()}`;
      const cachedVids = kvCache.get<any[]>(qCacheKey);
      if (cachedVids) return cachedVids;
      try {
        const res: any = await yt.search(q, { type: 'video' });
        const list = (res?.videos || []).slice(0, 8).map((v: any) => ({
          id: v.id,
          rawTitle: v.title?.text || v.title?.toString?.() || '',
          rawAuthor: v.author?.name || '',
          duration: v.duration?.text || '',
          durationSeconds: parseDurationSeconds(v.duration?.text || ''),
        }));
        if (list.length > 0) {
          kvCache.set(qCacheKey, list, 12 * 3600);
        }
        return list;
      } catch (e: any) {
        console.warn(`[Mood Search] Query failed (${q}):`, e?.message);
        return [];
      }
    })
  );

  const candidates: {
    id: string;
    title: string;
    artist: string;
    duration: string;
    durationSeconds: number;
    thumbnail: string;
  }[] = [];
  const seenKeys = new Set<string>();
  const artistCounts = new Map<string, number>();

  // Interleave results across queries so multi-artist queries are balanced before slicing
  const maxLen = Math.max(...searchResults.map((l) => l.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const list of searchResults) {
      const v = list[i];
      if (!v) continue;
      if (!v.id || !/^[a-zA-Z0-9_-]{11}$/.test(v.id)) continue;
      if (!isAuthenticMusicVideo(v.rawTitle, v.rawAuthor, v.durationSeconds)) continue;

      if (artistFilter && !matchesRequestedArtist(v.rawTitle, v.rawAuthor, artistFilter)) {
        continue;
      }

      const cleaned = cleanSongMetadata(v.rawTitle, v.rawAuthor, artistFilter);
      const dedupeKey = cleaned.title.toLowerCase().replace(/[\s・\-!！?？「」『』\[\]()（）]/g, '');
      if (seenKeys.has(v.id) || seenKeys.has(dedupeKey)) continue;

      // Enforce multi-artist diversity when no specific artist was selected
      if (!artistFilter) {
        const normArtKey = cleaned.artist.toLowerCase().replace(/\s+/g, '');
        const cnt = artistCounts.get(normArtKey) || 0;
        if (cnt >= 2) continue;
        artistCounts.set(normArtKey, cnt + 1);
      }

      seenKeys.add(v.id);
      seenKeys.add(dedupeKey);

      candidates.push({
        id: v.id,
        title: cleaned.title,
        artist: cleaned.artist,
        duration: v.duration || '4:00',
        durationSeconds: v.durationSeconds || 240,
        thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      });
    }
  }

  // Analyze real YouTube comments on top 10 candidate songs in parallel
  const targetCandidates = candidates.slice(0, 10);
  const enriched = await Promise.all(
    targetCandidates.map(async (track) => {
      const emotion = await analyzeTrackCommentsEmotion(yt, track.id, track.title, track.artist);
      return {
        ...track,
        commentEmotion: emotion,
      };
    })
  );

  // Rank by how strongly the song's real YouTube comments match the requested mood
  // (Prioritizing songs with verified comments >= 3)
  enriched.sort((a, b) => {
    const validA = a.commentEmotion.analyzedCount >= 3 ? 30 : 0;
    const validB = b.commentEmotion.analyzedCount >= 3 ? 30 : 0;
    const scoreA =
      validA +
      (a.commentEmotion.emotionScores[moodId] || 0) +
      (a.commentEmotion.dominantMood === moodId ? 15 : 0);
    const scoreB =
      validB +
      (b.commentEmotion.emotionScores[moodId] || 0) +
      (b.commentEmotion.dominantMood === moodId ? 15 : 0);
    return scoreB - scoreA;
  });

  const finalTracks = enriched.slice(0, 8);
  const analyzedTotalComments = finalTracks.reduce(
    (sum, t) => sum + (t.commentEmotion.analyzedCount || 0),
    0
  );

  const tagCounts = new Map<string, number>();
  for (const t of finalTracks) {
    for (const tag of t.commentEmotion.emotionTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topEmotionTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    tracks: finalTracks,
    analyzedTotalComments,
    topEmotionTags,
  };
}
