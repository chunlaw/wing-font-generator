/**
 * Shared language metadata for the switcher, the suggestion banner and
 * the footer links. Labels are in each language's own script, so a
 * reader recognises theirs regardless of the page's current language.
 */
import { LANGUAGES, Language } from "../../i18n/translations";

export const NATIVE_NAME: Record<Language, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
};

/** Value for the `lang` / `hreflang` attribute on a language's own label. */
export const LANG_ATTR: Record<Language, string> = {
  zh: "zh-Hant",
  en: "en",
  ja: "ja",
};

const DISMISS_KEY = "wingfont.langSuggest.dismissed";

/** Never show the "also available in …" banner again (dismissed, or a language was picked by hand). */
export function dismissLangSuggestion(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage blocked — the banner may come back next visit; harmless.
  }
}

export function langSuggestionDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** The visitor's most preferred browser language that the site has, if any. */
export function preferredBrowserLanguage(): Language | null {
  if (typeof navigator === "undefined") return null;
  const prefs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of prefs) {
    const base = (tag || "").toLowerCase().split("-")[0];
    if (LANGUAGES.includes(base as Language)) return base as Language;
  }
  return null;
}
