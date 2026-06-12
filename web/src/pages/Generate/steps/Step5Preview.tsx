/**
 * Step 5 — preview the generated font + download TTF/WOFF.
 *
 * Reads `result` from GenerateContext. The WOFF was already installed
 * into document.fonts by the context's generate() action, so the preview
 * textbox just needs to apply the family name and let the browser do
 * the shaping.
 */
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Code, ContentCopy } from "@mui/icons-material";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useRecentFonts } from "../../../RecentFontsContext";
import Markdown from "../../../components/Markdown";

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
  const { result, params, baseFont, annoFont, mappingsPresetKey } =
    useGenerate();
  const { save: saveRecentFont } = useRecentFonts();
  const [sample, setSample] = useState<string>(() => t("step5.sampleText"));
  const [ttfUrl, setTtfUrl] = useState<string | null>(null);
  const [woffUrl, setWoffUrl] = useState<string | null>(null);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);

  // ── Save-to-recent-fonts effect ────────────────────────────────────
  // Persist the latest successful generation to IndexedDB so the user
  // can re-download / preview / pin it later. Saving from this effect
  // (rather than from inside the GenerateContext) keeps the storage
  // dependency at the UI layer — Generate's worker code doesn't need
  // to know IndexedDB exists.
  //
  // `savedResultRef` tracks the result reference we've already
  // persisted so a re-render (or a language switch that resets
  // `sample`) doesn't re-save the same font and double-fill the
  // 5-slot cache.
  const savedResultRef = useRef<unknown>(null);
  useEffect(() => {
    if (!result) return;
    if (savedResultRef.current === result) return;
    savedResultRef.current = result;
    (async () => {
      try {
        const ttfBytes = new Uint8Array(await result.ttfBlob.arrayBuffer());
        const woffBytes = new Uint8Array(await result.woffBlob.arrayBuffer());
        const fontFamily = params.familyName || "wingfont";
        const displayName = fontFamily;
        await saveRecentFont({
          displayName,
          fontFamily,
          config: {
            baseFontName: baseFont.name || undefined,
            annoFontName: annoFont.name || undefined,
            mappingName: mappingsPresetKey || undefined,
            annoScale: params.annoScale,
          },
          ttfBytes,
          woffBytes,
        });
      } catch (err) {
        // Caching is a nice-to-have — don't break the download flow
        // if storage fails (quota, private browsing, etc.).
        console.warn("[Step5] failed to save font to recents:", err);
      }
    })();
  }, [
    result,
    params.familyName,
    params.annoScale,
    baseFont.name,
    annoFont.name,
    mappingsPresetKey,
    saveRecentFont,
  ]);

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

  // Resolve the family name once for both the @font-face declaration and
  // the usage example. Falls back to the file basename if the user blanked
  // the field — that's what the worker would default to too.
  const cssFamilyName = params.familyName || "wingfont";
  // Build a multi-source @font-face. Order matters: browsers walk the src
  // list and pick the first format they support, so WOFF goes before TTF
  // — modern browsers grab the smaller WOFF, older fallbacks land on TTF.
  // `font-display: swap` prevents the FOIT (flash-of-invisible-text)
  // gap while the font streams.
  const cssSnippet = [
    `@font-face {`,
    `  font-family: '${cssFamilyName}';`,
    `  src: url('${baseName}.woff') format('woff'),`,
    `       url('${baseName}.ttf') format('truetype');`,
    `  font-display: swap;`,
    `}`,
    ``,
    `.your-class {`,
    `  font-family: '${cssFamilyName}', sans-serif;`,
    `}`,
  ].join("\n");

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet);
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts (rare). The user
      // can still select-and-copy manually, so it's not worth surfacing.
    }
  };

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
        {/*
          "How to embed" — opens a Dialog with the @font-face snippet
          + copy button. Text-variant so it visually de-emphasises
          itself against the primary/outlined download buttons: this
          is a help affordance, not a primary action. Sits in the
          same Stack so it wraps cleanly on narrow viewports.
        */}
        <Button
          variant="text"
          color="primary"
          startIcon={<Code />}
          onClick={() => setSnippetDialogOpen(true)}
        >
          {t("step5.cssSnippet.button")}
        </Button>
      </Stack>

      {/*
        CSS snippet Dialog. Opt-in: zero vertical space when closed,
        a focused modal when the user wants the embed code. Width
        capped at sm so the snippet doesn't sprawl on wide screens
        but the code block can still scroll horizontally if a very
        long family name overflows.
      */}
      <Dialog
        open={snippetDialogOpen}
        onClose={() => setSnippetDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          {t("step5.cssSnippet.title")}
          <Tooltip
            title={
              snippetCopied
                ? t("step5.cssSnippet.copied")
                : t("step5.cssSnippet.copy")
            }
            arrow
          >
            <IconButton size="small" onClick={copySnippet}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            // `pre` so newlines + leading spaces survive; `overflowX: auto`
            // so a long family name scrolls inside the block rather than
            // forcing the dialog wider. Monospace + action.hover gives the
            // "this is code, you can copy it" affordance without a
            // syntax-highlighter dependency.
            sx={{
              m: 0,
              p: { xs: 1, sm: 1.5 },
              bgcolor: "action.hover",
              borderRadius: 1,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: { xs: 12, sm: 13 },
              lineHeight: 1.5,
              whiteSpace: "pre",
              overflowX: "auto",
              color: "text.primary",
            }}
          >
            {cssSnippet}
          </Box>
          {/*
            File-placement hint. Markdown lets translators bold the
            "same folder" recommendation and inline-code the file
            extensions — both meaningfully easier to scan than a
            wall of plain caption text. Wrapped in mt sx so the
            block sits exactly where the old <Typography> did.
          */}
          <Box sx={{ mt: 1.5 }}>
            <Markdown variant="compact">
              {t("step5.cssSnippet.hint")}
            </Markdown>
          </Box>
          {/*
            Design-app note. Distinct from the CSS hint above because
            it applies to a totally different deployment surface
            (Canva, InDesign, Word, etc. — where the font is uploaded
            as a desktop font, not @font-face'd). Surfaced here
            because Step 5 is the moment users decide what to do with
            the file they just downloaded; both CSS and design-app
            usage start from the same TTF/WOFF.

            The note exists because design tools default the
            "Ligatures" toggle OFF and our digit-trigger / 丅+numeral
            overrides ride on liga. Without enabling it the user sees
            字1 render as "字 then 1" rather than the variant glyph —
            looks like a bug but is just a one-time setting flip.
          */}
          <Divider sx={{ my: 2 }} />
          <Typography
            variant="subtitle2"
            sx={{ display: "block", mb: 0.5 }}
          >
            {t("step5.cssSnippet.designAppTitle")}
          </Typography>
          {/*
            Design-app rule list. Markdown lets us bold each
            override-path category ("word-context", "digit-suffix",
            "trigger+numeral") and the supported-app names so a
            user skimming the dialog spots the relevant bit
            immediately rather than reading the whole sentence.
          */}
          <Markdown variant="compact">
            {t("step5.cssSnippet.designAppHint")}
          </Markdown>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnippetDialogOpen(false)}>
            {t("step5.cssSnippet.close")}
          </Button>
        </DialogActions>
      </Dialog>

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
