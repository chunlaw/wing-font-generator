/**
 * Recent-fonts cache — IndexedDB-backed storage of the user's most
 * recently generated annotated fonts.
 *
 * Why IndexedDB and not localStorage:
 *   - WOFF + TTF binaries are typically 0.5-5 MB. localStorage caps at
 *     ~5 MB total per origin and serialises everything through string
 *     conversion. IndexedDB handles Uint8Array natively and gives us
 *     hundreds of megabytes of room.
 *   - We need structured queries (find oldest unpinned for LRU
 *     eviction). IndexedDB indexes do that without our writing
 *     scan loops every call.
 *
 * Capacity rules (the "5-slot, 4-pin" design):
 *   - Total slots: MAX_SLOTS = 5
 *   - Pinned slots: MAX_PINNED = 4
 *   - When MAX_PINNED < MAX_SLOTS, we guarantee at least one
 *     LRU-evictable slot — so every new generation has somewhere to
 *     go without breaking the "pinned = safe" promise.
 *
 * Eviction (on save when capacity is reached):
 *   - Find the oldest UNPINNED entry by generatedAt; remove it.
 *   - The 4-of-5 cap ensures this always finds a candidate.
 *
 * Pinning:
 *   - togglePin refuses to pin a 5th entry — caller surfaces a tooltip.
 *   - Pinning an entry has no effect on generatedAt, so LRU order
 *     of OTHER pinned items is unaffected.
 *
 * Blob lifecycle:
 *   - We store raw Uint8Array bytes. Consumers create blob URLs at
 *     use time (with URL.createObjectURL) and revoke them when the
 *     entry is removed. This module doesn't manage URL lifetimes
 *     itself — that's the FontFace-registration layer's job.
 */

const DB_NAME = "wingfont";
const DB_VERSION = 1;
const STORE_NAME = "recent-fonts";

export const MAX_SLOTS = 5;
export const MAX_PINNED = 4;

/**
 * What we persist per font entry. Kept deliberately compact —
 * configuration metadata is enough to identify which font the user
 * is looking at without having to re-run the pipeline (or in the
 * case of uploads, without re-reading the file from disk).
 */
export interface RecentFontEntry {
  /**
   * Stable opaque id (used as IndexedDB primary key and as the
   * font-family suffix for CSS registration). Generated at save
   * time with crypto.randomUUID-ish format.
   */
  id: string;
  /**
   * Human-readable label for the picker chip. For generated fonts
   * defaults to the font's internal family name (user-overridable
   * via the Step 3 "family" param); for uploaded fonts defaults to
   * the file's base name without extension.
   */
  displayName: string;
  /**
   * The internal OpenType family name baked into the WOFF. Used as
   * the CSS font-family identifier when previewing.
   */
  fontFamily: string;
  /** Protected from LRU eviction. */
  pinned: boolean;
  /** Unix ms — for sorting + "X ago" copy. */
  generatedAt: number;
  /**
   * Provenance of this entry. "generated" means produced by the
   * Wing Font pipeline (Step 5 of /generate). "uploaded" means the
   * user dropped a .ttf/.otf/.woff/.woff2 file onto /showcase or
   * /specimen for comparison. Optional + defaults to "generated" so
   * existing pre-uploads entries in IndexedDB don't break — the
   * absent-field default treats them as generated, which they were.
   */
  source?: "generated" | "uploaded";
  /**
   * Minimal description of HOW the font was generated. Used to
   * distinguish chips visually ("ChironSung × Jyutping" vs.
   * "Xiaolai × Pinyin") and to surface in the chip tooltip. Empty
   * object for uploaded entries (no pipeline config to describe).
   */
  config: {
    baseFontName?: string;
    annoFontName?: string;
    mappingName?: string;
    annoScale?: number;
  };
  /**
   * Raw OpenType TTF bytes. Populated for generated fonts (always)
   * and for uploaded fonts whose original format was TTF/OTF. For
   * uploaded WOFF/WOFF2 files this is an empty Uint8Array — the
   * upload pipeline doesn't transcode formats, so the available
   * bytes live in `woffBytes` only and the chip's download menu
   * hides the unavailable format.
   */
  ttfBytes: Uint8Array;
  /**
   * Raw WOFF (compressed wrapper around TTF) bytes. Same
   * populate-or-empty rule as `ttfBytes` for uploaded entries —
   * generated entries always have both, uploaded entries have
   * exactly the format the user gave us.
   */
  woffBytes: Uint8Array;
}

// ── Inline IndexedDB wrapper ───────────────────────────────────────
// Tiny ad-hoc layer rather than the idb-keyval npm package — keeps
// the build dependency-free, and we don't need the full key-value
// abstraction. Each call opens the DB lazily, performs the op in a
// single transaction, and closes; the OS deduplicates connections
// so the overhead is negligible.

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await fn(store);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error ?? new Error("tx failed"));
      tx.onabort = () => rej(tx.error ?? new Error("tx aborted"));
    });
    return result;
  } finally {
    db.close();
  }
}

function reqPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error ?? new Error("IDB request failed"));
  });
}

// ── Public API ─────────────────────────────────────────────────────

