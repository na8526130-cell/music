export interface SearchConversionCandidate {
  query: string;
  label: string;
  kind: 'alias' | 'kana' | 'romaji';
}

// Comprehensive Japanese music artist, band & song alias dictionary
export const SEARCH_ALIASES: Record<string, string> = {
  // Artists & Bands (abbreviations, kana, romaji, kanji variants)
  'ヒゲダン': 'Official髭男dism',
  'ひげだん': 'Official髭男dism',
  '髭男': 'Official髭男dism',
  'higedan': 'Official髭男dism',
  'officialhigedandism': 'Official髭男dism',
  'ミセス': 'Mrs. GREEN APPLE',
  'みせす': 'Mrs. GREEN APPLE',
  'mga': 'Mrs. GREEN APPLE',
  'mrs': 'Mrs. GREEN APPLE',
  'mrsgreenapple': 'Mrs. GREEN APPLE',
  'バウンディ': 'Vaundy',
  'ばうんでぃ': 'Vaundy',
  'vaundy': 'Vaundy',
  'ヨアソビ': 'YOASOBI',
  'よあそび': 'YOASOBI',
  '夜遊び': 'YOASOBI',
  'yoasobi': 'YOASOBI',
  'キングヌー': 'King Gnu',
  'きんぐぬー': 'King Gnu',
  'kinggnu': 'King Gnu',
  '米津': '米津玄師',
  'よねづ': '米津玄師',
  'よねづけんし': '米津玄師',
  'yonezu': '米津玄師',
  'kenshiyonezu': '米津玄師',
  '藤井風': '藤井 風',
  'ふじいかぜ': '藤井 風',
  'fujiikaze': '藤井 風',
  'バックナンバー': 'back number',
  'ばっくなんばー': 'back number',
  'バクナン': 'back number',
  'ばくなん': 'back number',
  'backnumber': 'back number',
  'ミスチル': 'Mr.Children',
  'みすちる': 'Mr.Children',
  'mrchildren': 'Mr.Children',
  'ドリカム': 'DREAMS COME TRUE',
  'どりかむ': 'DREAMS COME TRUE',
  'ワンオク': 'ONE OK ROCK',
  'わんおく': 'ONE OK ROCK',
  'oor': 'ONE OK ROCK',
  'oneokrock': 'ONE OK ROCK',
  'バンプ': 'BUMP OF CHICKEN',
  'ばんぷ': 'BUMP OF CHICKEN',
  'boc': 'BUMP OF CHICKEN',
  'bumpofchicken': 'BUMP OF CHICKEN',
  'マンウィズ': 'MAN WITH A MISSION',
  'mwam': 'MAN WITH A MISSION',
  'セカオワ': 'SEKAI NO OWARI',
  'せかおわ': 'SEKAI NO OWARI',
  'sekaowa': 'SEKAI NO OWARI',
  'ウーバー': 'UVERworld',
  'うーばー': 'UVERworld',
  'uver': 'UVERworld',
  'ポルノ': 'ポルノグラフィティ',
  'ぽるの': 'ポルノグラフィティ',
  'ラッド': 'RADWIMPS',
  'らっど': 'RADWIMPS',
  'radwimps': 'RADWIMPS',
  'ずとまよ': 'ずっと真夜中でいいのに。',
  'ずっと真夜中': 'ずっと真夜中でいいのに。',
  'zutomayo': 'ずっと真夜中でいいのに。',
  'よるしか': 'ヨルシカ',
  'ヨルシカ': 'ヨルシカ',
  'yorushika': 'ヨルシカ',
  'リョクシャカ': '緑黄色社会',
  'りょくしゃか': '緑黄色社会',
  '緑黄色': '緑黄色社会',
  'ryokuoushoku': '緑黄色社会',
  'サウシー': 'Saucy Dog',
  'さうしー': 'Saucy Dog',
  'saucydog': 'Saucy Dog',
  'マカえん': 'マカロニえんぴつ',
  'マカロニ': 'マカロニえんぴつ',
  'まかろに': 'マカロニえんぴつ',
  'クリーピー': 'Creepy Nuts',
  'くりーぴー': 'Creepy Nuts',
  'creepynuts': 'Creepy Nuts',
  'ゆうり': '優里',
  'ユウリ': '優里',
  'yuuri': '優里',
  'あど': 'Ado',
  'アド': 'Ado',
  'ado': 'Ado',
  'あいみょん': 'あいみょん',
  'アイミョン': 'あいみょん',
  'aimyon': 'あいみょん',
  'キタニ': 'キタニタツヤ',
  'きたに': 'キタニタツヤ',
  'サカナ': 'サカナクション',
  'さかな': 'サカナクション',
  'sakanaction': 'サカナクション',
  'ブルエン': 'BLUE ENCOUNT',
  'マイヘア': 'My Hair is Bad',
  'スカパラ': '東京スカパラダイスオーケストラ',
  'アジカン': 'ASIAN KUNG-FU GENERATION',
  'スノ': 'Snow Man',
  'すの': 'Snow Man',
  'snowman': 'Snow Man',
  'なにわ': 'なにわ男子',
  'スノマン': 'Snow Man',
  'スピッツ': 'スピッツ',
  'すぴっつ': 'スピッツ',
  'spitz': 'スピッツ',
  'サザン': 'サザンオールスターズ',
  'さざん': 'サザンオールスターズ',
  'レミオロメン': 'レミオロメン',
  'れみおろめん': 'レミオロメン',
  'remioromen': 'レミオロメン',
  'いきものがかり': 'いきものがかり',
  'ikimonogakari': 'いきものがかり',
  'こぶくろ': 'コブクロ',
  'kobukuro': 'コブクロ',
  'あらし': '嵐',
  'arashi': '嵐',
  'なとり': 'natori',
  'natori': 'natori',
  'いまぜ': 'imase',
  'imase': 'imase',
  'テイラー': 'Taylor Swift',
  'ていらー': 'Taylor Swift',
  'ビリー': 'Billie Eilish',
  'びりー': 'Billie Eilish',
  'ブルーノ': 'Bruno Mars',
  'ぶるーの': 'Bruno Mars',
  'あいりっと': 'ILLIT',
  'にゅーじんず': 'NewJeans',
  'ニュージーンズ': 'NewJeans',
  'るせらふぃむ': 'LE SSERAFIM',
  'ルセラフィム': 'LE SSERAFIM',
  'えすぱ': 'aespa',
  'エスパ': 'aespa',
  'すとぷり': 'すとぷり',
  'ぼかろ': 'ボーカロイド',
  'ミク': '初音ミク',
  'はつねみく': '初音ミク',

  // Song title readings & aliases
  'ぷりてんだー': 'Pretender',
  'プリテンダー': 'Pretender',
  'pretender': 'Pretender',
  'さぶたいとる': 'Subtitle',
  'サブタイトル': 'Subtitle',
  'subtitle': 'Subtitle',
  'くらいべいびー': 'Cry Baby',
  'クライベイビー': 'Cry Baby',
  'crybaby': 'Cry Baby',
  'みっくすなっつ': 'Mixed Nuts',
  'ミックスナッツ': 'ミックスナッツ',
  'mixednuts': 'Mixed Nuts',
  'けせらせら': 'ケセラセラ',
  'らいらっく': 'ライラック',
  'かいじゅうのはなうた': '怪獣の花唄',
  'かいじゅう': '怪獣の花唄',
  'kaijunohanauta': '怪獣の花唄',
  'すいへいせん': '水平線',
  'suiheisen': '水平線',
  'べてるぎうす': 'ベテルギウス',
  'どらいふらわー': 'ドライフラワー',
  'はくじつ': '白日',
  'hakujitsu': '白日',
  'あいどる': 'アイドル',
  'よるにかける': '夜に駆ける',
  'ぶりんばんばんぼん': 'Bling-Bang-Bang-Born',
  'しんじだい': '新時代',
  'うっせえわ': 'うっせぇわ',
  'まりーごーるど': 'マリーゴールド',
  'あぽとーしす': 'アポトーシス',
  'たかねのはなこさん': '高嶺の花子さん',
  'さんがつここのか': '3月9日',
  'こなゆき': '粉雪',
  'れもん': 'Lemon',
  'だんすほーる': 'ダンスホール',
  'そらんじ': 'Soranji',
  'いんふぇるの': 'インフェルノ',
};

