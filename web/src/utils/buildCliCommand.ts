/**
 * buildCliCommand — JS mirror of wing-font.py's `_format_cli_invocation`.
 *
 * Given the same generation parameters the in-browser flow hands to the
 * Pyodide runner, produces the equivalent `python wing-font.py …` shell
 * command. Used by Step 3 to show users what the build is about to do
 * BEFORE they trigger it: a copy-paste-runnable command they can use
 * locally to reproduce the same output (substituting their own font
 * paths if they uploaded customs).
 *
 * Behaviour intentionally tracks the Python helper exactly:
 *   * arguments at their CLI default are omitted to keep the line short
 *   * variable-font axis locations are emitted as repeated
 *     `--base-axis TAG=VALUE` / `--anno-axis TAG=VALUE` flags
 *   * paths are POSIX-shell quoted (single-quote with internal
 *     single-quote escaping; bare strings stay bare when safe)
 *
 * Keeping the two in sync matters: if a user runs the printed command
 * locally they should get a font byte-identical (modulo font cache
 * timestamps) to what `/generate` produced. If you add a new CLI flag
 * to wing-font.py, mirror it here.
 */

import type { GenerateParams, AxisLocation } from "../pages/Generate/types";

/** Default values matching wing-font.py main() signature. Anything at
 *  these defaults is omitted from the emitted command. */
const PY_DEFAULTS = {
  baseScale: 0.75,
  annoScale: 0.25,
  annoSpacing: 0,
  yOffsetRatio: 0.8,
  invert: false,
  optimize: false, // CLI default; web overrides to `true` so -opt will show
  // `丅` (U+4E05) is the trigger character default in wing-font.py.
  // Keep this in sync with `DEFAULT_TRIGGER_CHAR` in liga_handler.py.
  triggerChar: "丅",
} as const;

/**
 * POSIX shell quote — single-quote unless the string is "safe enough"
 * (alphanumerics + a small allow-list). Mirrors Python's `shlex.quote`
 * closely enough that the emitted command parses identically in bash /
 * zsh / dash.
 *
 * Single-quoting is preferred over backslash escaping because it
 * disables ALL interpretation inside the quotes — no surprises with
 * `$VAR`, backticks, or backslash sequences. The only character we
 * have to handle specially is the single quote itself: terminate the
 * quoted run, escape a literal quote, restart the quoted run.
 *
 *     don't  →  'don'\''t'
 *
 * Empty strings emit `''` (two single quotes), which is what shells
 * expect for an explicit empty arg.
 */
