#!/usr/bin/env node
/**
 * gen-font-facts.mjs — write src/utils/fontFacts.generated.json: for each
 * published font, the base font, annotation font and mapping CSV it is
 * built from. Read straight from the CI matrix in deploy-pages.yml, so a
 * new matrix entry shows up on its /specimen page with no extra edits.
 * Runs as part of `yarn sync` (before every dev/build).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WEB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = path.join(WEB_DIR, "..", ".github", "workflows", "deploy-pages.yml");
const OUT = path.join(WEB_DIR, "src", "utils", "fontFacts.generated.json");

// The five Google Fonts families are built in github.com/Wing-Font/wing-sans-chinese
// (its config.yaml), not in this repo's matrix.
const WING_SANS = {
  WingSansYueJyutping: ["Noto Sans HK", "cantonese/canto-lshk.csv"],
  WingSansYueYale: ["Noto Sans HK", "cantonese/canto-yale.csv"],
  WingSansGuoyuPinyin: ["Noto Sans TC", "mandarin/mandarin-tw-toned.csv"],
  WingSansPutonghuaPinyin: ["Noto Sans SC", "mandarin/mandarin-cn-toned-trimmed.csv"],
  WingSansTaigiTailo: ["Noto Sans TC", "taiwanese/taigi-tl-toned.csv"],
};

/** "input_fonts/NotoSansHK-VariableFont_wght.ttf" -> "Noto Sans HK" */
export function fontLabel(file) {
  const stem = path.basename(file).split(/[-.[]/)[0];
  return stem.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** { name: { base, annotation, mapping } } for every `- { name: …, args: "…" }` matrix line. */
export function parseMatrix(yml) {
  const facts = {};
  for (const line of yml.split("\n")) {
    const m = line.match(/^\s*- \{ name: (\w+),.*\bargs: "(.*)" \}\s*$/);
    if (!m) continue;
    const flags = {};
    for (const f of m[2].matchAll(/(?:^|\s)-([iam]) (?:'([^']+)'|(\S+))/g)) {
      flags[f[1]] = f[2] ?? f[3];
    }
    if (!flags.i || !flags.a || !flags.m) continue;
    facts[m[1]] = {
      base: fontLabel(flags.i),
      annotation: fontLabel(flags.a),
      mapping: flags.m.replace(/^mappings\//, ""),
    };
  }
  return facts;
}

function main() {
  const facts = parseMatrix(readFileSync(WORKFLOW, "utf8"));
  for (const [name, [base, mapping]] of Object.entries(WING_SANS)) {
    facts[name] = { base, annotation: "Noto Sans", mapping };
  }
  writeFileSync(OUT, JSON.stringify(facts, null, 2) + "\n");
  console.log(`gen-font-facts: ${Object.keys(facts).length} fonts → ${path.relative(WEB_DIR, OUT)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
