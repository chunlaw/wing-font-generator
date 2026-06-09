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
        }
      }
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
