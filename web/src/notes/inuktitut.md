# Inuktitut (ᐃᓄᒃᑎᑐᑦ)

**Romanization.** The ICI standard roman orthography used in Nunavut, converted
from syllabics by [qaniujaaqpait](https://github.com/ColemanHaley/qaniujaaqpait)
(MIT), plus ᕼ → `h`. Syllabics and ICI roman are almost one-to-one, so every
reading is exact; the one context rule is ᖅ before a k-series syllable → `qq`
(ᖅᑭ = `qqi`). Nunavik conventions (e.g. the ai-series) are not covered.

**Source text.** Word frequencies come from the *Nunavut Hansard
Inuktitut–English Parallel Corpus 3.0*. Text © Legislative Assembly of Nunavut,
licensed **CC BY 4.0**; corpus alignment by the National Research Council of
Canada. The font carries a derived word list, not an official transcript.

**How annotations are made.** A **word-unit** mapping, matched longest-first,
with the reading **below** the syllabics. About 20,000 entries in three tiers:

1. every syllabic symbol (plus the `qq` rule), so any text always gets a correct
   reading, symbol by symbol, even when nothing else matches;
2. the 12,000 most frequent words in the Hansard (≈68% of running text);
3. ~8,000 frequent "roots" and "chunks" learned by an unsupervised Morfessor
   model, so a long word that is not on the list is grouped into a few pieces
   instead of single symbols.

**Limitations.**

- Inuktitut is polysynthetic: one word can carry a whole sentence's meaning, so
  no word list covers it. What can be wrong is **where a word is split**, never
  the reading itself.
- Roots and chunks are statistical, **not morphemes** — e.g. ᓚᐃᓴᑖᕋᓱᐊᕐᓂᕈᒪ
  shows `laisa | taarasua | rniruma`, while the morphemes are
  laisa-taa-rasuar-ni-ruma. Do not read a split as a morpheme boundary.
- A listed word can also match inside a longer word, so a split can fall
  mid-word even for common vocabulary.
- The list is capped at ~20k entries so the web font stays loadable in
  browsers.

Speakers and linguists: a morpheme-segmented word list would let the font split
words at real boundaries. Full method and the regeneration script:
[`python/mappings/inuktitut/`](https://github.com/chunlaw/wing-font-generator/tree/main/python/mappings/inuktitut).
