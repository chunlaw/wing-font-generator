/**
 * About page — replaces the old IntroDialog modal.
 *
 * Lives at /about. The previous content was 9 accordions inside a
 * dialog; that worked but felt cramped, hard to deep-link to, and not
 * crawlable. The same material now reads as a proper page with four
 * thematic sections (Origin → Open Source → Contributing → Support)
 * plus call-to-action buttons at the bottom.
 *
 * Layout follows the same responsive container pattern as Home.tsx:
 *   - max-width 880px so paragraph line lengths stay comfortable
 *   - section gaps scale with viewport
 *   - call-to-action buttons stack on phones, inline on tablets+
 */
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { GitHub, Telegram } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";

const About = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Each card in the "Contributing" section has its own title +
  // body translation keys. Kept as a typed const tuple so a typo
  // in one of the keys errors at compile time against TranslationKey.
  const contributeCards = [
    {
      titleKey: "about.contribute.code.title",
      bodyKey: "about.contribute.code.body",
    },
    {
      titleKey: "about.contribute.design.title",
      bodyKey: "about.contribute.design.body",
    },
    {
      titleKey: "about.contribute.data.title",
      bodyKey: "about.contribute.data.body",
    },
  ] as const;

  return (
    <Box
      width="100%"
      display="flex"
      flexDirection="column"
      gap={{ xs: 6, md: 10 }}
      sx={{ pb: { xs: 6, md: 10 } }}
    >
      {/* Hero */}
      <Box
        textAlign="center"
        maxWidth={720}
        mx="auto"
        px={2}
        sx={{ pt: { xs: 4, md: 8 } }}
      >
        <Typography variant="h1" sx={{ mb: { xs: 2, md: 3 } }}>
          {t("about.hero.title")}
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ fontWeight: 400, lineHeight: 1.5 }}
        >
          {t("about.hero.tagline")}
        </Typography>
      </Box>

      {/* Origin */}
      <Section title={t("about.origin.title")} body={t("about.origin.body")} />

      {/* Open source */}
      <Section
        title={t("about.opensource.title")}
        body={t("about.opensource.body")}
      />

      {/* Contributing — intro paragraph + three role cards */}
      <Box maxWidth={1100} mx="auto" width="100%" px={2}>
        <Typography variant="h4" gutterBottom>
          {t("about.contribute.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t("about.contribute.intro")}
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }}
          gap={{ xs: 2, md: 3 }}
        >
          {contributeCards.map((card) => (
            <Card
              key={card.titleKey}
              variant="outlined"
              sx={{
                height: "100%",
                transition:
                  "border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-2px)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "light"
                      ? "0 6px 24px -8px rgba(15, 23, 42, 0.12)"
                      : "0 6px 24px -8px rgba(0, 0, 0, 0.5)",
                },
              }}
            >
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {t(card.titleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(card.bodyKey)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Support */}
      <Section
        title={t("about.support.title")}
        body={t("about.support.body")}
      />

      {/* CTAs */}
      <Box maxWidth={880} mx="auto" width="100%" px={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          // `useFlexGap` switches Stack from margin-based spacing
          // (which only applies along the main axis) to CSS `gap`,
          // so when the row of pills wraps onto two lines the
          // vertical breathing room between rows is preserved.
          // Without this the wrapped row sits flush against the row
          // above.
          useFlexGap
          spacing={2}
          justifyContent="center"
          flexWrap="wrap"
          // Phones: full-width stacked CTAs. Tablets+: inline pills.
          sx={{
            "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } },
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate("/generate")}
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("about.cta.generate")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => navigate("/showcase")}
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("about.cta.showcase")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<Telegram />}
            onClick={() => window.open("https://t.me/wingfont", "_blank")}
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("about.cta.telegram")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<GitHub />}
            onClick={() =>
              window.open(
                "https://github.com/chunlaw/wing-font-generator",
                "_blank",
              )
            }
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("about.cta.github")}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

/**
 * Small helper for the simple title + paragraph sections. Centralises
 * the typography hierarchy and the max-width so all sections share the
 * same reading-comfortable line length and rhythm.
 */
const Section = ({ title, body }: { title: string; body: string }) => (
  <Box maxWidth={880} mx="auto" width="100%" px={2}>
    <Typography variant="h4" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {body}
    </Typography>
  </Box>
);

export default About;
