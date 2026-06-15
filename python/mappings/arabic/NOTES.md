# Arabic (العربية)

> **A note on authorship and humility.** The author of this mapping has
> **no prior knowledge of Arabic** — not as a speaker, reader, or student.
> What follows is a transparent pipeline built from a published
> transliteration standard and open NLP tools, not the judgement of someone
> who knows the language. Arabic's unwritten short vowels make isolated-word
> romanization genuinely hard, and this pipeline *will* mis-read words that
> a reader of Arabic would get right instantly. **Corrections and
> improvements are warmly invited** — see the "Help wanted" section below.

The mapping CSV lives at
[`python/mappings/arabic/arabic-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/arabic/arabic-romanization.csv),
generated/expanded by
[`gen_arabic_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/arabic/gen_arabic_romanization.py).
A deeper, table-by-table write-up of the romanization schema and source
pathways is in
[`arabic-romanization-NOTES.md`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/arabic/arabic-romanization-NOTES.md).

## Romanization

**DIN 31635** — the international academic standard (Hans Wehr, Lane,
Wright). It uses single-character diacritic forms rather than digraphs
(**ṯ ḫ ḏ š** for ث خ ذ ش, not *th kh dh sh*), emphatic dots
(**ṣ ḍ ṭ ẓ**), the ʿayn / hamza half-rings (**ʿ ʾ**), and macrons for long
vowels (**ā ī ū**). The definite article **ال** assimilates to sun letters
(الشمس → *aš-šams*). The single-character forms are chosen deliberately:
they keep the Latin row visually tight when stacked above the Arabic inside
one composed glyph. (DIN and ALA-LC are mutually convertible by a one-shot
regex if you prefer the digraph style downstream.)

## How the mapping is generated — methodology

This is a **word-unit** mapping: each Arabic word becomes one composed
glyph with its romanization stacked above, and the word's **cursive joining
is preserved** — letters still connect correctly inside the composed glyph
(boundary-guarded GSUB ligation, with GDEF ligature carets so the cursor
still steps through the word).

The romanization is built in three stages:

1. **Word list.** Three interchangeable source pathways feed the same
   romanizer:
   - **`--wordfreq`** (recommended, fully offline) — the most frequent
     Arabic words from the bundled
     [`wordfreq`](https://pypi.org/project/wordfreq/) data, frequency-ranked
     so the font annotates the words a reader actually meets most.
   - **`--frequency-list words.txt`** — an external word-frequency file in
     the same shape, for custom corpora.
   - **`--kaikki <dump.json>`** — Wiktionary's own human-curated
     romanizations (CC-BY-SA), ranked by sense-count as a frequency proxy.
     Highest romanization quality, but the dump is large.
2. **Vocalization — the hard, lossy step.** Modern Arabic is written
   **without short vowels**, but a romanization needs them. Each word is
   first *diacritized* by the best available tool, in preference order:
   **CAMeL Tools** (morphological, most accurate) → **mishkal**
   (Zerrouki's pure-Python diacritizer) → **bare skeleton** (long vowels
   only, last resort). Only after vowels are restored does the
   deterministic DIN 31635 letter mapping run. Vocalizing an *isolated*
   word is inherently ambiguous — there is often no single correct answer
   without sentence context — so this stage is where most errors enter.
3. **Provenance-tagged curated merge.** Every row carries a 4th column the
   font build ignores but reviewers rely on:
   - **`curated`** — hand-written / human-verified; authoritative, wins on
     merge, never overwritten. A starter set of ≈130 common words seeds
     this tier.
   - **`auto`** — machine-romanized lemma; **the priority for review**,
     because isolated-word vocalization can mis-read homographs.
   - **`auto-clitic`** — a proclitic surface form (الـ / بـ / لـ / وـ +
     fused forms) derived from an `auto` lemma; its correctness follows the
     parent lemma.

   Rows are sorted by weight descending so the most common words come
   first, matching how the GSUB rules break ties. A variant-override
   mechanism — typing `word + ـ (tatweel) + digit` — cycles through
   alternate readings for words the default vocalization gets wrong.

## Limitations

- **Author has no knowledge of Arabic.** The pipeline encodes a standard
  and leans on NLP tools; it does not know the language. Treat `auto` rows
  as provisional until an Arabic reader has checked them.
- **Unwritten vowels make isolated words ambiguous.** كتب could be *kataba*
  ("he wrote"), *kutiba* ("it was written"), or *kutub* ("books"); درس
  could be the noun *dars* or the verb *darasa*. The vocalizer picks one;
  it will sometimes pick wrong. `auto` rows should be reviewed and promoted
  to `curated`.
- **Coverage is a starter vocabulary**, not the whole language. ~130
  hand-curated words plus whatever the generator adds; an unmapped word
  shows plain Arabic glyphs with no romanization. Newspaper-level reading
  would need several thousand words plus proper case/ending handling;
  Quranic/Classical Arabic would need full ḥarakāt and possibly a different
  standard.
- **Experimental non-CJK word-unit path.** Tall stacked annotations may
  need the `--out-ascent` lever to avoid clipping in some applications.

## Help wanted

If you are a **linguist, an Arabic teacher, a native or heritage speaker, a
learner, or simply someone who spots a wrong vowel** — please help polish
this. The single highest-value contribution is reviewing the `auto` rows
and fixing their vocalization, because that is exactly where machine
guessing fails and human knowledge wins.

Useful contributions include: correcting individual romanizations and
promoting them from `auto` to `curated`; flagging homographs that need a
variant reading; improving the DIN 31635 edge cases (sun-letter
assimilation, tāʾ marbūṭa, hamza seats); or pointing to a better diacritizer
or frequency list.

- **Edit the data directly:**
  [`arabic-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/arabic/arabic-romanization.csv)
  (format: `<arabic-word>,<DIN 31635 romanization>,<weight>,<provenance>`).
  Set the provenance to `curated` on any row you verify — it will then win
  and never be overwritten by the generator.
- **Improve the method:**
  [`gen_arabic_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/arabic/gen_arabic_romanization.py).
- **Or just reach out:** open an issue / PR on
  [github.com/chunlaw/wing-font-generator](https://github.com/chunlaw/wing-font-generator),
  or join the **[Telegram group](https://t.me/wingfont)** to talk it through.
  Corrections from people who actually know the language are exactly what
  this needs.
