import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  alpha,
} from "@mui/material/styles";

/**
 * Theme module — palette, typography, shape, and component defaults.
 *
 * Design direction (revised from the original neon-green prototype):
 *
 *   * Brand identity: still green (the project's been visually
 *     associated with bright green since v0), but pulled toward a
 *     deeper emerald / forest hue that types and reads as a "serious
 *     tool for typography". The pure neon #00ff9b is replaced by
 *     #047857 (Tailwind emerald-700) for primary.main in light mode
 *     so contained buttons no longer look like glow sticks.
 *
 *   * Neutrals: a cool slate scale (Tailwind slate-50 through 900)
 *     for backgrounds and text. Avoids the warm beige feel of the
 *     previous #f2f2f0 background and gives a clean editorial look.
 *
 *   * Typography: explicit hierarchy with consistent weights and
 *     small letter-spacing tweaks on headings. Default body uses the
 *     system font stack to inherit each user's locally-installed
 *     Chinese / English fonts (no web-font dependency).
 *
 *   * Shape: 8px default radius (was MUI's 4px). Cards, dialogs, and
 *     buttons get a slightly softer feel without going full pill.
 *     Buttons that opt into pill shape (Header CTAs, Home page) still
 *     do so via sx prop — those overrides are unaffected.
 *
 *   * Component overrides: hover tints now derive from
 *     `alpha(theme.palette.primary.main, 0.08)` instead of hardcoded
 *     RGB. If the palette changes again, hover backgrounds stay
 *     consistent automatically.
 *
 * Both light and dark variants share the same primary hue but flip the
 * .main / .dark relationship so contrast against the active background
 * stays good in both modes.
 */

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// --- Palette tokens ----------------------------------------------------
//
// Pulled directly from the Tailwind emerald + slate scales because they
// are well-tested for accessibility (WCAG AA contrast at the right
// pairings) and easy to reason about.

const EMERALD = {
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
} as const;

const SLATE = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
} as const;

