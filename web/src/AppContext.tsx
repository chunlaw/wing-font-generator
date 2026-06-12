import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import opentype from "opentype.js";
import Papa from "papaparse";
import { loadFont as loadFontToDocument } from "./utils";
import { AVAILABLE_FONTS, FontOption } from "./utils/const";
import {
  recentEntryToFontOption,
  useRecentFonts,
} from "./RecentFontsContext";

// Synthetic dialect group key for the user's IndexedDB-cached fonts.
// Treated as a peer of "cantonese" / "taiwanese" / etc. in
// AppContext's catalog, in FontPicker's lang dropdown, and in
// Specimen's lookup. Lives here rather than in const.ts because the
// underlying group is dynamic (built at runtime from RecentFontsContext)
// rather than a static catalog entry.
export const USER_FONTS_GROUP_KEY = "userFonts";

interface AppContextState {
  msg: string;
  pickedFonts: FontOption[],
  /**
   * Set of font NAMES currently being fetched / parsed by the
   * browser's FontFace API. Used by /showcase to render a spinner
   * next to each font card whose `.woff` hasn't finished loading
   * yet. Entries are added the moment `loadFont` begins and
   * removed in its `.finally` — so a stalled / failed network
   * fetch ALSO clears the flag, avoiding a stuck-loading state.
   *
   * Stored as a plain object (not a JS Set) so React's
   * shallow-compare in the consumers correctly re-renders when
   * the keys change.
   */
  loadingFonts: Record<string, boolean>;
}

interface AppContextValue extends AppContextState {
  setFile: (
    fileType: "baseFontFile" | "annotationFontFile" | "mappingCsv",
    file: File | null,
  ) => void;
  setMsg: (msg: string) => void;
  loadFont: (fonts: FontOption) => void;
  addPickedFont: (lang: string, fontName: string) => void;
  removePickedFont: (idx: number) => void;
  /**
   * Replace the entire pickedFonts list in one shot. Used by
   * /showcase to apply the `?fonts=…` query-string state on
   * first load — calling addPickedFont in a loop would re-trigger
   * the localStorage-sync effect once per item and pollute the
   * URL with intermediate states.
   *
   * Names that aren't in AVAILABLE_FONTS are silently dropped
   * (matches the localStorage-restore behaviour). Returns nothing —
   * fire-and-forget.
   */
  setPickedFonts: (names: string[]) => void;
}

