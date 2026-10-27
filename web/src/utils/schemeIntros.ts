/**
 * One short introduction per annotation scheme, shown on every /specimen
 * page that uses it (all styles — Sans / Serif / Hand — share one text).
 * Keys are font names minus the "Wing<Style>" prefix; a font matches the
 * longest key its name starts with, so "YueJyutpingMarks" and
 * "TaigiTailoTaipak" fall back to "YueJyutping" / "TaigiTailo". A font
 * with no matching key just shows the generated summary.
 */
const SOUND_SPELLING = {
  zh: "空耳注音用學習者已經識嘅文字，大致拼出廣東話讀音，等未學粵拼嘅人第一日就可以開口讀。佢係過渡工具，唔係用嚟取代粵拼。",
  en: "This sound-spelling writes Cantonese pronunciation approximately in a script the learner already reads, so someone who hasn't learned Jyutping yet can read aloud from day one. It is a bridge, not a replacement for Jyutping.",
};

const SCHEME_INTROS: Record<string, { zh: string; en: string }> = {
  YueJyutping: {
    zh: "粵拼（香港語言學會粵語拼音方案）由香港語言學會於 1993 年公布，係而家網上、詞典同語言學界最通用嘅粵語拼音。",
    en: "Jyutping is the Cantonese romanization published by the Linguistic Society of Hong Kong in 1993, and the most widely used one today online, in dictionaries and in linguistics.",
  },
  YueYale: {
    zh: "耶魯拼音源自耶魯大學二十世紀中期嘅粵語教材，好多英文粵語課本同詞典都用佢，英語使用者比較容易上手。",
    en: "Yale romanization comes from Yale University's mid-20th-century Cantonese teaching materials. Many English-language Cantonese textbooks and dictionaries use it, and English speakers tend to find it easy to pick up.",
  },
  YueLau: {
    zh: "劉錫祥拼音由劉錫祥（Sidney Lau）為香港政府嘅粵語課程設計，佢嘅粵語教材同《A Practical Cantonese-English Dictionary》都用呢套拼音。",
    en: "Sidney Lau romanization was designed by Sidney Lau for the Hong Kong government's Cantonese courses, and is used throughout his textbooks and A Practical Cantonese-English Dictionary.",
  },
  YueWong: {
    zh: "黃錫凌式出自黃錫凌 1941 年嘅《粵音韻彙》，用國際音標式符號注音，聲調用黃氏聲調符號標示，係傳統粵語字典常見嘅注音方法。",
    en: "Wong Shik-ling's scheme comes from his 1941 rhyming dictionary 粵音韻彙. It uses IPA-style symbols with Wong's own tone marks, and is common in traditional Cantonese dictionaries.",
  },
  YueGuangdong: {
    zh: "廣州話拼音方案由廣東省教育部門於 1960 年公布，內地出版嘅廣州話字典多數用呢套方案。",
    en: "The Guangzhou romanization scheme was published by the Guangdong provincial education authorities in 1960, and is used by most Cantonese dictionaries published in mainland China.",
  },
  YueChishima: {
    zh: "千島式由日本粵語學者千島英一設計，見於佢嘅《東方廣東語辭典》同日本嘅粵語教材。",
    en: "The Chishima scheme was designed by the Japanese Cantonese scholar Chishima Eiichi, and is used in his Toho Cantonese dictionary and in Cantonese textbooks published in Japan.",
  },
  YueThai: SOUND_SPELLING,
  YueKatakana: SOUND_SPELLING,
  YueHangul: SOUND_SPELLING,
  YueUrdu: SOUND_SPELLING,
  YueHindi: SOUND_SPELLING,
  YuePunjabi: SOUND_SPELLING,
  YueBaybayin: SOUND_SPELLING,
  Cangjie: {
    zh: "倉頡碼係倉頡輸入法嘅字根編碼，輸入法由朱邦復於 1976 年發明。呢隻字體將每個字嘅倉頡碼印喺字上面，方便學倉頡或者查碼。",
    en: "Cangjie codes are the radical sequences of the Cangjie input method, invented by Chu Bong-Foo in 1976. This font prints each character's Cangjie code above it, for learning the method or looking up a code.",
  },
  GuoyuPinyin: {
    zh: "漢語拼音加聲調符號，讀音跟台灣教育部《重編國語辭典修訂本》。",
    en: "Hanyu Pinyin with tone marks, with readings from Taiwan's Ministry of Education Revised Mandarin Chinese Dictionary.",
  },
  GuoyuZhuyin: {
    zh: "注音符號係台灣學校教國語用嘅標音符號，讀音跟台灣教育部《重編國語辭典修訂本》。",
    en: "Zhuyin (Bopomofo) is the phonetic notation taught in Taiwanese schools; readings follow Taiwan's Ministry of Education Revised Mandarin Chinese Dictionary.",
  },
  PutonghuaPinyin: {
    zh: "漢語拼音加聲調符號，讀音跟普通話標準，配簡體字。",
    en: "Hanyu Pinyin with tone marks, following Standard Mandarin (Putonghua) readings, for Simplified Chinese text.",
  },
  TaigiTailo: {
    zh: "台羅（臺灣閩南語羅馬字拼音方案）由台灣教育部於 2006 年公布，係教育部辭典同學校教材用嘅台語羅馬字。",
    en: "Tâi-lô is the Taiwanese Hokkien romanization published by Taiwan's Ministry of Education in 2006, used in the ministry's dictionary and in school materials.",
  },
  TaigiPOJ: {
    zh: "白話字（POJ）由十九世紀嘅基督教傳教士推廣，係歷史最悠久嘅台語羅馬字，教會同好多舊文獻都用佢。",
    en: "Pe̍h-ōe-jī (POJ) was spread by Christian missionaries in the 19th century. It is the oldest Taiwanese romanization, used by churches and in much older literature.",
  },
  TaigiTPS: {
    zh: "臺灣方音符號以注音符號為基礎，加上台語專用嘅符號嚟標台語讀音。",
    en: "Taiwanese Phonetic Symbols extend Zhuyin (Bopomofo) with extra symbols for sounds specific to Taiwanese.",
  },
  TaigiKana: {
    zh: "臺灣語假名係日治時期用片假名標台語讀音嘅方法。",
    en: "Taiwanese kana is the katakana-based notation for Taiwanese used during the Japanese era.",
  },
  TeochewPengim: {
    zh: "潮州話拼音方案（潮拼）由廣東省教育部門於 1960 年公布。",
    en: "Peng'im is the Teochew romanization published by the Guangdong provincial education authorities in 1960.",
  },
  TeochewPUJ: {
    zh: "潮州白話字（PUJ）係十九世紀傳教士為潮州話設計嘅羅馬字。",
    en: "Peh-uē-jī (PUJ) is the romanization 19th-century missionaries devised for Teochew.",
  },
  JapaneseFurigana: {
    zh: "振假名係日文喺漢字旁邊標讀音嘅做法，呢隻字體標漢字嘅音讀同訓讀。",
    en: "Furigana are the small kana Japanese prints beside kanji to show their reading; this font annotates both on'yomi and kun'yomi readings.",
  },
  HindiRoman: {
    zh: "天城文印地文配 ISO 15919 羅馬字轉寫。ISO 15919 係南亞文字轉寫嘅國際標準。",
    en: "Devanagari Hindi with ISO 15919 romanization, the international standard for transliterating South Asian scripts.",
  },
  ArabicDIN31635: {
    zh: "阿拉伯文配 DIN 31635 轉寫，係德國標準化學會訂立嘅阿拉伯字母轉寫標準。",
    en: "Arabic with DIN 31635 transliteration, the German Institute for Standardization's standard for romanizing Arabic.",
  },
};

