/**
 * Lyric / phrase pool that the /showcase page rotates through when
 * the user hasn't typed their own sample text. Grouped by dialect so
 * `useTemplateRotation(msg, dialectKey)` can pick a pool that
 * matches whichever font card is being rendered — a Cantonese font
 * card cycles only through Cantonese lyrics, a Mandarin card cycles
 * only through Mandarin lyrics, etc.
 *
 * Dialect keys here MUST match the keys in `AVAILABLE_FONTS` below
 * (cantonese / taiwanese / teochew / …) so the per-card lookup in
 * Main.tsx can route correctly via `findTemplateKey()`. Exception:
 * mandarin is split into mandarin-tw (繁體) / mandarin-cn (简体)
 * because each font only covers one script.
 *
 * The flat `TEMPLATES` export underneath is preserved for the
 * Specimen page, which renders one font in isolation and doesn't
 * have a notion of "which dialect am I" — it rotates through the
 * full pool.
 */
export const TEMPLATES_BY_DIALECT: Record<string, string[]> = {
  cantonese: [
    "勒到呼吸困難才知變扯線木偶",
    "拳頭若放開　可擁抱四周",
    "活着自活着 萬象在逝水中暢泳",
    "如果心聲真有療效　誰怕暴露更多",
    "回望最初　當喪失是得着可不可",
    "立志助世人脫貧以為　便偉大到像多麼有為",
    "誰能憑愛意要富士山私有",
    "惟有我聽過你對我哭訴",
    "各有各唱自己歌　各找自我",
    "寂寞在流動　某些真的假的夢",
    "如海嘯衝擊我　使我向下沉",
    "我會在旁　開心玩　四處捐",
    "我為你偷偷心動　感覺神情凝重",
    "旋轉兜圈的感覺太逼真",
    "我這樣討厭　他完美如此　能共你好好地相處",
    "曳搖共對輕舟飄　互傳誓約慶春曉",
    "甜蜜地與愛人　風裏飛奔",
    "願一生中苦痛快樂也體驗",
    "想不想也日夜懷念　連甜夢也不夠甜",
    "遲了悔改　只好講抵你離開",
    "荒誕像這一切也變成往常",
    "別要我洗去　我的雙腳泥濘",
    "留在彼此的身邊　牽着手再繼續飛",
    "永遠有一個吻未嘗",
    "望着他雙眼想別人　人留下了留不低那片心",
  ],
  // Taiwanese / Southern Min samples — render with the 思源黑體（台羅）
  // or （白話字）showcase fonts to see Tâi-lô / POJ tone marks above.
  // Mix of pre-war Taiwanese folk (鄧雨賢's 雨夜花 / 望春風), 50s-60s
  // 文夏 era classics, and modern 蔡振南 / 江蕙 / 葉啟田 / 林淑容
  // works — chosen for one-line memorability and broad recognition
  // across HK / TW / overseas Hō-ló communities.
  taiwanese: [
    "天烏烏　欲落雨",
    "思念故鄉的月光　風吹過稻田",
    "雨夜花　雨夜花",
    "望春風　夜半三更",
    "天頂的月娘　知影我的心",
    "一支小雨傘　雙人來行",
    "酒矸通賣無",
    "愛拼才會贏",
    "阮若打開心內的門窗",
    "孤女的願望",
    "思慕的人　啊　怎樣會這呢無情",
    "六月的炎天引阮牽掛可愛的薄情郎",
  ],
  // Teochew (潮州話) samples — render with the 思源黑體（潮拼）or
  // （潮州白話字）showcase fonts to see Peng'im / PUJ above the chars.
  // Lyric + proverb mix sourced from 潮州歌仔 / 潮州歌冊 traditions plus
  // modern Teochew compositions. Falls back to 童謠 / 諺語 for lines
  // pop catalogues don't cover well.
  teochew: [
    "家己人講家己話",
    "潮州人講潮州話",
    "家己人　毋免講外話",
    "日頭赤焰焰　風吹田過番",
    "阿弟仔　食工夫茶",
    "潮州人　在他鄉",
    "來去呷茶　慢慢仔講",
    "故鄉的溪水　日日流",
    "阿姆煮飯　飯擔香",
    "潮州歌仔　唱不完",
    "親情如歌　永遠唱",
    "落雨大　水浸街",
  ],
  // Mandarin (普通話 / 國語) samples — render with the Mandarin
  // showcase fonts (思源宋體 拼音 / 小賴字體 拼音) to see Hanyu Pinyin
  // stacked above each character. The 普通話 (-cn) fonts now render
  // diacritic tone marks (mā) from the common-set mandarin-cn-toned-
  // trimmed mapping (+ full-width pinyin DIY input); the 國語 (-tw) fonts
  // use tone-marked pinyin / 注音 taken from the MOE 國語辭典 alone. Mix of 鄧麗君 / 王菲 / 羅大佑 / 周華健 / 五月天 / 朴樹
  // / 周深 — broad coverage across 70s–2010s 國語 pop so a reader
  // of any generation lands on something familiar.
  // Arabic samples — phrases drawn from the hand-curated
  // ~130-word starter set (arabic-romanization.csv). Each phrase
  // is a real composition the matrix-built font can render with
  // baked-in DIN 31635 romanization. Mixes greetings, common
  // sentences, and number sequences so a viewer sees the breadth
  // of what the font knows. Short enough to render single-line at
  // the showcase's default 48 px font size on phone-narrow
  // viewports without wrapping.
  arabic: [
    "السلام عليكم",
    "صباح الخير",
    "مساء الخير",
    "كتاب جديد",
    "بيت كبير",
    "صديق جميل",
    "حب وسلام",
    "نور وظل",
    "ماء بحر",
    "شمس قمر",
    "أب أم",
    "ابن بنت",
    "أخ أخت",
    "يد قلب",
    "عين فم",
    "حياة موت",
    "علم عقل",
    "حرب وسلام",
    "واحد اثنان ثلاثة",
    "كثير قليل",
  ],
  // Hindi (हिन्दी) samples — render with the Hindi showcase font
  // (Hind（ISO 15919 罗马字）) to see each Devanagari word carry its
  // ISO 15919 romanization (with Hindi word-final schwa deletion:
  // राम → rām) baked in. Every word here is present in
  // hindi-romanization.csv, so the word-unit font renders the whole
  // phrase — greetings, common nouns, and a number sequence, short
  // enough to stay single-line at the showcase's default size.
  hindi: [
    "नमस्ते",
    "धन्यवाद",
    "शुक्रिया",
    "सुबह",
    "हिंदी किताब",
    "अच्छा दोस्त",
    "नया घर",
    "प्यार",
    "खुशी",
    "जीवन",
    "दुनिया",
    "सपना",
    "आसमान",
    "फूल",
    "दिल",
    "एक दो तीन",
  ],
  // Same lines in both scripts: -tw fonts only map 繁體, -cn only 简体.
  "mandarin-tw": [
    "夜空中最亮的星　能否聽清",
    "月亮代表我的心",
    "甜蜜蜜　你笑得甜蜜蜜",
    "童年的紙飛機　現在飛回我手裡",
    "光陰似箭　一寸光陰一寸金",
    "我願意為你　被放逐天際",
    "當愛已成往事",
    "明天會更好",
    "朋友一生一起走",
    "我看到滿片花兒的開放　隱隱約約有聲歌唱",
  ],
  "mandarin-cn": [
    "夜空中最亮的星　能否听清",
    "月亮代表我的心",
    "甜蜜蜜　你笑得甜蜜蜜",
    "童年的纸飞机　现在飞回我手里",
    "光阴似箭　一寸光阴一寸金",
    "我愿意为你　被放逐天际",
    "当爱已成往事",
    "明天会更好",
    "朋友一生一起走",
    "我看到满片花儿的开放　隐隐约约有声歌唱",
  ],
  // Japanese — kanji with hiragana furigana. Sentences are chosen to show
  // the 熟語 word-context disambiguation: 行 reads こう in 銀行 / ぎょう in
  // 行政 but いく on its own; 生 shifts せい / なま / いきる by context.
  japanese: [
    "銀行員は毎朝早く会社に行く",
    "学校で日本語と漢字を勉強する",
    "今日はとても良い天気ですね",
    "東京の人口は世界で一番多い",
    "夏祭りの花火大会を見に行った",
    "新しい生活が静かに始まる",
    "経済成長率の数字を発表した",
    "彼女は美しい音楽を静かに聞いた",
    "図書館で一冊の本を借りる",
    "山の上から海と空を眺める",
  ],
  // Thai — Thai words annotated with the TCAHK romanization (thai-ink),
  // rendered with the WingSansThaiTCAHK font where the
  // Latin annotation sits BELOW the baseline (`--anno-below`) so it
  // doesn't collide with Thai's above-line vowels (สระอิ / สระอี /
  // สระอืน) and tone marks (ไม้เอก / ไม้โท / ไม้ตรี / ไม้จัตวา).
  //
  // Selected from common everyday vocabulary — greetings, country/
  // place names, weather, food — all words that appear in the
  // hand-curated thai-ink vocab set (highest-priority rows in
  // thai-tcahk.csv) and therefore render with the ground-truth
  // romanization rather than an algorithmic approximation. Thai is
  // normally written without word spaces; the word-unit GSUB
  // matches each registered word longest-first inside the unspaced
  // run, so the phrases render as one annotated word after another.
  thai: [
    "สวัสดีครับ",
    "ขอบคุณมากครับ",
    "สบายดีไหม",
    "ภาษาไทยสวยมาก",
    "ฉันรักประเทศไทย",
    "อาหารไทยอร่อย",
    "กรุงเทพมหานคร",
    "ดอกไม้บานสวย",
    "ดวงจันทร์ลอยฟ้า",
    "น้ำใจคนไทย",
  ],
  // Inuktitut — syllabics with qaniujaaqpait romanization below
  // (WingSansInuktitutRoman). Every word here is in the Hansard
  // word list, so each renders as one whole-word reading.
  inuktitut: [
    "ᖁᔭᓐᓇᒦᒃ",
    "ᓄᓇᕗᑦ",
    "ᐃᓄᒃᑎᑐᑦ",
    "ᐃᓄᐃᑦ ᐃᖃᓗᐃᑦ",
    "ᐅᖃᐅᓯᒃᑯᑦ ᐊᐱᖅᑯᑎᑦ",
    "ᐅᖃᖅᑎ ᒥᓂᔅᑕ",
    "ᐅᓪᓛᒃᑯᑦ",
    "ᐃᓕᓐᓂᐊᖅᑐᓄᑦ",
    "ᐱᕙᓪᓕᐊᔪᓕᕆᓂᕐᒧᑦ",
  ],
};

