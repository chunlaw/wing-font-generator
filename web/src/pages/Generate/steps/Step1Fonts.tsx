/**
 * Step 1 — pick the base + annotation fonts and see a live glyph preview.
 *
 * Each font has two ways to populate it: upload (file input) or
 * "use default" (fetches the bundled font). The preview canvases below
 * each slot render a sample of characters from the parsed font so the
 * user can confirm the typeface visually before running the pipeline.
 */
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { ChangeEvent, useCallback, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import {
  BUILT_IN_ANNO_FONTS,
  BUILT_IN_BASE_FONTS,
  BuiltInPreset,
} from "../../../utils/wingfontPresets";
import { AxisLocation, FontAxis } from "../types";
import GlyphPreview from "../GlyphPreview";

// Sample characters chosen to exercise both fonts in their intended use:
// CJK base glyphs for the base font, ASCII letters + digits for the
// annotation font. Each font preview filters to what it actually has.
const BASE_SAMPLES = ["你", "好", "中", "國", "行", "畫", "心", "字", "永", "東"];
const ANNO_SAMPLES = [
  "a", "b", "h", "k", "n", "g", "o", "w", "1", "2", "3", "4",
];

const Step1Fonts = () => {
  const { t } = useTranslation();
  const {
    baseFont,
    annoFont,
    setBaseFont,
    setAnnoFont,
    setBaseFontAxisValue,
    setAnnoFontAxisValue,
    loadBuiltInBaseFont,
    loadBuiltInAnnoFont,
    baseFontLoading,
    annoFontLoading,
  } = useGenerate();
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      target: "base" | "anno",
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const bytes = await file.arrayBuffer();
        if (target === "base") setBaseFont(bytes, file.name);
        else setAnnoFont(bytes, file.name);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    },
    [setBaseFont, setAnnoFont],
  );

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h6">{t("step1.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step1.description")}
        </Typography>
      </Box>

      {loadError && <Alert severity="error">{loadError}</Alert>}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
      >
        <FontSlotCard
          label={t("step1.base.label")}
          hint={t("step1.base.hint")}
          fileName={baseFont.name}
          isDefault={baseFont.isDefault && baseFont.bytes === null}
          onUpload={(e) => handleUpload(e, "base")}
          presetOptions={BUILT_IN_BASE_FONTS}
          presetKey={baseFont.presetKey}
          onPresetChange={async (preset) => {
            try {
              await loadBuiltInBaseFont(preset);
              setLoadError(null);
            } catch (err) {
              setLoadError(err instanceof Error ? err.message : String(err));
            }
          }}
          isLoading={baseFontLoading}
          bytes={baseFont.bytes}
          sampleChars={BASE_SAMPLES}
          glyphSize={56}
          uploadLabel={t("step1.upload")}
          presetLabel={t("step1.presetLabel")}
          previewTitle={t("step1.preview.title")}
          axes={baseFont.axes}
          axisLocation={baseFont.axisLocation}
          onAxisChange={setBaseFontAxisValue}
          axesLabel={t("step1.variableAxes")}
        />
        <FontSlotCard
          label={t("step1.anno.label")}
          hint={t("step1.anno.hint")}
          fileName={annoFont.name}
          isDefault={annoFont.isDefault && annoFont.bytes === null}
          onUpload={(e) => handleUpload(e, "anno")}
          isLoading={annoFontLoading}
          // Annotation slot now has multiple presets (Latin Noto
          // Serif + CJK Chiron variants) because cangjie-style
          // mappings annotate with CJK radical characters instead
          // of romanizations. Same dropdown UX as the base slot.
          presetOptions={BUILT_IN_ANNO_FONTS}
          presetKey={annoFont.presetKey}
          onPresetChange={async (preset) => {
            try {
              await loadBuiltInAnnoFont(preset);
              setLoadError(null);
            } catch (err) {
              setLoadError(err instanceof Error ? err.message : String(err));
            }
          }}
          bytes={annoFont.bytes}
          sampleChars={ANNO_SAMPLES}
          glyphSize={36}
          uploadLabel={t("step1.upload")}
          presetLabel={t("step1.presetLabel")}
          previewTitle={t("step1.preview.title")}
          axes={annoFont.axes}
          axisLocation={annoFont.axisLocation}
          onAxisChange={setAnnoFontAxisValue}
          axesLabel={t("step1.variableAxes")}
        />
      </Stack>
    </Box>
  );
};

