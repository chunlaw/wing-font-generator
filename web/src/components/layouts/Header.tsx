import { Box, Button, Link, Typography, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "../../ThemeContext";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useState } from "react";
import IntroDialog from "../components/IntroDialog";
import { useTranslation } from "../../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [isDialog, setIsDialog] = useState<boolean>(false);

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
        <Button
          variant="contained"
          color="primary"
          href="/generate"
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.generate")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsDialog(true)}
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          {t("header.cta.learnMore")}
        </Button>
        <Button
          onClick={() =>
            window.open("https://github.com/sponsors/chunlaw", "_blank")
          }
          variant="contained"
          sx={{ borderRadius: "9999px" }}
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
