/**
 * Step 5 — preview the generated font + download TTF/WOFF.
 *
 * Reads `result` from GenerateContext. The WOFF was already installed
 * into document.fonts by the context's generate() action, so the preview
 * textbox just needs to apply the family name and let the browser do
 * the shaping.
 */
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Fragment, ReactNode, useEffect, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";

/**
 * Wrap each ligature-trigger group (`字1`, `字23`, `字丅一`, …) in a
 * `<span style="white-space: nowrap">` so the browser can't break the
 * line inside the group. If it did, the OpenType `liga` rule would
 * fail — the shaper handles each visual line as a separate run, so
 * splitting `行|1` between two lines produces a default-form `行`
 * followed by a stray `1`, not the variant the user wanted.
 *
 * The regex matches:
 *   - any non-digit / non-trigger character
 *   - followed by either 1+ ASCII digits 0-9
 *   - or the trigger `丅` followed by exactly one Chinese numeral
 *
 * Characters that aren't part of a trigger group are emitted as plain
 * text fragments — they're free to wrap normally.
 */
const TRIGGER_REGEX = /([^\s0-9丅])(?:([0-9]+)|(丅[零一二三四五六七八九]))/g;

function renderWithNoBreaks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Reset state — RegExp objects are stateful when /g is set.
  TRIGGER_REGEX.lastIndex = 0;
  while ((match = TRIGGER_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`t-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </Fragment>,
      );
    }
    parts.push(
      <span key={`g-${match.index}`} style={{ whiteSpace: "nowrap" }}>
        {match[0]}
      </span>,
    );
    lastIndex = TRIGGER_REGEX.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Fragment key={`t-${lastIndex}`}>{text.substring(lastIndex)}</Fragment>,
    );
  }
  return parts;
}

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
          // Responsive: 28px on a phone, scaling up to 56px on lg+.
          // 56px overflows narrow viewports and makes the ligature
          // bug (handled by renderWithNoBreaks) more frequent.
          fontSize: { xs: 28, sm: 36, md: 48, lg: 56 },
          lineHeight: 1.5,
          p: { xs: 1.5, md: 2 },
          minHeight: 100,
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
        }}
      >
        {renderWithNoBreaks(sample)}
      </Paper>
    </Box>
  );
};

export default Step5Preview;
