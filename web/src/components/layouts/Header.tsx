import {
  Box,
  Divider,
  IconButton,
  Link as MuiLink,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { SyntheticEvent, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useTheme } from "../../ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Header — Tab-based navigation.
 *
 * Why Tabs instead of Buttons:
 *   The four header items used to be Buttons. We swapped to <Tabs>
 *   so the header reads as a navigation bar (subtle underline for
 *   the active route) rather than four equally-loud CTAs. The
 *   underline indicator follows the current route; on routes where
 *   neither /generate nor /showcase matches (e.g. /) no tab is
 *   highlighted.
 *
 * Semantic caveat:
 *   Three of the four tabs are NAVIGATION (route changes to
 *   /generate, /showcase, /about); the fourth (Sponsor) opens an
 *   external link. Tabs are conventionally for navigation only. We
 *   chose the uniform look anyway — the trade-off is that screen
 *   readers announce all four as "tab", but the activated behaviour
 *   is correct (route nav uses react-router Link, the external link
 *   uses onClick).
 *
 * Responsive layout:
 *   - md+: Tabs displayed inline.
 *   - <md: Tabs collapse into a hamburger Menu. The theme + lang
 *     toggles remain visible.
 */
const Header = () => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Each item has a stable `value` used both as a React key and as
  // the MUI Tabs value (which controls the active indicator).
  // Navigation items carry a `to` for the react-router Link; action
  // items carry an `onClick` (and no `to`, so the Tab doesn't try to
  // navigate). Three of the four tabs are now navigation — only
  // "Sponsor" (external link) remains an action.
  type NavItem =
    | { value: string; label: string; to: string }
    | { value: string; label: string; onClick: () => void };
  const navItems: NavItem[] = useMemo(
    () => [
      { value: "/generate", label: t("header.cta.generate"), to: "/generate" },
      { value: "/showcase", label: t("header.cta.showcase"), to: "/showcase" },
      { value: "/about", label: t("header.cta.learnMore"), to: "/about" },
      {
        value: "sponsor",
        label: t("header.cta.sponsor"),
        onClick: () =>
          window.open("https://github.com/sponsors/chunlaw", "_blank"),
      },
    ],
    [t],
  );

  // Resolve which tab's `value` matches the current route. When on
  // `/` or anywhere that isn't a tab route, return false so Tabs
  // shows no indicator. (Material's TabsValue allows `false` for
  // "no selection".)
  const activeTab: string | false = useMemo(() => {
    if (pathname === "/generate" || pathname.startsWith("/generate/"))
      return "/generate";
    if (pathname === "/showcase" || pathname.startsWith("/showcase/"))
      return "/showcase";
    if (pathname === "/about" || pathname.startsWith("/about/"))
      return "/about";
    return false;
  }, [pathname]);

  // Tabs onChange fires for every click, including the action tabs.
  // For navigation tabs we don't need to handle it (the Tab's
  // `component={RouterLink}` does the SPA navigation itself); for
  // action tabs we look up the onClick and call it.
  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    const item = navItems.find((i) => i.value === newValue);
    if (item && "onClick" in item) item.onClick();
    // Navigation tabs are handled by the Link component on the Tab,
    // and onChange's newValue still updates if we were tracking it.
    // We don't push it into activeTab manually because activeTab is
    // derived from pathname.
  };

  const closeMenu = () => setMenuAnchor(null);
  const fireFromMenu = (action: () => void) => () => {
    action();
    closeMenu();
  };

  return (
    <Box
      component="header"
      display="flex"
      width="100%"
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "center" }}
      my={1}
      gap={2}
      flexWrap="wrap"
    >
      {/*
        Brand wordmark only — the descriptive subtitle that used to
        sit under "Wing Font" was removed because the same value-prop
        now lives in three better-placed surfaces (Home hero, /about,
        Footer "About" column). Repeating it in the header on every
        page added visual noise without adding context for return
        visitors and ate vertical room on mobile.
      */}
      <MuiLink
        href="/"
        sx={{
          textDecoration: "none",
          color: "inherit",
          // Keep the brand inline with the nav row; no wrapping Box
          // is needed now that there is no subtitle below.
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" letterSpacing={-1}>
          {t("header.title")}
        </Typography>
      </MuiLink>

      <Box display="flex" alignItems="center" gap={1}>
        {isMobile ? (
          // --- Mobile: hamburger menu ----------------------------------
          // Tabs in a 360-wide viewport with 4 labels of varying width
          // would either truncate or wrap. The hamburger menu we
          // already built handles this much better.
          <>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Open navigation"
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={closeMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 200 } } }}
            >
              {navItems.map((item) =>
                "to" in item ? (
                  <MenuItem
                    key={item.value}
                    component="a"
                    href={item.to}
                    selected={activeTab === item.value}
                    onClick={closeMenu}
                    sx={
                      activeTab === item.value
                        ? { color: "primary.main", fontWeight: 600 }
                        : undefined
                    }
                  >
                    {item.label}
                  </MenuItem>
                ) : (
                  <MenuItem
                    key={item.value}
                    onClick={fireFromMenu(item.onClick)}
                  >
                    {item.label}
                  </MenuItem>
                ),
              )}
              <Divider />
              <MenuItem onClick={fireFromMenu(toggleTheme)}>
                {mode === "dark"
                  ? `${t("header.theme.toggle")} ☀`
                  : `${t("header.theme.toggle")} 🌙`}
              </MenuItem>
            </Menu>
          </>
        ) : (
          // --- Desktop: inline Tabs ------------------------------------
          // We keep Tabs in their own Box so the indicator's bottom-
          // underline only spans the tab row, not the whole header.
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            // Centred indicator looks more confident than the
            // default left-anchored one; the active-tab text gets
            // emphasised below via the textColor + indicatorColor
            // primary defaults.
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 600,
                fontSize: 14,
                px: 2,
              },
            }}
          >
            {navItems.map((item) =>
              "to" in item ? (
                <Tab
                  key={item.value}
                  value={item.value}
                  label={item.label}
                  component={RouterLink}
                  to={item.to}
                />
              ) : (
                <Tab
                  key={item.value}
                  value={item.value}
                  label={item.label}
                />
              ),
            )}
          </Tabs>
        )}

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
    </Box>
  );
};

export default Header;
