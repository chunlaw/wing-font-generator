/**
 * parseFontUpload — validate + read a user-supplied font file into
 * a partial that can be passed to RecentFontsContext.save().
 *
 * Why not save directly here:
 *   Calling the bare `saveRecentFont` util writes to IndexedDB but
 *   doesn't notify the React layer — the RecentFontsProvider's
 *   `entries` state, `recentFontEntriesRef` (consumed by
 *   AppContext.addPickedFont), and the FontFace registry only
 *   refresh through the context's own save() method. Bypassing it
 *   makes the upload race the context: an immediate
 *   `addPickedFont(USER_FONTS_GROUP_KEY, entry.id)` after a direct
 *   saveRecentFont call would resolve against a stale ref and
 *   silently no-op. Forcing the caller to route through context's
 *   save() eliminates the race.
 *
 * Flow:
 *   1. Read the File into an ArrayBuffer.
 *   2. Sniff the magic bytes at byte 0 to classify the format.
 *      Refuse anything that doesn't match a known font signature —
 *      protects the IndexedDB store from junk and prevents the
 *      FontFace API throwing later with cryptic errors.
 *   3. Build and return the partial RecentFontEntry plus the
 *      detected format. The caller (UploadFontButton) feeds the
 *      partial into useRecentFonts().save() to actually persist
 *      and trigger the React refresh.
 *
 * Display name:
 *   We use the file's base name (without extension) verbatim. We
 *   could open it with opentype.js to read the OpenType `name`
 *   table's family name — but that fails on WOFF2 (opentype.js
 *   doesn't decompress Brotli-encoded sfnt) and on subset/
 *   broken-name-table files. The file name is what the user is
 *   thinking of when they uploaded "MyCoolFont.ttf", so we trust it.
 *
 * No transcoding:
 *   The upload doesn't convert TTF↔WOFF↔WOFF2. The browser FontFace
 *   API accepts all three directly, so previews work regardless.
 *   The chip's "Download .ttf" / "Download .woff" menu items are
 *   hidden for uploaded entries (the user already has the file on
 *   disk) so the asymmetric bytes don't leak through as a broken
 *   download.
 */
import {
  generateRecentFontId,
  type RecentFontEntry,
} from "./recentFonts";

/**
 * Browser-side file-size ceiling. Even with IndexedDB's generous
 * quota, a 50 MB CJK font dragged onto the page can lock up the
 * main thread during the FontFace.load() call. 30 MB covers every
 * normal CJK font (Source Han Sans VF is ~25 MB compressed, Noto
 * Sans CJK static masters are 4-15 MB) while rejecting absurd
 * inputs early. The user gets a clear error rather than a
 * mysterious freeze.
 */
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/**
 * Signature classifier. Maps the first 4 bytes of an OpenType-family
 * file to a string format tag. Returns null when the bytes don't
 * match any known font signature.
 *
 * The four legal sfnt-version tags:
 *   0x00010000 — TrueType outlines (.ttf)
 *   "OTTO"     — CFF outlines (.otf)
 *   "true"     — Apple TrueType (.ttf, rare)
 *   "typ1"     — Type 1 inside sfnt (vanishingly rare; we accept it)
 *   "wOFF"     — WOFF 1.0 wrapper around any of the above
 *   "wOF2"     — WOFF 2.0 wrapper (Brotli-compressed)
 */
export type UploadedFontFormat = "ttf" | "otf" | "woff" | "woff2";

function sniffFormat(bytes: Uint8Array): UploadedFontFormat | null {
  if (bytes.length < 4) return null;
  // Read first 4 bytes as both u32 and as ASCII for the comparison.
  const u32 =
    (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  if (u32 === 0x00010000) return "ttf";
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "OTTO") return "otf";
  if (tag === "true" || tag === "typ1") return "ttf";
  if (tag === "wOFF") return "woff";
  if (tag === "wOF2") return "woff2";
  return null;
}

/**
 * Strip the extension off a file name and trim whitespace, leaving
 * a sensible default display label. "MyFont (Regular).woff" →
 * "MyFont (Regular)". Falls back to the raw name if the file has
 * no extension.
 */
function deriveDisplayName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return filename.trim();
  return filename.slice(0, dot).trim();
}

/**
 * Result returned to the UI layer. Carries the partial ready for
 * `RecentFontsContext.save()` plus the detected format so callers
 * can show "added MyFont.woff" copy if they want to.
 */
export interface ParsedFontUpload {
  partial: Omit<RecentFontEntry, "generatedAt" | "pinned">;
  format: UploadedFontFormat;
}

/**
 * Validate + parse a File into a RecentFontEntry partial. Throws
 * an Error with a user-facing message on any failure so the caller
 * can pipe `err.message` into a Snackbar.
 *
 * The CALLER is responsible for persisting — pass the returned
 * partial into `useRecentFonts().save()` so the context's refresh
 * fires (FontFace registration + state propagation) before the
 * next render. Calling `saveRecentFont` directly will write to
 * IndexedDB without notifying the React layer, leaving the new
 * entry invisible to consumers until the next page reload.
 *
 * Error contract:
 *   "too-large"  — file exceeds MAX_UPLOAD_BYTES
 *   "bad-format" — magic bytes don't match a known font signature
 *   "read-failed" — File API rejected the read (rare; usually
 *                   permission issues from a sandboxed parent
 *                   document)
 *
 * Error codes go in `err.name` so the caller can map them to
 * translation keys; the `message` is a human-readable fallback.
 */
export async function parseFontUpload(file: File): Promise<ParsedFontUpload> {
  if (file.size > MAX_UPLOAD_BYTES) {
    const err = new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`,
    );
    err.name = "too-large";
    throw err;
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (cause) {
    // Log the original cause so it's debuggable from the console;
    // the thrown Error carries only the user-facing message +
    // name discriminator. We avoid setting err.cause because the
    // project's tsconfig target predates ES2022 Error.cause.
    console.warn("[uploadFont] file.arrayBuffer() rejected:", cause);
    const err = new Error("Could not read the file");
    err.name = "read-failed";
    throw err;
  }

  const bytes = new Uint8Array(buffer);
  const format = sniffFormat(bytes);
  if (!format) {
    const err = new Error(
      "File doesn't look like a font (expected .ttf, .otf, .woff, or .woff2)",
    );
    err.name = "bad-format";
    throw err;
  }

  // Empty Uint8Array marker for the format we don't have. The
  // FontFace registration in RecentFontsContext picks whichever
  // field is populated (ttf preferred when both exist).
  const empty = new Uint8Array(0);

  const displayName = deriveDisplayName(file.name);

  // saveRecentFont accepts an optional id; we pre-generate one
  // with the "up-" prefix so IndexedDB rows / /specimen URLs hint
  // at the provenance. Generated entries default to "gen-".
  const partial: Omit<RecentFontEntry, "generatedAt" | "pinned"> = {
    id: generateRecentFontId("up"),
    displayName,
    // For uploaded fonts we don't know the OpenType internal family
    // name without parsing the name table. Using the file-derived
    // displayName as fontFamily is correct enough — the FontFace
    // registration uses the opaque `id` for CSS resolution anyway
    // (see RecentFontsContext.refresh), so fontFamily is only used
    // for the "Download as <fontFamily>.ttf" suggested filename
    // when generated fonts are re-downloaded.
    fontFamily: displayName,
    source: "uploaded",
    config: {},
    ttfBytes:
      format === "ttf" || format === "otf" ? bytes : empty,
    woffBytes:
      format === "woff" || format === "woff2" ? bytes : empty,
  };

  return { partial, format };
}
