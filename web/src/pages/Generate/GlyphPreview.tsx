/**
 * GlyphPreview — render a sample of glyphs from a parsed font.
 *
 * Used in Step 1 so the user can visually confirm they uploaded the
 * right font before committing to a 30+ second pipeline run.
 *
 * Rendering strategy
 * ------------------
 * Each glyph is rendered as an HTML <Box> with the font installed via
 * `@font-face` and styled with `font-family` + `font-variation-settings`.
 * We rely on the browser's native font engine for two reasons:
 *
 *   1. **Variable-font interpolation just works.** When the Step 1
 *      axis sliders change, we update the `font-variation-settings`
 *      string on the rendered glyphs and the browser interpolates
 *      outlines for us. The previous canvas-based implementation
 *      used opentype.js's `glyph.draw()`, which doesn't reliably
 *      apply gvar deltas — so the preview never reflected slider
 *      changes for variable fonts.
 *   2. **Reactive updates are cheap.** No re-parse, no canvas
 *      redraw — just a CSS change. Slider drags update in real time.
 *
 * opentype.js is still used (in parse-only mode) for the cmap
 * filter: we ask "does this character exist in this font?" so we
 * don't render rows of .notdef tofu when the user has a Latin font
 * with CJK sample chars (or vice versa).
 */
import { Box, Typography } from "@mui/material";
import opentype from "opentype.js";
import { useEffect, useMemo, useState } from "react";

import { AxisLocation } from "./types";

interface GlyphPreviewProps {
  bytes: ArrayBuffer | null;
  /** Sample characters to render. If a glyph is missing in the font
   *  we silently render nothing for it (the font's `.notdef` would be
   *  noisy and uninformative). */
  sampleChars: string[];
  /** px size for each rendered glyph. */
  glyphSize?: number;
  /** Variable-font axis location, when the loaded font has axes.
   *  Translates into a `font-variation-settings` CSS string applied
   *  to every rendered glyph. Undefined / empty = use the font's
   *  default instance. */
  axisLocation?: AxisLocation;
}

/**
 * Module-level counter for unique `@font-face` family names. Two
 * GlyphPreview instances mounted at the same time (e.g. the base
 * and anno slots) need distinct family names, otherwise both would
 * compete for the same FontFace registration.
 */
let familyCounter = 0;

const GlyphPreview = ({
  bytes,
  sampleChars,
  glyphSize = 48,
  axisLocation,
}: GlyphPreviewProps) => {
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  /** Family name we installed `bytes` under. null while loading or
   *  if the FontFace failed to register. */
  const [installedFamily, setInstalledFamily] = useState<string | null>(
    null,
  );

  // Parse via opentype.js solely for the cmap filter below. opentype's
  // parser is synchronous and copies, so we don't have to worry about
  // the caller's ArrayBuffer being detached later.
  useEffect(() => {
    setParseError(null);
    setFont(null);
    if (!bytes) return;
    try {
      const f = opentype.parse(bytes.slice(0));
      setFont(f);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, [bytes]);

  // Install bytes as an @font-face. We use a per-mount unique family
  // name so multiple GlyphPreview instances (base + anno slot) don't
  // overwrite each other. Cleanup removes the FontFace and revokes
  // the blob URL on unmount or when bytes change.
  useEffect(() => {
    if (!bytes) {
      setInstalledFamily(null);
      return;
    }
    const family = `glyph-preview-${++familyCounter}`;
    const blob = new Blob([bytes], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);
    const face = new FontFace(family, `url(${url})`);
    let cancelled = false;
    face
      .load()
      .then(() => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        document.fonts.add(face);
        setInstalledFamily(family);
      })
      .catch(() => {
        URL.revokeObjectURL(url);
      });
    return () => {
      cancelled = true;
      // Belt-and-braces: try to delete from the document's font set
      // even if load() didn't complete (no-op if it wasn't added).
      try {
        document.fonts.delete(face);
      } catch {
        /* ignore */
      }
      // Defer URL revocation a touch so any in-flight render has time
      // to grab the bytes. 30 s mirrors the pattern in
      // utils/wingfont.ts:installFontBlob.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    };
  }, [bytes]);

  // Filter to chars that actually exist in the cmap.
  const renderable = useMemo(() => {
    if (!font) return [];
    return sampleChars.filter((c) => {
      const g = font.charToGlyph(c);
      return g && g.unicode !== undefined && g.index !== 0;
    });
  }, [font, sampleChars]);

  // Build the CSS `font-variation-settings` string from the axis
  // location. Returns undefined when there's nothing to apply, so we
  // don't emit a "font-variation-settings: ;" no-op (which would
  // still trigger a redundant style recompute on every render).
  const variationSettings = useMemo(() => {
    if (!axisLocation) return undefined;
    const entries = Object.entries(axisLocation);
    if (entries.length === 0) return undefined;
    // Each axis tag is a 4-char ASCII string and CSS requires it
    // wrapped in double quotes inside font-variation-settings.
    return entries.map(([tag, value]) => `"${tag}" ${value}`).join(", ");
  }, [axisLocation]);

  if (!bytes) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        (no font loaded)
      </Typography>
    );
  }
  if (parseError) {
    return (
      <Typography variant="body2" color="error">
        {parseError}
      </Typography>
    );
  }
  if (!font || !installedFamily) {
    return (
      <Typography variant="body2" color="text.secondary">
        Parsing…
      </Typography>
    );
  }
  return (
    <Box display="flex" flexWrap="wrap" gap={1}>
      {renderable.map((c) => (
        <Box
          key={c}
          sx={{
            width: glyphSize,
            height: glyphSize,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // 0.85 of the box height matches the canvas implementation's
            // sizing so swapping engines doesn't visually change anything
            // for non-variable fonts.
            fontSize: `${glyphSize * 0.85}px`,
            lineHeight: 1,
            fontFamily: `"${installedFamily}", serif`,
            // Only emit the property when we have something to set —
            // undefined leaves the CSS rule absent, which lets the
            // browser take the font's default instance.
            fontVariationSettings: variationSettings,
            // Prevent line-break-in-the-middle-of-CJK on the rare
            // multi-codepoint sample char (e.g. emoji ZWJ sequences).
            overflowWrap: "normal",
            wordBreak: "keep-all",
            color: "text.primary",
          }}
        >
          {c}
        </Box>
      ))}
      {renderable.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          (font has no glyphs for the sample characters)
        </Typography>
      )}
    </Box>
  );
};

export default GlyphPreview;
