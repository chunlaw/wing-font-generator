/**
 * RecentFontsContext — React surface over the IndexedDB recent-fonts
 * store.
 *
 * Responsibilities:
 *   1. Hold the current list of stored entries in memory (so React
 *      components can render off it).
 *   2. Expose save / togglePin / remove / clearAll actions that
 *      forward to the storage layer AND refresh the in-memory list.
 *   3. Register each stored font as a `@font-face` (via the FontFace
 *      Loading API) so the showcase and specimen pages can preview
 *      them with `font-family: ${entry.fontFamily}` like any other
 *      built-in font. Blob URLs are revoked on entry removal so we
 *      don't leak object URLs over a long session.
 *
 * Why a context and not just a hook:
 *   - Multiple surfaces consume the list (Step 1 chips, Step 5 save
 *     affordance, Showcase font picker, Specimen lookup). One context
 *     means one IndexedDB read on app boot, not four.
 *   - Mutations need to broadcast to every consumer. Without a shared
 *     subscription, each useRecentFonts() call would be its own
 *     stale snapshot.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearRecentFonts,
  listRecentFonts,
  MAX_PINNED,
  MAX_SLOTS,
  removeRecentFont,
  saveRecentFont,
  togglePinRecentFont,
  type RecentFontEntry,
} from "./utils/recentFonts";

interface RecentFontsContextValue {
  /** Current list, sorted newest-first. */
  entries: RecentFontEntry[];
  /** True until the initial IndexedDB read completes. */
  loading: boolean;
  /** How many of the current entries are pinned. */
  pinnedCount: number;
  /** Whether another entry can still be pinned (false at the cap). */
  canPin: boolean;
  /**
   * Save a new generation. Refreshes the in-memory list and
   * registers the new font as `@font-face`. Returns the saved entry
   * so the caller can immediately reference its id.
   */
  save: (
    partial: Omit<RecentFontEntry, "id" | "generatedAt" | "pinned">,
  ) => Promise<RecentFontEntry>;
  /**
   * Toggle pin. Resolves with `{ ok: false, reason }` if the cap is
   * hit; callers can surface the tooltip then.
   */
  togglePin: (
    id: string,
  ) => Promise<
    | { ok: true; entry: RecentFontEntry }
    | { ok: false; reason: "cap" | "not-found" }
  >;
  /** Remove a single entry. */
  remove: (id: string) => Promise<void>;
  /** Wipe everything. */
  clearAll: () => Promise<void>;
}

const RecentFontsContext = createContext<RecentFontsContextValue | undefined>(
  undefined,
);

/**
 * Provider. Mount this near the top of the app tree (above
 * BrowserRouter / Layout) so every page can call useRecentFonts.
 */
