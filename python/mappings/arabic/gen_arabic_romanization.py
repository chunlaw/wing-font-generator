#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_arabic_romanization.py
==========================
Generate / expand `mappings/arabic-romanization.csv` — a wing-font
word-unit mapping that annotates Arabic vocabulary with its DIN 31635
romanization (the academic standard: macrons on long vowels, dots under
emphatic consonants, ʿ for ʿayn, ʾ for hamza).

Row format (see csv_parser.WORD_SCRIPTS["arabic"]):

    <arabic-word>,<DIN 31635 romanization>[,weight]

Source pathways
---------------
Pick whichever is practical for your environment:

A. wordfreq  (recommended, fully offline)
   --------------------------------------
       pip install wordfreq mishkal
       python gen_arabic_romanization.py --wordfreq --max 4000

   Pulls the top-N most frequent Arabic words from the `wordfreq`
   package (bundled frequency data — no download), diacritizes each
   with mishkal, then maps the vocalized Arabic to DIN 31635. This is
   the frequency-ranked pathway: the most common words come first, so
   the resulting font annotates the words a reader actually meets most.

B. frequency list  (offline)
   -------------------------
       python gen_arabic_romanization.py --frequency-list words.txt

   Same as A but reads an external word-frequency .txt (one word per
   line, optionally TAB-separated `word\tfreq`) instead of wordfreq.

C. kaikki.org Wiktionary extract  (CC-BY-SA)
   -----------------------------------------
       python gen_arabic_romanization.py --kaikki kaikki.org-dictionary-Arabic.json

   Uses the human-curated romanizations Wiktionary ships, ranked by
   sense-count as a frequency proxy. Highest romanization quality, but
   the dump is large and the ranking is only an approximation.

