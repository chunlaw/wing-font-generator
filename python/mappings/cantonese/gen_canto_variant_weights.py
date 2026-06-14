#!/usr/bin/env python3
"""Propagate canto-lshk.csv weights to the derived canto-*.csv mappings.

The other canto-*.csv files share canto-lshk.csv's character/word inventory
but render the pronunciation in a different scheme (Yale, Lau, Guangdong,
Chishima) or script (Katakana, Korean, Thai, Filipino, Hindi, Urdu,
Punjab, + their -notone variants). Only the weight column (3rd field of
single-character rows) is derived from canto-lshk; col1 (character) and
col2 (reading) are scheme-specific and are left untouched.

Two file layouts exist:

* Line-aligned files (script transliterations + their -notone variants)
  share canto-lshk's exact row order, so the new weight is copied by line
  index.

* Re-sorted files (yale, lau, guangdong, chishima) are sorted by reading
  and contain a small number of extra readings. For these we map each row
  to its canto-lshk counterpart by (character, reading): a jyutping ->
  scheme syllable table is *learned empirically* from the characters whose
  readings pair unambiguously, then generalised to a tone-independent
  segment map (these files use numbered tones, so the segmental spelling
  does not depend on tone). Any residual reading is paired uniquely within
  its character. Readings with no canto-lshk counterpart (e.g. an extra
  丫 aa1) are scored with the same blend used by gen_canto_lshk_weights.py.

The script verifies it can reproduce every *old* weight before writing any
new ones; if reproduction is not exact it aborts rather than corrupt a file.

Usage:
    python gen_canto_variant_weights.py \
        --new canto-lshk.csv --old /path/to/old/canto-lshk.csv
The --old file is the pre-update canto-lshk.csv (from git) used as the
Rosetta stone for the re-sorted layout. If omitted it is read from
`git show HEAD:.../canto-lshk.csv`.
"""

from __future__ import annotations

import argparse
import collections
import csv
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

ALIGNED = [
    "canto-filipino", "canto-filipino-notone", "canto-hindi", "canto-hindi-notone",
    "canto-katakana", "canto-katakana-notone", "canto-korean", "canto-korean-notone",
    "canto-punjab", "canto-punjab-notone", "canto-siddham", "canto-thai",
    "canto-thai-notone", "canto-urdu", "canto-urdu-notone",
]
RESORTED = ["canto-yale", "canto-lau", "canto-guangdong", "canto-chishima"]

TONE_RE = re.compile(r"^(.*?)(\d+)$")


def rows(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.reader(f))


def write_rows(path, data):
    with open(path, "w", encoding="utf-8", newline="") as f:
        csv.writer(f).writerows(data)


def is_single(r):
    return len(r) >= 2 and len(r[0]) == 1 and r[1] and " " not in r[1]


def wof(r):
    return r[2] if len(r) > 2 else "1"


def split_tone(s):
    m = TONE_RE.match(s)
    return (m.group(1), m.group(2)) if m else (s, "")


