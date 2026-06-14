#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_mappings.py — sanity-check Wing Font mapping CSVs.

A lightweight gate for contributors and CI: it catches the mistakes that
would otherwise surface as a broken build, a wasted glyph, or a wrong
annotation a reviewer can't easily spot — without needing the base fonts
or running the full pipeline.

Checks (per CSV)
----------------
ERRORS (exit 1):
  * a row with fewer than 2 columns, or an empty key / annotation;
  * a 4th-column provenance value that isn't one of the known tags
    (curated / auto / auto-clitic);
  * the key's own script leaking into the annotation column — e.g. an
    Arabic letter left in the DIN romanization, or a Han character in a
    Jyutping reading (a common copy-paste / pipeline bug);
  * predicted glyph count over OpenType's hard 65,535 cap.

WARNINGS (reported, exit 0):
  * a 3rd column that isn't an integer weight (csv_parser falls back to
    weight 1, so it builds — but it's usually a typo);
  * exact-duplicate rows (same key AND annotation) — redundant, one
    wasted glyph each;
  * predicted glyph count over a soft cap (build still works, but the
    headroom under the hard cap is shrinking).

Usage
-----
    python validate_mappings.py                 # all *.csv beside this script
    python validate_mappings.py canto-lshk.csv arabic-romanization.csv
    python validate_mappings.py --strict        # treat warnings as errors
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Reuse the canonical script ranges + provenance vocabulary so the
# validator can never drift from what the parser / generator use.
from csv_parser import (  # noqa: E402
    ARABIC_RANGES, THAI_RANGES, DEVANAGARI_RANGES, is_word_unit_word,
)

_LATIN = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

OPENTYPE_HARD_CAP = 65535
GLYPH_SOFT_CAP = 64000
VALID_PROVENANCE = {"curated", "auto", "auto-clitic", "blank"}

# Script ranges used to detect "key script leaked into the annotation".
# CJK is included so a stray Han character in a romanization is caught.
CJK_RANGES = (
    (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF),
    (0x20000, 0x2EBEF),
)
SCRIPT_RANGES = {
    "Arabic": ARABIC_RANGES,
    "Thai": THAI_RANGES,
    "Devanagari": DEVANAGARI_RANGES,
    "CJK": CJK_RANGES,
}


def _in_ranges(cp: int, ranges) -> bool:
    return any(lo <= cp <= hi for lo, hi in ranges)


def _key_script(key: str) -> str | None:
    """Which script does the KEY belong to (first matching char)?"""
    for ch in key:
        cp = ord(ch)
        for name, ranges in SCRIPT_RANGES.items():
            if _in_ranges(cp, ranges):
                return name
    return None


