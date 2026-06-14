/**
 * wingfontPresets — curated list of built-in fonts and mapping
 * dictionaries that ship inside public/wingfont/ and can be picked
 * via dropdowns in Step 1 and Step 2 of the Generate flow.
 *
 * Keep these arrays in sync with the MANIFEST in
 * web/scripts/sync-python.mjs — both reference the same physical
 * files. If you add a preset here without adding the matching
 * MANIFEST entry, the dropdown will offer an option whose URL 404s
 * at fetch time.
 *
 * The `key` field is what the <Select> uses as `value` and what
 * GenerateContext stores as the "current preset" pointer. It's
 * stable across sessions so localStorage / URL-state could persist
 * the selection if we ever wanted that.
 *
 * `label` is intentionally a single string per preset (not a
 * TranslationKey) — preset names like "粵拼 (LSHK Jyutping)" or
 * "ChironSung Italic" read fine in both Chinese and English UIs,
 * and proliferating translation keys for every dropdown row would
 * be more noise than value.
 */

export interface BuiltInPreset {
  /** Stable identifier used as <Select value> and as the "current
   *  preset" pointer in GenerateContext. Snake-case / kebab-case
   *  short string. */
  key: string;
  /** What the dropdown row displays. Bilingual where useful. */
  label: string;
  /** Origin-relative URL under /wingfont/ where the file lives. */
  url: string;
  /** Displayed in the slot as the "loaded file name". Tagged with
   *  "(preset)" by the loader so it's clear this isn't a user
   *  upload. */
  filename: string;
  /**
   * Optional group label used to render <ListSubheader>s in the
   * Step 2 mapping picker. Presets sharing the same `group` value
   * are emitted under one header in array order; when the value
   * changes, a new subheader is rendered before the next item.
   *
   * Leave undefined for fonts/mappings that don't need grouping
   * (Step 1's font pickers are short enough to render flat).
   */
  group?: string;
}

