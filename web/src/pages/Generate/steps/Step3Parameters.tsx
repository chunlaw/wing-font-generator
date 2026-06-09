/**
 * Step 3 — generation parameters.
 *
 * Same controls the original flat Generate.tsx had, just isolated into
 * its own step. Sliders are wired to GenerateContext so changes persist
 * even if the user navigates away and back.
 */
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { GenerateParams } from "../types";

const Step3Parameters = () => {
  const { t } = useTranslation();
  const {
    params,
    setParam,
    mappings,
    isPreviewing,
    previewResult,
    previewStatus,
    previewError,
    previewText,
    setPreviewText,
    runtimeReady,
  } = useGenerate();

  // The auto-trigger in GenerateContext fires whenever the user is on
  // Step 3 and any input changes (debounced). Locally we just need to
  // decide which of {empty / loading / result / error} to render. The
  // "previewBlocked" flag covers the cases where no run will ever
  // fire — no mappings, runtime not ready — so the UI can offer a
  // helpful prompt instead of an indefinite spinner.
  const previewBlocked = mappings.length === 0 || !runtimeReady;

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h6">{t("step3.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step3.description")}
        </Typography>
      </Box>

      {/* ----------------------------------------------------------------
        Two-column layout: preview anchors on the LEFT on desktop while
        the user tunes parameters on the RIGHT. On mobile we stack
        vertically with parameters on top so the user can adjust
        without scrolling past an initially-empty preview pane.

        Implementation note — we use `row-reverse` rather than reordering
        the JSX so the natural DOM/source order (params, then preview)
        is preserved. That keeps the screen-reader reading order tied
        to the user's primary task (set parameters) while letting the
        visual emphasis on desktop go to the preview output.
      ----------------------------------------------------------------- */}
      <Stack
        direction={{ xs: "column", md: "row-reverse" }}
        spacing={{ xs: 3, md: 4 }}
        alignItems={{ xs: "stretch", md: "flex-start" }}
      >
        {/* ---- Parameters column (right on desktop, top on mobile) -- */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: { xs: "100%", md: "auto" },
          }}
        >
          {/*
            Preview text — controls what the live preview pane on
            the left renders. Empty (placeholder visible) means
            "auto-pick the longest mapping row". A non-empty value
            renders exactly the user's text, using whichever
            mappings happen to fully match it. Sits at the top of
            the params column with a Divider below because it's
            adjacent in purpose to the preview (which is on the
            LEFT on desktop) but lives here so the user finds it
            alongside the other "things to tweak".
          */}
          <Box>
            <TextField
              label={t("step3.previewText.label")}
              placeholder={t("step3.previewText.placeholder")}
              helperText={t("step3.previewText.helper")}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              fullWidth
              // slotProps over deprecated `inputProps` for MUI 6.
              slotProps={{ htmlInput: { maxLength: 40 } }}
            />
          </Box>

          <Divider flexItem />

          <TextField
            label={t("step3.family")}
            helperText={t("step3.familyHint")}
            value={params.familyName}
            onChange={(e) => setParam("familyName", e.target.value)}
            fullWidth
          />

          <LabeledSlider
            label={t("step3.baseScale")}
            value={params.baseScale}
            min={0.3}
            max={1}
            step={0.01}
            onChange={(v) => setParam("baseScale", v)}
          />
          <LabeledSlider
            label={t("step3.annoScale")}
            value={params.annoScale}
            min={0.05}
            max={0.35}
            step={0.01}
            onChange={(v) => setParam("annoScale", v)}
          />
          <LabeledSlider
            label={t("step3.yOffset")}
            value={params.yOffsetRatio}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setParam("yOffsetRatio", v)}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={params.invert}
                  onChange={(e) => setParam("invert", e.target.checked)}
                />
              }
              label={t("step3.invert")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={params.optimize}
                  onChange={(e) => setParam("optimize", e.target.checked)}
                />
              }
              label={t("step3.optimize")}
            />
          </Stack>
        </Box>

        {/* ---- Preview column (left on desktop, bottom on mobile) --- */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: { xs: "100%", md: "auto" },
            // On desktop the preview card stays in view as the user
            // tweaks sliders to its right. Sticky positioning lifts it
            // along with the scroll so it never drops off-screen when
            // the params column is taller. Disabled on mobile where
            // the layout is column-stacked.
            position: { md: "sticky" },
            top: { md: 16 },
          }}
        >
          <Card variant="outlined">
            <CardContent>
          {/* Header row: title + tagline on the left, a small
              spinner on the right while a preview is in flight. The
              spinner is the only visual indication that a refresh is
              happening; the old preview stays visible below so the
              UI never flashes empty during an update. */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t("step3.preview.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("step3.preview.description")}
              </Typography>
            </Box>
            {/* The spinner reserves layout space even when not
                spinning (via visibility: hidden) so the title
                doesn't jump horizontally on every state change. */}
            <CircularProgress
              size={20}
              thickness={5}
              sx={{
                flexShrink: 0,
                visibility: isPreviewing ? "visible" : "hidden",
              }}
              aria-label={t("step3.preview.updating")}
            />
          </Stack>

          {/* "Not ready" helper — shown only when there's nothing to
              preview yet (no mappings or runtime still booting) AND
              we don't have a stale result to keep displaying. */}
          {previewBlocked && !previewResult && !isPreviewing && (
            <Typography variant="caption" color="text.secondary">
              {t("step3.preview.notReady")}
            </Typography>
          )}

          {previewError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {previewError}
            </Alert>
          )}

          {previewResult && (
            <Box
              sx={{
                mt: 1,
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(15, 23, 42, 0.02)"
                    : "rgba(255, 255, 255, 0.04)",
                border: 1,
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              {/*
                Container-query wrapper around the glyph render. Sets
                this Box up as a size-query container so the inner
                Typography can use `cqw` units (1cqw = 1% of THIS
                box's content width) instead of `vw` (% of viewport).
                Viewport-based sizing was wrong for the new two-column
                layout: the preview card on desktop is ~50% of the
                viewport, so 12vw was twice the glyph size it should
                have been. With cqw, the glyph fits the actual pane.
              */}
              <Box
                sx={{
                  containerType: "inline-size",
                  // Without an explicit name the inner cqw still
                  // resolves against the nearest container, but
                  // naming it documents intent.
                  containerName: "wingfont-preview",
                  mb: 2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: `"${previewResult.installedFamily}", serif`,
                    // The chars should fill ~75 % of the preview-pane
                    // width regardless of how many of them there are.
                    // For N chars, each one wants width = 75/N % of the
                    // container; for square CJK glyphs that's also the
                    // approximate font-size. Clamp at 48 px floor so a
                    // long phrase stays readable and 144 px ceiling so
                    // a single char doesn't fill the whole card.
                    //
                    // sampleText.length is at least 1 (an empty
                    // result would never have been set) but we guard
                    // against div-by-zero just in case.
                    fontSize: (() => {
                      const n = Math.max(
                        1,
                        previewResult.sampleText.length,
                      );
                      return `clamp(48px, ${75 / n}cqw, 144px)`;
                    })(),
                    lineHeight: 1.2,
                    // Defeat the line-break-mid-ligature problem that
                    // Step 5 also handles — annotated chars should
                    // never split across lines.
                    overflowWrap: "normal",
                    wordBreak: "keep-all",
                  }}
                >
                  {previewResult.sampleText}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {previewResult.isCustomText ? (
                  <>
                    {t("step3.preview.customLabel")}:{" "}
                    <Box
                      component="span"
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {previewResult.sampleText}
                    </Box>
                  </>
                ) : (
                  <>
                    {t("step3.preview.sampledLabel")}:{" "}
                    <Box
                      component="span"
                      sx={{ fontFamily: "monospace", fontWeight: 600 }}
                    >
                      {previewResult.sampleRows[0]?.chars} → {previewResult.sampleRows[0]?.annos}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
          )}

          {/*
            Status line — lives UNDER the preview container so the
            "Processing X..." chatter doesn't push the rendered glyph
            around as it cycles between sub-steps. Shown only while a
            preview is in flight and we have a status string to
            print; the small spinner in the card header already
            communicates "a refresh is happening" on its own.
          */}
          {isPreviewing && previewStatus && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                mt: 2,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {previewStatus}
            </Typography>
          )}

          {/* Loading placeholder for the FIRST preview run (no
              result yet). On subsequent updates we keep the old
              result visible and only signal via the header spinner. */}
          {isPreviewing && !previewResult && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
                gap: 2,
              }}
            >
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                {t("step3.preview.firstRun")}
              </Typography>
            </Box>
          )}

          {/* True idle state — nothing running, nothing rendered,
              everything ready. The auto-trigger will fire shortly,
              so this only flashes briefly; mostly a fallback. */}
          {!previewResult &&
            !isPreviewing &&
            !previewError &&
            !previewBlocked && (
              <Typography variant="body2" color="text.secondary">
                {t("step3.preview.idle")}
              </Typography>
            )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

interface LabeledSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const LabeledSlider = ({ label, value, onChange, min, max, step }: LabeledSliderProps) => {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}: {value.toFixed(2)}
      </Typography>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(Array.isArray(v) ? v[0] : v)}
        valueLabelDisplay="auto"
      />
    </Box>
  );
};

// Re-export the type so step files can be self-contained imports.
export type { GenerateParams };
export default Step3Parameters;
