import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Stack,
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
  Close as CloseIcon,
  GitHub as GitHubIcon,
  Instagram,
  Menu as MenuIcon,
  Telegram,
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
 *   - <md: Tabs collapse into a hamburger that opens a left-anchored
 *     <Drawer> (not a <Menu> popover any more — see the Drawer block
 *     below for the rationale). The drawer also absorbs the
 *     nav-flavored footer links (Source, CLI, Credits, Terms,
 *     Privacy, Report-error) plus the theme toggle and social icons
 *     so the mobile page no longer needs a three-column footer.
 */
const Header = () => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // The mobile drawer's open/closed state. Previously this was an
  // anchorEl HTMLElement | null because we used a popover <Menu>;
  // a <Drawer> doesn't anchor to a DOM node, so a plain boolean
  // suffices and the close handlers get cleaner.
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // "More" links — the previously footer-only entries that now live
  // inside the drawer on mobile. Mirrors the order used in
  // Footer.tsx's Links column on desktop, minus the duplicates
  // (Generate / Showcase) that already appear under primary nav.
  type MoreLink = {
    value: string;
    label: string;
    href: string;
    external?: boolean;
  };
  const moreLinks: MoreLink[] = useMemo(
    () => [
      {
        value: "source",
        label: t("footer.links.source"),
        href: "https://github.com/chunlaw/wing-font-generator",
        external: true,
      },
      {
        value: "cli",
        label: t("footer.links.cli"),
        href: "https://github.com/chunlaw/wing-font-generator/tree/main/python#readme",
        external: true,
      },
      {
        value: "credits",
        label: t("footer.links.credits"),
        href: "/credits",
      },
      {
        value: "reportError",
        label: t("footer.links.reportError"),
        href: "https://github.com/chunlaw/wing-font-generator/issues/new?title=Annotation%20error",
        external: true,
      },
      { value: "terms", label: t("footer.links.terms"), href: "/terms" },
      { value: "privacy", label: t("footer.links.privacy"), href: "/privacy" },
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

  const closeDrawer = () => setDrawerOpen(false);
  const fireFromDrawer = (action: () => void) => () => {
    action();
    closeDrawer();
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
          // --- Mobile: hamburger opens a left-anchored Drawer ----------
          // Previously a <Menu> popover; swapped to <Drawer anchor="left">
          // because:
          //   1. A popover is height-bounded by the viewport row it
          //      anchors to — uncomfortable as more items pile up.
          //   2. A drawer reads as the dedicated "navigation surface"
          //      rather than a dropdown, which lets us push the
          //      footer's nav-flavored links into it without making
          //      them feel like menu items.
          //   3. Standard mobile pattern (native iOS/Android, most
          //      modern web apps) — users already know what to do.
          // Width 280: wide enough for the longest zh string at
          // body1 weight + ListItem padding without horizontal
          // scrolling, narrow enough to leave a clear backdrop tap
          // target on a 360-wide viewport.
          <>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={closeDrawer}
              slotProps={{ paper: { sx: { width: 280 } } }}
            >
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                role="presentation"
              >
                {/* Drawer header — brand + close X. Mirrors the
                    page header's brand on the left so the user
                    feels oriented when the drawer slides in. */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Typography variant="h6" letterSpacing={-0.5}>
                    {t("header.title")}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={closeDrawer}
                    aria-label={t("drawer.close")}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Divider />

                {/* Primary navigation — same 4 items as the desktop
                    Tabs, rendered as full-width ListItemButtons so
                    each row has a generous tap target. The active
                    route is emphasised with primary.main color +
                    600 weight, matching the Tabs indicator on
                    desktop. */}
                <List sx={{ py: 0 }}>
                  {navItems.map((item) =>
                    "to" in item ? (
                      <ListItem key={item.value} disablePadding>
                        <ListItemButton
                          component="a"
                          href={item.to}
                          selected={activeTab === item.value}
                          onClick={closeDrawer}
                          sx={
                            activeTab === item.value
                              ? {
                                  color: "primary.main",
                                  "& .MuiListItemText-primary": {
                                    fontWeight: 600,
                                  },
                                }
                              : undefined
                          }
                        >
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </ListItem>
                    ) : (
                      <ListItem key={item.value} disablePadding>
                        <ListItemButton
                          onClick={fireFromDrawer(item.onClick)}
                        >
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      </ListItem>
                    ),
                  )}
                </List>

                <Divider />

                {/* Theme toggle row. Kept inside the drawer (in
                    addition to the always-visible IconButton next
                    to the hamburger) so the drawer surface is
                    self-sufficient — opening the drawer reveals
                    every action that's normally crammed into the
                    mobile header row. */}
                <List sx={{ py: 0 }}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={fireFromDrawer(toggleTheme)}>
                      <ListItemText
                        primary={
                          mode === "dark"
                            ? `${t("header.theme.toggle")} ☀`
                            : `${t("header.theme.toggle")} 🌙`
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </List>

                <Divider />

                {/* "More" links — Source / CLI / Credits / Report
                    error / Terms / Privacy. These previously lived
                    only in the Footer's Links column. On mobile
                    the footer is now a slim one-liner, so these
                    nav-flavored entries moved here where they
                    remain a single tap from any route.

                    External links open in a new tab; internal
                    routes navigate via the standard SPA mechanism
                    and close the drawer on the way. */}
                <List
                  dense
                  sx={{ py: 0 }}
                  subheader={
                    <ListSubheader
                      sx={{
                        lineHeight: "2.4em",
                        bgcolor: "transparent",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        fontSize: 11,
                      }}
                    >
                      {t("drawer.more")}
                    </ListSubheader>
                  }
                >
                  {moreLinks.map((link) => (
                    <ListItem key={link.value} disablePadding>
                      <ListItemButton
                        component="a"
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        onClick={closeDrawer}
                      >
                        <ListItemText
                          primary={link.label}
                          slotProps={{
                            primary: {
                              variant: "body2",
                              color: "text.secondary",
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>

                {/* Spacer pushes the social icons to the very
                    bottom of the drawer no matter how much
                    vertical room is left over. */}
                <Box sx={{ flexGrow: 1 }} />
                <Divider />

                {/* Social icons — bottom of drawer. Mirror of the
                    desktop Footer's Social column. Kept as
                    IconButtons (not list rows) so the cluster reads
                    as a visually distinct sign-off rather than just
                    more nav. */}
                <Box sx={{ px: 1.5, py: 1 }}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      pl: 0.5,
                    }}
                  >
                    {t("drawer.social")}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={fireFromDrawer(() =>
                        window.open(
                          "https://github.com/chunlaw/wing-font-generator",
                          "_blank",
                        ),
                      )}
                      aria-label="GitHub"
                    >
                      <GitHubIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={fireFromDrawer(() =>
                        window.open("https://t.me/wingfont", "_blank"),
                      )}
                      aria-label="Telegram"
                    >
                      <Telegram fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={fireFromDrawer(() =>
                        window.open(
                          "https://www.instagram.com/wingfont",
                          "_blank",
                        ),
                      )}
                      aria-label="Instagram"
                    >
                      <Instagram fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>
            </Drawer>
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
