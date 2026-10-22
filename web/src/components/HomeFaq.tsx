import { Box, Typography } from "@mui/material";
import Markdown from "./Markdown";
import { useTranslation } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { LANGUAGE_COUNT, LISTED_FONT_COUNT } from "../utils/const";

const QUESTIONS = [1, 2, 3, 4, 5, 6];

/** Homepage FAQ, plus the same pairs as FAQPage JSON-LD for search and AI answer engines. */
const HomeFaq = () => {
  const { t } = useTranslation();
  const vars = { fonts: LISTED_FONT_COUNT, languages: LANGUAGE_COUNT };
  const items = QUESTIONS.map((i) => ({
    q: t(`home.faq.q${i}` as TranslationKey, vars),
    a: t(`home.faq.a${i}` as TranslationKey, vars),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, ""),
      },
    })),
  };

  return (
    <Box component="section" maxWidth={1100} mx="auto" width="100%" px={2}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
        {t("home.faq.title")}
      </Typography>
      {items.map(({ q, a }) => (
        <Box key={q} sx={{ mb: 3 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
            {q}
          </Typography>
          <Markdown>{a}</Markdown>
        </Box>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </Box>
  );
};

export default HomeFaq;
