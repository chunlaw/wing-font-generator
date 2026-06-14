#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_hindi_romanization.py
=========================
Generate / expand `mappings/hindi-romanization.csv` — a wing-font
word-unit mapping that annotates Hindi (Devanagari) vocabulary with its
ISO 15919 romanization (the academic standard: macrons on long vowels,
dots under retroflex consonants, ś/ṣ for the sibilants, ṁ for anusvāra),
adapted for Hindi with word-final schwa deletion (राम → rām, not rāma).

Row format (see csv_parser.WORD_SCRIPTS["deva"]):

    <devanagari-word>,<ISO 15919 romanization>[,weight]

Why this is simpler than the Arabic pipeline
--------------------------------------------
Devanagari is an abugida: it writes its vowels. Arabic omits short
vowels, so `gen_arabic_romanization.py` must first *vocalize* each word
with a probabilistic diacritizer (CAMeL/mishkal) before it can romanize
— an inherently lossy step. Devanagari needs none of that: the mapping
from graphemes to ISO 15919 is deterministic and fully offline, so the
only modelling decision is schwa deletion (below). No external
linguistic model is required and the output is reproducible.

Schwa deletion
--------------
Each Devanagari consonant carries an inherent "a" (क = ka). Sanskrit
pronounces every one; Hindi drops the WORD-FINAL inherent schwa, which
is the single feature that most distinguishes Hindi pronunciation from a
naïve transliteration (राम rāma → rām, घर ghara → ghar, कमल kamala →
kamal). That word-final rule is ~99% reliable, so it is ON by default
(parallel to the Arabic pipeline emitting pausal/spoken forms). Pass
--no-schwa-delete for strict reversible ISO 15919 / IAST transliteration
(every inherent vowel written). Note: MEDIAL schwa deletion (चलना
calanā → calnā) is context/morphology dependent and NOT attempted — those
medial schwas are left in, exactly the kind of unreliable guess this
generator avoids.

Source pathways
---------------
A. wordfreq  (recommended, fully offline)
   --------------------------------------
       pip install wordfreq
       python gen_hindi_romanization.py --wordfreq --max 30000

   Pulls the most frequent Hindi words from the bundled `wordfreq`
   data (no download) and romanizes each. Frequency-ranked, so the
   font annotates the words a reader actually meets most. wordfreq's
   Hindi list saturates near ~24k usable Devanagari words; --max above
   that simply emits the whole list.

B. frequency list  (offline)
   -------------------------
       python gen_hindi_romanization.py --frequency-list words.txt

   Reads an external word-frequency .txt (one word per line, optionally
   TAB/space-separated `word<sep>freq`) instead of wordfreq.

Output ordering
---------------
Sorted by weight descending, so the most common words appear first —
matching how csv_parser processes the file (earlier rows take priority
for the default reading) and how the GSUB ligature-rule order breaks
ties.

Glyph budget
------------
Each distinct word becomes one composed ligature glyph. wing-font.py's
pre-flight check caps a build at ~65,000 glyphs (the OpenType uint16
limit with margin). The full wordfreq Hindi list (~24k words) sits well
under that; keep --max modest if combining with other large mappings.

Usage
-----
    python gen_hindi_romanization.py --wordfreq --max 30000
    python gen_hindi_romanization.py --frequency-list words.txt
    python gen_hindi_romanization.py --wordfreq --no-schwa-delete
    python gen_hindi_romanization.py --wordfreq --no-merge   # ignore curated
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import unicodedata
from pathlib import Path

