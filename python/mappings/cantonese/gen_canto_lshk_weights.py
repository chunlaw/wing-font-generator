#!/usr/bin/env python3
"""Regenerate the weight column of canto-lshk.csv from two sources.

Systematic, override-free aggregation of:

  1. TypeDuck  (Preparing/.../Resources/data.csv) -> per-reading ``Freq``
     and ``PronOrder`` (1 = lexicographers' primary reading).
  2. pycantonese -> HKCanCor corpus counts per (character, reading) and the
     rime-cantonese default reading.

Design
------
For each character we never add or drop a reading: we keep exactly the
(character, jyutping) rows already present in canto-lshk.csv and only
rewrite the third column (the integer weight).

Every source is turned into a *within-character probability share* over
that character's readings, so the wildly different native scales
(TypeDuck Freq up to ~1e7, HKCanCor counts in the hundreds) become
comparable. The shares are blended with fixed, character-independent
weights and scaled to an integer:

    P(r) = Σ_src  W_src * share_src(r)        (W renormalised over the
                                               sources that have data for
                                               this character)
    weight(r) = max(1, round(SCALE * P(r)))

Because P(r) is a share, the consensus primary reading dominates on its
own (typically 0.4-0.9 of the mass) and reliably sorts to variant 0 in
csv_parser.py, beating the +1-per-word noise that multi-character rows
contribute to char_cnt -- without any hand-tuned constant or per-character
override list. Readings unattested by every source fall to weight 1 and
are retained, matching the previous behaviour.

Usage
-----
    python gen_canto_lshk_weights.py \
        --csv canto-lshk.csv \
        --typeduck /path/to/TypeDuck-Mac/Preparing/Sources/Preparing/Resources/data.csv \
        --out canto-lshk.csv \
        --report canto-lshk-weight-report.md

If --typeduck is omitted the script looks for data.csv in a few common
locations and, failing that, shallow-clones TypeDuck-Mac into a temp dir.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import subprocess
import sys
import tempfile

# ---- blend weights (character-independent; the only tunables) --------------
W_TD_FREQ = 0.40     # TypeDuck per-reading frequency share
W_PRONORD = 0.25     # TypeDuck PronOrder (1/order) share
W_CORPUS = 0.25      # HKCanCor corpus share
W_RIME = 0.10        # rime-cantonese default reading (one-hot)
SCALE = 1_000_000    # integer scale for the resulting weight

TYPEDUCK_REPO = "https://github.com/TypeDuck-HK/TypeDuck-Mac.git"
TYPEDUCK_REL = "Preparing/Sources/Preparing/Resources/data.csv"


def locate_typeduck(explicit: str | None) -> str:
    if explicit and os.path.isfile(explicit):
        return explicit
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in (
        explicit,
        os.path.join(here, "data.csv"),
        os.path.join(here, TYPEDUCK_REL),
    ):
        if cand and os.path.isfile(cand):
            return cand
    # last resort: shallow sparse clone into a temp dir
    tmp = tempfile.mkdtemp(prefix="typeduck-")
    print(f"TypeDuck data.csv not found locally; cloning into {tmp} ...",
          file=sys.stderr)
    subprocess.run(
        ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
         TYPEDUCK_REPO, tmp],
        check=True,
    )
    subprocess.run(
        ["git", "-C", tmp, "sparse-checkout", "set",
         os.path.dirname(TYPEDUCK_REL)],
        check=True,
    )
    path = os.path.join(tmp, TYPEDUCK_REL)
    if not os.path.isfile(path):
        raise SystemExit("Could not obtain TypeDuck data.csv")
    return path


def load_typeduck(path: str):
    """char -> {reading: (pron_order, freq)} for single characters."""
    td: dict[str, dict[str, tuple[int, int]]] = collections.defaultdict(dict)
    with open(path, encoding="utf-8") as f:
        rd = csv.reader(f)
        next(rd, None)  # header
        for row in rd:
            if len(row) < 10:
                continue
            ch, jp, pron, freq = row[0], row[1], row[2], row[8]
            if len(ch) != 1 or not jp:
                continue
            try:
                td[ch][jp] = (int(pron), int(freq))
            except ValueError:
                continue
    return td


def load_pycantonese():
    """Return (corpus_counts, rime_default).

    corpus_counts: {(char, reading): count} from HKCanCor.
    rime_default:  {char: reading} single-character default readings.
    """
    import pycantonese
    from pycantonese.jyutping.parse_jyutping import parse_jyutping

    pkg = os.path.dirname(pycantonese.__file__)
    chars = json.load(open(
        os.path.join(pkg, "data", "rime_cantonese", "chars_to_jyutping.json"),
        encoding="utf-8"))
    rime_default = {k: v for k, v in chars.items() if len(k) == 1}

    corpus_counts: dict[tuple[str, str], int] = collections.Counter()
    for token in pycantonese.hkcancor().tokens():
        w, jp = token.word, token.jyutping
        if not w or not jp:
            continue
        try:
            parsed = parse_jyutping(jp)
        except ValueError:
            continue
        if len(w) != len(parsed):
            continue
        for ch, j in zip(w, parsed):
            corpus_counts[(ch, str(j))] += 1
    return corpus_counts, rime_default


def shares(values: dict[str, float]) -> dict[str, float]:
    total = sum(values.values())
    if total <= 0:
        return {}
    return {k: v / total for k, v in values.items()}


def blended_weights(char, readings, td, corpus, rime_default):
    """Return {reading: integer_weight} for one character."""
    # --- per-source raw signals over THIS character's readings ---
    td_freq = {r: td.get(char, {}).get(r, (0, 0))[1] for r in readings}
    pron_inv = {r: (1.0 / td[char][r][0]) if (char in td and r in td[char]
                                              and td[char][r][0] > 0) else 0.0
                for r in readings}
    corp = {r: corpus.get((char, r), 0) for r in readings}
    rime = {r: (1.0 if rime_default.get(char) == r else 0.0) for r in readings}

    s_td = shares(td_freq)
    s_po = shares(pron_inv)
    s_co = shares(corp)
    s_ri = shares(rime)

    # --- renormalise blend weights over the sources that have data ---
    active = []
    if s_td:
        active.append((W_TD_FREQ, s_td))
    if s_po:
        active.append((W_PRONORD, s_po))
    if s_co:
        active.append((W_CORPUS, s_co))
    if s_ri:
        active.append((W_RIME, s_ri))

    out = {}
    if not active:
        # nothing known about this character from any source
        return {r: 1 for r in readings}

    wsum = sum(w for w, _ in active)
    for r in readings:
        p = sum((w / wsum) * s.get(r, 0.0) for w, s in active)
        out[r] = max(1, round(SCALE * p))
    return out


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--csv", default=os.path.join(here, "canto-lshk.csv"))
    ap.add_argument("--typeduck", default=None)
    ap.add_argument("--out", default=os.path.join(here, "canto-lshk.csv"))
    ap.add_argument("--report",
                    default=os.path.join(here, "canto-lshk-weight-report.md"))
    args = ap.parse_args()

    td_path = locate_typeduck(args.typeduck)
    print(f"TypeDuck:    {td_path}", file=sys.stderr)
    td = load_typeduck(td_path)
    corpus, rime_default = load_pycantonese()
    print(f"TypeDuck chars: {len(td)}; corpus pairs: {len(corpus)}; "
          f"rime defaults: {len(rime_default)}", file=sys.stderr)

    # --- read all rows; collect single-char readings per character ---
    rows = []  # keep every row verbatim (list of fields)
    single_idx = collections.defaultdict(list)  # char -> [row indices]
    char_readings = collections.defaultdict(list)
    with open(args.csv, encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            i = len(rows)
            rows.append(row)
            if len(row) >= 2 and len(row[0]) == 1 and row[1] and " " not in row[1]:
                single_idx[row[0]].append(i)
                char_readings[row[0]].append(row[1])

    # --- compute new weights and rewrite the 3rd column ---
    changes = []  # (char, reading, old, new)
    flips = []    # (char, old_primary, new_primary)
    for char, idxs in single_idx.items():
        readings = char_readings[char]
        newmap = blended_weights(char, readings, td, corpus, rime_default)
        # record primary flip
        old_pairs = []
        for i in idxs:
            old_w = int(rows[i][2]) if len(rows[i]) > 2 and rows[i][2].isdigit() else 1
            old_pairs.append((rows[i][1], old_w))
        old_primary = max(old_pairs, key=lambda x: x[1])[0]
        new_primary = max(newmap.items(), key=lambda x: x[1])[0]
        if old_primary != new_primary:
            flips.append((char, old_primary, new_primary))
        for i in idxs:
            r = rows[i][1]
            old_w = int(rows[i][2]) if len(rows[i]) > 2 and rows[i][2].isdigit() else 1
            nw = newmap[r]
            if old_w != nw:
                changes.append((char, r, old_w, nw))
            if len(rows[i]) > 2:
                rows[i][2] = str(nw)
            else:
                rows[i].append(str(nw))

    # --- write output ---
    with open(args.out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerows(rows)

    # --- report ---
    with open(args.report, "w", encoding="utf-8") as f:
        f.write("# canto-lshk weight regeneration report\n\n")
        f.write("Systematic blend (no overrides). Source weights: "
                f"TD_freq={W_TD_FREQ}, PronOrder={W_PRONORD}, "
                f"Corpus={W_CORPUS}, Rime={W_RIME}; SCALE={SCALE}.\n\n")
        f.write(f"- Single-character types reweighted: {len(single_idx)}\n")
        f.write(f"- Weight cells changed: {len(changes)}\n")
        f.write(f"- Primary-reading flips: {len(flips)}\n\n")
        f.write("## Primary-reading flips (old -> new)\n\n")
        f.write("| char | old primary | new primary |\n|---|---|---|\n")
        for ch, o, n in sorted(flips):
            f.write(f"| {ch} | `{o}` | `{n}` |\n")

    print(f"Wrote {args.out} ({len(changes)} cells changed, "
          f"{len(flips)} primary flips). Report: {args.report}", file=sys.stderr)


if __name__ == "__main__":
    main()