/**
 * Flat union of every per-dialect template list. Used by callers
 * that don't know which dialect the user picked — currently just
 * the Specimen page, which renders a single font and doesn't have
 * a dialect filter to apply.
 */
export const TEMPLATES: string[] = Object.values(TEMPLATES_BY_DIALECT).flat();

export interface FontOption {
  name: string;
  displayName: string;
  source: string;
  /**
   * Optional subgrouping within a dialect — surfaced as a
   * `<ListSubheader>` between adjacent entries with different
   * `group` values in the /showcase FontPicker dropdown. Mirrors the
   * pattern used by BUILT_IN_MAPPINGS in wingfontPresets.ts so the
   * Step 2 and /showcase pickers feel consistent.
   *
   * Entries without a `group` render flat (no subheader). When some
   * entries in a dialect have `group` and others don't, the
   * un-grouped ones implicitly belong to a leading "(no group)"
   * section before the first subheader appears.
   *
   * Within the Cantonese dialect there is one group per scheme
   *   (粵拼, Yale, Lau, Guangdong, Chishima, 空耳, Cangjie), displayed
   *   in FONT_GROUP_ORDER.
   */
  group?: string;
  /**
   * "Built in the matrix on paper, but not yet on the CDN" marker.
   * Used during the lag between adding a new font entry here and
   * the corresponding CI build actually landing on
   * wing-font.chunlaw.io/fonts/. Filtered out of:
   *   * The /showcase FontPicker dropdown (so users don't pick a
   *     font whose CSS @font-face will silently 404).
   *   * `loadPickedFontsWithFreshUrls` (localStorage restore).
   *   * `setPickedFonts` (URL `?fonts=…` restore).
   * Remove the flag once the CDN serves the font. Idempotent:
   * removing the flag re-exposes the entry without any other
   * code change.
   */
  pending?: boolean;
}

