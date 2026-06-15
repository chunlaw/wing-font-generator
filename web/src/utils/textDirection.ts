/**
 * textDirection — tiny helpers for rendering generated-font previews in
 * the correct writing direction.
 *
 * Background: the whole Generate flow was built around CJK base fonts,
 * which are LTR and where every ideograph shapes independently. Two
 * assumptions baked into the preview code break for other base scripts:
 *
 *   1. Direction. Arabic / Hebrew / Thaana base text is right-to-left.
 *      The annotation trigger appends ASCII digits (or a Han numeral)
 *      after the base char; those are bidi-weak, so inside an RTL run
 *      the Unicode bidi algorithm reorders the trigger relative to its
 *      base glyph unless the container is explicitly marked `dir="rtl"`.
 *
 *   2. Cursive joining. Arabic letters join to their neighbours, and
 *      the Step 5 preview wraps every base+trigger group in its own
 *      inline <span> (to stop a line break landing mid-ligature — a
 *      real hazard for CJK, which has a break opportunity on EVERY
 *      character boundary). Splitting a connected Arabic word across
 *      inline boxes severs the cursive joining, rendering letters in
 *      their isolated forms. RTL scripts don't have intra-word break
 *      opportunities the way CJK does, so the span trick isn't needed
 *      for them anyway — callers should skip it when isRtlText() is
 *      true.
 *
 * Detection is deliberately coarse: a single strong-RTL codepoint
 * anywhere in the sample flips the whole preview to RTL. Mixed
 * RTL+CJK base text isn't a real use case (a font has one base
 * script), so we don't try to do per-run bidi resolution — the
 * browser still handles bidi WITHIN the container once `dir` is set.
 */

/**
 * Unicode ranges for the strong right-to-left scripts we care about as
 * a base font. Hebrew and Arabic cover the overwhelming majority; the
 * Arabic presentation-forms blocks are included so text that already
 * carries pre-shaped codepoints is detected too. Thaana (Dhivehi),
 * NKo, Syriac and Samaritan are cheap to add and round out the set.
 */
const RTL_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x06ff], // Arabic
  [0x0700, 0x074f], // Syriac
  [0x0750, 0x077f], // Arabic Supplement
  [0x0780, 0x07bf], // Thaana
  [0x07c0, 0x07ff], // NKo
  [0x0800, 0x083f], // Samaritan
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb1d, 0xfb4f], // Hebrew presentation forms
  [0xfb50, 0xfdff], // Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
];

function isRtlCodepoint(cp: number): boolean {
  for (const [lo, hi] of RTL_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

/**
 * True when `text` contains at least one strong right-to-left
 * character. Used to (a) set `dir="rtl"` on preview containers and
 * (b) tell the Step 5 no-break splitter to leave cursive text intact.
 */
export function isRtlText(text: string): boolean {
  // Iterate by codepoint (not UTF-16 unit) so astral-plane scripts are
  // handled correctly; the spread iterator yields whole codepoints.
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && isRtlCodepoint(cp)) return true;
  }
  return false;
}

/** Convenience: the `dir` attribute value for a piece of preview text. */
export function dirForText(text: string): "rtl" | "ltr" {
  return isRtlText(text) ? "rtl" : "ltr";
}

/**
 * Dialect keys whose base script reads right-to-left. Used by
 * `effectiveDir()` as a fallback signal when the actual text content
 * carries no strong directional codepoint (typically the empty
 * field on first paint, or an editor cleared back to empty after
 * the user deletes their typed text).
 *
 * Keep in sync with `AVAILABLE_FONTS` keys in utils/const.ts —
 * adding a new RTL-script dialect group (Hebrew, Thaana, …) means
 * listing its key here so an empty editor on a specimen page for
 * that font starts in the expected direction.
 */
const RTL_DIALECT_KEYS: ReadonlySet<string> = new Set([
  "arabic",
  // Future: "hebrew", "thaana", "syriac" when the catalog grows.
]);

/**
 * The `dir` attribute value to apply to an editable / displayed
 * preview surface, given:
 *
 *   * `text` — what's currently in the surface (user input or sample).
 *   * `fontDialectKey` — optional hint about the picked font's base
 *     script, used only as a tie-breaker when `text` has no strong
 *     direction signal.
 *
 * Decision order:
 *   1. If `text` contains a strong-RTL codepoint → `"rtl"`.
 *   2. Else if `text` contains any non-RTL ASCII letter, CJK glyph,
 *      etc., the implicit LTR-ness wins → `"ltr"`. (We don't have
 *      to detect this explicitly — falling through to step 4 with
 *      no dialect hint yields `"ltr"`.)
 *   3. Else if `text` is empty / neutral AND `fontDialectKey` names
 *      a known RTL-base dialect → `"rtl"`. This is the
 *      "Arabic-base specimen page on first paint" case: caret on
 *      the right is what an Arabic typist expects.
 *   4. Default → `"ltr"`.
 *
 * Trade-off: empty Arabic specimen + first keystroke is Latin →
 * the field flips from `rtl` to `ltr`, causing a one-keystroke
 * caret jump. Accepted as a rare case — the common case is the
 * user picks an Arabic font and types Arabic, where directions
 * agree before and after the first character.
 */
export function effectiveDir(
  text: string,
  fontDialectKey?: string,
): "rtl" | "ltr" {
  if (isRtlText(text)) return "rtl";
  // `text` is empty or contains only LTR / neutral codepoints. The
  // dialect hint only kicks in for the empty case; an LTR string
  // explicitly typed into an Arabic specimen pulls direction
  // toward LTR, which is what the user is asking for via their
  // keystrokes.
  if (text === "" && fontDialectKey && RTL_DIALECT_KEYS.has(fontDialectKey)) {
    return "rtl";
  }
  return "ltr";
}