/** Font name without its "Wing<Style>" prefix: "WingHandYueYale" -> "YueYale". */
export const schemeKey = (fontName: string): string =>
  fontName.replace(/^Wing(Sans|Serif|Hand)/, "");

const SOUND_SPELLING_JA =
  "空耳表記は、学習者がすでに読める文字で広東語の発音をおおまかに書き表したものです。まだ粵拼（ジュッピン）を覚えていない人でも、初日から声に出して読めます。粵拼の代わりではなく、粵拼への橋渡しです。";

/** Japanese intros, keyed like SCHEME_INTROS; a missing key falls back to English. */
const SCHEME_INTROS_JA: Record<string, string> = {
  YueJyutping: "粵拼（ジュッピン、香港語言学会粵語拼音方案）は香港語言学会が 1993 年に発表した広東語のローマ字表記で、現在ネット上、辞書、言語学でもっとも広く使われています。広東語を学ぶなら、まず覚えたい表記法です。",
  YueYale: "イェール式は、20 世紀中ごろのイェール大学の広東語教材に由来するローマ字表記です。英語圏の広東語教科書や辞書の多くで使われています。",
  YueLau: "劉錫祥式は、劉錫祥（Sidney Lau）が香港政府の広東語講座のために考案した表記で、彼の教科書や『A Practical Cantonese-English Dictionary』で使われています。",
  YueWong: "黄錫凌式は、黄錫凌の 1941 年の韻書《粵音韻彙》に由来します。国際音声記号風の記号と黄氏独自の声調記号を使い、伝統的な広東語辞典でよく見られます。",
  YueGuangdong: "広州話拼音方案は 1960 年に広東省の教育当局が発表した表記法で、中国大陸で出版される広東語辞典の多くが採用しています。",
  YueChishima: "千島式は、日本の広東語研究者・千島英一氏が考案した表記法で、『東方広東語辞典』や日本の広東語教材で使われています。",
  YueThai: SOUND_SPELLING_JA,
  YueKatakana: SOUND_SPELLING_JA,
  YueHangul: SOUND_SPELLING_JA,
  YueUrdu: SOUND_SPELLING_JA,
  YueHindi: SOUND_SPELLING_JA,
  YuePunjabi: SOUND_SPELLING_JA,
  YueBaybayin: SOUND_SPELLING_JA,
  Cangjie: "倉頡コードは、1976 年に朱邦復が考案した倉頡入力法の字根コードです。このフォントは各文字の上に倉頡コードを表示するので、倉頡の練習やコードの確認に使えます。",
  GuoyuPinyin: "声調記号付きの漢語拼音。読みは台湾教育部《重編國語辭典修訂本》に従います。",
  GuoyuZhuyin: "注音符号は台湾の学校で國語を教えるのに使われる表音記号です。読みは台湾教育部《重編國語辭典修訂本》に従います。",
  PutonghuaPinyin: "声調記号付きの漢語拼音。標準の普通話の読みに従い、簡体字の文章向けです。",
  TaigiTailo: "台羅（臺灣閩南語羅馬字拼音方案）は台湾教育部が 2006 年に発表した台湾語のローマ字表記で、教育部の辞典や学校教材で使われています。",
  TaigiPOJ: "白話字（POJ）は 19 世紀にキリスト教の宣教師が広めた、もっとも歴史の長い台湾語のローマ字表記です。教会や多くの古い文献で使われています。",
  TaigiTPS: "臺灣方音符號は注音符号をもとに、台湾語特有の音を表す記号を加えたものです。",
  TaigiKana: "台湾語仮名は、日本統治時代に台湾語の読みをカタカナで表した表記法です。",
  TeochewPengim: "潮州話拼音方案（潮拼）は 1960 年に広東省の教育当局が発表した表記法です。",
  TeochewPUJ: "潮州白話字（PUJ）は、19 世紀の宣教師が潮州語のために考案したローマ字表記です。",
  JapaneseFurigana: "ふりがなは漢字の読みを示す小さな仮名です。このフォントは漢字の音読みと訓読みの両方を表示します。",
  HindiRoman: "デーヴァナーガリー文字のヒンディー語に、南アジアの文字の翻字の国際標準 ISO 15919 によるローマ字を付けています。",
  ArabicDIN31635: "アラビア文字に、ドイツ規格協会が定めたアラビア文字の翻字規格 DIN 31635 によるローマ字を付けています。",
};

