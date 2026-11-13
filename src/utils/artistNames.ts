const ROMANIZED_ARTIST_MAP: Record<string, string> = {
  'official hige dandism': 'Official髭男dism',
  'official higedandism': 'Official髭男dism',
  'hige dandism': 'Official髭男dism',
  'higedan': 'Official髭男dism',
  'kenshi yonezu': '米津玄師',
  'yonezu kenshi': '米津玄師',
  'hachi': '米津玄師',
  'fujii kaze': '藤井 風',
  'kaze fujii': '藤井 風',
  'yuuri': '優里',
  'aimyon': 'あいみょん',
  'gen hoshino': '星野源',
  'hoshino gen': '星野源',
  'masaki suda': '菅田将暉',
  'suda masaki': '菅田将暉',
  'yorushika': 'ヨルシカ',
  'zutomayo': 'ずっと真夜中でいいのに。',
  'zutto mayonaka de iinoni.': 'ずっと真夜中でいいのに。',
  'zutto mayonaka de iinoni': 'ずっと真夜中でいいのに。',
  'ryokuoushoku shakai': '緑黄色社会',
  'sakanaction': 'サカナクション',
  'spitz': 'スピッツ',
  'ikimonogakari': 'いきものがかり',
  'yuzu': 'ゆず',
  'kobukuro': 'コブクロ',
  'ketsumeishi': 'ケツメイシ',
  'shonan no kaze': '湘南乃風',
  'hikaru utada': '宇多田ヒカル',
  'utada hikaru': '宇多田ヒカル',
  'lilas ikuta': '幾田りら',
  'ikuta lilas': '幾田りら',
  'kana nishino': '西野カナ',
  'nishino kana': '西野カナ',
  'ayumi hamasaki': '浜崎あゆみ',
  'namie amuro': '安室奈美恵',
  'shiina ringo': '椎名林檎',
  'sheena ringo': '椎名林檎',
  'ringo sheena': '椎名林檎',
  'tokyo incidents': '東京事変',
  'tokyo jihen': '東京事変',
  'southern all stars': 'サザンオールスターズ',
  'keisuke kuwata': '桑田佳祐',
  'masaharu fukuyama': '福山雅治',
  'kazumasa oda': '小田和正',
  'noriyuki makihara': '槇原敬之',
  'mariya takeuchi': '竹内まりや',
  'tatsuro yamashita': '山下達郎',
  'yumi matsutoya': '松任谷由実',
  'miyuki nakajima': '中島みゆき',
  'koji tamaki': '玉置浩二',
  'anzen chitai': '安全地帯',
  'ken hirai': '平井堅',
  'dai hirai': '平井大',
  'shota shimizu': '清水翔太',
  'miliyah kato': '加藤ミリヤ',
  'ai otsuka': '大塚愛',
  'akina nakamori': '中森明菜',
  'seiko matsuda': '松田聖子',
  'yutaka ozaki': '尾崎豊',
  'tsuyoshi nagabuchi': '長渕剛',
  'ryuichi sakamoto': '坂本龍一',
  'joe hisaishi': '久石譲',
  'motohiro hata': '秦基博',
  'naotaro moriyama': '森山直太朗',
  'tamio okuda': '奥田民生',
  'elephant kashimashi': 'エレファントカシマシ',
  'sukima switch': 'スキマスイッチ',
  'remioromen': 'レミオロメン',
  'fujifabric': 'フジファブリック',
  'macaroni empitsu': 'マカロニえんぴつ',
  'macaroni enpitsu': 'マカロニえんぴつ',
  'hitsujibungaku': '羊文学',
  'ayano kaneko': 'カネコアヤノ',
  'tatsuya kitani': 'キタニタツヤ',
  'natori': 'なとり',
  'keina suda': '須田景凪',
  'takaya kawasaki': '川崎鷹也',
  'rokudenashi': 'ロクデナシ',
  'marcy': 'マルシィ',
  'neguse.': 'ねぐせ。',
  'sambomaster': 'サンボマスター',
  'frederic': 'フレデリック',
  'kyuso nekokami': 'キュウソネコカミ',
  'yabai t-shirts yasan': 'ヤバイTシャツ屋さん',
  'creephyp': 'クリープハイプ',
  'gesu no kiwami otome': 'ゲスの極み乙女',
  'suiyoubi no campanella': '水曜日のカンパネラ',
  'wednesday campanella': '水曜日のカンパネラ',
  'mafumafu': 'まふまふ',
  'soraru': 'そらる',
  'amatsuki': '天月',
  'strawberry prince': 'すとぷり',
  'nogizaka46': '乃木坂46',
  'sakurazaka46': '櫻坂46',
  'hinatazaka46': '日向坂46',
  'arashi': '嵐',
  'naniwa danshi': 'なにわ男子',
  'chanmina': 'ちゃんみな',
  'daichi miura': '三浦大知',
  'eir aoi': '藍井エイル',
  'kyary pamyu pamyu': 'きゃりーぱみゅぱみゅ',
  'atarashii gakko!': '新しい学校のリーダーズ',
  'porno graffitti': 'ポルノグラフィティ',
  'koda kumi': '倖田來未',
  'kumi koda': '倖田來未',
  'chihiro onitsuka': '鬼束ちひろ',
  'mika nakashima': '中島美嘉',
  'ayaka': '絢香',
  'mao abe': '阿部真央',
  'kaela kimura': '木村カエラ',
  'takanori nishikawa': '西川貴教',
  'motoki ohmori': '大森元貴',
  'motoki omori': '大森元貴',
  'shishamo': 'SHISHAMO',
  'kana-boon': 'KANA-BOON',
  'radwimps': 'RADWIMPS',
  'bump of chicken': 'BUMP OF CHICKEN',
  'one ok rock': 'ONE OK ROCK',
  'yoasobi': 'YOASOBI',
  'mrs. green apple': 'Mrs. GREEN APPLE',
  'king gnu': 'King Gnu',
  'back number': 'back number',
  'vaundy': 'Vaundy',
  'creepy nuts': 'Creepy Nuts',
  'sekai no owari': 'SEKAI NO OWARI',
};

