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
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ChangeEvent, useCallback, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
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
    loadDefaultBaseFont,
    loadDefaultAnnoFont,
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
          onUseDefault={async () => {
            try {
              await loadDefaultBaseFont();
              setLoadError(null);
            } catch (err) {
              setLoadError(err instanceof Error ? err.message : String(err));
            }
          }}
          bytes={baseFont.bytes}
          sampleChars={BASE_SAMPLES}
          glyphSize={56}
          uploadLabel={t("step1.upload")}
          useDefaultLabel={t("step1.useDefault")}
          previewTitle={t("step1.preview.title")}
        />
        <FontSlotCard
          label={t("step1.anno.label")}
          hint={t("step1.anno.hint")}
          fileName={annoFont.name}
          isDefault={annoFont.isDefault && annoFont.bytes === null}
          onUpload={(e) => handleUpload(e, "anno")}
          onUseDefault={async () => {
            try {
              await loadDefaultAnnoFont();
              setLoadError(null);
            } catch (err) {
              setLoadError(err instanceof Error ? err.message : String(err));
            }
          }}
          bytes={annoFont.bytes}
          sampleChars={ANNO_SAMPLES}
          glyphSize={36}
          uploadLabel={t("step1.upload")}
          useDefaultLabel={t("step1.useDefault")}
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
  onUseDefault: () => Promise<void>;
  bytes: ArrayBuffer | null;
  sampleChars: string[];
  glyphSize: number;
  uploadLabel: string;
  useDefaultLabel: string;
  previewTitle: string;
}

const FontSlotCard = ({
  label,
  hint,
  fileName,
  isDefault,
  onUpload,
  onUseDefault,
  bytes,
  sampleChars,
  glyphSize,
  uploadLabel,
  useDefaultLabel,
  previewTitle,
}: FontSlotCardProps) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 1 }}>
        <Button variant="outlined" component="label" size="small" fullWidth>
          {uploadLabel}
          <input hidden type="file" accept=".ttf,.otf,font/ttf" onChange={onUpload} />
        </Button>
        <Button variant="text" size="small" onClick={onUseDefault}>
          {useDefaultLabel}
        </Button>
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
