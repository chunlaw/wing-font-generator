import {
  GitHub as GitHubIcon,
  Instagram,
  Telegram,
} from "@mui/icons-material";
import { Box, Divider, IconButton, Link, Stack, Typography } from "@mui/material";
import { useTranslation } from "../../i18n/LanguageContext";

/**
 * Footer — three-section layout that gracefully collapses on phones.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  About                  │  Links            │  Social      │
 *   │  blurb                  │  • Generate       │  GH/TG/IG    │
 *   │                         │  • Showcase       │              │
 *   │                         │  • Source         │              │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │  License        ·        Built by chunlaw                   │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * On xs the three columns stack vertically. The bottom row stays a
 * single line wherever it fits, wrapping naturally otherwise.
 */
const Footer = () => {
  const { t } = useTranslation();

  return (
    <Box component="footer" width="100%" sx={{ mt: { xs: 6, md: 10 } }}>
      <Divider sx={{ mb: { xs: 3, md: 4 } }} />

      {/* Three-column upper section */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 6 }}
        sx={{ mb: { xs: 3, md: 4 } }}
      >
        {/* About */}
        <Box flex={2}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
          >
            {t("footer.about.title")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 560 }}
          >
            {t("footer.about.body")}
          </Typography>
        </Box>

        {/* Links */}
        <Box flex={1}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
          >
            {t("footer.links.title")}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            <Link
              href="/generate"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.generate")}
            </Link>
            <Link
              href="/showcase"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.showcase")}
            </Link>
            <Link
              href="https://github.com/chunlaw/wing-font-generator"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.source")}
            </Link>
            {/*
              Direct link into python/README.md — the canonical
              CLI / install reference. Saves the advanced user one
              click vs. navigating the repo root. Kept here (in the
              Links column, after Source) rather than building a
              dedicated /cli docs page on the site: the README is the
              single source of truth and most readers of these
              instructions are comfortable on GitHub.
            */}
            <Link
              href="https://github.com/chunlaw/wing-font-generator/tree/main/python#readme"
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.cli")}
            </Link>
            <Link
              href="/credits"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.credits")}
            </Link>
            {/*
              Legal links — Terms first (it explains the licensing
              model that users are most likely to care about), then
              Privacy (which is short because we collect nothing).
              Kept inside the same Links column rather than spinning
              up a fourth "Legal" column — at this site's scale, two
              extra entries don't justify the extra grid column.
            */}
            <Link
              href="/terms"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.terms")}
            </Link>
            <Link
              href="/privacy"
              variant="body2"
              underline="hover"
              color="text.secondary"
              sx={{ "&:hover": { color: "primary.main" } }}
            >
              {t("footer.links.privacy")}
            </Link>
          </Stack>
        </Box>

        {/* Social */}
        <Box flex={1}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
          >
            Social
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: -1 }}>
            <IconButton
              size="small"
              onClick={() =>
                window.open(
                  "https://github.com/chunlaw/wing-font-generator",
                  "_blank",
                )
              }
              aria-label="GitHub"
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => window.open("https://t.me/wingfont", "_blank")}
              aria-label="Telegram"
            >
              <Telegram fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() =>
                window.open("https://www.instagram.com/wingfont", "_blank")
              }
              aria-label="Instagram"
            >
              <Instagram fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Stack>

      {/* Bottom row: license + credit */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{
          pt: 2,
          pb: 3,
          borderTop: 1,
          borderColor: "divider",
          color: "text.secondary",
          fontSize: 13,
        }}
      >
        <Box>{t("footer.license")}</Box>
        <Box>{t("footer.credit")}</Box>
      </Stack>
    </Box>
  );
};

export default Footer;