const AppContext = React.createContext({} as AppContextValue);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppContextState>(DEFAULT_STATE);
  const loadedFonts = useRef<Record<string, boolean>>({})

  // Pull the recent-fonts list so the picked-font catalog can resolve
  // user-generated entries by name. Reading from this hook means
  // AppContext's catalog automatically updates whenever a generation
  // is saved / unpinned / cleared.
  const { entries: recentFontEntries } = useRecentFonts();
  // Memo-stable ref so addPickedFont / setPickedFonts (declared with
  // empty deps via useCallback) can read the latest list without
  // having to re-create on every recent-fonts change.
  const recentFontEntriesRef = useRef(recentFontEntries);
  useEffect(() => {
    recentFontEntriesRef.current = recentFontEntries;
  }, [recentFontEntries]);

  const setFile = useCallback(
    (
      fileType: "baseFontFile" | "annotationFontFile" | "mappingCsv",
      file: File | null,
    ) => {
      setState((prev) => ({
        ...prev,
        [fileType]: file,
      }));
      if (
        file &&
        (fileType === "baseFontFile" || fileType === "annotationFontFile")
      ) {
        file
          .arrayBuffer()
          .then((buffer) => opentype.parse(buffer))
          .then((font) => {
            setState((prev) => ({
              ...prev,
              [fileType === "baseFontFile" ? "baseFont" : "annotationFont"]:
                font,
            }));
          });
      }
      if (file && fileType === "mappingCsv") {
        file.text().then((csv) => {
          setState((prev) => ({
            ...prev,
            mapping: Papa.parse(csv).data.reduce(
              (acc: Record<string, string>, cur) => {
                const [key, value] = cur as [string, string];
                acc[key] = value;
                return acc;
              },
              {} as Record<string, string>,
            ),
          }));
        });
      }
    },
    [],
  );

  const setMsg = useCallback((msg: string) => {
    setState((prev) => ({ ...prev, msg: msg }));
  }, []);

  const loadFont = useCallback(async (font: FontOption) => {
    if (loadedFonts.current[font.name]) return;
    // User-generated fonts (from the IndexedDB recent-fonts cache)
    // are pre-registered as @font-face by RecentFontsContext on app
    // boot — they have no `source` URL because their bytes live as
    // blob: URLs scoped to that registration. Treat an empty source
    // as "already loaded, nothing to fetch" rather than letting
    // loadFontToDocument fail on an empty src descriptor.
    if (!font.source) {
      loadedFonts.current[font.name] = true;
      return;
    }
    // Mark as loading BEFORE the fetch so the UI can show a spinner
    // while the FontFace promise is pending. Browsers don't expose
    // a "is this @font-face currently fetching?" API, so we keep
    // our own bookkeeping.
    setState((prev) => ({
      ...prev,
      loadingFonts: { ...prev.loadingFonts, [font.name]: true },
    }));
    try {
      await loadFontToDocument(font.name, font.source);
      loadedFonts.current[font.name] = true;
    } finally {
      // Clear the loading flag regardless of success/failure. A
      // stuck spinner on a 404 / network error would be worse
      // than the silent fallback the browser already does to a
      // system font.
      setState((prev) => {
        const next = { ...prev.loadingFonts };
        delete next[font.name];
        return { ...prev, loadingFonts: next };
      });
    }
  }, []);

  const addPickedFont = useCallback((lang: string, fontName: string) => {
    let resolved: FontOption | undefined;
    if (lang === USER_FONTS_GROUP_KEY) {
      // User-generated fonts live in IndexedDB, exposed via the
      // RecentFontsContext list — not in AVAILABLE_FONTS. Look them
      // up by entry.id (which doubles as FontOption.name).
      const entry = recentFontEntriesRef.current.find(
        (e) => e.id === fontName,
      );
      if (entry) resolved = recentEntryToFontOption(entry);
    } else {
      resolved = AVAILABLE_FONTS[lang]?.fonts[fontName];
    }
    if (!resolved) return;
    const finalOpt = resolved;
    setState(prev => ({
      ...prev,
      pickedFonts: [finalOpt, ...prev.pickedFonts]
    }))
  }, [])

  const removePickedFont = useCallback((idx: number) => {
    setState(prev => ({
      ...prev,
      pickedFonts: prev.pickedFonts.filter((_, _idx) => idx !== _idx)
    }))
  }, [])

  const setPickedFonts = useCallback((names: string[]) => {
    // Build a flat lookup across all dialect groups so we can resolve
    // each name in O(1). Same pattern as the localStorage restore
    // path — keep them aligned so any catalog rename / removal is
    // handled identically.
    const catalog: Record<string, FontOption> = {}
    for (const group of Object.values(AVAILABLE_FONTS)) {
      for (const [name, opt] of Object.entries(group.fonts)) {
        catalog[name] = opt
      }
    }
    // Layer the user-generated recents on top — keyed by entry.id
    // (collision-free with the catalog above because built-in fonts
    // use machine names like "NotoSansHK-Noto-lshk" while user
    // entries use opaque "gen-uuid…" ids).
    for (const entry of recentFontEntriesRef.current) {
      catalog[entry.id] = recentEntryToFontOption(entry);
    }
    const resolved: FontOption[] = []
    for (const n of names) {
      const opt = catalog[n]
      if (opt) resolved.push(opt)
      // else: name no longer in catalog — drop silently. The user
      // is sharing a link from before that font was renamed/removed;
      // the URL is the source of truth and we just truncate to what
      // still works.
    }
    setState(prev => ({ ...prev, pickedFonts: resolved }))
  }, [])

  useEffect(() => {
    state.pickedFonts.map(pickedFont => loadFont(pickedFont))
    localStorage.setItem('pickedFonts', JSON.stringify(state.pickedFonts))
  }, [loadFont, state.pickedFonts])

  return (
    <AppContext.Provider
      value={{
        ...state,
        setFile,
        setMsg,
        loadFont,
        addPickedFont,
        removePickedFont,
        setPickedFonts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;

/**
 * Restore the user's previously-picked fonts from localStorage, but
 * always re-derive each font's `source` URL from the current
 * AVAILABLE_FONTS table. The persisted JSON includes the full
 * FontOption object — including a `source: "url(https://...)"` string
 * that was baked in at the time of the previous visit. If we ever
 * change the font CDN URL (e.g. moving from fonts.chunlaw.io →
 * wing-font.chunlaw.io/fonts), users who visited before the change
 * would otherwise load fonts from a domain that no longer serves them.
 *
 * Strategy: match each saved entry by `name` (the stable identifier)
 * against AVAILABLE_FONTS, and use the table's current entry verbatim.
 * Entries whose name is no longer in the catalog (font deleted, renamed)
 * are dropped silently.
 *
 * Falling back to the cantonese-lshk default keeps the showcase
 * non-empty for first-time visitors.
 */
function loadPickedFontsWithFreshUrls(): FontOption[] {
  const raw = localStorage.getItem("pickedFonts");
  const fallback = () => [Object.values(AVAILABLE_FONTS["cantonese"].fonts)[0]];
  if (!raw) return fallback();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback();
  }
  if (!Array.isArray(parsed)) return fallback();

  // Build a quick lookup of every font in every language group so we
  // don't have to search the nested catalog per saved entry.
  const catalog: Record<string, FontOption> = {};
  for (const group of Object.values(AVAILABLE_FONTS)) {
    for (const [name, opt] of Object.entries(group.fonts)) {
      catalog[name] = opt;
    }
  }

  const refreshed: FontOption[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    if (typeof name !== "string") continue;
    const current = catalog[name];
    if (current) refreshed.push(current);
    // else: drop silently — the font is no longer in the catalog
  }
  return refreshed.length > 0 ? refreshed : fallback();
}

const DEFAULT_STATE: AppContextState = {
  msg: "",
  pickedFonts: loadPickedFontsWithFreshUrls(),
  loadingFonts: {},
};
