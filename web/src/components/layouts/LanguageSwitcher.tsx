/**
 * Two-character language toggle that mirrors the theme switcher shape:
 * a small IconButton-equivalent that fits the existing Header layout.
 *
 * Uses a plain text label rather than an icon because language is best
 * communicated by the language's own name in its own script. "中文" reads
 * as Chinese; "EN" reads as English. No iconography needed.
 */
import { IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "../../i18n/LanguageContext";

const LanguageSwitcher = () => {
  const { lang, toggleLang, t } = useTranslation();

  // The button always shows the language the user will switch TO when
  // clicked — same convention as the theme switcher (which shows the
  // mode you'd switch to, not the current mode).
  const label = lang === "zh" ? "EN" : "中";

  return (
    <Tooltip title={t("header.lang.toggle")} arrow>
      <IconButton
        onClick={toggleLang}
        color="inherit"
        aria-label={t("header.lang.toggle")}
        sx={{
          // Match the IconButton dimensions used by the theme switcher
          // but use text instead of an icon. fontSize tuned so 中文
          // (two glyphs) and EN (two glyphs) both look balanced.
          fontSize: "0.85rem",
          fontWeight: 600,
          minWidth: 40,
          letterSpacing: 0,
        }}
      >
        {label}
      </IconButton>
    </Tooltip>
  );
};

export default LanguageSwitcher;
