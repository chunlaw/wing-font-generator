/**
 * Lyric / phrase pool that the /showcase page rotates through when
 * the user hasn't typed their own sample text. Grouped by dialect so
 * `useTemplateRotation(msg, dialectKey)` can pick a pool that
 * matches whichever font card is being rendered — a Cantonese font
 * card cycles only through Cantonese lyrics, a Mandarin card cycles
 * only through Mandarin lyrics, etc.
 *
 * Dialect keys here MUST match the keys in `AVAILABLE_FONTS` below
 * (cantonese / taiwanese / teochew / mandarin) so the per-card
 * lookup in Main.tsx can route correctly via `findDialectKey()`.
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
    "回望最初　當喪失是得著可不可",
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
    "留在彼此的身邊　牽著手再繼續飛",
    "永遠有一個吻未嘗",
    "望著他雙眼想別人　人留下了留不低那片心",
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
    "酒矸倘賣無",
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
  // stacked above each character via the full-Unihan mandarin-cn /
  // mandarin-tw mappings. Mix of 鄧麗君 / 王菲 / 羅大佑 / 周華健 / 五月天 / 朴樹
  // / 周深 — broad coverage across 70s–2010s 國語 pop so a reader
  // of any generation lands on something familiar.
  mandarin: [
    "夜空中最亮的星　能否聽清",
    "月亮代表我的心",
    "甜蜜蜜　你笑得甜蜜蜜",
    "童年的紙飛機　現在飛回我手裡",
    "光陰似箭　一寸光陰一寸金",
    "我願意為你　被放逐天際",
    "當愛已成往事",
    "明天會更好",
    "朋友一生一起走",
    "我看到满片花儿的开放　隐隐约约有声歌唱",
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
   * Within the Cantonese dialect we use it to split:
   *   "粵拼 Romanization"    — Latin romanizations (LSHK, Yale, …)
   *   "其他標注 Other scripts" — Thai / Katakana / Korean / Cangjie
   */
  group?: string;
}

// Group labels for Cantonese subgrouping. Exported so callers
// constructing FontOption entries can reference these constants
// instead of duplicating bilingual strings — typo-safe and i18n-
// migratable later if we want full per-locale group labels.
export const CANTO_GROUP_ROMANIZATION = "粵拼 Romanization";
export const CANTO_GROUP_OTHER_SCRIPTS = "其他標注 Other scripts";
export const CANTO_GROUP_TONELESS = "無聲調・裝飾 Toneless / decorative";

export type FontSet = Record<
  string,
  {
    lang: Record<string, string>;
    fonts: Record<string, FontOption>;
  }
>;

/*
 * Showcase curation:
 *
 * The CI workflow (.github/workflows/build-fonts.yml) builds ~30 font
 * variants and deploys them all to wing-font.chunlaw.io/fonts/. The
 * showcase page surfaces only a CURATED SUBSET of those builds — 6
 * entries chosen to demonstrate maximally-distinct concepts rather
 * than visually-similar romanization variants.
 *
 * Showcasing rule: every entry must illustrate a different angle of
 * the product's range. If two entries look near-identical to a
 * casual viewer (e.g. LSHK vs Lau, both Latin-letter romanizations
 * on the same Sung base), only ONE belongs here.
 *
 * Currently surfaced (7):
 *   • LSHK Jyutping  — primary / most-widely-used Latin romanization
 *   • Yale           — historical alternative Latin romanization
 *   • Cangjie        — completely different concept: CJK input method
 *   • Thai script    — non-Latin transliteration (Google Sans)
 *   • Katakana       — non-Latin transliteration (Noto Sans JP)
 *   • Hangul         — non-Latin transliteration (Noto Sans KR)
 *   • Urdu           — non-Latin, RIGHT-TO-LEFT transliteration
 *                      (Noto Nastaliq Urdu); demonstrates RTL + abjad
 *
 * Built but NOT showcased (still reachable directly under /fonts/):
 *   • Chishima / Lau / Guangdong — three additional Latin romanizations,
 *     redundant with LSHK + Yale for showcase purposes.
 *   • Every *-It italic variant — same content, subtle base-font style
 *     variation that doesn't teach anything new at picker resolution.
 *
 * If you want a dropped variant re-surfaced, add it back here — the
 * file is the only place that controls what the FontPicker shows.
 */
