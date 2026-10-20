#!/usr/bin/env node
/**
 * sitemap-generator.mjs — write dist/sitemap.xml from the live font
 * catalogue (AVAILABLE_FONTS in src/utils/const.ts), so a new font gets
 * a specimen page in the sitemap — and therefore a prerendered page —
 * without anyone hand-editing XML. Mirrors hkbus's sitemap-generator.js:
 * every page exists as /zh/… and /en/…, paired with hreflang alternates.
 *
 * Also writes dist/llms.txt (https://llmstxt.org) from the same catalogue.
 *
 * Run AFTER `vite build` and BEFORE pre-rendering.mjs (which reads the
 * generated file for its route list):  yarn build && yarn prerender
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const LANGS = ["zh", "en"];
const HREFLANG = { zh: "zh-Hant", en: "en" };
// x-default (visitors who are neither zh nor en) gets the English page.
export const DEFAULT_LANG = "en";
const PAGES = ["/", "/showcase", "/generate", "/about", "/credits", "/terms", "/privacy"];

/** src/utils/const.ts, loaded through Vite since it is TypeScript. */
export async function loadCatalog() {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: WEB_DIR,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    return await vite.ssrLoadModule("/src/utils/const.ts");
  } finally {
    await vite.close();
  }
}

/** Every font with its own public /specimen page. */
export const listedFonts = (catalog) =>
  Object.values(catalog.AVAILABLE_FONTS)
    .flatMap((dialect) => Object.values(dialect.fonts))
    .filter(catalog.isListedFont);

/** Sitemap XML: one <url> per (lang, path), each listing every language version. */
export function buildSitemap(host, paths, lastmod) {
  const url = (lang, p) => `${host}/${lang}${p}`;
  const entries = paths.flatMap((p) => {
    const links = [
      ...LANGS.map((l) => [HREFLANG[l], url(l, p)]),
      ["x-default", url(DEFAULT_LANG, p)],
    ]
      .map(([hl, href]) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${href}"/>`)
      .join("\n");
    return LANGS.map(
      (l) => `  <url>\n    <loc>${url(l, p)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${links}\n  </url>`,
    );
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${entries.join("\n")}\n</urlset>\n`
  );
}

const REPO_URL = "https://github.com/chunlaw/wing-font-generator";
const TTF_URL = `${REPO_URL}/releases/latest/download`;

/** llms.txt: what Wing Font is, where to start, and every published font. */
export function buildLlmsTxt(host, fonts) {
  const byLanguage = new Map();
  for (const f of fonts) byLanguage.set(f.language, [...(byLanguage.get(f.language) ?? []), f]);
  const fontSections = [...byLanguage]
    .map(
      ([language, list]) =>
        `### ${language}\n\n` +
        list
          .map(
            (f) =>
              `- [${f.displayName}](${host}/en/specimen/${f.name}): ${f.note ?? language}. ` +
              `Download: ${TTF_URL}/${f.name}.ttf`,
          )
          .join("\n"),
    )
    .join("\n\n");
  return `# Wing Font

> Free, open-source fonts with the pronunciation built into every glyph: type plain text and its Jyutping, Pinyin, Zhuyin, Tâi-lô or other reading appears with every character, with word-context readings chosen by the font's own OpenType rules. No ruby markup and no special app — it works in Word, Pages, Canva, Adobe apps and browsers, and in PowerPoint through the free [Wing Font add-in](https://wing-font-ppt.chunlaw.io/). Fonts are SIL OFL 1.1; the generator is MIT.

The site is bilingual: every page exists under /en/ and /zh/ (Traditional Chinese, Cantonese).

## Start here

- [Home](${host}/en/): what Wing Font is and how to install a font
- [Showcase](${host}/en/showcase): preview and download every pre-built font
- [Make your own font](${host}/en/generate): in-browser generator — pick a base font, an annotation font and a reading table
- [About](${host}/en/about): background and how the fonts work
- [Credits](${host}/en/credits): upstream fonts and reading-data sources with their licences

## For developers and AI agents

- [Source code](${REPO_URL}): the generator (Python, also run in the browser via Pyodide)
- [AGENTS.md](${REPO_URL}/blob/main/AGENTS.md): repo layout, commands, and how to add a language or romanization
- [CLI reference](${REPO_URL}/blob/main/python/README.md): \`pip install "git+${REPO_URL}#subdirectory=python"\`, then \`wing-font -i <base font> -a <annotation font> -m <mapping.csv> -o <name>\`
- [Mapping format](${REPO_URL}/blob/main/python/mappings/CONTRIBUTING-mappings.md): the \`character,reading\` CSVs behind each font
- [Wing Sans on Google Fonts](https://github.com/Wing-Font/wing-sans-chinese): the Wing Sans families submitted to Google Fonts

## Fonts

${fontSections}
`;
}

async function main() {
  const host = "https://" + readFileSync(path.join(WEB_DIR, "public", "CNAME"), "utf8").trim();
  const catalog = await loadCatalog();
  const listed = listedFonts(catalog);
  const fonts = listed.map((f) => f.name);
  if (fonts.length === 0) throw new Error("sitemap-generator: AVAILABLE_FONTS yielded no fonts");
  const paths = [...PAGES, ...fonts.map((n) => `/specimen/${n}`)];
  const xml = buildSitemap(host, paths, new Date().toISOString().slice(0, 10));
  writeFileSync(path.join(WEB_DIR, "dist", "sitemap.xml"), xml);
  const llms = buildLlmsTxt(
    host,
    listed.map((f) => ({
      ...f,
      language: catalog.getDialectLabel(catalog.findDialectKey(f.name), "en"),
    })),
  );
  writeFileSync(path.join(WEB_DIR, "dist", "llms.txt"), llms);
  console.log(`sitemap-generator: ${paths.length} pages × ${LANGS.length} languages (${fonts.length} fonts)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
