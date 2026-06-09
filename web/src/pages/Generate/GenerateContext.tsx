/**
 * GenerateContext — single source of truth for the stepped Generate flow.
 *
 * Owns ALL state and actions for the 5 steps so each step component can
 * stay stateless and stupid. Hoisting was necessary because the old
 * single-file Generate.tsx held everything in local useState; splitting
 * it into 5 routes would have required prop-drilling 15+ values.
 *
 * Notable design choices:
 *   - mappings is stored as MappingRow[] (not a CSV string) so Step 2's
 *     virtualized list can search/edit/delete without parsing on every
 *     keystroke. Conversion to CSV happens only when we call generate().
 *   - Pyodide kickoff is delegated to ../../utils/wingfont.ts; this
 *     context is purely react-state and orchestration.
 *   - currentStep lives here so the Stepper UI can move forward
 *     programmatically after a successful generation.
 */
import Papa from "papaparse";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  generateFont,
  installFontBlob,
  onRuntimeProgress,
  warmUpRuntime,
} from "../../utils/wingfont";
import { GenerateParams, GenerateResult, MappingRow } from "./types";

interface FontSlot {
  bytes: ArrayBuffer | null;
  name: string;
  isDefault: boolean;
}

interface GenerateContextValue {
  // --- Step 1: fonts ---
  baseFont: FontSlot;
  annoFont: FontSlot;
  setBaseFont: (bytes: ArrayBuffer, name: string) => void;
  setAnnoFont: (bytes: ArrayBuffer, name: string) => void;
  loadDefaultBaseFont: () => Promise<void>;
  loadDefaultAnnoFont: () => Promise<void>;

  // --- Step 2: mappings ---
  mappings: MappingRow[];
  setMappings: (rows: MappingRow[]) => void;
  addMapping: (row: Omit<MappingRow, "id">) => void;
  updateMapping: (id: string, patch: Partial<Omit<MappingRow, "id">>) => void;
  deleteMapping: (id: string) => void;
  clearMappings: () => void;
  loadDefaultMappings: () => Promise<void>;
  loadMappingsFromCsvText: (csv: string) => void;
  exportMappingsAsCsv: () => string;

  // --- Step 3: params ---
  params: GenerateParams;
  setParam: <K extends keyof GenerateParams>(
    key: K,
    value: GenerateParams[K],
  ) => void;

  // --- Step 4: log + run ---
  progressLog: string[];
  /** 0..1 progress derived from step weights below. -1 when no run
   *  has started; never decreases during a single run. */
  progress: number;
  /** Name of the step currently in progress (for UI labels), or null. */
  currentProcessingStep: string | null;
  isGenerating: boolean;
  error: string | null;
  runtimeStatus: string;
  runtimeReady: boolean;
  generate: () => Promise<void>;

  // --- Step 5: result ---
  result: GenerateResult | null;

  // --- Stepper navigation ---
  currentStep: number;
  setCurrentStep: (n: number) => void;
}

/**
 * Heuristic per-step weight, expressed as a fraction of total work.
 * Derived from the user's observed 302s baseline and refined for the
 * post-optimization pipeline. Numbers don't have to sum to exactly 1.0
 * — they get normalized at use time. Keep them roughly in proportion
 * to expected runtime so the bar advances smoothly rather than in
 * lopsided jumps.
 *
 * Steps not in this map default to a small weight (0.01) so unknown
 * "Processing X..." lines from future code still nudge the bar
 * forward instead of stalling.
 */
const STEP_WEIGHTS: Record<string, number> = {
  "input files": 0.005,
  "module imports": 0.02, // mostly cached after first run
  "annotated glyph composition": 0.42,
  "chain context substitution": 0.10,
  "ligature substitution": 0.01,
  "un-annotated glyph scaling": 0.005,
  "font subset": 0.07,
  "TTF save": 0.30,
  "WOFF wrap (JS)": 0.03,
  "output files": 0.005,
};
const DEFAULT_STEP_WEIGHT = 0.01;
const TOTAL_WEIGHT = Object.values(STEP_WEIGHTS).reduce((s, w) => s + w, 0);

