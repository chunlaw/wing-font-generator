# Hindi (हिन्दी)

> **A note on authorship and humility.** The author of this mapping has
> **no prior knowledge of Hindi** — not as a speaker, reader, or student.
> What is described below is a transparent, rule-based pipeline built from
> published standards and open data, not the judgement of someone who knows
> the language. It will contain mistakes that only a person who actually
> knows Hindi would catch. **Corrections and improvements are warmly
> invited** — see the "Help wanted" section below.

The mapping CSV lives at
[`python/mappings/hindi/hindi-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/hindi/hindi-romanization.csv),
generated/expanded by
[`gen_hindi_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/hindi/gen_hindi_romanization.py)
in the same folder.

## Romanization

**ISO 15919** — the international academic standard for Indic
transliteration — with Hindi **word-final schwa deletion**. ISO 15919 uses
macrons for long vowels (`ā ī ū`), dots under the retroflex series
(`ṭ ḍ ṇ`), `ś / ṣ` for the two sibilants, and `ṁ` for anusvāra. Schwa
deletion drops the implicit *a* that Devanagari writes but Hindi does not
always pronounce, so राम romanizes as `rām`, not `rāma`.

Pass `--no-schwa-delete` to the generator for strict, fully reversible
ISO 15919 / IAST instead (every inherent vowel written: राम → `rāma`).

## How the mapping is generated — methodology

This is a **word-unit** mapping: each whole Devanagari word becomes one
composed, annotated glyph with its romanization stacked above, and the
**conjunct (ligature) formation and mark stacking of the Devanagari base
are preserved** through GSUB ligation. (Note: the Cantonese set separately
transliterates *Cantonese* readings *into* Devanagari — a different,
CJK-base mapping that is unrelated to this file.)

The romanization itself is produced in four deterministic steps:

1. **Word list and frequency.** A frequency-ranked Hindi word list is the
   input. The default offline pathway uses the bundled
   [`wordfreq`](https://pypi.org/project/wordfreq/) data (`--wordfreq`);
   its Hindi list saturates near ~24k usable Devanagari words. An external
   frequency file can be supplied instead (`--frequency-list words.txt`).
   Each word's weight is its Zipf frequency scaled to an integer, so the
   most common words sort first — which is also the order the font's
   GSUB rules use to break ties.
2. **Grapheme-by-grapheme transliteration.** Because Devanagari is an
   *abugida* — it writes its vowels — the map from script to ISO 15919 is
   **deterministic and fully offline**. Each consonant carries an inherent
   *a* unless cancelled by a vowel sign (mātrā), a virāma (हलन्त, forming a
   conjunct), or word-final schwa deletion. Independent vowels, nukta
   forms (the Perso-Arabic `q z f ġ ṛ` series), anusvāra, visarga,
   candrabindu, avagraha, and Devanagari digits are each mapped explicitly.
   There is **no statistical model and no vocalization step** — the output
   is reproducible byte-for-byte from the same input.
3. **Schwa deletion (the one modelled decision).** Only the **word-final**
   inherent schwa is dropped (राम rāma → `rām`, घर ghara → `ghar`, कमल
   kamala → `kamal`). This single rule is what most distinguishes real
   Hindi pronunciation from a naïve letter-by-letter reading, and it is
   roughly **99% reliable**, so it is ON by default. **Medial** schwa
   deletion (चलना calanā → calnā) is morphology- and context-dependent and
   is **deliberately not attempted** — those medial schwas are left in
   rather than guessed at.
4. **Curated merge.** Generated rows are written *under* any existing
   hand-checked rows: on a word collision the curated romanization always
   wins and is never overwritten (`--no-merge` disables this). This lets a
   human-verified core grow alongside the machine-generated bulk.

## Limitations

- **Author has no knowledge of Hindi.** The pipeline encodes published
  rules, not lived fluency. Treat every machine-generated row as
  provisional until a Hindi reader has checked it.
- **Schwa deletion is heuristic.** Hindi schwa-retention is partly lexical,
  so the word-final rule will occasionally over- or under-delete; and
  medial schwa is not handled at all, so some multisyllabic words read with
  an extra vowel a Hindi speaker would not pronounce.
- **Isolated-word romanization.** Nasalization (anusvāra vs. candrabindu),
  the inherent ambiguity of some loanword spellings, and proper nouns are
  the usual rough edges. Devanagari avoids Arabic's vowel-guessing problem,
  but it is not free of ambiguity.
- **Coverage is frequency-bounded.** The default build covers roughly the
  top ~24k words. A word with **no mapping row falls back to the base
  font's plain glyphs**, with no romanization shown.

## Help wanted

If you are a **linguist, a Hindi teacher, a native or heritage speaker, a
learner, or simply someone who spots something that looks wrong** — please
help polish this. There is no expertise barrier: even a single "this word
is romanized wrong, it should be X" is genuinely valuable.

Useful contributions include: correcting individual romanizations
(especially schwa deletion and nasalization), proposing a better schwa
rule or a medial-schwa heuristic, flagging systematic errors in the
ISO 15919 tables, or suggesting a higher-quality frequency list.

- **Edit the data directly:**
  [`hindi-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/hindi/hindi-romanization.csv)
  (format: `<devanagari-word>,<ISO 15919 romanization>[,weight]`). Hand-fixed
  rows are kept and win over the generator.
- **Improve the method:**
  [`gen_hindi_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/hindi/gen_hindi_romanization.py).
- **Or just reach out:** open an issue / PR on
  [github.com/chunlaw/wing-font-generator](https://github.com/chunlaw/wing-font-generator),
  or join the **[Telegram group](https://t.me/wingfont)** to talk it through.
  Corrections from people who actually know the language are exactly what
  this needs.