// ---------- Base CJK fonts (the "底字" slot in Step 1) -------------
//
// The list is intentionally curated, not every font under
// python/input_fonts/. Picks cover the main styles a user would want
// for a Cantonese / CJK annotation font:
//   • Sans-serif (Noto Sans TC + SC), variable weight
//   • Sung (serif), Regular and Italic
//   • Hei (sans), Regular and Bold
//   • Kaiti (calligraphic)
//
// First-entry convention: BUILT_IN_BASE_FONTS[0] is the DEFAULT base
// font (consumed by DEFAULT_BASE_FONT_PRESET below). Noto Sans TC
// holds that slot for a bandwidth reason — its variable-weight file
// is ~12 MB, roughly half the ~24 MB ChironSungHK Regular. Since the
// Step 1 picker auto-downloads the default on page load, picking the
// lighter file shaves several seconds off the cold-start experience
// for users on slower connections without changing what's possible
// at runtime (any other entry below is a one-click swap).
//
// Skipped from input_fonts/: FZSJXINKTLWJ (uncommon brush font).
// Add it here + to the sync MANIFEST if you want it surfaced.
export const BUILT_IN_BASE_FONTS: BuiltInPreset[] = [
  // Default base font — see comment block above for the bandwidth
  // rationale. This is the VARIABLE font, so the Step 1 picker
  // exposes its weight slider; the default lands on Regular (400)
  // via defaultAxisLocation in GenerateContext, and wing-font.py
  // auto-instances it to a static master before composition.
  {
    key: "notosanstc",
    label: "思源黑體 (Noto Sans TC)",
    url: "/wingfont/NotoSansTC-VariableFont_wght.ttf",
    filename: "NotoSansTC-VariableFont_wght.ttf",
  },
  // Hong-Kong-locale variant of Noto Sans CJK. Same `wght` variable
  // axis, same auto-instance-to-400. Glyph forms follow HK
  // conventions (字 / 為 / 起 / 緣 / 緊 differ subtly from the
  // Taiwan-locale TC variant). The default /showcase Cantonese
  // builds use this base; surface it here so users generating their
  // own fonts can match the showcase aesthetic.
  {
    key: "notosanshk",
    label: "思源黑體 香港 (Noto Sans HK)",
    url: "/wingfont/NotoSansHK-VariableFont_wght.ttf",
    filename: "NotoSansHK-VariableFont_wght.ttf",
  },
  // Noto Sans JP — native Japanese kanji glyph forms; the natural base
  // for the japanese-onkun mapping (kanji + kana furigana). Shares the
  // synced NotoSansJP-VF.ttf already used as a kana annotation font.
  {
    key: "notosansjp",
    label: "思源黑體 日本 (Noto Sans JP)",
    url: "/wingfont/NotoSansJP-VF.ttf",
    filename: "NotoSansJP-VF.ttf",
  },
  // Simplified-Chinese sibling of Noto Sans TC. Same `wght` variable
  // axis, same auto-instance-to-400 behaviour from wing-font.py; ship
  // it so users targeting Mandarin readers / Simplified-Chinese
  // mappings (pinyin and similar) don't have to upload their own
  // base font. Family-name-distinct from TC, so the two coexist
  // cleanly in the OS font menu after install.
  {
    key: "notosanssc",
    label: "思源黑体 简体 (Noto Sans SC)",
    url: "/wingfont/NotoSansSC-VariableFont_wght.ttf",
    filename: "NotoSansSC-VariableFont_wght.ttf",
  },
  {
    key: "chironsung-r",
    label: "昭源宋體（ChironSung Regular）",
    url: "/wingfont/ChironSungHK-R.ttf",
    filename: "ChironSungHK-R.ttf",
  },
  {
    key: "chironsung-it",
    label: "昭源宋體（ChironSung Italic）",
    url: "/wingfont/ChironSungHK-R-It.ttf",
    filename: "ChironSungHK-R-It.ttf",
  },
  {
    key: "chironhei-r",
    label: "昭源黑體（ChironHei Regular）",
    url: "/wingfont/ChironHeiHK-R.ttf",
    filename: "ChironHeiHK-R.ttf",
  },
  {
    key: "chironhei-b",
    label: "昭源黑體（ChironHei Bold）",
    url: "/wingfont/ChironHeiHK-B.ttf",
    filename: "ChironHeiHK-B.ttf",
  },
  // ─ Mengshen-equivalent base fonts (普通話 pinyin) ────────────────
  //
  // The two base CJK fonts Mengshen-pinyin-font builds its Serif and
  // Handwritten products on, offered here so a user can reproduce a
  // Mengshen-style Mandarin font end-to-end. Both are SIL OFL-1.1.
  // Pair with the matching M+ annotation font below + the Mandarin
  // mapping (拼音) in Step 2. The TTFs are user-supplied — drop them in
  // python/input_fonts/ under the filenames below (see the sync
  // MANIFEST); until then these options 404, like any other preset.
  {
    key: "sourcehanserif-r",
    label: "思源宋體 (Source Han Serif)",
    url: "/wingfont/SourceHanSerif-Regular.ttf",
    filename: "SourceHanSerif-Regular.ttf",
  },
  {
    key: "xiaolai-sc",
    label: "小賴字體 (Xiaolai)",
    url: "/wingfont/XiaolaiSC-Regular.ttf",
    filename: "XiaolaiSC-Regular.ttf",
  },
  // ─ Non-Han base scripts (word-unit experimental tier) ──────────────
  //
  // BASE-side counterpart to the "非漢字底字 (Non-Han base scripts,
  // experimental)" group in BUILT_IN_MAPPINGS. Pair each of these with
  // its matching word-unit mapping:
  //
  //   * NotoSansArabic-VF.ttf + arabic-romanization.csv (DIN 31635)
  //   * Hind-Regular.ttf      + hindi-romanization.csv  (ISO 15919)
  //
  // The pipeline composes each WORD of the base script into one glyph
  // carrying the romanization above it (see python/word_liga_handler.py).
  // Annotation slot wants Noto Serif Regular for both — that's what the
  // pre-built showcase fonts (NotoSansArabic-Noto-romanization,
  // Hind-Noto-romanization) ship with.
  //
  // Hind-Regular also appears in BUILT_IN_ANNO_FONTS (key `anno-hind`)
  // for use as Devanagari ANNOTATION over Cantonese (canto-hindi.csv).
  // Distinct preset keys keep the two picker states independent — a
  // user who picks Hind as base shouldn't see it auto-selected as anno
  // and vice versa.
  {
    key: "notosansarabic",
    label: "Noto Sans Arabic (العربية)",
    url: "/wingfont/NotoSansArabic-VF.ttf",
    filename: "NotoSansArabic-VF.ttf",
  },
  {
    key: "hind",
    label: "Hind (देवनागरी Devanagari)",
    url: "/wingfont/Hind-Regular.ttf",
    filename: "Hind-Regular.ttf",
  },
];