/** Extract a step name from a "Processing X..." or
 *  "Processing X... DONE (...)" line. Returns null for lines that
 *  don't match the pattern. */
function parseStepName(line: string): string | null {
  const m = line.match(/^Processing (.+?)\.\.\.(?:$| DONE| FAILED)/);
  return m ? m[1] : null;
}

const GenerateContext = createContext<GenerateContextValue | null>(null);

const DEFAULT_BASE_URL = "/wingfont/ChironSungHK-R.ttf";
const DEFAULT_BASE_NAME = "ChironSungHK-R.ttf (default)";
const DEFAULT_ANNO_URL = "/wingfont/NotoSerif-Regular.ttf";
const DEFAULT_ANNO_NAME = "NotoSerif-Regular.ttf (default)";
const DEFAULT_MAPPING_URL = "/wingfont/mappings/canto-lshk.csv";

let familyCounter = 0;

/** Crypto-random id for new mapping rows. Avoids React-key collisions
 *  even after rapid add/delete cycles. */
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Parse a CSV string into MappingRow[]. We accept the same format the
 * Python pipeline does:
 *   col 0 = base characters (one or many)
 *   col 1 = annotation(s), space-separated
 *   col 2 = optional weight (ignored if not numeric)
 * Empty rows and rows missing a value are silently dropped — matches
 * the leniency of mappings/csv_parser.py.
 */
function parseCsvToRows(csv: string): MappingRow[] {
  const parsed = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true });
  const rows: MappingRow[] = [];
  for (const r of parsed.data) {
    if (!r || r.length < 2) continue;
    const chars = (r[0] ?? "").trim();
    const annos = (r[1] ?? "").trim();
    if (!chars || !annos) continue;
    const rawWeight = (r[2] ?? "").trim();
    const weight = /^\d+$/.test(rawWeight) ? parseInt(rawWeight, 10) : undefined;
    rows.push({ id: newId(), chars, annos, weight });
  }
  return rows;
}

function serialiseRowsToCsv(rows: MappingRow[]): string {
  const data = rows.map((r) =>
    r.weight !== undefined ? [r.chars, r.annos, String(r.weight)] : [r.chars, r.annos],
  );
  return Papa.unparse(data, { quotes: false, newline: "\n" });
}