def validate_file(path: Path) -> tuple[list[str], list[str]]:
    """Return (errors, warnings) for one mapping CSV."""
    errors: list[str] = []
    warnings: list[str] = []
    seen_rows: set[tuple[str, str]] = set()
    # Predicted output glyphs, matching wing-font's char_mapping count:
    # word-unit rows → one glyph per (word, whole-annotation); CJK per-char
    # rows → one glyph per (single char, single reading), decomposed from
    # space-separated phrase annotations. A set de-dupes across rows.
    glyph_units: set[tuple[str, str]] = set()
    has_prov = False
    no_prov = False

    with path.open("r", encoding="utf-8") as fh:
        for n, row in enumerate(csv.reader(fh), 1):
            if not row or (len(row) == 1 and not row[0].strip()):
                continue  # blank line
            if len(row) < 2:
                errors.append(f"line {n}: only {len(row)} column(s): {row!r}")
                continue
            key = row[0]
            anno_raw = row[1]
            anno = anno_raw.strip()
            if not key:
                errors.append(f"line {n}: empty key")
                continue
            # A whitespace-only annotation is a deliberate "blank" row:
            # csv_parser keeps it as a real (blank) annotation glyph, so the
            # base character is scaled down to match its annotated neighbours
            # but no furigana ink is drawn. This is how kana / Japanese
            # symbols ride the same base_scale as annotated kanji. Only a
            # TRULY empty field is an error.
            blank = anno == "" and anno_raw != ""
            if anno == "" and not blank:
                errors.append(f"line {n}: empty annotation for '{key}'")
                continue
            # An ASCII space can't survive csv_parser's per-character
            # space-split, so a blank row must use U+3000 (　) or similar.
            if blank and " " in anno_raw:
                warnings.append(
                    f"line {n}: blank annotation for '{key}' contains an ASCII "
                    f"space — use the ideographic space U+3000 (　) instead")

            # weight (col 3) — warn if present but non-integer
            if len(row) > 2 and row[2] != "" and not row[2].lstrip("-").isdigit():
                warnings.append(
                    f"line {n}: weight '{row[2]}' is not an integer "
                    f"(parser will fall back to 1) — '{key}'")

            # provenance (col 4)
            if len(row) > 3 and row[3] != "":
                has_prov = True
                if row[3] not in VALID_PROVENANCE:
                    errors.append(
                        f"line {n}: unknown provenance '{row[3]}' "
                        f"(expected one of {sorted(VALID_PROVENANCE)}) — '{key}'")
            else:
                no_prov = True

            # Key-script leak into the annotation — but ONLY when the
            # annotation is a romanization (contains Latin letters). That
            # distinguishes an accidental leak (Latin "fī" + a stray Arabic
            # letter) from annotation schemes where the base script is
            # intentional (Cangjie decomposition into Han radicals, or a
            # Devanagari/Katakana phonetic annotation).
            script = _key_script(key)
            if not blank and script is not None and any(c in _LATIN for c in anno):
                leaked = sorted({c for c in anno
                                 if _in_ranges(ord(c), SCRIPT_RANGES[script])})
                if leaked:
                    errors.append(
                        f"line {n}: {script} character(s) {leaked} mixed into "
                        f"the romanization of '{key}' → '{anno}' "
                        f"(base script leaked into the annotation?)")

            # Blank rows keep their raw whitespace as the annotation glyph.
            anno_eff = anno_raw if blank else anno
            if (key, anno_eff) in seen_rows:
                shown = "blank" if blank else anno
                warnings.append(
                    f"line {n}: duplicate row (key+annotation) — '{key}','{shown}'")
            seen_rows.add((key, anno_eff))

            # Accumulate predicted glyphs the way the build will count them.
            if is_word_unit_word(key):
                glyph_units.add((key, anno_eff))
            else:
                annos = anno_eff.split(" ")
                if len(annos) == len(key):
                    for ch, a in zip(key, annos):
                        if a:
                            glyph_units.add((ch, a))

    predicted = len(glyph_units)
    if predicted > OPENTYPE_HARD_CAP:
        errors.append(
            f"predicted {predicted:,} glyphs exceeds the OpenType hard cap "
            f"{OPENTYPE_HARD_CAP:,} — the build will fail; trim rows")
    elif predicted > GLYPH_SOFT_CAP:
        warnings.append(
            f"predicted {predicted:,} glyphs is near the {OPENTYPE_HARD_CAP:,} "
            f"cap (soft limit {GLYPH_SOFT_CAP:,}); little headroom left")

    if has_prov and no_prov:
        warnings.append(
            "file mixes rows with and without a provenance column — "
            "consider regenerating so every row is tagged")

    return errors, warnings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Wing Font mapping CSVs")
    parser.add_argument("files", nargs="*", type=Path,
                        help="CSV files to check (default: all *.csv beside "
                             "this script)")
    parser.add_argument("--strict", action="store_true",
                        help="Treat warnings as errors (exit 1 on any warning)")
    args = parser.parse_args(argv)

    files = args.files or sorted(p for p in HERE.rglob("*.csv") if "regional-build" not in p.parts)
    if not files:
        print("no CSV files to validate", file=sys.stderr)
        return 0

    total_err = total_warn = 0
    for path in files:
        if not path.exists():
            print(f"✗ {path}: not found", file=sys.stderr)
            total_err += 1
            continue
        errors, warnings = validate_file(path)
        total_err += len(errors)
        total_warn += len(warnings)
        if errors or warnings:
            status = "✗" if errors else "⚠"
            print(f"{status} {path.name}: "
                  f"{len(errors)} error(s), {len(warnings)} warning(s)")
            for e in errors:
                print(f"    ERROR  {e}")
            for w in warnings[:20]:
                print(f"    warn   {w}")
            if len(warnings) > 20:
                print(f"    warn   … and {len(warnings) - 20} more warnings")
        else:
            print(f"✓ {path.name}")

    print(f"\n{len(files)} file(s): {total_err} error(s), "
          f"{total_warn} warning(s)")
    if total_err or (args.strict and total_warn):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