// ---------- Annotation fonts (the "標注字" slot in Step 1) --------
//
// Mixed Latin + CJK. The annotation font supplies the glyphs that
// get composed on top of the base char during pipeline run. Which
// kind of font you want depends on the mapping you've chosen:
//
//   • Latin romanizations (LSHK Jyutping, Yale, Lau, Guangdong,
//     Chishima) → use Noto Serif. The annotation strings are
//     ASCII letters + digits.
//   • Cangjie → use a CJK font like ChironSung or ChironHei. The
//     "annotation" is a sequence of cangjie radical characters
//     (一, 弓, 十, 山 …) which are themselves CJK glyphs.
//
// The CJK options here intentionally overlap with
// BUILT_IN_BASE_FONTS — the same Chiron fonts serve both roles
// because they have full CJK coverage. We re-list them under
// different keys to keep the two pickers' state independent
// (selecting "chironhei-r" as base shouldn't pre-select the same
// font in the anno slot).
//
// First-entry convention: BUILT_IN_ANNO_FONTS[0] is the DEFAULT
// annotation font (consumed by DEFAULT_ANNO_FONT_PRESET below).
// Huninn 粉圓 holds that slot because it covers the broadest range
// of annotation needs in one file: Latin letters + every Tâi-lô /
// POJ combining-tone diacritic + CJK ideographs. That makes it a
// reasonable "just works" default whether the user picks a
// Cantonese (Latin), Taiwanese (toned-Latin), or Cangjie (CJK)
// mapping. The other options below stay for users who want a
// specific stylistic flavour.
export const BUILT_IN_ANNO_FONTS: BuiltInPreset[] = [
  // Default annotation font — see comment block above for why.
  // Annotation font for the Taiwanese / Southern Min mappings:
  // Huninn (jf-openhuninn) carries the full set of Tâi-lô / POJ
  // combining tone marks (U+0300/0301/0302/030C/0304/030D/030B)
  // plus the nasal ⁿ (U+207F) and the POJ o͘ dot (U+0358). Pair
  // it with any of the taigi-* mappings; also handles Latin
  // Cantonese romanizations (LSHK, Yale, etc.) cleanly.
  {
    key: "anno-huninn",
    label: "Huninn 粉圓 (Tâi-lô / POJ)",
    url: "/wingfont/Huninn-Regular.ttf",
    filename: "Huninn-Regular.ttf",
  },
  {
    key: "anno-notoserif-r",
    label: "Noto Serif Regular (Latin)",
    url: "/wingfont/NotoSerif-Regular.ttf",
    filename: "NotoSerif-Regular.ttf",
  },
  {
    key: "anno-chironsung-r",
    label: "昭源宋體（ChironSung Regular）CJK",
    url: "/wingfont/ChironSungHK-R.ttf",
    filename: "ChironSungHK-R.ttf",
  },
  {
    key: "anno-chironhei-r",
    label: "昭源黑體（ChironHei Regular）CJK",
    url: "/wingfont/ChironHeiHK-R.ttf",
    filename: "ChironHeiHK-R.ttf",
  },
  // Script-specific annotation fonts paired with the canto-thai /
  // canto-katakana / canto-korean mappings (which transliterate
  // Cantonese phonetics into Thai / Katakana / Hangul characters
  // respectively). Renamed during sync to drop the commas in
  // Google Sans's source filename and to shorten "VariableFont_..."
  // to "-VF" for URL cleanliness — see web/scripts/sync-python.mjs.
  {
    key: "anno-googlesans-thai",
    label: "Google Sans (Thai)",
    url: "/wingfont/GoogleSans-VF.ttf",
    filename: "GoogleSans-VF.ttf",
  },
  {
    key: "anno-notosansjp",
    label: "Noto Sans JP (Katakana)",
    url: "/wingfont/NotoSansJP-VF.ttf",
    filename: "NotoSansJP-VF.ttf",
  },
  {
    key: "anno-notosanskr",
    label: "Noto Sans KR (Hangul)",
    url: "/wingfont/NotoSansKR-VF.ttf",
    filename: "NotoSansKR-VF.ttf",
  },
  {
    key: "anno-notonastaliq-urdu",
    label: "Noto Nastaliq Urdu (اردو)",
    url: "/wingfont/NotoNastaliqUrdu-VF.ttf",
    filename: "NotoNastaliqUrdu-VF.ttf",
  },
  {
    key: "anno-notosanstagalog",
    label: "Noto Sans Tagalog (ᜊᜌ᜔ᜊᜌᜒᜈ᜔)",
    url: "/wingfont/NotoSansTagalog-Regular.ttf",
    filename: "NotoSansTagalog-Regular.ttf",
  },
  {
    key: "anno-hind",
    label: "Hind (देवनागरी Devanagari)",
    url: "/wingfont/Hind-Regular.ttf",
    filename: "Hind-Regular.ttf",
  },
  {
    key: "anno-notosansgurmukhi",
    label: "Noto Sans Gurmukhi (ਗੁਰਮੁਖੀ)",
    url: "/wingfont/NotoSansGurmukhi-VF.ttf",
    filename: "NotoSansGurmukhi-VF.ttf",
  },
  // ─ Mengshen-equivalent annotation fonts (普通話 pinyin Latin) ─────
  //
  // The pinyin (標注) faces for the two Mengshen-style products. M+ 1m
  // is the exact font Mengshen sets its Serif product's pinyin in;
  // pair it with Source Han Serif. M+ Rounded 1c is an OFL substitute
  // for Mengshen's SetoFontSP (which is not OFL and not on GitHub) for
  // the Handwritten product's pinyin; pair it with Xiaolai. Both are
  // SIL OFL-1.1. User-supplied TTFs — see the sync MANIFEST.
  {
    key: "anno-mplus-1m",
    label: "M+ 1m (拼音 Latin)",
    url: "/wingfont/mplus-1m-medium.ttf",
    filename: "mplus-1m-medium.ttf",
  },
  {
    key: "anno-mplus-rounded",
    label: "M+ Rounded 1c (拼音 Latin)",
    url: "/wingfont/MPLUSRounded1c-Regular.ttf",
    filename: "MPLUSRounded1c-Regular.ttf",
  },
];

