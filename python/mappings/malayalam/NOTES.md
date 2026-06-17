# Malayalam (മലയാളം)

> **A note on authorship and humility.** The author of this mapping has
> **no prior knowledge of Malayalam** — not as a speaker, reader, or
> student. What is described below is a transparent, rule-based pipeline
> built from published standards and open data, not the judgement of
> someone who knows the language. It will contain mistakes that only a
> person who actually knows Malayalam would catch. **Corrections and
> improvements are warmly invited** — see the "Help wanted" section below.

The mapping CSV lives at
[`python/mappings/malayalam/malayalam-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/malayalam/malayalam-romanization.csv),
generated/expanded by
[`gen_malayalam_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/malayalam/gen_malayalam_romanization.py)
in the same folder. It is the Malayalam sibling of the Hindi mapping and
shares its design — read
[`../hindi/NOTES.md`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/hindi/NOTES.md)
alongside this; only the language-specific points below differ.

## Romanization

**ISO 15919** — the international academic standard for Indic
transliteration. Macrons for long vowels (`ā ī ū ē ō`), dots under the
retroflex series (`ṭ ḍ ṇ ḷ`), `ś / ṣ` for the two sibilants, `ṁ` for
anusvāra, `ḥ` for visarga. Malayalam, unlike Hindi, **distinguishes short
and long mid vowels**, so ISO 15919 writes `e` (എ) vs `ē` (ഏ) and `o` (ഒ)
vs `ō` (ഓ); the corresponding vowel signs are mapped the same way. The
language-specific `ḻ` (ഴ) and `ṟ` (റ) are preserved.

## How the mapping is generated — methodology

This is a **word-unit** mapping: each whole Malayalam word becomes one
composed, annotated glyph with its romanization stacked above, and the
**conjunct (ligature) formation and mark stacking of the Malayalam base
are preserved** through GSUB ligation (the `mlym` entry in
`csv_parser.WORD_SCRIPTS`, mirroring `deva`).

The romanization itself is produced in four deterministic steps:

1. **Word list and frequency.** A frequency-ranked Malayalam word list is
   the input. **Unlike Hindi, the bundled
   [`wordfreq`](https://pypi.org/project/wordfreq/) data has no Malayalam
   (`ml`) list** — it silently falls back to English — so the `--wordfreq`
   pathway is disabled and exits with a message. Supply a frequency list
   instead (`--frequency-list words.txt`). A good public source is the
   OpenSubtitles-derived
   [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
   list (`content/2018/ml/ml_50k.txt`). Each word's weight is its corpus
   frequency, so the most common words sort first — which is also the
   order the font's GSUB rules use to break ties. The CSV shipped here was
   seeded from the ~1,000 most frequent words (`ml_freq_seed.txt`); rerun
   the generator against the full `ml_50k.txt` to expand coverage.
2. **Grapheme-by-grapheme transliteration.** Because Malayalam is a
   Brahmic *abugida* — it writes its vowels — the map from script to
   ISO 15919 is **deterministic and fully offline**. Each consonant
   carries an inherent *a* unless cancelled by a vowel sign (mātrā), by
   the virāma (chandrakkala ്, forming a conjunct), or by being a **chillu
   letter** (see below). Independent vowels, dependent vowel signs,
   anusvāra, visarga, candrabindu, and Malayalam digits are each mapped
   explicitly. There is **no statistical model and no vocalization step**
   — the output is reproducible byte-for-byte from the same input.
3. **Chillu and the inherent vowel — the key difference from Hindi.**
   Hindi drops the word-final inherent schwa (राम → rām). **Malayalam does
   not, and this pipeline does not either.** Malayalam orthography marks
   vowellessness *explicitly*: a word-final consonant is written either
   with a dedicated **chillu** glyph (ൻ n, ർ r, ൽ l, ൾ ḷ, ൺ ṇ, ൿ k) or
   with a visible chandrakkala, so a consonant carrying its inherent vowel
   is generally pronounced with it. The inherent *a* is therefore always
   written (രമ → `rama`, never "ram"). Chillu letters map to a bare
   consonant.
4. **Samvr̥tokaram (the one modelled decision).** A word-final consonant +
   chandrakkala (e.g. അത് "that") is pronounced with a very short central
   vowel — the *samvr̥tokaram* or "half-u" — not as a fully bare
   consonant. Strict ISO 15919 has no letter for it, so by **default** it
   is rendered as a bare consonant (അത് → `at`). Pass `--samvrit-u` to
   append a breve-u instead (അത് → `atŭ`), which some romanizers prefer.
   This is the single place a Malayalam reader should check first — the
   analogue of Hindi's schwa flag.

Generated rows are written *under* any existing hand-checked rows: on a
word collision the curated romanization always wins and is never
overwritten (`--no-merge` disables this), so a human-verified core can
grow alongside the machine-generated bulk.

## Limitations

- **Author has no knowledge of Malayalam.** The pipeline encodes published
  rules, not lived fluency. Treat every machine-generated row as
  provisional until a Malayalam reader has checked it.
- **Samvr̥tokaram is under-represented by default.** Word-final
  consonant + chandrakkala is rendered as a bare consonant unless
  `--samvrit-u` is passed; even then, the breve-u is a convention, not a
  pronunciation model.
- **No medial schwa / sandhi handling.** Like the Hindi pipeline, this is
  isolated-word, letter-by-letter transliteration; gemination written in
  the script is preserved, but no morphological or sandhi adjustments are
  attempted.
- **Coverage is frequency-bounded.** The shipped CSV covers roughly the
  top ~1,000 words. A word with **no mapping row falls back to the base
  font's plain glyphs**, with no romanization shown. Expand by rerunning
  against a larger frequency list.
- **No Malayalam base font is wired into the build yet.** Producing a font
  needs a Malayalam base TTF (e.g. Noto Sans Malayalam / Manjari /
  Rachana) plus an `init_fonts.py` entry and a web preset, analogous to
  Hind-Regular for Hindi. The mapping data here is independent of that
  step.

## Help wanted

If you are a **linguist, a Malayalam teacher, a native or heritage
speaker, a learner, or simply someone who spots something that looks
wrong** — please help polish this. There is no expertise barrier: even a
single "this word is romanized wrong, it should be X" is genuinely
valuable.

Useful contributions include: correcting individual romanizations
(especially samvr̥tokaram and chillu edge cases), proposing a better
default for the half-u, flagging systematic errors in the ISO 15919
tables, or suggesting a higher-quality frequency list.

- **Edit the data directly:**
  [`malayalam-romanization.csv`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/malayalam/malayalam-romanization.csv)
  (format: `<malayalam-word>,<ISO 15919 romanization>[,weight]`).
  Hand-fixed rows are kept and win over the generator.
- **Improve the method:**
  [`gen_malayalam_romanization.py`](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/malayalam/gen_malayalam_romanization.py).
- **Or just reach out:** open an issue / PR on
  [github.com/chunlaw/wing-font-generator](https://github.com/chunlaw/wing-font-generator),
  or join the **[Telegram group](https://t.me/wingfont)** to talk it
  through. Corrections from people who actually know the language are
  exactly what this needs.
