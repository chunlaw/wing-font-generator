import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import opentype from "opentype.js";
import Papa from "papaparse";
import { loadFont as loadFontToDocument } from "./utils";
import { AVAILABLE_FONTS, FontOption } from "./utils/const";

interface AppContextState {
  msg: string;
  pickedFonts: FontOption[],
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
}

const AppContext = React.createContext({} as AppContextValue);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppContextState>(DEFAULT_STATE);
  const loadedFonts = useRef<Record<string, boolean>>({})

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

  const loadFont = useCallback((font: FontOption) => {
    if ( loadedFonts.current[font.name] ) return Promise.resolve();
    return loadFontToDocument(font.name, font.source)
  }, []);

  const addPickedFont = useCallback((lang: string, fontName: string) => {
    setState(prev => ({
      ...prev,
      pickedFonts: [AVAILABLE_FONTS[lang].fonts[fontName], ...prev.pickedFonts]
    }))
  }, [])

  const removePickedFont = useCallback((idx: number) => {
    setState(prev => ({
      ...prev,
      pickedFonts: prev.pickedFonts.filter((_, _idx) => idx !== _idx)
    }))
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
};
