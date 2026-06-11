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
import opentype from "opentype.js";
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
  preparePreviewFonts,
  warmUpRuntime,
} from "../../utils/wingfont";
import {
  BuiltInPreset,
  DEFAULT_ANNO_FONT_PRESET,
  DEFAULT_BASE_FONT_PRESET,
  DEFAULT_MAPPING_PRESET,
} from "../../utils/wingfontPresets";
import {
  AxisLocation,
  FontAxis,
  GenerateParams,
  GenerateResult,
  MappingRow,
  PreviewResult,
} from "./types";

interface FontSlot {
  bytes: ArrayBuffer | null;
  name: string;
  /** True when the bytes (or, while still unloaded, the slot's
   *  identity) come from a built-in preset rather than a user
   *  upload. The preset KEY lives in `presetKey` so the dropdown
   *  knows which row to highlight. */
  isDefault: boolean;
  /** Key of the built-in preset currently selected, or null when
   *  the user has uploaded a custom file. */
  presetKey: string | null;
  /** Variable-font axes declared by this font's `fvar` table.
   *  Undefined for non-variable fonts. Populated from opentype.js
   *  when bytes are loaded. */
  axes?: FontAxis[];
  /** Currently-chosen axis values (tag → value). Defaults to each
   *  axis's `default` when bytes are first loaded; user can change
   *  via the Step 1 sliders. Undefined for non-variable fonts. */
  axisLocation?: AxisLocation;
  /**
   * Set of Unicode codepoints this font's cmap covers. Cached here
   * so the Step 2 coverage validator can check "does this char
   * exist in the font?" in O(1) per check, without re-parsing the
   * font on every mapping change. Populated alongside `axes` when
   * bytes load; undefined when no font is loaded yet.
   */
  glyphCoverage?: Set<number>;
}

/**
 * Parse a font's `fvar` table via opentype.js and return its axis
 * definitions. Returns undefined for non-variable fonts or when
 * parsing fails — callers should treat that as "no variable axes,
 * render no slider, send no location to the pipeline".
 */
function extractAxes(bytes: ArrayBuffer): FontAxis[] | undefined {
  try {
    // opentype.parse copies the bytes, so the caller's buffer isn't
    // detached even if it gets transferred to a worker later.
    const f = opentype.parse(bytes.slice(0));
    // The fvar table is opentype.js-typed somewhat loosely; the
    // axes array has tag/minValue/defaultValue/maxValue/name fields
    // per axis. Name can be a localised string map or a plain
    // string depending on the font; we prefer the English name
    // when available, otherwise fall back to the tag (which is
    // always a 4-char ASCII string like "wght").
    const fvar = (f.tables as { fvar?: { axes?: unknown[] } }).fvar;
    if (!fvar?.axes?.length) return undefined;
    return fvar.axes.map((rawAxis) => {
      const a = rawAxis as {
        tag: string;
        minValue: number;
        defaultValue: number;
        maxValue: number;
        name?: string | Record<string, string>;
      };
      let name: string = a.tag;
      if (typeof a.name === "string") {
        name = a.name;
      } else if (a.name && typeof a.name === "object") {
        name = a.name.en ?? Object.values(a.name)[0] ?? a.tag;
      }
      return {
        tag: a.tag,
        name,
        min: a.minValue,
        default: a.defaultValue,
        max: a.maxValue,
      };
    });
  } catch {
    return undefined;
  }
}

/**
 * Build the set of Unicode codepoints supported by a font's cmap.
 *
 * Used by Step 2's coverage validator to flag characters in the
 * user's mapping CSV that the selected font can't actually render.
 * Returns undefined if parsing fails OR if no encoded codepoints
 * could be found — callers treat that as "we don't know what's
 * covered, skip validation" rather than blocking the user.
 *
 * Implementation: iterate every glyph and harvest its `.unicode`
 * (primary codepoint) and `.unicodes` (all codepoints aliased to
 * this glyph) properties. This is the documented opentype.js API
 * and works uniformly across font flavours (CID-keyed CJK, regular
 * TrueType, CFF/OTF) — unlike `font.tables.cmap.glyphIndexMap`
 * which is an internal-detail field that doesn't always survive
 * parsing on some CJK fonts (Chiron in particular).
 *
 * Performance: for a ~30k-glyph CJK font this iterates 30k objects
 * with a Set.add per encoded codepoint. Typically completes in
 * 30-80ms on a modern device — fine to run synchronously on
 * font load.
 */
