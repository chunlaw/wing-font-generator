/**
 * Language picker: globe icon + the current language's own name (the
 * globe says "you can switch here", the name says what's showing now).
 * On phones only the globe shows, to save header space. Opens a menu of
 * every language, each named in its own script.
 */
import { useState } from "react";
import { Box, Button, Menu, MenuItem, Tooltip } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { useTranslation } from "../../i18n/LanguageContext";
import { LANGUAGES } from "../../i18n/translations";
import { LANG_ATTR, NATIVE_NAME, dismissLangSuggestion } from "./languageMeta";

const LanguageSwitcher = () => {
  const { lang, setLang, t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t("header.lang.toggle")} arrow>
        <Button
          onClick={(e) => setAnchor(e.currentTarget)}
          color="inherit"
          aria-label={t("header.lang.toggle")}
          aria-haspopup="menu"
          sx={{
            minWidth: 40,
            px: { xs: 1, sm: 1.25 },
            borderRadius: 5,
            textTransform: "none",
            fontWeight: 600,
            gap: 0.75,
          }}
        >
          <LanguageIcon />
          <Box
            component="span"
            lang={LANG_ATTR[lang]}
            sx={{ display: { xs: "none", sm: "inline" } }}
          >
            {NATIVE_NAME[lang]}
          </Box>
        </Button>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {LANGUAGES.map((l) => (
          <MenuItem
            key={l}
            selected={l === lang}
            lang={LANG_ATTR[l]}
            onClick={() => {
              setAnchor(null);
              // A hand-picked language is a stated preference: stop suggesting.
              dismissLangSuggestion();
              if (l !== lang) setLang(l);
            }}
          >
            {NATIVE_NAME[l]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
