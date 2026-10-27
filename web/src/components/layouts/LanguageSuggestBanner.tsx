/**
 * "Also available in 日本語" banner. The URL decides the page language
 * (/zh/…, /en/…, /ja/…), so a visitor who follows a shared link lands in
 * the sharer's language. When their browser prefers another language the
 * site has, offer it — in THEIR language — instead of redirecting, which
 * would break shared links and canonical URLs.
 *
 * Hidden for good once dismissed or once a language is picked by hand.
 * Never rendered under automation (navigator.webdriver), so the headless
 * prerender doesn't bake an "English available" bar into static pages.
 */
import { useEffect, useState } from "react";
import { Alert, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "../../i18n/LanguageContext";
import { Language } from "../../i18n/translations";
import {
  LANG_ATTR,
  dismissLangSuggestion,
  langSuggestionDismissed,
  preferredBrowserLanguage,
} from "./languageMeta";

const COPY: Record<Language, { message: string; action: string }> = {
  zh: { message: "本網站亦有中文版。", action: "切換至中文" },
  en: { message: "This site is also available in English.", action: "View in English" },
  ja: { message: "このサイトは日本語でもご覧いただけます。", action: "日本語で表示" },
};

const LanguageSuggestBanner = () => {
  const { lang, setLang, t } = useTranslation();
  const [suggested, setSuggested] = useState<Language | null>(null);

  useEffect(() => {
    if (navigator.webdriver || langSuggestionDismissed()) return;
    const preferred = preferredBrowserLanguage();
    setSuggested(preferred && preferred !== lang ? preferred : null);
  }, [lang]);

  if (!suggested) return null;
  const copy = COPY[suggested];
  const close = () => {
    dismissLangSuggestion();
    setSuggested(null);
  };

  return (
    <Alert
      severity="info"
      icon={<LanguageIcon fontSize="inherit" />}
      lang={LANG_ATTR[suggested]}
      sx={{ width: "100%", mt: 1, alignItems: "center" }}
      action={
        <>
          <Button
            color="inherit"
            size="small"
            sx={{ textTransform: "none", fontWeight: 600 }}
            onClick={() => {
              dismissLangSuggestion();
              setLang(suggested);
            }}
          >
            {copy.action}
          </Button>
          <IconButton
            color="inherit"
            size="small"
            aria-label={t("drawer.close")}
            onClick={close}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      }
    >
      {copy.message}
    </Alert>
  );
};

export default LanguageSuggestBanner;
