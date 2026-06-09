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

const DEFAULT_STATE: AppContextState = {
  msg: "",
  pickedFonts: JSON.parse(localStorage.getItem('pickedFonts') ?? "null") ?? [Object.values(AVAILABLE_FONTS["cantonese"].fonts)[0]],
};
