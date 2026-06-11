/**
 * wingfont — main-thread client for the Pyodide-backed font generator.
 *
 * Wraps the worker in a singleton with a promise-based API:
 *
 *     const result = await generateFont({
 *       baseFontBytes, annoFontBytes, mappingCsvText,
 *       baseScale: 0.75, annoScale: 0.25, ...
 *       onProgress: (msg) => setStatus(msg),
 *     });
 *     // result.ttfBlob, result.woffBlob, result.stdout
 *
 * The worker is created lazily on the first call so the ~10 MB Pyodide
 * download only happens when the user actually needs it. Subsequent calls
 * reuse the warm worker.
 */

// Vite's `?worker` import builds the worker as a separate chunk and gives us
// a constructor. We pin `type: "module"` so importScripts still works while
// letting Vite pick up the TS source.
import WingfontWorker from "../workers/wingfontWorker?worker";

export interface GenerateParams {
  baseFontBytes: ArrayBuffer;
  annoFontBytes: ArrayBuffer;
  mappingCsvText: string;
  newFamilyName?: string | null;
  baseScale?: number;
  annoScale?: number;
  /** Em-units inter-glyph gap inside an annotation string.
   *  0 = no change, positive opens up, negative tightens. */
  annoSpacing?: number;
  upperYOffsetRatio?: number;
  invert?: boolean;
  optimize?: boolean;
  /** Variable-font axis location for the base font (tag → value).
   *  Null/undefined = use the font's default instance. */
  baseAxisLocation?: Record<string, number> | null;
  /** Variable-font axis location for the annotation font. */
  annoAxisLocation?: Record<string, number> | null;
  /**
   * If true, ask the runner to swap in pre-trimmed font bytes
   * (populated by an earlier `preparePreviewFonts()` call) before
   * running the pipeline. Used by the live-preview path; ignored by
   * the runner when the cache is cold or doesn't match the bytes.
   */
  useTrimCache?: boolean;
  /**
   * Override-trigger character for the IME-friendly variant path
   * (`<base><trigger><numeral>` → variant N). Default `丅` (U+4E05);
   * empty string disables the trigger+numeral path while keeping the
   * universal digit-suffix path (`<base><1-9>`) intact.
   */
  triggerChar?: string;
  onProgress?: (message: string) => void;
}

export interface GenerateResult {
  ttfBlob: Blob;
  woffBlob: Blob;
  stdout: string;
}

export interface PreparePreviewFontsParams {
  baseFontBytes: ArrayBuffer;
  annoFontBytes: ArrayBuffer;
  /** All chars any future preview might need, packed together as a
   *  single string. Whitespace is ignored by the runner. */
  charsText: string;
  onProgress?: (message: string) => void;
}

export interface PreparePreviewFontsResult {
  /** True if the cache was already warm with these inputs and no
   *  work was done. */
  cached: boolean;
  /** Wall-clock seconds the trim took, if any was performed. */
  elapsedS?: number;
}

type WorkerInbound =
  | { type: "ready" }
  | { type: "progress"; id?: string; message: string }
  | { type: "result"; id: string; ttf: ArrayBuffer; woff: ArrayBuffer; stdout: string }
  | { type: "prepare-done"; id: string; cached: boolean; elapsedS?: number }
  | { type: "error"; id?: string; message: string };

type PendingRequest =
  | {
      kind: "generate";
      resolve: (value: GenerateResult) => void;
      reject: (err: Error) => void;
      onProgress?: (message: string) => void;
    }
  | {
      kind: "prepare";
      resolve: (value: PreparePreviewFontsResult) => void;
      reject: (err: Error) => void;
      onProgress?: (message: string) => void;
    };

let worker: Worker | null = null;
const pending = new Map<string, PendingRequest>();
const globalProgress = new Set<(message: string) => void>();
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let nextId = 0;

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new WingfontWorker();

  readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  worker.addEventListener("message", (event: MessageEvent<WorkerInbound>) => {
    const data = event.data;
    switch (data.type) {
      case "ready": {
        readyResolve?.();
        break;
      }
      case "progress": {
        // Per-request progress callbacks take precedence; otherwise fall
        // through to the global subscribers (used by the boot UI to show
        // "loading runtime..." before any generate request exists).
        const target = data.id ? pending.get(data.id) : undefined;
        if (target?.onProgress) {
          target.onProgress(data.message);
        } else {
          globalProgress.forEach((cb) => cb(data.message));
        }
        break;
      }
      case "result": {
        const req = pending.get(data.id);
        if (!req) return;
        pending.delete(data.id);
        if (req.kind !== "generate") {
          req.reject(
            new Error("Got `result` message for non-generate request"),
          );
          return;
        }
        req.resolve({
          ttfBlob: new Blob([data.ttf], { type: "font/ttf" }),
          woffBlob: new Blob([data.woff], { type: "font/woff" }),
          stdout: data.stdout,
        });
        break;
      }
      case "prepare-done": {
        const req = pending.get(data.id);
        if (!req) return;
        pending.delete(data.id);
        if (req.kind !== "prepare") {
          req.reject(
            new Error("Got `prepare-done` message for non-prepare request"),
          );
          return;
        }
        req.resolve({ cached: data.cached, elapsedS: data.elapsedS });
        break;
      }
      case "error": {
        const err = new Error(data.message);
        if (data.id && pending.has(data.id)) {
          pending.get(data.id)!.reject(err);
          pending.delete(data.id);
        } else {
          // No specific request — surface to all listeners and reject any
          // in-flight requests so the UI doesn't hang forever.
          globalProgress.forEach((cb) => cb(`Error: ${data.message}`));
          pending.forEach((req) => req.reject(err));
          pending.clear();
        }
        break;
      }
    }
  });

  worker.addEventListener("error", (event) => {
    const err = new Error(event.message || "Worker crashed");
    pending.forEach((req) => req.reject(err));
    pending.clear();
  });

  return worker;
}

