/**
 * GlyphPreview — render a sample of glyphs from a parsed opentype.js font.
 *
 * Used in Step 1 so the user can visually confirm they uploaded the
 * right font before committing to a 30+ second pipeline run. We render
 * each character to its own small canvas, sized so a typical CJK glyph
 * fits inside ~64×64 with comfortable padding.
 */
import { Box, Typography } from "@mui/material";
import opentype from "opentype.js";
import { useEffect, useMemo, useRef, useState } from "react";

interface GlyphPreviewProps {
  bytes: ArrayBuffer | null;
  /** Sample characters to render. If a glyph is missing in the font
   *  we silently render nothing for it (the font's `.notdef` would be
   *  noisy and uninformative). */
  sampleChars: string[];
  /** px size for each rendered glyph canvas. */
  glyphSize?: number;
}

const GlyphPreview = ({
  bytes,
  sampleChars,
  glyphSize = 48,
}: GlyphPreviewProps) => {
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parse the font once whenever the bytes change. opentype.parse is
  // synchronous and copies, so we don't have to worry about detaching
  // the ArrayBuffer the user passed in.
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

  // Filter to chars that actually exist in the cmap so we don't render
  // a row of .notdef tofu when the user uploaded a Latin-only font and
  // asked for Chinese previews.
  const renderable = useMemo(() => {
    if (!font) return [];
    return sampleChars.filter((c) => {
      const g = font.charToGlyph(c);
      return g && g.unicode !== undefined && g.index !== 0;
    });
  }, [font, sampleChars]);

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
  if (!font) {
    return (
      <Typography variant="body2" color="text.secondary">
        Parsing…
      </Typography>
    );
  }
  return (
    <Box
      display="flex"
      flexWrap="wrap"
      gap={1}
      sx={{
        // Faint outlines so the preview area is visible even before
        // glyphs render or with non-renderable characters.
        "& canvas": {
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          background: "transparent",
        },
      }}
    >
      {renderable.map((c) => (
        <SingleGlyph key={c} font={font} char={c} size={glyphSize} />
      ))}
      {renderable.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          (font has no glyphs for the sample characters)
        </Typography>
      )}
    </Box>
  );
};

/**
 * One canvas per glyph so a missing/broken one doesn't poison the row.
 * Uses opentype.js's built-in `glyph.draw(ctx, x, y, fontSize)` which
 * handles all the bezier-stroking for us.
 */
const SingleGlyph = ({
  font,
  char,
  size,
}: {
  font: opentype.Font;
  char: string;
  size: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Account for devicePixelRatio so the glyph stays sharp on retina.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // opentype.js draws with the baseline at y. We position it so the
    // glyph centres roughly within the canvas. The 0.78 factor is the
    // typical baseline ratio for upper-cased Latin / CJK glyphs.
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = getComputedStyle(canvas).color || "#000";
    const fontSize = size * 0.85;
    const glyph = font.charToGlyph(char);
    if (!glyph) return;
    const x = (size - (glyph.advanceWidth ?? font.unitsPerEm) * (fontSize / font.unitsPerEm)) / 2;
    const y = size * 0.78;
    glyph.draw(ctx, x, y, fontSize);
  }, [font, char, size]);

  return <canvas ref={canvasRef} />;
};

export default GlyphPreview;