export const RecentFontsProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<RecentFontEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Track which entry IDs we've already registered as `@font-face`.
  // Each id maps to a {fontFace, blobUrl} pair so we can revoke the
  // blob URL + remove the FontFace when the entry is gone. Refs
  // because we mutate this from inside an effect without wanting
  // re-renders.
  const fontRegistryRef = useRef<
    Map<string, { fontFace: FontFace; blobUrl: string }>
  >(new Map());

  /** Reload from IndexedDB and re-sync the @font-face registry. */
  const refresh = useCallback(async () => {
    const fresh = await listRecentFonts();
    setEntries(fresh);

    // Diff against the registry: register newcomers, unregister
    // anything that disappeared (eviction / remove / clearAll).
    const registry = fontRegistryRef.current;
    const aliveIds = new Set(fresh.map((e) => e.id));

    // Unregister gone entries.
    for (const [id, { fontFace, blobUrl }] of registry.entries()) {
      if (!aliveIds.has(id)) {
        try {
          document.fonts.delete(fontFace);
        } catch {
          /* tolerate FontFace API quirks across browsers */
        }
        URL.revokeObjectURL(blobUrl);
        registry.delete(id);
      }
    }

    // Register newcomers.
    for (const entry of fresh) {
      if (registry.has(entry.id)) continue;
      try {
        // Browsers expect a BufferSource for FontFace; build a
        // fresh ArrayBuffer slice from the stored Uint8Array.
        // Generated entries always populate both ttfBytes and
        // woffBytes — uploaded entries populate only the format
        // the user gave us, with the other field being an empty
        // Uint8Array. Prefer TTF when both exist (smaller decode
        // cost than WOFF since no decompression); fall back to
        // WOFF for uploaded-WOFF-only entries.
        let bytes: Uint8Array;
        let mime: string;
        if (entry.ttfBytes && entry.ttfBytes.length > 0) {
          bytes = entry.ttfBytes;
          mime = "font/ttf";
        } else if (entry.woffBytes && entry.woffBytes.length > 0) {
          bytes = entry.woffBytes;
          // font/woff covers both .woff and .woff2 for FontFace's
          // purposes — the parser sniffs the magic anyway, so the
          // wrong-extension-vs-magic case doesn't materialise.
          mime = "font/woff";
        } else {
          // Defensive: every entry MUST have at least one populated
          // byte field. Skip registration if somehow both are
          // empty rather than throwing — the picker will just show
          // the entry as un-renderable.
          console.warn(
            `[RecentFontsContext] entry ${entry.id} has no bytes; skipping FontFace registration`,
          );
          continue;
        }
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        // Register under the opaque `entry.id` rather than the
        // user-provided `fontFamily` so two generations that share a
        // family name (e.g. user re-generated with the same Step 3
        // family field) don't collide in the @font-face registry —
        // each entry gets its own unique FontFace. The visible
        // label (`entry.displayName`) is shown in pickers; the id
        // is what CSS `font-family: ...` resolves to.
        const fontFace = new FontFace(entry.id, `url(${blobUrl})`);
        // Loading is async; we kick it off and let the browser
        // resolve. The await on load() ensures CSS using
        // `font-family: <name>` doesn't flash an undefined glyph
        // run before the bytes are parsed.
        await fontFace.load();
        document.fonts.add(fontFace);
        registry.set(entry.id, { fontFace, blobUrl });
      } catch (err) {
        console.warn(
          `[RecentFontsContext] failed to register ${entry.id}:`,
          err,
        );
      }
    }
  }, []);

  // Boot read.
  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // We intentionally don't re-run on refresh changes — the callback
    // is stable. setLoading runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (partial: Omit<RecentFontEntry, "id" | "generatedAt" | "pinned">) => {
      const entry = await saveRecentFont(partial);
      await refresh();
      return entry;
    },
    [refresh],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const result = await togglePinRecentFont(id);
      if (result.ok) {
        await refresh();
      }
      return result;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeRecentFont(id);
      await refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await clearRecentFonts();
    await refresh();
  }, [refresh]);

  const pinnedCount = useMemo(
    () => entries.filter((e) => e.pinned).length,
    [entries],
  );
  const canPin = pinnedCount < MAX_PINNED;

  const value: RecentFontsContextValue = {
    entries,
    loading,
    pinnedCount,
    canPin,
    save,
    togglePin,
    remove,
    clearAll,
  };

  return (
    <RecentFontsContext.Provider value={value}>
      {children}
    </RecentFontsContext.Provider>
  );
};

/** Consumer hook. Throws if used outside a `<RecentFontsProvider>`. */
export const useRecentFonts = (): RecentFontsContextValue => {
  const ctx = useContext(RecentFontsContext);
  if (!ctx) {
    throw new Error(
      "useRecentFonts must be called inside a <RecentFontsProvider>",
    );
  }
  return ctx;
};

// Re-export capacity constants so UI surfaces can show "N / 5 saved"
// without importing them through both files.
export { MAX_SLOTS, MAX_PINNED };

/**
 * Adapt a recent-font entry to the `FontOption` shape used by
 * AVAILABLE_FONTS / AppContext / Showcase / Specimen. The `source`
 * field is intentionally an empty string — these fonts are
 * pre-registered as @font-face by this context's refresh effect,
 * so AppContext.loadFont treats `source === ""` as "already loaded,
 * no fetch needed" (see the matching guard in AppContext.tsx).
 *
 * `name` uses the entry's opaque id so it doesn't collide with
 * built-in fonts or with other recent entries that share the same
 * displayed family name.
 */
export function recentEntryToFontOption(entry: RecentFontEntry): {
  name: string;
  displayName: string;
  source: string;
} {
  return {
    name: entry.id,
    displayName: entry.displayName,
    source: "",
  };
}
