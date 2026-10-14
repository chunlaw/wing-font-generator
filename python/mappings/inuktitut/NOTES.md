# Inuktitut (ᐃᓄᒃᑎᑐᑦ) — `inuktitut-hansard.csv`

**Romanization.** ICI standard roman orthography (Nunavut), via
[qaniujaaqpait](https://github.com/ColemanHaley/qaniujaaqpait) (MIT), plus
ᕼ (U+157C) → `h`, which qaniujaaqpait lacks but the Hansard uses ~22k times.
Syllabics ↔ ICI roman is near one-to-one; the one context rule is ᖅ before a
k-series syllable → `qq` (ᖅᑭ = `qqi`), encoded as six two-symbol rows.
Nunavik conventions (e.g. the ai-series) are not covered.

**Source text.** Word frequencies from the *Nunavut Hansard Inuktitut–English
Parallel Corpus 3.0* (OPUS v3.0.1). Text © Legislative Assembly of Nunavut,
licensed **CC BY 4.0**; corpus alignment by the National Research Council of
Canada. This file is a derived word list, not an official transcript.

**How annotations are made.** Word-unit mapping (`cans` in
`wingfont/csv_parser.py`), longest-match without word-boundary guards, with the
annotation **below** the word (`--anno-below`):

1. 118 rows: every syllabic symbol + the six qq rules — every word reads correctly
   even when nothing else matches;
2. the 12,000 most frequent words (≈68% of running text);
3. ~6,100 frequent "roots" and ~2,200 "chunks" from an unsupervised Morfessor
   model, so long unlisted words are grouped into a few pieces instead of single
   symbols (simulated: ~94% of tokens fully grouped).

**Limitations.**

- Readings are exact ICI romanization; what can be wrong is **where a word is
  split**. Roots/chunks are statistical, not morphemes — e.g.
  ᓚᐃᓴᑖᕋᓱᐊᕐᓂᕈᒪ shows `laisa | taarasua | rniruma`, while the morphemes are
  laisa-taa-rasuar-ni-ruma. Do not read a split as a morpheme boundary.
- A listed word can also match inside a longer word (no boundary guards), so the
  split can fall mid-word even for common vocabulary.
- Size budget: ~20k entries (TTF ≈26 MB, WOFF2 ≈1.1 MB). A ~31k-entry build
  (TTF ≈42 MB) loaded as TTF but its WOFF2 was rejected by Chrome.

Regenerate with `gen_inuktitut.py` (see its docstring).

## Build

CI entry `NotoSansCanAb-NotoCond-iu` in `.github/workflows/deploy-pages.yml`:
`--anno-below -as 0.42 -bs 0.70`, condensed Noto Sans (`--anno-axis wdth=75`).
Build takes ~6–7 minutes because of the 20k word-unit ligatures.