const SCHEME_JA: Record<string, string> = {
  Jyutping: "粵拼", Yale: "イェール式", Lau: "劉錫祥式", Wong: "黄錫凌式",
  Guangdong: "広州式", Chishima: "千島式", Cangjie: "倉頡",
  Pinyin: "ピンイン", Zhuyin: "注音符号", Tailo: "台羅", POJ: "白話字", TPS: "方音符号",
  Kana: "台湾語仮名", Pengim: "潮拼", PUJ: "潮州白話字", Furigana: "ふりがな",
};

export function schemeIntro(fontName: string, lang: "zh" | "en" | "ja"): string | undefined {
  const key = schemeKey(fontName);
  const match = Object.keys(SCHEME_INTROS)
    .filter((k) => key.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return undefined;
  if (lang === "ja") return SCHEME_INTROS_JA[match] ?? SCHEME_INTROS[match].en;
  return SCHEME_INTROS[match][lang];
}

const LANGUAGE_PREFIX = /^(Yue|Taigi|Guoyu|Putonghua|Teochew|Japanese|Thai|Hindi|Arabic|Inuktitut)/;
const SCHEME_EN: Record<string, string> = {
  Jyutping: "Jyutping", Yale: "Yale", Lau: "Sidney Lau", Wong: "Wong Shik-ling",
  Guangdong: "Guangzhou Romanization", Chishima: "Chishima", Cangjie: "Cangjie",
  Pinyin: "Pinyin", Zhuyin: "Zhuyin", Tailo: "Tâi-lô", POJ: "POJ", TPS: "TPS",
  Kana: "Taiwanese Kana", Pengim: "Peng'im", PUJ: "PUJ", Furigana: "Furigana",
};

/** English scheme name for search titles ("WingHandTaigiTailoTaipak" -> "Tâi-lô"), if it is a named scheme. */
export function schemeNameEn(fontName: string): string | undefined {
  const rest = schemeKey(fontName).replace(LANGUAGE_PREFIX, "");
  const token = rest.match(/^([A-Z]{2,}(?![a-z])|[A-Z][a-z]+)/)?.[1];
  return token ? SCHEME_EN[token] : undefined;
}


/** Japanese scheme name for search titles, if it is a named scheme. */
export function schemeNameJa(fontName: string): string | undefined {
  const rest = schemeKey(fontName).replace(LANGUAGE_PREFIX, "");
  const token = rest.match(/^([A-Z]{2,}(?![a-z])|[A-Z][a-z]+)/)?.[1];
  return token ? SCHEME_JA[token] : undefined;
}
