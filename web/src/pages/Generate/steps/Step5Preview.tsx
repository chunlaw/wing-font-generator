/**
 * Step 5 — preview the generated font + download TTF/WOFF.
 *
 * Reads `result` from GenerateContext. The WOFF was already installed
 * into document.fonts by the context's generate() action, so the preview
 * textbox just needs to apply the family name and let the browser do
 * the shaping.
 */
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";

const Step5Preview = () => {
  const { t } = useTranslation();
  const { result, params } = useGenerate();
  const [sample, setSample] = useState<string>(() => t("step5.sampleText"));
  const [ttfUrl, setTtfUrl] = useState<string | null>(null);
  const [woffUrl, setWoffUrl] = useState<string | null>(null);

  // Refresh sample text when language changes so the prompt is in the
  // active locale. Without this it'd freeze to whatever locale was
  // active on first render.
  useEffect(() => {
    setSample(t("step5.sampleText"));
  }, [t]);

  // Manage object URLs in tandem with the result blobs.
  useEffect(() => {
    if (!result) {
      setTtfUrl(null);
      setWoffUrl(null);
      return;
    }
    const ttf = URL.createObjectURL(result.ttfBlob);
    const woff = URL.createObjectURL(result.woffBlob);
    setTtfUrl(ttf);
    setWoffUrl(woff);
    return () => {
      URL.revokeObjectURL(ttf);
      URL.revokeObjectURL(woff);
    };
  }, [result]);

  if (!result) {
    return (
      <Box display="flex" flexDirection="column" gap={2}>
        <Typography variant="h6">{t("step5.title")}</Typography>
        <Alert severity="info" variant="outlined">
          {t("step5.noResult")}
        </Alert>
      </Box>
    );
  }

  const baseName = (params.familyName || "wingfont").replace(/\s+/g, "-");

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box>
        <Typography variant="h6">{t("step5.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step5.description")}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
        {ttfUrl && (
          <Button
            variant="contained"
            color="primary"
            href={ttfUrl}
            download={`${baseName}.ttf`}
          >
            {t("step5.download.ttf")}
          </Button>
        )}
        {woffUrl && (
          <Button
            variant="outlined"
            color="primary"
            href={woffUrl}
            download={`${baseName}.woff`}
          >
            {t("step5.download.woff")}
          </Button>
        )}
      </Stack>

      <TextField
        fullWidth
        multiline
        minRows={2}
        value={sample}
        onChange={(e) => setSample(e.target.value)}
      />

      <Paper
        variant="outlined"
        sx={{
          fontFamily: result.installedFamily,
          fontSize: 56,
          lineHeight: 1.5,
          p: 2,
          minHeight: 100,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {sample}
      </Paper>
    </Box>
  );
};

export default Step5Preview;
