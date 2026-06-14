# Teochew / Min Nan (潮州話)

**Romanization.** The primary scheme is **Geng'dang Pêng'im (GDPI / 廣東拼音)**
with numeric tones (`teochew-gdpi`), with the historical **Duffus / Pe̍h-ūe-jī**
(diacritic) as the second showcased system. Four more schemes are available in
the generator: **Tie-lo (潮羅)**, **Gaginang Peng'im**, **Dieghv (潮語)**, and
**Teochew Sinwenz (新文字)**. Each file holds ≈12,600 rows (≈5,080
single-character readings over ≈3,300 characters, plus ≈7,530 multi-character
word readings).

**How annotations are made.** Readings are drawn from the **learn-teochew**
Wiktionary-derived dictionary (the `mn-t` field), already segmented into
per-character syllables, and converted between schemes with **parsetc**. As
with the other Sinitic mappings, multi-character words drive polyphone
disambiguation, and the **primary / vernacular** reading is given the highest
weight as the font default (e.g. 行 → `gian5`, not the literary `hêng5`).

**Limitations.**

- Only readings that parse cleanly as GDPI and whose syllable count matches the
  character count were kept; rare or irregular readings may be absent.
- Polyphonic characters fall back to the source-first (usually vernacular)
  reading where no word rule applies.
- The diacritic schemes (Duffus, Tie-lo) require the **Huninn** annotation font
  for their combining marks (tilde, dot-above, diaeresis-below, nasal ⁿ).