export const GenerateProvider = ({ children }: { children: ReactNode }) => {
  // --- Step 1: fonts ---------------------------------------------------
  const [baseFont, setBaseFontState] = useState<FontSlot>({
    bytes: null,
    name: DEFAULT_BASE_NAME,
    isDefault: true,
  });
  const [annoFont, setAnnoFontState] = useState<FontSlot>({
    bytes: null,
    name: DEFAULT_ANNO_NAME,
    isDefault: true,
  });

  const setBaseFont = useCallback((bytes: ArrayBuffer, name: string) => {
    setBaseFontState({ bytes, name, isDefault: false });
  }, []);
  const setAnnoFont = useCallback((bytes: ArrayBuffer, name: string) => {
    setAnnoFontState({ bytes, name, isDefault: false });
  }, []);

  const loadDefaultBaseFont = useCallback(async () => {
    const res = await fetch(DEFAULT_BASE_URL);
    if (!res.ok) throw new Error(`Failed to load default base font (${res.status})`);
    const bytes = await res.arrayBuffer();
    setBaseFontState({ bytes, name: DEFAULT_BASE_NAME, isDefault: true });
  }, []);
  const loadDefaultAnnoFont = useCallback(async () => {
    const res = await fetch(DEFAULT_ANNO_URL);
    if (!res.ok) throw new Error(`Failed to load default anno font (${res.status})`);
    const bytes = await res.arrayBuffer();
    setAnnoFontState({ bytes, name: DEFAULT_ANNO_NAME, isDefault: true });
  }, []);

  // --- Step 2: mappings ------------------------------------------------
  const [mappings, setMappings] = useState<MappingRow[]>([]);

  const addMapping = useCallback((row: Omit<MappingRow, "id">) => {
    setMappings((prev) => [{ ...row, id: newId() }, ...prev]);
  }, []);
  const updateMapping = useCallback(
    (id: string, patch: Partial<Omit<MappingRow, "id">>) => {
      setMappings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );
  const deleteMapping = useCallback((id: string) => {
    setMappings((prev) => prev.filter((r) => r.id !== id));
  }, []);
  const clearMappings = useCallback(() => setMappings([]), []);

  const loadDefaultMappings = useCallback(async () => {
    const res = await fetch(DEFAULT_MAPPING_URL);
    if (!res.ok) {
      throw new Error(`Failed to load default mappings (${res.status})`);
    }
    setMappings(parseCsvToRows(await res.text()));
  }, []);
  const loadMappingsFromCsvText = useCallback((csv: string) => {
    setMappings(parseCsvToRows(csv));
  }, []);
  const exportMappingsAsCsv = useCallback(
    () => serialiseRowsToCsv(mappings),
    [mappings],
  );

  // --- Step 3: parameters ----------------------------------------------
  const [params, setParams] = useState<GenerateParams>({
    baseScale: 0.75,
    annoScale: 0.13,
    yOffsetRatio: 0.8,
    invert: false,
    optimize: true,
    familyName: "MyWingFont",
  });
  const setParam = useCallback<GenerateContextValue["setParam"]>(
    (key, value) => setParams((p) => ({ ...p, [key]: value })),
    [],
  );

  // --- Step 4: log + run -----------------------------------------------
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(-1);
  const [currentProcessingStep, setCurrentProcessingStep] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<string>(
    "Runtime not yet started.",
  );
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const installedFaceRef = useRef<FontFace | null>(null);

  // We accumulate completed step weights here so the progress bar only
  // ever moves forward, regardless of the order steps complete in.
  const completedWeightRef = useRef<number>(0);

  // Kick off Pyodide load early; the user has filled in fonts/mappings
  // by the time they click Generate, so the runtime should be warm.
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

  // Revoke blob URLs when result changes or unmounts.
  const resultRef = useRef<GenerateResult | null>(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const generate = useCallback(async () => {
    if (!baseFont.bytes && !baseFont.isDefault) return;
    if (!annoFont.bytes && !annoFont.isDefault) return;
    if (mappings.length === 0) {
      setError("Add at least one mapping row before generating.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgressLog([]);
    setResult(null);
    setProgress(0);
    setCurrentProcessingStep(null);
    completedWeightRef.current = 0;

    try {
      // Slice arraybuffers so transferring them to the worker doesn't
      // detach the user's stored copies (subsequent regenerations would
      // otherwise error with "ArrayBuffer is already detached").
      const baseBytes =
        baseFont.bytes ?? (await fetchAndCache(DEFAULT_BASE_URL));
      const annoBytes =
        annoFont.bytes ?? (await fetchAndCache(DEFAULT_ANNO_URL));
      const csvText = serialiseRowsToCsv(mappings);

      const r = await generateFont({
        baseFontBytes: baseBytes.slice(0),
        annoFontBytes: annoBytes.slice(0),
        mappingCsvText: csvText,
        newFamilyName: params.familyName || null,
        baseScale: params.baseScale,
        annoScale: params.annoScale,
        upperYOffsetRatio: params.yOffsetRatio,
        invert: params.invert,
        optimize: params.optimize,
        onProgress: (msg) => {
          // Parse step boundaries to drive the determinate progress
          // bar. "Processing X..." marks a step start; "Processing X...
          // DONE (...)" or "... FAILED (...)" marks the end.
          const step = parseStepName(msg);
          if (step) {
            const weight = STEP_WEIGHTS[step] ?? DEFAULT_STEP_WEIGHT;
            if (msg.includes(" DONE") || msg.includes(" FAILED")) {
              completedWeightRef.current += weight;
              setProgress(
                Math.min(0.99, completedWeightRef.current / TOTAL_WEIGHT),
              );
              setCurrentProcessingStep(null);
            } else {
              // Step just started — show it as the current in-progress
              // step name (drives the spinner label in Step 4).
              setCurrentProcessingStep(step);
            }
          }
          setProgressLog((prev) => appendOrCoalesce(prev, msg));
        },
      });

      // Install the WOFF as @font-face so Step 5 can render with it.
      const family = `wingfont-preview-${++familyCounter}`;
      if (installedFaceRef.current) {
        document.fonts.delete(installedFaceRef.current);
        installedFaceRef.current = null;
      }
      const face = await installFontBlob(r.woffBlob, family);
      installedFaceRef.current = face;

      setResult({
        ttfBlob: r.ttfBlob,
        woffBlob: r.woffBlob,
        installedFamily: family,
      });
      // Pipeline successfully completed — slam the bar to 100%.
      setProgress(1);
      setCurrentProcessingStep(null);
      // Auto-advance to the preview step. User can navigate back if
      // they want to tweak anything.
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Leave the progress bar at wherever it got so the user can see
      // roughly how far the pipeline got before failing.
    } finally {
      setIsGenerating(false);
    }
  }, [baseFont, annoFont, mappings, params]);

  // --- Stepper navigation ----------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);

  const value = useMemo<GenerateContextValue>(
    () => ({
      baseFont,
      annoFont,
      setBaseFont,
      setAnnoFont,
      loadDefaultBaseFont,
      loadDefaultAnnoFont,
      mappings,
      setMappings,
      addMapping,
      updateMapping,
      deleteMapping,
      clearMappings,
      loadDefaultMappings,
      loadMappingsFromCsvText,
      exportMappingsAsCsv,
      params,
      setParam,
      progressLog,
      progress,
      currentProcessingStep,
      isGenerating,
      error,
      runtimeStatus,
      runtimeReady,
      generate,
      result,
      currentStep,
      setCurrentStep,
    }),
    [
      baseFont,
      annoFont,
      setBaseFont,
      setAnnoFont,
      loadDefaultBaseFont,
      loadDefaultAnnoFont,
      mappings,
      addMapping,
      updateMapping,
      deleteMapping,
      clearMappings,
      loadDefaultMappings,
      loadMappingsFromCsvText,
      exportMappingsAsCsv,
      params,
      setParam,
      progressLog,
      progress,
      currentProcessingStep,
      isGenerating,
      error,
      runtimeStatus,
      runtimeReady,
      generate,
      result,
      currentStep,
    ],
  );

  return (
    <GenerateContext.Provider value={value}>
      {children}
    </GenerateContext.Provider>
  );
};

export const useGenerate = (): GenerateContextValue => {
  const ctx = useContext(GenerateContext);
  if (!ctx) {
    throw new Error("useGenerate must be used inside <GenerateProvider>");
  }
  return ctx;
};

// Small helper that fetches a URL once and returns its bytes. Used as a
// fallback when the user kept the default font slot (the slot has no
// bytes set, since we only fetch the default at generate-time).
async function fetchAndCache(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Append a new progress line, OR coalesce it with the previous line if
 * the new line is a strict extension of the old one with " DONE" tacked
 * on (possibly followed by trailing info, e.g. "(798 rules)"). This is
 * the trick that makes the log read as one updating line per step
 * instead of two — "Processing X..." shows up immediately when the work
 * starts, then the same line gains " DONE" once it finishes.
 *
 * Coalescing rule: the previous line must be a proper prefix of the
 * new one, and the new-line tail (the part after the prefix) must
 * start with " DONE" (with the leading space). The space matters — it
 * prevents accidental matches like "Processing X" + "Processing X-y...".
 */
function appendOrCoalesce(prev: string[], next: string): string[] {
  if (prev.length > 0) {
    const last = prev[prev.length - 1];
    if (next.startsWith(last) && next.slice(last.length).startsWith(" DONE")) {
      return [...prev.slice(0, -1), next];
    }
  }
  return [...prev, next];
}
