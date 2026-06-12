#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[SUPERSEDED — for reference only] Original raw extractor of the MOE
語音差異 table: emits one CSV per 腔 with syllables joined by hyphens
(it-to-lióng-tuān). That form is NOT what wing-font's csv_parser wants
for words, so the per-腔 files the pipeline actually uses are produced by
`../gen_moe_standard.py`, which emits readings one syllable per character
(it to lióng tuān). Do not run this to regenerate the shipped CSVs — it
will overwrite them with the hyphen format. Kept because it documents the
語音差異 parsing in isolation.

Parse the MOE 臺灣台語常用詞辭典 (sutian / kautian.ods) 語音差異 field and emit
one full-dictionary CSV per representative 腔 (accent point), in Tâi-lô toned
(KIP), the native scheme of the source.

Source: ChhoeTaigi_KauiokpooTaigiSutian.csv — a faithful conversion of the MOE
sutian open dataset (same content as kautian.ods). Field KipDictDialects holds
the 語音差異 table; KipUnicode holds the standard (優勢腔) reading.
"""
import csv, re, os, collections

SRC = os.path.join(os.path.dirname(__file__), "sutian_source.csv")
OUTDIR = os.path.join(os.path.dirname(__file__), "dialects")
os.makedirs(OUTDIR, exist_ok=True)

# 9 representative accent points, in MOE 綜合比較 order, with their 腔 description.
ACCENTS = [
    ("台北", "taipak",   "臺北偏泉腔"),
    ("三峽", "sannkiap", "三峽偏泉腔"),
    ("新竹", "sintik",   "新竹偏泉腔"),
    ("台中", "taitiong", "臺中偏漳腔"),
    ("鹿港", "lokkang",  "鹿港泉腔(海口腔)"),
    ("台南", "tailam",   "臺南混合腔"),
    ("高雄", "kohiong",  "高雄混合腔(優勢腔)"),
    ("宜蘭", "gilan",    "宜蘭偏漳腔"),
    ("馬公", "manking",  "馬公(澎湖)偏泉腔"),
]

PAREN = re.compile(r"\([^)]*\)")          # strip 替/文/白/俗 markers
SEG_SEP = re.compile(r"[，,、]\s*")        # segment separators inside a block
ALT_SEP = re.compile(r"[;；]\s*")          # alternate-reading separators
IDEO_SPACE = "　"                      # full-width space between 漢字 and 音讀


def clean_reading(s):
    s = PAREN.sub("", s).strip().rstrip("。 ").strip()
    return s


def std_readings(kip):
    """Standard reading(s) from KipUnicode -> list (alternates split on '/')."""
    out, seen = [], set()
    for p in kip.split("/"):
        p = clean_reading(p)
        if p and p not in seen:
            seen.add(p); out.append(p)
    return out


def accent_readings(dialects, accent_cn, han):
    """Reading(s) for `han` in the given accent, parsed from 語音差異; or None."""
    m = re.search("【" + re.escape(accent_cn) + "】(.*?)(?=【|$)", dialects)
    if not m:
        return None
    block = m.group(1).strip().rstrip("。").strip()
    if not block:
        return None
    matched, bare = None, None
    for seg in SEG_SEP.split(block):
        seg = seg.strip().rstrip("。").strip()
        if not seg:
            continue
        if IDEO_SPACE in seg:
            h, _, rd = seg.partition(IDEO_SPACE)
            if h.strip() == han:
                matched = rd.strip(); break
        elif bare is None:
            bare = seg.strip()
    rd = matched if matched is not None else bare
    if not rd:
        return None
    out, seen = [], set()
    for a in ALT_SEP.split(rd):
        a = clean_reading(a)
        if a and a not in seen:
            seen.add(a); out.append(a)
    return out or None


def main():
    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
    # per-accent output rows
    out = {slug: [] for _, slug, _ in ACCENTS}
    # bookkeeping for the review
    n_total = 0
    n_dialect = 0
    accent_match_std = collections.Counter()   # accent reading == standard reading
    accent_overridden = collections.Counter()  # rows where accent differs from std
    for r in rows:
        han = r["HanLoTaibunKip"].strip()
        if not han:
            continue
        n_total += 1
        std = std_readings(r["KipUnicode"])
        has_dia = bool(r["KipDictDialects"].strip())
        if has_dia:
            n_dialect += 1
        for cn, slug, _ in ACCENTS:
            rds = accent_readings(r["KipDictDialects"], cn, han) if has_dia else None
            used = rds if rds else std
            for rd in used:
                out[slug].append((han, rd))
            if has_dia and rds:
                if set(rds) == set(std):
                    accent_match_std[cn] += 1
                else:
                    accent_overridden[cn] += 1

    for cn, slug, desc in ACCENTS:
        path = os.path.join(OUTDIR, f"taigi-tl-{slug}.csv")
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            for han, rd in out[slug]:
                w.writerow([han, rd])
        print(f"{slug:9s} ({cn} {desc}): {len(out[slug])} rows")

    # stash review numbers
    import json
    json.dump({
        "n_total": n_total,
        "n_dialect": n_dialect,
        "accent_match_std": dict(accent_match_std),
        "accent_overridden": dict(accent_overridden),
        "accents": [(cn, slug, desc) for cn, slug, desc in ACCENTS],
    }, open(os.path.join(os.path.dirname(__file__), "review_stats.json"), "w"),
        ensure_ascii=False, indent=2)
    print(f"\nheadwords: {n_total}; with 語音差異: {n_dialect}")
    print("accent vs standard (of entries carrying 語音差異):")
    for cn, slug, desc in ACCENTS:
        m = accent_match_std[cn]; o = accent_overridden[cn]
        tot = m + o
        print(f"  {cn} {desc}: differs from std in {o}/{tot} ({100*o/tot:.0f}%)")


if __name__ == "__main__":
    main()
