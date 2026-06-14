# arabic-romanization.csv — Arabic vocabulary → DIN 31635

A wing-font **word-unit** mapping (`arabic` script in
`csv_parser.WORD_SCRIPTS`): each Arabic word becomes one composed
glyph annotated with its DIN 31635 romanization stacked above.

```
<arabic-word>,<DIN 31635 romanization>[,weight]
السلام,as-salām,9000000
كتاب,kitāb,8000000
مدرسة,madrasa,8000000
```

## Romanization schema

**DIN 31635** — the international academic standard for Arabic
transliteration, used in scholarly publishing and most modern
Arabic-as-foreign-language dictionaries (Hans Wehr, Lane,
Wright). Distinguishing features:

| Arabic letter | DIN 31635 | Notes |
|---|---|---|
| ث | ṯ | not "th" — DIN uses the single-character form with macron-below |
| ج | j | (or ǧ in some DIN variants; this CSV uses j for typeability) |
| ح | ḥ | dot-under voiceless pharyngeal |
| خ | ḫ | not "kh" — DIN uses single-char ḫ with bar-below |
| ذ | ḏ | not "dh" — DIN uses single-char ḏ |
| ش | š | not "sh" — DIN uses haček |
| ص | ṣ | dot-under emphatic s |
| ض | ḍ | dot-under emphatic d |
| ط | ṭ | dot-under emphatic t |
| ظ | ẓ | dot-under emphatic z (or ḏ̣ in strict DIN) |
| ع | ʿ | "modifier letter left half ring" (U+02BF) |
| غ | ġ | dot-above (or ǵ in some variants) |
| ق | q | distinct from k |
| ʾ | ʾ | hamza — "modifier letter right half ring" (U+02BE) |

Long vowels use macrons: **ā**, **ī**, **ū**. Short vowels are
unmarked or use bare a/i/u. The definite article **ال** assimilates
to sun letters (ت ث د ذ ر ز س ش ص ض ط ظ ل ن): الشمس → *aš-šams*
not *al-šams*.

## Why DIN 31635 over ALA-LC

DIN's single-character forms (ḫ, ġ, ṯ, š) keep the romanization
tight visually next to the original Arabic word — important when
the Latin row is stacked above the Arabic inside a single composed
glyph. ALA-LC's digraphs (kh, gh, th, sh) take more horizontal
space and visually crowd the annotation.

Both standards are mutually convertible by a one-shot regex; if
you prefer ALA-LC for downstream use, run a substitution pass on
the romanization column.

## Sources

This CSV is **hand-curated as a starter set** (~130 high-frequency
common Arabic words: greetings, body parts, family, food, time
expressions, colors, common adjectives, numbers 1-10 +
hundreds/thousands, pronouns, question words, common nouns).

For larger coverage, use the generator script
[`gen_arabic_romanization.py`](gen_arabic_romanization.py) with
one of two source pathways:

### Pathway A: kaikki.org Wiktionary extracts

```sh
# Download (CC-BY-SA from Wiktionary):
curl -L https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.json \
  -o /tmp/arabic-wiktionary.json

# Generate CSV (caps at 5000 entries by default; adjust with --max):
python gen_arabic_romanization.py --kaikki /tmp/arabic-wiktionary.json
```

Filters Wiktionary entries that have a `roman` field in their
sounds array. Weight is derived from the Wiktionary sense count
(more polysemous words score higher — proxies for commonness).

### Pathway B: CAMeL Tools + frequency list

```sh
pip install camel-tools

# Get an Arabic frequency list. Reasonable options:
#   * Open Subtitles 2018 Arabic: https://github.com/hermitdave/FrequencyWords
#   * Hindawi Arabic corpus
#   * Arabic Gigaword (LDC; license-restricted)
# Format: one word per line, optionally `word\tfrequency`.

python gen_arabic_romanization.py --frequency-list /tmp/arabic-freq.txt
```

CAMeL Tools' morphological analyzer vocalizes each word (predicting
unwritten short vowels from context), then the script applies the
DIN 31635 mapping deterministically. Falls back to bare letter-level
transliteration if CAMeL Tools isn't installed — the resulting
romanizations are slightly less accurate (no vocalization) but
still usable for a first build.

## Pipeline integration

The CI matrix builds this CSV against **Noto Sans Arabic** (Naskh
style, the standard general-purpose MSA body-text font, OFL):

```yaml
- { name: NotoSansArabic-Noto-romanization, args: "-opt -i 'input_fonts/NotoSansArabic-VariableFont_wdth,wght.ttf' -a input_fonts/NotoSerif-Regular.ttf -m mappings/arabic-romanization.csv -as 0.25" }
```

The word-unit pipeline (see `word_liga_handler.py`) handles:

* **Cursive shaping** — composes each word's letters in their
  correct positional forms (initial / medial / final / isolated)
  before glyph composition, so the resulting single annotated
  glyph still LOOKS like Arabic.
* **Boundary-guarded ligation** — only fires when the matched word
  is preceded and followed by non-Arabic context (whitespace,
  punctuation, end-of-string). Prevents accidental matches inside
  a larger Arabic word.
* **Variant override via trailing tatweel** — `word + ـ + digit`
  cycles through alternate readings (ـ is U+0640 KASHIDA, trivially
  typeable on Arabic keyboards and visually self-erasing once the
  ligature fires).

## Coverage scope

This first cut covers ~130 common conversational and lexical
words. Realistically usable for:

* **Demos and showcase** — proves the pipeline produces a working
  font.
* **Common-phrase decoration** — greetings, family, basic nouns.
* **Arabic learners** — sees romanization for words they're
  starting to recognize visually.

Not yet usable for:

* **Reading a newspaper** — would need ~5,000+ word coverage and
  proper morphological vocalization for grammatical case endings,
  verb conjugations, and plural forms.
* **Quranic or Classical Arabic** — would need different
  vocalization conventions (full ḥarakāt marking) and probably a
  different romanization standard.

Expansion is via the generator script above. Aim for 3,000-5,000
words in the next pass (covers ~85% of modern written Arabic by
frequency).

## Acknowledgements

* **DIN 31635** standard — public German national standard,
  formally specified in DIN 31635:2011-07.
* **Hans Wehr Dictionary** — reference for traditional spellings
  of common idioms (السلام عليكم, etc.) used in the hand-curated
  set.
* **CAMeL Tools** (NYU Abu Dhabi) — MIT-licensed Arabic NLP
  toolkit used by the generator script's Pathway B.
* **Kaikki.org** — pre-extracted Wiktionary data (CC-BY-SA)
  consumed by Pathway A.
