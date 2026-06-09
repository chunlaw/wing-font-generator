/**
 * Step 4 — generation log + Generate button.
 *
 * Shows the streaming output from the Pyodide pipeline. The Generate
 * button lives here (not in the stepper footer) because the action
 * naturally belongs to the log step: "press this to start, watch
 * output appear here." On success the context auto-advances to Step 5.
 */
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";

const Step4Log = () => {
  const { t } = useTranslation();
  const {
    progressLog,
    progress,
    currentProcessingStep,
    isGenerating,
    error,
    runtimeReady,
    runtimeStatus,
    generate,
  } = useGenerate();

  const logRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to the latest line so the user sees the live feed
  // without manually scrolling.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progressLog]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(progressLog.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts (rare). Silently
      // ignore — copy is a non-critical convenience.
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box>
        <Typography variant="h6">{t("step4.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step4.description")}
        </Typography>
      </Box>

      <Alert severity={runtimeReady ? "success" : "info"} variant="outlined">
        {runtimeReady
          ? t("generate.runtime.ready")
          : `${t("generate.runtime.loading")}${runtimeStatus}`}
      </Alert>

      <Stack direction="row" spacing={2} alignItems="center">
        {/*
          Progress-button: while generating, the button background
          fills left-to-right via a ::before pseudo-element whose
          width tracks the `progress` value, and the label updates
          to include the live percentage. The fill itself IS the
          activity indicator — no spinner icon — and the percentage
          floats above the fill via z-index.

          The separate LinearProgress that used to sit below this
          row was removed; the button now carries the bar, freeing
          vertical space and tying the "is it moving?" feedback to
          the action the user just took.
        */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={generate}
          disabled={isGenerating}
          sx={{
            position: "relative",
            overflow: "hidden",
            // Wide enough that the label doesn't reflow when the
            // percentage rolls past two digits.
            minWidth: 200,
            // Keep full visual weight while disabled — the fill is
            // the cue that work is happening, not a faded button.
            "&.Mui-disabled": {
              color: "primary.contrastText",
              backgroundColor: "primary.main",
              opacity: 1,
              cursor: "progress",
            },
            // The fill itself. Translucent (opacity 0.55) so the
            // base button colour still bleeds through — without
            // this, the label gets visually swallowed by the dark
            // band sweeping across the button. Animates smoothly
            // via `transition` so the step-weight estimator's
            // natural jumpiness reads as intentional movement
            // rather than jitter.
            //
            // Note on z-order: an absolutely-positioned ::before
            // with `z-index: 0` actually stacks ABOVE inline text
            // children (which are at layer 5 in the CSS stacking
            // spec, while positioned z-index:0 is layer 6). That's
            // why the previous version hid the label even though
            // `& > *` had z-index 1 — text nodes aren't elements,
            // so the selector missed them. We now wrap the label
            // in an explicit <Box component="span"> below so it
            // becomes a positioned element of its own, sitting
            // unambiguously above the fill.
            ...(isGenerating && {
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                // Floor at 4% so the fill is visible from the very
                // first tick — pure 0 looks like nothing is
                // happening at all.
                width: `${Math.max(progress * 100, 4)}%`,
                backgroundColor: "primary.dark",
                opacity: 0.55,
                transition: "width 200ms linear",
                zIndex: 0,
              },
            }),
          }}
        >
          <Box
            component="span"
            sx={{
              // Wraps the spinner + label so they form a single
              // positioned element that definitively stacks above
              // the ::before fill. `display: inline-flex` keeps the
              // spinner and text on one line with a small gap.
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {isGenerating && (
              // Re-introduced because the fill alone can look
              // frozen during the heavier steps (chain-context
              // substitution, TTF save) where the bar stays at the
              // same percentage for several seconds. A spinning
              // ring is unambiguous "something is happening" even
              // when the fill isn't moving.
              <CircularProgress size={16} color="inherit" thickness={5} />
            )}
            {isGenerating
              ? `${t("step4.run.running")} ${Math.round(progress * 100)}%`
              : t("step4.run.idle")}
          </Box>
        </Button>
        <Box flex={1} />
        <Tooltip title={copied ? t("step4.copied") : t("step4.copy")} arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleCopy}
              disabled={progressLog.length === 0}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Step-name caption — small, secondary, only shown while
          there's something to say. The button carries the
          percentage; this just adds the human-readable phase
          ("Processing chain context substitution..."). */}
      {isGenerating && currentProcessingStep && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            mt: -1, // tighten the gap to the button row above
          }}
        >
          {currentProcessingStep}
        </Typography>
      )}

      {error && (
        <Alert severity="error" variant="outlined">
          {`${t("generate.error.prefix")}${error}`}
        </Alert>
      )}

      <Paper
        ref={logRef}
        variant="outlined"
        sx={{
          p: 1.5,
          height: 320,
          overflow: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          color: "text.secondary",
          // Distinct background so the log feels like a console rather
          // than another regular content panel.
          bgcolor: "action.hover",
        }}
      >
        {progressLog.length === 0 ? (
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            {t("step4.empty")}
          </Typography>
        ) : (
          progressLog.join("\n")
        )}
      </Paper>
    </Box>
  );
};

export default Step4Log;
