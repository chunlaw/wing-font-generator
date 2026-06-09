/**
 * Generate page — UI on top of the Pyodide-backed wing-font pipeline.
 *
 * Flow:
 *   1. Page mount kicks off Pyodide cold-start in the background, so by the
 *      time the user has chosen their files the runtime is usually warm.
 *   2. Defaults (Chiron + NotoSerif + canto-lshk.csv) are fetched lazily
 *      from /wingfont/ and used unless the user uploads overrides.
 *   3. Clicking Generate posts the buffers to the worker, streams progress
 *      text into a status box, and on success registers the WOFF as an
 *      @font-face so the live-preview textbox renders with the new font.
 */
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateFont,
  installFontBlob,
  onRuntimeProgress,
  warmUpRuntime,
} from "../utils/wingfont";

interface FileState {
  /** Display name shown in the UI. */
  name: string;
  /** Bytes ready to be transferred to the worker. */
  bytes: ArrayBuffer | null;
  /** True if this slot is still holding the bundled default (not yet loaded). */
  isDefault: boolean;
}

interface DefaultAsset {
  url: string;
  displayName: string;
}

// Bundled defaults live in /public/wingfont/. Fetched on demand (first
// generate click) so we don't pay 23 MB of bandwidth just for opening the
// page.
const DEFAULT_BASE: DefaultAsset = {
  url: "/wingfont/ChironSungHK-R.ttf",
  displayName: "ChironSungHK-R.ttf (default)",
};
const DEFAULT_ANNO: DefaultAsset = {
  url: "/wingfont/NotoSerif-Regular.ttf",
  displayName: "NotoSerif-Regular.ttf (default)",
};
const DEFAULT_MAPPING: DefaultAsset = {
  url: "/wingfont/mappings/canto-lshk.csv",
  displayName: "canto-lshk.csv (default)",
};

/** Counter used to mint unique font-family names so re-runs don't conflict. */
let installedFamilyCounter = 0;