// Group labels for Cantonese subgrouping. Exported so callers
// constructing FontOption entries can reference these constants
// instead of duplicating bilingual strings — typo-safe and i18n-
// migratable later if we want full per-locale group labels.
// One group per scheme. 粵拼 IS the LSHK scheme (香港語言學會粵語拼音方案,
// "Jyutping"); canto-lshk.csv holds it. 空耳 = the Cantonese sound spelled
// in another script (Thai, katakana, Hangul, Urdu, Hindi, …), toned or not.
export const CANTO_GROUP_JYUTPING = "粵拼 Jyutping";
export const CANTO_GROUP_YALE = "耶魯 Yale";
export const CANTO_GROUP_LAU = "劉錫祥 Lau";
export const CANTO_GROUP_WONG = "黃錫凌 Wong";
export const CANTO_GROUP_GUANGDONG = "廣州話拼音方案 Guangdong";
export const CANTO_GROUP_CHISHIMA = "千島 Chishima";
export const CANTO_GROUP_SORAMIMI = "空耳 Other scripts";
export const CANTO_GROUP_CANGJIE = "倉頡 Cangjie";
/** Display order of the groups above. FontPicker sorts each dialect's
 *  fonts by it (stable), so a group's entries render under one
 *  subheader whatever order they're declared in. */
export const FONT_GROUP_ORDER: string[] = [
  CANTO_GROUP_JYUTPING,
  CANTO_GROUP_YALE,
  CANTO_GROUP_LAU,
  CANTO_GROUP_WONG,
  CANTO_GROUP_GUANGDONG,
  CANTO_GROUP_CHISHIMA,
  CANTO_GROUP_SORAMIMI,
  CANTO_GROUP_CANGJIE,
];

export type FontSet = Record<
  string,
  {
    lang: Record<string, string>;
    fonts: Record<string, FontOption>;
  }
>;

/*
 * Showcase catalogue: every font the CI matrix builds
 * (.github/workflows/deploy-pages.yml) is listed here, grouped by
 * language. The site and fonts deploy together, so a new matrix entry
 * only needs registering below to appear on /showcase — no `pending`
 * flag required. Keep this list and the matrix in sync.
 */
