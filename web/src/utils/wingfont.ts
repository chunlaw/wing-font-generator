/**
 * wingfont — main-thread client for the Pyodide-backed font generator.
 *
 * Wraps the worker in a singleton with a promise-based API:
 *
 *     const result = await generateFont({
 *       baseFontBytes, annoFontBytes, mappingCsvText,
 *       baseScale: 0.75, annoScale: 0.15, ...
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
  upperYOffsetRatio?: number;
  invert?: boolean;
  optimize?: boolean;
  onProgress?: (message: string) => void;
}

export interface GenerateResult {
  ttfBlob: Blob;
  woffBlob: Blob;
  stdout: string;
}

type WorkerInbound =
  | { type: "ready" }
  | { type: "progress"; id?: string; message: string }
  | { type: "result"; id: string; ttf: ArrayBuffer; woff: ArrayBuffer; stdout: string }
  | { type: "error"; id?: string; message: string };

interface PendingRequest {
  resolve: (value: GenerateResult) => void;
  reject: (err: Error) => void;
  onProgress?: (message: string) => void;
}

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
        req.resolve({
          ttfBlob: new Blob([data.ttf], { type: "font/ttf" }),
          woffBlob: new Blob([data.woff], { type: "font/woff" }),
          stdout: data.stdout,
        });
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
          upperYOffsetRatio: params.upperYOffsetRatio,
          invert: params.invert,
          optimize: params.optimize,
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
