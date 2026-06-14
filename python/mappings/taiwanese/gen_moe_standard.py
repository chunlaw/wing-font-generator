#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build the Taiwanese mappings (standard + 9 腔) from the MOE sutian dataset.

Source of truth: dialects/sutian_source.csv — the ChhoeTaigi conversion of the
MOE 臺灣台語常用詞辭典 (sutian / kautian.ods), CC BY-ND 3.0 TW.
  • KipUnicode      → Tâi-lô (台羅) tone-diacritic — the 優勢腔 standard reading
  • PojUnicode      → Pe̍h-ōe-jī (白話字) tone-diacritic
  • KipDictDialects → the 語音差異 table (per-腔 readings)

Output format follows wing-font's csv_parser: one row `漢字,音標`, and for a
multi-character headword the reading is **space-separated, one syllable per
character** (`一刀兩斷,it to lióng tuān`) so the pipeline can use it for
word-level 多音字 disambiguation AND so every character inside a word gets its
own reading + frequency. Headwords whose syllable count doesn't match the
character count, or that contain non-Han characters, are skipped (≈2%, mostly
loanwords / place-names with 仔 suffixes).

Alternate readings from the `KipUnicodeOthers` / `PojUnicodeOthers` columns are
ingested too: 又音 / 文白 (1:1) become extra readings, and 合音 (contractions,
fewer syllables than characters) are aligned to the characters so the absorbed
character renders blank — e.g. 拍毋見 emits `phàng  kiàn` (毋 muted), exactly
like 畫畫 carrying two readings. See align_haunim().

Emits into this folder (python/mappings/taiwanese/):
  Standard (優勢腔), 6 schemes:
    taigi-tl-toned / taigi-poj-toned / taigi-tl / taigi-poj /
    taigi-tlpa / taigi-bp
  Nine 腔 (Tâi-lô tone-diacritic only — the scheme the source documents):
    taigi-tl-{taipak,sannkiap,sintik,taitiong,lokkang,tailam,kohiong,gilan,manking}

TLPA and 閩拼 (BP) are produced from Tâi-lô by the inlined INI_TBL / FIN_TBL
below (standard initial/final correspondences) — the generator is fully
self-contained, with no external database. taigi-tps (方音符號) and
taigi-kana (台灣語假名) are owned by ButTaiwan/taigivs and not produced here.

Usage: python gen_moe_standard.py
"""
import csv, re, os, unicodedata

# This generator lives in python/mappings/taiwanese/ alongside the CSVs it
# produces and the sutian_source.csv it reads — same pattern as
# python/mappings/teochew/ and python/mappings/regional-build/.
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sutian_source.csv")
OUT_PKG = HERE

# 9 representative accent points (MOE 綜合比較 order), file slug, 腔 description.
ACCENTS = [
    ("台北", "taipak", "臺北偏泉腔"), ("三峽", "sannkiap", "三峽偏泉腔"),
    ("新竹", "sintik", "新竹偏泉腔"), ("台中", "taitiong", "臺中偏漳腔"),
    ("鹿港", "lokkang", "鹿港泉腔(海口腔)"), ("台南", "tailam", "臺南混合腔"),
    ("高雄", "kohiong", "高雄混合腔(優勢腔)"), ("宜蘭", "gilan", "宜蘭偏漳腔"),
    ("馬公", "manking", "馬公(澎湖)偏泉腔"),
]

PAREN = re.compile(r"\([^)]*\)")            # 替/文/白/俗 markers
SEG_SEP = re.compile(r"[，,、]\s*")
ALT_SEP = re.compile(r"[;；]\s*")
IDEO_SPACE = "　"
TONE_MARKS = {"́": "2", "̀": "3", "̂": "5", "̌": "6", "̄": "7", "̍": "8", "̋": "9"}
KEEP_COMBINING = {"͘"}                  # POJ o͘ dot (not a tone mark)
# Weight for 合音 (contracted) word readings. csv_parser sorts a word's
# readings by weight (desc) to pick its default, so >1 makes the 合音 the
# default reading shown in running text, ahead of the 主音讀 (full form).
HAUNIM_WEIGHT = 2


def is_cjk(ch):
    return ("㐀" <= ch <= "鿿") or ("豈" <= ch <= "﫿") \
        or (ch >= "\U00020000")


def clean(s):
    return PAREN.sub("", s).strip().rstrip("。 ").strip()


# Onset (leading consonant cluster) — for aligning 合音 syllables to the
# full reading. Covers Tâi-lô (ts/tsh) and POJ (ch/chh) initials.
_ONSET = re.compile(r"^(tsh|ts|chh|ch|kh|ph|th|ng|[ptkbgmnlhsj])", re.I)


def onset(syl):
    m = _ONSET.match(syl)
    return m.group(1).lower() if m else ""


def parse_others(field):
    """Parse a *Others column into [(reading, is_haunim), ...]. Splits
    alternates on '/', variant readings on 、,;；, and strips the
    (又唸作)/(文)/(白)/(俗)/(替)/(合音唸作) markers."""
    out = []
    for alt in field.split("/"):
        if not alt.strip():
            continue
        is_hau = "合音" in alt
        for piece in re.split(r"[、,;；]", PAREN.sub("", alt)):
            piece = piece.strip().rstrip("。 ").strip()
            if piece:
                out.append((piece, is_hau))
    return out


def align_haunim(full_syls, hau_syls):
    """Align a 合音 (contracted) reading to characters: each 合音 syllable
    sits on the character it begins, and characters whose syllable is
    absorbed into a neighbour become '' (muted). E.g. 拍毋見
    full=[phah,m̄,kìnn] + 合音=[phàng,kiàn] -> ['phàng','','kiàn'] so the
    pipeline renders 拍=phàng, 毋=(blank), 見=kiàn. Returns a list
    len==len(full_syls), or None if it can't align cleanly."""
    M, N = len(full_syls), len(hau_syls)
    if N == 0 or N >= M:
        return None
    res = [""] * M
    i = j = 0
    while j < N and i < M:
        res[i] = hau_syls[j]
        i += 1
        j += 1
        while i < M and (j >= N or onset(full_syls[i]) != onset(hau_syls[j])):
            res[i] = ""
            i += 1
    if i != M or sum(1 for x in res if x) != N:
        return None
    return res


