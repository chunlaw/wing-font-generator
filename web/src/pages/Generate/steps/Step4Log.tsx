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
  LinearProgress,
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
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={generate}
          disabled={isGenerating}
          startIcon={
            isGenerating ? <CircularProgress size={18} color="inherit" /> : undefined
          }
        >
          {isGenerating ? t("step4.run.running") : t("step4.run.idle")}
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

      {/* Determinate progress bar driven by step weights in
          GenerateContext. We show -1 (idle) as a blank space rather
          than a 0% bar so the section doesn't reserve vertical room
          before the first run. When isGenerating but progress hasn't
          started ticking yet, fall back to an indeterminate bar so
          the user sees activity. */}
      {progress >= 0 && (
        <Box>
          <LinearProgress
            variant={isGenerating && progress === 0 ? "indeterminate" : "determinate"}
            value={Math.round(progress * 100)}
          />
          <Box
            display="flex"
            justifyContent="space-between"
            mt={0.5}
            sx={{ fontSize: 12, color: "text.secondary" }}
          >
            <span>{currentProcessingStep ?? (progress >= 1 ? "Done" : "")}</span>
            <span>{Math.round(progress * 100)}%</span>
          </Box>
        </Box>
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
