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
export const BUILT_IN_ANNO_FONTS: BuiltInPreset[] = [
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