/** List all stored entries, newest-first by generatedAt. */
export async function listRecentFonts(): Promise<RecentFontEntry[]> {
  try {
    const rows = await withStore("readonly", (store) =>
      reqPromise<RecentFontEntry[]>(store.getAll() as IDBRequest<RecentFontEntry[]>),
    );
    return rows.sort((a, b) => b.generatedAt - a.generatedAt);
  } catch (err) {
    // If IndexedDB isn't available (private-browsing, very old
    // browsers, sandboxed iframes), behave as if there's no cache.
    // Callers should never fail outright because of storage issues.
    console.warn("[recentFonts] listRecentFonts failed:", err);
    return [];
  }
}

/**
 * Save a new generation. Applies LRU eviction if the store is full:
 * removes the oldest UNPINNED entry to make room. The "4-of-5"
 * invariant (see MAX_PINNED) guarantees at least one such entry
 * always exists.
 *
 * Returns the saved entry (with assigned id + generatedAt).
 */
export async function saveRecentFont(
  partial: Omit<RecentFontEntry, "id" | "generatedAt" | "pinned"> & {
    /** Optional pre-assigned id. Used by the upload path so the
        opaque id can carry an "up-" prefix instead of the default
        "gen-" — purely cosmetic, since the id is opaque, but useful
        when inspecting IndexedDB rows. When omitted, an id is
        auto-generated with the "gen-" prefix. */
    id?: string;
    pinned?: boolean;
  },
): Promise<RecentFontEntry> {
  // Spread first so any keys we want to FORCE (id default, fresh
  // generatedAt, pinned default) override partial's undefined or
  // missing values. Previously the partial's Omit excluded id /
  // generatedAt / pinned so the order didn't matter; now that
  // partial can carry id (for upload-path opaque-id-with-prefix),
  // the order is load-bearing: spread first, then assign with ??.
  const entry: RecentFontEntry = {
    ...partial,
    id: partial.id ?? generateId(),
    generatedAt: Date.now(),
    pinned: partial.pinned ?? false,
  };

  await withStore("readwrite", async (store) => {
    // Read current state to decide whether eviction is needed.
    const all = await reqPromise<RecentFontEntry[]>(
      store.getAll() as IDBRequest<RecentFontEntry[]>,
    );

    if (all.length >= MAX_SLOTS) {
      // Find oldest unpinned. Sort ascending so [0] is the oldest.
      const unpinned = all
        .filter((e) => !e.pinned)
        .sort((a, b) => a.generatedAt - b.generatedAt);
      if (unpinned.length > 0) {
        await reqPromise(store.delete(unpinned[0].id));
      } else {
        // Defensive: shouldn't happen if MAX_PINNED < MAX_SLOTS is
        // enforced everywhere, but if we somehow ended up with all
        // slots pinned, evict the oldest pinned to make room.
        const sorted = [...all].sort((a, b) => a.generatedAt - b.generatedAt);
        await reqPromise(store.delete(sorted[0].id));
      }
    }

    await reqPromise(store.add(entry));
  });

  return entry;
}

/**
 * Toggle the pinned flag on an entry. Refuses to pin a 5th entry —
 * callers should check `canPin()` before showing a "pin" affordance,
 * or handle the returned `{ ok: false, reason: 'cap' }` result.
 */
export async function togglePinRecentFont(
  id: string,
): Promise<
  { ok: true; entry: RecentFontEntry } | { ok: false; reason: "cap" | "not-found" }
> {
  return withStore("readwrite", async (store) => {
    const entry = await reqPromise<RecentFontEntry | undefined>(
      store.get(id) as IDBRequest<RecentFontEntry | undefined>,
    );
    if (!entry) return { ok: false as const, reason: "not-found" as const };

    if (!entry.pinned) {
      // Pin path: enforce the cap.
      const all = await reqPromise<RecentFontEntry[]>(
        store.getAll() as IDBRequest<RecentFontEntry[]>,
      );
      const pinnedCount = all.filter((e) => e.pinned).length;
      if (pinnedCount >= MAX_PINNED) {
        return { ok: false as const, reason: "cap" as const };
      }
    }

    const updated: RecentFontEntry = { ...entry, pinned: !entry.pinned };
    await reqPromise(store.put(updated));
    return { ok: true as const, entry: updated };
  });
}

/** Remove a specific entry (explicit user action). */
export async function removeRecentFont(id: string): Promise<void> {
  await withStore("readwrite", (store) => reqPromise(store.delete(id)));
}

/** Wipe everything. Used by the "Clear recent fonts" affordance. */
export async function clearRecentFonts(): Promise<void> {
  await withStore("readwrite", (store) => reqPromise(store.clear()));
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Stable opaque ID generator. crypto.randomUUID() exists in modern
 * browsers; the timestamp+random fallback is for older Safari /
 * sandboxed contexts where the API isn't exposed.
 *
 * The `prefix` argument lets callers tag the origin of the entry —
 * "gen" for generated, "up" for uploaded — so a `/specimen/<id>`
 * URL hints at the provenance, and the DB browser tool shows the
 * source at a glance. The prefix is purely cosmetic; the FontFace
 * registration / lookup treats the whole id as opaque.
 */
export function generateRecentFontId(
  prefix: "gen" | "up" = "gen",
): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Kept for callers that haven't migrated to the prefixed variant yet
// (saveRecentFont below). Defaults to the "gen" prefix.
function generateId(): string {
  return generateRecentFontId("gen");
}
