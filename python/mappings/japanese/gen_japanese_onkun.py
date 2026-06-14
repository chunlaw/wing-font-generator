#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_japanese_onkun.py — build japanese-onkun.csv from KanjiDic2.

Wing Font annotates each CJK glyph with hiragana furigana. This generator
walks the KanjiDic2 dictionary (shipped, ready-parsed, in the pip package
``jamdict-data``) and emits one mapping row per (kanji, reading):

    音読み (on'yomi)  → こう, しょく, じん …   (folded katakana → hiragana)
    訓読み (kun'yomi) → いく, たべる, ひと …

Both reading types are written in HIRAGANA. KanjiDic2 stores on'yomi in
katakana, but the goal here is ordinary furigana — one hiragana annotation
layer over the text — so on'yomi is folded to hiragana (see clean_on).

Reading shape ("full reading")
------------------------------
KanjiDic2 marks the okurigana boundary with a dot and prefix/suffix
position with a hyphen, e.g. 行 → ``い.く``, ``-ゆ.き``, ``おこな.う``.
We keep the *whole* reading and only drop those structural markers:

    い.く     → いく
    -ゆ.き    → ゆき
    おこな.う → おこなう
    なま-     → なま

Weight / default reading
------------------------
Within one kanji, readings are emitted in KanjiDic2's order (on'yomi
first, then kun'yomi) with descending weights, so the first reading is the
standalone default — EXCEPT that kanji which are themselves common
single-character words have their word reading promoted to the default
(彼→かれ, 人→ひと, 本→ほん), so a lone kanji shows the reading a reader
expects. That promotion is driven by JMdict single-kanji entries
(build_standalone_candidates), corrected by CURATED_STANDALONE. Every
other reading stays reachable through Wing Font's variant selector —
彼1 / 彼丅一 → ひ. Word-context (熟語 / conjugation) overrides still come
from gen_japanese_compounds.py. Nanori (name-only readings) are excluded.

Weights sit well below the 1,000,000 hand-curated floor (per
CONTRIBUTING-mappings.md), marking these as machine-derived ``auto`` rows.

Source: KanjiDic2 © EDRDG, used under the EDRDG licence (CC BY-SA 4.0).

Usage
-----
    pip install jamdict-data
    python gen_japanese_onkun.py            # writes japanese-onkun.csv
"""
from __future__ import annotations

import csv
import lzma
import sqlite3
import sys
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "japanese-onkun.csv"
sys.path.insert(0, str(HERE))   # so we can import the sibling aligner

# Weight given to the first reading of a kanji; each subsequent reading
# steps down by WEIGHT_STEP. The step is large on purpose: compound
# (熟語) rows added by gen_japanese_compounds.py each fold +1 into a
# character's reading counts, and a common reading can appear in
# thousands of compounds. Keeping ranks WEIGHT_STEP apart (≫ the total
# compound count) guarantees those increments can never reorder a
# kanji's readings — the dictionary-order default stays put. Values stay
# well above the compound weights yet are plain integers the validator
# accepts.
WEIGHT_TOP = 10_000_000
WEIGHT_STEP = 10_000
PROVENANCE = "auto"

# --- Blank "scale-only" rows for kana and Japanese symbols -------------
# Wing Font shrinks an annotated character's base outline by base_scale so
# the furigana fits above it. In the optimized (-opt / subset) build only
# glyphs that carry an annotation are scaled and kept; un-annotated kana,
# punctuation, and symbols would otherwise stay full-size (and even be
# subset away). Giving each of them a BLANK annotation — the ideographic
# space U+3000, which the parser keeps as a real but inkless annotation
# glyph — routes them through the same base_scale path, so a sentence of
# mixed kanji + kana renders at one consistent body size, no furigana
# drawn. (An ASCII space can't be used: csv_parser splits annotations on
# it.)
BLANK_ANNO = "　"          # ideographic space — inkless, fixed advance
BLANK_PROVENANCE = "blank"
BLANK_WEIGHT = 1

# Unicode ranges covering hiragana, katakana, and the symbols/punctuation
# commonly used when writing Japanese. Characters that are unassigned,
# combining marks, or spaces are filtered out by category at build time.
BLANK_RANGES = [
    (0x3041, 0x309F),   # Hiragana (incl. ゔ, ゛゜, ゝゞゟ)
    (0x30A1, 0x30FF),   # Katakana (incl. ・ ー ヽヾヿ)
    (0x31F0, 0x31FF),   # Katakana phonetic extensions (small kana)
    (0x3000, 0x303F),   # CJK Symbols and Punctuation (、。「」『』【】〜々〆〇 …)
    (0xFF01, 0xFF9F),   # Fullwidth ASCII forms + halfwidth katakana
    (0xFFE0, 0xFFE6),   # Fullwidth signs (￠￡￥￦ …)
]


def locate_db() -> Path:
    """Find (and if needed decompress) the KanjiDic2 SQLite from jamdict-data."""
    try:
        import jamdict_data  # type: ignore
    except ImportError:
        sys.exit("jamdict-data not installed — run: pip install jamdict-data")

    pkg = Path(jamdict_data.__file__).resolve().parent
    plain = pkg / "jamdict.db"
    if plain.exists():
        return plain
    xz = pkg / "jamdict.db.xz"
    if xz.exists():
        # Package dir may be read-only; decompress into a temp cache.
        tmp = Path(tempfile.gettempdir()) / "jamdict.db"
        if not tmp.exists():
            with lzma.open(xz) as fin, tmp.open("wb") as fout:
                fout.write(fin.read())
        return tmp
    sys.exit(f"Could not find jamdict.db under {pkg}")


# Katakana → hiragana table. KanjiDic2 records on'yomi in katakana, but
# Wing Font annotates kanji with hiragana furigana, so on'yomi is folded
# to hiragana like kun'yomi — the whole annotation layer is one kana set.
_KATA = "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲンヴー"
_HIRA = "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをんゔー"
_K2H = str.maketrans(_KATA, _HIRA)


def clean_kun(value: str) -> str:
    """Kun reading as the KANJI-PART stem (before the okurigana dot).

    KanjiDic2 writes kun readings with the okurigana after a dot and
    position markers as hyphens: 食 → ``た.べる``, 行 → ``い.く``,
    遠 → ``とお.い``. We keep only the part the kanji itself carries
    (``た``, ``い``, ``とお``) — standard furigana, where the okurigana is
    written as ordinary kana beside it. This is also what makes the
    browser default correct: a kanji's default glyph must be the reading
    it takes in kanji+okurigana context, and (unlike the full-word form)
    the stem composes correctly for multi-kanji verbs too
    (見送る → 見=み, 送=おく). Folded to hiragana for the unit kokuji whose
    kun is a katakana loanword (粁=キロメートル → きろめーとる).
    """
    stem = value.replace("-", "").strip().split(".")[0]
    return stem.translate(_K2H)


def clean_on(value: str) -> str:
    """On'yomi → hiragana, with any stray markers dropped: コウ → こう."""
    return value.replace(".", "").replace("-", "").strip().translate(_K2H)


_CJK = ((0x3400,0x4DBF),(0x4E00,0x9FFF),(0xF900,0xFAFF),(0x20000,0x2EBEF),(0x2F800,0x2FA1F))
def _is_kanji(ch: str) -> bool:
    cp = ord(ch); return any(lo <= cp <= hi for lo, hi in _CJK)

# Curated default overrides for kanji where build_default_readings picks
# the wrong reading — almost always an on/kun homograph single-kanji word
# whose two readings share the same surface (so frequency can't separate
# them): 本=ほん not もと, 下=した not もと, 字=じ not あざ, etc. Each value
# is the reading that should win as the default; the rest stay reachable
# via the variant selector (本1 / 本丅一).
CURATED_STANDALONE = {
    '本': 'ほん', '下': 'した', '石': 'いし', '字': 'じ', '空': 'そら',
    '主': 'しゅ', '文': 'ぶん', '画': 'が', '市': 'し', '面': 'めん',
    '大': 'だい', '人': 'ひと', '日': 'ひ', '中': 'なか', '会': 'かい',
    '永': 'えい',
    # common verb/adjective kanji whose on single-word reading out-weighed
    # the kun stem in the frequency pick (長い, 軽い, 新しい, 歩く):
    '長': 'なが', '軽': 'かる', '新': 'あたら', '歩': 'ある',
    '頃': 'ころ',   # base reading; ごろ is the rendaku'd compound form
}


def build_default_readings(cur):
    """Per-kanji reading to use as the font DEFAULT, frequency-ranked.

    Why this exists: browsers shape Han and Kana as **separate runs**, so a
    contextual rule spanning a kanji→okurigana boundary (遠+い → 遠=とお)
    never fires — the kanji shows its default glyph. Only all-kanji 熟語
    (one Han run) can be fixed by rules. So the default glyph of a kanji
    must already be the reading it takes in the contexts that CAN'T be
    rule-fixed: standalone, and kanji+okurigana (the kun reading). The
    on'yomi it takes inside all-kanji compounds is left to those compound
    rules (gen_japanese_compounds), which do work in browsers.

    We therefore collect, per kanji, the readings it takes as:
      * a single-kanji word        (彼→かれ, 本→ほん)
      * a verb/adjective/okurigana stem (遠い→遠=とお, 食べる→食=た,
        後ろ→後=うし) — aligned via the sibling generator's aligner
    each weighted by the source word's real corpus frequency (wordfreq),
    and return them ranked high→low. build_rows promotes the most frequent
    one that is a genuine KanjiDic reading to the default; the rest stay
    reachable through the variant selector (彼1 / 彼丅一). All-kanji 熟語
    are skipped here — they're disambiguated by compound rules, not the
    default. CURATED_STANDALONE overrides this where the data misfires
    (on/kun homograph single kanji like 本=ほん vs もと).
    """
    import gen_japanese_compounds as gc
    try:
        from wordfreq import zipf_frequency
        freq = lambda w: zipf_frequency(w, 'ja')
    except Exception:
        freq = lambda w: 0.0
    get = gc.load_char_data(cur)

    cand = defaultdict(dict)   # kanji -> {reading: best_freq}
    def add(k, rd, f):
        if rd and f > cand[k].get(rd, -1.0):
            cand[k][rd] = f

    seen = set()
    entries = cur.execute(
        "SELECT k.text, k.idseq FROM Kanji k JOIN KJP p ON p.kid = k.ID"
    ).fetchall()    # materialize: inner queries below reuse this cursor
    for text, idseq in entries:
        if (text, idseq) in seen:
            continue
        seen.add((text, idseq))
        if not (1 <= len(text) <= 7):
            continue
        if not all(gc.is_kanji(c) or gc.is_kana(c) for c in text):
            continue
        n_kanji = sum(1 for c in text if gc.is_kanji(c))
        if n_kanji == 0:
            continue
        f = freq(text)
        if len(text) == 1:                       # single-kanji word
            for (rd,) in cur.execute(
                    "SELECT text FROM Kana WHERE idseq=? AND "
                    "(nokanji IS NULL OR nokanji=0)", (idseq,)):
                add(text, rd, f)
            continue
        if n_kanji == len(text):                 # all-kanji 熟語 → rules, not default
            continue
        rd0 = cur.execute(                        # mixed kanji+kana → align stems
            "SELECT text FROM Kana WHERE idseq=? AND "
            "(nokanji IS NULL OR nokanji=0) LIMIT 1", (idseq,)).fetchone()
        if not rd0:
            continue
        toks = gc.align(text, rd0[0], get)
        if not toks:
            continue
        for c, t in zip(text, toks):
            if gc.is_kanji(c):
                add(c, t, f)

    return {k: [r for r, _ in sorted(v.items(), key=lambda x: -x[1])]
            for k, v in cand.items()}


def build_rows(db: Path):
    con = sqlite3.connect(str(db))
    cur = con.cursor()
    standalone = build_default_readings(cur)

    chars = cur.execute(
        "SELECT ID, literal FROM character ORDER BY ID"
    ).fetchall()

    rows = []
    n_kanji = 0
    for cid, literal in chars:
        gids = [g[0] for g in cur.execute(
            "SELECT ID FROM rm_group WHERE cid=?", (cid,))]
        ons, kuns = [], []
        for gid in gids:
            for r_type, value in cur.execute(
                "SELECT r_type, value FROM reading WHERE gid=? "
                "ORDER BY rowid", (gid,)):
                if r_type == "ja_on":
                    ons.append(clean_on(value))
                elif r_type == "ja_kun":
                    kuns.append(clean_kun(value))

        # dedupe, preserve first-seen order, on'yomi before kun'yomi
        ordered = []
        seen = set()
        for v in ons + kuns:
            if v and v not in seen:
                seen.add(v)
                ordered.append(v)
        if not ordered:
            continue  # kanji with no on/kun reading (skip)

        # Promote the standalone-word reading (usually kun) to the default
        # if this kanji is a common single-kanji word. Curated overrides
        # win; otherwise use the data-driven JMdict pick. The displaced
        # on'yomi stays reachable as 彼1 / 彼丅一.
        forced = CURATED_STANDALONE.get(literal)
        promote = forced if (forced in ordered) else next(
            (rd for rd in standalone.get(literal, []) if rd in ordered), None)
        if promote:
            ordered.remove(promote)
            ordered.insert(0, promote)

        n_kanji += 1
        for idx, reading in enumerate(ordered):
            rows.append((literal, reading,
                         max(1, WEIGHT_TOP - idx * WEIGHT_STEP), PROVENANCE))

    con.close()
    return rows, n_kanji


def build_blank_rows(skip_chars):
    """Blank (scale-only) rows for kana + Japanese symbols.

    One row per printable character in BLANK_RANGES, annotated with the
    ideographic space so the build scales the base glyph but draws no
    furigana. Unassigned code points, combining marks and spaces are
    skipped (by Unicode category), as are characters already carrying a
    real reading in ``skip_chars`` (so a kanji is never blanked).
    """
    rows = []
    for lo, hi in BLANK_RANGES:
        for cp in range(lo, hi + 1):
            ch = chr(cp)
            if ch in skip_chars:
                continue
            # Drop control/format/unassigned (C*), combining marks (M*)
            # and separators/spaces (Z*) — only letters, numbers,
            # punctuation and symbols get a scale-only row.
            if unicodedata.category(ch)[0] in ("C", "M", "Z"):
                continue
            rows.append((ch, BLANK_ANNO, BLANK_WEIGHT, BLANK_PROVENANCE))
    return rows


def main():
    db = locate_db()
    rows, n_kanji = build_rows(db)
    blank_rows = build_blank_rows({r[0] for r in rows})
    all_rows = rows + blank_rows
    with OUT.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        for r in all_rows:
            w.writerow(r)
    print(f"wrote {OUT.name}: {len(rows)} reading rows over {n_kanji} kanji "
          f"+ {len(blank_rows)} blank kana/symbol rows")


if __name__ == "__main__":
    main()