const HAS_JAPANESE_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/;

function normalizeSingleArtistToken(raw: string): string {
  let cleaned = raw
    .replace(/\s*[-–—]\s*(?:Topic|トピック)$/i, '')
    .replace(/\s*(?:Official\s*YouTube\s*Channel|Official\s*Channel|VEVO)$/i, '')
    .trim();

  if (!cleaned) return '';

  // Handle bilingual "Kenshi Yonezu / 米津玄師" or "米津玄師 / Kenshi Yonezu"
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/').map((p) => p.trim()).filter(Boolean);
    const jaPart = parts.find((p) => HAS_JAPANESE_REGEX.test(p));
    if (jaPart && parts.length === 2) {
      cleaned = jaPart;
    }
  }

  // Handle "Kenshi Yonezu (米津玄師)"
  const parenJa = cleaned.match(/^[A-Za-z0-9\s.'&-]+\(([^)]*[\u3040-\u30FF\u4E00-\u9FAF][^)]*)\)$/);
  if (parenJa?.[1]) {
    cleaned = parenJa[1].trim();
  }

  const lower = cleaned.toLowerCase().replace(/\s+/g, ' ').trim();
  if (ROMANIZED_ARTIST_MAP[lower]) {
    return ROMANIZED_ARTIST_MAP[lower];
  }

  return cleaned;
}

export function normalizeArtistName(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const single = normalizeSingleArtistToken(trimmed);
  if (single !== trimmed && ROMANIZED_ARTIST_MAP[trimmed.toLowerCase().replace(/\s+/g, ' ').trim()]) {
    return single;
  }

  // Normalize comma/ampersand-separated featured artist lists
  if (/[,、&×]/.test(trimmed)) {
    const parts = trimmed.split(/\s*([,、&×])\s*/);
    return parts
      .map((part) => {
        if (/^[,、&×]$/.test(part)) return part === ',' ? ', ' : ` ${part} `;
        return normalizeSingleArtistToken(part);
      })
      .join('')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return single;
}