/**
 * Subscribe to runtime-wide progress messages (Pyodide boot, package
 * downloads). Returns an unsubscribe function. Useful for showing a
 * persistent "preparing the font engine" banner before a generate request
 * exists.
 */
export function onRuntimeProgress(cb: (message: string) => void): () => void {
  globalProgress.add(cb);
  return () => globalProgress.delete(cb);
}

/**
 * Start downloading Pyodide. Safe to call multiple times; subsequent calls
 * just return the same readiness promise. Call this on app startup or when
 * the user opens the Generate page so the cold-start runs in parallel with
 * the user picking files.
 */
export function warmUpRuntime(): Promise<void> {
  ensureWorker();
  return readyPromise ?? Promise.resolve();
}

export async function generateFont(params: GenerateParams): Promise<GenerateResult> {
  const w = ensureWorker();
  const id = `gen-${++nextId}`;

  return new Promise<GenerateResult>((resolve, reject) => {
    pending.set(id, {
      kind: "generate",
      resolve,
      reject,
      onProgress: params.onProgress,
    });

    // Both font buffers are transferred so we don't pay a copy cost on the
    // way in. (The worker still has to copy them inside WASM, but that's
    // unavoidable.)
    const transfer: Transferable[] = [params.baseFontBytes, params.annoFontBytes];

    w.postMessage(
      {
        type: "generate",
        id,
        payload: {
          baseFontBytes: params.baseFontBytes,
          annoFontBytes: params.annoFontBytes,
          mappingCsvText: params.mappingCsvText,
          newFamilyName: params.newFamilyName ?? null,
          baseScale: params.baseScale,
          annoScale: params.annoScale,
          annoSpacing: params.annoSpacing,
          upperYOffsetRatio: params.upperYOffsetRatio,
          invert: params.invert,
          optimize: params.optimize,
          useTrimCache: params.useTrimCache,
          baseAxisLocation: params.baseAxisLocation,
          annoAxisLocation: params.annoAxisLocation,
          triggerChar: params.triggerChar,
        },
      },
      transfer,
    );
  });
}

/**
 * Ask the runner to pre-trim the input fonts to just the chars the
 * user might preview, and cache the trimmed bytes in Pyodide.
 * Subsequent `generateFont` calls with `useTrimCache: true` and the
 * same input bytes will see the cache and skip the expensive
 * full-font load + subset, dropping per-preview latency from 2-4 s
 * to a few hundred ms.
 *
 * Safe to call repeatedly; the runner is idempotent (it no-ops when
 * the cache already covers the requested chars for the same font
 * pair). Cheap to call before navigating to Step 3, since the work
 * happens in the worker without blocking the UI.
 */
export async function preparePreviewFonts(
  params: PreparePreviewFontsParams,
): Promise<PreparePreviewFontsResult> {
  const w = ensureWorker();
  const id = `prep-${++nextId}`;

  return new Promise<PreparePreviewFontsResult>((resolve, reject) => {
    pending.set(id, {
      kind: "prepare",
      resolve,
      reject,
      onProgress: params.onProgress,
    });

    const transfer: Transferable[] = [
      params.baseFontBytes,
      params.annoFontBytes,
    ];

    w.postMessage(
      {
        type: "prepare-preview-fonts",
        id,
        payload: {
          baseFontBytes: params.baseFontBytes,
          annoFontBytes: params.annoFontBytes,
          charsText: params.charsText,
        },
      },
      transfer,
    );
  });
}

/**
 * Load a Blob into the document as an @font-face so subsequent text using
 * that family-name renders with the generated font. Returns the FontFace
 * handle so callers can remove the old one when regenerating.
 */
export async function installFontBlob(
  blob: Blob,
  familyName: string,
): Promise<FontFace> {
  const url = URL.createObjectURL(blob);
  try {
    const face = new FontFace(familyName, `url(${url})`, {
      style: "normal",
      weight: "400",
    });
    await face.load();
    document.fonts.add(face);
    return face;
  } finally {
    // Spec lets us revoke as soon as the FontFace finishes parsing; keeping
    // it slightly longer is harmless and avoids a race in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