Vocalization (pathways A/B)
---------------------------
Modern Arabic is written unvocalized, so the short vowels needed for a
romanization are missing. Each word is first diacritized, preferring:

    CAMeL Tools  (morphological, most accurate)  →
    mishkal      (Zerrouki's diacritizer, pure-Python, pip-installable) →
    bare text    (last resort — long-vowel skeleton only, low quality)

Diacritizing an *isolated* word is inherently ambiguous (Arabic
homographs: درس = "dars" the noun vs "darasa" the verb), so the
romanization of mid-frequency content words is best-effort. The most
frequent words — function words and very common vocabulary — vocalize
reliably. Always merge over a hand-checked curated set (the default;
see --no-merge): curated rows win on any conflict.

Romanization schema (DIN 31635)
-------------------------------
Single-character diacritic forms (ḫ, ġ, ṯ, ḏ, š) rather than ALA-LC
digraphs (kh, gh, th, dh, sh) — they keep the Latin row tight next to
the Arabic word inside one composed glyph. Long vowels use macrons
(ā ī ū); the output is pausal/dictionary form (case-ending tanwīn
dropped, tāʾ marbūṭa → "a").

Output ordering
---------------
Sorted by weight descending, so the most common words appear first —
matching how csv_parser processes the file (earlier rows take priority
for variant 0, the default reading) and how the GSUB ligature-rule
order breaks ties.

Usage
-----
    python gen_arabic_romanization.py --wordfreq --max 4000
    python gen_arabic_romanization.py --frequency-list words.txt
    python gen_arabic_romanization.py --kaikki <path-to-json>
    python gen_arabic_romanization.py --wordfreq --no-merge   # ignore curated
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import unicodedata
from pathlib import Path

HERE = Path(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUTPUT = HERE / "arabic-romanization.csv"

# ── Provenance (4th CSV column) ────────────────────────────────────
# Each row carries a provenance tag so a reviewing linguist can tell at a
# glance what to trust and what to check. csv_parser only reads columns
# 0-2, so this 4th column is invisible to the font build — it exists
# purely for review tooling and contributor workflow.
#
#   curated     — hand-written / human-verified. Authoritative; wins on
#                 merge and is never overwritten by generation.
#   auto        — machine-romanized base lemma (vocalizer + DIN rules).
#                 Best-effort; isolated-word vocalization can mis-read
#                 homographs, so these are the priority for review.
#   auto-clitic — a proclitic surface form derived from an `auto` lemma
#                 (الـ/بـ/لـ/وـ + fused forms). Correctness follows the
#                 lemma it came from.
PROV_CURATED, PROV_AUTO, PROV_CLITIC = "curated", "auto", "auto-clitic"
VALID_PROVENANCE = {PROV_CURATED, PROV_AUTO, PROV_CLITIC}
# Rows at/above this weight in a legacy 3-column CSV (no provenance
# column) are inferred as curated; everything else as auto. The
# hand-curated seed set uses weights ≥ 9e6; generated rows use Zipf*1e5
# (< 1e6), so this floor separates them cleanly.
CURATED_WEIGHT_FLOOR = 1_000_000


# ── DIN 31635 transliteration ──────────────────────────────────────
#
# Operates on VOCALIZED (diacritized) Arabic — short vowels must be
# present, so callers vocalize first (see _vocalize). Each Arabic letter
# maps to its DIN 31635 form; vowel length, gemination, diphthongs, the
# definite article and tāʾ marbūṭa are handled by context rules below.

FATHA, DAMMA, KASRA = "َ", "ُ", "ِ"
FATHATAN, DAMMATAN, KASRATAN = "ً", "ٌ", "ٍ"
SHADDA, SUKUN, SUPERALEF = "ّ", "ْ", "ٰ"
ALIF, WAW, YA, ALIF_MAQSURA, TA_MARBUTA = "ا", "و", "ي", "ى", "ة"

CONS = {
    "ء": "ʾ", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "j", "ح": "ḥ", "خ": "ḫ",
    "د": "d", "ذ": "ḏ", "ر": "r", "ز": "z", "س": "s", "ش": "š", "ص": "ṣ",
    "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "ġ", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
    "أ": "ʾ", "إ": "ʾ", "ؤ": "ʾ", "ئ": "ʾ", "آ": "ʾā",
}
SHORT = {FATHA: "a", DAMMA: "u", KASRA: "i"}
TANWIN = {FATHATAN, DAMMATAN, KASRATAN}
VMARKS = {FATHA, DAMMA, KASRA, FATHATAN, DAMMATAN, KASRATAN,
          SHADDA, SUKUN, SUPERALEF}
VOWELS = {"a", "i", "u", "ā", "ī", "ū", "ay", "aw", ""}
LONGALIF = {ALIF, ALIF_MAQSURA}
SUN_LETTERS = set("ت ث د ذ ر ز س ش ص ض ط ظ ل ن".split())

# Irregular high-frequency words the rule engine cannot derive: fused
# article + gemination (allāh, allaḏī), and pronouns mishkal leaves
# without their final short vowel (huwa, hiya). Keyed by the bare
# (undiacritized) surface form.
OVERRIDES = {
    "الله": "allāh", "الذي": "allaḏī", "التي": "allatī",
    "الذين": "allaḏīna", "اللاتي": "allātī", "اللواتي": "allawātī",
    "هو": "huwa", "هي": "hiya", "هذا": "hāḏā", "هذه": "hāḏihi",
    "هذان": "hāḏāni", "ذلك": "ḏālika", "هؤلاء": "hāʾulāʾi",
    "أولئك": "ulāʾika", "لكن": "lākin", "ولكن": "walākin",
    "هكذا": "hākaḏā", "طه": "ṭāhā",
}


def _bare(word: str) -> str:
    """Strip all diacritics — used for article detection + overrides."""
    return "".join(c for c in word if c not in VMARKS)


def _shadda_follows(chars: list[str], i: int) -> bool:
    """True if a SHADDA sits among the combining marks right after
    position `i` (gemination of the consonant at `i`)."""
    j = i + 1
    while j < len(chars) and chars[j] in VMARKS:
        if chars[j] == SHADDA:
            return True
        j += 1
    return False


def transliterate(arabic: str, raw: str | None = None) -> str:
    """Map a VOCALIZED Arabic string to DIN 31635 (pausal form).

    Handles: long vowels (fatha+alif → ā, kasra+yāʾ → ī, damma+wāw → ū,
    with an intervening shadda tolerated), diphthongs (ay/aw), gemination
    (shadda doubles the consonant), the definite article incl. sun-letter
    assimilation (الشمس → aš-šams), tāʾ marbūṭa → "a", alif maqṣūra → ā,
    superscript alef → ā, mater-lectionis ī/ū for unvowelled medial yāʾ/
    wāw, and pausal dropping of case-ending tanwīn. A small OVERRIDES
    table catches irregular high-frequency words.

    `raw` (the original unvocalized surface form, if available) is checked
    against OVERRIDES first.
    """
    if not arabic:
        return ""
    if raw is not None and raw in OVERRIDES:
        return OVERRIDES[raw]
    s = unicodedata.normalize("NFC", arabic).strip()
    bare = _bare(s)
    if bare in OVERRIDES:
        return OVERRIDES[bare]

    # Proclitic conjunction wa-: a leading wāw the vocalizer left
    # UNvowelled is the conjunction (وَقْت "waqt" keeps its fatha and is a
    # root wāw; ومَا "wa-mā" leaves the wāw bare). Strip it and recurse so
    # the remainder still gets its own override / article handling.
    if (len(bare) > 2 and s[0] == WAW
            and (len(s) < 2 or s[1] not in (FATHA, DAMMA, KASRA, SHADDA))):
        return "wa-" + transliterate(s[1:], bare[1:])

    out: list[str] = []
    prefix = ""
    # Definite article + sun-letter assimilation (operates on bare form).
    if bare.startswith("ال") and len(bare) > 2 and bare[2] in SUN_LETTERS:
        sun = CONS.get(bare[2], bare[2])
        prefix = f"a{sun}-"
        ia = s.find(ALIF)
        il = s.find("ل", ia + 1)
        s = s[:ia] + s[il + 1:]
        # The article lām assimilates INTO the sun letter; that doubling
        # is "aš-" + the letter itself. Drop the letter's own gemination
        # shadda so it isn't tripled (aš-ššams). After NFC the shadda can
        # sit AFTER a vowel mark on the consonant (cons, fatha, shadda),
        # so scan the consonant's combining marks for it.
        k = 0
        while k < len(s) and s[k] in VMARKS:
            k += 1
        j = k + 1
        while j < len(s) and s[j] in VMARKS:
            if s[j] == SHADDA:
                s = s[:j] + s[j + 1:]
                break
            j += 1
    elif bare.startswith("ال") and len(bare) > 2:
        prefix = "al-"
        ia = s.find(ALIF)
        il = s.find("ل", ia + 1)
        s = s[:ia] + s[il + 1:]

    ch = list(s)
    n = len(ch)
    i = 0
    while i < n:
        c = ch[i]
        nx = ch[i + 1] if i + 1 < n else ""
        nx2 = ch[i + 2] if i + 2 < n else ""
        # Long vowels (a shadda may sit between the short vowel and its
        # mater lectionis after NFC reordering, e.g. حَتَّى).
        if c == FATHA and nx in LONGALIF:
            out.append("ā"); i += 2; continue
        if c == FATHA and nx == SHADDA and nx2 in LONGALIF:
            out.append("ā"); i += 3; continue
        if c == KASRA and nx == YA and nx2 not in SHORT and nx2 != SHADDA:
            out.append("ī"); i += 2; continue
        if c == KASRA and nx == SHADDA and nx2 == YA:
            out.append("ī"); i += 3; continue
        if c == DAMMA and nx == WAW and nx2 not in SHORT and nx2 != SHADDA:
            out.append("ū"); i += 2; continue
        if c == DAMMA and nx == SHADDA and nx2 == WAW:
            out.append("ū"); i += 3; continue
        # Diphthongs.
        if c == FATHA and nx == YA and nx2 == SUKUN:
            out.append("ay"); i += 3; continue
        if c == FATHA and nx == WAW and nx2 == SUKUN:
            out.append("aw"); i += 3; continue
        if c == SUPERALEF or c == ALIF_MAQSURA:
            out.append("ā"); i += 1; continue
        if c == ALIF:
            # bare alif: silent carrier at word start, else long ā
            out.append("" if (not out and not prefix) else "ā")
            i += 1; continue
        if c == TA_MARBUTA:
            if not (out and out[-1] == "a"):  # collapse preceding fatha
                out.append("a")
            i += 1; continue
        if c == SHADDA:
            i += 1; continue          # gemination handled at the consonant
        if c in TANWIN:
            i += 1; continue          # pausal: drop case ending
        if c == SUKUN:
            i += 1; continue
        if c in SHORT:
            # Pausal form: drop a word-final short vowel (the iʿrāb case
            # ending, e.g. al-ḥarbu → al-ḥarb, al-madīnatu → al-madīna).
            # Structural final vowels that must survive (pronouns huwa /
            # hiya, etc.) are covered by OVERRIDES.
            if i == n - 1:
                i += 1; continue
            out.append(SHORT[c]); i += 1; continue
        # mater lectionis: unvowelled medial yāʾ/wāw after a consonant
        if (c in (YA, WAW) and nx not in (FATHA, DAMMA, KASRA, SHADDA)
                and out and out[-1] not in VOWELS):
            out.append("ī" if c == YA else "ū"); i += 1; continue
        if c in CONS:
            out.append(CONS[c])
            if _shadda_follows(ch, i):
                out.append(CONS[c])
            i += 1; continue
        i += 1
    return prefix + "".join(out)


# ── Vocalization (diacritization) ──────────────────────────────────
_VOCALIZER = {"impl": None, "kind": None}


def _vocalize(word: str) -> str:
    """Add diacritics to a modern (unvocalized) Arabic word, preferring
    CAMeL Tools, then mishkal, then returning the word unchanged.

    The chosen backend is resolved once and cached. Prints which one it
    settled on to stderr the first time."""
    if _VOCALIZER["kind"] is None:
        _resolve_vocalizer()
    kind, impl = _VOCALIZER["kind"], _VOCALIZER["impl"]
    try:
        if kind == "camel":
            analyses = impl.analyze(word)
            return analyses[0]["diac"] if analyses else word
        if kind == "mishkal":
            return impl.tashkeel(word).strip()
    except Exception:
        return word
    return word


def _resolve_vocalizer() -> None:
    try:
        from camel_tools.morphology.analyzer import Analyzer
        from camel_tools.morphology.database import MorphologyDB
        _VOCALIZER["impl"] = Analyzer(MorphologyDB.builtin_db())
        _VOCALIZER["kind"] = "camel"
        print("[gen_arabic_romanization] vocalizer: CAMeL Tools",
              file=sys.stderr)
        return
    except Exception:
        pass
    try:
        import mishkal.tashkeel as _mt
        _VOCALIZER["impl"] = _mt.TashkeelClass()
        _VOCALIZER["kind"] = "mishkal"
        print("[gen_arabic_romanization] vocalizer: mishkal",
              file=sys.stderr)
        return
    except Exception:
        pass
    _VOCALIZER["kind"] = "none"
    print("[gen_arabic_romanization] vocalizer: NONE — install `mishkal` "
          "or `camel-tools` for short vowels (output will be low quality)",
          file=sys.stderr)


_ARABIC_LETTERS = set(
    "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي"
)


def _is_arabic_word(word: str) -> bool:
    """Keep tokens that are at least two letters and entirely Arabic
    letters (drops Latin tokens, digits, punctuation, single letters)."""
    bare = _bare(word)
    return len(bare) >= 2 and all(c in _ARABIC_LETTERS for c in bare)


def _romanize_word(word: str) -> str:
    return transliterate(_vocalize(word), raw=word)


# ── Clitic expansion ───────────────────────────────────────────────
# Arabic glues high-frequency proclitics onto the front of a word — the
# definite article الـ and the prepositions/conjunctions بـ لـ كـ وـ — so a
# single lemma surfaces as many distinct strings in running text
# (كرامة → الكرامة، بالكرامة، وكرامة …). A surface-form font misses all of
# them unless they're listed. We expand each lemma into its common
# proclitic forms, building the romanization deterministically by
# prepending the clitic to the validated bare-lemma romanization (so we
# never re-vocalize the glued form, which a diacritizer handles poorly).

def _article_roman(stem_roman: str, first_letter: str) -> str:
    """DIN form of الـ + stem, applying sun-letter assimilation
    (aš-šams, ad-dawla) vs the plain moon-letter al-."""
    if first_letter in SUN_LETTERS:
        return f"a{CONS[first_letter]}-" + stem_roman
    return "al-" + stem_roman


def expand_clitics(lemma: str, roman: str) -> list[tuple[str, str]]:
    """(arabic, DIN) pairs for `lemma` plus its common proclitic forms:
    bare, الـ, وـ, بـ, لـ, and the article-fused بالـ / والـ / للـ. The
    triple-lām للـ form is skipped for lām-initial lemmas (its spelling
    requires a merge this simple concatenation would get wrong)."""
    first = next((c for c in lemma if c in CONS), None)
    if first is None:
        return [(lemma, roman)]
    art = _article_roman(roman, first)   # al-/aš- form
    art_x = art[1:]                       # drop the leading "a": l-/š-
    forms = [
        (lemma, roman),
        ("ال" + lemma, art),
        ("و" + lemma, "wa-" + roman),
        ("ب" + lemma, "bi-" + roman),
        ("ل" + lemma, "li-" + roman),
        ("بال" + lemma, "bi-" + art_x),
        ("وال" + lemma, "wa-" + art_x),
    ]
    if not lemma.startswith("ل"):
        forms.append(("لل" + lemma, "li-" + art_x))
    return forms


def _lemma_stem(word: str) -> str:
    """Strip a leading definite article so already-definite frequency
    tokens (الاعتراف) expand from their bare stem (اعتراف) — except the
    irregular الـ words in OVERRIDES (الله, الذي …), left intact."""
    if (word.startswith("ال") and word not in OVERRIDES
            and len(_bare(word)) >= 4):
        return word[2:]
    return word


# ── Pathway A/B inputs ─────────────────────────────────────────────
def read_wordfreq(max_entries: int, lang: str = "ar",
                  clitics: bool = False) -> list[tuple[str, str, int]]:
    """Top-N Arabic lemmas from the bundled `wordfreq` data, romanized.

    Weight is the Zipf frequency (0-8) scaled to an integer so rows sort
    by real frequency and stay well below the hand-curated rows' weights
    (~9e6), letting curated entries win on merge + sort first.

    `max_entries` caps the number of LEMMAS; with `clitics` each lemma
    fans out into ~8 proclitic surface forms (see expand_clitics), so the
    emitted row count is larger — wing-font.py's pre-flight glyph budget
    check will stop a build that would overflow the 65,535-glyph cap."""
    try:
        from wordfreq import top_n_list, zipf_frequency
    except ImportError as exc:
        raise SystemExit(
            "[gen_arabic_romanization] the --wordfreq pathway needs the "
            "`wordfreq` package, which is not installed.\n"
            "    pip install wordfreq mishkal\n"
            "Or supply your own list with --frequency-list <file>."
        ) from exc
    rows: list[tuple[str, str, int, str]] = []
    seen_lemmas = 0
    # Pull extra: many top tokens are single letters / Latin we filter out.
    for word in top_n_list(lang, max_entries * 3):
        if not _is_arabic_word(word):
            continue
        weight = max(int(zipf_frequency(word, lang) * 100_000), 1)
        if clitics:
            stem = _lemma_stem(word)
            roman = _romanize_word(stem)
            if not roman:
                continue
            # Bare form keeps the full weight; variants sit just under it
            # so the lemma sorts ahead of its own inflections. The bare
            # form is `auto`; the proclitic forms are `auto-clitic`.
            for k, (ar, rm) in enumerate(expand_clitics(stem, roman)):
                prov = PROV_AUTO if k == 0 else PROV_CLITIC
                rows.append((ar, rm, max(weight - k, 1), prov))
        else:
            roman = _romanize_word(word)
            if not roman:
                continue
            rows.append((word, roman, weight, PROV_AUTO))
        seen_lemmas += 1
        if seen_lemmas >= max_entries:
            break
    return rows


def read_frequency_list(path: Path, max_entries: int) \
        -> list[tuple[str, str, int, str]]:
    """Read a frequency-list TXT (one word per line, optionally
    `word\tfrequency`) and romanize each."""
    rows: list[tuple[str, str, int, str]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            word = parts[0].strip()
            try:
                freq = int(parts[1]) if len(parts) > 1 else 1
            except ValueError:
                freq = 1
            if not _is_arabic_word(word):
                continue
            roman = _romanize_word(word)
            if roman:
                rows.append((word, roman, freq, PROV_AUTO))
            if max_entries and len(rows) >= max_entries:
                break
    return rows


# ── Pathway C: kaikki.org Wiktionary extraction ──────────────────
def read_kaikki(path: Path, max_entries: int) -> list[tuple[str, str, int]]:
    """Read a kaikki.org Arabic JSON dump and extract
    (word, romanization, weight) using Wiktionary's own romanizations.

    Weight is a frequency proxy: number of senses Wiktionary recorded,
    capped at 1e6 so it sorts cleanly alongside hand-curated rows."""
    rows: list[tuple[str, str, int]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            word = entry.get("word")
            if not word or not isinstance(word, str):
                continue
            roman = None
            for sound in entry.get("sounds", []):
                if not isinstance(sound, dict):
                    continue
                if "roman" in sound and isinstance(sound["roman"], str):
                    roman = sound["roman"]
                    break
            if not roman:
                continue
            senses = entry.get("senses") or []
            weight = min(len(senses) * 100, 1_000_000)
            rows.append((word, roman.strip(), max(weight, 1), PROV_AUTO))
            if max_entries and len(rows) >= max_entries * 4:
                break
    return rows


# ── Curated merge + CSV writer ─────────────────────────────────────
def load_existing(path: Path) -> dict[str, tuple[str, int, str]]:
    """Load an existing CSV into {word: (roman, weight, provenance)}.

    Provenance comes from the 4th column when present; for legacy
    3-column files it is inferred from the weight (≥ CURATED_WEIGHT_FLOOR
    ⇒ curated, else auto), which matches the seed set's convention."""
    best: dict[str, tuple[str, int, str]] = {}
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
            if len(row) > 3 and row[3] in VALID_PROVENANCE:
                prov = row[3]
            else:
                prov = (PROV_CURATED if weight >= CURATED_WEIGHT_FLOOR
                        else PROV_AUTO)
            best[word] = (roman, weight, prov)
    return best


def write_csv(rows: list[tuple[str, str, int, str]], out_path: Path,
              merge: bool = True, preserve: bool = True) -> tuple[int, int]:
    """Write the CSV (4 columns: word, roman, weight, provenance) sorted by
    weight desc. Returns (total, kept_curated).

    When `merge`, the CURATED rows of an existing CSV are overlaid on top
    of the freshly generated rows — so hand-verified entries always win,
    while stale `auto` rows from a previous run are replaced rather than
    accumulated. With no generated rows and `preserve`, the file is left
    untouched."""
    if not rows and preserve and out_path.exists() and not merge:
        print(f"[gen_arabic_romanization] no rows generated; preserving "
              f"existing {out_path.name}", file=sys.stderr)
        return 0, 0

    best: dict[str, tuple[str, int, str]] = {}
    for word, roman, weight, prov in rows:
        existing = best.get(word)
        if existing is None or weight > existing[1]:
            best[word] = (roman, weight, prov)

    kept = 0
    if merge:
        # Only CURATED rows are authoritative; previously-generated rows
        # are regenerated, not preserved (avoids auto-row accumulation).
        curated = {w: v for w, v in load_existing(out_path).items()
                   if v[2] == PROV_CURATED}
        kept = len(curated)
        best.update(curated)

    ordered = sorted(((w, r, wt, p) for w, (r, wt, p) in best.items()),
                     key=lambda x: (-x[2], x[0]))
    with out_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        for word, roman, weight, prov in ordered:
            writer.writerow([word, roman, weight, prov])
    return len(ordered), kept


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate/expand arabic-romanization.csv")
    src = parser.add_mutually_exclusive_group()
    src.add_argument("--wordfreq", action="store_true",
                     help="Use the bundled wordfreq frequency list (offline)")
    src.add_argument("--frequency-list", type=Path,
                     help="Path to a word-frequency .txt")
    src.add_argument("--kaikki", type=Path,
                     help="Path to a kaikki.org Arabic JSON dump")
    parser.add_argument("--max", type=int, default=4000,
                        help="Cap number of lemmas (default 4000). With "
                             "--clitics each lemma fans out into ~8 forms.")
    parser.add_argument("--clitics", action="store_true",
                        help="Also emit common proclitic surface forms of "
                             "each lemma (الـ بـ لـ وـ + fused بالـ والـ للـ) "
                             "to cover inflected running text, not just "
                             "dictionary citation forms.")
    parser.add_argument("--no-merge", action="store_true",
                        help="Do NOT merge over the existing curated CSV "
                             "(by default curated rows are kept and win)")
    parser.add_argument("--allow-no-vocalizer", action="store_true",
                        help="Proceed even if no diacritizer (mishkal / "
                             "camel-tools) is available. NOT recommended: "
                             "without vocalization the romanization is a "
                             "consonant skeleton missing short vowels.")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT,
                        help=f"Output CSV path (default {DEFAULT_OUTPUT})")
    args = parser.parse_args(argv)

    # The wordfreq / frequency-list pathways romanize unvocalized text, so
    # they need a diacritizer to be any good. Fail fast with an actionable
    # message rather than silently writing a low-quality CSV.
    if (args.wordfreq or args.frequency_list) and not args.allow_no_vocalizer:
        _resolve_vocalizer()
        if _VOCALIZER["kind"] == "none":
            raise SystemExit(
                "[gen_arabic_romanization] no Arabic diacritizer available, "
                "so short vowels can't be recovered and the output would be "
                "low quality.\n    pip install mishkal\n"
                "(or install camel-tools). Pass --allow-no-vocalizer to "
                "generate a consonant-skeleton CSV anyway."
            )

    if args.wordfreq:
        rows = read_wordfreq(args.max, clitics=args.clitics)
    elif args.frequency_list:
        if not args.frequency_list.exists():
            print(f"[gen_arabic_romanization] frequency list not found: "
                  f"{args.frequency_list}", file=sys.stderr)
            return 2
        rows = read_frequency_list(args.frequency_list, args.max)
    elif args.kaikki:
        if not args.kaikki.exists():
            print(f"[gen_arabic_romanization] kaikki file not found: "
                  f"{args.kaikki}", file=sys.stderr)
            return 2
        rows = read_kaikki(args.kaikki, args.max)
    else:
        print("[gen_arabic_romanization] no source flag; nothing to do. "
              "Pass --wordfreq, --frequency-list <path>, or --kaikki <path>. "
              "Existing CSV is preserved.", file=sys.stderr)
        return 0

    total, kept = write_csv(rows, args.output, merge=not args.no_merge)
    print(f"[gen_arabic_romanization] wrote {total} entries to "
          f"{args.output} ({len(rows)} generated, {kept} curated merged)",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
