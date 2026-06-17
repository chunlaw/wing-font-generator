#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_malayalam_romanization.py
=============================
Generate / expand `mappings/malayalam/malayalam-romanization.csv` — a
wing-font word-unit mapping that annotates Malayalam (മലയാളം) vocabulary
with its ISO 15919 romanization (the academic standard: macrons on long
vowels ā ī ū ē ō, dots under the retroflex series ṭ ḍ ṇ ḷ, ś/ṣ for the
sibilants, ṁ for anusvāra). This is the Malayalam sibling of
`gen_hindi_romanization.py`; the pipeline is identical in spirit and the
two share the same row format and curated-merge behaviour.

Row format (see csv_parser.WORD_SCRIPTS["mlym"]):

    <malayalam-word>,<ISO 15919 romanization>[,weight]

Why this mirrors — and slightly differs from — the Hindi pipeline
-----------------------------------------------------------------
Like Devanagari, Malayalam is a Brahmic *abugida*: it writes its vowels,
so the map from grapheme to ISO 15919 is **deterministic and fully
offline** — no statistical model, no vocalization step, reproducible
byte-for-byte. Each consonant carries an inherent "a" unless cancelled by
a vowel sign, by the virāma (chandrakkala ്, forming a conjunct), or by
being a chillu letter.

Two Malayalam-specific points distinguish it from Hindi:

1. **No word-final schwa deletion (default).** Hindi drops the inherent
   word-final *a* (राम → rām). Malayalam does **not**: its orthography
   marks vowellessness *explicitly* — with a chillu letter (ൻ ർ ൽ ൾ ൺ ൿ)
   or a visible chandrakkala — so a consonant written with its inherent
   vowel is generally pronounced with it (രമ → rama, not "ram"). Schwa
   deletion is therefore **OFF** and not offered; the inherent *a* is
   always written.

2. **Chillu letters.** Malayalam has dedicated "pure consonant" glyphs
   ( chillaksharam) that stand for a consonant with no following vowel,
   typically word- or syllable-final: ൻ n, ർ r, ൽ l, ൾ ḷ, ൺ ṇ, ൿ k
   (plus the rarer ൔ m, ൕ y, ൖ ḻ). These are mapped to a bare consonant.

3. **Samvr̥tokaram (the "half-u").** A word-final consonant + chandrakkala
   in modern orthography (e.g. അത് "that") is pronounced with a very
   short central vowel (the *samvr̥tokaram*), not as a fully bare
   consonant. Strict ISO 15919 has no dedicated letter for it, so by
   default this generator renders it as a bare consonant (അത് → at).
   Pass `--samvrit-u` to instead append a breve-u (അത് → atŭ), which some
   romanizers prefer. This is the single modelled decision, the Malayalam
   analogue of Hindi's schwa flag — and, like it, it is the one place a
   reader who actually knows the language should look first.

Source pathways
---------------
A. frequency list  (recommended for Malayalam)
   -------------------------------------------
       python gen_malayalam_romanization.py --frequency-list ml_freq.txt

   Reads an external word-frequency .txt (one word per line, optionally
   TAB/space-separated `word<sep>freq`) and romanizes each. A good public
   source is the OpenSubtitles-derived FrequencyWords list
   (hermitdave/FrequencyWords, content/2018/ml/ml_50k.txt).

   NOTE: unlike Hindi, the bundled `wordfreq` package has **no Malayalam
   ('ml') data**, so the --wordfreq pathway below is unavailable for
   Malayalam and exits with a clear message. The frequency-list pathway
   is the supported route.

B. wordfreq  (Hindi-style; UNAVAILABLE for Malayalam)
   --------------------------------------------------
       python gen_malayalam_romanization.py --wordfreq      # errors out

Output ordering
---------------
Sorted by weight descending, so the most common words appear first —
matching how csv_parser processes the file (earlier rows take priority
for the default reading) and how the GSUB ligature-rule order breaks
ties. Curated rows are merged on top and always win.

