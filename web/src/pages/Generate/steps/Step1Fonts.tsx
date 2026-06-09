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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
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
    loadBuiltInBaseFont,
    loadBuiltInAnnoFont,
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
          bytes={baseFont.bytes}
          sampleChars={BASE_SAMPLES}
          glyphSize={56}
          uploadLabel={t("step1.upload")}
          presetLabel={t("step1.presetLabel")}
          previewTitle={t("step1.preview.title")}
        />
        <FontSlotCard
          label={t("step1.anno.label")}
          hint={t("step1.anno.hint")}
          fileName={annoFont.name}
          isDefault={annoFont.isDefault && annoFont.bytes === null}
          onUpload={(e) => handleUpload(e, "anno")}
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
}: FontSlotCardProps) => {
  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    if (!presetOptions || !onPresetChange) return;
    const next = presetOptions.find((p) => p.key === event.target.value);
    if (next) void onPresetChange(next);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
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
        >
          {uploadLabel}
          <input hidden type="file" accept=".ttf,.otf,font/ttf" onChange={onUpload} />
        </Button>
        {presetOptions ? (
          <FormControl
            size="small"
            sx={{ flexShrink: 0, minWidth: 180, maxWidth: "60%" }}
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
        <GlyphPreview bytes={bytes} sampleChars={sampleChars} glyphSize={glyphSize} />
      </Box>
    </Paper>
  );
};

export default Step1Fonts;
