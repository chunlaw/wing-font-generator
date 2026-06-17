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
  IconButton,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import opentype from "opentype.js";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useRecentFonts } from "../../../RecentFontsContext";
import { GenerateParams } from "../types";
import { dirForText, isRtlText } from "../../../utils/textDirection";
import { buildCliCommand } from "../../../utils/buildCliCommand";

// Maximum length of a Windows GDI LOGFONT.lfFaceName — 32 bytes
// including null terminator, so 31 effective characters. Family
// names over this limit install on Windows fine but get silently
// truncated in Word's font registry, breaking the per-codepoint
// font-fallback path so HKSCS-extension Cantonese characters (啲 嘅
// 嗰 噉 嚟 咗 唔 攞) end up rendered in Microsoft JhengHei UI
// instead of the user's font. Mirrors the same constant in
// python/wing-font.py — the Python pipeline hard-fails any family
// name that overflows, so surfacing it here saves the user a
// multi-minute round-trip just to discover the limit.
const LF_FACESIZE_LIMIT = 31;

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
    baseFont,
    annoFont,
    mappingsPresetKey,
  } = useGenerate();

  // ── Family-name collision detector ─────────────────────────────
  // If the user has already saved a generation with this family
  // name to IndexedDB, render a non-blocking info Alert. Two fonts
  // with identical family names work fine in CSS @font-face (we
  // register each under a unique opaque id) and in IndexedDB (each
  // gets a unique entry id), but they collide at the OS level when
  // the user downloads BOTH and installs them in Font Book /
  // Windows Fonts / Word — those treat "family name" as the
  // identity. The hint sets expectations so the user can choose a
  // distinct name BEFORE generating, when the choice is still
  // cheap. Case-insensitive comparison because OS font lookups are
  // case-insensitive (macOS Font Book matches "myfont" and
  // "MyFont" as the same font).
  const { entries: recentFontEntries } = useRecentFonts();
  // Family-name length overflow — see LF_FACESIZE_LIMIT comment at
  // module top for why this matters (silent Word HKSCS breakage).
  // We surface the count proactively whenever the user gets close
  // so they have a chance to shorten before hitting the cap.
  const familyLen = params.familyName?.length ?? 0;
  const familyTooLong = familyLen > LF_FACESIZE_LIMIT;
  const familyApproachingLimit = familyLen >= LF_FACESIZE_LIMIT - 5;
  const hasFamilyCollision = (() => {
    const typed = params.familyName?.trim().toLowerCase();
    if (!typed) return false;
    return recentFontEntries.some(
      (e) => e.fontFamily.trim().toLowerCase() === typed,
    );
  })();

  // The auto-trigger in GenerateContext fires whenever the user is on
  // Step 3 and any input changes (debounced). Locally we just need to
  // decide which of {empty / loading / result / error} to render. The
  // "previewBlocked" flag covers the cases where no run will ever
  // fire — no mappings, runtime not ready — so the UI can offer a
  // helpful prompt instead of an indefinite spinner.
  const previewBlocked = mappings.length === 0 || !runtimeReady;

  // ── Typographic guide overlay ────────────────────────────────
  //
  // When `showGuides` is on, we swap the HTML <Typography>
  // preview for an SVG-rendered version with horizontal lines
  // drawn at the font's actual metric positions (ascent, cap,
  // x-height, baseline, descent). The metrics come from parsing
  // the preview WOFF with opentype.js. CJK fonts often leave
  // sCapHeight / sxHeight at 0 — those lines are simply skipped
  // when the value is unset rather than guessed.
  const [showGuides, setShowGuides] = useState(false);
  const [previewMetrics, setPreviewMetrics] =
    useState<PreviewFontMetrics | null>(null);

  // ── Equivalent CLI command ──────────────────────────────────────
  //
  // Mirrors what runner.py / wingfont_main.main() is about to do, in
  // the canonical `python wing-font.py …` shape. Two value-adds:
  //   * users with the repo checked out can copy + paste to reproduce
  //     the in-browser build locally (handy for very large mappings
  //     where Pyodide may run out of memory; the CPython path has
  //     much more headroom);
  //   * surfaces every dial as a flag so users can see at a glance
  //     what their slider tweaks translate to.
  //
  // The string is also printed by wing-font.py's main() at the top
  // of the Step 4 log, but that's AFTER they click Generate. Showing
  // it here lets them sanity-check parameters before committing to a
  // multi-minute run.
  const cliCommand = useMemo(
    () =>
      buildCliCommand({
        baseFontName: baseFont.name,
        annoFontName: annoFont.name,
        mappingPresetKey: mappingsPresetKey,
        params,
        baseAxisLocation: baseFont.axisLocation,
        annoAxisLocation: annoFont.axisLocation,
      }),
    [
      baseFont.name,
      baseFont.axisLocation,
      annoFont.name,
      annoFont.axisLocation,
      mappingsPresetKey,
      params,
    ],
  );

  // Two-second "Copied!" affordance on the copy button. Uses a
  // single state value (the ms timestamp of the last successful copy)
  // rather than a boolean so consecutive copies always re-fire the
  // animation, even if the user clicks before the previous cycle
  // ended.
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const justCopied = copiedAt !== null && Date.now() - copiedAt < 2000;
  useEffect(() => {
    if (copiedAt === null) return;
    const timer = window.setTimeout(() => setCopiedAt(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedAt]);
  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliCommand);
      setCopiedAt(Date.now());
    } catch {
      // Older browsers without async clipboard API silently fail —
      // the command is still selectable for manual copy from the
      // <pre> block.
    }
  };

  useEffect(() => {
    setPreviewMetrics(null);
    if (!previewResult) return;
    let cancelled = false;
    previewResult.woffBlob
      .arrayBuffer()
      .then((buf) => {
        if (cancelled) return;
        try {
          // opentype.parse copies the bytes, so we don't need to
          // worry about the WOFF blob being mutated.
          const f = opentype.parse(buf);
          const os2 = f.tables.os2 as
            | { sCapHeight?: number; sxHeight?: number }
            | undefined;
          setPreviewMetrics({
            unitsPerEm: f.unitsPerEm,
            // opentype.js normalises typo ascender/descender on
            // .ascender / .descender (descender is negative).
            ascender: f.ascender,
            descender: f.descender,
            capHeight: os2?.sCapHeight ?? 0,
            xHeight: os2?.sxHeight ?? 0,
          });
        } catch {
          // Parsing failure means we can't draw guides; leave
          // metrics null so the guide UI silently falls back to
          // hiding when the toggle is on.
        }
      })
      .catch(() => {
        // Same — the toggle stays clickable but the SVG render
        // doesn't get the metric data it needs.
      });
    return () => {
      cancelled = true;
    };
  }, [previewResult]);

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
            // helperText shape:
            //   * over limit  → red error + "N / 31 — too long, …"
            //   * 26-31 chars → neutral hint + " (N / 31)" counter
            //   * 0-25 chars  → plain hint
            // The counter appears proactively in the warning zone so
            // a paste that lands at exactly 31 doesn't look mysterious
            // (the user sees how close they are to the cap).
            helperText={
              familyTooLong
                ? t("step3.family.tooLong")
                    .replace("{n}", String(familyLen))
                    .replace("{max}", String(LF_FACESIZE_LIMIT))
                : familyApproachingLimit
                  ? `${t("step3.familyHint")}  (${familyLen} / ${LF_FACESIZE_LIMIT})`
                  : t("step3.familyHint")
            }
            error={familyTooLong}
            value={params.familyName}
            onChange={(e) => setParam("familyName", e.target.value)}
            fullWidth
          />
          {/*
            Collision hint. Non-blocking info Alert that fires when
            the typed family name matches an existing IndexedDB
            entry's fontFamily. Lives immediately under the
            TextField so the user reads the warning while still
            looking at the field they'd want to edit. severity=info
            (not warning) because there's nothing actually broken —
            it's just a recommendation. variant="outlined" keeps it
            visually softer than a filled alert.
          */}
          {hasFamilyCollision && (
            <Alert severity="info" variant="outlined" sx={{ mt: -1 }}>
              {t("step3.family.collisionHint")}
            </Alert>
          )}

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
            label={t("step3.annoSpacing")}
            value={params.annoSpacing}
            min={-0.02}
            max={0.15}
            step={0.005}
            onChange={(v) => setParam("annoSpacing", v)}
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

          {/*
            Advanced section — currently just the trigger-character
            override. Visually separated by a Divider + small section
            label so users glancing at Step 3 immediately understand
            that everything ABOVE is day-to-day visual params, and
            everything BELOW is opt-in customisation they probably
            don't need to touch.

            Trigger-character TextField:
            - `maxLength: 2` on the input limits typing to 2 UTF-16
              code units (exactly one BMP char or one surrogate pair).
            - `onChange` normalises via `[...v][0]` (spread-iterator
              grapheme split) so any multi-codepoint paste collapses
              to the first codepoint silently — matches how the Python
              pipeline reads the value via cmap lookup.
            - Empty string is allowed and flips the helperText to
              explain the trigger+numeral path is now disabled (the
              universal digit-suffix path still works).
            - Width capped at 220px — a single-character input field
              at fullWidth looks absurd.
          */}
          <Divider flexItem sx={{ mt: 1 }} />
          <Typography variant="overline" color="text.secondary" sx={{ mt: -1 }}>
            {t("step3.advancedSectionLabel")}
          </Typography>
          <TextField
            label={t("step3.triggerChar.label")}
            helperText={
              params.triggerChar === ""
                ? t("step3.triggerChar.hintDisabled")
                : t("step3.triggerChar.hint")
            }
            value={params.triggerChar}
            onChange={(e) => {
              const v = e.target.value;
              const normalised = v === "" ? "" : ([...v][0] ?? "");
              setParam("triggerChar", normalised);
            }}
            slotProps={{ htmlInput: { maxLength: 2 } }}
            sx={{ maxWidth: 220 }}
          />
          {/*
            Output-ascent control — the in-browser counterpart of
            wing-font.py's --out-ascent CLI flag. Empty input is the
            default and maps to out_ascent=null, which the Python
            pipeline now treats as "auto": it measures the tallest
            composed glyph's ink and raises hhea.ascent +
            OS/2.usWinAscent just enough to clear it (sTypoAscender
            untouched), so annotations aren't clipped on low-ascent
            bases without anyone picking a number. A numeric value
            pins an exact ascent and disables auto-fit — only needed
            for a deliberately roomier line height (historically 1200
            for Thai/Katakana/Korean, 1300 for Urdu Nastaliq).

            We type the input as plain text rather than `type=number`
            so an empty value is unambiguous (number inputs coerce ""
            to 0 in some browsers, which would unhelpfully change the
            semantic). The parse path treats "" → null (auto) and
            any other value → Number with a 0/NaN reject.
          */}
          <TextField
            label={t("step3.outAscent.label")}
            helperText={t("step3.outAscent.hint")}
            value={params.outAscent === null ? "" : String(params.outAscent)}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === "") {
                setParam("outAscent", null);
                return;
              }
              const n = Number(v);
              // Refuse non-positive integers — ascent has to be
              // above the baseline. Silently ignore invalid input
              // so the user can keep typing without the field
              // resetting mid-keystroke; the helper text covers the
              // valid-range guidance.
              if (Number.isFinite(n) && n > 0) {
                setParam("outAscent", Math.round(n));
              }
            }}
            slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
            sx={{ maxWidth: 220 }}
          />

          {/*
            ── Equivalent CLI command ───────────────────────────────
            Shows what the build is about to run as a copy-paste-
            ready `python wing-font.py …` invocation. Useful for:
            (a) sanity-checking the cumulative effect of slider /
                checkbox tweaks before kicking off the multi-minute
                build, and (b) escape-hatch for users who hit
                Pyodide memory limits on very large mappings — the
                CPython path has much more headroom.

            Same string is printed at the top of the Step 4 log by
            wing-font.py's main(), but only AFTER the user clicks
            Generate. Surfacing it here lets users review FIRST.

            The block lives under its own Divider + overline so it
            visually groups with the other "things to copy" rather
            than the sliders above. The file paths use placeholder
            prefixes (input_fonts/, mappings/) matching the repo
            layout — users substitute their actual local paths.
          */}
          <Divider flexItem sx={{ mt: 1 }} />
          <Typography variant="overline" color="text.secondary" sx={{ mt: -1 }}>
            {t("step3.cli.sectionLabel")}
          </Typography>
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(15, 23, 42, 0.04)"
                    : "rgba(255, 255, 255, 0.06)",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Box
                component="pre"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  m: 0,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                  // Wrap long commands rather than horizontal-
                  // scrolling — the user is reading, not editing.
                  // `break-word` is safer than `break-all` because
                  // `break-all` would split inside option names
                  // (e.g. `--anno-spacing` → `--anno-spaci\ng`).
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "text.primary",
                }}
              >
                {cliCommand}
              </Box>
              <Tooltip
                title={
                  justCopied
                    ? t("step3.cli.copiedTooltip")
                    : t("step3.cli.copyTooltip")
                }
                placement="top"
              >
                <IconButton
                  size="small"
                  onClick={handleCopyCli}
                  aria-label={t("step3.cli.copyAriaLabel")}
                  sx={{ flexShrink: 0 }}
                >
                  {justCopied ? (
                    <CheckIcon fontSize="small" color="success" />
                  ) : (
                    <ContentCopyIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              {t("step3.cli.helperText")}
            </Typography>
          </Box>
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
                {showGuides && previewMetrics ? (
                  <PreviewWithGuides
                    family={previewResult.installedFamily}
                    text={previewResult.sampleText}
                    metrics={previewMetrics}
                  />
                ) : (
                  <Typography
                    // RTL base scripts (Arabic / Hebrew …) render
                    // right-to-left so the annotation triggers stay
                    // attached to their base glyph in the correct
                    // visual order. LTR for CJK / Latin samples.
                    dir={dirForText(previewResult.sampleText)}
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
                )}
              </Box>
              {/*
                `display: block` is required: <Typography
                variant="caption"> defaults to <span> (inline), and
                the FormControlLabel below is inline-block. When the
                caption is short enough to fit (e.g. Chinese
                "樣本字詞: 我 → ngo5"), the toggle ends up rendered on
                the same row. Forcing block guarantees the two stay
                on separate rows regardless of language / viewport.
              */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
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

              {/*
                Guides toggle. Disabled when we couldn't parse the
                font's metrics (very rare with valid TTFs). Sits just
                under the caption so it doesn't push the rendered
                glyph around. Local state — no need to persist across
                navigations.
              */}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                    disabled={!previewMetrics}
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary">
                    {t("step3.preview.showGuides")}
                  </Typography>
                }
                sx={{ mt: 1, ml: 0, "& .MuiFormControlLabel-label": { ml: 0.5 } }}
              />
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

/**
 * Subset of font metrics we use to draw the typographic guides
 * overlay. All values are in font units (i.e. fractions of
 * `unitsPerEm`). `capHeight` / `xHeight` may be 0 if the font's
 * OS/2 table doesn't declare them (common in CJK fonts) — the
 * SVG component below skips drawing those lines when the value
 * is 0.
 */
interface PreviewFontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number; // negative
  capHeight: number; // 0 when undefined in OS/2
  xHeight: number; // 0 when undefined in OS/2
}

interface PreviewWithGuidesProps {
  family: string;
  text: string;
  metrics: PreviewFontMetrics;
}

/**
 * SVG-rendered preview with horizontal guide lines drawn at the
 * font's metric positions. Used in place of the default <Typography>
 * preview when the user toggles "Show guides" on.
 *
 * Why SVG and not an overlay on the HTML preview:
 *   Computing where the baseline lives inside a CSS line-box at
 *   line-height: 1.2 requires per-browser baseline-math fiddling.
 *   SVG's coordinate system is explicit — we put the baseline at a
 *   known y and compute ascent/descent offsets from font metrics
 *   directly. Same browser font engine, so the rendered glyphs look
 *   identical to the HTML path; only the host changes.
 *
 * Coordinate system:
 *   Each em is 100 SVG units. viewBox width = 100 × N (so each char
 *   has nominally 1 em of horizontal room), height = 160 (room for
 *   ascender above + descender below baseline; tuned for typical
 *   font ratios of ~0.9 ascent + ~0.2 descent). SVG width: 100%
 *   makes the whole thing scale to fit the parent container the
 *   same way the HTML preview does.
 */
const PreviewWithGuides = ({
  family,
  text,
  metrics,
}: PreviewWithGuidesProps) => {
  // Resolve the rendered glyph's fill colour explicitly from the
  // MUI theme rather than relying on `currentColor`. SVG's
  // `currentColor` keyword requires the SVG to actually inherit a
  // `color` value from CSS, which can fail in subtle ways depending
  // on where the SVG is mounted in the tree. Reading
  // `palette.text.primary` here gives us a concrete hex value that
  // mirrors what the surrounding <Typography> would have used
  // (near-black in light mode, near-white in dark mode), so the
  // glyph contrast matches the HTML preview exactly.
  const muiTheme = useTheme();
  const glyphColor = muiTheme.palette.text.primary;

  const EM = 100; // SVG units per em
  // Vertical breathing room above the ascender and below the
  // descender. Without these pads the ascent line sits at y=0 for
  // most fonts and its "Ascent" label bumps against the Card's
  // top border. With them, both lines (and their labels) have
  // some clear space inside the SVG.
  const TOP_PAD = 20;
  const BOTTOM_PAD = 20;
  // Baseline is one em down from the (now padded) top so the
  // ascender area equals 1 em.
  const BASELINE_Y = TOP_PAD + EM;
  // Total height: top pad + 1 em above baseline + 0.6 em below for
  // descender + bottom pad. 0.6 em is a comfortable upper bound on
  // descender depth for typical CJK + Latin fonts (descenders
  // usually go ~0.15–0.25 em below baseline).
  const VIEW_HEIGHT = BASELINE_Y + EM * 0.6 + BOTTOM_PAD;
  const n = Math.max(1, text.length);
  // The glyphs occupy the left portion of the viewBox at 1em per
  // char. We then add a right-side gutter for the guide-line labels
  // ("Ascent", "Baseline", etc.) so they don't get drawn ON TOP OF
  // the rightmost glyph — that's the bug that prompted this change.
  // 70 SVG units ≈ 0.7em which comfortably fits the widest label
  // ("x-height") at the label font-size of 7 units.
  const GLYPH_AREA_WIDTH = EM * n;
  const LABEL_GUTTER = 70;
  const VIEW_WIDTH = GLYPH_AREA_WIDTH + LABEL_GUTTER;

  // Convert metric values (in font units) to SVG units. unitsPerEm
  // → EM gives us the scale factor.
  const ascentSvg = (metrics.ascender / metrics.unitsPerEm) * EM;
  // descender is negative in font-units terms; flip sign so we
  // can add it downwards from baseline below.
  const descentSvg = (-metrics.descender / metrics.unitsPerEm) * EM;
  const capSvg = (metrics.capHeight / metrics.unitsPerEm) * EM;
  const xSvg = (metrics.xHeight / metrics.unitsPerEm) * EM;

  // Build the lines we actually draw. Each entry is gated on the
  // metric being non-zero so CJK fonts (which often leave
  // sCapHeight + sxHeight at 0) don't end up with two extra lines
  // crammed against the baseline.
  //
  // Labels are intentionally hard-coded in English here regardless
  // of the UI's current locale. These are typographic terms of art
  // — "Baseline" / "Ascent" / "Descent" / "Cap" / "x-height" — and
  // translating them risks confusion (e.g. translating "Cap" to a
  // word that doesn't map back to the OS/2 metric name). They also
  // act as legend-style annotations rather than UI copy, which is
  // a common convention to leave untranslated.
  type Guide = { y: number; label: string; color: string };
  const guides: Guide[] = [
    {
      y: BASELINE_Y - ascentSvg,
      label: "Ascent",
      color: "#dc2626", // red-600
    },
    ...(capSvg > 0
      ? [
          {
            y: BASELINE_Y - capSvg,
            label: "Cap",
            color: "#ea580c", // orange-600
          },
        ]
      : []),
    ...(xSvg > 0
      ? [
          {
            y: BASELINE_Y - xSvg,
            label: "x-height",
            color: "#16a34a", // green-600
          },
        ]
      : []),
    {
      y: BASELINE_Y,
      label: "Baseline",
      color: "#2563eb", // blue-600
    },
    {
      y: BASELINE_Y + descentSvg,
      label: "Descent",
      color: "#9333ea", // purple-600
    },
  ];

  // Label font-size in SVG units. Roughly 8 units = ~5 % of an
  // em, which renders as comfortable caption text at any final
  // display size because the SVG scales as a whole.
  const LABEL_FONT_SIZE = 7;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        // Fill the available container width. The viewBox aspect
        // ratio determines the resulting height. We deliberately
        // dropped the earlier `maxHeight` cap because it was making
        // the SVG visibly smaller than the surrounding card on wide
        // screens, which forced the labels (anchored to the
        // viewBox's right edge) into the same horizontal range as
        // the glyphs. Letting the SVG fill the container — combined
        // with the LABEL_GUTTER reserved inside the viewBox — gives
        // labels their own real estate to live in.
        width: "100%",
        height: "auto",
        overflow: "visible",
      }}
    >
      {/* Guide lines */}
      {guides.map((g) => (
        <g key={g.label} opacity={0.7}>
          <line
            x1={0}
            y1={g.y}
            x2={VIEW_WIDTH}
            y2={g.y}
            stroke={g.color}
            strokeWidth={0.6}
            strokeDasharray="3 2"
          />
          <text
            x={VIEW_WIDTH - 1}
            y={g.y - 1}
            fontSize={LABEL_FONT_SIZE}
            textAnchor="end"
            fill={g.color}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* The actual glyph render. `dominantBaseline=alphabetic`
          places y on the baseline. font-size in SVG units = EM,
          which matches our 1-em-per-100-units assumption.
          `fill={glyphColor}` resolves the dark/light theme colour
          from the MUI palette directly; `stroke="none"` is
          explicit (even though it's the SVG default) because
          `stroke="white"` lives on the label `<text>` elements
          above and we want it unambiguous that the glyph carries
          no stroke contour. */}
      <text
        // Centre the glyphs in the GLYPH AREA — the left portion
        // of the viewBox. Using VIEW_WIDTH/2 would centre on the
        // viewBox midpoint, which is offset by half the
        // LABEL_GUTTER and visibly drifts the glyphs leftward.
        x={GLYPH_AREA_WIDTH / 2}
        y={BASELINE_Y}
        fontFamily={`"${family}", serif`}
        fontSize={EM}
        textAnchor="middle"
        dominantBaseline="alphabetic"
        // Mark the run RTL for Arabic / Hebrew bases so the guides
        // preview matches the HTML preview's ordering and joining.
        direction={isRtlText(text) ? "rtl" : "ltr"}
        fill={glyphColor}
        stroke="none"
      >
        {text}
      </text>
    </svg>
  );
};

// Re-export the type so step files can be self-contained imports.
export type { GenerateParams };
export default Step3Parameters;
