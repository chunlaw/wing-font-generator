/**
 * TypographyControls — collapsible "Display options" disclosure with
 * two sliders (font size + letter spacing) and a Reset link. Mounted
 * above the rotating preview text on /showcase and /specimen so a
 * designer evaluating a font can rehearse it at body / heading sizes
 * without leaving the page.
 *
 * State lives in localStorage (`wingfont.display.fontSize` +
 * `wingfont.display.letterSpacing`) so settings persist across page
 * navigation and across visits — a designer who picks 56 px while
 * looking at one font card sees the next font at 56 px too, which
 * is exactly the comparison workflow this enables.
 *
 * Defaults are *intentionally distinct per page*: 36 px on showcase
 * (a comparison-friendly mid-size that doesn't dominate the row of
 * cards) and 56 px on specimen (which is a single-font detail view
 * and deserves more typographic presence). Each page provides its
 * own default; the localStorage key is shared.
 *
 * The disclosure starts collapsed. Discoverable via the visible
 * "Display options" toggle, but doesn't compete for attention with
 * the page's primary content until the user opts in.
 */
import {
  Box,
  Collapse,
  IconButton,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";

const STORAGE_KEY_FONT_SIZE = "wingfont.display.fontSize";
const STORAGE_KEY_LETTER_SPACING = "wingfont.display.letterSpacing";

// Sensible ranges. Font size 16-96 covers everything from body
// text to display headline. Letter spacing -0.05 to 0.20 em covers
// "slightly tight" to "wide" without going into illegible territory.
export const FONT_SIZE_MIN = 16;
export const FONT_SIZE_MAX = 96;
export const LETTER_SPACING_MIN = -0.05;
export const LETTER_SPACING_MAX = 0.2;

export interface TypographySettings {
  fontSizePx: number;
  letterSpacingEm: number;
}

interface TypographyControlsProps {
  /**
   * Page-specific defaults. Used when localStorage has no stored
   * value, AND as the target of the "Reset" button. /showcase passes
   * smaller defaults (36 px) so the comparison view fits multiple
   * cards on one screen; /specimen passes larger defaults (56 px)
   * because it's a single-font detail page.
   */
  defaults: TypographySettings;
  /** Current settings. The parent owns the state via useTypographySettings. */
  settings: TypographySettings;
  /** Mutator passed by the hook. */
  setSettings: (next: TypographySettings) => void;
}

const TypographyControls = ({
  defaults,
  settings,
  setSettings,
}: TypographyControlsProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    setSettings({ ...defaults });
  };

  // Slider onChange fires with (event, value). MUI types `value` as
  // `number | number[]` because Sliders can be range-typed; we
  // narrow with a runtime check.
  const handleFontSize = (_: Event, v: number | number[]) => {
    if (typeof v === "number")
      setSettings({ ...settings, fontSizePx: v });
  };
  const handleLetterSpacing = (_: Event, v: number | number[]) => {
    if (typeof v === "number")
      setSettings({ ...settings, letterSpacingEm: v });
  };

  // True iff at least one slider differs from its page default —
  // used to gate the Reset link (no point offering Reset when we're
  // already at default).
  const dirty =
    settings.fontSizePx !== defaults.fontSizePx ||
    settings.letterSpacingEm !== defaults.letterSpacingEm;

  return (
    <Box width="100%">
      {/*
        Disclosure toggle row. Click the whole row to expand/collapse
        — gives a generous tap target on mobile without needing the
        user to hit the small chevron precisely.
      */}
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          width: "100%",
          py: 0.5,
          px: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          color: "text.secondary",
          "&:hover": { color: "text.primary" },
          textAlign: "left",
        }}
        aria-expanded={open}
        aria-label={t("displayOptions.toggle")}
      >
        <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: "0.08em", flex: 1 }}>
          {t("displayOptions.toggle")}
        </Typography>
        <IconButton
          size="small"
          // The IconButton inherits the click via the parent button;
          // explicit non-interactive role keeps it from double-firing.
          component="span"
          sx={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            color: "inherit",
          }}
        >
          <ExpandMore fontSize="small" />
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Stack spacing={2} sx={{ pt: 1.5, pb: 0.5, px: 0.5 }}>
          {/* Font size — px, integer steps */}
          <Box>
            <Box display="flex" alignItems="baseline" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t("displayOptions.fontSize")}
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {settings.fontSizePx} px
              </Typography>
            </Box>
            <Slider
              size="small"
              value={settings.fontSizePx}
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={1}
              onChange={handleFontSize}
              aria-label={t("displayOptions.fontSize")}
            />
          </Box>

          {/* Letter spacing — em units, two decimals */}
          <Box>
            <Box display="flex" alignItems="baseline" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {t("displayOptions.letterSpacing")}
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {settings.letterSpacingEm.toFixed(2)} em
              </Typography>
            </Box>
            <Slider
              size="small"
              value={settings.letterSpacingEm}
              min={LETTER_SPACING_MIN}
              max={LETTER_SPACING_MAX}
              step={0.01}
              onChange={handleLetterSpacing}
              aria-label={t("displayOptions.letterSpacing")}
            />
          </Box>

          {/*
            Reset link. Hidden when already at default — surfacing
            it when there's nothing to reset reads as visual noise.
            Plain Typography-as-button keeps the affordance subtle
            (a slider panel doesn't deserve a chunky Button) without
            losing keyboard accessibility.
          */}
          {dirty && (
            <Typography
              component="button"
              onClick={handleReset}
              variant="caption"
              sx={{
                alignSelf: "flex-end",
                border: 0,
                background: "transparent",
                cursor: "pointer",
                color: "primary.main",
                p: 0,
                fontWeight: 500,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {t("displayOptions.reset")}
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

export default TypographyControls;

// ── State hook with localStorage persistence ──────────────────────

/**
 * Read the current typography settings, falling back to the
 * page-specific defaults when localStorage has nothing stored or
 * holds an unparseable value.
 *
 * Returns a tuple identical in shape to React's `useState`, so
 * call sites can do:
 *
 *   const [settings, setSettings] = useTypographySettings({
 *     fontSizePx: 36, letterSpacingEm: 0,
 *   });
 *
 * Pulled into a hook (rather than localStorage-reading directly
 * inside each page) so the persistence layer can evolve (debouncing
 * writes, syncing across tabs via the storage event) without every
 * caller having to change.
 */
export const useTypographySettings = (
  defaults: TypographySettings,
): [TypographySettings, (next: TypographySettings) => void] => {
  const [settings, setSettings] = useState<TypographySettings>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const storedSize = window.localStorage.getItem(STORAGE_KEY_FONT_SIZE);
      const storedSpacing = window.localStorage.getItem(
        STORAGE_KEY_LETTER_SPACING,
      );
      // Treat empty / non-numeric as "not set" and fall through to
      // the page default. clamp into [min, max] in case stored
      // value was from a previous range and is now out of bounds.
      const parsedSize = storedSize !== null ? Number(storedSize) : NaN;
      const parsedSpacing =
        storedSpacing !== null ? Number(storedSpacing) : NaN;
      return {
        fontSizePx:
          Number.isFinite(parsedSize) &&
          parsedSize >= FONT_SIZE_MIN &&
          parsedSize <= FONT_SIZE_MAX
            ? parsedSize
            : defaults.fontSizePx,
        letterSpacingEm:
          Number.isFinite(parsedSpacing) &&
          parsedSpacing >= LETTER_SPACING_MIN &&
          parsedSpacing <= LETTER_SPACING_MAX
            ? parsedSpacing
            : defaults.letterSpacingEm,
      };
    } catch {
      return defaults;
    }
  });

  // Mirror writes into localStorage on every change. Cheap enough
  // (two setItem calls per slider drag end) that we don't bother
  // debouncing.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_FONT_SIZE,
        String(settings.fontSizePx),
      );
      window.localStorage.setItem(
        STORAGE_KEY_LETTER_SPACING,
        String(settings.letterSpacingEm),
      );
    } catch {
      /* private browsing / quota exceeded — silently lose persistence */
    }
  }, [settings.fontSizePx, settings.letterSpacingEm]);

  const set = useCallback((next: TypographySettings) => {
    setSettings(next);
  }, []);

  return [settings, set];
};