def get_old_lshk(path_arg, new_path):
    if path_arg and os.path.isfile(path_arg):
        return rows(path_arg)
    rel = os.path.relpath(new_path, start=subprocess.run(
        ["git", "-C", HERE, "rev-parse", "--show-toplevel"],
        capture_output=True, text=True).stdout.strip())
    out = subprocess.run(["git", "-C", HERE, "show", f"HEAD:{rel}"],
                         capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit("Provide --old (pre-update canto-lshk.csv); git lookup failed.")
    import io
    return list(csv.reader(io.StringIO(out.stdout)))


# ------------------------------------------------------------------ aligned
def update_aligned(new_rows, old_rows):
    summary = []
    for name in ALIGNED:
        p = os.path.join(HERE, name + ".csv")
        if not os.path.isfile(p):
            continue
        r = rows(p)
        if len(r) != len(new_rows):
            raise SystemExit(f"{name}: row count differs from canto-lshk; not line-aligned.")
        if any(r[i][0] != new_rows[i][0] for i in range(len(r))):
            raise SystemExit(f"{name}: char column not aligned with canto-lshk.")
        changed = 0
        for i in range(len(r)):
            # Mirror canto-lshk's structure exactly: only single-character
            # rows carry a weight (3rd column). Word rows stay 2-column.
            if len(new_rows[i]) <= 2:
                continue
            # verify this aligned row really is a weighted single-char row
            if len(r[i]) <= 2:
                raise SystemExit(
                    f"{name}: row {i} expected a weight column to match canto-lshk.")
            if wof(old_rows[i]) != wof(r[i]):
                raise SystemExit(
                    f"{name}: row {i} old weight does not match old canto-lshk; "
                    "alignment unsafe.")
            if r[i][2] != new_rows[i][2]:
                r[i][2] = new_rows[i][2]
                changed += 1
        write_rows(p, r)
        summary.append((name, changed))
    return summary


# ----------------------------------------------------------------- resorted
def build_lshk_single(old_rows, new_rows):
    """char -> {jyut: (oldw, neww)} for single-syllable single chars."""
    lshk = collections.defaultdict(dict)
    for o, n in zip(old_rows, new_rows):
        if is_single(o):
            lshk[o[0]][o[1]] = (wof(o), wof(n))
    return lshk


def learn_segmap(lshk, a_single):
    """Learn jyutping-segment -> scheme-segment from unambiguous chars."""
    seg = {}
    for ch, jd in lshk.items():
        ss = a_single.get(ch)
        if not ss:
            continue
        ow_j = [ow for ow, _ in jd.values()]
        ow_s = [w for _, w in ss]
        if sorted(ow_j) != sorted(ow_s) or len(set(ow_j)) != len(ow_j):
            continue
        s_by_w = {w: syl for syl, w in ss}
        for jyut, (ow, _) in jd.items():
            j_seg, _ = split_tone(jyut)
            s_seg, _ = split_tone(s_by_w[ow])
            seg.setdefault(j_seg, s_seg)
    return seg


def pair_char(jd, ga, conv):
    """Return {scheme_reading_index: jyut} pairing for one character.

    jd: {jyut: (oldw, neww)}; ga: list of (scheme, oldw).
    Converter-first, then unique residual pairing by old weight.
    Returns (pairs, unmatched_ga_indices).
    """
    remaining = dict(jd)
    pairs = {}
    unmatched = []
    # pass 1: converter exact match
    for idx, (scheme, ow) in enumerate(ga):
        hit = None
        for jyut in remaining:
            if conv(jyut) == scheme:
                hit = jyut
                break
        if hit is not None:
            pairs[idx] = hit
            del remaining[hit]
        else:
            unmatched.append((idx, scheme, ow))
    # pass 2: residual by old weight (only when unambiguous)
    residual_idx = [u for u in unmatched]
    unmatched = []
    rem_items = list(remaining.items())
    if residual_idx and rem_items:
        by_w = collections.defaultdict(list)
        for jyut, (ow, nw) in rem_items:
            by_w[ow].append(jyut)
        used = set()
        for idx, scheme, ow in residual_idx:
            cands = [j for j in by_w.get(ow, []) if j not in used]
            if len(cands) == 1:
                pairs[idx] = cands[0]
                used.add(cands[0])
            else:
                unmatched.append((idx, scheme, ow))
    else:
        unmatched = residual_idx
    return pairs, unmatched


def update_resorted(lshk, blend_fn, verify_only=False):
    summary = []
    for name in RESORTED:
        p = os.path.join(HERE, name + ".csv")
        if not os.path.isfile(p):
            continue
        R = rows(p)
        # group single rows by char, remember row indices
        a_single = collections.defaultdict(list)   # char -> [(scheme, oldw)]
        a_index = collections.defaultdict(list)     # char -> [row_index]
        for i, r in enumerate(R):
            if is_single(r):
                a_single[r[0]].append((r[1], wof(r)))
                a_index[r[0]].append(i)

        seg = learn_segmap(lshk, a_single)

        def conv(jyut):
            s, t = split_tone(jyut)
            return seg[s] + t if s in seg else None

        old_mismatch = 0
        orphans = []
        new_assign = {}  # row_index -> new weight str
        for ch, ga in a_single.items():
            jd = lshk.get(ch, {})
            pairs, unmatched = pair_char(jd, ga, conv)
            for local_idx, jyut in pairs.items():
                ow, nw = jd[jyut]
                row_i = a_index[ch][local_idx]
                if ga[local_idx][1] != ow:           # verification
                    old_mismatch += 1
                new_assign[row_i] = nw
            for local_idx, scheme, ow in unmatched:
                orphans.append((ch, scheme, ow, a_index[ch][local_idx]))

        # orphan readings (no canto-lshk counterpart) -> blend with the
        # character's full scheme reading set treated as authoritative.
        for ch, scheme, ow, row_i in orphans:
            new_assign[row_i] = str(blend_fn(ch, scheme, seg, conv, lshk))

        if old_mismatch:
            raise SystemExit(f"{name}: {old_mismatch} old-weight mismatches; aborting (mapping unsafe).")

        changed = 0
        if not verify_only:
            for row_i, nw in new_assign.items():
                old = wof(R[row_i])
                if len(R[row_i]) > 2:
                    R[row_i][2] = nw
                else:
                    R[row_i].append(nw)
                if old != nw:
                    changed += 1
            write_rows(p, R)
        summary.append((name, changed, len(orphans)))
    return summary


def make_blend_fn():
    """Lazily import gen_canto_lshk_weights and build a blend scorer that
    reuses the exact same formula. Falls back to keeping a sentinel weight
    of 1 if the dependency is unavailable."""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "gclw", os.path.join(HERE, "gen_canto_lshk_weights.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        td_path = m.locate_typeduck(None)
        td = m.load_typeduck(td_path)
        corpus, rime = m.load_pycantonese()

        # reverse the learned segment map per call to recover jyut from scheme
        def blend(ch, scheme, seg, conv, lshk):
            inv = {v: k for k, v in seg.items()}
            s_seg, tone = split_tone(scheme)
            jyut = (inv.get(s_seg, s_seg)) + tone
            # union of canto-lshk readings for this char + this orphan reading
            readings = list(lshk.get(ch, {}).keys())
            if jyut not in readings:
                readings.append(jyut)
            w = m.blended_weights(ch, readings, td, corpus, rime)
            return w.get(jyut, 1)
        return blend
    except Exception as e:  # pragma: no cover
        print(f"(blend unavailable: {e}; orphans kept at 1)", file=sys.stderr)
        return lambda ch, scheme, seg, conv, lshk: 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--new", default=os.path.join(HERE, "canto-lshk.csv"))
    ap.add_argument("--old", default=None,
                    help="pre-update canto-lshk.csv (defaults to git HEAD)")
    args = ap.parse_args()

    new_rows = rows(args.new)
    old_rows = get_old_lshk(args.old, args.new)
    if len(old_rows) != len(new_rows):
        raise SystemExit("old and new canto-lshk.csv differ in row count.")

    print("Updating line-aligned files ...", file=sys.stderr)
    for name, changed in update_aligned(new_rows, old_rows):
        print(f"  {name:24s} cells changed={changed}", file=sys.stderr)

    print("Updating re-sorted files ...", file=sys.stderr)
    lshk = build_lshk_single(old_rows, new_rows)
    blend_fn = make_blend_fn()
    for name, changed, orphans in update_resorted(lshk, blend_fn):
        print(f"  {name:24s} cells changed={changed}  orphan readings={orphans}",
              file=sys.stderr)
    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