// Normalize full-width alphanumeric/spaces to half-width
export function normalizeFullWidth(input: string): string {
  return input
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hiraganaToKatakana(input: string): string {
  return input.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

export function katakanaToHiragana(input: string): string {
  return input.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

const ROMAJI_TABLE: [string, string][] = [
  ['ltsu', 'っ'], ['xtsu', 'っ'], ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  ['sha', 'しゃ'], ['shi', 'し'], ['shu', 'しゅ'], ['sho', 'しょ'],
  ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'],
  ['cha', 'ちゃ'], ['chi', 'ち'], ['chu', 'ちゅ'], ['cho', 'ちょ'],
  ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'],
  ['tsu', 'つ'], ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['ja', 'じゃ'], ['ji', 'じ'], ['ju', 'じゅ'], ['jo', 'じょ'],
  ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
  ['fa', 'ふぁ'], ['fi', 'ふぃ'], ['fe', 'ふぇ'], ['fo', 'ふぉ'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['si', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['ti', 'ち'], ['tu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['hu', 'ふ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wi', 'うぃ'], ['we', 'うぇ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['zi', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['va', 'ゔぁ'], ['vi', 'ゔぃ'], ['vu', 'ゔ'], ['ve', 'ゔぇ'], ['vo', 'ゔぉ'],
  ['nn', 'ん'],
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['-', 'ー'],
];

const ROMAJI_MAP = new Map<string, string>(ROMAJI_TABLE);

export function romajiToHiragana(input: string): string {
  const s = input.toLowerCase();
  if (!/^[a-z\s-]+$/.test(s)) return input;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') {
      out += ' ';
      i++;
      continue;
    }
    // Geminate consonant (e.g. "kko" -> "っこ")
    if (
      i + 1 < s.length &&
      ch === s[i + 1] &&
      /[bcdfghjklmpqrstvwxyz]/.test(ch) &&
      ch !== 'n'
    ) {
      out += 'っ';
      i++;
      continue;
    }
    let matched = false;
    for (const len of [4, 3, 2, 1]) {
      const sub = s.slice(i, i + len);
      const val = ROMAJI_MAP.get(sub);
      if (val) {
        out += val;
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Standalone 'n' before non-vowel/non-y or at end
    if (ch === 'n' && (i + 1 >= s.length || !/[aiueoyn]/.test(s[i + 1]))) {
      out += 'ん';
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

const ENGLISH_LOOKING_WORDS = new Set([
  'pretender', 'subtitle', 'cry', 'baby', 'mixed', 'nuts', 'editorial', 'traveler',
  'rejoice', 'lemon', 'hello', 'laughter', 'soranji', 'magnetic', 'idol', 'hero',
  'love', 'music', 'radio', 'rock', 'pop', 'ballad', 'song', 'live', 'tour',
  'newjeans', 'aespa', 'illit', 'vaundy', 'yoasobi', 'ado', 'milet', 'lisa', 'aimer',
  'official', 'mrs', 'green', 'apple', 'king', 'gnu', 'back', 'number', 'radwimps',
  'one', 'ok', 'bump', 'of', 'chicken', 'sekai', 'owari', 'uverworld', 'taylor',
  'swift', 'billie', 'eilish', 'bruno', 'mars', 'imase', 'natori', 'spitz',
]);

export function expandSearchQuery(input: string): {
  effectiveQuery: string;
  originalQuery: string;
  matchedAlias?: string;
} {
  const trimmed = normalizeFullWidth(input);
  if (!trimmed) {
    return { effectiveQuery: '', originalQuery: '' };
  }
  const lower = trimmed.toLowerCase();
  const compactLower = lower.replace(/\s+/g, '');

  // 1. Direct whole-string match (or without spaces e.g. "fujii kaze")
  if (SEARCH_ALIASES[lower]) {
    return {
      effectiveQuery: SEARCH_ALIASES[lower],
      originalQuery: trimmed,
      matchedAlias: SEARCH_ALIASES[lower],
    };
  }
  if (SEARCH_ALIASES[compactLower]) {
    return {
      effectiveQuery: SEARCH_ALIASES[compactLower],
      originalQuery: trimmed,
      matchedAlias: SEARCH_ALIASES[compactLower],
    };
  }

  // 2. Check romaji-converted kana against aliases (e.g. "rairakku" -> "らいらっく" -> "ライラック")
  if (/^[a-z\s-]+$/i.test(trimmed)) {
    const hira = romajiToHiragana(trimmed);
    const hiraCompact = hira.replace(/\s+/g, '');
    if (SEARCH_ALIASES[hira]) {
      return {
        effectiveQuery: SEARCH_ALIASES[hira],
        originalQuery: trimmed,
        matchedAlias: SEARCH_ALIASES[hira],
      };
    }
    if (SEARCH_ALIASES[hiraCompact]) {
      return {
        effectiveQuery: SEARCH_ALIASES[hiraCompact],
        originalQuery: trimmed,
        matchedAlias: SEARCH_ALIASES[hiraCompact],
      };
    }
  }

  // 3. Tokenized replacement (e.g. "ヒゲダン subtitle" -> "Official髭男dism Subtitle")
  const tokens = trimmed.split(/\s+/);
  let replaced = false;
  let matchedAlias: string | undefined;

  const newTokens = tokens.map((token) => {
    const tokenLower = token.toLowerCase();
    if (SEARCH_ALIASES[tokenLower]) {
      replaced = true;
      matchedAlias = SEARCH_ALIASES[tokenLower];
      return SEARCH_ALIASES[tokenLower];
    }
    const tokenHira = katakanaToHiragana(tokenLower);
    if (SEARCH_ALIASES[tokenHira]) {
      replaced = true;
      matchedAlias = SEARCH_ALIASES[tokenHira];
      return SEARCH_ALIASES[tokenHira];
    }
    if (/^[a-z-]+$/i.test(token) && !ENGLISH_LOOKING_WORDS.has(tokenLower)) {
      const convertedHira = romajiToHiragana(token);
      if (SEARCH_ALIASES[convertedHira]) {
        replaced = true;
        matchedAlias = SEARCH_ALIASES[convertedHira];
        return SEARCH_ALIASES[convertedHira];
      }
    }
    return token;
  });

  if (replaced) {
    return {
      effectiveQuery: newTokens.join(' '),
      originalQuery: trimmed,
      matchedAlias,
    };
  }

  return { effectiveQuery: trimmed, originalQuery: trimmed };
}

// Compute live conversion candidates as the user types (for dropdowns on mobile & desktop)
export function getSearchConversions(input: string): SearchConversionCandidate[] {
  const trimmed = normalizeFullWidth(input);
  if (!trimmed) return [];

  const results: SearchConversionCandidate[] = [];
  const seen = new Set<string>();
  const add = (cand: SearchConversionCandidate) => {
    const key = cand.query.trim().toLowerCase();
    if (!key || key === trimmed.toLowerCase() || seen.has(key)) return;
    seen.add(key);
    results.push(cand);
  };

  // 1. Exact/token expansion
  const expanded = expandSearchQuery(trimmed);
  if (expanded.matchedAlias || expanded.effectiveQuery.toLowerCase() !== trimmed.toLowerCase()) {
    add({
      query: expanded.effectiveQuery,
      label: expanded.effectiveQuery,
      kind: 'alias',
    });
  }

  // 2. Prefix matches from SEARCH_ALIASES (e.g. typing "ひげ" -> "Official髭男dism", "みせ" -> "Mrs. GREEN APPLE")
  const lower = trimmed.toLowerCase();
  const hiraFromRomaji = /^[a-z\s-]+$/i.test(trimmed) ? romajiToHiragana(trimmed) : '';
  for (const [alias, official] of Object.entries(SEARCH_ALIASES)) {
    if (
      alias.startsWith(lower) ||
      (hiraFromRomaji.length >= 2 && alias.startsWith(hiraFromRomaji))
    ) {
      add({
        query: official,
        label: official,
        kind: 'alias',
      });
      if (results.length >= 4) break;
    }
  }

  // 3. Pure Hiragana -> Katakana suggestion (helpful for song titles e.g. "さぶたいとる" -> "サブタイトル")
  if (/^[\u3041-\u3096ー\s]+$/.test(trimmed)) {
    const kata = hiraganaToKatakana(trimmed);
    add({
      query: kata,
      label: kata,
      kind: 'kana',
    });
  }

  // 4. Pure Romaji -> Katakana / Hiragana conversion candidate when not a standard English word
  if (/^[a-z\s-]{2,}$/i.test(trimmed) && !ENGLISH_LOOKING_WORDS.has(lower)) {
    const hira = romajiToHiragana(trimmed);
    if (hira && hira !== lower && !/[a-z]/.test(hira)) {
      const kata = hiraganaToKatakana(hira);
      add({
        query: hira,
        label: hira,
        kind: 'romaji',
      });
      if (kata !== hira) {
        add({
          query: kata,
          label: kata,
          kind: 'romaji',
        });
      }
    }
  }

  return results.slice(0, 5);
}
