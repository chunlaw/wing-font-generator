/// <reference lib="webworker" />
/**
 * wingfontWorker — runs wing-font.py inside Pyodide.
 *
 * Lifecycle:
 *   1. On first message the worker downloads Pyodide from a CDN, loads the
 *      fonttools + brotli packages, fetches the bundled Python sources and
 *      writes them into Pyodide's MEMFS at /home/pyodide/wingfont/.
 *   2. Subsequent generate requests reuse the already-loaded interpreter.
 *   3. After Python returns the TTF, the worker generates the WOFF in
 *      pure JS via the browser's CompressionStream — much faster than
 *      asking Pyodide to do it.
 *
 * Wire protocol (main thread → worker):
 *   { type: "init" }
 *   { type: "generate", id, payload: GeneratePayload }
 *
 * Wire protocol (worker → main thread):
 *   { type: "ready" }
 *   { type: "progress", id?, message }
 *   { type: "result", id, ttf: ArrayBuffer, woff: ArrayBuffer, stdout: string }
 *   { type: "error", id?, message }
 */
import { ttfToWoff } from "../utils/ttfToWoff";

// Pyodide does not ship ES-module typings on its CDN bundle, so we declare
// just enough to keep TypeScript honest.
declare const self: DedicatedWorkerGlobalScope;

