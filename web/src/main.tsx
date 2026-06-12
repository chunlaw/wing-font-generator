import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CssBaseline } from "@mui/material";
import { AppContextProvider } from "./AppContext.tsx";
import { RecentFontsProvider } from "./RecentFontsContext.tsx";
import { ThemeProvider } from "./ThemeContext.tsx";
import { LanguageProvider } from "./i18n/LanguageContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* LanguageProvider is outermost so even the Theme + App contexts can
        read translations during their own initialisation if they ever
        need to (currently they don't, but it's the safer ordering).
        RecentFontsProvider sits INSIDE AppContextProvider so it can
        reach picked-fonts / loading state if it ever needs to, but
        ABOVE <App /> so every route (Step 1 chips, Showcase, Specimen)
        can read the same recent-fonts list and the @font-face
        registry covers every page from first paint. */}
    <LanguageProvider>
      <ThemeProvider>
        <RecentFontsProvider>
          <AppContextProvider>
            <CssBaseline />
            <App />
          </AppContextProvider>
        </RecentFontsProvider>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
