/**
 * Terms & Conditions page (/terms).
 *
 * Renders the bilingual TERMS_ZH / TERMS_EN markdown blobs through the
 * shared <Markdown /> component, with a centered hero matching the
 * About + Acknowledgements page rhythm.
 *
 * The effective-date line below the hero is intentional — it makes
 * the document version visible at a glance and avoids users wondering
 * "which version did I agree to" if they bookmark the link.
 */
import { Box, Typography } from "@mui/material";
import Markdown from "../components/Markdown";
import { useTranslation } from "../i18n/LanguageContext";
import { TERMS_EN, TERMS_ZH, TERMS_EFFECTIVE_DATE } from "./legal/terms";

const Terms = () => {
  const { t, lang } = useTranslation();
  // Pick the body matching the user's current locale. Fall back to en
  // for any future locale that gets added without a Terms translation.
  const body = lang === "zh" ? TERMS_ZH : TERMS_EN;

  return (
    <Box
      width="100%"
      display="flex"
      flexDirection="column"
      gap={{ xs: 4, md: 6 }}
      sx={{ pb: { xs: 6, md: 10 } }}
    >
      {/* Hero — same vertical rhythm as About / Acknowledgements */}
      <Box
        textAlign="center"
        maxWidth={720}
        mx="auto"
        px={2}
        sx={{ pt: { xs: 4, md: 8 } }}
      >
        <Typography variant="h1" sx={{ mb: { xs: 2, md: 3 } }}>
          {t("legal.terms.title")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          {t("legal.effectiveDate").replace("{date}", TERMS_EFFECTIVE_DATE)}
        </Typography>
      </Box>

      {/* Body — markdown-rendered. maxWidth 880 keeps line length
          comfortable on desktop while still letting headings breathe. */}
      <Box maxWidth={880} mx="auto" width="100%" px={2}>
        <Markdown>{body}</Markdown>
      </Box>
    </Box>
  );
};

export default Terms;