def alts(field):
    """Cleaned alternate readings from a Kip/Poj field (split on '/')."""
    out, seen = [], set()
    for p in field.split("/"):
        p = clean(p)
        if p and p not in seen:
            seen.add(p)
            out.append(p)
    return out


def split_syllables(reading):
    reading = re.sub(r"-{2,}", "-", reading.strip())   # collapse 輕聲 --
    return [s for s in re.split(r"[-\s]+", reading) if s]


def syl_to_numeric(syl):
    d = unicodedata.normalize("NFD", syl)
    tone, kept = "", []
    for ch in d:
        if ch in TONE_MARKS:
            tone = TONE_MARKS[ch]
        elif unicodedata.combining(ch) and ch not in KEEP_COMBINING:
            continue
        else:
            kept.append(ch)
    base = unicodedata.normalize("NFC", "".join(kept))
    if not tone:
        tone = "4" if base and base[-1] in "ptkhPTKH" else "1"
    return base.lower() + tone


# ── Tâi-lô → TLPA / 閩拼(BP) conversion ──────────────────────────────
# Standard initial (聲母) and final (韻母) correspondences, keyed by the
# Tâi-lô spelling → (TLPA, BP). These are objective romanization
# correspondences (TLPA uses z/c for ts/tsh; 閩拼 voices the unaspirated
# stops p/t/k → b/d/g, fronts the nasal, etc.). Inlined here so the
# generator needs no external database.
INI_TBL = {"": ("", ""), "b": ("b", "bb"), "g": ("g", "gg"), "h": ("h", "h"), "j": ("j", "zz"), "k": ("k", "g"), "kh": ("kh", "k"), "l": ("l", "l"), "m": ("m", "bbn"), "n": ("n", "ln"), "ng": ("ng", "ggn"), "p": ("p", "b"), "ph": ("ph", "p"), "s": ("s", "s"), "t": ("t", "d"), "th": ("th", "t"), "ts": ("z", "z"), "tsh": ("c", "c")}
FIN_TBL = {"a": ("a", "a"), "ah": ("ah", "ah"), "ai": ("ai", "ai"), "aih": ("aih", "aih"), "ainn": ("ainn", "nai"), "ainnh": ("ainnh", "naih"), "ak": ("ak", "ak"), "am": ("am", "am"), "an": ("an", "an"), "ang": ("ang", "ang"), "ann": ("ann", "na"), "annh": ("annh", "nah"), "ap": ("ap", "ap"), "au": ("au", "ao"), "auh": ("auh", "aoh"), "aunn": ("aunn", "nao"), "aunnh": ("aunnh", "naoh"), "e": ("e", "e"), "ee": ("ee", "e"), "eh": ("eh", "eh"), "ei": ("ei", "e"), "eih": ("eih", "eh"), "enn": ("enn", "ne"), "ennh": ("ennh", "neh"), "i": ("i", "i"), "ia": ("ia", "ia"), "iah": ("iah", "iah"), "iak": ("iak", "iak"), "iam": ("iam", "iam"), "ian": ("ian", "ian"), "iang": ("iang", "iang"), "iann": ("iann", "nia"), "iannh": ("iannh", "niah"), "iap": ("iap", "iap"), "iat": ("iat", "iat"), "iau": ("iau", "iao"), "iauh": ("iauh", "iaoh"), "iaunn": ("iaunn", "niao"), "iaunnh": ("iaunnh", "niaoh"), "ih": ("ih", "ih"), "ik": ("iek", "ik"), "im": ("im", "im"), "in": ("in", "in"), "ing": ("ing", "ing"), "inn": ("inn", "ni"), "innh": ("innh", "nih"), "io": ("io", "io"), "ioh": ("ioh", "ioh"), "iok": ("iok", "iok"), "iong": ("iong", "iong"), "ionn": ("ionn", "nioo"), "ionnh": ("ionnh", "niooh"), "ip": ("ip", "ip"), "it": ("it", "it"), "iu": ("iu", "iu"), "iuh": ("iuh", "iuh"), "iunn": ("iunn", "niu"), "iunnh": ("iunnh", "niuh"), "m": ("m", "m"), "mh": ("mh", "mh"), "ng": ("ng", "ng"), "ngh": ("ngh", "ngh"), "o": ("o", "o"), "oh": ("oh", "oh"), "ok": ("ok", "ok"), "om": ("om", "om"), "ong": ("ong", "ong"), "onn": ("onn", "no"), "onnh": ("onnh", "noh"), "oo": ("oo", "oo"), "ooh": ("ooh", "ooh"), "op": ("op", "op"), "u": ("u", "u"), "ua": ("ua", "ua"), "uah": ("uah", "uah"), "uai": ("uai", "uai"), "uaih": ("uaih", "uaih"), "uainn": ("uainn", "nuai"), "uainnh": ("uainnh", "nuaih"), "uak": ("uak", "uak"), "uan": ("uan", "uan"), "uang": ("uang", "uang"), "uann": ("uann", "nua"), "uannh": ("uannh", "nuah"), "uat": ("uat", "uat"), "ue": ("ue", "ue"), "ueh": ("ueh", "ueh"), "uenn": ("uenn", "nue"), "uennh": ("uennh", "nueh"), "uh": ("uh", "uh"), "ui": ("ui", "ui"), "uih": ("uih", "uih"), "uinn": ("uinn", "nui"), "uinnh": ("uinnh", "nuih"), "un": ("un", "un"), "ut": ("ut", "ut")}


