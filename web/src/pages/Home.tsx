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
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Fragment, ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";

/**
 * Wrap backtick-delimited segments of a step string in <code>.
 *
 * Splits on the backtick character; even-indexed segments are plain
 * text, odd-indexed segments are code. This lets translators write
 * paths like `~/.fonts/` or CSS like `font-family: '...'` directly in
 * the i18n string without any markdown layer.
 *
 * Returns an array of React nodes the caller can drop straight into
 * a list item or paragraph.
 */
function renderInlineCode(text: string): ReactNode[] {
  return text.split("`").map((segment, idx) =>
    idx % 2 === 0 ? (
      <Fragment key={idx}>{segment}</Fragment>
    ) : (
      <code key={idx}>{segment}</code>
    ),
  );
}

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { title: "home.features.f1.title", body: "home.features.f1.body" },
    { title: "home.features.f2.title", body: "home.features.f2.body" },
    { title: "home.features.f3.title", body: "home.features.f3.body" },
    { title: "home.features.f4.title", body: "home.features.f4.body" },
  ] as const;

  /*
   * Per-platform install / enable instructions, surfaced as a Tabs
   * panel below the platforms-chip section.
   *
   * The label is hardcoded (brand names don't translate — see the
   * chip array for the same rationale), but the body content goes
   * through i18n so the install steps can be written natively in
   * each language rather than literally translated from English.
   *
   * Order mirrors the platforms chip array above so the user's eye
   * carries over from "Canva → Affinity → Adobe → ..." in the
   * chips to "Canva → Affinity → Adobe → ..." in the tabs without
   * a reordering mental step.
   */
  const platformTabs = [
    { label: "Canva", bodyKey: "home.platforms.tabs.canva" },
    { label: "Affinity", bodyKey: "home.platforms.tabs.affinity" },
    { label: "Adobe", bodyKey: "home.platforms.tabs.adobe" },
    { label: "Microsoft Word", bodyKey: "home.platforms.tabs.word" },
    // Browsers share one combined tab — install steps are identical
    // (drop .woff/.ttf on the server, add @font-face CSS). The chips
    // above name them individually for visual clarity; the tabs
    // section collapses them here because three near-identical tabs
    // would be wasted vertical space.
    { label: "Chrome / Firefox / Safari", bodyKey: "home.platforms.tabs.web" },
    { label: "Windows", bodyKey: "home.platforms.tabs.windows" },
    { label: "macOS", bodyKey: "home.platforms.tabs.macos" },
    { label: "Linux", bodyKey: "home.platforms.tabs.linux" },
  ] as const;
  const [activeTab, setActiveTab] = useState(0);

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

        {/*
          Hero sample — the product demonstrating itself.

          Text is plain UTF-8 Cantonese. The `@font-face` declared in
          index.css points at a hero-only subset font (~25 KB) that
          contains exactly these 8 unique characters with their
          baked-in Jyutping annotations. Browsers render the
          characters; the annotations come along for free because
          they're part of each glyph's outline.

          `font-display: swap` (in the @font-face) makes the line
          render in the system serif first and upgrade when the
          custom font arrives — typically <100ms after first paint.
          That's how we get "show the product on the landing page"
          without paying meaningful LCP cost.

          Falls back to system serif if the .woff 404s (e.g. before
          the first CI run after this entry was added). The site
          stays functional; the hero just looks unstyled briefly.
        */}
        <Box
          sx={{
            fontFamily:
              '"ChironSungHK-hero-sample", "Noto Serif TC", "Songti TC", serif',
            // Responsive type: 2× the tagline on phones, 3× on
            // desktop. Each glyph carries the annotation above it,
            // so the line is visually taller than plain CJK text —
            // we leave generous lineHeight to absorb that.
            fontSize: { xs: "2.4rem", sm: "3rem", md: "3.6rem" },
            lineHeight: 1.6,
            mb: { xs: 2, md: 3 },
            // Word-break controls so the phrase doesn't visually
            // split between 歌 and 各 (the lyric's natural caesura).
            // wordBreak: 'keep-all' tells the browser to keep CJK
            // runs together; the explicit space between the two
            // sub-phrases is the only valid break point.
            wordBreak: "keep-all",
            // The annotated chars look better with a touch of
            // letter-spacing — the romanizations above each
            // character bleed slightly into neighbours otherwise.
            letterSpacing: "0.04em",
          }}
        >
          各有各唱自己歌　各找自我
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mb: { xs: 4, md: 6 },
            fontStyle: "italic",
          }}
        >
          {t("home.hero.sampleCaption")}
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

      {/*
        Cross-platform + free callout.

        Sits right after the hero so the user's first question —
        "yeah, but can I actually use it where I work?" — gets
        answered before they have to scroll for the long-form
        explanation. The output is just a standard TTF/WOFF, so
        anywhere a custom font goes, this goes too.

        The grid of platform chips is the workhorse of the section:
        - Latin names ("Canva", "Adobe") don't need i18n.
        - Wrapping is responsive: 8 chips fit one row on desktop,
          break across rows on phones.
        - Light/dark-mode color via outlined chip variant so they
          don't fight the aurora-gradient backdrop.

        The "free" line gets prominent typography + primary colour
        because it's the close: the answer the user gets at the end
        of the visual scan, after they've registered "works
        everywhere". Big enough to read at a glance, not so big it
        screams.
      */}
      <Box maxWidth={900} mx="auto" width="100%" px={2} textAlign="center">
        <Typography variant="h4" gutterBottom>
          {t("home.platforms.title")}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
        >
          {t("home.platforms.body")}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          justifyContent="center"
          rowGap={1.5}
          sx={{ mb: 4 }}
        >
          {[
            "Canva",
            "Affinity",
            "Adobe",
            "Microsoft Word",
            // Browsers listed individually rather than as a single
            // "Web Browsers" chip — the explicit names read with
            // more confidence than the generic category, and they
            // each occupy their own visual unit so users scanning
            // the row see the specific browser they use.
            "Chrome",
            "Firefox",
            "Safari",
            "Windows",
            "macOS",
            "Linux",
          ].map((platform) => (
            <Chip
              key={platform}
              label={platform}
              variant="outlined"
              // ✓ icon as a positive "verified" cue — same role as
              // the unicode ✓ at the top of the browser tab body
              // below, just rendered as a proper MUI icon here so
              // it lines up cleanly with the chip text.
              //
              // `success.main` instead of `primary.main` because
              // green reads as "yes, confirmed" universally, while
              // the brand primary would compete with the
              // surrounding theme accents (CTAs, "free" line).
              icon={
                <CheckCircleOutlineIcon
                  fontSize="small"
                  sx={{ color: "success.main" }}
                />
              }
              sx={{
                fontSize: 14,
                height: 32,
                fontWeight: 500,
                // MUI overrides Chip-icon colour by default; force
                // it back to inherit so our sx wins.
                "& .MuiChip-icon": { color: "success.main" },
              }}
            />
          ))}
        </Stack>
        <Typography
          component="p"
          sx={{
            fontSize: { xs: 22, md: 30 },
            fontWeight: 700,
            color: "primary.main",
            letterSpacing: 0.3,
          }}
        >
          {t("home.platforms.free")}
        </Typography>
      </Box>

      {/*
        "Learn more" — per-platform install/enable instructions.

        Always-visible (not behind an accordion or modal) because
        users hitting the home page asking "how do I install this?"
        shouldn't have to click again to find the answer. Tabs are
        scrollable on narrow viewports so all 8 platforms remain
        reachable on phones without overflowing.

        Body content goes through i18n so each language can write
        idiomatically-correct steps (CJK system menus have
        official translations like 「字體簿」 / 「字型簿」 that a
        literal English translation would miss).

        Each tab body is plain text — no inline code highlighting.
        File paths in the bodies are wrapped in backticks for
        readability but render as regular Typography. If install
        instructions evolve to need command blocks or richer
        formatting, swap the Typography for a Markdown renderer.
      */}
      <Box maxWidth={900} mx="auto" width="100%" px={2}>
        <Typography variant="h4" gutterBottom textAlign="center">
          {t("home.platforms.learnMoreTitle")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 3 }}
        >
          {t("home.platforms.learnMoreSubtitle")}
        </Typography>
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              // Tab labels are short; keep them compact so 4-5 fit
              // visibly on a phone before the scroll-button arrows
              // become necessary.
              "& .MuiTab-root": {
                minWidth: 0,
                px: { xs: 1.5, sm: 2 },
                textTransform: "none",
                fontWeight: 500,
              },
            }}
          >
            {platformTabs.map((p, i) => (
              <Tab key={p.label} label={p.label} value={i} />
            ))}
          </Tabs>
          {/*
            Body rendered as an ordered list rather than a paragraph.
            The i18n string for each platform is newline-separated;
            we split on \n and emit one <li> per step. The browser
            handles the numbering — no JS-level counter — which keeps
            CJK locales aligned (the visual ordinal is the same in
            both languages).

            Backtick-wrapped segments inside a step (e.g. paths like
            `~/.fonts/` or CSS like `font-family: 'X'`) are rendered
            as inline `<code>` for readability. The renderStep helper
            below splits on backticks and wraps odd-indexed segments
            (the ones BETWEEN backticks) in <code>. No markdown
            library involved.
          */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box
              component="ol"
              sx={{
                pl: 3,
                m: 0,
                color: "text.secondary",
                "& li": {
                  mb: 1,
                  lineHeight: 1.7,
                  fontSize: "1rem",
                  "&:last-child": { mb: 0 },
                },
                "& code": {
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.9em",
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 0.5,
                  bgcolor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              {t(platformTabs[activeTab].bodyKey)
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((step, idx) => (
                  <li key={idx}>{renderInlineCode(step)}</li>
                ))}
            </Box>
          </Box>
        </Paper>
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
