# Contributing to Wing Font mappings

This guide is for **linguists and language contributors** reviewing or
correcting the romanization/annotation data that drives Wing Font. You do
not need to build a font or write code to contribute — the mappings are
plain CSV files, and a single-row correction is a valid, welcome change.

If you only want to report one wrong reading, the fastest path is the
**"report a wrong reading" button** on any specimen page
(`wing-font.chunlaw.io/specimen/<font>`). This guide is for reviewing at
scale and submitting corrections as pull requests.

## What a mapping is

Each file in `python/mappings/` maps a written unit to its annotation —
the small text Wing Font bakes above (or, for Arabic, below) the
character. There are two row formats, auto-detected per row by the script
of the first column, so one file can mix both:

**CJK — per character.** The annotation is space-separated, one token per
character:

```
銀行,ngan4 hong4        # 銀→ngan4, 行→hong4
行,hang4                # single character
```

Multi-character rows also seed **word-context disambiguation**: because
行 reads `hong4` in 銀行 but `hang4` alone, listing the word fixes the
contextual reading.

**Word-unit scripts (Arabic, Thai, Devanagari/Hindi) — per word.** The
whole word becomes one glyph, and the entire second column is its
annotation (it may contain spaces):

```
السلام,as-salām
كتاب,kitāb
```

## The columns

```
<key>,<annotation>,<weight>,<provenance>
```

| Column | Meaning |
|---|---|
| `key` | The character(s) / word being annotated. |
| `annotation` | The romanization (or target-script transliteration). |
| `weight` | Integer priority. Higher sorts first and wins as the **default reading** when a key has several. Hand-curated rows use large values (≥ 1,000,000); generated rows use a frequency-derived value below that. Optional — defaults to 1. |
| `provenance` | *(optional, 4th column)* How the row was produced — see below. The font build ignores this column; it exists purely for review. |

### Provenance — what to trust and what to check

| Tag | Meaning | Review priority |
|---|---|---|
| `curated` | Hand-written or human-verified. Authoritative: wins on merge and is never overwritten by regeneration. | Stable. |
| `auto` | Machine-romanized base word. Best-effort — for scripts that need vocalization (Arabic), isolated-word readings can pick the wrong homograph. | **Review these first.** |
| `auto-clitic` | A proclitic surface form derived from an `auto` word (Arabic الـ/بـ/لـ/وـ + fused forms). Correctness follows its parent word. | Review the parent. |
| `blank` | A scale-only row: the annotation is the ideographic space U+3000 (　), so the base character is shrunk by `base_scale` to match its annotated neighbours but no annotation ink is drawn. Used for kana / Japanese symbols so mixed kanji+kana text renders at one body size. | Leave as-is. |

**When you verify or fix an `auto` row, change its provenance to
`curated`.** That promotes it to authoritative — the generator will then
preserve your wording on the next regeneration instead of overwriting it.

## Romanization standards per language

Apply the standard the file already uses; don't mix schemes within a file.

| Family | File(s) | Standard |
|---|---|---|
| Cantonese | `canto-lshk` | LSHK Jyutping |
| Cantonese (other) | `canto-yale`, `canto-lau`, `canto-guangdong`, `canto-chishima` | Yale / Lau / Guangdong / Chishima |
| Mandarin | `mandarin-cn`, `mandarin-tw` | Hanyu Pinyin |
| Taiwanese / Southern Min | `taigi-tl*`, `taigi-poj*`, `taigi-tps`, `taigi-kana` | Tâi-lô, POJ, Bopomofo, Taiwanese Kana |
| Teochew | `teochew-gdpi`, `teochew-tlo`, … | Peng'im (GDPI), Pe̍h-ūe-jī — see `teochew-README.md` |
| Arabic | `arabic-romanization` | **DIN 31635** — see `arabic-romanization-NOTES.md` |
| Thai | `thai-paiboon` | Paiboon — see `thai-paiboon-NOTES.md` |
| Hindi | `hindi-romanization` | **ISO 15919** with Hindi schwa deletion (राम → rām) |
| Cross-script (CJK→other) | `canto-katakana`, `canto-hindi`, `canto-korean`, `canto-thai`, `canto-urdu` | Transliteration into the target script — see the per-file `*-NOTES.md` |

DIN 31635 uses single-character diacritic forms (ḫ ġ ṯ ḏ š), **not**
ALA-LC digraphs (kh gh th dh sh), so the Latin row stays tight beside the
Arabic. ISO 15919 likewise uses macrons (ā ī ū) and dotted retroflexes
(ṭ ḍ ṇ). When in doubt, match the surrounding rows.

## Submitting a correction

1. Edit the relevant CSV row(s). Keep one scheme per file.
2. If you verified an `auto` row, set its provenance to `curated`.
3. Run the validator (below) and fix anything it flags in your rows.
4. Open a pull request describing the change and, ideally, the source
   (dictionary, corpus, your own expertise). CI runs the validator on the
   files you touched.

For systematic gaps (a whole missing dialect, or thousands of words), the
[Telegram group](https://t.me/wingfont) is the right place to coordinate
before a large PR.

## Running the validator

From `python/mappings/`:

```sh
python validate_mappings.py                      # all mapping CSVs
python validate_mappings.py arabic-romanization.csv   # just one
python validate_mappings.py --strict             # warnings fail too
```

It checks, without needing the fonts:

- **Errors** (block a merge): malformed rows, empty key/annotation,
  unknown provenance tag, the base script leaking into a romanization
  (e.g. an Arabic letter left in the DIN column), or a predicted glyph
  count over OpenType's hard 65,535-glyph cap.
- **Warnings**: a non-integer weight, exact-duplicate rows, or a glyph
  count nearing the cap.

## Two things to know about scale

- **The 65,535-glyph cap.** Every distinct reading becomes a glyph, and a
  TrueType font can hold at most 65,535. The build does a pre-flight
  check and aborts early with a concrete "keep about the top N rows"
  message if a mapping would overflow — so adding rows is safe; it fails
  loudly rather than silently corrupting.
- **Regeneration preserves curated rows.** The generator scripts
  (`gen_*.py`) re-derive the `auto`/`auto-clitic` rows from frequency
  data, but they merge your `curated` rows back on top untouched. Your
  reviewed corrections are safe across regenerations.
