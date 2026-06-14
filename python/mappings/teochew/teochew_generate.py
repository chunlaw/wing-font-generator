#!/usr/bin/env python3
"""Regenerate the teochew-*.csv mapping files for the Wing Font pipeline.

Reads learn-teochew's scraped dictionary (Geng'dang Pêng'im readings) and uses
the parsetc parser to convert each syllable into every supported romanization
scheme, emitting one `base_chars,space_separated_syllables,weight` CSV per
scheme (the format consumed by mappings/csv_parser.py).

Usage:
    pip install parsetc            # or: pip install -e /path/to/parsetc
    python teochew_generate.py \
        --scrape /path/to/teochew_scrape.json \
        --outdir .

Source data:
  * Readings : learn-teochew/learn-teochew.github.io
               assets/scripts/teochew_scrape.json  (field "mn-t", gdpi)
  * Converter: learn-teochew/parsetc

See teochew-README.md for provenance and the list of downstream files to keep
in sync when adding a scheme.
"""
import argparse
import csv
import json
import re

# parsetc public API (pip install parsetc)
from parsetc.parsetc import load_parser_data, transliterate
import parsetc.Teochew.translit as tc_translit
import parsetc.Teochew.parser as tc_parser

OUT_SCHEMES = ["gdpi", "ggnn", "dieghv", "tlo", "duffus", "sinwz"]
GDPI_OK = re.compile(r"[a-zêṳ]+[1-8]?$")

# Characters absent from the scraped dictionary that should reuse another
# character's readings. The simplified 个 isn't in teochew_scrape.json but is
# the same morpheme as 個 (classifier / genitive particle), so it gets 個's
# readings verbatim. Keep this in sync with any manual additions to the CSVs.
ALIASES = {"个": "個"}


def build():
    return load_parser_data(
        shared_fn="Teochew/shared.lark",
        terminals_fn="Teochew/terminals.json",
        extends_fn="Teochew/extends.json",
        systems=tc_parser.INPUT_SYS,
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scrape", required=True, help="path to teochew_scrape.json")
    ap.add_argument("--outdir", default=".", help="where to write teochew-*.csv")
    args = ap.parse_args()

    _, parser_dict = build()
    trans = tc_translit.TRANSFORMER_DICT

    src = json.load(open(args.scrape, encoding="utf-8"))

    # entries: (base_chars, [reading_syllable_list, ...]) preserving source order
    entries = []
    for chars, v in src.items():
        cand, seen = [], set()
        for reading in (v.get("mn-t") or []):
            for variant in reading.split("/"):
                sylls = variant.strip().split()
                if len(sylls) != len(chars):
                    continue                       # syllable count must match chars
                if not all(GDPI_OK.fullmatch(s) for s in sylls):
                    continue                       # skip notes / non-gdpi noise
                key = tuple(sylls)
                if key not in seen:
                    seen.add(key)
                    cand.append(sylls)
        if cand:
            entries.append((chars, cand))

    # Inject aliased characters (e.g. 个 ← 個) right after their source so they
    # share identical readings/weights and survive regeneration.
    by_char = {chars: cand for chars, cand in entries}
    aliased = []
    for chars, cand in entries:
        aliased.append((chars, cand))
        for alias, source in ALIASES.items():
            if chars == source and alias not in by_char:
                aliased.append((alias, cand))
    entries = aliased

    # Convert every unique source syllable into each target scheme once.
    uniq = {s for _, cand in entries for sylls in cand for s in sylls}
    cache = {}  # syll -> {scheme -> converted/None}
    for s in uniq:
        try:
            pre = tc_parser.preprocess(s, "gdpi")
        except Exception:
            cache[s] = {}
            continue
        d = {}
        for scheme in OUT_SCHEMES:
            if scheme == "gdpi":
                d[scheme] = s
                continue
            try:
                d[scheme] = transliterate(pre, i="gdpi", o=scheme,
                                          parser_dict=parser_dict,
                                          transformer_dict=trans).strip() or None
            except Exception:
                d[scheme] = None
        cache[s] = d

    for scheme in OUT_SCHEMES:
        rows = []
        for chars, cand in entries:
            n = len(cand)
            for idx, sylls in enumerate(cand):
                conv = [cache[s].get(scheme) for s in sylls]
                if any(c is None for c in conv):
                    continue
                rows.append((chars, " ".join(conv), n - idx))  # primary -> highest weight
        path = f"{args.outdir}/teochew-{scheme}.csv"
        with open(path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)
        chars_n = sum(1 for r in rows if len(r[0]) == 1)
        print(f"{scheme:8} {len(rows):6} rows ({chars_n} char + {len(rows)-chars_n} word) -> {path}")


if __name__ == "__main__":
    main()
