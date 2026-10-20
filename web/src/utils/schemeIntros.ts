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

export function schemeIntro(fontName: string, lang: "zh" | "en"): string | undefined {
  const key = schemeKey(fontName);
  const match = Object.keys(SCHEME_INTROS)
    .filter((k) => key.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? SCHEME_INTROS[match][lang] : undefined;
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

