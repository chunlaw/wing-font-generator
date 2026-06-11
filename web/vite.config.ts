import { ConfigEnv, defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    __APP_ENV__: env.VITE_VITE_ENV ?? "development",
    define: {
      global: "globalThis",
    },
    plugins: [
      react(),
      basicSsl(),
      /*
       * Service-worker caching strategy.
       *
       * We're in a hotly-updated phase of the site — new commits ship
       * to gh-pages multiple times a day, and we want users to see
       * those updates without manual cache-busting. At the same time
       * the generated showcase fonts are large (500 KB - 1 MB each)
       * and we don't want to re-download them on every visit.
       *
       * The split:
       *
       *   • App shell (HTML / JS / CSS / images): NO SW interception.
       *     The browser's normal HTTP cache + Vite's content-hashed
       *     asset filenames handle freshness. New deploys land via
       *     the standard cache-busting path with no SW friction.
       *
       *   • Fonts (.woff / .woff2 / .ttf / .otf): cached by the SW
       *     with StaleWhileRevalidate. Users get an instant cache
       *     hit on repeat visits AND the SW fetches an updated
       *     copy in the background so the next visit picks up any
       *     font changes. (Font filenames are stable, so
       *     HTTP-level cache busting wouldn't help — SW caching is
       *     the right layer here.)
       *
       * `registerType: 'autoUpdate'` activates a new SW as soon as
       * it's downloaded — no "click here to update" prompt. Combined
       * with the empty precache list (globPatterns: []), this is the
       * eager-update behaviour we want without sacrificing font
       * caching.
       */
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        // SW for caching only — we're not building an installable
        // PWA. `manifest: false` skips manifest.webmanifest
        // generation and tells the plugin not to inject manifest
        // links into index.html.
        manifest: false,
        workbox: {
          // Empty precache list — the SW does NOT cache app shell
          // files at build time. Without this the plugin would
          // precache every JS/CSS/HTML it finds in dist/, which
          // would serve stale app code until the SW activates a
          // new version. Leaving precaching empty means the browser
          // always hits the network for the app shell.
          globPatterns: [],
          // Workbox by default falls back to a navigation route
          // (`navigateFallback: 'index.html'`) which precaches
          // index.html and serves it for any SPA route. We don't
          // want that — set explicitly to null so the SW doesn't
          // intercept HTML navigations.
          navigateFallback: null,
          runtimeCaching: [
            {
              // Match any .woff / .woff2 / .ttf / .otf request,
              // same-origin or cross-origin. Covers all of:
              //   • /wingfont/*.ttf  — Pyodide worker's input fonts
              //   • /fonts/*.woff    — showcase output fonts
              //   • Hero sample .woff loaded by index.css
              urlPattern: /\.(?:woff2?|ttf|otf)(?:$|\?)/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "wing-font-fonts-v1",
                expiration: {
                  // Hard cap so users who experiment with many
                  // uploaded/generated fonts in the generator
                  // don't accumulate an unbounded SW cache.
                  maxEntries: 50,
                  // Cached fonts kept up to a year. SWR re-fetches
                  // in the background on each visit, so the age
                  // limit is mainly a backstop for devices that
                  // visit rarely.
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  // `0` covers opaque (no-CORS) cross-origin
                  // responses, `200` covers regular OK responses.
                  // Both apply here because fonts may be served
                  // same-origin (wing-fonts.chunlaw.io) or
                  // cross-origin without CORS headers.
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          // No SW in dev — avoids the classic "I changed CSS but
          // the page doesn't update because the SW is serving the
          // old build" debugging pain. SW is production-only.
          enabled: false,
        },
      }),
    ],
    server: {
      https: false,
      host: true,
      port: parseInt(env.PORT ?? "9100", 10),
      // strictPort: true,
    },
  };
});
