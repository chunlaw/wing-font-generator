/**
 * Plain links to this same page in every language ("中文 · English ·
 * 日本語"). Visible to anyone who scrolls to the bottom, and crawlable,
 * so search engines find each language version from any page.
 */
import { Box, Link, Stack } from "@mui/material";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/LanguageContext";
import { LANGUAGES } from "../../i18n/translations";
import { LANG_ATTR, NATIVE_NAME, dismissLangSuggestion } from "./languageMeta";

const FooterLanguageLinks = ({ justify = "flex-start" }: { justify?: string }) => {
  const { lang, setLang } = useTranslation();
  // Router basename is /<lang>, so pathname here is language-free.
  const { pathname, search, hash } = useLocation();

  return (
    <Stack
      component="nav"
      aria-label="Language"
      direction="row"
      divider={<span aria-hidden>·</span>}
      spacing={1}
      justifyContent={justify}
      flexWrap="wrap"
    >
      {LANGUAGES.map((l) =>
        l === lang ? (
          <Box key={l} component="span" lang={LANG_ATTR[l]} sx={{ fontWeight: 600 }}>
            {NATIVE_NAME[l]}
          </Box>
        ) : (
          <Link
            key={l}
            href={`/${l}${pathname}${search}${hash}`}
            hrefLang={LANG_ATTR[l]}
            lang={LANG_ATTR[l]}
            underline="hover"
            color="inherit"
            sx={{ "&:hover": { color: "primary.main" } }}
            onClick={(e) => {
              e.preventDefault();
              dismissLangSuggestion();
              setLang(l);
            }}
          >
            {NATIVE_NAME[l]}
          </Link>
        ),
      )}
    </Stack>
  );
};

export default FooterLanguageLinks;