const Generate = () => {
  const [baseFile, setBaseFile] = useState<FileState>({
    name: DEFAULT_BASE.displayName,
    bytes: null,
    isDefault: true,
  });
  const [annoFile, setAnnoFile] = useState<FileState>({
    name: DEFAULT_ANNO.displayName,
    bytes: null,
    isDefault: true,
  });
  const [mappingFile, setMappingFile] = useState<{
    name: string;
    text: string | null;
    isDefault: boolean;
  }>({
    name: DEFAULT_MAPPING.displayName,
    text: null,
    isDefault: true,
  });

  const [baseScale, setBaseScale] = useState(0.75);
  const [annoScale, setAnnoScale] = useState(0.13);
  const [yOffsetRatio, setYOffsetRatio] = useState(0.8);
  const [invert, setInvert] = useState(false);
  const [optimize, setOptimize] = useState(true);
  const [familyName, setFamilyName] = useState("MyWingFont");

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<string>(
    "Runtime not yet started.",
  );
  const [runtimeReady, setRuntimeReady] = useState(false);

  const [resultTtfUrl, setResultTtfUrl] = useState<string | null>(null);
  const [resultWoffUrl, setResultWoffUrl] = useState<string | null>(null);
  const [installedFamily, setInstalledFamily] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState(
    "你好世界 — 試試輸入字加數字看看注音切換",
  );

  // The FontFace currently registered to document.fonts (if any). Tracked
  // so that regenerating can swap it cleanly without leaking faces.
  const installedFaceRef = useRef<FontFace | null>(null);

  // Eagerly start Pyodide on page mount and subscribe to runtime-wide
  // progress messages (the per-request callbacks are wired separately
  // inside handleGenerate).
  useEffect(() => {
    const unsub = onRuntimeProgress((msg) => {
      setRuntimeStatus(msg);
      if (msg.toLowerCase().includes("pyodide ready")) setRuntimeReady(true);
    });
    warmUpRuntime()
      .then(() => setRuntimeReady(true))
      .catch((err) => setRuntimeStatus(`Runtime failed: ${err.message}`));
    return () => {
      unsub();
    };
  }, []);

  // Revoke object URLs when they get replaced or the component unmounts so
  // we don't leak memory across regenerations.
  useEffect(() => {
    return () => {
      if (resultTtfUrl) URL.revokeObjectURL(resultTtfUrl);
      if (resultWoffUrl) URL.revokeObjectURL(resultWoffUrl);
    };
  }, [resultTtfUrl, resultWoffUrl]);

  const handleBaseUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const bytes = await file.arrayBuffer();
      setBaseFile({ name: file.name, bytes, isDefault: false });
    },
    [],
  );

  const handleAnnoUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const bytes = await file.arrayBuffer();
      setAnnoFile({ name: file.name, bytes, isDefault: false });
    },
    [],
  );

  const handleMappingUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      setMappingFile({ name: file.name, text, isDefault: false });
    },
    [],
  );

  /**
   * Fetch a default asset and return its contents. We only do this when the
   * user actually triggers generation so opening the page is cheap.
   */
  const loadDefaultArrayBuffer = async (asset: DefaultAsset): Promise<ArrayBuffer> => {
    setProgressLog((prev) => [...prev, `Downloading default: ${asset.displayName}`]);
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`Failed to fetch ${asset.url}: ${res.status}`);
    return await res.arrayBuffer();
  };

  const loadDefaultText = async (asset: DefaultAsset): Promise<string> => {
    setProgressLog((prev) => [...prev, `Downloading default: ${asset.displayName}`]);
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`Failed to fetch ${asset.url}: ${res.status}`);
    return await res.text();
  };

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgressLog([]);
    setResultTtfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResultWoffUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      // Resolve each slot: prefer the uploaded bytes, otherwise fetch the
      // bundled default. We do this every call (rather than caching) so the
      // user can swap files freely between runs.
      const baseBytes =
        baseFile.bytes ?? (await loadDefaultArrayBuffer(DEFAULT_BASE));
      const annoBytes =
        annoFile.bytes ?? (await loadDefaultArrayBuffer(DEFAULT_ANNO));
      const mappingText =
        mappingFile.text ?? (await loadDefaultText(DEFAULT_MAPPING));

      // We slice the buffers so the transfer doesn't detach the user's
      // uploaded bytes; otherwise a second Generate click would error out
      // with "ArrayBuffer is already detached".
      const baseClone = baseBytes.slice(0);
      const annoClone = annoBytes.slice(0);

      const result = await generateFont({
        baseFontBytes: baseClone,
        annoFontBytes: annoClone,
        mappingCsvText: mappingText,
        newFamilyName: familyName || null,
        baseScale,
        annoScale,
        upperYOffsetRatio: yOffsetRatio,
        invert,
        optimize,
        onProgress: (msg) => setProgressLog((prev) => [...prev, msg]),
      });

      const ttfUrl = URL.createObjectURL(result.ttfBlob);
      const woffUrl = URL.createObjectURL(result.woffBlob);
      setResultTtfUrl(ttfUrl);
      setResultWoffUrl(woffUrl);

      // Register the WOFF so the live-preview textbox switches to it.
      // Use a unique family name per generation so the browser doesn't
      // serve a stale cached face.
      const uniqueFamily = `wingfont-preview-${++installedFamilyCounter}`;
      if (installedFaceRef.current) {
        document.fonts.delete(installedFaceRef.current);
        installedFaceRef.current = null;
      }
      const face = await installFontBlob(result.woffBlob, uniqueFamily);
      installedFaceRef.current = face;
      setInstalledFamily(uniqueFamily);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    baseFile,
    annoFile,
    mappingFile,
    familyName,
    baseScale,
    annoScale,
    yOffsetRatio,
    invert,
    optimize,
  ]);

  const fileSummary = useMemo(() => {
    return [
      `Base: ${baseFile.name}${baseFile.isDefault ? "" : " ✏︎"}`,
      `Anno: ${annoFile.name}${annoFile.isDefault ? "" : " ✏︎"}`,
      `CSV: ${mappingFile.name}${mappingFile.isDefault ? "" : " ✏︎"}`,
    ].join("   ·   ");
  }, [baseFile, annoFile, mappingFile]);

  return (
    <Box
      width="100%"
      my={2}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Typography variant="h5">Generate your own annotation font</Typography>

      <Alert severity={runtimeReady ? "success" : "info"} variant="outlined">
        {runtimeReady
          ? "Font engine ready. First generation typically takes 30–120 seconds."
          : `Loading font engine: ${runtimeStatus}`}
      </Alert>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Input files
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Leave a slot untouched to use the bundled default.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FileSlot
            label="Base font (TTF)"
            fileName={baseFile.name}
            accept=".ttf,.otf,font/ttf"
            onChange={handleBaseUpload}
          />
          <FileSlot
            label="Annotation font (TTF)"
            fileName={annoFile.name}
            accept=".ttf,.otf,font/ttf"
            onChange={handleAnnoUpload}
          />
          <FileSlot
            label="Mapping CSV"
            fileName={mappingFile.name}
            accept=".csv,text/csv"
            onChange={handleMappingUpload}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          {fileSummary}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Parameters
        </Typography>
        <Stack spacing={2}>
          <TextField
            size="small"
            label="Family name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            helperText="Embedded in the font's name table"
            fullWidth
          />
          <LabeledSlider
            label="Base glyph scale"
            value={baseScale}
            onChange={setBaseScale}
            min={0.3}
            max={1}
            step={0.01}
          />
          <LabeledSlider
            label="Annotation scale"
            value={annoScale}
            onChange={setAnnoScale}
            min={0.05}
            max={0.35}
            step={0.01}
          />
          <LabeledSlider
            label="Upper Y offset ratio"
            value={yOffsetRatio}
            onChange={setYOffsetRatio}
            min={0}
            max={1}
            step={0.05}
          />
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={invert}
                  onChange={(e) => setInvert(e.target.checked)}
                />
              }
              label="Invert (annotation below base)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={optimize}
                  onChange={(e) => setOptimize(e.target.checked)}
                />
              }
              label="Subset (smaller output)"
            />
          </Stack>
        </Stack>
      </Paper>

      <Box display="flex" alignItems="center" gap={2}>
        <Button
          variant="contained"
          size="large"
          onClick={handleGenerate}
          disabled={isGenerating}
          startIcon={
            isGenerating ? <CircularProgress size={18} color="inherit" /> : undefined
          }
        >
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
        {resultTtfUrl && resultWoffUrl && !isGenerating && (
          <>
            <Button href={resultTtfUrl} download={`${familyName || "wingfont"}.ttf`}>
              Download TTF
            </Button>
            <Button href={resultWoffUrl} download={`${familyName || "wingfont"}.woff`}>
              Download WOFF
            </Button>
          </>
        )}
      </Box>

      {isGenerating && <LinearProgress />}

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      {progressLog.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            maxHeight: 200,
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            color: "text.secondary",
          }}
        >
          {progressLog.join("\n")}
        </Paper>
      )}

      {installedFamily && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Live preview
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Type characters from the mapping followed by 0–9 to trigger the
            GSUB rules. Example: 中1 中2 中3…
          </Typography>
          <TextField
            fullWidth
            multiline
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box
            sx={{
              fontFamily: installedFamily,
              fontSize: 48,
              lineHeight: 1.5,
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              minHeight: 80,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {sampleText}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

interface FileSlotProps {
  label: string;
  fileName: string;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const FileSlot = ({ label, fileName, accept, onChange }: FileSlotProps) => {
  return (
    <Box flex={1}>
      <Button variant="outlined" component="label" fullWidth>
        {label}
        <input hidden type="file" accept={accept} onChange={onChange} />
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}
      >
        {fileName}
      </Typography>
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
      />
    </Box>
  );
};

export default Generate;
