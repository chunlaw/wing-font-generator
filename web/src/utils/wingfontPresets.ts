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
}

// ---------- Base CJK fonts (the "底字" slot in Step 1) -------------
//
// The list is intentionally curated, not every font under
// python/input_fonts/. Picks cover the four main styles a user
// would want for a Cantonese annotation font:
//   • Sung (serif), Regular and Italic
//   • Hei (sans), Regular and Bold
//   • Kaiti (calligraphic)
//
// Skipped from input_fonts/: NotoSansTC, FZSJXINKTLWJ — Noto Sans
// TC overlaps stylistically with ChironHei, and FZSJ is an
// uncommon brush font. Add either here + to the sync MANIFEST if
// you want them surfaced.
export const BUILT_IN_BASE_FONTS: BuiltInPreset[] = [
  {
    key: "chironsung-r",
    label: "ChironSung Regular",
    url: "/wingfont/ChironSungHK-R.ttf",
    filename: "ChironSungHK-R.ttf",
  },
  {
    key: "chironsung-it",
    label: "ChironSung Italic",
    url: "/wingfont/ChironSungHK-R-It.ttf",
    filename: "ChironSungHK-R-It.ttf",
  },
  {
    key: "chironhei-r",
    label: "ChironHei Regular",
    url: "/wingfont/ChironHeiHK-R.ttf",
    filename: "ChironHeiHK-R.ttf",
  },
  {
    key: "chironhei-b",
    label: "ChironHei Bold",
    url: "/wingfont/ChironHeiHK-B.ttf",
    filename: "ChironHeiHK-B.ttf",
  },
  {
    key: "fzkaiti",
    label: "方正楷体 (FZ Kaiti)",
    url: "/wingfont/FZKaiti.ttf",
    filename: "FZKaiti.ttf",
  },
  // Sans-serif CJK base — the natural pairing for the Taiwanese /
  // Southern Min showcase fonts. Also a good general-purpose base.
  // This is the VARIABLE font, so the Step 1 picker exposes its
  // weight slider; the default lands on Regular (400) via
  // defaultAxisLocation in GenerateContext, and wing-font.py
  // auto-instances it to a static master before composition.
  {
    key: "notosanstc",
    label: "思源黑體 (Noto Sans TC)",
    url: "/wingfont/NotoSansTC-VariableFont_wght.ttf",
    filename: "NotoSansTC-VariableFont_wght.ttf",
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
    label: "ChironSung Regular (CJK)",
    url: "/wingfont/ChironSungHK-R.ttf",
    filename: "ChironSungHK-R.ttf",
  },
  {
    key: "anno-chironhei-r",
    label: "ChironHei Regular (CJK)",
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
];

// ---------- Mapping dictionaries (the Step 2 picker) ---------------
//
// All five mainstream Cantonese romanizations plus Cangjie. Skipped:
// canto-lshk-all.csv — it's ~10 MB (multi-pronunciation variants of
// canto-lshk), useful for advanced users but a chunky default. Add
// it back if you want to expose it.
export const BUILT_IN_MAPPINGS: BuiltInPreset[] = [
  {
    key: "canto-lshk",
    label: "粵拼 (LSHK Jyutping)",
    url: "/wingfont/mappings/canto-lshk.csv",
    filename: "canto-lshk.csv",
  },
  {
    key: "canto-yale",
    label: "耶魯 (Yale)",
    url: "/wingfont/mappings/canto-yale.csv",
    filename: "canto-yale.csv",
  },
  {
    key: "canto-lau",
    label: "劉錫祥 (Lau)",
    url: "/wingfont/mappings/canto-lau.csv",
    filename: "canto-lau.csv",
  },
  {
    key: "canto-guangdong",
    label: "廣州 (Guangdong)",
    url: "/wingfont/mappings/canto-guangdong.csv",
    filename: "canto-guangdong.csv",
  },
  {
    key: "canto-chishima",
    label: "千島式 (Chishima)",
    url: "/wingfont/mappings/canto-chishima.csv",
    filename: "canto-chishima.csv",
  },
  {
    key: "canto-thai",
    label: "泰文 (Thai script)",
    url: "/wingfont/mappings/canto-thai.csv",
    filename: "canto-thai.csv",
  },
  {
    key: "canto-korean",
    label: "諺文 (Hangul)",
    url: "/wingfont/mappings/canto-korean.csv",
    filename: "canto-korean.csv",
  },
  {
    key: "canto-katakana",
    label: "片仮名 (Katakana)",
    url: "/wingfont/mappings/canto-katakana.csv",
    filename: "canto-katakana.csv",
  },
  {
    key: "cangjie",
    label: "倉頡",
    url: "/wingfont/mappings/cangjie.csv",
    filename: "cangjie.csv",
  },
  // Taiwanese / Southern Min (河洛話) — pair these with the Noto Sans
  // TC base and the Huninn annotation font. The two "-toned" CSVs use
  // diacritic tone marks (what the showcase fonts ship); the four
  // numeric-tone CSVs keep tones as trailing digits. Data source:
  // AlanJui/Piau-Im + AlanJui/rime-tlpa.
  {
    key: "taigi-tl-toned",
    label: "台羅 (Tâi-lô, 調符)",
    url: "/wingfont/mappings/taigi-tl-toned.csv",
    filename: "taigi-tl-toned.csv",
  },
  {
    key: "taigi-poj-toned",
    label: "白話字 (POJ, 調符)",
    url: "/wingfont/mappings/taigi-poj-toned.csv",
    filename: "taigi-poj-toned.csv",
  },
  {
    key: "taigi-tl",
    label: "台羅 (Tâi-lô, 調號)",
    url: "/wingfont/mappings/taigi-tl.csv",
    filename: "taigi-tl.csv",
  },
  {
    key: "taigi-poj",
    label: "白話字 (POJ, 調號)",
    url: "/wingfont/mappings/taigi-poj.csv",
    filename: "taigi-poj.csv",
  },
  {
    key: "taigi-tlpa",
    label: "台語音標 (TLPA, 調號)",
    url: "/wingfont/mappings/taigi-tlpa.csv",
    filename: "taigi-tlpa.csv",
  },
  {
    key: "taigi-bp",
    label: "閩拼方案 (BP, 調號)",
    url: "/wingfont/mappings/taigi-bp.csv",
    filename: "taigi-bp.csv",
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
  },
  {
    key: "teochew-duffus",
    label: "潮州白話字 (Duffus / PUJ, 調符)",
    url: "/wingfont/mappings/teochew-duffus.csv",
    filename: "teochew-duffus.csv",
  },
  {
    key: "teochew-tlo",
    label: "潮羅 (Tie-lo, 調符)",
    url: "/wingfont/mappings/teochew-tlo.csv",
    filename: "teochew-tlo.csv",
  },
  {
    key: "teochew-ggnn",
    label: "家己儂拼音 (Gaginang, 調號)",
    url: "/wingfont/mappings/teochew-ggnn.csv",
    filename: "teochew-ggnn.csv",
  },
  {
    key: "teochew-dieghv",
    label: "潮語拼音 (Dieghv, 調號)",
    url: "/wingfont/mappings/teochew-dieghv.csv",
    filename: "teochew-dieghv.csv",
  },
  {
    key: "teochew-sinwz",
    label: "潮州新文字 (Sinwenz)",
    url: "/wingfont/mappings/teochew-sinwz.csv",
    filename: "teochew-sinwz.csv",
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
