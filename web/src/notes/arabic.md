# Arabic (العربية)

**Romanization.** **DIN 31635** — the international academic standard (Hans
Wehr, Lane, Wright). It uses single-character diacritic forms rather than
digraphs (**ṯ ḫ ḏ š** for ث خ ذ ش, not *th kh dh sh*), emphatic dots
(**ṣ ḍ ṭ ẓ**), the ʿayn / hamza half-rings (**ʿ ʾ**), and macrons for long
vowels (**ā ī ū**). The definite article **ال** assimilates to sun letters
(الشمس → *aš-šams*).

**How annotations are made.** This is a **word-unit** mapping: each Arabic word
becomes one composed glyph with its romanization stacked above, and the word's
**cursive joining is preserved** — letters still connect correctly inside the
composed glyph (boundary-guarded GSUB ligation, with GDEF ligature carets so the
cursor still steps through the word). A starter set of ≈130 common words is
hand-curated (`curated` provenance); the rest can be generated and grow over
time (`auto`).

**Limitations.**

- Arabic is written without short vowels, so an **isolated word is ambiguous** —
  an automatic romanizer can pick the wrong vocalization/homograph (كتب =
  *kataba* "he wrote" vs *kutub* "books"). `auto` rows should be reviewed and
  promoted to `curated`.
- Coverage is a **starter vocabulary**, not the whole language; an unmapped word
  shows the plain Arabic glyphs with no romanization.
- This is the experimental non-CJK **word-unit base** path; tall stacks may need
  the `--out-ascent` lever to avoid clipping in some apps.