// ---------- Mapping dictionaries (the Step 2 picker) ---------------
//
// 20+ mapping presets — too many to read as a flat list. Each entry
// declares a `group` value that the Step 2 dropdown reads to insert
// <ListSubheader>s between sections. The array ORDER also matters:
// presets are emitted in declaration order and the renderer emits a
// new header every time it sees a different `group` value, so keep
// group runs contiguous in this file.
//
// Skipped (intentionally not in this list):
//   • canto-lshk-all.csv — ~10 MB multi-pronunciation variants of
//     canto-lshk. Useful for advanced users but too chunky to be a
//     default option.
export const BUILT_IN_MAPPINGS: BuiltInPreset[] = [
  // ─ Cantonese romanizations (5) ───────────────────────────────────
  {
    key: "canto-lshk",
    label: "粵拼 (LSHK Jyutping)",
    url: "/wingfont/mappings/canto-lshk.csv",
    filename: "canto-lshk.csv",
    group: "粵語拼音 (Cantonese romanization)",
  },
  {
    key: "canto-yale",
    label: "耶魯 (Yale)",
    url: "/wingfont/mappings/canto-yale.csv",
    filename: "canto-yale.csv",
    group: "粵語拼音 (Cantonese romanization)",
  },
  {
    key: "canto-lau",
    label: "劉錫祥 (Lau)",
    url: "/wingfont/mappings/canto-lau.csv",
    filename: "canto-lau.csv",
    group: "粵語拼音 (Cantonese romanization)",
  },
  {
    key: "canto-guangdong",
    label: "廣州 (Guangdong)",
    url: "/wingfont/mappings/canto-guangdong.csv",
    filename: "canto-guangdong.csv",
    group: "粵語拼音 (Cantonese romanization)",
  },
  {
    key: "canto-chishima",
    label: "千島式 (Chishima)",
    url: "/wingfont/mappings/canto-chishima.csv",
    filename: "canto-chishima.csv",
    group: "粵語拼音 (Cantonese romanization)",
  },
  // ─ Cantonese transliterated into non-Latin scripts (3) ───────────
  {
    key: "canto-thai",
    label: "泰文 (Thai script)",
    url: "/wingfont/mappings/canto-thai.csv",
    filename: "canto-thai.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-korean",
    label: "諺文 (Hangul)",
    url: "/wingfont/mappings/canto-korean.csv",
    filename: "canto-korean.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-katakana",
    label: "片仮名 (Katakana)",
    url: "/wingfont/mappings/canto-katakana.csv",
    filename: "canto-katakana.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-filipino",
    label: "ᜊᜌ᜔ᜊᜌᜒᜈ᜔ (Baybayin)",
    url: "/wingfont/mappings/canto-filipino.csv",
    filename: "canto-filipino.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-urdu",
    label: "اردو (Urdu)",
    url: "/wingfont/mappings/canto-urdu.csv",
    filename: "canto-urdu.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-hindi",
    label: "देवनागरी (Hindi / Devanagari)",
    url: "/wingfont/mappings/canto-hindi.csv",
    filename: "canto-hindi.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  {
    key: "canto-punjab",
    label: "ਗੁਰਮੁਖੀ (Punjabi / Gurmukhi)",
    url: "/wingfont/mappings/canto-punjab.csv",
    filename: "canto-punjab.csv",
    group: "粵語拼寫 (Cantonese, other scripts)",
  },
  // ─ Toneless / decorative variants of the four scripts above ──────
  // Identical transliterations with the tone DIGIT stripped, so the
  // output reads as clean native script (헝 공 instead of 헝1 공2) —
  // intended for souvenirs / novelty pieces rather than as a
  // pronunciation guide. They lose tone (and therefore merge more
  // homophones), which is acceptable for decorative use.
  {
    key: "canto-thai-notone",
    label: "泰文・無聲調 (Thai, toneless)",
    url: "/wingfont/mappings/canto-thai-notone.csv",
    filename: "canto-thai-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-korean-notone",
    label: "諺文・無聲調 (Hangul, toneless)",
    url: "/wingfont/mappings/canto-korean-notone.csv",
    filename: "canto-korean-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-katakana-notone",
    label: "片仮名・無聲調 (Katakana, toneless)",
    url: "/wingfont/mappings/canto-katakana-notone.csv",
    filename: "canto-katakana-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-filipino-notone",
    label: "ᜊᜌ᜔ᜊᜌᜒᜈ᜔・無聲調 (Baybayin, toneless)",
    url: "/wingfont/mappings/canto-filipino-notone.csv",
    filename: "canto-filipino-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-urdu-notone",
    label: "اردو・無聲調 (Urdu, toneless)",
    url: "/wingfont/mappings/canto-urdu-notone.csv",
    filename: "canto-urdu-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-hindi-notone",
    label: "देवनागरी・無聲調 (Hindi, toneless)",
    url: "/wingfont/mappings/canto-hindi-notone.csv",
    filename: "canto-hindi-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  {
    key: "canto-punjab-notone",
    label: "ਗੁਰਮੁਖੀ・無聲調 (Punjabi, toneless)",
    url: "/wingfont/mappings/canto-punjab-notone.csv",
    filename: "canto-punjab-notone.csv",
    group: "粵語拼寫・無聲調 (Cantonese, toneless / decorative)",
  },
  // ─ Word-unit base scripts (experimental tier) ─────────────────
  // Non-Han base scripts where each mapped WORD becomes one
  // annotated glyph (not per-character). The pipeline is
  // word_liga_handler.py (see python/README.md). First curated
  // entry is Arabic → DIN 31635; Hindi → ISO 15919 follows; expect
  // Thai to join once its starter CSV lands.
  {
    key: "arabic-romanization",
    label: "العربية (Arabic, DIN 31635)",
    url: "/wingfont/mappings/arabic-romanization.csv",
    filename: "arabic-romanization.csv",
    group: "非漢字底字 (Non-Han base scripts, experimental)",
  },
  // Hindi (Devanagari) → ISO 15919, with Hindi word-final schwa
  // deletion (राम → rām). ~24k most-frequent words from wordfreq,
  // built via gen_hindi_romanization.py → word_liga_handler.py.
  {
    key: "hindi-romanization",
    label: "हिन्दी (Hindi, ISO 15919)",
    url: "/wingfont/mappings/hindi-romanization.csv",
    filename: "hindi-romanization.csv",
    group: "非漢字底字 (Non-Han base scripts, experimental)",
  },
  // Taiwanese / Southern Min (河洛話) — pair these with the Noto Sans
  // TC base and the Huninn annotation font. The two "-toned" CSVs use
  // diacritic tone marks (what the showcase fonts ship); the four
  // numeric-tone CSVs keep tones as trailing digits. These six are the
  // MOE 優勢腔 (standard) reading, from the 臺灣台語常用詞辭典 (sutian /
  // kautian.ods) via ChhoeTaigi — multi-character words carry one
  // syllable per character so the pipeline disambiguates 多音字.
  {
    key: "taigi-tl-toned",
    label: "台羅 (Tâi-lô, 調符・優勢腔)",
    url: "/wingfont/mappings/taigi-tl-toned.csv",
    filename: "taigi-tl-toned.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-poj-toned",
    label: "白話字 (POJ, 調符)",
    url: "/wingfont/mappings/taigi-poj-toned.csv",
    filename: "taigi-poj-toned.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl",
    label: "台羅 (Tâi-lô, 調號)",
    url: "/wingfont/mappings/taigi-tl.csv",
    filename: "taigi-tl.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-poj",
    label: "白話字 (POJ, 調號)",
    url: "/wingfont/mappings/taigi-poj.csv",
    filename: "taigi-poj.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tlpa",
    label: "台語音標 (TLPA, 調號)",
    url: "/wingfont/mappings/taigi-tlpa.csv",
    filename: "taigi-tlpa.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-bp",
    label: "閩拼方案 (BP, 調號)",
    url: "/wingfont/mappings/taigi-bp.csv",
    filename: "taigi-bp.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  // Nine 腔 (accent) survey points in Tâi-lô, from the sutian 語音差異
  // table: each reads the ~1,500 documented headwords its own way (the
  // rest fall back to 優勢腔). 漳/泉 splits like 雞 ke/kue/kere,
  // 飯 pn̄g/puīnn are real here. Grouped together with the 優勢腔 standard
  // schemes above under one 台語 category. NB the 優勢腔 standard is the
  // MOE prestige reading and is not one of these nine points.
  {
    key: "taigi-tl-kohiong",
    label: "高雄腔 (Kaohsiung, 混合腔)",
    url: "/wingfont/mappings/taigi-tl-kohiong.csv",
    filename: "taigi-tl-kohiong.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-tailam",
    label: "台南腔 (Tainan)",
    url: "/wingfont/mappings/taigi-tl-tailam.csv",
    filename: "taigi-tl-tailam.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-taipak",
    label: "台北腔 (Taipei, 偏泉)",
    url: "/wingfont/mappings/taigi-tl-taipak.csv",
    filename: "taigi-tl-taipak.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-sannkiap",
    label: "三峽腔 (Sanxia, 偏泉・kere)",
    url: "/wingfont/mappings/taigi-tl-sannkiap.csv",
    filename: "taigi-tl-sannkiap.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-sintik",
    label: "新竹腔 (Hsinchu, 偏泉)",
    url: "/wingfont/mappings/taigi-tl-sintik.csv",
    filename: "taigi-tl-sintik.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-lokkang",
    label: "鹿港腔 (Lukang, 泉/海口)",
    url: "/wingfont/mappings/taigi-tl-lokkang.csv",
    filename: "taigi-tl-lokkang.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-taitiong",
    label: "台中腔 (Taichung, 偏漳)",
    url: "/wingfont/mappings/taigi-tl-taitiong.csv",
    filename: "taigi-tl-taitiong.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-gilan",
    label: "宜蘭腔 (Yilan, 偏漳)",
    url: "/wingfont/mappings/taigi-tl-gilan.csv",
    filename: "taigi-tl-gilan.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-tl-manking",
    label: "馬公腔 (Magong / 澎湖, 偏泉)",
    url: "/wingfont/mappings/taigi-tl-manking.csv",
    filename: "taigi-tl-manking.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  // Non-Latin Taiwanese annotation systems (from ButTaiwan/taigivs).
  // 方音符號 needs a Bopomofo-covering CJK annotation font (Noto Sans
  // TC / ChironSung); 台灣語假名 needs a katakana font (Noto Sans JP).
  {
    key: "taigi-tps",
    label: "方音符號 (TPS / 注音)",
    url: "/wingfont/mappings/taigi-tps.csv",
    filename: "taigi-tps.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  {
    key: "taigi-kana",
    label: "台灣語假名 (Taiwanese kana)",
    url: "/wingfont/mappings/taigi-kana.csv",
    filename: "taigi-kana.csv",
    group: "台語 (Taiwanese / Southern Min)",
  },
  // Teochew / Min Nan (潮州話) — pair these with the Noto Sans TC base
  // and the Huninn annotation font (Huninn carries every combining
  // tone mark used by the Tie-lo and Pe̍h-ūe-jī diacritic schemes,
  // plus the nasal ⁿ U+207F). gdpi / ggnn / dieghv / sinwz use numeric
  // tones; tlo / duffus use diacritic tones. Source: the readings in
  // learn-teochew's teochew_scrape.json (Geng'dang Pêng'im), converted
  // to the other schemes with the parsetc parser. Primary reading of a
  // polyphonic character is encoded with the highest weight so it is
  // picked as the font default — see python/mappings/teochew-README.md.
  {
    key: "teochew-gdpi",
    label: "潮州話拼音 (Peng'im, 廣東拼音)",
    url: "/wingfont/mappings/teochew-gdpi.csv",
    filename: "teochew-gdpi.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  {
    key: "teochew-duffus",
    label: "潮州白話字 (Duffus / PUJ, 調符)",
    url: "/wingfont/mappings/teochew-duffus.csv",
    filename: "teochew-duffus.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  {
    key: "teochew-tlo",
    label: "潮羅 (Tie-lo, 調符)",
    url: "/wingfont/mappings/teochew-tlo.csv",
    filename: "teochew-tlo.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  {
    key: "teochew-ggnn",
    label: "家己儂拼音 (Gaginang, 調號)",
    url: "/wingfont/mappings/teochew-ggnn.csv",
    filename: "teochew-ggnn.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  {
    key: "teochew-dieghv",
    label: "潮語拼音 (Dieghv, 調號)",
    url: "/wingfont/mappings/teochew-dieghv.csv",
    filename: "teochew-dieghv.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  {
    key: "teochew-sinwz",
    label: "潮州新文字 (Sinwenz)",
    url: "/wingfont/mappings/teochew-sinwz.csv",
    filename: "teochew-sinwz.csv",
    group: "潮州話 (Teochew / Min Nan)",
  },
  // always keep cangjie and mandarin to the bottom
  // ─ Chinese input methods (1) ─────────────────────────────────────
  {
    key: "cangjie",
    label: "倉頡",
    url: "/wingfont/mappings/cangjie.csv",
    filename: "cangjie.csv",
    group: "輸入法 (Chinese input)",
  },
  // ─ Mandarin (2) ──────────────────────────────────────────────────
  // Hanyu Pinyin in numeric-tone form (ling2, yuan2, xing1). Each
  // CSV is large (~95k rows, ~3 MB) because it covers the full
  // Unihan CJK ideograph range, not a curated subset like the
  // Cantonese / Taiwanese / Teochew CSVs. The in-browser pipeline
  // will still produce a reasonable output font because the
  // subsetter trims to characters actually present in the base
  // font's cmap, but expect a noticeably larger output WOFF than
  // the other showcase mappings. Pairs naturally with Noto Sans SC
  // as the base; any annotation font with Latin + digit coverage
  // works (Huninn, Noto Serif, ChironHei/Sung all fine).
  //
  // Two regional standards: 普通話 (Mainland China; also the standard
  // Singapore and Malaysia adopt) and 國語 (Taiwan — 753 single-char
  // default readings re-derived from the MOE 國語辭典, e.g. 期 qí,
  // 危 wéi, 突 tú).
  {
    key: "mandarin-tw",
    label: "拼音 · 國語 (Hanyu Pinyin, 數字調)",
    url: "/wingfont/mappings/mandarin-tw.csv",
    filename: "mandarin-tw.csv",
    group: "國語 / 普通話 (Mandarin)",
  },
  {
    key: "mandarin-cn",
    label: "拼音 · 普通話 (Hanyu Pinyin, 數字調)",
    url: "/wingfont/mappings/mandarin-cn.csv",
    filename: "mandarin-cn.csv",
    group: "國語 / 普通話 (Mandarin)",
  },
  {
    key: "japanese-onkun",
    label: "ふりがな (Hiragana furigana)",
    url: "/wingfont/mappings/japanese-onkun.csv",
    filename: "japanese-onkun.csv",
    group: "日本語 (Japanese)",
  },
];

// ---------- Defaults (first item of each list) ---------------------
//
// Exposed as named exports so GenerateContext can initialise state
// without having to remember which index is the default.
export const DEFAULT_BASE_FONT_PRESET = BUILT_IN_BASE_FONTS[0];
export const DEFAULT_ANNO_FONT_PRESET = BUILT_IN_ANNO_FONTS[0];
export const DEFAULT_MAPPING_PRESET = BUILT_IN_MAPPINGS[0];

/** Find a preset by its key. Returns undefined if no match — caller
 *  should treat that as "user has uploaded a custom file". */
export function findPreset(
  list: BuiltInPreset[],
  key: string | null,
): BuiltInPreset | undefined {
  if (key === null) return undefined;
  return list.find((p) => p.key === key);
}
