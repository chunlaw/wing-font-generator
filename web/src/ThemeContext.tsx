import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";

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
              main: "#00ff9b",
              light: "#4caf50",
              dark: "#1b5e20",
            },
            secondary: {
              main: "#ff6196",
            },
            background: {
              default: "#f2f2f0",
              paper: "#ffffff",
            },
          }
        : {
            primary: {
              main: "#00ff9b",
              light: "#81c784",
              dark: "#2e7d32",
            },
            secondary: {
              main: "#ff6196",
            },
            background: {
              default: "#1a1a1a",
              paper: "#242424",
            },
          }),
    },
    components: {
      MuiTextField: {
        defaultProps: {
          size: "small",
        }
      },
      MuiButton: {
        defaultProps: {
          size: "small",
        },
        variants: [
          {
            // The brand primary color (#00ff9b) is a bright neon green
            // that works great as a FILL (contained variant gets dark
            // text on bright green = high contrast), but is nearly
            // invisible when used as OUTLINED border + text on a light
            // background. This override gives every outlined+primary
            // button a thicker, high-contrast border + dark text so the
            // button reads as a button without looking washed out.
            //
            // Buttons that match this rule today:
            //   - Home page "Browse ready-made fonts" CTA
            //   - Step 5 "Download WOFF"
            //   - Step 1 "Upload TTF" (color prop omitted → defaults to primary)
            //   - Step 2 "Import CSV" (same — default color)
            //
            // Future outlined+primary buttons get the same treatment
            // automatically.
            props: { variant: "outlined", color: "primary" },
            style: ({ theme: t }) => ({
              borderWidth: 2,
              borderColor: t.palette.primary.main,
              color:
                t.palette.mode === "light"
                  ? t.palette.primary.dark
                  : t.palette.primary.main,
              fontWeight: 600,
              "&:hover": {
                borderWidth: 2,
                borderColor: t.palette.primary.main,
                backgroundColor:
                  t.palette.mode === "light"
                    ? "rgba(0, 255, 155, 0.10)"
                    : "rgba(0, 255, 155, 0.18)",
              },
              "&.Mui-disabled": {
                borderWidth: 2,
              },
            }),
          },
          {
            // Same root cause as the outlined override above, applied
            // to text-variant buttons. Without border or fill, plain
            // neon-green-on-white was nearly invisible — switch to the
            // dark-shade primary so the text actually reads, and add a
            // subtle hover background so the button still feels
            // interactive.
            //
            // Buttons that match this rule today:
            //   - Step 1 "Use default" (next to Upload TTF)
            //   - Step 2 "Use default (canto-lshk)"
            //   - Step 2 "Export CSV"
            //   - FonttHeader "Download" link
            //
            // The Step 2 "Clear all" button uses color="warning" so it
            // isn't matched by this override — orange has fine contrast
            // already.
            props: { variant: "text", color: "primary" },
            style: ({ theme: t }) => ({
              color:
                t.palette.mode === "light"
                  ? t.palette.primary.dark
                  : t.palette.primary.main,
              fontWeight: 600,
              "&:hover": {
                backgroundColor:
                  t.palette.mode === "light"
                    ? "rgba(0, 255, 155, 0.10)"
                    : "rgba(0, 255, 155, 0.18)",
              },
            }),
          },
        ],
      }
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