interface FontSlotCardProps {
  label: string;
  hint: string;
  fileName: string;
  isDefault: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  bytes: ArrayBuffer | null;
  sampleChars: string[];
  glyphSize: number;
  uploadLabel: string;
  previewTitle: string;
  /**
   * Built-in preset options for this slot. When non-null, the card
   * renders a Select dropdown of the listed presets. When null,
   * falls back to a "Use default" text button (the single-preset
   * case for the annotation slot).
   */
  presetOptions: BuiltInPreset[] | null;
  /** Currently-selected preset key, or null when the slot holds a
   *  user-uploaded file. */
  presetKey: string | null;
  /** Required when presetOptions is non-null — called when the user
   *  picks a row from the dropdown. */
  onPresetChange?: (preset: BuiltInPreset) => Promise<void> | void;
  /** Used only in the no-dropdown fallback path. */
  presetLabel?: string;
  onUseDefault?: () => Promise<void>;
  useDefaultLabel?: string;
  /**
   * Variable-font axes declared by the loaded font. Undefined for
   * non-variable fonts, in which case the axis sliders are not
   * rendered at all (no clutter for the common case).
   */
  axes?: FontAxis[];
  /** Current axis values keyed by tag. Used to drive the slider
   *  positions. */
  axisLocation?: AxisLocation;
  /** Called when the user drags one of the axis sliders. */
  onAxisChange?: (tag: string, value: number) => void;
  /** Heading shown above the axis sliders. */
  axesLabel?: string;
  /**
   * True while a preset is being fetched into this slot. Drives an
   * indeterminate <LinearProgress /> bar at the top of the card and
   * disables the preset Select so the user can't fire a second
   * (overlapping) fetch before the first lands. Optional because
   * the prop is forward-compatible with cards rendered outside the
   * Step 1 context.
   */
  isLoading?: boolean;
}