export const AVAILABLE_FONTS: FontSet = {
  cantonese: {
    lang: {
      zh: "廣東話",
      en: "Cantonese",
    },
    // Cantonese showcase defaults switched from ChironSungHK to
    // Noto Sans HK in June 2026. Reasons (in order of importance):
    //   * Roughly halves the WOFF size per font (~700-900 KB →
    //     ~350-450 KB), so the 6-font /showcase loads in ~half the
    //     time on a slow connection.
    //   * Noto Sans HK uses Hong-Kong-locale glyph forms (字 / 為 /
    //     起 / 緣 / 緊 etc.), which is more authentic for HK
    //     readers than ChironSung's font but also more authentic
    //     than Noto Sans TC's Taiwan-locale forms.
    //   * Variable weight axis exposes the Step 1 weight slider.
    // The ChironSungHK-* fonts are still built by the CI matrix and
    // downloadable via direct URL — only the showcase default
    // changed. External bookmarks to ChironSungHK-Noto-lshk.woff
    // (etc.) keep working.
    fonts: {
      "NotoSansHK-Noto-lshk": {
        displayName: "思源黑體 香港（香港語言學會）",
        name: "NotoSansHK-Noto-lshk",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-Noto-lshk.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "NotoSansHK-Noto-yale": {
        displayName: "思源黑體 香港（耶魯拼音）",
        name: "NotoSansHK-Noto-yale",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-Noto-yale.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "NotoSansHK-cangjie": {
        displayName: "思源黑體 香港（倉頡）",
        name: "NotoSansHK-cangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-cangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "NotoSansHK-Google-thai": {
        displayName: "思源黑體 香港（泰文標注）",
        name: "NotoSansHK-Google-thai",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-Google-thai.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "NotoSansHK-NotoJP-katakana": {
        displayName: "思源黑體 香港（片假名標注）",
        name: "NotoSansHK-NotoJP-katakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-NotoJP-katakana.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "NotoSansHK-NotoKR-korean": {
        displayName: "思源黑體 香港（諺文標注）",
        name: "NotoSansHK-NotoKR-korean",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-NotoKR-korean.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "NotoSansHK-NotoNastaliq-urdu": {
        displayName: "思源黑體 香港（烏爾都文標注）",
        name: "NotoSansHK-NotoNastaliq-urdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansHK-NotoNastaliq-urdu.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      // ─ ChironSung Heavyweight Edition ────────────────────────────
      // The original (HK-serif) Cantonese showcase set. Heavier
      // outlines = ~2× the file size of the NotoSansHK equivalents
      // above, but with the traditional serif aesthetic many HK
      // readers prefer for body text. Users who pick these accept
      // the longer download in exchange for the typographic style.
      // The FontPicker dropdown surfaces both — HK Sans first (as
      // the default), Chiron Sung after.
      "ChironSungHK-Noto-lshk": {
        displayName: "昭源宋體（香港語言學會）",
        name: "ChironSungHK-Noto-lshk",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lshk.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "ChironSungHK-Noto-yale": {
        displayName: "昭源宋體（耶魯拼音）",
        name: "ChironSungHK-Noto-yale",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-yale.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "ChironSungHK-cangjie": {
        displayName: "昭源宋體（倉頡）",
        name: "ChironSungHK-cangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-cangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "ChironSungHK-Google-thai": {
        displayName: "昭源宋體（泰文標注）",
        name: "ChironSungHK-Google-thai",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Google-thai.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "ChironSungHK-NotoJP-katakana": {
        displayName: "昭源宋體（片假名標注）",
        name: "ChironSungHK-NotoJP-katakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-NotoJP-katakana.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "ChironSungHK-NotoKR-korean": {
        displayName: "昭源宋體（諺文標注）",
        name: "ChironSungHK-NotoKR-korean",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-NotoKR-korean.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "ChironSungHK-NotoNastaliq-urdu": {
        displayName: "昭源宋體（烏爾都文標注）",
        name: "ChironSungHK-NotoNastaliq-urdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-NotoNastaliq-urdu.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      // ─ Xiaolai (小賴) + Huninn pairing ────────────────────────────
      // Handwritten 楷書-style base font (Xiaolai, OFL) with the
      // Latin-friendly Huninn (jf-openhuninn) annotation set.
      // Visually distinct from the Noto Sans HK and ChironSung HK
      // groups above — the warm hand-drawn strokes read well for
      // dialect-learning material, classroom worksheets, and
      // children's books. Also introduces three Cantonese
      // romanization schemes that weren't previously surfaced in
      // the showcase: Lau (劉錫祥), Guangdong PRC, and Chishima.
      "Xiaolai-Huninn-lshk": {
        displayName: "小賴字體（香港語言學會）",
        name: "Xiaolai-Huninn-lshk",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-lshk.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "Xiaolai-Huninn-yale": {
        displayName: "小賴字體（耶魯拼音）",
        name: "Xiaolai-Huninn-yale",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-yale.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "Xiaolai-Huninn-lau": {
        displayName: "小賴字體（劉錫祥）",
        name: "Xiaolai-Huninn-lau",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-lau.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "Xiaolai-Huninn-guangdong": {
        displayName: "小賴字體（廣州話拼音方案）",
        name: "Xiaolai-Huninn-guangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-guangdong.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      "Xiaolai-Huninn-chishima": {
        displayName: "小賴字體（千島）",
        name: "Xiaolai-Huninn-chishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-chishima.woff2) format('woff2')`,
        group: CANTO_GROUP_ROMANIZATION,
      },
      // Xiaolai-base non-romanization companions. Annotation font
      // varies (Xiaolai itself for cangjie self-reference; Google
      // Sans Thai / Noto Sans JP / Noto Sans KR for the script
      // transliterations) — see deploy-pages.yml matrix for the
      // exact CI invocation.
      "Xiaolai-cangjie": {
        displayName: "小賴字體（倉頡）",
        name: "Xiaolai-cangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-cangjie.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-Google-thai": {
        displayName: "小賴字體（泰文標注）",
        name: "Xiaolai-Google-thai",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Google-thai.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-NotoJP-katakana": {
        displayName: "小賴字體（片假名標注）",
        name: "Xiaolai-NotoJP-katakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoJP-katakana.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-NotoKR-korean": {
        displayName: "小賴字體（諺文標注）",
        name: "Xiaolai-NotoKR-korean",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoKR-korean.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-NotoNastaliq-urdu": {
        displayName: "小賴字體（烏爾都文標注）",
        name: "Xiaolai-NotoNastaliq-urdu",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoNastaliq-urdu.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-Hind-hindi": {
        displayName: "小賴字體（印地文標注）",
        name: "Xiaolai-Hind-hindi",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Hind-hindi.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      "Xiaolai-Gurmukhi-punjab": {
        displayName: "小賴字體（旁遮普文標注）",
        name: "Xiaolai-Gurmukhi-punjab",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Gurmukhi-punjab.woff2) format('woff2')`,
        group: CANTO_GROUP_OTHER_SCRIPTS,
      },
      // ─ Toneless / decorative (souvenir) set — Xiaolai base, tone
      // digit stripped so the script reads as clean native text.
      "Xiaolai-Google-thai-notone": {
        displayName: "小賴字體（泰文・無聲調）",
        name: "Xiaolai-Google-thai-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Google-thai-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-NotoKR-korean-notone": {
        displayName: "小賴字體（諺文・無聲調）",
        name: "Xiaolai-NotoKR-korean-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoKR-korean-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-NotoJP-katakana-notone": {
        displayName: "小賴字體（片假名・無聲調）",
        name: "Xiaolai-NotoJP-katakana-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoJP-katakana-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-NotoTagalog-baybayin-notone": {
        displayName: "小賴字體（貝貝因・無聲調）",
        name: "Xiaolai-NotoTagalog-baybayin-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoTagalog-baybayin-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-NotoNastaliq-urdu-notone": {
        displayName: "小賴字體（烏爾都文・無聲調）",
        name: "Xiaolai-NotoNastaliq-urdu-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-NotoNastaliq-urdu-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-Hind-hindi-notone": {
        displayName: "小賴字體（印地文・無聲調）",
        name: "Xiaolai-Hind-hindi-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Hind-hindi-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
      "Xiaolai-Gurmukhi-punjab-notone": {
        displayName: "小賴字體（旁遮普文・無聲調）",
        name: "Xiaolai-Gurmukhi-punjab-notone",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Gurmukhi-punjab-notone.woff2) format('woff2')`,
        group: CANTO_GROUP_TONELESS,
      },
    },
  },
  // Taiwanese / Southern Min (河洛話) — one group covering both the
  // 優勢腔 standard reading (Tâi-lô + 白話字) and all nine MOE 語音差異
  // accent (腔) survey points. NB the 優勢腔 is the MOE prestige/"common"
  // reading and is NOT one of the nine survey points — so the accents
  // are not a superset of the standard; they're listed together here as
  // a single 臺語 category. Bases: Noto Sans TC (思源黑體) and Xiaolai
  // (小賴), romanization in Huninn / M+ Rounded 1c. .woff files are
  // produced by .github/workflows/deploy-pages.yml.
  taiwanese: {
    lang: {
      zh: "臺語",
      en: "Taiwanese / Southern Min",
    },
    fonts: {
      // 優勢腔 standard reading (KipUnicode), Noto Sans TC + Huninn —
      // Tâi-lô and 白話字. The 優勢腔 is the MOE prestige/"common"
      // reading; it is NOT any single one of the nine survey points below.
      "NotoSansTC-Huninn-tailo": {
        displayName: "思源黑體（台羅・優勢腔）",
        name: "NotoSansTC-Huninn-tailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-tailo.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-poj": {
        displayName: "思源黑體（白話字・優勢腔）",
        name: "NotoSansTC-Huninn-poj",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-poj.woff2) format('woff2')`,
      },
      // 優勢腔 standard on the Xiaolai handwritten 楷書 base, in two
      // annotation styles: Huninn and the rounder M+ Rounded 1c.
      "Xiaolai-Huninn-tailo": {
        displayName: "小賴字體（台羅・優勢腔）",
        name: "Xiaolai-Huninn-tailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-tailo.woff2) format('woff2')`,
      },
      "Xiaolai-Huninn-poj": {
        displayName: "小賴字體（白話字・優勢腔）",
        name: "Xiaolai-Huninn-poj",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-poj.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-tailo": {
        displayName: "小賴圓體（台羅・優勢腔）",
        name: "Xiaolai-MplusRounded-tailo",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-tailo.woff2) format('woff2')`,
      },
      // Nine 腔 (accent) survey points — the same MOE 語音差異 data, each
      // in two pairings (思源黑體 / 小賴圓體), all Tâi-lô. 漳/泉 splits
      // (雞 ke/kue/kere, 飯 pn̄g/puīnn) are real here; the entries above
      // are the 優勢腔 standard, which is not one of these nine points.
      "NotoSansTC-Huninn-taipak": {
        displayName: "思源黑體（台北腔）",
        name: "NotoSansTC-Huninn-taipak",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-taipak.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-taipak": {
        displayName: "小賴圓體（台北腔）",
        name: "Xiaolai-MplusRounded-taipak",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-taipak.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-sannkiap": {
        displayName: "思源黑體（三峽腔）",
        name: "NotoSansTC-Huninn-sannkiap",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-sannkiap.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-sannkiap": {
        displayName: "小賴圓體（三峽腔）",
        name: "Xiaolai-MplusRounded-sannkiap",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-sannkiap.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-sintik": {
        displayName: "思源黑體（新竹腔）",
        name: "NotoSansTC-Huninn-sintik",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-sintik.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-sintik": {
        displayName: "小賴圓體（新竹腔）",
        name: "Xiaolai-MplusRounded-sintik",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-sintik.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-taitiong": {
        displayName: "思源黑體（台中腔）",
        name: "NotoSansTC-Huninn-taitiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-taitiong.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-taitiong": {
        displayName: "小賴圓體（台中腔）",
        name: "Xiaolai-MplusRounded-taitiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-taitiong.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-lokkang": {
        displayName: "思源黑體（鹿港腔）",
        name: "NotoSansTC-Huninn-lokkang",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-lokkang.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-lokkang": {
        displayName: "小賴圓體（鹿港腔）",
        name: "Xiaolai-MplusRounded-lokkang",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-lokkang.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-tailam": {
        displayName: "思源黑體（台南腔）",
        name: "NotoSansTC-Huninn-tailam",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-tailam.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-tailam": {
        displayName: "小賴圓體（台南腔）",
        name: "Xiaolai-MplusRounded-tailam",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-tailam.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-kohiong": {
        displayName: "思源黑體（高雄腔）",
        name: "NotoSansTC-Huninn-kohiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-kohiong.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-kohiong": {
        displayName: "小賴圓體（高雄腔）",
        name: "Xiaolai-MplusRounded-kohiong",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-kohiong.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-gilan": {
        displayName: "思源黑體（宜蘭腔）",
        name: "NotoSansTC-Huninn-gilan",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-gilan.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-gilan": {
        displayName: "小賴圓體（宜蘭腔）",
        name: "Xiaolai-MplusRounded-gilan",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-gilan.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-manking": {
        displayName: "思源黑體（馬公腔）",
        name: "NotoSansTC-Huninn-manking",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-manking.woff2) format('woff2')`,
      },
      "Xiaolai-MplusRounded-manking": {
        displayName: "小賴圓體（馬公腔）",
        name: "Xiaolai-MplusRounded-manking",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-MplusRounded-manking.woff2) format('woff2')`,
      },
    },
  },
  // Teochew / Min Nan (潮州話) — the second non-Cantonese dialect
  // showcased, sharing the Taiwanese pairing: Noto Sans TC base CJK
  // font + Huninn (jf-openhuninn) for the romanization (Huninn carries
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
      "NotoSansTC-Huninn-teochew-pengim": {
        displayName: "思源黑體（潮拼）",
        name: "NotoSansTC-Huninn-teochew-pengim",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-teochew-pengim.woff2) format('woff2')`,
      },
      "NotoSansTC-Huninn-teochew-puj": {
        displayName: "思源黑體（潮州白話字）",
        name: "NotoSansTC-Huninn-teochew-puj",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-teochew-puj.woff2) format('woff2')`,
      },
      // Xiaolai handwritten companions for Teochew.
      "Xiaolai-Huninn-teochew-pengim": {
        displayName: "小賴字體（潮拼）",
        name: "Xiaolai-Huninn-teochew-pengim",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-teochew-pengim.woff2) format('woff2')`,
      },
      "Xiaolai-Huninn-teochew-puj": {
        displayName: "小賴字體（潮州白話字）",
        name: "Xiaolai-Huninn-teochew-puj",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-teochew-puj.woff2) format('woff2')`,
      },
    },
  },
  // Mandarin (普通話 / 國語) — showcased in BOTH regional standards so a
  // reader can compare the cross-strait reading differences:
  //   • 普通話 (-cn) — mandarin-cn.csv on Simplified-region fonts. The
  //     Mainland standard (also what Singapore / Malaysia adopt).
  //   • 國語 (-tw) — mandarin-tw.csv on Traditional fonts. The Taiwan
  //     standard, 753 single-character defaults re-derived from the MOE
  //     國語辭典 (e.g. 期 qí, 危 wéi, 突 tú, 企 qì, 跌 dié).
  // mandarin-tw.csv is a Traditional-Chinese mapping (166 of the 753
  // differences are traditional-only glyphs), so the 國語 builds use
  // Traditional bases: Noto Sans TC (思源黑體 台灣) for the sans face and
  // Xiaolai SC for the handwritten face (it covers 100% of the common
  // Traditional set despite the "SC" name). The 小賴字體 face appears in
  // both standards — the cleanest same-face A/B of 普通話 vs 國語. The
  // Simplified-region Noto Serif SC (思源宋體) is 普通話-only.
  // All .woff files come from the build matrix in
  // .github/workflows/deploy-pages.yml — they go live once the source
  // TTFs are added to python/input_fonts/ and CI rebuilds. The
  // Xiaolai-MplusRounded-mandarin-{cn,tw} face is also built but not
  // surfaced here (reachable by direct /fonts/ URL).
  mandarin: {
    lang: {
      zh: "國語 / 普通話",
      en: "Mandarin",
    },
    fonts: {
      "NotoSansTC-Huninn-mandarin-tw": {
        displayName: "思源黑體 台灣（拼音 · 國語）",
        name: "NotoSansTC-Huninn-mandarin-tw",
        source: `url(${import.meta.env.VITE_FONT_URL}/NotoSansTC-Huninn-mandarin-tw.woff2) format('woff2')`,
      },
      "Xiaolai-Huninn-mandarin-tw": {
        displayName: "小賴字體（拼音 · 國語）",
        name: "Xiaolai-Huninn-mandarin-tw",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-mandarin-tw.woff2) format('woff2')`,
      },
      "SourceHanSerif-Mplus-mandarin-cn": {
        displayName: "思源宋體（拼音 · 普通話）",
        name: "SourceHanSerif-Mplus-mandarin-cn",
        source: `url(${import.meta.env.VITE_FONT_URL}/SourceHanSerif-Mplus-mandarin-cn.woff2) format('woff2')`,
      },
      "Xiaolai-Huninn-mandarin-cn": {
        displayName: "小賴字體（拼音 · 普通話）",
        name: "Xiaolai-Huninn-mandarin-cn",
        source: `url(${import.meta.env.VITE_FONT_URL}/Xiaolai-Huninn-mandarin-cn.woff2) format('woff2')`,
      },
    },
  },
};

/**
 * Reverse-lookup: given a font's machine name (e.g.
 * "NotoSansTC-Huninn-tailo"), return which dialect group it belongs
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
