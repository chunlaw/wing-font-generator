#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_canto_siddham.py
====================
Generate ``mappings/canto-siddham.csv`` — a wing-font mapping that
annotates Chinese characters with their Cantonese pronunciation written
in the **Siddhaṃ** script (悉曇文字, Unicode block Siddham U+11580–U+115FF).

Why this is a pure transliteration of canto-hindi.csv
-----------------------------------------------------
``canto-hindi.csv`` already renders each Cantonese syllable in Devanagari
(an abugida that writes its vowels). Siddhaṃ is another Brahmic abugida
with the *same* structural inventory — independent vowels, dependent
vowel signs (mātrās), the inherent-a consonants, anusvāra/visarga and the
virāma (止聲符). The two blocks share systematic Unicode *names*
("DEVANAGARI LETTER KA" ↔ "SIDDHAM LETTER KA"), so the Cantonese→Siddhaṃ
romanisation is obtained by mapping each Devanagari codepoint to the
Siddhaṃ codepoint with the corresponding name. No new phonetic scheme is
designed: the Cantonese phonology already encoded in the Devanagari
spelling is preserved exactly, glyph-for-glyph.

The tone-digit suffix (e.g. ``आ1`` → ``𑖁1``) and the weight column are
copied through untouched, so the output is line-aligned with
canto-hindi.csv (and therefore with canto-lshk.csv) — the layout the
gen_canto_variant_weights.py pipeline expects for weight propagation.

Run::

    python gen_canto_siddham.py            # writes canto-siddham.csv
    python gen_canto_siddham.py --check    # verify only, no write
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import unicodedata
from pathlib import Path

HERE = Path(os.path.dirname(os.path.abspath(__file__)))
SOURCE = HERE / "canto-hindi.csv"
OUTPUT = HERE / "canto-siddham.csv"

SIDDHAM_LO, SIDDHAM_HI = 0x11580, 0x115FF


def deva_to_siddham(s: str) -> str:
    """Map a Devanagari (+ ASCII tone digit) string to Siddhaṃ.

    ASCII characters (the tone digits 1-6) pass through. Every other
    character must be Devanagari and is replaced by the Siddhaṃ codepoint
    sharing its Unicode name; an unmapped character raises ValueError so
    the caller fails loudly rather than emitting a wrong glyph.
    """
    out = []
    for ch in s:
        if ch.isascii():
            out.append(ch)
            continue
        name = unicodedata.name(ch)
        if not name.startswith("DEVANAGARI"):
            raise ValueError(f"non-Devanagari char U+{ord(ch):04X} ({name})")
        sidd = unicodedata.lookup(name.replace("DEVANAGARI", "SIDDHAM", 1))
        out.append(sidd)
    return "".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", type=Path, default=SOURCE)
    ap.add_argument("--output", type=Path, default=OUTPUT)
    ap.add_argument("--check", action="store_true",
                    help="validate the mapping without writing the file")
    args = ap.parse_args()

    with open(args.source, encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))

    out_rows = []
    for r in rows:
        if len(r) < 2:
            out_rows.append(r)
            continue
        new = list(r)
        new[1] = deva_to_siddham(r[1])
        # sanity: every non-ASCII output char is in the Siddham block
        for ch in new[1]:
            if not ch.isascii() and not (SIDDHAM_LO <= ord(ch) <= SIDDHAM_HI):
                raise ValueError(f"output char U+{ord(ch):04X} outside Siddham block")
        out_rows.append(new)

    if args.check:
        print(f"OK: {len(out_rows)} rows transliterate cleanly, no write (--check).")
        return 0

    with open(args.output, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerows(out_rows)
    print(f"Wrote {args.output} ({len(out_rows)} rows).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