const FontSlotCard = ({
  label,
  hint,
  fileName,
  isDefault,
  onUpload,
  bytes,
  sampleChars,
  glyphSize,
  uploadLabel,
  previewTitle,
  presetOptions,
  presetKey,
  onPresetChange,
  presetLabel,
  onUseDefault,
  useDefaultLabel,
  axes,
  axisLocation,
  onAxisChange,
  axesLabel,
  isLoading = false,
}: FontSlotCardProps) => {
  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    if (!presetOptions || !onPresetChange) return;
    const next = presetOptions.find((p) => p.key === event.target.value);
    if (next) void onPresetChange(next);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        flex: 1,
        minWidth: 0,
        // `position: relative` + `overflow: hidden` makes the
        // absolutely-positioned LinearProgress below sit flush against
        // the top edge without poking past the rounded corners.
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isLoading && (
        // Indeterminate bar — we don't have real download-byte
        // progress (`res.arrayBuffer()` doesn't surface it). Switch to
        // a determinate variant only if we ever migrate to a streamed
        // ReadableStream reader (see Path B in the design discussion
        // around this feature).
        <LinearProgress
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            // Slight height bump over the default 4px so the affordance
            // reads clearly without overpowering the card content.
            height: 3,
          }}
        />
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>

      {/*
        Upload button on the left, preset chooser on the right.

        When `presetOptions` is provided we render a Select dropdown
        (the new multi-preset path). When it's null we render a
        plain "Use default" text button (the fallback for the
        annotation slot which currently has only one preset to offer
        — a one-row Select would be needless ceremony).

        The upload button uses `flex: 1` + `minWidth: 0` rather than
        the old `fullWidth: width 100%` because flex children with
        100% width were squeezing the right-hand control enough that
        its label could wrap onto two lines on narrow viewports.
      */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 1 }} alignItems="center">
        <Button
          variant="outlined"
          component="label"
          size="small"
          sx={{ flex: 1, minWidth: 0 }}
          // Disable the upload during a fetch so the user can't kick
          // off a local-file load while a preset download is still
          // in flight — the slot can only hold one pair of bytes.
          disabled={isLoading}
        >
          {uploadLabel}
          <input hidden type="file" accept=".ttf,.otf,font/ttf" onChange={onUpload} />
        </Button>
        {presetOptions ? (
          <FormControl
            size="small"
            sx={{ flexShrink: 0, minWidth: 180, maxWidth: "60%" }}
            // Cascades down to the inner Select. While a preset is
            // downloading we don't want a second pick to fire (the
            // latest-wins guard in GenerateContext.loadPresetIntoSlot
            // would silently drop it, but UI feedback is cleaner).
            disabled={isLoading}
          >
            {/*
              `shrink` + `notched` are mandatory when using
              `displayEmpty` with an empty-string sentinel. Without
              both, MUI keeps the label in its centred-empty position
              when presetKey is null (user-uploaded state) and it
              overlaps with the "—" placeholder our renderValue
              paints. Forcing shrink locks the label to the
              notched-top position; `notched` tells the OutlinedInput
              to render the gap in its border to receive it.
            */}
            <InputLabel id={`${label}-preset-label`} shrink>
              {presetLabel}
            </InputLabel>
            <Select
              labelId={`${label}-preset-label`}
              label={presetLabel}
              // Empty string represents the "no preset / user
              // upload" state. MUI's Select needs a falsy-string
              // sentinel because it can't take `null` directly.
              value={presetKey ?? ""}
              onChange={handlePresetChange}
              displayEmpty
              notched
              renderValue={(selected) => {
                if (!selected) return "—";
                const opt = presetOptions.find((p) => p.key === selected);
                return opt?.label ?? selected;
              }}
            >
              {presetOptions.map((preset) => (
                <MenuItem key={preset.key} value={preset.key}>
                  {preset.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Button
            variant="text"
            size="small"
            onClick={onUseDefault}
            disabled={isLoading}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {useDefaultLabel}
          </Button>
        )}
      </Stack>

      <Typography
        variant="caption"
        sx={{ display: "block", wordBreak: "break-all", color: "text.secondary" }}
      >
        {fileName}
        {isDefault && bytes === null && " — not yet loaded"}
      </Typography>

      <Box mt={2}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {previewTitle}
        </Typography>
        {/* Forwarding axisLocation here is what makes the preview
            glyphs respond live to the variable-font axis sliders
            below. The browser interpolates outlines per the
            font-variation-settings CSS we set inside GlyphPreview. */}
        <GlyphPreview
          bytes={bytes}
          sampleChars={sampleChars}
          glyphSize={glyphSize}
          axisLocation={axisLocation}
        />
      </Box>

      {/*
        Variable-font axis sliders — only rendered when the loaded
        font actually has an fvar table with axes. Non-variable
        fonts (the common case) get no UI clutter here.
      */}
      {axes && axes.length > 0 && (
        <Box mt={2}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1, fontWeight: 600 }}
          >
            {axesLabel ?? "Axes"}
          </Typography>
          <Stack spacing={1.5}>
            {axes.map((axis) => {
              const value = axisLocation?.[axis.tag] ?? axis.default;
              // Pick a slider step that gives reasonable
              // granularity without being absurdly fine. Range
              // 0–1 (ital/slnt) gets step 0.01; integer ranges
              // (wght 100–900 etc.) get step 1; anything else
              // uses ~1/100 of the range.
              const range = axis.max - axis.min;
              const step =
                range <= 1
                  ? 0.01
                  : Number.isInteger(axis.min) &&
                      Number.isInteger(axis.max) &&
                      range >= 100
                    ? 1
                    : Math.max(0.1, Math.round((range / 100) * 100) / 100);
              return (
                <Box key={axis.tag}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {axis.name} ({axis.tag}): {value}
                  </Typography>
                  <Slider
                    size="small"
                    value={value}
                    min={axis.min}
                    max={axis.max}
                    step={step}
                    onChange={(_, v) =>
                      onAxisChange?.(
                        axis.tag,
                        Array.isArray(v) ? v[0] : v,
                      )
                    }
                    valueLabelDisplay="auto"
                    marks={[
                      { value: axis.min, label: String(axis.min) },
                      {
                        value: axis.default,
                        label: `${axis.default}`,
                      },
                      { value: axis.max, label: String(axis.max) },
                    ]}
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default Step1Fonts;