HERE = Path(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUTPUT = HERE / "hindi-romanization.csv"

# ── Devanagari → ISO 15919 transliteration ─────────────────────────
#
# Deterministic, grapheme-by-grapheme. Devanagari writes its vowels, so
# (unlike Arabic) no vocalization step is needed. The only modelled
# behaviour is word-final schwa deletion, handled in `transliterate`.

VIRAMA = "्"   # ् halant — suppresses the inherent vowel
NUKTA = "़"    # ़ — forms the q/z/f/ġ/ṛ series
ANUSVARA = "ं"  # ं
CHANDRABINDU = "ँ"  # ँ (vowel nasalization)
VISARGA = "ः"  # ः
AVAGRAHA = "ऽ"  # ऽ
NASAL_TILDE = "̃"  # combining tilde, used for candrabindu

# Independent (syllable-initial) vowels.
INDEP_VOWELS = {
    "अ": "a",   "आ": "ā",   "इ": "i",   "ई": "ī",
    "उ": "u",   "ऊ": "ū",   "ऋ": "r̥",  "ॠ": "r̥̄",
    "ऌ": "l̥",  "ॡ": "l̥̄",  "ए": "e",   "ऐ": "ai",
    "ओ": "o",   "औ": "au",  "ऍ": "ê",   "ऑ": "ô",
    "ऎ": "e",   "ऒ": "o",   "ॲ": "ê",
}

# Dependent vowel signs (mātrās) that follow a consonant.
MATRAS = {
    "ा": "ā",  "ि": "i",  "ी": "ī",  "ु": "u",
    "ू": "ū",  "ृ": "r̥", "ॄ": "r̥̄", "ॢ": "l̥",
    "ॣ": "l̥̄", "े": "e",  "ै": "ai", "ो": "o",
    "ौ": "au", "ॅ": "ê",  "ॉ": "ô",  "ॆ": "e",
    "ॊ": "o",
}

# Consonants (bare — the inherent "a" is added by `transliterate`).
CONSONANTS = {
    "क": "k",  "ख": "kh", "ग": "g",  "घ": "gh",
    "ङ": "ṅ",  "च": "c",  "छ": "ch", "ज": "j",
    "झ": "jh", "ञ": "ñ",  "ट": "ṭ",  "ठ": "ṭh",
    "ड": "ḍ",  "ढ": "ḍh", "ण": "ṇ",  "त": "t",
    "थ": "th", "द": "d",  "ध": "dh", "न": "n",
    "ऩ": "ṉ",  "प": "p",  "फ": "ph", "ब": "b",
    "भ": "bh", "म": "m",  "य": "y",  "र": "r",
    "ऱ": "ṟ",  "ल": "l",  "ळ": "ḷ",  "ऴ": "ḻ",
    "व": "v",  "श": "ś",  "ष": "ṣ",  "स": "s",
    "ह": "h",
    # Pre-composed nukta consonants (also reachable via base + NUKTA).
    "क़": "q",  "ख़": "k͟h", "ग़": "ġ",  "ज़": "z",
    "ड़": "ṛ",  "ढ़": "ṛh", "फ़": "f",  "य़": "ẏ",
}

# base consonant + NUKTA → ISO 15919 (Hindi loan / Perso-Arabic series).
NUKTA_MAP = {
    "क": "q",   # क़
    "ख": "k͟h",  # ख़
    "ग": "ġ",   # ग़
    "ज": "z",   # ज़
    "ड": "ṛ",   # ड़
    "ढ": "ṛh",  # ढ़
    "फ": "f",   # फ़
    "य": "ẏ",   # य़
}

DIGITS = {
    "०": "0", "१": "1", "२": "2", "३": "3",
    "४": "4", "५": "5", "६": "6", "७": "7",
    "८": "8", "९": "9",
}

# Standalone signs handled after a vowel/consonant nucleus.
SIGNS = {
    ANUSVARA: "ṁ",
    VISARGA: "ḥ",
    AVAGRAHA: "'",
    CHANDRABINDU: NASAL_TILDE,
}

DEVANAGARI_LETTERS = (
    set(INDEP_VOWELS) | set(CONSONANTS) | set(MATRAS)
    | {VIRAMA, NUKTA, ANUSVARA, CHANDRABINDU, VISARGA, AVAGRAHA}
    | set(DIGITS)
)


def transliterate(word: str, schwa_delete: bool = True) -> str:
    """Map a Devanagari word to ISO 15919.

    Deterministic, grapheme-by-grapheme. With `schwa_delete` (default),
    a word-final inherent schwa is dropped — the Hindi convention
    (राम → rām). Returns "" if the word contains no romanizable
    Devanagari nucleus.
    """
    s = unicodedata.normalize("NFC", word).strip()
    out: list[str] = []
    last_inherent = False  # is out[-1] a consonant + inherent "a"?
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c in CONSONANTS:
            base = CONSONANTS[c]
            i += 1
            # nukta may follow a *base* consonant (composed forms already
            # carry their value in CONSONANTS).
            if i < n and s[i] == NUKTA:
                base = NUKTA_MAP.get(c, base)
                i += 1
            if i < n and s[i] == VIRAMA:          # conjunct: no vowel
                out.append(base)
                last_inherent = False
                i += 1
            elif i < n and s[i] in MATRAS:        # explicit dependent vowel
                out.append(base + MATRAS[s[i]])
                last_inherent = False
                i += 1
            else:                                  # inherent "a"
                out.append(base + "a")
                last_inherent = True
            continue
        if c in INDEP_VOWELS:
            out.append(INDEP_VOWELS[c])
            last_inherent = False
            i += 1
            continue
        if c in SIGNS:
            out.append(SIGNS[c])
            last_inherent = False
            i += 1
            continue
        if c in DIGITS:
            out.append(DIGITS[c])
            last_inherent = False
            i += 1
            continue
        # ZWJ/ZWNJ, danda, stray marks, foreign chars → skip silently.
        i += 1

    if schwa_delete and last_inherent and out:
        out[-1] = out[-1][:-1]    # drop the trailing word-final "a"
    return "".join(out)


def _is_hindi_word(word: str) -> bool:
    """Keep tokens that are ≥2 codepoints and entirely Devanagari
    (drops Latin tokens, digits-only, punctuation, single letters)."""
    s = word.strip()
    return len(s) >= 2 and all(c in DEVANAGARI_LETTERS for c in s)


# ── Pathway A/B inputs ─────────────────────────────────────────────
def read_wordfreq(max_entries: int, schwa_delete: bool,
                  lang: str = "hi") -> list[tuple[str, str, int]]:
    """Most-frequent Hindi words from the bundled `wordfreq` data,
    romanized. Weight is the Zipf frequency scaled to an integer so rows
    sort by real frequency and stay well below hand-curated rows (~9e6),
    letting curated entries win on merge + sort first."""
    try:
        from wordfreq import top_n_list, zipf_frequency
    except ImportError as exc:
        raise SystemExit(
            "[gen_hindi_romanization] the --wordfreq pathway needs the "
            "`wordfreq` package, which is not installed.\n"
            "    pip install wordfreq\n"
            "Or supply your own list with --frequency-list <file>."
        ) from exc
    rows: list[tuple[str, str, int]] = []
    # Pull extra: many top tokens are Latin / digits / single letters.
    for word in top_n_list(lang, max(max_entries * 2, max_entries + 5000)):
        if not _is_hindi_word(word):
            continue
        roman = transliterate(word, schwa_delete=schwa_delete)
        if not roman:
            continue
        weight = max(int(zipf_frequency(word, lang) * 100_000), 1)
        rows.append((word, roman, weight))
        if len(rows) >= max_entries:
            break
    return rows


def read_frequency_list(path: Path, max_entries: int,
                        schwa_delete: bool) -> list[tuple[str, str, int]]:
    """Read a frequency-list TXT (one word per line, optionally
    `word<sep>frequency`) and romanize each."""
    rows: list[tuple[str, str, int]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            word = parts[0].strip()
            try:
                freq = int(float(parts[1])) if len(parts) > 1 else 1
            except ValueError:
                freq = 1
            if not _is_hindi_word(word):
                continue
            roman = transliterate(word, schwa_delete=schwa_delete)
            if roman:
                rows.append((word, roman, max(freq, 1)))
            if max_entries and len(rows) >= max_entries:
                break
    return rows


# ── Curated merge + CSV writer ─────────────────────────────────────
def load_existing(path: Path) -> dict[str, tuple[str, int]]:
    """Load an existing CSV into {word: (roman, weight)} so generated
    rows can be merged UNDER it (curated entries win)."""
    best: dict[str, tuple[str, int]] = {}
    if not path.exists():
        return best
    with path.open("r", encoding="utf-8") as fh:
        for row in csv.reader(fh):
            if len(row) < 2:
                continue
            word, roman = row[0], row[1]
            try:
                weight = int(row[2]) if len(row) > 2 else 1
            except ValueError:
                weight = 1
            best[word] = (roman, weight)
    return best


def write_csv(rows: list[tuple[str, str, int]], out_path: Path,
              merge: bool = True, preserve: bool = True) -> tuple[int, int]:
    """Write the CSV sorted by weight desc. Returns (total, kept_curated).

    When `merge`, existing rows in `out_path` are overlaid ON TOP of the
    generated rows (curated romanizations win on any word collision).
    With no generated rows and `preserve`, the file is left untouched."""
    if not rows and preserve and out_path.exists() and not merge:
        print(f"[gen_hindi_romanization] no rows generated; preserving "
              f"existing {out_path.name}", file=sys.stderr)
        return 0, 0

    best: dict[str, tuple[str, int]] = {}
    for word, roman, weight in rows:
        existing = best.get(word)
        if existing is None or weight > existing[1]:
            best[word] = (roman, weight)

    kept = 0
    if merge:
        curated = load_existing(out_path)
        kept = len(curated)
        best.update(curated)   # curated overwrites generated on collision

    ordered = sorted(((w, r, wt) for w, (r, wt) in best.items()),
                     key=lambda x: (-x[2], x[0]))
    with out_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        for word, roman, weight in ordered:
            writer.writerow([word, roman, weight])
    return len(ordered), kept


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate/expand hindi-romanization.csv")
    src = parser.add_mutually_exclusive_group()
    src.add_argument("--wordfreq", action="store_true",
                     help="Use the bundled wordfreq frequency list (offline)")
    src.add_argument("--frequency-list", type=Path,
                     help="Path to a word-frequency .txt")
    parser.add_argument("--max", type=int, default=30000,
                        help="Cap number of words (default 30000). wordfreq's "
                             "Hindi list saturates near ~24k usable words.")
    parser.add_argument("--no-schwa-delete", action="store_true",
                        help="Emit strict ISO 15919 / IAST (every inherent "
                             "vowel written, राम → rāma). Default applies "
                             "Hindi word-final schwa deletion (राम → rām).")
    parser.add_argument("--no-merge", action="store_true",
                        help="Do NOT merge over the existing curated CSV "
                             "(by default curated rows are kept and win)")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Output CSV path (default {DEFAULT_OUTPUT})")
    args = parser.parse_args(argv)

    schwa_delete = not args.no_schwa_delete

    if args.wordfreq:
        rows = read_wordfreq(args.max, schwa_delete=schwa_delete)
    elif args.frequency_list:
        if not args.frequency_list.exists():
            print(f"[gen_hindi_romanization] frequency list not found: "
                  f"{args.frequency_list}", file=sys.stderr)
            return 2
        rows = read_frequency_list(args.frequency_list, args.max,
                                   schwa_delete=schwa_delete)
    else:
        print("[gen_hindi_romanization] no source flag; nothing to do. "
              "Pass --wordfreq or --frequency-list <path>. "
              "Existing CSV is preserved.", file=sys.stderr)
        return 0

    total, kept = write_csv(rows, args.output, merge=not args.no_merge)
    print(f"[gen_hindi_romanization] wrote {total} entries to "
          f"{args.output} ({len(rows)} generated, {kept} curated merged)",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
