/**
 * Home page — the new `/` landing page.
 *
 * Stays deliberately short: hero with two CTAs, a "what it is" pitch,
 * a "how it works" note about the in-browser pipeline, and a four-card
 * feature grid. The intent is to make it immediately obvious that the
 * site is a *generator* and not just a font showcase (the old `/` page
 * was the showcase, and confused first-time visitors who didn't realise
 * they could make their own font).
 */
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Explicit list rather than a 1..4 loop with template-literal keys —
  // keeps each entry type-checked against the TranslationKey union.
  const features = [
    { title: "home.features.f1.title", body: "home.features.f1.body" },
    { title: "home.features.f2.title", body: "home.features.f2.body" },
    { title: "home.features.f3.title", body: "home.features.f3.body" },
    { title: "home.features.f4.title", body: "home.features.f4.body" },
  ] as const;

  return (
    <Box width="100%" my={3} display="flex" flexDirection="column" gap={6}>
      {/* Hero */}
      <Box textAlign="center" maxWidth={820} mx="auto" px={2}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, mb: 2, letterSpacing: -1 }}
        >
          {t("home.hero.title")}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, mb: 4 }}>
          {t("home.hero.tagline")}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate("/generate")}
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("home.hero.cta.generate")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => navigate("/showcase")}
            sx={{ borderRadius: "9999px", px: 4 }}
          >
            {t("home.hero.cta.showcase")}
          </Button>
        </Stack>
      </Box>

      {/* "What" + "How" — two paragraphs side by side on wide screens,
          stacked on narrow ones. */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={4}
        maxWidth={1100}
        mx="auto"
        width="100%"
        px={2}
      >
        <Box flex={1}>
          <Typography variant="h5" gutterBottom>
            {t("home.what.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("home.what.body")}
          </Typography>
        </Box>
        <Box flex={1}>
          <Typography variant="h5" gutterBottom>
            {t("home.how.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("home.how.body")}
          </Typography>
        </Box>
      </Stack>

      {/* Feature cards */}
      <Box maxWidth={1100} mx="auto" width="100%" px={2}>
        <Typography variant="h5" gutterBottom>
          {t("home.features.title")}
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "1fr",
            sm: "1fr 1fr",
            md: "repeat(4, 1fr)",
          }}
          gap={2}
        >
          {features.map((f, idx) => (
            <Card key={idx} variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {t(f.title)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(f.body)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
