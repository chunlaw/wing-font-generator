#!/usr/bin/env node
/**
 * pre-rendering.mjs — turn the client-rendered SPA into per-route static
 * HTML so search engines AND social unfurlers see real content.
 *
 * The problem this solves
 * -----------------------
 * The site ships as a Vite SPA on GitHub Pages. Every deep link
 * (/showcase, /specimen/X, /generate, …) is really just index.html plus
 * the spa-github-pages 404 redirect — so the raw HTML a crawler fetches
 * is an empty <div id="root"></div>. Google executes JS and eventually
 * sees the rendered page, but social unfurlers (Slack / X / Discord /
 * Facebook / LinkedIn / iMessage / WhatsApp / Telegram) do NOT run JS.
 * They read the static markup, find the homepage's default meta tags (or,
 * pre-fix, a "Redirecting…" shell), and every shared link looks identical.
 *
 * What this does (mirrors hkbus's scripts/pre-rendering.js methodology)
 * --------------------------------------------------------------------
 *   1. Serve the freshly built ./dist over localhost with an SPA
 *      fallback (any unknown path returns index.html, exactly like the
 *      404 redirect would resolve to).
 *   2. Drive headless Chrome to every URL listed in public/sitemap.xml
 *      (single source of truth for what's publicly visitable).
 *   3. Wait for window.__PRERENDER_READY__ (set in App.tsx once the
 *      route's useDocumentMeta effect has populated <title> + og/twitter
 *      + canonical), then capture the fully-rendered HTML.
 *   4. Write it to a static file at the route's path: /showcase ->
 *      dist/showcase.html, /specimen/X -> dist/specimen/X.html, / ->
 *      dist/index.html. GitHub Pages serves extensionless URLs from the
 *      matching .html, so the crawler now gets real markup. The 404
 *      redirect stays only as a fallback for any non-prerendered route.
 *
 * Run AFTER `vite build`:  yarn build && yarn prerender
 */

import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(HERE, "..");
const DIST = path.join(WEB_DIR, "dist");
const SITEMAP = path.join(WEB_DIR, "public", "sitemap.xml");

// How long to wait for the app to mount + set the ready flag before we
// snapshot anyway. The flag normally flips in well under a second; the
// timeout is a backstop so a single slow/odd route can't hang the build.
const READY_TIMEOUT_MS = 20000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

export function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}

/**
 * Decide whether a request should be aborted during prerendering.
 * Aborted: anything cross-origin (production fonts, Google Fonts,
 * analytics…), any font-binary / wasm URL, the Pyodide input dir, and
 * the font/image/media resource types. Everything else (the local
 * HTML/JS/CSS that boots React) is allowed through.
 *
 * `type` is Puppeteer's resourceType; `localHost` is the prerender
 * server's host. data:/blob: URLs have an empty host and are allowed.
 */
export function shouldBlockRequest(url, type, localHost) {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = "";
  }
  const isCrossOrigin = host !== "" && host !== localHost;
  const isFontOrAsset =
    /\.(?:woff2?|ttf|otf|eot)(?:$|\?)/i.test(url) ||
    /\.wasm(?:$|\?)/i.test(url) ||
    url.includes("/fonts/") ||
    url.includes("/wingfont/");
  return (
    isCrossOrigin ||
    isFontOrAsset ||
    type === "font" ||
    type === "image" ||
    type === "media"
  );
}

/**
 * Static file server with SPA fallback. The pristine index.html is read
 * ONCE into memory up front and served for every unmatched path, so that
 * writing prerendered route files into dist/ during the run (including
 * overwriting index.html for the "/" route) never changes what the next
 * navigation's shell looks like — every route boots from the same clean
 * shell, keeping the output deterministic regardless of route order.
 */
export async function startServer(indexHtml, distDir = DIST) {
  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      const decoded = decodeURIComponent(pathname);
      let filePath = path.join(distDir, decoded);

      // Block path traversal outside dist/.
      if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      let info = await stat(filePath).catch(() => null);
      if (info?.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        info = await stat(filePath).catch(() => null);
      }

      if (info?.isFile()) {
        res.writeHead(200, { "content-type": contentType(filePath) });
        createReadStream(filePath).pipe(res);
        return;
      }

      // SPA fallback — serve the in-memory pristine shell.
      res.writeHead(200, { "content-type": MIME[".html"] });
      res.end(indexHtml);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}

/** Extract route pathnames from the sitemap's <loc> entries. */
export async function readRoutes(sitemapPath = SITEMAP) {
  const xml = await readFile(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].trim(),
  );
  // De-dupe while preserving order; map absolute URL -> pathname.
  const seen = new Set();
  const routes = [];
  for (const loc of locs) {
    let pathname;
    try {
      pathname = new URL(loc).pathname;
    } catch {
      continue;
    }
    if (!seen.has(pathname)) {
      seen.add(pathname);
      routes.push(pathname);
    }
  }
  return routes;
}