interface PyodideAPI {
  loadPackage: (names: string | string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  FS: {
    mkdirTree: (path: string) => void;
    writeFile: (path: string, data: Uint8Array | string) => void;
  };
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
  setStdout: (opts: { batched?: (s: string) => void }) => void;
  setStderr: (opts: { batched?: (s: string) => void }) => void;
  toPy: (obj: unknown) => unknown;
}

interface PyodideModule {
  loadPyodide: (opts: { indexURL: string }) => Promise<PyodideAPI>;
}

// Pin the Pyodide version explicitly. Bumping it can require code changes
// — Pyodide's package list and CPython version shift between releases. To
// rebump in future:
//   1) Change this string.
//   2) Verify the new release ships the packages we loadPackage() below
//      (currently fontTools + brotli). Check the matching pyodide-lock.json
//      at the same CDN path.
//   3) If we ever start pulling third-party wheels (e.g. uharfbuzz) via
//      micropip.install(<url>), the wheel filename's `cpXYZ` and
//      `pyodide_YYYY_N` ABI tags must match this Pyodide release.
//   4) Smoke-test the full Cantonese pipeline before merging.
//
// 0.29.4 (current stable as of June 2026) was picked when we needed
// uharfbuzz support, because uharfbuzz's prebuilt Pyodide wheels target
// recent Pyodide ABIs. Bumping from 0.27.2 in one shot avoids hunting
// for an older uharfbuzz wheel that matched the old ABI.
const PYODIDE_VERSION = "0.29.4";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
// We load the ES-module build (pyodide.mjs) via dynamic import() rather
// than the legacy classic-script build (pyodide.js) via importScripts().
// Vite builds this worker as a module worker, and the spec forbids
// importScripts() inside module workers — the browser surfaces this as
// "Module scripts don't support importScripts()". Dynamic import works
// in both classic and module workers, so this is the portable choice.
const PYODIDE_ESM = `${PYODIDE_INDEX}pyodide.mjs`;

// The wing-font Python sources we ship under /public/wingfont/. They must
// match the layout that wingfont_main.py expects (it does
// `from mappings.csv_parser import load_mapping`).
//
// `src` is intentionally a leading-slash (origin-absolute) path. The
// worker's own URL lives under /src/workers/... in Vite dev and under
// /assets/... in a production build, so relative paths would resolve
// to non-existent locations like /src/workers/wingfont/runner.py and
// trigger Vite's SPA fallback (which silently returns index.html as
// HTML — Python then chokes on `//` as an "unterminated string"). The
// leading slash forces resolution from the origin where /public/ is
// served from.
//
// If you ever deploy with a non-root Vite `base` (e.g. base: "/app/"),
// either prepend that base here or, better, plumb import.meta.env.BASE_URL
// from the main thread through the init message.
const PY_FILES: { src: string; dest: string }[] = [
  { src: "/wingfont/wingfont_main.py", dest: "/home/pyodide/wingfont/wingfont_main.py" },
  { src: "/wingfont/build_glyph.py", dest: "/home/pyodide/wingfont/build_glyph.py" },
  { src: "/wingfont/chain_context_handler.py", dest: "/home/pyodide/wingfont/chain_context_handler.py" },
  { src: "/wingfont/liga_handler.py", dest: "/home/pyodide/wingfont/liga_handler.py" },
  { src: "/wingfont/utils.py", dest: "/home/pyodide/wingfont/utils.py" },
  { src: "/wingfont/runner.py", dest: "/home/pyodide/wingfont/runner.py" },
  { src: "/wingfont/mappings/__init__.py", dest: "/home/pyodide/wingfont/mappings/__init__.py" },
  { src: "/wingfont/mappings/csv_parser.py", dest: "/home/pyodide/wingfont/mappings/csv_parser.py" },
];

let pyodideReady: Promise<PyodideAPI> | null = null;

function post(msg: Record<string, unknown>, transfer?: Transferable[]): void {
  if (transfer && transfer.length) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

function emitProgress(message: string, id?: string): void {
  post({ type: "progress", id, message });
}

async function fetchToBytes(path: string): Promise<Uint8Array> {
  // `path` is an origin-absolute URL (starts with "/"). Resolving against
  // `self.location.origin` (just scheme + host + port) — never against
  // `self.location.href` — keeps us independent of where Vite parks the
  // worker bundle (/src/workers/... in dev vs /assets/... in prod).
  const url = self.location.origin + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  // Guard against Vite's SPA fallback returning index.html (HTML) when
  // the file isn't actually there. Without this check Python sees the
  // <script> body and reports a confusing "unterminated string literal".
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `Expected ${url} but got HTML — has yarn sync run? ` +
        "Run `yarn sync` (or restart `yarn dev`) to populate public/wingfont/.",
    );
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function ensurePyodide(): Promise<PyodideAPI> {
  if (pyodideReady) return pyodideReady;
  pyodideReady = (async () => {
    emitProgress("Loading Pyodide runtime...");
    // Dynamic import of the ESM build. The `/* @vite-ignore */` hint
    // stops Vite from trying to follow this URL at build time — we want
    // the import resolved at runtime in the browser, by the worker
    // itself, against jsdelivr's CDN.
    const pyodideModule: PyodideModule = await import(
      /* @vite-ignore */ PYODIDE_ESM
    );
    const pyodide = await pyodideModule.loadPyodide({
      indexURL: PYODIDE_INDEX,
    });

    emitProgress("Loading fonttools, brotli, micropip (one-time download)...");
    // `micropip` is the pure-Python wheel installer we use to pull in
    // `uharfbuzz` below. It's a Pyodide-shipped package so it loads
    // alongside fontTools without a separate fetch.
    await pyodide.loadPackage(["fonttools", "brotli", "micropip"]);

    emitProgress("Installing wing-font scripts into virtual filesystem...");
    pyodide.FS.mkdirTree("/home/pyodide/wingfont/mappings");
    for (const { src, dest } of PY_FILES) {
      const bytes = await fetchToBytes(src);
      pyodide.FS.writeFile(dest, bytes);
    }

    // Install uharfbuzz from a wheel hosted in our public/ folder.
    // PyPI doesn't host emscripten/wasm wheels, so we ship the
    // wheel locally (see python/wheels/README.md). The filename
    // here MUST match the file copied by sync-python.mjs's MANIFEST
    // entry; if you bump uharfbuzz or change the Pyodide ABI,
    // update both in lockstep.
    //
    // The wheel is ~940 KB; install adds ~2-3 s to first-time boot
    // but is cached by the browser thereafter. The 0.55.0 wheel is
    // cp310-abi3 (PEP 384 stable ABI) so it works against any
    // CPython 3.10+ Pyodide ships.
    //
    // ABI tag: pyodide_2025_0 = emscripten-4.0.9 + Python 3.13,
    // which is what Pyodide 0.29.4 actually serves. The earlier
    // "0.29 uses Python 3.12" guidance was about the 0.29.0
    // line — 0.29.4 was bumped to 3.13. If you ever see micropip
    // reject the wheel with "platform … is not compatible with
    // Pyodide's platform 'emscripten-X.Y.Z-wasm32'", read the
    // emscripten version off the error and swap to the matching
    // pyodide_YYYY_N wheel uharfbuzz ships.
    emitProgress("Installing uharfbuzz (OpenType shaping engine)...");
    const uharfbuzzUrl =
      `${self.location.origin}/wingfont/wheels/` +
      `uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl`;
    await pyodide.runPythonAsync(`
import micropip
await micropip.install("${uharfbuzzUrl}")
`);

    // Route any stray prints to a progress event so the user sees activity.
    pyodide.setStdout({ batched: (s: string) => emitProgress(s) });
    pyodide.setStderr({ batched: (s: string) => emitProgress(`[stderr] ${s}`) });

    // Preload the runner module; this also surfaces any syntax errors early.
    await pyodide.runPythonAsync(`
import sys
if "/home/pyodide/wingfont" not in sys.path:
    sys.path.insert(0, "/home/pyodide/wingfont")
import runner
`);

    emitProgress("Pyodide ready.");
    post({ type: "ready" });
    return pyodide;
  })().catch((err) => {
    pyodideReady = null;
    post({ type: "error", message: `Init failed: ${err?.message ?? err}` });
    throw err;
  });
  return pyodideReady;
}

interface GeneratePayload {
  baseFontBytes: ArrayBuffer;
  annoFontBytes: ArrayBuffer;
  mappingCsvText: string;
  newFamilyName?: string | null;
  baseScale?: number;
  annoScale?: number;
  /** Em-units. Forwarded as `anno_spacing` to the Python runner. */
  annoSpacing?: number;
  upperYOffsetRatio?: number;
  invert?: boolean;
  optimize?: boolean;
  /** Variable-font axis locations (one entry per axis tag). Forwarded
   *  to fontTools' `getGlyphSet(location=...)` and HarfBuzz's
   *  `set_variations(...)`. Null / undefined means "use the font's
   *  default instance" (the existing non-variable behaviour). */
  baseAxisLocation?: Record<string, number> | null;
  annoAxisLocation?: Record<string, number> | null;
  /**
   * If true, ask the runner to swap in pre-trimmed font bytes from
   * the in-Pyodide cache (populated by `prepare-preview-fonts`).
   * Used by the live-preview path to skip the slow input-font load
   * and full-font subset on the original 10-20 MB CJK file.
   */
  useTrimCache?: boolean;
  /**
   * Override-trigger character for the IME-friendly variant path
   * (`<base><trigger><numeral>` → variant N). Forwarded to the
   * Python runner as `trigger_char`. Default `丅` (U+4E05); empty
   * string disables the trigger+numeral path while keeping the
   * digit-suffix path (`<base><1-9>`) intact.
   */
  triggerChar?: string;
}

interface PrepareTrimPayload {
  baseFontBytes: ArrayBuffer;
  annoFontBytes: ArrayBuffer;
  /** Concatenated chars that any future preview might want to render.
   *  Typically the union of all chars from all sample-eligible
   *  mapping rows. */
  charsText: string;
}

async function handleGenerate(id: string, payload: GeneratePayload): Promise<void> {
  const pyodide = await ensurePyodide();

  // Move the input buffers into Python land as bytes objects. We use
  // pyodide.globals to avoid serialising large arrays through runPython
  // string interpolation.
  pyodide.globals.set("_base_bytes", new Uint8Array(payload.baseFontBytes));
  pyodide.globals.set("_anno_bytes", new Uint8Array(payload.annoFontBytes));
  pyodide.globals.set("_mapping_csv", payload.mappingCsvText);
  pyodide.globals.set("_progress_cb", (msg: string) =>
    emitProgress(msg, id),
  );

  const params = {
    new_family_name: payload.newFamilyName ?? null,
    base_scale: payload.baseScale ?? 0.75,
    anno_scale: payload.annoScale ?? 0.15,
    anno_spacing: payload.annoSpacing ?? 0.0,
    upper_y_offset_ratio: payload.upperYOffsetRatio ?? 0.8,
    invert: payload.invert ?? false,
    optimize: payload.optimize ?? true,
    use_trim_cache: payload.useTrimCache ?? false,
    base_axis_location: payload.baseAxisLocation ?? null,
    anno_axis_location: payload.annoAxisLocation ?? null,
    trigger_char: payload.triggerChar ?? "丅",
  };
  pyodide.globals.set("_params", pyodide.toPy(params));

  // The runner returns a Python dict-of-bytes. We convert to a JS object,
  // pull the bytes out as Uint8Arrays, and transfer the underlying buffers
  // back to the main thread (zero-copy).
  //
  // Note: we already converted `params` from a JS object to a Python dict
  // via `pyodide.toPy(params)` above. The Python side therefore receives
  // an honest-to-goodness dict — NOT a JsProxy — so it must NOT call
  // `.to_py()` on it (that method only exists on JsProxy). `**_params`
  // unpacks the dict directly into kwargs.
  const result = (await pyodide.runPythonAsync(`
from runner import generate

_result = generate(
    bytes(_base_bytes),
    bytes(_anno_bytes),
    _mapping_csv,
    progress_cb=_progress_cb,
    **_params,
)
_result
`)) as {
    toJs: (opts: { dict_converter?: typeof Object.fromEntries }) => Map<string, unknown> | Record<string, unknown>;
    destroy: () => void;
  };

  // Pyodide returns a PyProxy for the dict; convert it to JS. We ask for
  // a plain object so we can read .ttf/.woff/.stdout by key.
  const jsResult = (
    result.toJs({ dict_converter: Object.fromEntries }) as Record<string, unknown>
  );

  const ttfU8 = jsResult.ttf as Uint8Array;
  // runner.py now returns woff=None on purpose; we generate the WOFF
  // ourselves below using the browser's native CompressionStream,
  // which is dramatically faster than Pyodide's wasm-compiled zlib.
  const stdout = (jsResult.stdout as string) ?? "";

  // toJs returns a Uint8Array that *shares* memory with WASM. Copy
  // into a standalone ArrayBuffer so we can transfer ownership to the
  // main thread without leaving a dangling reference inside Pyodide.
  const ttfCopy = new Uint8Array(ttfU8).buffer;

  // Clean up the PyProxy aggressively — large generated fonts
  // otherwise sit in WASM memory until the next GC pass.
  result.destroy();
  pyodide.runPython("import gc; gc.collect()");

  // --- Generate WOFF in JS ---------------------------------------
  // Browser CompressionStream is ~20-50x faster than Pyodide's
  // wasm-zlib for this workload. We emit progress lines that match
  // the existing "Processing X..." → "Processing X... DONE" format
  // so the main thread coalesces them into the same updating-line UI.
  emitProgress("Processing WOFF wrap (JS)...", id);
  const wrapStart = performance.now();
  const woffBuffer = await ttfToWoff(ttfCopy.slice(0));
  const wrapMs = performance.now() - wrapStart;
  emitProgress(
    `Processing WOFF wrap (JS)... DONE (${(wrapMs / 1000).toFixed(1)}s)`,
    id,
  );

  post(
    { type: "result", id, ttf: ttfCopy, woff: woffBuffer, stdout },
    [ttfCopy, woffBuffer],
  );
}

/**
 * Pre-trim the input fonts in Pyodide to just the chars the user
 * might preview. The result is cached inside the Python runner; a
 * subsequent generate() with `useTrimCache: true` will swap in the
 * trimmed bytes and skip the slow input-font load and full subset.
 *
 * This handler always returns a "prepare-done" message (with cached:
 * true or false) so the main thread can resolve its promise without
 * caring about the cache path taken.
 */
async function handlePrepareTrim(
  id: string,
  payload: PrepareTrimPayload,
): Promise<void> {
  const pyodide = await ensurePyodide();

  pyodide.globals.set("_pt_base_bytes", new Uint8Array(payload.baseFontBytes));
  pyodide.globals.set("_pt_anno_bytes", new Uint8Array(payload.annoFontBytes));
  pyodide.globals.set("_pt_chars_text", payload.charsText);
  pyodide.globals.set("_pt_progress_cb", (msg: string) =>
    emitProgress(msg, id),
  );

  const result = (await pyodide.runPythonAsync(`
from runner import prepare_preview_fonts

_pt_result = prepare_preview_fonts(
    bytes(_pt_base_bytes),
    bytes(_pt_anno_bytes),
    _pt_chars_text,
    progress_cb=_pt_progress_cb,
)
_pt_result
`)) as {
    toJs: (opts: {
      dict_converter?: typeof Object.fromEntries;
    }) => Record<string, unknown>;
    destroy: () => void;
  };

  const jsResult = result.toJs({ dict_converter: Object.fromEntries }) as Record<
    string,
    unknown
  >;
  result.destroy();
  // No big buffers to clean up here, but a small gc nudges Python to
  // release the temp TTFont objects from the subset pass promptly.
  pyodide.runPython("import gc; gc.collect()");

  post({
    type: "prepare-done",
    id,
    cached: Boolean(jsResult.cached),
    elapsedS:
      typeof jsResult.elapsed_s === "number"
        ? (jsResult.elapsed_s as number)
        : undefined,
  });
}

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as {
    type: string;
    id?: string;
    payload?: GeneratePayload | PrepareTrimPayload;
  };
  if (data.type === "init") {
    ensurePyodide().catch(() => {
      /* error already posted */
    });
    return;
  }
  if (data.type === "generate") {
    const id = data.id ?? "anon";
    if (!data.payload) {
      post({ type: "error", id, message: "Missing generate payload" });
      return;
    }
    handleGenerate(id, data.payload as GeneratePayload).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      post({ type: "error", id, message });
    });
    return;
  }
  if (data.type === "prepare-preview-fonts") {
    const id = data.id ?? "anon";
    if (!data.payload) {
      post({ type: "error", id, message: "Missing prepare-trim payload" });
      return;
    }
    handlePrepareTrim(id, data.payload as PrepareTrimPayload).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      post({ type: "error", id, message });
    });
    return;
  }
  post({ type: "error", message: `Unknown message type: ${data.type}` });
});

// Self-bootstrap: start downloading Pyodide as soon as the worker spins up
// so the cold-start cost is amortised against user input time.
ensurePyodide().catch(() => {
  /* error already posted; let the explicit message handler retry */
});

export {}; // keep this file an ES module