const SAFE_RE = /^[A-Za-z0-9_\-./=:,@+]+$/;
function shellQuote(s: string): string {
  if (s === "") return "''";
  if (SAFE_RE.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/** Format an axis value — integer when no fractional part, otherwise
 *  decimal. Matches the Python `_fmt_axis` helper so the command
 *  round-trips through argparse cleanly. */
function fmtAxisValue(v: number): string {
  return Number.isInteger(v) ? String(v) : String(v);
}

export interface BuildCliCommandInput {
  /** Base font filename (display only — user substitutes when running
   *  locally). Typically `baseFont.name`. */
  baseFontName: string;
  /** Annotation font filename (display only). Typically
   *  `annoFont.name`. */
  annoFontName: string;
  /** Mapping CSV name. For built-in presets, the preset key (e.g.
   *  `"canto-lshk"`). For user-supplied custom CSVs, `null` →
   *  `mapping.csv` placeholder. */
  mappingPresetKey: string | null;
  /** All Step 3 dials (familyName, baseScale, …, outAscent). */
  params: GenerateParams;
  /** Variable-font axis pin for the base font, if any. */
  baseAxisLocation?: AxisLocation;
  /** Variable-font axis pin for the annotation font, if any. */
  annoAxisLocation?: AxisLocation;
}

/**
 * Render the CLI command string. Output matches Python's
 * `_format_cli_invocation` token-for-token modulo line breaks (single
 * line here; the caller can soft-wrap visually).
 */
// Built-in mapping CSVs live in per-language subfolders under
// python/mappings/ (cantonese/, taiwanese/, …). The preset key prefix
// identifies the folder; cangjie and uploaded mappings stay at the root.
function mappingDirFor(key: string): string {
  const dirs: [string, string][] = [
    ["canto", "cantonese/"],
    ["taigi", "taiwanese/"],
    ["teochew", "teochew/"],
    ["mandarin", "mandarin/"],
    ["japanese", "japanese/"],
    ["thai", "thai/"],
    ["hindi", "hindi/"],
    ["arabic", "arabic/"],
  ];
  for (const [prefix, dir] of dirs) {
    if (key.startsWith(prefix)) return dir;
  }
  return "";
}

export function buildCliCommand({
  baseFontName,
  annoFontName,
  mappingPresetKey,
  params,
  baseAxisLocation,
  annoAxisLocation,
}: BuildCliCommandInput): string {
  // Path prefixes match wing-font-generator's repo layout. A user
  // running locally will have cloned the repo and put their inputs
  // in input_fonts/ and mappings/ alongside the script.
  const basePath = `input_fonts/${baseFontName || "<base-font>.ttf"}`;
  const annoPath = `input_fonts/${annoFontName || "<anno-font>.ttf"}`;
  const mappingPath = mappingPresetKey
    ? `mappings/${mappingDirFor(mappingPresetKey)}${mappingPresetKey}.csv`
    : "mappings/<your-mapping>.csv";

  // Output prefix derived from family name, sanitised for filesystem
  // use. Falls back to "outputs/wing-font" when the user cleared the
  // family field. Slashes/backticks/etc. stripped because they'd
  // become directory creation requests at runtime.
  const familyName = params.familyName || "";
  const safeFamily = familyName
    .replace(/[/\\<>:"|?*\x00-\x1f]+/g, "")
    .trim();
  const outputPrefix = `outputs/${safeFamily || "wing-font"}`;

  const parts: string[] = [
    "python wing-font.py",
    `-i ${shellQuote(basePath)}`,
    `-a ${shellQuote(annoPath)}`,
    `-m ${shellQuote(mappingPath)}`,
    `-o ${shellQuote(outputPrefix)}`,
  ];

  if (familyName) {
    parts.push(`-f ${shellQuote(familyName)}`);
  }
  if (params.baseScale !== PY_DEFAULTS.baseScale) {
    parts.push(`-bs ${params.baseScale}`);
  }
  if (params.annoScale !== PY_DEFAULTS.annoScale) {
    parts.push(`-as ${params.annoScale}`);
  }
  if (params.annoSpacing !== PY_DEFAULTS.annoSpacing) {
    parts.push(`--anno-spacing ${params.annoSpacing}`);
  }
  if (params.yOffsetRatio !== PY_DEFAULTS.yOffsetRatio) {
    parts.push(`-y ${params.yOffsetRatio}`);
  }
  if (params.invert) {
    parts.push("-v");
  }
  if (params.optimize) {
    parts.push("-opt");
  }
  if (params.triggerChar !== PY_DEFAULTS.triggerChar) {
    // Empty string is a legitimate value (disables the trigger
    // + numeral path); shellQuote emits `''`.
    parts.push(`--trigger-char ${shellQuote(params.triggerChar)}`);
  }
  if (
    typeof params.outAscent === "number" &&
    Number.isFinite(params.outAscent) &&
    params.outAscent > 0
  ) {
    parts.push(`--out-ascent ${Math.round(params.outAscent)}`);
  }

  // Axis location flags — one per (tag, value) pair, repeating the
  // flag rather than comma-joining. Skips empty / missing dicts.
  if (baseAxisLocation) {
    for (const [tag, value] of Object.entries(baseAxisLocation)) {
      parts.push(`--base-axis ${tag}=${fmtAxisValue(value)}`);
    }
  }
  if (annoAxisLocation) {
    for (const [tag, value] of Object.entries(annoAxisLocation)) {
      parts.push(`--anno-axis ${tag}=${fmtAxisValue(value)}`);
    }
  }

  return parts.join(" ");
}
