/**
 * Home page — the new `/` landing page.
 *
 * Layout strategy:
 *   - Hero is centered with generous vertical breathing room
 *     (`py: {xs: 6, md: 12}`) so it feels like an actual landing
 *     section rather than padded body copy.
 *   - "What it is" / "How it works" form a two-column responsive
 *     section: stacked on mobile, side-by-side on md+.
 *   - Feature grid: 1 col on phones, 2 on tablets, 4 on desktop.
 *   - Max content width capped at 1100px so line lengths stay
 *     comfortable on ultra-wide displays.
 *
 * Visual treatment:
 *   - Cards lift slightly + border-color shifts to primary on hover
 *     so they read as interactive surfaces.
 *   - Hero CTAs go full-width on phones (stacked) and natural width
 *     on tablets+ (inline).
 */
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { title: "home.features.f1.title", body: "home.features.f1.body" },
    { title: "home.features.f2.title", body: "home.features.f2.body" },
    { title: "home.features.f3.title", body: "home.features.f3.body" },
    { title: "home.features.f4.title", body: "home.features.f4.body" },
  ] as const;

  return (
    <Box
      width="100%"
      display="flex"
      flexDirection="column"
      // Section gap scales with viewport so wide screens get more
      // breathing room than phones do.
      gap={{ xs: 6, md: 10 }}
      sx={{ pb: { xs: 6, md: 10 } }}
    >
      {/* Hero */}
      <Box
        textAlign="center"
        maxWidth={820}
        mx="auto"
        px={2}
        sx={{ pt: { xs: 6, md: 12 } }}
      >
        <Typography
          variant="h1"
          sx={{
            mb: { xs: 2, md: 3 },
          }}
        >
          {t("home.hero.title")}
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ fontWeight: 400, mb: { xs: 4, md: 6 }, lineHeight: 1.5 }}
        >
          {t("home.hero.tagline")}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          // Full-width CTAs on phones (stacked vertically); natural
          // width on tablets+ so they read as inline buttons.
          sx={{
            "& .MuiButton-root": {
              width: { xs: "100%", sm: "auto" },
            },
          }}
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

      {/* "What" + "How" — paragraphs side-by-side on md+, stacked on phones */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        // Spacing grows with viewport so the two columns don't feel
        // cramped at 900px and bedded together at 1400px+.
        spacing={{ xs: 3, md: 6, lg: 8 }}
        maxWidth={1100}
        mx="auto"
        width="100%"
        px={2}
      >
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {t("home.what.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("home.what.body")}
          </Typography>
        </Box>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {t("home.how.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("home.how.body")}
          </Typography>
        </Box>
      </Stack>

      {/* Feature cards */}
      <Box maxWidth={1100} mx="auto" width="100%" px={2}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t("home.features.title")}
        </Typography>
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "1fr",
            sm: "1fr 1fr",
            md: "repeat(4, 1fr)",
          }}
          gap={{ xs: 2, md: 3 }}
        >
          {features.map((f, idx) => (
            <Card
              key={idx}
              variant="outlined"
              sx={{
                height: "100%",
                // Subtle interactive feedback. The border and lift
                // shift toward the primary color so users get a
                // tactile "this is a surface" cue without anything
                // jarring.
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
