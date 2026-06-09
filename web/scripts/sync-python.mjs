#!/usr/bin/env node
/**
 * sync-python.mjs — copy the canonical Python sources from ../python/
 * into ./public/wingfont/ so the Pyodide worker can fetch them at runtime.
 *
 * Why this exists:
 *   wing-font-generator's CLI and Pyodide pipeline share the same .py
 *   sources. Before the monorepo merge they lived in two repos and had
 *   to be hand-copied — easy to forget, silently broke the demo. Now
 *   `python/` is the single source of truth and Vite picks the files up
 *   as static assets via this sync step.
 *
 * When this runs:
 *   `yarn dev` and `yarn build` invoke this script before Vite starts
 *   (see package.json scripts). The output directory `public/wingfont/`
 *   is gitignored — only the source under `python/` is checked in.
 *
 * One important transformation:
 *   `python/wing-font.py` is copied as `wingfont_main.py` because Python
 *   import names can't contain hyphens, and the Pyodide worker does
 *   `import wingfont_main`. The hyphen is fine for shell invocation but
 *   breaks `importlib`. Doing the rename here lets the CLI keep its
 *   conventional name while still being importable from JS.
 */

import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(HERE, "..");
const REPO_ROOT = join(WEB_DIR, "..");
const PYTHON_DIR = join(REPO_ROOT, "python");
const TARGET = join(WEB_DIR, "public", "wingfont");

// [source path under python/, dest path under public/wingfont/]
//
// Edit this list when adding a new Python module that should be visible
// to the Pyodide pipeline, a new default mapping, or a new bundled font.
const MANIFEST = [
  // Core pipeline — these match the `import` statements in runner.py
  ["wing-font.py", "wingfont_main.py"], // hyphen → underscore, see header comment
  ["build_glyph.py", "build_glyph.py"],
  ["chain_context_handler.py", "chain_context_handler.py"],
  ["liga_handler.py", "liga_handler.py"],
  ["utils.py", "utils.py"],
  ["runner.py", "runner.py"],

  // mappings/ package — csv_parser plus the CSVs we ship as built-in
  // preset options in Step 2. Keep the list in sync with the
  // `BUILT_IN_MAPPINGS` array in web/src/utils/wingfontPresets.ts —
  // both should reference the same set of files.
  ["mappings/__init__.py", "mappings/__init__.py"],
  ["mappings/csv_parser.py", "mappings/csv_parser.py"],
  ["mappings/canto-lshk.csv", "mappings/canto-lshk.csv"],
  ["mappings/canto-yale.csv", "mappings/canto-yale.csv"],
  ["mappings/canto-lau.csv", "mappings/canto-lau.csv"],
  ["mappings/canto-guangdong.csv", "mappings/canto-guangdong.csv"],
  ["mappings/canto-chishima.csv", "mappings/canto-chishima.csv"],
  ["mappings/cangjie.csv", "mappings/cangjie.csv"],

  // Built-in fonts surfaced as preset options in Step 1. Keep in sync
  // with `BUILT_IN_BASE_FONTS` in wingfontPresets.ts. The Chiron fonts
  // weigh 5–25 MB each — they're the dominant chunk of public/ — but
  // the curated set is intentional for a good first-run UX.
  //
  // 方正楷体.ttf is renamed to FZKaiti.ttf in the bundle because the
  // worker fetches via origin-absolute URL and non-ASCII filenames
  // need URL encoding which we'd rather not have to round-trip.
  ["input_fonts/NotoSerif-Regular.ttf", "NotoSerif-Regular.ttf"],
  ["input_fonts/ChironSungHK-R.ttf", "ChironSungHK-R.ttf"],
  ["input_fonts/ChironSungHK-R-It.ttf", "ChironSungHK-R-It.ttf"],
  ["input_fonts/ChironHeiHK-R.ttf", "ChironHeiHK-R.ttf"],
  ["input_fonts/ChironHeiHK-B.ttf", "ChironHeiHK-B.ttf"],
  ["input_fonts/方正楷体.ttf", "FZKaiti.ttf"],
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // Sanity-check the source exists before nuking the target.
  if (!(await exists(PYTHON_DIR))) {
    console.error(
      `ERROR: ${PYTHON_DIR} does not exist. Run this script from inside ` +
        `wing-font-generator/web/, or check that the python/ sibling ` +
        `directory hasn't been moved.`,
    );
    process.exit(1);
  }

  // Wipe the target before copying so removed/renamed source files don't
  // leave stale copies that would silently still be served by Vite.
  await rm(TARGET, { recursive: true, force: true });
  await mkdir(TARGET, { recursive: true });

  let copied = 0;
  let failed = 0;
  for (const [src, dest] of MANIFEST) {
    const srcPath = join(PYTHON_DIR, src);
    const destPath = join(TARGET, dest);
    try {
      if (!(await exists(srcPath))) {
        console.warn(`  ! missing: ${src}`);
        failed += 1;
        continue;
      }
      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(srcPath, destPath);
      copied += 1;
    } catch (err) {
      console.error(`  x ${src}: ${err.message}`);
      failed += 1;
    }
  }

  const relTarget = relative(WEB_DIR, TARGET);
  console.log(
    `sync-python: ${copied} file(s) copied to ${relTarget}/${
      failed ? `, ${failed} missing/failed` : ""
    }`,
  );
  // Exit non-zero if anything failed so CI doesn't quietly ship a broken
  // bundle (e.g. a manifest entry that's been deleted from python/).
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
