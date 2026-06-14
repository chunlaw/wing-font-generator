/**
 * languageNotes — the canonical list of languages that have a write-up on
 * the /notes page, plus helpers to resolve a mapping preset key to its
 * language. Shared by the Notes page, the Step 2 mapping picker, and the
 * showcase so the tab keys, labels, and deep-links stay in sync.
 */
export interface NoteLanguage {
  /** URL slug + /notes tab key + python/mappings/<key>/ folder name. */
  key: string;
  /** Native-script name (tab + link label). */
  native: string;
  /** English name. */
  en: string;
}

export const NOTE_LANGUAGES: NoteLanguage[] = [
  { key: "cantonese", native: "廣東話", en: "Cantonese" },
  { key: "taiwanese", native: "台語", en: "Taiwanese" },
  { key: "teochew", native: "潮州話", en: "Teochew" },
  { key: "mandarin", native: "普通話", en: "Mandarin" },
  { key: "japanese", native: "日本語", en: "Japanese" },
  { key: "thai", native: "ภาษาไทย", en: "Thai" },
  { key: "hindi", native: "हिन्दी", en: "Hindi" },
  { key: "arabic", native: "العربية", en: "Arabic" },
];

// Mapping preset keys (canto-lshk, taigi-tl, japanese-onkun, …) → language
// slug. The cross-script Cantonese sets (canto-katakana, canto-thai, …) are
// Cantonese readings, so they resolve to "cantonese". cangjie has no
// language notes.
const KEY_PREFIXES: [string, string][] = [
  ["canto", "cantonese"],
  ["taigi", "taiwanese"],
  ["teochew", "teochew"],
  ["mandarin", "mandarin"],
  ["japanese", "japanese"],
  ["thai", "thai"],
  ["hindi", "hindi"],
  ["arabic", "arabic"],
];

export function mappingKeyToLanguage(key: string | undefined): string | undefined {
  if (!key) return undefined;
  for (const [prefix, slug] of KEY_PREFIXES) {
    if (key.startsWith(prefix)) return slug;
  }
  return undefined;
}

export function noteLanguage(slug: string | undefined): NoteLanguage | undefined {
  return NOTE_LANGUAGES.find((l) => l.key === slug);
}
