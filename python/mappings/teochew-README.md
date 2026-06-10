# Teochew (潮州話) mapping files

`teochew-*.csv` map Chinese characters and words to Teochew romanization, in
the same `base_chars,space_separated_syllables[,weight]` format as the
Cantonese (`canto-*.csv`) and Taiwanese (`taigi-*.csv`) mappings. They drive
the **潮州話 showcase fonts** (`NotoSansTC-Huninn-teochew-pengim` /
`-puj`, built in `.github/workflows/build-fonts.yml`) and are surfaced as
Step-2 presets in the in-browser `/generate` flow.

## Schemes

| File | Scheme | Tones | Showcased |
| --- | --- | --- | --- |
| `teochew-gdpi.csv`   | Geng'dang Pêng'im 廣東拼音 (Peng'im) | numeric | ✅ primary (`-pengim`) |
| `teochew-duffus.csv` | Duffus / Pe̍h-ūe-jī (PUJ)            | diacritic | ✅ historical (`-puj`) |
| `teochew-tlo.csv`    | Tie-lo / Tie-tsiann-hue 潮羅         | diacritic | /generate only |
| `teochew-ggnn.csv`   | Gaginang Peng'im 家己儂拼音 (coda -n) | numeric | /generate only |
| `teochew-dieghv.csv` | Dieghv 潮語                          | numeric | /generate only |
| `teochew-sinwz.csv`  | Teochew Sinwenz 新文字               | (latin) | /generate only |

Each file has ≈12,600 rows: ≈5,080 single-character readings (≈3,300 distinct
characters) plus ≈7,530 multi-character word readings. The diacritic schemes
(`tlo`, `duffus`) require the Huninn annotation font, which carries every
combining mark used (incl. U+0303 tilde, U+0307 dot-above, U+0324
diaeresis-below) plus the nasal ⁿ (U+207F).

## Provenance

1. **Readings** come from
   [learn-teochew/learn-teochew.github.io](https://github.com/learn-teochew/learn-teochew.github.io)
   `assets/scripts/teochew_scrape.json` — a Wiktionary-derived dictionary whose
   `mn-t` field gives Geng'dang Pêng'im readings, already segmented into
   per-character syllables for multi-character words.
2. **Scheme conversion** is done with
   [learn-teochew/parsetc](https://github.com/learn-teochew/parsetc), which
   parses each gdpi syllable and re-emits it in every other scheme.

Only readings whose syllable count matches the character count and that parse
cleanly as gdpi were kept. For polyphonic characters/words the reading listed
first in the source (usually the primary/vernacular reading) is given the
highest **weight**, so `csv_parser.load_mapping` selects it as the font default
(e.g. `行 → gian5`, not literary `hêng5`).

The `tc-bibles` and `tc-songbooks` repos are romanization-only / catalog
corpora with no aligned characters, so they were not used as a reading source.

## Regenerating

```sh
pip install parsetc
python teochew_generate.py --scrape /path/to/teochew_scrape.json --outdir .
```

`teochew_generate.py` reads `teochew_scrape.json` and uses `parsetc` to emit
all six CSVs. To add a scheme, extend `OUT_SCHEMES` in that script, rerun, then
add matching entries to `web/scripts/sync-python.mjs` (MANIFEST),
`web/src/utils/wingfontPresets.ts` (BUILT_IN_MAPPINGS) and — if showcasing a
built font — `build-fonts.yml` and `web/src/utils/const.ts` (AVAILABLE_FONTS).
