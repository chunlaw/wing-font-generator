<h1 align="center">Wing Font</h1>

<p align="center">
  <em>Bake pronunciation annotations directly into Chinese fonts — Cantonese Jyutping, Mandarin Pinyin, Taiwanese Tâi-lô, and more — so they render in plain text anywhere a custom font goes.</em>
</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy to GitHub Pages](https://github.com/chunlaw/wing-font-generator/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/chunlaw/wing-font-generator/actions/workflows/deploy-pages.yml)
[![Demo Build](https://github.com/chunlaw/wing-font-generator/actions/workflows/build-demo.yml/badge.svg)](https://github.com/chunlaw/wing-font-generator/actions/workflows/build-demo.yml)
[![Live site](https://img.shields.io/badge/site-wing--font.chunlaw.io-1f7a8c.svg)](https://wing-font.chunlaw.io)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/chunlaw?label=Sponsor&logo=github)](https://github.com/sponsors/chunlaw)

</div>

[Wing Font](https://wing-font.chunlaw.io) generates OpenType fonts whose glyphs **carry their own romanization above them**. Type 行 and `hang4` appears above it; type 銀行 and the same character renders with `hong4` because the word-context disambiguation rides on OpenType `ccmp`. No HTML `<ruby>` markup, no separate text layers, no special apps — Word, Pages, Canva, Adobe Creative Cloud, Chrome / Firefox / Safari all just work.

The pipeline is a small Python program that adds GSUB rules to a base CJK font. The same code runs in the browser via Pyodide, so non-developers can compose their own variants without installing anything.

## Documentation

The [live site](https://wing-font.chunlaw.io) hosts the showcase, the in-browser generator, and per-platform install instructions for non-developers.

For development docs:

- **[`python/README.md`](python/README.md)** — CLI reference, GSUB pipeline architecture, mapping data sources, local test rig.
- **[`web/README.md`](web/README.md)** — React + Vite app, Pyodide worker, sync-python script, deployment notes.

## Pre-built fonts

CI builds the font set on every push and publishes it across two surfaces — WOFF2 lives on the Pages site (used by the in-page previews), TTF lives in rolling GitHub Releases (heavier file, off-loaded so the Pages bandwidth budget covers visitor traffic). Browse and download from the [showcase page](https://wing-font.chunlaw.io/showcase), or use a direct URL like:

```
https://wing-font.chunlaw.io/fonts/NotoSansHK-Noto-lshk.woff2
https://github.com/chunlaw/wing-font-generator/releases/latest/download/NotoSansTC-Huninn-tailo.ttf
```

The `releases/latest/download/` redirect always tracks the most recent `build-<sha>` release; CI keeps the 3 most recent releases for rollback headroom and prunes older ones, so the TTF URL is stable but the bytes are not guaranteed to be byte-identical across deploys (this is a generator, not a versioned font archive).

Coverage spans:

- **Cantonese (廣東話)** — LSHK Jyutping, Yale, Cangjie, Lau, Guangdong, Chishima; cross-romanization into Katakana / Hangul / Thai script.
- **Taiwanese / Southern Min (台語 / 河洛話)** — Tâi-lô, POJ, Bopomofo (TPS), Taiwanese Kana.
- **Teochew / Min Nan (潮州話)** — Peng'im (GDPI), Pe̍h-ūe-jī.
- **Mandarin (普通話 / 國語)** — Hanyu Pinyin with phrase-level disambiguation across the full CJK Unified Ideograph range.

Pairings include ChironSung HK, ChironHei HK, Noto Sans HK / TC / SC, Source Han Serif, Xiaolai, and others. See [Acknowledgements](#acknowledgements) for upstream data + font sources.

## Quick start

### Web (no install needed)

Visit [wing-font.chunlaw.io/generate](https://wing-font.chunlaw.io/generate), pick a base font + annotation font + mapping CSV (or upload your own), click Generate, and download the resulting `.woff` / `.ttf`. First generation takes ~10-15 s for Pyodide to boot; subsequent runs are warm.

### CLI

```sh
cd python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python wing-font.py \
  -i input_fonts/ChironSungHK-R.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/canto-lshk.csv \
  -o ChironSungHK-Noto-lshk \
  -opt -as 0.13
```

Input fonts aren't tracked in this repo — [`python/init_fonts.py`](python/init_fonts.py) fetches them from the [wing-font-hub](https://github.com/chunlaw/wing-font-hub) CDN. See [`python/README.md`](python/README.md) for the full CLI reference and pipeline walkthrough.

> **Pairing tall annotations** (Urdu Nastaliq, Thai with vowel + tone, Hangul jamo) with a low-ascent base font (e.g. Xiaolai at 880u): pass `--out-ascent` so apps that strictly clip at `winAscent` (Word, Pages, Keynote, Canva) don't truncate the top of the tallest glyphs. Suggested values: `1200` for Thai / Katakana / Korean on Xiaolai, `1300` for Urdu. The same lever is exposed in the in-browser pipeline at `/generate` → Step 3 → Advanced → "Output ascent" — handy for visually dialling in a value before committing to a CLI invocation.

### Web dev

```sh
cd web
yarn install
yarn dev
```

`yarn dev` first runs `scripts/sync-python.mjs` to copy the Python sources from `../python/` into `web/public/wingfont/`, then starts Vite.

## Repository layout

```
wing-font-generator/
├── python/        # Source of truth — font-generation pipeline (CLI + library)
├── web/           # React + Vite app that runs the pipeline in-browser via Pyodide
└── .github/workflows/
    ├── deploy-pages.yml   # Matrix builds 59 fonts + web app, publishes to gh-pages
    └── build-demo.yml     # Validation-only web build on pushes
```

`python/` is the single source of truth. The Python files under `web/public/wingfont/` are **generated** by `web/scripts/sync-python.mjs` on every web build — don't edit them directly.

A sibling repo, [`chunlaw/wing-font-hub`](https://github.com/chunlaw/wing-font-hub), hosts the source `.ttf` files used as input by the pipeline (Noto Sans HK, ChironSung HK, Huninn, Source Han Serif, etc.). Keeping them out of this repo keeps clones lightweight and avoids LFS quota concerns.

## Examples

- **[Showcase](https://wing-font.chunlaw.io/showcase)** — every pre-built font with a rotating sample of dialect-appropriate lyrics, plus direct `.ttf` / `.woff2` download buttons. Shareable URLs via `?fonts=` query string.
- **[Specimen pages](https://wing-font.chunlaw.io/specimen/NotoSansHK-Noto-lshk)** — single-font large-size preview with a custom-text field.
- **[Generate](https://wing-font.chunlaw.io/generate)** — the 5-step in-browser pipeline (fonts → mappings → parameters → generate → download + CSS snippet).

## Contributing

Wing Font is never finished. Three areas where help has the highest impact:

- **Code** — bug reports, fixes, and improvements via [GitHub issues](https://github.com/chunlaw/wing-font-generator/issues) and pull requests.
- **Design** — annotation placement, font choices, proportions. Conversations happen in the [Telegram group](https://t.me/wingfont).
- **Data** — additional dialect mappings, or improvements to default readings for polyphonic characters. Telegram group is the right place to start.

The [About page](https://wing-font.chunlaw.io/about) on the live site explains each contribution area in more detail.

## Changelog

Notable changes ship via [GitHub Releases](https://github.com/chunlaw/wing-font-generator/releases) and the commit history on `main`.

## License

This project is licensed under the terms of the **MIT license** — see [`LICENSE`](LICENSE).

Input fonts and mapping data carry their own licenses (the fonts are mostly **SIL OFL 1.1**). See [`LICENSES.md`](LICENSES.md) and the [Acknowledgements page](https://wing-font.chunlaw.io/credits) for per-font and per-dataset attribution.

## Acknowledgements

Wing Font stands on the shoulders of excellent open-source data and fonts. Full credits live at <https://wing-font.chunlaw.io/credits>; the headline contributions:

### Fonts

- [Noto Sans HK / TC / SC / JP / KR](https://fonts.google.com/noto) — Google
- [ChironSung HK / ChironHei HK](https://github.com/chiron-fonts) — chiron-fonts
- [Huninn (jf-openhuninn)](https://github.com/justfont/open-huninn-font) — justfont
- [Source Han Serif](https://github.com/adobe-fonts/source-han-serif) — Adobe
- [Xiaolai SC](https://github.com/lxgw/Xiaolai-Sansserif) — lxgw
- [Noto Serif](https://fonts.google.com/noto/specimen/Noto+Serif) — Google
- [M PLUS 1m / Rounded 1c](https://github.com/coz-m/mplus_outline_fonts) — Coji Morishita
- [Google Sans Thai](https://github.com/itfoundry/google-sans-thai) — Cadson Demak / IT Foundry

### Romanization data

- **Cantonese** — [TypeDuck](https://github.com/TypeDuck-HK/TypeDuck-Mac), [粵語審音配詞字庫 (CUHK)](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/), [Cantonese Romanization Converter (Kodensha)](https://www.kodensha.jp/webapp/cantonese/can_converter_e.html)
- **Taiwanese / Southern Min** — MOE [《臺灣台語常用詞辭典》](https://sutian.moe.edu.tw/) via [ChhoeTaigi](https://github.com/ChhoeTaigi/ChhoeTaigiDatabase); ButTaiwan's [taigivs](https://github.com/ButTaiwan/taigivs)
- **Teochew** — [learn-teochew](https://github.com/learn-teochew/learn-teochew.github.io), [parsetc](https://github.com/learn-teochew/parsetc)
- **Mandarin** — mozillazg's [pinyin-data](https://github.com/mozillazg/pinyin-data) + [phrase-pinyin-data](https://github.com/mozillazg/phrase-pinyin-data); [Unicode Han Database (Unihan)](https://www.unicode.org/charts/unihan.html)

## Contact

[Instagram](https://instagram.com/wingfont) · [Telegram](https://t.me/wingfont) · [Sponsor on GitHub](https://github.com/sponsors/chunlaw)
