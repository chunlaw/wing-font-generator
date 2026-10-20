/**
 * LanguageContext — global current-language state plus a t(key) function.
 *
 * Bootstraps from (in order): localStorage → browser language → "en".
 * Persists to localStorage on every change so users don't have to re-pick.
 * Designed to mirror the existing ThemeContext shape so the two feel
 * consistent.
 */
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Language, TRANSLATIONS, TranslationKey } from "./translations";

interface LanguageContextValue {
  /** Currently active language. */
  lang: Language;
  /** Set the language explicitly. */
  setLang: (lang: Language) => void;
  /** Cycle through available languages (used by the header toggle). */
  toggleLang: () => void;
  /** Translate a key for the current language. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "wingfont.lang";

function detectDefaultLanguage(): Language {
  // First-time visitors: derive from navigator.language. Anything that
  // starts with "zh" (zh, zh-TW, zh-HK, zh-CN, zh-Hant, …) becomes
  // Traditional Chinese; everything else falls through to English.
  if (typeof navigator === "undefined") return "en";
  const browser = (navigator.language || "en").toLowerCase();
  return browser.startsWith("zh") ? "zh" : "en";
}

/** Language named by the URL's first segment (/zh/…, /en/…), if any. */
export function pathLang(
  pathname: string = window.location.pathname,
): Language | null {
  const seg = pathname.split("/")[1];
  return seg === "zh" || seg === "en" ? seg : null;
}

/** Point the URL's language segment at `lang` (adding one if missing), without navigating. */
export function syncPathLang(lang: Language): void {
  const { pathname, search, hash } = window.location;
  const next = pathLang(pathname)
    ? pathname.replace(/^\/(zh|en)/, `/${lang}`)
    : `/${lang}${pathname}`;
  if (next !== pathname) {
    window.history.replaceState(window.history.state, "", next + search + hash);
  }
}

export function loadInitialLanguage(): Language {
  const fromPath = pathLang();
  if (fromPath) return fromPath;
  if (typeof localStorage === "undefined") return detectDefaultLanguage();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "zh" || saved === "en") return saved;
  return detectDefaultLanguage();
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(loadInitialLanguage);

  // Persist on every change. Cheap (one string) so no debounce needed.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode / quota / etc — ignore. Language reverts on reload.
    }
    // Also update the <html lang> attribute so screen readers and search
    // engines pick the right pronunciation/segmentation rules.
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    }
  }, [lang]);

  // Back/forward across a language switch lands on the other prefix.
  useEffect(() => {
    const onPop = () => {
      const fromPath = pathLang();
      if (fromPath) setLangState(fromPath);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // URL first: App's router remounts on the new basename and reads the
  // location once, so it must already carry the new prefix.
  const setLang = useCallback((next: Language) => {
    syncPathLang(next);
    setLangState(next);
  }, []);
  const toggleLang = useCallback(
    () => setLang(lang === "zh" ? "en" : "zh"),
    [lang, setLang],
  );

  const t = useCallback<LanguageContextValue["t"]>(
    (key, vars) => {
      // Look up the key in the current language; fall back to English; if
      // that's also missing, return the raw key so missing strings are
      // visible during development rather than silently empty.
      const table = TRANSLATIONS[lang] || TRANSLATIONS.en;
      let str = table[key] ?? TRANSLATIONS.en[key] ?? key;
      if (vars) {
        // Tiny placeholder substitution: {name} → vars.name.
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <LanguageProvider>");
  }
  return ctx;
};
