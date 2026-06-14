#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_japanese_compounds.py — add 熟語 (compound) context rows to japanese-onkun.csv.

The per-character file (gen_japanese_onkun.py) gives every kanji a default
reading, but a kanji's reading shifts with context: 行 alone defaults to
こう, yet 行 in 行政 is ぎょう and in 学校→がっ the reading even mutates.
Wing Font fixes this with **multi-character rows** — listing a whole word
with one space-separated hiragana token per character seeds word-context
disambiguation over OpenType GSUB.

This script reads common Japanese words from JMdict (bundled, ready-parsed,
in the ``jamdict-data`` pip package — the same DB as KanjiDic2), and for
each one tries to split the word's kana reading back onto its individual
kanji, then writes a row like:

    行政,ぎょう せい,1,auto
    学校,がっ こう,1,auto

The furigana is hiragana for both reading types (ordinary furigana, not a
katakana/hiragana on/kun split).

How the per-character split works
---------------------------------
For each kanji we take its on'yomi (folded katakana→hiragana) and kun'yomi
(stem before the okurigana dot, and full form) from KanjiDic2 as candidate
segments — plus a small CURATED_READINGS table of common irregular readings
KanjiDic2 omits (日→に, 中→じゅう, 文→も …) — then generate the regular
phonological surface variants that occur inside compounds:

  * 連濁 rendaku — a non-initial segment may voice its first mora
    (か→が, は→ば/ぱ): 花+火 → はな + び.
  * 促音 sokuon — a non-final segment ending in き/く/ち/つ may geminate
    to っ: 学(がく)+校 → がっ + こう; 一(いち)+本 → いっ + ぽん.

A depth-first segmentation finds an assignment whose concatenation equals
the dictionary reading. Unmodified readings are tried before sound-changed
ones, so the least-surprising split wins.

Primary reading only
--------------------
Only the **first-listed (most common)** JMdict reading is aligned. If it
can't be split — 熟字訓 / ateji like 一昨日(おととい), 大人(おとな) — the
word is skipped rather than annotated with a rarer reading that merely
happens to decompose. The curated readings above exist so the *common*
reading itself aligns where a missing irregular reading would otherwise
force a fallback (日本人 → に ほん じん, not the rarer にっぽん).

