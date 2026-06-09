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

  // mappings/ package — csv_parser plus the CSVs we want to ship as
  // built-in defaults. Add more CSVs here if you want them visible in
  // the in-browser font generator's dropdown.
  ["mappings/__init__.py", "mappings/__init__.py"],
  ["mappings/csv_parser.py", "mappings/csv_parser.py"],
  ["mappings/canto-lshk.csv", "mappings/canto-lshk.csv"],
  ["mappings/canto-yale.csv", "mappings/canto-yale.csv"],
  ["mappings/cangjie.csv", "mappings/cangjie.csv"],

  // Default sample fonts loaded when the user hasn't uploaded their own.
  // Kept small — the 23 MB Chiron font is intentional and worth the cost
  // for a good first-run experience, but consider hosting on a CDN if
  // the bundle size becomes a problem.
  ["input_fonts/NotoSerif-Regular.ttf", "NotoSerif-Regular.ttf"],
  ["input_fonts/ChironSungHK-R.ttf", "ChironSungHK-R.ttf"],
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