function extractGlyphCoverage(bytes: ArrayBuffer): Set<number> | undefined {
  try {
    const f = opentype.parse(bytes.slice(0));
    const codepoints = new Set<number>();
    // opentype.js Glyph type, kept loose because we only read two
    // well-documented fields.
    type Glyph = {
      unicode?: number;
      unicodes?: number[];
    };
    const glyphs = f.glyphs as { get?: (i: number) => Glyph | undefined };
    for (let i = 0; i < f.numGlyphs; i++) {
      const g = glyphs.get?.(i);
      if (!g) continue;
      if (typeof g.unicode === "number") {
        codepoints.add(g.unicode);
      }
      if (Array.isArray(g.unicodes)) {
        for (const cp of g.unicodes) {
          if (typeof cp === "number") codepoints.add(cp);
        }
      }
    }
    // An "empty" coverage set is almost certainly an error (no
    // encoded glyphs at all?); treat it the same as parse failure
    // so the validator stays silent rather than incorrectly
    // reporting "all characters missing".
    return codepoints.size > 0 ? codepoints : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build the default axis-location object for a list of axes.
 *
 * Each axis takes its own `default` value, EXCEPT the weight axis,
 * which we pin to Regular (400, clamped into the axis range) rather
 * than the font's declared default. Several CJK variable fonts —
 * Noto Sans TC / JP / KR among them — declare a `wght` default of
 * Thin (100), which is far too light to read as either a base or an
 * annotation glyph. 400 is the universally-expected "Regular", and
 * this mirrors the auto-instance rule in python/wing-font.py so the
 * in-browser preview, the generated font, and the CI-built showcase
 * fonts all land on the same weight. The user can still drag the
 * weight slider afterwards. Returns undefined for non-variable fonts.
 */
function defaultAxisLocation(
  axes: FontAxis[] | undefined,
): AxisLocation | undefined {
  if (!axes || axes.length === 0) return undefined;
  return Object.fromEntries(
    axes.map((a) => [
      a.tag,
      a.tag === "wght" ? Math.min(Math.max(400, a.min), a.max) : a.default,
    ]),
  );
}

interface GenerateContextValue {
  // --- Step 1: fonts ---
  baseFont: FontSlot;
  annoFont: FontSlot;
  setBaseFont: (bytes: ArrayBuffer, name: string) => void;
  setAnnoFont: (bytes: ArrayBuffer, name: string) => void;
  /** Update one axis value on the base / anno font slot. No-op when
   *  the slot's font isn't variable. Used by the Step 1 axis
   *  sliders. */
  setBaseFontAxisValue: (tag: string, value: number) => void;
  setAnnoFontAxisValue: (tag: string, value: number) => void;
  loadDefaultBaseFont: () => Promise<void>;
  loadDefaultAnnoFont: () => Promise<void>;
  /** Load a built-in font preset (one of BUILT_IN_BASE_FONTS) into
   *  the base slot. Used by the Step 1 preset Select. */
  loadBuiltInBaseFont: (preset: BuiltInPreset) => Promise<void>;
  /** Load a built-in font preset into the annotation slot. */
  loadBuiltInAnnoFont: (preset: BuiltInPreset) => Promise<void>;
  /** True while a base / anno font preset download is in flight.
   *  Wired into FontSlotCard so Step 1 can show a progress indicator
   *  and disable the preset picker until the fetch completes. */
  baseFontLoading: boolean;
  annoFontLoading: boolean;

  // --- Step 2: mappings ---
  mappings: MappingRow[];
  setMappings: (rows: MappingRow[]) => void;
  addMapping: (row: Omit<MappingRow, "id">) => void;
  updateMapping: (id: string, patch: Partial<Omit<MappingRow, "id">>) => void;
  deleteMapping: (id: string) => void;
  clearMappings: () => void;
  loadDefaultMappings: () => Promise<void>;
  /** Load a built-in mapping preset (one of BUILT_IN_MAPPINGS).
   *  Replaces the current mappings entirely. */
  loadBuiltInMappings: (preset: BuiltInPreset) => Promise<void>;
  loadMappingsFromCsvText: (csv: string) => void;
  exportMappingsAsCsv: () => string;
  /** Key of the built-in mapping preset most recently loaded, or
   *  null when the user has edited / imported a custom mapping. */
  mappingsPresetKey: string | null;

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

  // --- Parameter-tuning preview (Step 3) ---
  /**
   * Manually request a preview. Normally callers don't need this —
   * the context auto-fires a debounced preview whenever the user is
   * on Step 3 and any input changes. Exposed for tests / future UI
   * affordances. Returns synchronously; the run completes some time
   * later and updates `previewResult`. Subsequent calls before the
   * debounce window elapses are coalesced into one.
   */
  runPreview: () => void;
  /** Active while a preview run is in flight. */
  isPreviewing: boolean;
  /** Latest preview result, or null if the user hasn't run one yet
   *  (or the last run errored). */
  previewResult: PreviewResult | null;
  /** Last preview status string (e.g. "Processing chain context
   *  substitution..."). Empty when not running. */
  previewStatus: string;
  /** Error from the most recent preview run, if any. Cleared on the
   *  next click. */
  previewError: string | null;
  /** User-controlled preview text. Empty string means "auto-pick the
   *  longest sample-eligible mapping row" (original behaviour). Any
   *  non-empty value overrides selection and renders exactly the
   *  user's text. */
  previewText: string;
  setPreviewText: (text: string) => void;

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

// Fallback URLs used when a generate/preview run finds a font slot
// with `bytes === null` (the user kept the default but never
// explicitly clicked "Use default"). Mapped through the preset
// metadata so changing the default in wingfontPresets.ts is the
// single point of edit.
const DEFAULT_BASE_URL = DEFAULT_BASE_FONT_PRESET.url;
const DEFAULT_ANNO_URL = DEFAULT_ANNO_FONT_PRESET.url;

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
  //
  // Initial slot state shows the default preset's filename without
  // actually fetching bytes — the fetch happens lazily either when
  // the user clicks "Use default" / picks from the dropdown, or
  // when the run pipeline reaches a font slot with bytes === null.
  const [baseFont, setBaseFontState] = useState<FontSlot>({
    bytes: null,
    name: `${DEFAULT_BASE_FONT_PRESET.filename} (preset)`,
    isDefault: true,
    presetKey: DEFAULT_BASE_FONT_PRESET.key,
    // Axes are populated lazily when the bytes actually arrive
    // (either via the preset loader or a user upload).
  });
  const [annoFont, setAnnoFontState] = useState<FontSlot>({
    bytes: null,
    name: `${DEFAULT_ANNO_FONT_PRESET.filename} (preset)`,
    isDefault: true,
    presetKey: DEFAULT_ANNO_FONT_PRESET.key,
  });

  // ── Font-download progress + race guard ────────────────────────
  //
  // `*FontLoading` drives the indeterminate <LinearProgress /> bar
  // that Step 1's FontSlotCard renders while a preset is being
  // fetched (the in-browser pipeline fonts are 12-24 MB each, which
  // is several seconds on a slow connection — without a UI signal
  // the page looks frozen).
  //
  // `*LoadTokenRef` is a per-slot in-flight token that fixes a
  // race: if the user picks preset A, then picks preset B before
  // A's fetch finishes, the old behaviour would let A's late
  // `setter()` overwrite B's freshly-loaded state — the dropdown
  // would say "B" but the slot would actually be A's bytes. We
  // increment the token at the START of every load and check it
  // again before any state write; a stale load (whose token no
  // longer matches the latest) silently drops its result. The
  // loading flag is also gated on the token so the loader that
  // started LAST owns the flag — if A's load arrives first and
  // tries to clear `loading`, the check fails and B's still-
  // in-flight load keeps the spinner up.
  const [baseFontLoading, setBaseFontLoading] = useState(false);
  const [annoFontLoading, setAnnoFontLoading] = useState(false);
  const baseLoadTokenRef = useRef(0);
  const annoLoadTokenRef = useRef(0);

  // User-uploaded files always reset presetKey to null so the
  // dropdown shows the "Custom upload" option (or whichever
  // placeholder we render for that state). We also parse axes
  // immediately so the Step 1 UI can show variable-font sliders
  // for the just-uploaded file.
  const setBaseFont = useCallback((bytes: ArrayBuffer, name: string) => {
    const axes = extractAxes(bytes);
    setBaseFontState({
      bytes,
      name,
      isDefault: false,
      presetKey: null,
      axes,
      axisLocation: defaultAxisLocation(axes),
      glyphCoverage: extractGlyphCoverage(bytes),
    });
  }, []);
  const setAnnoFont = useCallback((bytes: ArrayBuffer, name: string) => {
    const axes = extractAxes(bytes);
    setAnnoFontState({
      bytes,
      name,
      isDefault: false,
      presetKey: null,
      axes,
      axisLocation: defaultAxisLocation(axes),
      glyphCoverage: extractGlyphCoverage(bytes),
    });
  }, []);

  // Update one axis value within a font slot. Used by the Step 1
  // sliders when the user drags an axis (e.g. weight 400 → 700).
  // Leaves the rest of the slot (bytes, presetKey, axes, …)
  // untouched so re-running through the pipeline picks up the new
  // value without re-parsing the font.
  const setBaseFontAxisValue = useCallback(
    (tag: string, value: number) => {
      setBaseFontState((prev) => ({
        ...prev,
        axisLocation: { ...(prev.axisLocation ?? {}), [tag]: value },
      }));
    },
    [],
  );
  const setAnnoFontAxisValue = useCallback(
    (tag: string, value: number) => {
      setAnnoFontState((prev) => ({
        ...prev,
        axisLocation: { ...(prev.axisLocation ?? {}), [tag]: value },
      }));
    },
    [],
  );

  // Generalised preset loader. Used by both the convenience
  // "loadDefault*" methods (kept for backward compat with callers
  // that always wanted the default) and the new dropdown-driven
  // "loadBuiltIn*" methods.
  //
  // We sanity-check the response's content-type because Vite's SPA
  // fallback returns the dev server's index.html for ANY 404 — so a
  // missing font file would otherwise sneak ~3 KB of HTML into a
  // FontSlot as ArrayBuffer, then fail much later inside Pyodide
  // with a baffling "NoneType is not iterable" on getBestCmap().
  // The mirror of this check lives in workers/wingfontWorker.ts's
  // fetchToBytes; both need to stay in sync.
  const loadPresetIntoSlot = useCallback(
    async (
      preset: BuiltInPreset,
      setter: (next: FontSlot) => void,
      slotName: string,
      setLoading: (loading: boolean) => void,
      tokenRef: React.MutableRefObject<number>,
    ) => {
      // Mint a token for THIS load. Any later load on the same slot
      // will increment past this value; we check the token before
      // every state write to drop stale results.
      const myToken = ++tokenRef.current;
      setLoading(true);
      try {
        const res = await fetch(preset.url);
        if (!res.ok) {
          throw new Error(
            `Failed to load ${slotName} preset "${preset.label}" (${res.status}). ` +
              "If you just added this preset, run `yarn sync` to copy the file into public/wingfont/.",
          );
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("text/html")) {
          throw new Error(
            `Got HTML when fetching ${preset.url} — the file isn't in ` +
              "public/wingfont/. Run `yarn sync` (or restart `yarn dev`) " +
              "to copy the built-in fonts and mappings into place.",
          );
        }
        const bytes = await res.arrayBuffer();
        // Latest-wins: bail without setter() if a newer load on the
        // same slot has started while we were waiting on bytes.
        if (tokenRef.current !== myToken) return;
        // Parse the variable-font axes here too so picking a preset
        // surfaces the same sliders as an upload would.
        const axes = extractAxes(bytes);
        setter({
          bytes,
          name: `${preset.filename} (preset)`,
          isDefault: preset.key === DEFAULT_BASE_FONT_PRESET.key ||
            preset.key === DEFAULT_ANNO_FONT_PRESET.key,
          presetKey: preset.key,
          axes,
          axisLocation: defaultAxisLocation(axes),
          glyphCoverage: extractGlyphCoverage(bytes),
        });
      } finally {
        // Only clear the loading flag if we're still the latest
        // load. If a newer one is in flight, it now owns the flag
        // and will clear it when it completes (or its own race
        // guard fires).
        if (tokenRef.current === myToken) setLoading(false);
      }
    },
    [],
  );

  const loadDefaultBaseFont = useCallback(
    () =>
      loadPresetIntoSlot(
        DEFAULT_BASE_FONT_PRESET,
        setBaseFontState,
        "base font",
        setBaseFontLoading,
        baseLoadTokenRef,
      ),
    [loadPresetIntoSlot],
  );
  const loadDefaultAnnoFont = useCallback(
    () =>
      loadPresetIntoSlot(
        DEFAULT_ANNO_FONT_PRESET,
        setAnnoFontState,
        "annotation font",
        setAnnoFontLoading,
        annoLoadTokenRef,
      ),
    [loadPresetIntoSlot],
  );
  const loadBuiltInBaseFont = useCallback(
    (preset: BuiltInPreset) =>
      loadPresetIntoSlot(
        preset,
        setBaseFontState,
        "base font",
        setBaseFontLoading,
        baseLoadTokenRef,
      ),
    [loadPresetIntoSlot],
  );
  const loadBuiltInAnnoFont = useCallback(
    (preset: BuiltInPreset) =>
      loadPresetIntoSlot(
        preset,
        setAnnoFontState,
        "annotation font",
        setAnnoFontLoading,
        annoLoadTokenRef,
      ),
    [loadPresetIntoSlot],
  );

  // --- Step 2: mappings ------------------------------------------------
  //
  // `mappingsPresetKey` tracks which built-in preset (if any) is
  // currently loaded. Any user-driven edit (add row, update row,
  // delete row, manual CSV import) clears it to null, signalling
  // "this is no longer the unmodified preset". The Select shows
  // null as a "Custom" / no-selection state.
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [mappingsPresetKey, setMappingsPresetKey] = useState<string | null>(null);

  // Wrap setMappings so any caller that replaces mappings wholesale
  // (e.g. CSV import) is opted into "custom" by default. Preset
  // loaders explicitly set the key after calling this.
  const setMappingsAndUntag = useCallback((rows: MappingRow[]) => {
    setMappings(rows);
    setMappingsPresetKey(null);
  }, []);

  const addMapping = useCallback((row: Omit<MappingRow, "id">) => {
    setMappings((prev) => [{ ...row, id: newId() }, ...prev]);
    setMappingsPresetKey(null);
  }, []);
  const updateMapping = useCallback(
    (id: string, patch: Partial<Omit<MappingRow, "id">>) => {
      setMappings((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
      setMappingsPresetKey(null);
    },
    [],
  );
  const deleteMapping = useCallback((id: string) => {
    setMappings((prev) => prev.filter((r) => r.id !== id));
    setMappingsPresetKey(null);
  }, []);
  const clearMappings = useCallback(() => {
    setMappings([]);
    setMappingsPresetKey(null);
  }, []);

  // Generalised mappings-preset loader. Used by both the
  // "loadDefaultMappings" convenience and the dropdown-driven
  // `loadBuiltInMappings`.
  //
  // Same Vite-fallback HTML check as the font loader above — a
  // missing CSV would otherwise be silently parsed as a single huge
  // "row" of HTML and produce nonsense mappings.
  const loadMappingsPreset = useCallback(async (preset: BuiltInPreset) => {
    const res = await fetch(preset.url);
    if (!res.ok) {
      throw new Error(
        `Failed to load mapping preset "${preset.label}" (${res.status}). ` +
          "If you just added this preset, run `yarn sync` to copy the file into public/wingfont/.",
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new Error(
        `Got HTML when fetching ${preset.url} — the file isn't in ` +
          "public/wingfont/. Run `yarn sync` (or restart `yarn dev`) " +
          "to copy the built-in mappings into place.",
      );
    }
    setMappings(parseCsvToRows(await res.text()));
    setMappingsPresetKey(preset.key);
  }, []);

  const loadDefaultMappings = useCallback(
    () => loadMappingsPreset(DEFAULT_MAPPING_PRESET),
    [loadMappingsPreset],
  );
  const loadBuiltInMappings = useCallback(
    (preset: BuiltInPreset) => loadMappingsPreset(preset),
    [loadMappingsPreset],
  );

  const loadMappingsFromCsvText = useCallback((csv: string) => {
    setMappings(parseCsvToRows(csv));
    setMappingsPresetKey(null);
  }, []);
  const exportMappingsAsCsv = useCallback(
    () => serialiseRowsToCsv(mappings),
    [mappings],
  );

  // --- Step 3: parameters ----------------------------------------------
  const [params, setParams] = useState<GenerateParams>({
    baseScale: 0.75,
    // UPM-independent (normalized in build_glyph.py): a fraction of the
    // output em, so this renders at a consistent size for any annotation
    // font (NotoSerif 2048-UPM, Huninn 1024, Google/Noto 1000, …).
    annoScale: 0.25,
    annoSpacing: 0,
    yOffsetRatio: 0.8,
    invert: false,
    optimize: true,
    familyName: "MyWingFont",
    // `丅` (U+4E05) is the historical default — a rare Han character
    // that won't collide with normal text. Users can change this in
    // Step 3 if they prefer something easier to type with their IME.
    triggerChar: "丅",
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
        annoSpacing: params.annoSpacing,
        upperYOffsetRatio: params.yOffsetRatio,
        invert: params.invert,
        optimize: params.optimize,
        baseAxisLocation: baseFont.axisLocation,
        annoAxisLocation: annoFont.axisLocation,
        triggerChar: params.triggerChar,
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
  // Declared before the live-preview machinery because the
  // auto-trigger useEffect below depends on currentStep (preview only
  // fires while the user is actually on Step 3).
  const [currentStep, setCurrentStep] = useState(0);

  // --- Live parameter-tuning preview -----------------------------------
  //
  // Auto-fires whenever the user is on Step 3 and any input that
  // affects the output (mappings, fonts, params) changes. Rapid input —
  // dragging a slider, typing a family name — is debounced so we
  // launch at most one preview per quiet window.
  //
  // Run path is the SAME generateFont() entry as the full generation,
  // but with a CSV containing only one mapping row (the one with the
  // longest base-character string, capped at 4 chars). Because the
  // bulk of the pipeline scales with N mappings, the single-row run
  // collapses to ~2–4 s.
  //
  // ── Cancellation note ────────────────────────────────────────────
  // Pyodide runs Python synchronously inside its worker; the worker
  // has no API to interrupt the current Python call. So we can't
  // truly cancel an in-flight preview. Instead we serialize:
  //   • At most one run is in flight at a time.
  //   • If new inputs arrive while one is running we set
  //     `needsRerunRef` and the run-in-progress, on settle, kicks off
  //     a fresh run with the latest inputs.
  //   • A run that completes while `needsRerunRef` is set has its
  //     result DROPPED (the result is for stale inputs).
  // The cost is one stale background run worth of CPU per coalesced
  // burst of changes. The alternative — terminate + recreate the
  // worker — would force a fresh Pyodide download (~10 MB), which is
  // much worse than letting the stale run finish quietly.
  //
  // The preview lives in its own state slots so it doesn't trample
  // `progressLog` / `progress` / `result` from a real run. Its
  // @font-face registration uses a distinct family-name so a preview
  // and a full result can be visible at the same time on the page.

  const PREVIEW_DEBOUNCE_MS = 800;

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewStatus, setPreviewStatus] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const installedPreviewFaceRef = useRef<FontFace | null>(null);

  // Debounce timer + orchestration flags. Refs (not state) because
  // they shouldn't trigger re-renders — they only steer the next
  // scheduling decision.
  const previewDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isPreviewRunningRef = useRef(false);
  const needsRerunRef = useRef(false);

  // Snapshot of the latest inputs, kept in sync via useEffect below.
  // The async executor reads from this ref (not closure-captured
  // values) so when the in-flight run finally completes we can decide
  // whether to apply or drop its result based on the FRESHEST inputs,
  // not the ones we started with.
  const previewInputsRef = useRef({
    baseFont,
    annoFont,
    mappings,
    params,
    previewText,
  });
  useEffect(() => {
    previewInputsRef.current = {
      baseFont,
      annoFont,
      mappings,
      params,
      previewText,
    };
  });

  const executePreview = useCallback(async (): Promise<void> => {
    const {
      baseFont: bf,
      annoFont: af,
      mappings: ms,
      params: ps,
      previewText: pt,
    } = previewInputsRef.current;

    if (!bf.bytes && !bf.isDefault) return;
    if (!af.bytes && !af.isDefault) return;
    if (ms.length === 0) return;

    // ── Sample / row selection ───────────────────────────────────
    //
    // Two paths:
    //
    //   • Custom-text path: the user typed something in the
    //     "Preview text" field. We include every mapping whose
    //     `chars` are entirely covered by the user's text (so e.g.
    //     a "銀行" mapping is used when the user typed "去銀行" but
    //     skipped when they typed "我"). The rendered text IS the
    //     user's text — chars without matching mappings just show
    //     as the unannotated base glyph.
    //
    //   • Auto-pick path: no user text. Filter to mappings with ≤4
    //     base chars (keeps the rendered glyph large) and pick the
    //     longest base-char string (ties broken on annotation
    //     length). Rendered text is just that one row's chars.
    let sampleRows: MappingRow[];
    let sampleText: string;
    const trimmedPt = pt.trim();
    const isCustomText = trimmedPt.length > 0;
    if (isCustomText) {
      sampleText = trimmedPt;
      const textChars = new Set(trimmedPt);
      sampleRows = ms.filter((row) =>
        // Every char in the mapping's `chars` must appear in the
        // user's text. Empty `chars` would match trivially but the
        // CSV parser already filters those out.
        [...row.chars].every((c) => textChars.has(c)),
      );
      // Fallback: no mapping matched. Run anyway with an empty CSV
      // — the preview will show the user's text in the unannotated
      // base font, which is still useful feedback ("none of my
      // mappings cover this text yet").
    } else {
      const candidates = ms.filter((m) => m.chars.length <= 4);
      const pool = candidates.length > 0 ? candidates : ms;
      const score = (row: MappingRow) =>
        row.chars.length * 1000 + row.annos.length;
      const auto = pool.reduce(
        (best, row) => (score(row) > score(best) ? row : best),
        pool[0],
      );
      sampleRows = [auto];
      sampleText = auto.chars;
    }

    isPreviewRunningRef.current = true;
    needsRerunRef.current = false;
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewStatus("");

    try {
      const baseBytes = bf.bytes ?? (await fetchAndCache(DEFAULT_BASE_URL));
      const annoBytes = af.bytes ?? (await fetchAndCache(DEFAULT_ANNO_URL));
      // Empty CSV is valid — Python returns a font with no
      // annotation rules, which renders the user's text in the base
      // font (a useful "no mapping matched" state).
      const csvText =
        sampleRows.length > 0 ? serialiseRowsToCsv(sampleRows) : "";

      const r = await generateFont({
        baseFontBytes: baseBytes.slice(0),
        annoFontBytes: annoBytes.slice(0),
        mappingCsvText: csvText,
        // Distinct family-name so a preview and a full result can
        // coexist in @font-face registry without colliding.
        newFamilyName: `${ps.familyName || "MyWingFont"}_preview`,
        baseScale: ps.baseScale,
        annoScale: ps.annoScale,
        annoSpacing: ps.annoSpacing,
        upperYOffsetRatio: ps.yOffsetRatio,
        invert: ps.invert,
        baseAxisLocation: bf.axisLocation,
        annoAxisLocation: af.axisLocation,
        // Match the user's chosen trigger char so the preview's liga
        // rules use the same separator the real generate would.
        triggerChar: ps.triggerChar,
        // Subsetting on a single-mapping run has nothing to drop, so
        // it costs the same regardless. Honour the user's choice for
        // consistency with the full run they'll trigger later.
        optimize: ps.optimize,
        // Ask the runner to swap in pre-trimmed font bytes if the
        // pre-trim cache (populated by the background prepare-trim
        // effect below) is warm with this font pair. This is the
        // optimisation that drops preview latency from 2–4 s to
        // <1 s. The runner safely no-ops on cache miss, so it's
        // harmless if the prepare call hasn't completed yet — first
        // preview is then slow, subsequent ones are fast.
        useTrimCache: true,
        onProgress: (msg) => {
          // Drive only the small preview status indicator; do NOT
          // touch the main progressLog (Step 4 owns that — it's the
          // record of the eventual full run, not the previews).
          setPreviewStatus(msg);
        },
      });

      // Stale-result guard: if a newer request arrived while we were
      // running, this result is for inputs the user has already
      // discarded. Drop it and let the rerun produce the up-to-date
      // glyph. Without this guard the UI would flash the stale glyph
      // for a moment before the rerun's result overwrote it.
      if (needsRerunRef.current) {
        return;
      }

      const family = `wingfont-preview-sample-${++familyCounter}`;
      if (installedPreviewFaceRef.current) {
        document.fonts.delete(installedPreviewFaceRef.current);
        installedPreviewFaceRef.current = null;
      }
      const face = await installFontBlob(r.woffBlob, family);
      installedPreviewFaceRef.current = face;

      setPreviewResult({
        woffBlob: r.woffBlob,
        installedFamily: family,
        sampleText,
        sampleRows,
        isCustomText,
      });
      setPreviewStatus("");
    } catch (err) {
      // Errors from a stale run are also dropped — the rerun will
      // produce its own success or failure with the current inputs.
      if (!needsRerunRef.current) {
        setPreviewError(err instanceof Error ? err.message : String(err));
        setPreviewStatus("");
      }
    } finally {
      isPreviewRunningRef.current = false;
      setIsPreviewing(false);

      // If new inputs arrived during the run, kick off another. Use
      // setTimeout(0) to break out of the current call stack so we
      // don't grow it on repeated reruns; the next iteration also
      // reads fresh from previewInputsRef so it always uses the
      // user's latest values.
      if (needsRerunRef.current) {
        needsRerunRef.current = false;
        setTimeout(() => executePreview(), 0);
      }
    }
  }, []);

  /**
   * Public manual trigger. Called both by the auto-effect below
   * (debounced) and exposed on the context for tests / future UI
   * affordances. The debounce coalesces rapid input bursts.
   */
  const runPreview = useCallback(() => {
    if (previewDebounceTimerRef.current !== null) {
      clearTimeout(previewDebounceTimerRef.current);
    }
    previewDebounceTimerRef.current = setTimeout(() => {
      previewDebounceTimerRef.current = null;
      if (isPreviewRunningRef.current) {
        // A run is in flight — mark for rerun so its finally{} block
        // restarts with the now-current inputs.
        needsRerunRef.current = true;
      } else {
        executePreview();
      }
    }, PREVIEW_DEBOUNCE_MS);
  }, [executePreview]);

  // Auto-trigger: any change to inputs while the user is on Step 3
  // schedules a debounced preview. We deliberately gate on
  // `currentStep === 2` so editing mappings on Step 2 doesn't burn
  // Pyodide cycles for a preview the user isn't looking at — they'll
  // get a fresh preview when they navigate to Step 3.
  //
  // We also skip while `isGenerating` is true: the Pyodide worker is
  // single-threaded, and any preview message we send would queue
  // behind the user's full-run Generate and starve it of CPU.
  useEffect(() => {
    // Step indices: 0=fonts, 1=mappings, 2=params, 3=log, 4=preview.
    // Only Step 3 (params) shows the live preview.
    if (currentStep !== 2) return;
    if (isGenerating) return;
    if (!runtimeReady) return;
    if (mappings.length === 0) return;
    if (!baseFont.bytes && !baseFont.isDefault) return;
    if (!annoFont.bytes && !annoFont.isDefault) return;

    runPreview();
  }, [
    currentStep,
    isGenerating,
    runtimeReady,
    mappings,
    baseFont,
    annoFont,
    params,
    previewText,
    runPreview,
  ]);

  // Cancel pending preview work the moment the user navigates away
  // from Step 3 OR clicks the full-run Generate button. Without this:
  //
  //   • a debounce timer scheduled in Step 3 can still fire after
  //     the user has clicked Next, queueing a preview behind the
  //     Generate request and starving it of worker CPU.
  //   • an in-flight preview's `finally` block would see
  //     `needsRerunRef === true` (because new inputs arrived just
  //     before navigation) and kick off ANOTHER preview, blocking
  //     Generate for a second time.
  //
  // Clearing the timer + flag here makes "leaving Step 3" a clean
  // cancellation: the worker finishes whatever was already running
  // (we can't stop Python mid-execution) but nothing new queues.
  useEffect(() => {
    if (currentStep !== 2 || isGenerating) {
      if (previewDebounceTimerRef.current !== null) {
        clearTimeout(previewDebounceTimerRef.current);
        previewDebounceTimerRef.current = null;
      }
      needsRerunRef.current = false;
    }
  }, [currentStep, isGenerating]);

  // Clean up the debounce timer on unmount so a navigation away
  // doesn't fire a stale preview into a torn-down context.
  useEffect(() => {
    return () => {
      if (previewDebounceTimerRef.current !== null) {
        clearTimeout(previewDebounceTimerRef.current);
      }
    };
  }, []);

  // --- Background pre-trim of input fonts ------------------------------
  //
  // Fires preparePreviewFonts() in the worker whenever the fonts or
  // mappings settle. The worker uses fontTools' subset to produce
  // small (~50 KB) versions of the input fonts containing only the
  // chars any future preview might need, and caches them in Pyodide.
  // The next preview that sets `useTrimCache: true` picks up the
  // cache and runs in <1 s instead of 2–4 s.
  //
  // Triggered while the user is on Step 2 OR Step 3 (currentStep ∈
  // {1, 2}) so by the time they finish editing mappings and click
  // into Step 3 the trim is almost always done. A 1.5 s debounce
  // coalesces rapid mapping edits — the trim itself takes 2–3 s,
  // longer than the preview's debounce, so we don't want to fire it
  // on every keystroke.
  //
  // Critically, the gate STOPS at Step 4: once the user is running
  // the full-pipeline Generate, we don't want a pre-trim message
  // queued behind it on the single-threaded Pyodide worker. Same
  // reason we also skip while `isGenerating` is true.
  //
  // The runner is idempotent: if the cache already covers these
  // inputs, the call returns instantly without redoing work.
  const PRETRIM_DEBOUNCE_MS = 1500;
  const preTrimDebounceTimerRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const preTrimInFlightRef = useRef(false);

  useEffect(() => {
    // Only fire on Step 2 or Step 3. Pre-trim is irrelevant outside
    // the preview-tuning window and dangerous to fire afterwards
    // because it ties up the Pyodide worker that Step 4's Generate
    // needs.
    if (currentStep < 1 || currentStep > 2) return;
    if (isGenerating) return;
    if (!runtimeReady) return;
    if (mappings.length === 0) return;
    if (!baseFont.bytes && !baseFont.isDefault) return;
    if (!annoFont.bytes && !annoFont.isDefault) return;

    if (preTrimDebounceTimerRef.current !== null) {
      clearTimeout(preTrimDebounceTimerRef.current);
    }

    preTrimDebounceTimerRef.current = setTimeout(async () => {
      preTrimDebounceTimerRef.current = null;
      // If a previous trim is still running, skip — the worker
      // serialises requests anyway, but stacking them up just wastes
      // work. The latest mappings/fonts will trigger another effect
      // pass after the in-flight one finishes (state still changes
      // re-fire useEffect dependencies).
      if (preTrimInFlightRef.current) return;

      try {
        preTrimInFlightRef.current = true;
        const baseBytes =
          baseFont.bytes ?? (await fetchAndCache(DEFAULT_BASE_URL));
        const annoBytes =
          annoFont.bytes ?? (await fetchAndCache(DEFAULT_ANNO_URL));

        // Build the char union from every mapping row that could
        // ever become the sampled row (chars.length ≤ 4). Including
        // both base chars AND annotation chars covers all the
        // glyphs the preview pipeline might need to keep.
        const charSet = new Set<string>();
        for (const row of mappings) {
          if (row.chars.length > 4) continue;
          for (const c of row.chars) charSet.add(c);
          for (const c of row.annos) charSet.add(c);
        }
        // Fall back to the full pool if no row qualified (matches
        // the sample-selection fallback in executePreview).
        if (charSet.size === 0) {
          for (const row of mappings) {
            for (const c of row.chars) charSet.add(c);
            for (const c of row.annos) charSet.add(c);
          }
        }
        // Also include any chars the user typed into the "Preview
        // text" field, otherwise a char they want to preview that
        // isn't in any mapping yet would be missing from the
        // trimmed font and would fail to render.
        for (const c of previewText) charSet.add(c);
        const charsText = Array.from(charSet).join("");

        await preparePreviewFonts({
          baseFontBytes: baseBytes.slice(0),
          annoFontBytes: annoBytes.slice(0),
          charsText,
        });
      } catch {
        // Best-effort. A failed prepare just means the next preview
        // takes the slow path — not user-facing.
      } finally {
        preTrimInFlightRef.current = false;
      }
    }, PRETRIM_DEBOUNCE_MS);
  }, [
    currentStep,
    isGenerating,
    runtimeReady,
    mappings,
    baseFont,
    annoFont,
    previewText,
  ]);

  // Cancel any pending pre-trim debounce the moment the user
  // navigates past Step 3 or starts a full generation. Without this,
  // a debounce timer scheduled in Step 3 could still fire after the
  // user clicked Generate, queueing pre-trim work behind the user's
  // actual generation on the single-threaded Pyodide worker.
  useEffect(() => {
    if (currentStep < 1 || currentStep > 2 || isGenerating) {
      if (preTrimDebounceTimerRef.current !== null) {
        clearTimeout(preTrimDebounceTimerRef.current);
        preTrimDebounceTimerRef.current = null;
      }
    }
  }, [currentStep, isGenerating]);

  // Cancel any pending pre-trim debounce on unmount.
  useEffect(() => {
    return () => {
      if (preTrimDebounceTimerRef.current !== null) {
        clearTimeout(preTrimDebounceTimerRef.current);
      }
    };
  }, []);

  const value = useMemo<GenerateContextValue>(
    () => ({
      baseFont,
      annoFont,
      setBaseFont,
      setAnnoFont,
      setBaseFontAxisValue,
      setAnnoFontAxisValue,
      loadDefaultBaseFont,
      loadDefaultAnnoFont,
      loadBuiltInBaseFont,
      loadBuiltInAnnoFont,
      baseFontLoading,
      annoFontLoading,
      mappings,
      setMappings: setMappingsAndUntag,
      addMapping,
      updateMapping,
      deleteMapping,
      clearMappings,
      loadDefaultMappings,
      loadBuiltInMappings,
      loadMappingsFromCsvText,
      exportMappingsAsCsv,
      mappingsPresetKey,
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
      runPreview,
      isPreviewing,
      previewResult,
      previewStatus,
      previewError,
      previewText,
      setPreviewText,
      currentStep,
      setCurrentStep,
    }),
    [
      baseFont,
      annoFont,
      setBaseFont,
      setAnnoFont,
      setBaseFontAxisValue,
      setAnnoFontAxisValue,
      loadDefaultBaseFont,
      loadDefaultAnnoFont,
      loadBuiltInBaseFont,
      loadBuiltInAnnoFont,
      baseFontLoading,
      annoFontLoading,
      mappings,
      setMappingsAndUntag,
      addMapping,
      updateMapping,
      deleteMapping,
      clearMappings,
      loadDefaultMappings,
      loadBuiltInMappings,
      loadMappingsFromCsvText,
      exportMappingsAsCsv,
      mappingsPresetKey,
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
      runPreview,
      isPreviewing,
      previewResult,
      previewStatus,
      previewError,
      previewText,
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
  // Vite's dev-server SPA fallback returns index.html for any 404,
  // so a missing font file would otherwise sneak HTML in here as
  // ArrayBuffer and crash much later inside Pyodide. Detect and
  // reject early with an actionable message.
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `Got HTML when fetching ${url} — the file isn't in ` +
        "public/wingfont/. Run `yarn sync` (or restart `yarn dev`).",
    );
  }
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