def build_tables():
    ini = {"TLPA": {}, "BP": {}}
    fin = {"TLPA": {}, "BP": {}}
    finset = set()
    for tl, (tlpa, bp) in INI_TBL.items():
        ini["TLPA"][tl], ini["BP"][tl] = tlpa, bp
    for tl, (tlpa, bp) in FIN_TBL.items():
        fin["TLPA"][tl], fin["BP"][tl] = tlpa, bp
        finset.add(tl)
    # "at" (入聲 of "an") is absent from the standard final set although
    # ah/ap/ak are present — add it so 八 pat / 賊 tsha̍t / 殺 sat convert.
    if "at" not in finset:
        fin["TLPA"]["at"], fin["BP"]["at"] = "at", "at"
        finset.add("at")
    inits = sorted([i for i in ini["TLPA"] if i], key=len, reverse=True)
    return ini, fin, finset, inits


def make_syl_converter(scheme, ini, fin, finset, inits):
    """numeric-TL syllable -> scheme syllable (TLPA/BP), or None."""
    def conv(num_syl):
        m = re.match(r"^(.*?)(\d+)$", num_syl)
        base, tone = (m.group(1), m.group(2)) if m else (num_syl, "")
        i = next((p for p in inits if base.startswith(p)
                  and base[len(p):] in finset), None)
        if i is not None:
            f = base[len(i):]
        elif base in finset:
            i, f = "", base
        else:
            return None
        return ini[scheme][i] + fin[scheme][f] + tone
    return conv