Glyph budget
------------
Each distinct word becomes one composed ligature glyph; wing-font.py caps
a build at ~65,000 glyphs (the OpenType uint16 limit with margin). Keep
--max modest if combining with other large mappings.

Usage
-----
    python gen_malayalam_romanization.py --frequency-list ml_freq.txt
    python gen_malayalam_romanization.py --frequency-list ml_freq.txt --samvrit-u
    python gen_malayalam_romanization.py --frequency-list ml_freq.txt --no-merge
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import unicodedata
from pathlib import Path

HERE = Path(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUTPUT = HERE / "malayalam-romanization.csv"

# ── Malayalam → ISO 15919 transliteration ──────────────────────────
#
# Deterministic, grapheme-by-grapheme. Malayalam writes its vowels, so
# (like Devanagari, unlike Arabic) no vocalization step is needed. The
# only modelled behaviour is the optional samvr̥tokaram rendering of a
# word-final consonant+chandrakkala, handled in `transliterate`.

VIRAMA = "്"        # ് chandrakkala — suppresses the inherent vowel
ANUSVARA = "ം"      # ം
VISARGA = "ഃ"       # ഃ
CANDRABINDU = "ഁ"   # ഁ (vowel nasalization)
CANDRABINDU2 = "ഀ"  # ഀ combining anusvara above (rare)
NASAL_TILDE = "̃"   # combining tilde, used for candrabindu
AU_LENGTH = "ൗ"     # ൗ au length mark (dependent)
ZWJ = "‍"
ZWNJ = "‌"

# Independent (syllable-initial) vowels. Malayalam distinguishes short
# e/o (എ ഒ) from long ē/ō (ഏ ഓ) — ISO 15919 writes e/ē and o/ō.
INDEP_VOWELS = {
    "അ": "a",    # അ
    "ആ": "ā",    # ആ
    "ഇ": "i",    # ഇ
    "ഈ": "ī",    # ഈ
    "ഉ": "u",    # ഉ
    "ഊ": "ū",    # ഊ
    "ഋ": "r̥",   # ഋ
    "ൠ": "r̥̄",  # ൠ
    "ഌ": "l̥",   # ഌ
    "ൡ": "l̥̄",  # ൡ
    "എ": "e",    # എ (short)
    "ഏ": "ē",    # ഏ (long)
    "ഐ": "ai",   # ഐ
    "ഒ": "o",    # ഒ (short)
    "ഓ": "ō",    # ഓ (long)
    "ഔ": "au",   # ഔ
}

# Dependent vowel signs (mātrā / chihnam) that follow a consonant.
MATRAS = {
    "ാ": "ā",    # ാ
    "ി": "i",    # ി
    "ീ": "ī",    # ീ
    "ു": "u",    # ു
    "ൂ": "ū",    # ൂ
    "ൃ": "r̥",   # ൃ
    "ൄ": "r̥̄",  # ൄ
    "ൢ": "l̥",   # ൢ
    "ൣ": "l̥̄",  # ൣ
    "െ": "e",    # െ (short)
    "േ": "ē",    # േ (long)
    "ൈ": "ai",   # ൈ
    "ൊ": "o",    # ൊ (short)
    "ോ": "ō",    # ോ (long)
    "ൌ": "au",   # ൌ
    AU_LENGTH: "au",  # ൗ
}

# Consonants (bare — the inherent "a" is added by `transliterate`).
CONSONANTS = {
    "ക": "k",   "ഖ": "kh",  "ഗ": "g",   "ഘ": "gh",
    "ങ": "ṅ",   "ച": "c",   "ഛ": "ch",  "ജ": "j",
    "ഝ": "jh",  "ഞ": "ñ",   "ട": "ṭ",   "ഠ": "ṭh",
    "ഡ": "ḍ",   "ഢ": "ḍh",  "ണ": "ṇ",   "ത": "t",
    "ഥ": "th",  "ദ": "d",   "ധ": "dh",  "ന": "n",
    "ഩ": "ṉ",   "പ": "p",   "ഫ": "ph",  "ബ": "b",
    "ഭ": "bh",  "മ": "m",   "യ": "y",   "ര": "r",
    "റ": "ṟ",   "ല": "l",   "ള": "ḷ",   "ഴ": "ḻ",
    "വ": "v",   "ശ": "ś",   "ഷ": "ṣ",   "സ": "s",
    "ഹ": "h",
}

# Chillaksharam (chillu) — "pure" consonants with no inherent vowel,
# standing for a syllable-/word-final consonant. Map to a bare consonant.
CHILLU = {
    "ൺ": "ṇ",   # ൺ
    "ൻ": "n",   # ൻ
    "ർ": "r",   # ർ
    "ൽ": "l",   # ൽ
    "ൾ": "ḷ",   # ൾ
    "ൿ": "k",   # ൿ
    "ൔ": "m",   # ൔ (rare)
    "ൕ": "y",   # ൕ (rare)
    "ൖ": "ḻ",   # ൖ (rare)
}

DIGITS = {
    "൦": "0", "൧": "1", "൨": "2", "൩": "3",
    "൪": "4", "൫": "5", "൬": "6", "൭": "7",
    "൮": "8", "൯": "9",
}

# Standalone signs handled after a vowel/consonant nucleus.
SIGNS = {
    ANUSVARA: "ṁ",
    VISARGA: "ḥ",
    CANDRABINDU: NASAL_TILDE,
    CANDRABINDU2: NASAL_TILDE,
}

MALAYALAM_LETTERS = (
    set(INDEP_VOWELS) | set(CONSONANTS) | set(MATRAS) | set(CHILLU)
    | {VIRAMA, ANUSVARA, VISARGA, CANDRABINDU, CANDRABINDU2}
    | set(DIGITS)
)

SAMVRIT_U = "ŭ"   # breve-u, optional rendering of the word-final half-u


def transliterate(word: str, samvrit_u: bool = False) -> str:
    """Map a Malayalam word to ISO 15919.

    Deterministic, grapheme-by-grapheme. Each consonant carries an
    inherent "a" unless a vowel sign, a virāma (chandrakkala), or chillu
    status cancels it. With `samvrit_u`, a word-final consonant +
    chandrakkala is rendered with a trailing breve-u (the samvr̥tokaram,
    അത് → atŭ) instead of a bare consonant (അത് → at). Returns "" if the
    word contains no romanizable Malayalam nucleus.
    """
    s = unicodedata.normalize("NFC", word).strip()
    out: list[str] = []
    final_virama = False  # did the last consonant end on a word-final virāma?
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c in CONSONANTS:
            base = CONSONANTS[c]
            i += 1
            if i < n and s[i] == VIRAMA:          # conjunct / vowelless
                out.append(base)
                # A virāma at the very end of the word (optionally followed
                # by ZWJ/ZWNJ) is the samvr̥tokaram position.
                j = i + 1
                while j < n and s[j] in (ZWJ, ZWNJ):
                    j += 1
                final_virama = (j >= n)
                i += 1
                continue
            final_virama = False
            if i < n and s[i] in MATRAS:          # explicit dependent vowel
                out.append(base + MATRAS[s[i]])
                i += 1
            else:                                  # inherent "a"
                out.append(base + "a")
            continue
        final_virama = False
        if c in CHILLU:
            out.append(CHILLU[c])
            i += 1
            continue
        if c in INDEP_VOWELS:
            out.append(INDEP_VOWELS[c])
            i += 1
            continue
        if c in SIGNS:
            out.append(SIGNS[c])
            i += 1
            continue
        if c in DIGITS:
            out.append(DIGITS[c])
            i += 1
            continue
        # ZWJ/ZWNJ, danda, stray marks, foreign chars → skip silently.
        i += 1

    if samvrit_u and final_virama and out:
        out[-1] = out[-1] + SAMVRIT_U
    return "".join(out)


def _is_malayalam_word(word: str) -> bool:
    """Keep tokens that are ≥2 codepoints and entirely Malayalam (drops
    Latin tokens, digits-only, punctuation, single letters)."""
    s = word.strip()
    return len(s) >= 2 and all(c in MALAYALAM_LETTERS for c in s)


# ── Pathway A/B inputs ─────────────────────────────────────────────
def read_wordfreq(*_args, **_kwargs):
    """The --wordfreq pathway is unavailable for Malayalam: the bundled
    `wordfreq` data has no 'ml' list (it silently falls back to English).
    Use --frequency-list instead."""
    raise SystemExit(
        "[gen_malayalam_romanization] the --wordfreq pathway is NOT "
        "available for Malayalam — `wordfreq` ships no 'ml' frequency data "
        "(it falls back to English, producing garbage).\n"
        "Use a frequency list instead, e.g. the OpenSubtitles-derived\n"
        "    hermitdave/FrequencyWords  content/2018/ml/ml_50k.txt\n"
        "    python gen_malayalam_romanization.py --frequency-list ml_50k.txt"
    )


def read_frequency_list(path: Path, max_entries: int,
                        samvrit_u: bool) -> list[tuple[str, str, int]]:
    """Read a frequency-list TXT (one word per line, optionally
    `word<sep>frequency`) and romanize each Malayalam token."""
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
            if not _is_malayalam_word(word):
                continue
            roman = transliterate(word, samvrit_u=samvrit_u)
            if roman:
                rows.append((word, roman, max(freq, 1)))
            if max_entries and len(rows) >= max_entries:
                break
    return rows


# ── Curated merge + CSV writer ─────────────────────────────────────
def load_existing(path: Path) -> dict[str, tuple[str, int]]:
    """Load an existing CSV into {word: (roman, weight)} so generated rows
    can be merged UNDER it (curated entries win)."""
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
    generated rows (curated romanizations win on any word collision)."""
    if not rows and preserve and out_path.exists() and not merge:
        print(f"[gen_malayalam_romanization] no rows generated; preserving "
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
        description="Generate/expand malayalam-romanization.csv")
    src = parser.add_mutually_exclusive_group()
    src.add_argument("--wordfreq", action="store_true",
                     help="(Unavailable for Malayalam — wordfreq has no 'ml' "
                          "data; exits with a message. Use --frequency-list.)")
    src.add_argument("--frequency-list", type=Path,
                     help="Path to a word-frequency .txt (one word per line, "
                          "optionally `word<sep>freq`)")
    parser.add_argument("--max", type=int, default=30000,
                        help="Cap number of words (default 30000).")
    parser.add_argument("--samvrit-u", action="store_true",
                        help="Render the word-final samvr̥tokaram (consonant + "
                             "chandrakkala) as a breve-u (അത് → atŭ) instead of "
                             "a bare consonant (അത് → at).")
    parser.add_argument("--no-merge", action="store_true",
                        help="Do NOT merge over the existing curated CSV "
                             "(by default curated rows are kept and win)")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Output CSV path (default {DEFAULT_OUTPUT})")
    args = parser.parse_args(argv)

    if args.wordfreq:
        read_wordfreq()  # raises SystemExit with guidance
    elif args.frequency_list:
        if not args.frequency_list.exists():
            print(f"[gen_malayalam_romanization] frequency list not found: "
                  f"{args.frequency_list}", file=sys.stderr)
            return 2
        rows = read_frequency_list(args.frequency_list, args.max,
                                   samvrit_u=args.samvrit_u)
    else:
        print("[gen_malayalam_romanization] no source flag; nothing to do. "
              "Pass --frequency-list <path>. Existing CSV is preserved.",
              file=sys.stderr)
        return 0

    total, kept = write_csv(rows, args.output, merge=not args.no_merge)
    print(f"[gen_malayalam_romanization] wrote {total} entries to "
          f"{args.output} ({len(rows)} generated, {kept} curated merged)",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
