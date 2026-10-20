#!/usr/bin/env node
/**
 * og-images.mjs — render one 1200×630 share card per listed font into
 * dist/og/<name>.png, set in the font itself, so every /specimen page
 * unfurls with its own image. A new font in AVAILABLE_FONTS gets a card
 * on the next deploy with no extra work.
 *
 * Needs the built fonts at <repo>/fonts/<name>.woff2 (CI restores them
 * from the fonts cache before this runs). Without that folder — a local
 * build — it skips; with it, a missing font fails the build so no page
 * ships pointing at an image that doesn't exist.
 *
 * Run after pre-rendering.mjs:  yarn build && yarn prerender
 */
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { startServer } from "./pre-rendering.mjs";
import { listedFonts, loadCatalog } from "./sitemap-generator.mjs";

const WEB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.join(WEB_DIR, "..");
const FONTS_DIR = path.join(REPO, "fonts");
const OUT_DIR = path.join(WEB_DIR, "dist", "og");
const LABEL_FONT = "/python/input_fonts/NotoSansHK-VariableFont_wght.ttf";

/** Card page, served from the repo root; it reads what to draw from its query string. */
export const CARD_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Label; src: url(${LABEL_FONT}); }
html, body { margin: 0; width: 1200px; height: 630px; background: #f6f3ec; color: #1d2a30; font-family: Label, sans-serif; }
.card { box-sizing: border-box; height: 100%; padding: 48px 72px 56px; display: flex; flex-direction: column; border-top: 16px solid #1f7a8c; }
.top { display: flex; justify-content: space-between; font-size: 28px; font-weight: 700; color: #1f7a8c; }
.sample { flex: 1; display: flex; align-items: center; white-space: nowrap; line-height: 1.6; font-size: 120px; }
.name { font-size: 52px; font-weight: 700; }
.sub { font-size: 30px; color: #55646b; margin-top: 8px; }
</style></head><body><div class="card">
<div class="top"><span>Wing Font</span><span id="host"></span></div>
<div class="sample" id="sample" dir="auto"></div>
<div class="name" id="name"></div>
<div class="sub" id="sub"></div>
</div><script>
const q = new URLSearchParams(location.search);
for (const id of ["host", "sample", "name", "sub"]) document.getElementById(id).textContent = q.get(id);
const face = new FontFace("Specimen", "url(/fonts/" + q.get("font") + ".woff2)");
window.cardReady = Promise.all([
  face.load().then((f) => document.fonts.add(f)),
  document.fonts.load("52px Label"),
]).then(() => {
  const el = document.getElementById("sample");
  el.style.fontFamily = "Specimen";
  for (let size = 120; el.scrollWidth > el.clientWidth && size > 40; size -= 4) el.style.fontSize = size + "px";
});
</script></body></html>`;

/**
 * Card sample per language (keys = findTemplateKey: cantonese, mandarin-tw, …).
 * Own wording only — no song lyrics. Keep each to one short line. A
 * language left out gets the generic /share.png as its card.
 */
const OG_SAMPLES = {
  cantonese: "般若波羅蜜多",
  taiwanese: "愛拚才會贏",
  teochew: "自己人，有事好參詳",
  "mandarin-tw": "君子不立危牆之下",
  "mandarin-cn": "天行健，君子以自强不息",
  japanese: "精力善用　自他共榮",
  thai: "น้ำนิ่งไหลลึก",
  // arabic: "",
  // hindi: "",
  // inuktitut: "",
};

async function main() {
  try {
    await access(FONTS_DIR);
  } catch {
    console.log(`og-images: no ${path.relative(REPO, FONTS_DIR)}/ folder — skipping share cards`);
    return;
  }
  const catalog = await loadCatalog();
  const fonts = listedFonts(catalog);
  const host = (await readFile(path.join(WEB_DIR, "public", "CNAME"), "utf8")).trim();

  const { default: puppeteer } = await import("puppeteer");
  const { server, origin } = await startServer(CARD_HTML, REPO);
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  await mkdir(OUT_DIR, { recursive: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    const missing = new Set();
    for (const font of fonts) {
      const out = path.join(OUT_DIR, `${font.name}.png`);
      const sample = OG_SAMPLES[catalog.findTemplateKey(font.name)];
      if (!sample) {
        missing.add(catalog.findTemplateKey(font.name));
        await copyFile(path.join(WEB_DIR, "public", "share.png"), out);
        continue;
      }
      const dialect = catalog.findDialectKey(font.name);
      const params = new URLSearchParams({
        font: font.name,
        host,
        sample,
        name: font.displayName,
        sub: [catalog.getDialectLabel(dialect, "zh"), font.note].filter(Boolean).join(" · "),
      });
      await page.goto(`${origin}/card?${params}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => window.cardReady).catch((err) => {
        throw new Error(`og-images: ${font.name}.woff2 failed to load: ${err.message ?? err}`);
      });
      await writeFile(out, await page.screenshot({ type: "png" }));
    }
    await page.close();
    if (missing.size) console.warn(`og-images: no OG_SAMPLES line for ${[...missing].join(", ")} — used /share.png`);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`og-images: wrote ${fonts.length} card(s) to dist/og/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