/**
 * Runs INSIDE the page (via page.evaluate) right before the snapshot to
 * fix the flash-of-unstyled-content problem.
 *
 * MUI/Emotion inject their CSS through the CSSOM (`insertRule`) in
 * production "speedy" mode, which leaves the `<style data-emotion>` tags
 * EMPTY when the DOM is serialized — so the raw prerendered HTML would
 * render unstyled until the SPA boots. We read the live rules straight
 * from `document.styleSheets` (populated even in speedy mode, unlike the
 * tags' textContent), drop the now-redundant empty emotion tags, and
 * write one consolidated `<style data-prerender-css>` into <head>. The
 * static file is then fully styled before any JS runs.
 *
 * External `<link>` stylesheets (the Vite-built CSS) are skipped — they
 * carry an `href` and load on their own, so there's no need to inline
 * them. Self-contained (no closure refs) so Puppeteer can serialize it.
 */
export function inlineRuntimeCss() {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) continue;
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText;
    } catch {
      // Cross-origin sheet without CORS — rules aren't readable. (The
      // prerenderer blocks cross-origin requests anyway, so this is rare.)
    }
  }
  document.querySelectorAll("style[data-emotion]").forEach((el) => el.remove());
  if (css) {
    const style = document.createElement("style");
    style.setAttribute("data-prerender-css", "");
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/** Map a route pathname to its output file under a dist dir. */
export function outFileFor(route, distDir = DIST) {
  if (route === "/" || route === "") return path.join(distDir, "index.html");
  const clean = route.replace(/^\/+/, "").replace(/\/+$/, "");
  return path.join(distDir, `${clean}.html`);
}

async function main() {
  // Fail loudly if the build hasn't run — prerender operates on dist/.
  const indexPath = path.join(DIST, "index.html");
  const indexHtml = await readFile(indexPath).catch(() => null);
  if (!indexHtml) {
    console.error(
      `pre-rendering: ${indexPath} not found. Run \`yarn build\` first.`,
    );
    process.exit(1);
  }

  const routes = await readRoutes();
  if (routes.length === 0) {
    console.error("pre-rendering: no routes found in sitemap.xml — aborting.");
    process.exit(1);
  }

  // Imported lazily (rather than at module top) so the helpers above
  // can be unit-tested without puppeteer/Chrome present.
  const { default: puppeteer } = await import("puppeteer");

  const { server, origin } = await startServer(indexHtml);
  const localHost = new URL(origin).host;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // CI containers (e.g. GitHub Actions) give Chrome a 64 MB /dev/shm.
      // After a number of pages it exhausts that shared-memory tmpfs and the
      // browser process crashes — surfacing on the NEXT `browser.newPage()`
      // as `Target.createTarget: Session with given id not found`. Forcing
      // Chrome to use /tmp instead removes the cap and the crash.
      "--disable-dev-shm-usage",
    ],
  });

  console.log(`pre-rendering: ${routes.length} route(s) from sitemap.xml`);
  let ok = 0;
  let timedOut = 0;

  try {
    for (const route of routes) {
      const page = await browser.newPage();

      // Skip heavy/irrelevant resources. The snapshot only needs the
      // local HTML/JS/CSS to boot React and let the route's
      // useDocumentMeta populate <head> — it never depends on the actual
      // glyphs, images, or the Pyodide wasm/runtime. Blocking these is
      // what makes prerendering fast.
      //
      // The big offender is the showcase/specimen fonts: const.ts builds
      // each FontOption's `source` as an ABSOLUTE production URL
      // (VITE_FONT_URL → https://wing-font.chunlaw.io/fonts/<name>.woff2),
      // so a specimen page kicks off a cross-origin download of a
      // 0.5–1 MB woff2 from the live site over the network. Worse, fonts
      // pulled via the CSS Font Loading API (`new FontFace(...).load()`,
      // which is how loadFont works) are NOT always tagged with the
      // "font" resourceType by Chrome, so a resourceType-only filter
      // misses them. We therefore block by URL/host as well:
      //   • any request to a host other than the local prerender server
      //     (production fonts, Google Fonts, analytics, …), and
      //   • any font-binary or wasm URL, and the Pyodide input dir.
      await page.setRequestInterception(true);
      page.on("request", (r) => {
        if (shouldBlockRequest(r.url(), r.resourceType(), localHost)) {
          r.abort().catch(() => {});
        } else {
          r.continue().catch(() => {});
        }
      });

      await page.goto(`${origin}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      let ready = true;
      try {
        await page.waitForFunction(
          "window.__PRERENDER_READY__ === true",
          { timeout: READY_TIMEOUT_MS },
        );
      } catch {
        ready = false;
        timedOut += 1;
      }

      // Let one frame settle so any synchronous post-mount meta writes
      // land in the DOM before we read it.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => r(null))),
      );

      // Inline the runtime CSS-in-JS styles so the snapshot is fully
      // styled (no flash of unstyled content before the SPA boots).
      await page.evaluate(inlineRuntimeCss);

      const html = await page.content();
      const out = outFileFor(route);
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, html, "utf8");
      await page.close();

      ok += 1;
      const rel = path.relative(DIST, out);
      console.log(`  ${ready ? "✓" : "·"} ${route}  →  ${rel}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(
    `pre-rendering: wrote ${ok} file(s)` +
      (timedOut ? ` (${timedOut} hit the ready-timeout fallback)` : ""),
  );
}

// Run only when invoked directly (`node scripts/pre-rendering.mjs`), not
// when imported by tests for the helpers above.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
