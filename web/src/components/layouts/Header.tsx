import { Box, Button, Link, Typography, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "../../ThemeContext";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import IntroDialog from "../components/IntroDialog";
import { useTranslation } from "../../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [isDialog, setIsDialog] = useState<boolean>(false);

  /**
   * Active-route detector for the nav buttons. The button matching the
   * current path renders as contained (filled) primary to act as a
   * "you are here" indicator; every other nav button stays outlined.
   *
   * `/` is matched exactly (otherwise EVERY path would match). Other
   * routes match exactly OR as a prefix with `/`, so e.g. /showcase/x
   * would still highlight the Showcase tab.
   */
  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };
  const variantFor = (href: string): "contained" | "outlined" =>
    isActive(href) ? "contained" : "outlined";

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
      my={1}
      gap={2}
      flexWrap="wrap"
    >
      <Box>
        <Link
          href="/"
          sx={{ textDecoration: "none", color: "inherit" }}
          paddingY={2}
        >
          <Typography variant="h5" letterSpacing={-1}>
            {t("header.title")}
          </Typography>
        </Link>
        <Typography variant="body1" mb={1}>
          {t("header.subtitle")}
        </Typography>
      </Box>
      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        {/* Each route-linked nav button switches between contained
            (active, "you are here") and outlined (inactive) via the
            variantFor() helper above. Buttons that don't correspond to
            a route — Learn More (dialog) and Sponsor (external link) —
            always render outlined since they're never "the current
            page". */}
        <Button
          variant={variantFor("/generate")}
          color="primary"
          href="/generate"
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.generate")}
        </Button>
        <Button
          variant={variantFor("/showcase")}
          color="primary"
          href="/showcase"
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.showcase")}
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setIsDialog(true)}
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.learnMore")}
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() =>
            window.open("https://github.com/sponsors/chunlaw", "_blank")
          }
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.sponsor")}
        </Button>
        <LanguageSwitcher />
        <Tooltip title={t("header.theme.toggle")} arrow>
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            aria-label={t("header.theme.toggle")}
          >
            {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>
      <IntroDialog open={isDialog} onClose={() => setIsDialog(false)} />
    </Box>
  );
};

export default Header;
