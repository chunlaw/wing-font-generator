# Hindi (हिन्दी)

**Romanization.** **ISO 15919** with Hindi **schwa deletion** — the implicit
*a* that Devanagari writes but Hindi doesn't always pronounce is dropped, so
राम romanizes as `rām`, not `rāma`. ISO 15919 uses macrons for long vowels
(`ā ī ū`) and dotted retroflexes (`ṭ ḍ ṇ`).

**How annotations are made.** This is a **word-unit** mapping: each Devanagari
word is composed into a single annotated glyph with its romanization stacked
above, and the **conjunct (ligature) formation and mark stacking of the
Devanagari base are preserved** through GSUB ligation. (Separately, the
Cantonese set also transliterates *Cantonese* readings into Devanagari — that is
a different, CJK-base mapping.)

**Limitations.**

- Schwa deletion is **rule-based and heuristic**; Hindi schwa-retention is
  partly lexical, so some words will over- or under-delete the schwa.
- Machine-romanized rows are a best-effort approximation; nasalization
  (anusvāra/candrabindu) and loanword spellings are the usual rough edges.
- A word with no mapping row falls back to the base font's plain glyphs (no
  annotation).