export const AVAILABLE_FONTS: FontSet = {
  cantonese: {
    lang: {
      zh: "廣東話",
      en: "Cantonese",
    },
    // The Cantonese showcase default is the FIRST entry below
    // (loadPickedFontsWithFreshUrls picks the first non-pending
    // FontOption in this dialect group as the empty-state default).
    // Order matters; do not alphabetise.
    //
    // History of the default:
    //   * WingSerifYueJyutping             — original (HK-serif)
    //   * WingSansYueJyutping               — June 2026 (smaller
    //                                          WOFF, HK-locale Han)
    //   * NotoSansTC-Huninn-Regular-tonemark — attempted briefly;
    //     rolled back. NotoSansTC's family-name signal made Word's
    //     font fallback re-route HKSCS-extension Cantonese chars
    //     (啲 / 嘅 / 嗰 / 噉 / 嚟 / 咗 / 唔 …) to Microsoft JhengHei.
    //     The glyphs were physically in the font; Word ignored them
    //     based on the "TC = Taiwan locale" signal alone. Browsers
    //     (HarfBuzz) don't apply this fallback, so the bug was
    //     invisible on /showcase but broken in Word.
    //   * NotoSansHK-Huninn-tonemark — Same
    //     Huninn-tonemark anno (purpose-drawn diacritic glyphs for
    //     LSHK tone marks) on the NotoSansHK base (HK-locale Han
    //     forms 字 / 為 / 起 / 緣 / 緊). Originally shipped as
    //     `NotoSansHK-Huninn-Regular-tonemark` (34 chars), which
    //     overflowed Windows GDI's LF_FACESIZE = 32 limit and broke
    //     Word's HKSCS routing for 啲 嘅 嗰 噉 嚟 咗 唔 攞. Renamed
    //     to `NotoSansHK-Huninn-tonemark` (26 chars) to stay under
    //     the limit. The build pipeline now hard-fails any family
    //     name exceeding 31 chars (see LF_FACESIZE_LIMIT in
    //     python/wing-font.py).
    //   * WingSansYueJyutping — default again (Oct 2026): the
    //     Huninn-tonemark font (now WingSansYueJyutpingMarks) stays
    //     as an option, but its tone marks read too small to lead.
    //
    // Previously-default fonts are still built by CI, under their
    // Oct 2026 Wing names (old URLs no longer resolve).
    fonts: {
      // ─ Current default ──────────────────────────────────────────
      "WingSansYueJyutping": {
        displayName: "思源黑體 香港（粵拼）",
        name: "WingSansYueJyutping",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueJyutping.woff2) format('woff2')`,
        group: CANTO_GROUP_JYUTPING,
      },
      "WingSansYueJyutpingMarks": {
        displayName: "思源黑體 香港（粵拼・Huninn 調符）",
        name: "WingSansYueJyutpingMarks",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueJyutpingMarks.woff2) format('woff2')`,
        group: CANTO_GROUP_JYUTPING,
      },
      "WingSansYueYale": {
        displayName: "思源黑體 香港（耶魯拼音）",
        name: "WingSansYueYale",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueYale.woff2) format('woff2')`,
        group: CANTO_GROUP_YALE,
      },
      "WingSansYueLau": {
        displayName: "思源黑體 香港（劉錫祥）",
        name: "WingSansYueLau",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueLau.woff2) format('woff2')`,
        group: CANTO_GROUP_LAU,
      },
      "WingSansYueWong": {
        displayName: "思源黑體 香港（黃錫凌）",
        name: "WingSansYueWong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueWong.woff2) format('woff2')`,
        group: CANTO_GROUP_WONG,
      },
      "WingSansYueGuangdong": {
        displayName: "思源黑體 香港（廣州話拼音方案）",
        name: "WingSansYueGuangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueGuangdong.woff2) format('woff2')`,
        group: CANTO_GROUP_GUANGDONG,
      },
      "WingSansYueChishima": {
        displayName: "思源黑體 香港（千島）",
        name: "WingSansYueChishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueChishima.woff2) format('woff2')`,
        group: CANTO_GROUP_CHISHIMA,
      },
      "WingSansCangjie": {
        displayName: "思源黑體 香港（倉頡）",
        name: "WingSansCangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansCangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_CANGJIE,
      },
      "WingSansYueThai": {
        displayName: "思源黑體 香港（泰文標注）",
        name: "WingSansYueThai",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueThai.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSansYueKatakana": {
        displayName: "思源黑體 香港（片假名標注）",
        name: "WingSansYueKatakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueKatakana.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSansYueHangul": {
        displayName: "思源黑體 香港（諺文標注）",
        name: "WingSansYueHangul",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueHangul.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSansYueUrdu": {
        displayName: "思源黑體 香港（烏爾都文標注）",
        name: "WingSansYueUrdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansYueUrdu.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      // ─ ChironSung Heavyweight Edition ────────────────────────────
      // The original (HK-serif) Cantonese showcase set. Heavier
      // outlines = ~2× the file size of the NotoSansHK equivalents
      // above, but with the traditional serif aesthetic many HK
      // readers prefer for body text. Users who pick these accept
      // the longer download in exchange for the typographic style.
      // The FontPicker dropdown surfaces both — HK Sans first (as
      // the default), Chiron Sung after.
      "WingSerifYueJyutping": {
        displayName: "昭源宋體（粵拼）",
        name: "WingSerifYueJyutping",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueJyutping.woff2) format('woff2')`,
        group: CANTO_GROUP_JYUTPING,
      },
      "WingSerifYueYale": {
        displayName: "昭源宋體（耶魯拼音）",
        name: "WingSerifYueYale",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueYale.woff2) format('woff2')`,
        group: CANTO_GROUP_YALE,
      },
      "WingSerifYueLau": {
        displayName: "昭源宋體（劉錫祥）",
        name: "WingSerifYueLau",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueLau.woff2) format('woff2')`,
        group: CANTO_GROUP_LAU,
      },
      "WingSerifYueWong": {
        displayName: "昭源宋體（黃錫凌）",
        name: "WingSerifYueWong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueWong.woff2) format('woff2')`,
        group: CANTO_GROUP_WONG,
      },
      "WingSerifYueGuangdong": {
        displayName: "昭源宋體（廣州話拼音方案）",
        name: "WingSerifYueGuangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueGuangdong.woff2) format('woff2')`,
        group: CANTO_GROUP_GUANGDONG,
      },
      "WingSerifYueChishima": {
        displayName: "昭源宋體（千島）",
        name: "WingSerifYueChishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueChishima.woff2) format('woff2')`,
        group: CANTO_GROUP_CHISHIMA,
      },
      "WingSerifCangjie": {
        displayName: "昭源宋體（倉頡）",
        name: "WingSerifCangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifCangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_CANGJIE,
      },
      "WingSerifYueThai": {
        displayName: "昭源宋體（泰文標注）",
        name: "WingSerifYueThai",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueThai.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSerifYueKatakana": {
        displayName: "昭源宋體（片假名標注）",
        name: "WingSerifYueKatakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueKatakana.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSerifYueHangul": {
        displayName: "昭源宋體（諺文標注）",
        name: "WingSerifYueHangul",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueHangul.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingSerifYueUrdu": {
        displayName: "昭源宋體（烏爾都文標注）",
        name: "WingSerifYueUrdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifYueUrdu.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      // ─ Xiaolai (小賴) + condensed Noto Sans ───────────────────────
      // Handwritten 楷書-style base font (Xiaolai, OFL) with the
      // condensed Noto Sans (wdth 75) annotation set.
      // Visually distinct from the Noto Sans HK and ChironSung HK
      // groups above — the warm hand-drawn strokes read well for
      // dialect-learning material, classroom worksheets, and
      // children's books. Also introduces three Cantonese
      // romanization schemes that weren't previously surfaced in
      // the showcase: Lau (劉錫祥), Guangdong PRC, and Chishima.
      "WingHandYueJyutping": {
        displayName: "小賴字體（粵拼）",
        name: "WingHandYueJyutping",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueJyutping.woff2) format('woff2')`,
        group: CANTO_GROUP_JYUTPING,
      },
      "WingHandYueYale": {
        displayName: "小賴字體（耶魯拼音）",
        name: "WingHandYueYale",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueYale.woff2) format('woff2')`,
        group: CANTO_GROUP_YALE,
      },
      "WingHandYueLau": {
        displayName: "小賴字體（劉錫祥）",
        name: "WingHandYueLau",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueLau.woff2) format('woff2')`,
        group: CANTO_GROUP_LAU,
      },
      "WingHandYueWong": {
        displayName: "小賴字體（黃錫凌）",
        name: "WingHandYueWong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueWong.woff2) format('woff2')`,
        group: CANTO_GROUP_WONG,
      },
      "WingHandYueGuangdong": {
        displayName: "小賴字體（廣州話拼音方案）",
        name: "WingHandYueGuangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueGuangdong.woff2) format('woff2')`,
        group: CANTO_GROUP_GUANGDONG,
      },
      "WingHandYueChishima": {
        displayName: "小賴字體（千島）",
        name: "WingHandYueChishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueChishima.woff2) format('woff2')`,
        group: CANTO_GROUP_CHISHIMA,
      },
      "WingHandHeroSample": {
        displayName: "小賴字體（首頁示範・粵拼，只含示範字）",
        name: "WingHandHeroSample",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandHeroSample.woff2) format('woff2')`,
        group: CANTO_GROUP_JYUTPING,
      },
      // Xiaolai-base non-romanization companions. Annotation font
      // varies (Xiaolai itself for cangjie self-reference; Google
      // Sans Thai / Noto Sans JP / Noto Sans KR for the script
      // transliterations) — see deploy-pages.yml matrix for the
      // exact CI invocation.
      "WingHandCangjie": {
        displayName: "小賴字體（倉頡）",
        name: "WingHandCangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandCangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_CANGJIE,
      },
      "WingHandYueThai": {
        displayName: "小賴字體（泰文標注）",
        name: "WingHandYueThai",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueThai.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueKatakana": {
        displayName: "小賴字體（片假名標注）",
        name: "WingHandYueKatakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueKatakana.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueHangul": {
        displayName: "小賴字體（諺文標注）",
        name: "WingHandYueHangul",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueHangul.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueUrdu": {
        displayName: "小賴字體（烏爾都文標注）",
        name: "WingHandYueUrdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueUrdu.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueHindi": {
        displayName: "小賴字體（印地文標注）",
        name: "WingHandYueHindi",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueHindi.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYuePunjabi": {
        displayName: "小賴字體（旁遮普文標注）",
        name: "WingHandYuePunjabi",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYuePunjabi.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      // ─ Toneless / decorative (souvenir) set — Xiaolai base, tone
      // digit stripped so the script reads as clean native text.
      "WingHandYueThaiNotone": {
        displayName: "小賴字體（泰文・無聲調）",
        name: "WingHandYueThaiNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueThaiNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueHangulNotone": {
        displayName: "小賴字體（諺文・無聲調）",
        name: "WingHandYueHangulNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueHangulNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueKatakanaNotone": {
        displayName: "小賴字體（片假名・無聲調）",
        name: "WingHandYueKatakanaNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueKatakanaNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueBaybayinNotone": {
        displayName: "小賴字體（貝貝因・無聲調）",
        name: "WingHandYueBaybayinNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueBaybayinNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueUrduNotone": {
        displayName: "小賴字體（烏爾都文・無聲調）",
        name: "WingHandYueUrduNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueUrduNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYueHindiNotone": {
        displayName: "小賴字體（印地文・無聲調）",
        name: "WingHandYueHindiNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYueHindiNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
      "WingHandYuePunjabiNotone": {
        displayName: "小賴字體（旁遮普文・無聲調）",
        name: "WingHandYuePunjabiNotone",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandYuePunjabiNotone.woff2) format('woff2')`,
        group: CANTO_GROUP_SORAMIMI,
      },
    },
  },
  // Taiwanese / Southern Min (河洛話) — one group covering both the
  // 優勢腔 standard reading (Tâi-lô + 白話字) and all nine MOE 語音差異
  // accent (腔) survey points. NB the 優勢腔 is the MOE prestige/"common"
  // reading and is NOT one of the nine survey points — so the accents
  // are not a superset of the standard; they're listed together here as
  // a single 臺語 category. Bases: Noto Sans TC (思源黑體) and Xiaolai
  // (小賴), romanization in condensed Noto Sans. .woff files are
  // produced by .github/workflows/deploy-pages.yml.
  taiwanese: {
    lang: {
      zh: "臺語",
      en: "Taiwanese / Southern Min",
    },
    fonts: {
      // 優勢腔 standard reading (KipUnicode), Noto Sans TC + condensed Noto Sans —
      // Tâi-lô and 白話字. The 優勢腔 is the MOE prestige/"common"
      // reading; it is NOT any single one of the nine survey points below.
      "WingSansTaigiTailo": {
        displayName: "思源黑體（台羅・優勢腔）",
        name: "WingSansTaigiTailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailo.woff2) format('woff2')`,
      },
      "WingSansTaigiPOJ": {
        displayName: "思源黑體（白話字・優勢腔）",
        name: "WingSansTaigiPOJ",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiPOJ.woff2) format('woff2')`,
      },
      // 優勢腔 standard on the Xiaolai handwritten 楷書 base.
      "WingHandTaigiPOJ": {
        displayName: "小賴字體（白話字・優勢腔）",
        name: "WingHandTaigiPOJ",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiPOJ.woff2) format('woff2')`,
      },
      "WingHandTaigiTailo": {
        displayName: "小賴字體（台羅・優勢腔）",
        name: "WingHandTaigiTailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailo.woff2) format('woff2')`,
      },
      // Nine 腔 (accent) survey points — the same MOE 語音差異 data, each
      // in two pairings (思源黑體 / 小賴字體), all Tâi-lô. 漳/泉 splits
      // (雞 ke/kue/kere, 飯 pn̄g/puīnn) are real here; the entries above
      // are the 優勢腔 standard, which is not one of these nine points.
      "WingSansTaigiTailoTaipak": {
        displayName: "思源黑體（台北腔）",
        name: "WingSansTaigiTailoTaipak",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoTaipak.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoTaipak": {
        displayName: "小賴字體（台北腔）",
        name: "WingHandTaigiTailoTaipak",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoTaipak.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoSannkiap": {
        displayName: "思源黑體（三峽腔）",
        name: "WingSansTaigiTailoSannkiap",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoSannkiap.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoSannkiap": {
        displayName: "小賴字體（三峽腔）",
        name: "WingHandTaigiTailoSannkiap",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoSannkiap.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoSintik": {
        displayName: "思源黑體（新竹腔）",
        name: "WingSansTaigiTailoSintik",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoSintik.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoSintik": {
        displayName: "小賴字體（新竹腔）",
        name: "WingHandTaigiTailoSintik",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoSintik.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoTaitiong": {
        displayName: "思源黑體（台中腔）",
        name: "WingSansTaigiTailoTaitiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoTaitiong.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoTaitiong": {
        displayName: "小賴字體（台中腔）",
        name: "WingHandTaigiTailoTaitiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoTaitiong.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoLokkang": {
        displayName: "思源黑體（鹿港腔）",
        name: "WingSansTaigiTailoLokkang",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoLokkang.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoLokkang": {
        displayName: "小賴字體（鹿港腔）",
        name: "WingHandTaigiTailoLokkang",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoLokkang.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoTailam": {
        displayName: "思源黑體（台南腔）",
        name: "WingSansTaigiTailoTailam",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoTailam.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoTailam": {
        displayName: "小賴字體（台南腔）",
        name: "WingHandTaigiTailoTailam",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoTailam.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoKohiong": {
        displayName: "思源黑體（高雄腔）",
        name: "WingSansTaigiTailoKohiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoKohiong.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoKohiong": {
        displayName: "小賴字體（高雄腔）",
        name: "WingHandTaigiTailoKohiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoKohiong.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoGilan": {
        displayName: "思源黑體（宜蘭腔）",
        name: "WingSansTaigiTailoGilan",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoGilan.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoGilan": {
        displayName: "小賴字體（宜蘭腔）",
        name: "WingHandTaigiTailoGilan",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoGilan.woff2) format('woff2')`,
      },
      "WingSansTaigiTailoManking": {
        displayName: "思源黑體（馬公腔）",
        name: "WingSansTaigiTailoManking",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTailoManking.woff2) format('woff2')`,
      },
      "WingHandTaigiTailoManking": {
        displayName: "小賴字體（馬公腔）",
        name: "WingHandTaigiTailoManking",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTaigiTailoManking.woff2) format('woff2')`,
      },
      "WingSansTaigiTPS": {
        displayName: "思源黑體（方音符號）",
        name: "WingSansTaigiTPS",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiTPS.woff2) format('woff2')`,
      },
      "WingSansTaigiKana": {
        displayName: "思源黑體（台灣語假名）",
        name: "WingSansTaigiKana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTaigiKana.woff2) format('woff2')`,
      },
      "WingHandHeroTailo": {
        displayName: "小賴字體（首頁示範・台羅，只含示範字）",
        name: "WingHandHeroTailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandHeroTailo.woff2) format('woff2')`,
      },
    },
  },
  // Teochew / Min Nan (潮州話) — the second non-Cantonese dialect
  // showcased, sharing the Taiwanese pairing: Noto Sans TC base CJK
  // font + condensed Noto Sans for the romanization (it carries
  // the Pe̍h-ūe-jī diacritics — combining tilde, dot-above, diaeresis-
  // below — plus the nasal ⁿ U+207F). Two entries mirror the
  // Cantonese LSHK / Yale pairing: a primary modern romanization
  // (Peng'im, numeric tones) and a historical one (Duffus / PUJ,
  // diacritic tones). Both .woff files are produced by
  // .github/workflows/build-fonts.yml. Mapping data is derived from
  // learn-teochew's teochew_scrape.json via the parsetc parser.
  teochew: {
    lang: {
      zh: "潮州話",
      en: "Teochew / Min Nan",
    },
    fonts: {
      "WingSansTeochewPengim": {
        displayName: "思源黑體（潮拼）",
        name: "WingSansTeochewPengim",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTeochewPengim.woff2) format('woff2')`,
      },
      "WingSansTeochewPUJ": {
        displayName: "思源黑體（潮州白話字）",
        name: "WingSansTeochewPUJ",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansTeochewPUJ.woff2) format('woff2')`,
      },
      // Xiaolai handwritten companions for Teochew.
      "WingHandTeochewPengim": {
        displayName: "小賴字體（潮拼）",
        name: "WingHandTeochewPengim",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTeochewPengim.woff2) format('woff2')`,
      },
      "WingHandTeochewPUJ": {
        displayName: "小賴字體（潮州白話字）",
        name: "WingHandTeochewPUJ",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandTeochewPUJ.woff2) format('woff2')`,
      },
      "WingHandHeroPengim": {
        displayName: "小賴字體（首頁示範・潮拼，只含示範字）",
        name: "WingHandHeroPengim",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandHeroPengim.woff2) format('woff2')`,
      },
    },
  },
  // Mandarin (普通話 / 國語) — showcased in BOTH regional standards so a
  // reader can compare the cross-strait reading differences:
  //   • 普通話 (-cn) — mandarin-cn-toned-trimmed.csv (diacritic tone marks +
  //     full-width pinyin DIY, common-set chars) on Simplified-region fonts. The
  //     Mainland standard (also what Singapore / Malaysia adopt).
  //   • 國語 (-tw) — mandarin-tw-toned.csv (tone-marked pinyin) and
  //     mandarin-tw-zhuyin.csv (注音), both taken entirely from the MOE
  //     國語辭典 (python/mappings/mandarin/gen_mandarin_tw.py), on
  //     Traditional bases: Noto Sans TC (思源黑體 台灣) and Xiaolai SC
  //     (covers 100% of the common Traditional set despite the "SC" name).
  // The 小賴字體 face appears in both standards — the cleanest same-face
  // A/B of 普通話 vs 國語. Noto Serif SC (思源宋體) is 普通話-only.
  // All .woff2 files come from the build matrix in
  // .github/workflows/deploy-pages.yml.
  mandarin: {
    lang: {
      zh: "國語 / 普通話",
      en: "Mandarin",
    },
    fonts: {
      "WingSansGuoyuPinyin": {
        displayName: "思源黑體 台灣（拼音調符 · 國語・教育部辭典）",
        name: "WingSansGuoyuPinyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansGuoyuPinyin.woff2) format('woff2')`,
      },
      "WingSansGuoyuZhuyin": {
        displayName: "思源黑體 台灣（注音 · 國語・教育部辭典）",
        name: "WingSansGuoyuZhuyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansGuoyuZhuyin.woff2) format('woff2')`,
      },
      "WingHandGuoyuPinyin": {
        displayName: "小賴字體（拼音調符 · 國語・教育部辭典）",
        name: "WingHandGuoyuPinyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandGuoyuPinyin.woff2) format('woff2')`,
      },
      "WingSerifPutonghuaPinyin": {
        displayName: "思源宋體（拼音調符 · 普通話）",
        name: "WingSerifPutonghuaPinyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSerifPutonghuaPinyin.woff2) format('woff2')`,
      },
      "WingSansPutonghuaPinyin": {
        displayName: "思源黑體 簡體（拼音調符 · 普通話）",
        name: "WingSansPutonghuaPinyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansPutonghuaPinyin.woff2) format('woff2')`,
      },
      "WingHandPutonghuaPinyin": {
        displayName: "小賴字體（拼音調符 · 普通話）",
        name: "WingHandPutonghuaPinyin",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandPutonghuaPinyin.woff2) format('woff2')`,
      },
    },
  },
  // Thai — Thai-script base annotated with the TCAHK (thai-ink)
  // romanization. The pairing uses GoogleSans for the Thai base
  // (NotoSerif covers Latin), and `--anno-below` puts the Latin
  // romanization in the (auto-extended) descent so Thai's own
  // above-line vowels (◌ิ ◌ี ◌ื) and tone marks (◌่ ◌้ ◌๊ ◌๋)
  // stay readable in the ascender area. See the matching
  // matrix entry in .github/workflows/deploy-pages.yml.
  thai: {
    lang: {
      zh: "泰文",
      en: "Thai",
    },
    fonts: {
      "WingSansThaiTCAHK": {
        displayName: "Google Sans 泰文（香港泰國文化協會拼音）",
        name: "WingSansThaiTCAHK",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansThaiTCAHK.woff2) format('woff2')`,
      },
    },
  },
  // Inuktitut — Canadian Aboriginal syllabics annotated below with
  // qaniujaaqpait romanization (condensed Noto Sans). Word-unit rows
  // from the Nunavut Hansard; unknown words fall back to per-symbol
  // readings. See the matching matrix entry in deploy-pages.yml.
  inuktitut: {
    lang: {
      zh: "因紐特文",
      en: "Inuktitut",
    },
    fonts: {
      "WingSansInuktitutRoman": {
        displayName: "Noto Sans 因紐特文（qaniujaaqpait 拼寫）",
        name: "WingSansInuktitutRoman",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansInuktitutRoman.woff2) format('woff2')`,
      },
    },
  },
  // ── Arabic-base word-unit tier (experimental) ─────────────────
  // First curated font using the word-unit pipeline with a non-Han
  // BASE script. Each Arabic word composes into one annotated glyph
  // with DIN 31635 romanization (academic standard: macrons on
  // long vowels, dots under emphatic consonants) stacked above.
  // Build from arabic-romanization.csv via word_liga_handler.py.
  //
  // The "base font" here is genuinely Arabic (Noto Sans Arabic
  // Naskh, the standard general-purpose MSA body-text style) —
  // distinct from the Cantonese-with-Urdu-Nastaliq fonts where
  // Arabic script appears as ANNOTATION over Chinese. The dialect
  // key surfaces in /showcase's dropdown as a separate category so
  // users browsing for "Arabic" find a real Arabic-text font, not
  // a Cantonese-transliteration variant.
  arabic: {
    lang: {
      zh: "阿拉伯文",
      en: "Arabic",
    },
    fonts: {
      "WingSansArabicDIN31635": {
        displayName: "Noto Sans Arabic（DIN 31635 罗马字）",
        name: "WingSansArabicDIN31635",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansArabicDIN31635.woff2) format('woff2')`,
      },
    },
  },
  // ── Hindi-base word-unit tier (experimental) ──────────────────
  // The Devanagari analogue of the Arabic tier above: a real Hindi
  // text face (Hind) as the BASE script, where each word composes
  // into one glyph carrying its ISO 15919 romanization (with Hindi
  // word-final schwa deletion: राम → rām). Distinct from the
  // WingHandYueHindi font, where Devanagari is only an ANNOTATION
  // over Chinese — here Hindi IS the text. Built from
  // hindi-romanization.csv via word_liga_handler.py (matrix entry
  // WingSansHindiRoman in deploy-pages.yml). Surfaced as its own
  // /showcase category so users browsing for "Hindi" find a real
  // Hindi-text font, not a Cantonese-transliteration variant.
  japanese: {
    lang: {
      zh: "日本語",
      en: "Japanese",
    },
    fonts: {
      "WingSansJapaneseFurigana": {
        displayName: "思源黑體 日本（仮名 · 音訓読み）",
        name: "WingSansJapaneseFurigana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansJapaneseFurigana.woff2) format('woff2')`,
      },
      "WingHandJapaneseFurigana": {
        displayName: "小賴字體（仮名 · 音訓読み）",
        name: "WingHandJapaneseFurigana",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingHandJapaneseFurigana.woff2) format('woff2')`,
      },
    },
  },
  hindi: {
    lang: {
      zh: "印地文",
      en: "Hindi",
    },
    fonts: {
      "WingSansHindiRoman": {
        displayName: "Hind（ISO 15919 罗马字）",
        name: "WingSansHindiRoman",
        source: `url(${import.meta.env.VITE_FONT_URL}/WingSansHindiRoman.woff2) format('woff2')`,
      },
    },
  },
};

/**
 * Reverse-lookup: given a font's machine name (e.g.
 * "WingSansTaigiTailo"), return which dialect group it belongs
 * to (e.g. "taiwanese"). Returns undefined when the name isn't in
 * AVAILABLE_FONTS — happens transiently when a stale entry sits in
 * localStorage after we remove a font from the showcase. Callers
 * should treat undefined as "skip the dialect chip", not as an
 * error.
 *
 * O(n) over the dialect groups, but n is small (~5) and call sites
 * only run during render, so the cost is negligible.
 */
export function findDialectKey(fontName: string): string | undefined {
  for (const [dialectKey, group] of Object.entries(AVAILABLE_FONTS)) {
    if (fontName in group.fonts) return dialectKey;
  }
  return undefined;
}

/** Sample-pool key for a font: the dialect key, except Mandarin picks
 *  the 繁體 / 简体 pool: Putonghua fonts use the 简体 (-cn) mapping. */
export function findTemplateKey(fontName: string): string | undefined {
  const dialectKey = findDialectKey(fontName);
  if (dialectKey !== "mandarin") return dialectKey;
  return fontName.includes("Putonghua") ? "mandarin-cn" : "mandarin-tw";
}

/**
 * Localised display label for a dialect key. Falls back to the zh
 * label when the requested locale doesn't have an entry (none of
 * our dialects ship `en` blank, but the type allows it).
 */
export function getDialectLabel(
  dialectKey: string,
  locale: "zh" | "en",
): string {
  // Synthetic "user fonts" group — the IndexedDB-cached recent fonts
  // surfaced in the FontPicker / Showcase / Specimen, sitting next to
  // the static AVAILABLE_FONTS dialects. Not in the catalog (it's
  // generated at runtime from RecentFontsContext) so we resolve the
  // bilingual label inline. Centralising the lookup here lets every
  // consumer (FontPicker, Main's FontShowcaseCard, Specimen) call a
  // single function instead of repeating the `lang === "zh" ? ... :
  // ...` ternary across three files.
  if (dialectKey === USER_FONTS_GROUP_KEY) {
    // Label switched from "自家生成字型 / Your generated fonts" to a
    // broader "自家字型 / Your fonts" when /showcase + /specimen
    // gained the ability to upload arbitrary .ttf/.woff files. The
    // group now covers both pipeline-generated and user-uploaded
    // entries; the chip's source-specific icon (RecentFontsChips)
    // tells them apart at a glance, while the group label stays
    // general enough to honestly describe the contents.
    return locale === "zh" ? "自家字型" : "Your fonts";
  }
  const group = AVAILABLE_FONTS[dialectKey];
  if (!group) return dialectKey;
  return group.lang[locale] ?? group.lang.zh ?? dialectKey;
}

/**
 * Synthetic dialect key for the user's IndexedDB-cached recent
 * fonts. Lives here (rather than in AppContext.tsx where it's also
 * exported) so const.ts can resolve labels without circular imports.
 * AppContext re-exports for backward-compat.
 */
export const USER_FONTS_GROUP_KEY = "userFonts";
