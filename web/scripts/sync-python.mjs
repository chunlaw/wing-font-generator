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

import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(HERE, "..");
const REPO_ROOT = join(WEB_DIR, "..");
const PYTHON_DIR = join(REPO_ROOT, "python");
const TARGET = join(WEB_DIR, "public", "wingfont");
// The Pyodide worker imports this JSON to know which Python modules
// to copy into its virtual filesystem at boot. Single source of truth
// = the MANIFEST below; this file is regenerated on every sync so the
// worker and the manifest can never drift. Gitignored.
const WORKER_MANIFEST_OUT = join(
  WEB_DIR, "src", "workers", "pyodideFiles.generated.json"
);

// [source path under python/, dest path under public/wingfont/]
//
// Edit this list when adding a new Python module that should be visible
// to the Pyodide pipeline, a new default mapping, or a new bundled font.
const MANIFEST = [
  // Core pipeline — these match the `import` statements in runner.py
  ["wing-font.py", "wingfont_main.py"], // hyphen → underscore, see header comment
  ["build_glyph.py", "build_glyph.py"],
  ["chain_context_handler.py", "chain_context_handler.py"],
  ["ivs_handler.py", "ivs_handler.py"],
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
  ["mappings/canto-thai.csv", "mappings/canto-thai.csv"],
  ["mappings/canto-korean.csv", "mappings/canto-korean.csv"],
  ["mappings/canto-katakana.csv", "mappings/canto-katakana.csv"],
  ["mappings/canto-filipino.csv", "mappings/canto-filipino.csv"],
  ["mappings/canto-urdu.csv", "mappings/canto-urdu.csv"],
  // Toneless / decorative variants (tone digit stripped) — souvenir use.
  ["mappings/canto-thai-notone.csv", "mappings/canto-thai-notone.csv"],
  ["mappings/canto-korean-notone.csv", "mappings/canto-korean-notone.csv"],
  ["mappings/canto-katakana-notone.csv", "mappings/canto-katakana-notone.csv"],
  ["mappings/canto-filipino-notone.csv", "mappings/canto-filipino-notone.csv"],
  ["mappings/canto-urdu-notone.csv", "mappings/canto-urdu-notone.csv"],
  ["mappings/cangjie.csv", "mappings/cangjie.csv"],
  // Mandarin — Hanyu Pinyin in numeric-tone form (e.g. `ling2`,
  // `yuan2`). Two regional variants, each ~95k rows / ~3 MB covering
  // the full Unihan CJK ideograph range; the in-browser pipeline
  // surfaces every entry that matches a glyph in the user's selected
  // base font. Pair naturally with Noto Sans SC (or any base font) +
  // Noto Serif / Huninn annotation.
  //   • mandarin-cn.csv — Mainland 普通話 (also Singapore / Malaysia).
  //   • mandarin-tw.csv — Taiwan 國語 (753 single-char defaults
  //     re-derived from the MOE 國語辭典).
  ["mappings/mandarin-cn.csv", "mappings/mandarin-cn.csv"],
  ["mappings/mandarin-tw.csv", "mappings/mandarin-tw.csv"],
  // Taiwanese / Southern Min (河洛話) mappings — surfaced as Step 2
  // presets for the Noto Sans TC + Huninn pairing. The standard (優勢腔)
  // reading data is the MOE 臺灣台語常用詞辭典 (sutian / kautian.ods) via
  // ChhoeTaigi — KipUnicode→Tâi-lô, PojUnicode→POJ, TLPA/BP derived. Word
  // entries are space-separated per character so they drive 多音字
  // disambiguation. Two diacritic schemes + four numeric-tone schemes.
  ["mappings/taigi-tl-toned.csv", "mappings/taigi-tl-toned.csv"],
  ["mappings/taigi-poj-toned.csv", "mappings/taigi-poj-toned.csv"],
  ["mappings/taigi-tl.csv", "mappings/taigi-tl.csv"],
  ["mappings/taigi-poj.csv", "mappings/taigi-poj.csv"],
  ["mappings/taigi-tlpa.csv", "mappings/taigi-tlpa.csv"],
  ["mappings/taigi-bp.csv", "mappings/taigi-bp.csv"],
  // Nine 腔 (accent) variants in Tâi-lô, from the same sutian 語音差異
  // table — one reading per accent survey point. Tâi-lô tone-diacritic.
  ["mappings/taigi-tl-taipak.csv", "mappings/taigi-tl-taipak.csv"],
  ["mappings/taigi-tl-sannkiap.csv", "mappings/taigi-tl-sannkiap.csv"],
  ["mappings/taigi-tl-sintik.csv", "mappings/taigi-tl-sintik.csv"],
  ["mappings/taigi-tl-taitiong.csv", "mappings/taigi-tl-taitiong.csv"],
  ["mappings/taigi-tl-lokkang.csv", "mappings/taigi-tl-lokkang.csv"],
  ["mappings/taigi-tl-tailam.csv", "mappings/taigi-tl-tailam.csv"],
  ["mappings/taigi-tl-kohiong.csv", "mappings/taigi-tl-kohiong.csv"],
  ["mappings/taigi-tl-gilan.csv", "mappings/taigi-tl-gilan.csv"],
  ["mappings/taigi-tl-manking.csv", "mappings/taigi-tl-manking.csv"],
  // Non-Latin Taiwanese annotation: 方音符號 (TPS, bopomofo-extended —
  // pair with a Bopomofo-covering CJK font like Noto Sans TC) and
  // 台灣語假名 (Taiwanese kana — pair with Noto Sans JP). Derived from
  // ButTaiwan/taigivs (Apache-2.0; readings from MOE 教典).
  ["mappings/taigi-tps.csv", "mappings/taigi-tps.csv"],
  ["mappings/taigi-kana.csv", "mappings/taigi-kana.csv"],
  // Teochew / Min Nan (潮州話) mappings — surfaced as Step 2 presets for
  // the Noto Sans TC + Huninn pairing. Two diacritic schemes (tlo,
  // duffus) plus four numeric-tone schemes (gdpi, ggnn, dieghv, sinwz).
  // Source: learn-teochew teochew_scrape.json readings, converted with
  // the parsetc parser. Keep in sync with BUILT_IN_MAPPINGS.
  ["mappings/teochew-gdpi.csv", "mappings/teochew-gdpi.csv"],
  ["mappings/teochew-duffus.csv", "mappings/teochew-duffus.csv"],
  ["mappings/teochew-tlo.csv", "mappings/teochew-tlo.csv"],
  ["mappings/teochew-ggnn.csv", "mappings/teochew-ggnn.csv"],
  ["mappings/teochew-dieghv.csv", "mappings/teochew-dieghv.csv"],
  ["mappings/teochew-sinwz.csv", "mappings/teochew-sinwz.csv"],

  // Built-in fonts surfaced as preset options in Step 1. Keep in sync
  // with `BUILT_IN_BASE_FONTS` in wingfontPresets.ts. The Chiron fonts
  // weigh 5–25 MB each — they're the dominant chunk of public/ — but
  // the curated set is intentional for a good first-run UX.
  //
  ["input_fonts/NotoSerif-Regular.ttf", "NotoSerif-Regular.ttf"],
  ["input_fonts/ChironSungHK-R.ttf", "ChironSungHK-R.ttf"],
  ["input_fonts/ChironSungHK-R-It.ttf", "ChironSungHK-R-It.ttf"],
  ["input_fonts/ChironHeiHK-R.ttf", "ChironHeiHK-R.ttf"],
  ["input_fonts/ChironHeiHK-B.ttf", "ChironHeiHK-B.ttf"],
  // Script-specific annotation fonts paired with the canto-thai /
  // canto-katakana / canto-korean mappings above. Renamed for URL
  // cleanliness: Google Sans's source filename has commas in it
  // ("GoogleSans-VariableFont_GRAD,opsz,wght.ttf") which need URL
  // encoding; the Noto Sans pair gets "-VF" in place of
  // "-VariableFont_wght" for the same reason.
  [
    "input_fonts/GoogleSans-VariableFont_GRAD,opsz,wght.ttf",
    "GoogleSans-VF.ttf",
  ],
  ["input_fonts/NotoSansJP-VariableFont_wght.ttf", "NotoSansJP-VF.ttf"],
  ["input_fonts/NotoSansKR-VariableFont_wght.ttf", "NotoSansKR-VF.ttf"],
  // Urdu (Nastaʿlīq) annotation font for the canto-urdu mapping.
  // Same "-VF" rename for URL cleanliness.
  [
    "input_fonts/NotoNastaliqUrdu-VariableFont_wght.ttf",
    "NotoNastaliqUrdu-VF.ttf",
  ],
  // Baybayin (Tagalog script) annotation font for canto-filipino.
  // Static Regular — no rename needed.
  [
    "input_fonts/NotoSansTagalog-Regular.ttf",
    "NotoSansTagalog-Regular.ttf",
  ],
  // Taiwanese / Southern Min showcase pairing: Noto Sans TC base CJK
  // font + Huninn (jf-openhuninn) annotation font carrying the Tâi-lô
  // / POJ tone marks. Keep in sync with BUILT_IN_BASE_FONTS /
  // BUILT_IN_ANNO_FONTS in wingfontPresets.ts.
  // Noto Sans TC is the variable font, bundled under its own name so
  // the Step 1 picker shows the weight slider. The default weight
  // resolves to Regular (400) — see defaultAxisLocation in
  // GenerateContext — and wing-font.py auto-instances the variable
  // base to a static master before composition (CLI + Pyodide alike).
  [
    "input_fonts/NotoSansTC-VariableFont_wght.ttf",
    "NotoSansTC-VariableFont_wght.ttf",
  ],
  // Noto Sans HK — Hong-Kong-styled CJK base font. Same variable
  // `wght` axis as Noto Sans TC / SC, same auto-instance behaviour.
  // Used by the Cantonese showcase default set so HK readers see
  // HK-locale glyph forms (字 / 為 / 起 / 緣 / 緊 follow HK
  // conventions rather than TW conventions).
  [
    "input_fonts/NotoSansHK-VariableFont_wght.ttf",
    "NotoSansHK-VariableFont_wght.ttf",
  ],
  // Simplified-Chinese sibling of Noto Sans TC. Same `wght` variable
  // axis; ship the variable file so the Step 1 weight slider works.
  [
    "input_fonts/NotoSansSC-VariableFont_wght.ttf",
    "NotoSansSC-VariableFont_wght.ttf",
  ],
  ["input_fonts/Huninn-Regular.ttf", "Huninn-Regular.ttf"],
  // Mengshen-equivalent Mandarin pairing (普通話 pinyin). Source Han
  // Serif + M+ 1m reproduces Mengshen's Serif product; Xiaolai + M+
  // Rounded 1c reproduces its Handwritten product (M+ Rounded is an
  // OFL stand-in for Mengshen's non-OFL SetoFontSP). All four are SIL
  // OFL-1.1 and USER-SUPPLIED — drop the TTFs into python/input_fonts/
  // under these names. sync warns "missing" and skips until they exist,
  // so adding the rows here is safe ahead of the binaries landing.
  // Keep in sync with BUILT_IN_BASE_FONTS / BUILT_IN_ANNO_FONTS.
  ["input_fonts/SourceHanSerif-Regular.ttf", "SourceHanSerif-Regular.ttf"],
  ["input_fonts/XiaolaiSC-Regular.ttf", "XiaolaiSC-Regular.ttf"],
  ["input_fonts/mplus-1m-medium.ttf", "mplus-1m-medium.ttf"],
  ["input_fonts/MPLUSRounded1c-Regular.ttf", "MPLUSRounded1c-Regular.ttf"],

  // Third-party wheels — emscripten/wasm Python packages that
  // micropip pulls in at worker boot. The filename here MUST match
  // the URL hard-coded in wingfontWorker.ts; if you swap the wheel
  // (e.g. after bumping Pyodide across an ABI boundary), update
  // both files in lockstep. See python/wheels/README.md for the
  // refresh procedure.
  [
    "wheels/uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl",
    "wheels/uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl",
  ],
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

  // ── Worker manifest (generated) ──────────────────────────────────
  //
  // wingfontWorker.ts boots Pyodide and writes every entry in this
  // list into its virtual filesystem at /home/pyodide/wingfont/.
  // Anything that ends in .py is a module Python's import path needs
  // to resolve; non-.py entries (font binaries, mapping CSVs,
  // wheels) are fetched on demand later and don't belong here.
  //
  // We derive this list from the MANIFEST so adding a new Python
  // module is a one-place edit. The worker imports the resulting
  // JSON via TypeScript's `resolveJsonModule`, which type-checks the
  // shape at build time. The file is regenerated on every sync run
  // (npm `sync` script, invoked by both `dev` and `build`) so the
  // worker can never see a stale list relative to public/wingfont/.
  const pythonFiles = MANIFEST
    .map(([, dest]) => dest)
    .filter((dest) => dest.endsWith(".py"));
  await mkdir(dirname(WORKER_MANIFEST_OUT), { recursive: true });
  await writeFile(
    WORKER_MANIFEST_OUT,
    JSON.stringify(pythonFiles, null, 2) + "\n",
  );
  const relManifest = relative(WEB_DIR, WORKER_MANIFEST_OUT);
  console.log(
    `sync-python: wrote ${pythonFiles.length} Python module path(s) to ${relManifest}`,
  );

  // Exit non-zero if anything failed so CI doesn't quietly ship a broken
  // bundle (e.g. a manifest entry that's been deleted from python/).
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