# ── 語音差異 parsing (per-accent reading), from gen_dialects.py ──────
def accent_reading(dialects, accent_cn, han):
    m = re.search("【" + re.escape(accent_cn) + "】(.*?)(?=【|$)", dialects)
    if not m:
        return None
    block = m.group(1).strip().rstrip("。").strip()
    matched, bare = None, None
    for seg in SEG_SEP.split(block):
        seg = seg.strip().rstrip("。").strip()
        if not seg:
            continue
        if IDEO_SPACE in seg:
            h, _, rd = seg.partition(IDEO_SPACE)
            if h.strip() == han:
                matched = rd.strip()
                break
        elif bare is None:
            bare = seg.strip()
    rd = matched if matched is not None else bare
    if not rd:
        return None
    out, seen = [], set()
    for a in ALT_SEP.split(rd):
        a = clean(a)
        if a and a not in seen:
            seen.add(a)
            out.append(a)
    return out or None


def main():
    rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig")))
    ini, fin, finset, inits = build_tables()
    syl_conv = {s: make_syl_converter(s, ini, fin, finset, inits)
                for s in ("TLPA", "BP")}

    # per-syllable transform for each output scheme
    def sf_toned(s):
        return s
    def sf_num(s):
        return syl_to_numeric(s)
    def sf_scheme(scheme):
        def f(s):
            r = syl_conv[scheme](syl_to_numeric(s))
            return r if r is not None else syl_to_numeric(s)  # numeric fallback
        return f

    # Six schemes are produced here. taigi-tps.csv (方音符號) and
    # taigi-kana.csv (台灣語假名) are owned by ButTaiwan/taigivs
    # (Apache-2.0, also MOE-based) — left untouched.
    SCHEMES = {  # filename -> (source column, per-syllable fn)
        "taigi-tl-toned.csv": ("KipUnicode", sf_toned),
        "taigi-poj-toned.csv": ("PojUnicode", sf_toned),
        "taigi-tl.csv": ("KipUnicode", sf_num),
        "taigi-poj.csv": ("PojUnicode", sf_num),
        "taigi-tlpa.csv": ("KipUnicode", sf_scheme("TLPA")),
        "taigi-bp.csv": ("KipUnicode", sf_scheme("BP")),
    }

    def render(han, reading, sf):
        """han + one toned reading -> 'syl syl ...' in scheme, or None."""
        syls = split_syllables(reading)
        if len(han) == 1:
            if len(syls) != 1:
                return None
        elif len(syls) != len(han) or not all(is_cjk(c) for c in han):
            return None
        return " ".join(sf(s) for s in syls)

    # Alternate readings from the *Others columns: 1:1 又音/文白 add extra
    # readings; 合音 (contractions, fewer syllables than characters) are
    # aligned so the absorbed character renders blank — e.g. 拍毋見 gets
    # "phàng  kiàn" (毋 muted), the way 畫畫 carries two readings.
    OTHERS_COL = {
        "KipUnicode": "KipUnicodeOthers",
        "PojUnicode": "PojUnicodeOthers",
    }

    def others_outputs(han, full_syls, others, sf):
        """-> [(rendered, weight), ...]. 合音 get HAUNIM_WEIGHT so they
        outrank the 主音讀 as the word's default reading; 又音/文白 stay
        weight 1 (extra selectable readings, default unchanged)."""
        outs = []
        can_align = len(full_syls) == len(han) and all(is_cjk(c) for c in han)
        for reading, is_hau in others:
            syls = split_syllables(reading)
            if is_hau or (0 < len(syls) < len(han)):
                if can_align:
                    a = align_haunim(full_syls, syls)
                    if a:
                        # muted character -> "_" placeholder (visible,
                        # non-whitespace, easy to type, robust vs. CSV
                        # whitespace collapsing); csv_parser maps it back
                        # to the empty/blank annotation.
                        joined = " ".join(sf(s) if s else "_" for s in a)
                        outs.append((joined, HAUNIM_WEIGHT if is_hau else 1))
            elif len(syls) == len(han):
                o = render(han, reading, sf)
                if o is not None:
                    outs.append((o, 1))
        return outs

    # ── Pass 1: per-character accent substitution map ────────────────
    # The 語音差異 table is keyed per single character, so a naive build
    # only varies *standalone* characters by accent — inside a word every
    # syllable falls back to the 優勢腔 standard (e.g. 鹿港 去 = khìr alone
    # but 無去 = bô khì). Build {(accent, char, std_syllable) -> accent
    # syllable} from the single-char rows so Pass 2 can apply each
    # character's accent reading to the matching syllable inside words
    # too. Keyed on the standard syllable so 文/白 readings stay distinct:
    # 香 hiunn→hionn (台南) only fires on the white reading, not 文 hiong.
    accent_sub = {}
    for r in rows:
        han = r["HanLoTaibunKip"].strip()
        if len(han) != 1:
            continue
        dia = r["KipDictDialects"]
        if not dia.strip():
            continue
        std_alts = alts(r["KipUnicode"])
        if not std_alts:
            continue
        std = std_alts[0]
        for cn, _slug, _ in ACCENTS:
            rds = accent_reading(dia, cn, han)
            if rds and rds[0] != std:
                accent_sub[(cn, han, std)] = rds[0]

    def bump(d, key, wt):
        """Record reading `key` keeping the highest weight seen."""
        if wt > d.get(key, 0):
            d[key] = wt

    std = {fn: {} for fn in SCHEMES}
    dial = {slug: {} for _, slug, _ in ACCENTS}
    skipped = 0

    for r in rows:
        han = r["HanLoTaibunKip"].strip()
        if not han:
            continue
        # standard, every scheme — primary reading(s) + *Others alternates
        for fname, (col, sf) in SCHEMES.items():
            prim = alts(r[col])
            for rd in prim:
                out = render(han, rd, sf)
                if out is None:
                    if fname == "taigi-tl-toned.csv":
                        skipped += 1
                    continue
                bump(std[fname], (han, out), 1)
            full_syls = split_syllables(prim[0]) if prim else []
            others = parse_others(r[OTHERS_COL[col]])
            for out, wt in others_outputs(han, full_syls, others, sf):
                bump(std[fname], (han, out), wt)
        # nine 腔 (Tâi-lô toned)
        dia_field = r["KipDictDialects"]
        kip_std = alts(r["KipUnicode"])
        kip_full = split_syllables(kip_std[0]) if kip_std else []
        kip_others = parse_others(r["KipUnicodeOthers"])
        for cn, slug, _ in ACCENTS:
            if len(han) == 1:
                # single char: use its full 語音差異 reading(s) verbatim
                rds = (
                    accent_reading(dia_field, cn, han)
                    if dia_field.strip()
                    else None
                )
                for rd in (rds or kip_std):
                    out = render(han, rd, sf_toned)
                    if out is not None:
                        bump(dial[slug], (han, out), 1)
            else:
                # word: take the standard syllables and substitute each
                # character's accent reading where the 語音差異 records one
                for rd in kip_std:
                    syls = split_syllables(rd)
                    if len(syls) != len(han) or not all(is_cjk(c) for c in han):
                        continue
                    out_syls = [
                        accent_sub.get((cn, han[i], syls[i]), syls[i])
                        for i in range(len(han))
                    ]
                    bump(dial[slug], (han, " ".join(out_syls)), 1)
            # 又音 / 合音 from KipUnicodeOthers are not accent-specific —
            # add them verbatim to every 腔 (incl. the muted-char 合音).
            for out, wt in others_outputs(han, kip_full, kip_others, sf_toned):
                bump(dial[slug], (han, out), wt)

    def write(path, entries):
        rowset = sorted(entries.keys(), key=lambda x: (x[1], x[0]))
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            for han, reading in rowset:
                wt = entries[(han, reading)]
                # 3rd column only when the weight is non-default (合音);
                # csv_parser reads it as the word-default priority.
                w.writerow([han, reading, wt] if wt and wt != 1
                           else [han, reading])
        return len(rowset)

    print("Standard (優勢腔):")
    for fname, entries in std.items():
        n = write(os.path.join(OUT_PKG, fname), entries)
        print(f"  {fname:22s} {n:6d} rows")
    print(f"  (skipped {skipped} unalignable standard readings)")
    print("Nine 腔 (Tâi-lô toned):")
    for cn, slug, desc in ACCENTS:
        fname = f"taigi-tl-{slug}.csv"
        n = write(os.path.join(OUT_PKG, fname), dial[slug])
        print(f"  {fname:24s} {n:6d} rows  ({cn} {desc})")


if __name__ == "__main__":
    main()
