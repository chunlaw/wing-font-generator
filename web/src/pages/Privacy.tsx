/**
 * Privacy Policy page (/privacy).
 *
 * Mirrors Terms.tsx in structure — same hero, same markdown body
 * pattern, same effective-date affordance. The two pages are
 * intentionally consistent in layout so a user navigating between
 * them via the footer doesn't experience layout shift.
 */
import { Box, Typography } from "@mui/material";
import Markdown from "../components/Markdown";
import { useTranslation } from "../i18n/LanguageContext";
import { useDocumentMeta } from "../utils/hooks";
import { PRIVACY_EN, PRIVACY_ZH, PRIVACY_EFFECTIVE_DATE } from "./legal/privacy";

const Privacy = () => {
  const { t, lang } = useTranslation();
  const body = lang === "zh" ? PRIVACY_ZH : PRIVACY_EN;

  useDocumentMeta(t("meta.privacy.title"), t("meta.privacy.description"), {
    canonicalPath: "/privacy",
  });

  return (
    <Box
      width="100%"
      display="flex"
      flexDirection="column"
      gap={{ xs: 4, md: 6 }}
      sx={{ pb: { xs: 6, md: 10 } }}
    >
      <Box
        textAlign="center"
        maxWidth={720}
        mx="auto"
        px={2}
        sx={{ pt: { xs: 4, md: 8 } }}
      >
        <Typography variant="h1" sx={{ mb: { xs: 2, md: 3 } }}>
          {t("legal.privacy.title")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic" }}
        >
          {t("legal.effectiveDate").replace("{date}", PRIVACY_EFFECTIVE_DATE)}
        </Typography>
      </Box>

      <Box maxWidth={880} mx="auto" width="100%" px={2}>
        <Markdown>{body}</Markdown>
      </Box>
    </Box>
  );
};

export default Privacy;