const ROSE = {
  500: "#f43f5e",
  600: "#e11d48",
} as const;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem("themeMode");
    return (savedMode as ThemeMode) || "light";
  });

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const theme = createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: {
              main: EMERALD[700], // deep professional emerald
              light: EMERALD[500],
              dark: EMERALD[900],
              contrastText: "#ffffff",
            },
            secondary: {
              main: ROSE[600],
              light: ROSE[500],
              dark: "#9f1239",
              contrastText: "#ffffff",
            },
            background: {
              default: SLATE[50],
              paper: "#ffffff",
            },
            text: {
              primary: SLATE[900],
              secondary: SLATE[500],
            },
            divider: SLATE[200],
          }
        : {
            primary: {
              main: EMERALD[500], // lighter for dark-bg legibility
              light: "#34d399",
              dark: EMERALD[700],
              contrastText: "#0f172a",
            },
            secondary: {
              main: ROSE[500],
              light: "#fb7185",
              dark: ROSE[600],
              contrastText: "#0f172a",
            },
            background: {
              default: SLATE[900],
              paper: SLATE[800],
            },
            text: {
              primary: SLATE[50],
              secondary: SLATE[400],
            },
            divider: alpha(SLATE[400], 0.18),
          }),
    },
    typography: {
      // System-font stack — fast to render, picks up whatever Chinese
      // serif/sans the user has locally so the UI feels "native" on
      // every OS without us shipping a webfont.
      fontFamily: [
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        '"PingFang TC"',
        '"Hiragino Sans GB"',
        '"Microsoft YaHei"',
        "sans-serif",
      ].join(","),
      // Responsive scale: headings grow with viewport so they feel
      // confident on desktop without overwhelming phones. MUI accepts
      // breakpoint objects in fontSize since v5.
      h1: {
        fontWeight: 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
        fontSize: "clamp(2.25rem, 5vw, 4rem)",
      },
      h2: {
        fontWeight: 700,
        letterSpacing: "-0.025em",
        lineHeight: 1.15,
        fontSize: "clamp(1.875rem, 4vw, 3rem)",
      },
      h3: {
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        fontSize: "clamp(1.625rem, 3.2vw, 2.5rem)",
      },
      h4: {
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
        fontSize: "clamp(1.375rem, 2.5vw, 2rem)",
      },
      h5: {
        fontWeight: 600,
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
        fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
      },
      h6: {
        fontWeight: 600,
        lineHeight: 1.4,
        fontSize: "clamp(1.125rem, 1.4vw, 1.25rem)",
      },
      subtitle1: { fontWeight: 600 },
      body1: { lineHeight: 1.65 }, // generous reading line-height
      button: { textTransform: "none", fontWeight: 600 }, // no SHOUTY all-caps
    },
    shape: {
      borderRadius: 8, // up from MUI's 4 — softer, more modern
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (themeArg) => ({
          // Smoother font rendering on macOS / iOS without losing
          // weight on lower-DPI Windows displays.
          body: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            // -------------------------------------------------------
            // Layered "aurora" backdrop — three very faint radial
            // gradients stacked on top of the base background colour.
            //
            // Why three layers instead of one:
            //   A single emerald glow reads great against near-black
            //   (dark mode) because the contrast headroom turns it
            //   luminous. The same glow against near-white (light
            //   mode) just looks like a smudge. To get equivalent
            //   atmosphere in light mode you need multiple
            //   complementary washes blending together — the eye
            //   reads them as ambient colour in the air rather than
            //   as a coloured blob. This is the trick Stripe /
            //   Linear / Vercel use on their light marketing pages.
            //
            // Layer roles:
            //   1) emerald, top-left  → brand glow, the dominant note
            //   2) sky-blue, top-right → cool complement, depth
            //   3) emerald, bottom-centre → grounding, keeps long
            //      pages from feeling empty at the bottom
            //
            // Opacities are intentionally low (6–14%). Each layer is
            // nearly invisible alone; together they create the
            // ambient feel. Dark mode keeps a touch more luminance
            // because dark surfaces eat more light.
            //
            // `backgroundAttachment: fixed` anchors the gradient to
            // the viewport, so the washes stay put while you scroll.
            // -------------------------------------------------------
            backgroundImage:
              themeArg.palette.mode === "light"
                ? [
                    `radial-gradient(ellipse 900px 600px at 10% 0%, ${alpha(
                      EMERALD[500],
                      0.12,
                    )}, transparent 60%)`,
                    `radial-gradient(ellipse 800px 500px at 90% 5%, ${alpha(
                      "#60a5fa",
                      0.10,
                    )}, transparent 60%)`,
                    `radial-gradient(ellipse 700px 400px at 50% 100%, ${alpha(
                      EMERALD[500],
                      0.06,
                    )}, transparent 65%)`,
                  ].join(",")
                : [
                    `radial-gradient(ellipse 900px 600px at 10% 0%, ${alpha(
                      EMERALD[500],
                      0.14,
                    )}, transparent 60%)`,
                    `radial-gradient(ellipse 800px 500px at 90% 5%, ${alpha(
                      "#60a5fa",
                      0.10,
                    )}, transparent 60%)`,
                    `radial-gradient(ellipse 700px 400px at 50% 100%, ${alpha(
                      EMERALD[500],
                      0.08,
                    )}, transparent 65%)`,
                  ].join(","),
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          },
        }),
      },
      MuiTextField: {
        defaultProps: { size: "small" },
      },
      MuiPaper: {
        defaultProps: {
          // Outlined Papers everywhere (instead of MUI's default
          // box-shadow elevation) so the app feels like an editor /
          // dashboard rather than a card-soup landing page.
          variant: "outlined",
        },
        styleOverrides: {
          outlined: ({ theme: t }) => ({
            borderColor: t.palette.divider,
            // Override MUI default to remove the faint background tint
            // that some Paper variants pick up in dark mode.
            backgroundImage: "none",
          }),
        },
      },
      MuiButton: {
        defaultProps: { size: "small", disableElevation: true },
        styleOverrides: {
          // Apply baseline tweaks to every button regardless of variant.
          root: {
            // Slight padding bump so default-size buttons don't feel
            // cramped at the new font weight.
            paddingInline: 12,
          },
          // Contained buttons: keep the brand fill (now emerald-700)
          // but soften the hover to a touch darker rather than the
          // garish default lighten.
          containedPrimary: ({ theme: t }) => ({
            "&:hover": {
              backgroundColor:
                t.palette.mode === "light" ? EMERALD[800] : EMERALD[600],
            },
          }),
        },
        variants: [
          {
            // Outlined + primary buttons share the same hue as
            // contained but read as a "secondary action". Hover gets
            // a subtle primary tint derived via alpha() so any future
            // palette change stays in sync automatically.
            //
            // Used by:
            //   - Home page "Browse ready-made fonts" CTA
            //   - Step 5 "Download WOFF"
            //   - Step 1 "Upload TTF" (color prop omitted → primary)
            //   - Step 2 "Import CSV" (same)
            props: { variant: "outlined", color: "primary" },
            style: ({ theme: t }) => ({
              borderWidth: 1.5,
              borderColor: t.palette.primary.main,
              color: t.palette.primary.main,
              "&:hover": {
                borderWidth: 1.5,
                borderColor: t.palette.primary.dark,
                backgroundColor: alpha(t.palette.primary.main, 0.08),
              },
              "&.Mui-disabled": {
                borderWidth: 1.5,
              },
            }),
          },
          {
            // Text + primary buttons need the same treatment so they
            // don't disappear against light backgrounds.
            //
            // Used by:
            //   - Step 1 "Use default"
            //   - Step 2 "Use default (canto-lshk)", "Export CSV"
            //   - FonttHeader "Download" link
            props: { variant: "text", color: "primary" },
            style: ({ theme: t }) => ({
              color: t.palette.primary.main,
              "&:hover": {
                backgroundColor: alpha(t.palette.primary.main, 0.08),
              },
            }),
          },
        ],
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme: t }) => ({
            backgroundColor:
              t.palette.mode === "light" ? SLATE[800] : SLATE[200],
            color:
              t.palette.mode === "light" ? SLATE[50] : SLATE[900],
            fontSize: 12,
            fontWeight: 500,
          }),
          arrow: ({ theme: t }) => ({
            color:
              t.palette.mode === "light" ? SLATE[800] : SLATE[200],
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            // Drop the default tonal background so AppBar inherits
            // background.paper — fits the editor vibe better.
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: {
          root: ({ theme: t }) => ({
            borderColor: t.palette.divider,
          }),
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, height: 6 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 12 }, // a bit more rounded than other surfaces
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