Scope & safety
--------------
  * Only **priority-tagged** (news/ichi/spec/etc.) JMdict words — the
    common vocabulary — to keep quality and size in hand.
  * Words of length 2–7 (the parser caps word keys at 7) made of kanji
    and/or kana, with at least one kanji. This covers all-kanji 熟語 AND
    送り仮名 words (笑い → わら + blank, 誤魔化す → ご ま か + blank): the
    sending-kana take the blank annotation. Words with other scripts
    (々, ・, digits) are skipped.
  * **Conjugation coverage.** A kanji's reading is invariant across a
    verb/adjective's inflections, so for verb/adjective lemmas we emit the
    disambiguating STEM rather than the dictionary form — covering every
    conjugated form in running text (笑った/笑って/笑わない all hit 笑→わら).
    See the conjugation block above. Homograph stems (行く vs 行う → 行った)
    are resolved by real corpus frequency via the optional `wordfreq`
    package (falls back to JMdict nf bands if it isn't installed).
  * A word is emitted only when at least one character's contextual
    reading **differs from its standalone default** — i.e. only when it
    actually buys disambiguation. Redundant compounds (every char already
    defaults correctly, e.g. 銀行→ぎん こう) are skipped.
  * Compound rows carry **weight 1**, far below the per-character weights
    (which step down by 10,000), so the many +1 increments a common
    reading collects across compounds can never reorder a kanji's
    readings — the standalone default stays put.

Known limitation: the build keeps only each kanji's top ``MAX_CHAR_VARIANTS``
(10) readings. For a kanji that already has ≥10 dictionary readings, a
*sound-changed* compound surface (e.g. 済→ザイ in 経済, 生→なま in 生放送)
can fall outside that cap; csv_parser then skips just that word's context
rule and the word falls back to per-character default readings (no error).
About 1% of emitted compounds (~35 of ~4,500) are affected this way.

Idempotent: rewrites japanese-onkun.csv keeping the single-character rows
untouched and regenerating the compound block, so re-running never
duplicates.

Source: JMdict + KanjiDic2 © EDRDG, used under the EDRDG licence (CC BY-SA 4.0).

Usage
-----
    pip install jamdict-data
    python gen_japanese_onkun.py        # build per-char rows first
    python gen_japanese_compounds.py    # then append compound rows
"""
from __future__ import annotations

import csv
import lzma
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
CSV = HERE / "japanese-onkun.csv"
MIN_LEN, MAX_LEN = 2, 7          # parser caps word keys at 7 chars
COMPOUND_WEIGHT = 1
PROVENANCE = "auto"

# Kana tables for katakana<->hiragana conversion.
KATA = "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲンヴー"
HIRA = "ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをんゔー"
_K2H = str.maketrans(KATA, HIRA)
_H2K = str.maketrans(HIRA, KATA)
def k2h(s: str) -> str: return s.translate(_K2H)
def h2k(s: str) -> str: return s.translate(_H2K)

# Curated all-kanji compound readings, forced over the data-driven pick.
# For on/kun-homograph compounds whose two readings share the same surface
# (so frequency can't separate them) and the rare one was chosen:
#   出来 → でき (the everyday reading; the literal しゅったい was winning, and
#          it's what 出来る/出来た fall back to since 出来|る splits by script)
#   他愛 → たあい (idiom 他愛もない; 他 alone defaults to ほか)
CURATED_WORDS = {
    '出来': ['で', 'き'],
    '他愛': ['た', 'あい'],
}

# Rendaku: voicing of a segment-initial mora (hiragana). は-row → ば or ぱ.
RENDAKU = {
    'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
    'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
    'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
    'は':['ば','ぱ'],'ひ':['び','ぴ'],'ふ':['ぶ','ぷ'],'へ':['べ','ぺ'],'ほ':['ぼ','ぽ'],
}
SOKUON_END = set('きくちつ')   # a final mora that may geminate to っ

# Curated irregular per-kanji readings KanjiDic2 doesn't list, but which a
# kanji's *most common* reading needs to decompose. Added as extra
# candidates (hiragana), so they only ever ENABLE matching the fixed
# dictionary reading — they can never force a wrong reading onto a word
# whose target reading doesn't contain them. Derived from the recurring
# alignment gaps among common (priority) words.
#   日→に (日本), 中→じゅう (世界中), 文→も (文字),
#   応/王/皇→のう (連声: 反応/親王/天皇), 良→ら (奈良),
#   今→こ (今年), 息→むす (息子), 百→お (八百屋)
CURATED_READINGS = {
    '日': ['に'], '中': ['じゅう'], '文': ['も'],
    '応': ['のう'], '王': ['のう'], '皇': ['のう'],
    '良': ['ら'], '今': ['こ'], '息': ['むす'], '百': ['お'],
}

# CJK ideograph ranges — used to identify a kanji position in a word.
CJK = ((0x3400,0x4DBF),(0x4E00,0x9FFF),(0xF900,0xFAFF),(0x20000,0x2EBEF),(0x2F800,0x2FA1F))
def is_kanji(ch: str) -> bool:
    cp = ord(ch); return any(lo <= cp <= hi for lo, hi in CJK)

# Kana ranges — a kana position in a 送り仮名 (okurigana) word matches the
# reading literally and is annotated with the blank glyph (no furigana
# over sending-kana). Hiragana, katakana (incl. ー), small-kana extensions.
KANA = ((0x3041,0x309F),(0x30A1,0x30FF),(0x31F0,0x31FF),(0xFF66,0xFF9F))
def is_kana(ch: str) -> bool:
    cp = ord(ch); return any(lo <= cp <= hi for lo, hi in KANA)

BLANK_ANNO = "　"   # ideographic space — inkless scale-only annotation

# --- Conjugation coverage ---------------------------------------------
# A kanji's reading is invariant across a verb/adjective's conjugations;
# only the okurigana changes (笑う 笑った 笑わない all read 笑=わら). So we
# don't enumerate inflected forms — we emit the disambiguating STEM:
#   * if the okurigana already extends past the kanji (食べる→食べ,
#     終わる→終わ, 苦しい→苦し) one stem rule covers every conjugation,
#     because the changing tail is plain kana (blank by default);
#   * if the kanji sits directly before the changing okurigana
#     (笑う→笑, 高い→高) we emit the kanji + each conjugation onset kana
#     for that word class — a handful of 2-char rules.
# Onset = the first okurigana kana that can follow a bare kanji stem.
GODAN_ENDINGS = {
    'u':  'わいうえおっ', 'ku': 'かきくけこい', 'gu': 'がぎぐげごい',
    'su': 'さしすせそ',   'tsu':'たちつてとっ', 'nu': 'なにぬねのん',
    'bu': 'ばびぶべぼん', 'mu': 'まみむめもん', 'ru': 'らりるれろっ',
}
IKU_ENDINGS = 'かきくけこっ'      # 行く → 行った/行って (促音便, not い)
ICHIDAN_ENDINGS = 'るたてれろよなまさら'
ADJI_ENDINGS = 'いくかけさ'        # 高い/高く/高かった/高ければ/高さ


def pos_to_endings(pos_list):
    """Map JMdict POS strings to a conjugation onset-kana set, or None."""
    import re
    for p in pos_list:
        if p.startswith("Ichidan verb"):
            return ICHIDAN_ENDINGS
        if p.startswith("Godan verb"):
            if "Iku/Yuku" in p:
                return IKU_ENDINGS
            m = re.search(r"with '([a-z]+)' ending", p)
            if m and m.group(1) in GODAN_ENDINGS:
                return GODAN_ENDINGS[m.group(1)]
            return GODAN_ENDINGS['ru']        # -aru special / fallback
        if p.startswith("adjective (keiyoushi)"):
            return ADJI_ENDINGS
    return None


def variants(base: str, first: bool, last: bool):
    """Hiragana surface variants of a base reading at a given word position."""
    out = []
    def add(x):
        if x and x not in out: out.append(x)
    add(base)
    if not first and base and base[0] in RENDAKU:           # rendaku
        r = RENDAKU[base[0]]
        for rr in ([r] if isinstance(r, str) else r):
            add(rr + base[1:])
    if not last and base and base[-1] in SOKUON_END:        # sokuon
        add(base[:-1] + 'っ')
        if not first and base[0] in RENDAKU:                # rendaku + sokuon
            r = RENDAKU[base[0]]
            for rr in ([r] if isinstance(r, str) else r):
                add(rr + base[1:-1] + 'っ')
    return out


def locate_db() -> Path:
    try:
        import jamdict_data  # type: ignore
    except ImportError:
        sys.exit("jamdict-data not installed — run: pip install jamdict-data")
    pkg = Path(jamdict_data.__file__).resolve().parent
    if (pkg / "jamdict.db").exists():
        return pkg / "jamdict.db"
    xz = pkg / "jamdict.db.xz"
    if xz.exists():
        tmp = Path(tempfile.gettempdir()) / "jamdict.db"
        if not tmp.exists():
            with lzma.open(xz) as fin, tmp.open("wb") as fout:
                fout.write(fin.read())
        return tmp
    sys.exit(f"Could not find jamdict.db under {pkg}")


def load_char_data(cur):
    """Per-kanji on/kun candidates (hiragana base + type), KanjiDic2 order."""
    cache = {}
    def get(ch):
        if ch in cache:
            return cache[ch]
        row = cur.execute("select ID from character where literal=?", (ch,)).fetchone()
        cands = []
        if row:
            cid = row[0]
            seen = set()
            gids = [g[0] for g in cur.execute("select ID from rm_group where cid=?", (cid,))]
            ons, kuns = [], []
            for gid in gids:
                for rt, val in cur.execute(
                        "select r_type,value from reading where gid=? order by rowid", (gid,)):
                    if rt == 'ja_on':
                        ons.append(k2h(val))
                    elif rt == 'ja_kun':
                        full = val.replace('-', '')
                        kuns.append(full.split('.')[0])      # stem before okurigana
                        if '.' in val:
                            kuns.append(full.replace('.', ''))  # full form
            for v in ons:
                if v and ('on', v) not in seen:
                    seen.add(('on', v)); cands.append((v, 'on'))
            for v in kuns:
                if v and ('kun', v) not in seen:
                    seen.add(('kun', v)); cands.append((v, 'kun'))
        # Curated irregular readings, tried last so dictionary readings win.
        have = {cv for cv, _ in cands}
        for v in CURATED_READINGS.get(ch, []):
            if v not in have:
                cands.append((v, 'on')); have.add(v)
        cache[ch] = cands
        return cands
    return get


def align(word: str, reading: str, get_cands):
    """Split a word's hiragana reading onto its characters.

    Kanji positions are matched against their on/kun (+curated, +rendaku/
    sokuon) candidates; kana positions (送り仮名) must match the reading
    literally. Returns per-character hiragana tokens — kanji → reading,
    kana → BLANK_ANNO (no furigana over sending-kana) — or None if the
    reading can't be split.
    """
    n = len(word)
    cand = []
    for c in word:
        if is_kanji(c):
            cc = get_cands(c)
            if not cc:
                return None
            cand.append(("kanji", cc))
        else:
            cand.append(("kana", [(c, "kana")]))   # literal, no variants
    best = []
    def rec(i, off, chosen):
        if best:
            return
        if i == n:
            if off == len(reading):
                best.extend(chosen)
            return
        first, last = (i == 0), (i == n - 1)
        kind, cc = cand[i]
        for base, typ in cc:
            surfaces = [base] if typ == "kana" else variants(base, first, last)
            for v in surfaces:
                if reading.startswith(v, off):
                    chosen.append((typ, v))
                    rec(i + 1, off + len(v), chosen)
                    chosen.pop()
                    if best:
                        return
    rec(0, 0, [])
    if not best:
        return None
    # Furigana is hiragana for kanji (candidates already folded to hiragana
    # in get()); kana positions get the blank scale-only annotation.
    return [BLANK_ANNO if typ == "kana" else v for typ, v in best]


def load_defaults():
    """Default (top-weight, first-listed) per-char reading from the CSV."""
    if not CSV.exists():
        sys.exit(f"{CSV.name} not found — run gen_japanese_onkun.py first.")
    defaults, singles = {}, []
    with CSV.open(encoding="utf-8") as fh:
        for row in csv.reader(fh):
            if len(row) < 2:
                continue
            key = row[0]
            if len(key) == 1:
                singles.append(row)
                defaults.setdefault(key, row[1])   # first row = highest weight
    return defaults, singles


def main():
    db = locate_db()
    con = sqlite3.connect(str(db)); cur = con.cursor()
    get_cands = load_char_data(cur)
    defaults, singles = load_defaults()

    # Priority-tagged kanji-form words, ordered most-frequent-first. Order
    # matters: when two verbs share a conjugation stem (行く vs 行う both
    # make 行った; 勝つ vs 勝る both make 勝った) the more frequent reading
    # must win the rule. JMdict's nf band overweights formal/news words
    # (行う is nf01 but 行く, only ichi1, is far more common in general
    # use), so we rank by real corpus frequency via the optional `wordfreq`
    # package, falling back to the nf band when it isn't installed.
    import re as _re
    try:
        from wordfreq import zipf_frequency
        freq = lambda w: zipf_frequency(w, 'ja')   # higher = more common
    except Exception:
        freq = lambda w: 0.0                        # fallback: nf order only
    nf = {}
    for text, idseq, tag in cur.execute(
            "SELECT k.text, k.idseq, p.text FROM Kanji k "
            "JOIN KJP p ON p.kid = k.ID"):
        m = _re.fullmatch(r'nf(\d+)', tag)
        r = int(m.group(1)) if m else 50
        key = (text, idseq)
        if key not in nf or r < nf[key]:
            nf[key] = r
    rows = sorted(nf, key=lambda k: (-freq(k[0]), nf[k]))

    def pos_of(idseq):
        sid = cur.execute("select ID from Sense where idseq=? limit 1",
                          (idseq,)).fetchone()
        if not sid:
            return []
        return [p[0] for p in cur.execute(
            "select text from pos where sid=?", (sid[0],))]

    compounds = {}          # word -> tokens (dedup, first good reading wins)
    n_seen = n_aligned = n_conj = 0
    for word, idseq in rows:
        if word in compounds:
            continue
        if not (MIN_LEN <= len(word) <= MAX_LEN):
            continue
        # Accept all-kanji 熟語 AND mixed kanji+kana 送り仮名 words; reject
        # anything with another script (々, ・, digits, latin) or no kanji.
        if not all(is_kanji(c) or is_kana(c) for c in word):
            continue
        if not any(is_kanji(c) for c in word):
            continue
        if any(is_kanji(c) and c not in defaults for c in word):
            continue
        n_seen += 1
        readings = [r[0] for r in cur.execute(
            "select text from Kana where idseq=? and (nokanji is null or nokanji=0)",
            (idseq,))]
        if not readings:
            continue
        # Primary-reading-only: align ONLY the first-listed (most common)
        # JMdict reading. If the common reading can't be split per kanji
        # (熟字訓 / ateji like 一昨日=おととい), the word is skipped rather
        # than annotated with a less-common reading that merely happens to
        # decompose. This is why curated readings matter — they let the
        # common reading itself align (日本人 → に ほん じん, not にっぽん).
        toks = align(word, readings[0], get_cands)
        if not toks:
            continue
        n_aligned += 1
        # keep only if it changes a KANJI reading vs its standalone default
        # (kana positions are always blank, so they never count).
        if not any(tok != defaults[c]
                   for c, tok in zip(word, toks) if is_kanji(c)):
            continue

        # Verb / adjective ending in okurigana → emit conjugation STEM rule(s)
        # that cover every inflected form, instead of just the dictionary
        # form. Everything else (all-kanji 熟語, okurigana nouns like 後ろ)
        # emits the dictionary form as-is.
        endings = pos_to_endings(pos_of(idseq)) if is_kana(word[-1]) else None
        if endings:
            stem, stem_toks = word[:-1], toks[:-1]
            if is_kana(stem[-1]):
                # okurigana already past the kanji → one rule covers all
                compounds.setdefault(stem, stem_toks)
                n_conj += 1
            else:
                # bare kanji stem → kanji + each conjugation onset kana
                for k in endings:
                    w2 = stem + k
                    if len(w2) <= MAX_LEN:
                        compounds.setdefault(w2, stem_toks + [BLANK_ANNO])
                n_conj += 1
        else:
            compounds.setdefault(word, toks)

    # curated compound overrides (homograph compounds the data gets wrong)
    for w, t in CURATED_WORDS.items():
        if all(c in defaults for c in w):
            compounds[w] = t

    # rewrite CSV: single-char rows untouched, then regenerated compound block
    out = singles + [
        [w, " ".join(t), COMPOUND_WEIGHT, PROVENANCE]
        for w, t in sorted(compounds.items())
    ]
    with CSV.open("w", encoding="utf-8", newline="") as fh:
        csv.writer(fh).writerows(out)

    con.close()
    print(f"common words scanned: {n_seen}; aligned: {n_aligned}; "
          f"verb/adj lemmas expanded for conjugation: {n_conj}")
    print(f"{CSV.name}: {len(singles)} single-char + {len(compounds)} compound rows")


if __name__ == "__main__":
    main()
