# wing-font

Build OpenType fonts that show each character's pronunciation **above the
character itself** — Cantonese Jyutping, Mandarin Pinyin, Taiwanese Tâi-lô,
Japanese furigana and more. The reading is part of the glyph, so it works in
plain text anywhere a font works (Word, Pages, Canva, browsers). No `<ruby>`
markup.

Pre-built fonts and an in-browser generator: <https://wing-font.chunlaw.io>
· Source: <https://github.com/chunlaw/wing-font-generator>

## Install

```sh
pip install wing-font          # Python 3.10+
```

This gives you the `wing-font` command. The package contains **code only**:
no fonts and no mapping data. You download those once with `wing-font fetch`.

## What you need for one font

| Input | What it is | Where it comes from |
| --- | --- | --- |
| Base font (`-i`) | The font for the characters, e.g. Noto Sans HK | your own `.ttf`, or `wing-font fetch <font file>` |
| Annotation font (`-a`) | The font for the readings, e.g. Noto Sans (Latin) | your own `.ttf`, or `wing-font fetch <font file>` |
| Mapping (`-m`) | CSV of `character,reading`, e.g. `行,hang4` | your own CSV, or `wing-font fetch <path>.csv` |
| DIY annotations (`--diy-annotations`, optional) | CSV of readings a user can type after any character to override the mapping, e.g. `ｚａａ１,zaa1` | your own CSV, or `wing-font fetch <path>.diy-annotation.csv` |

## `wing-font fetch` — when and how

Use it **once, before your first build**, to download ready-made inputs into a
folder. Skip it if you bring your own fonts and CSV.

```sh
wing-font fetch --list                              # what's available
wing-font fetch NAME [NAME ...] [--dest DIR] [--force]
```

- `NAME` ending in `.diy-annotation.csv` → a DIY annotation file, path relative to
  [`python/diy-mappings/`](https://github.com/chunlaw/wing-font-generator/tree/main/python/diy-mappings)
  (`cantonese/lshk.diy-annotation.csv`, `mandarin/zhuyin.diy-annotation.csv`,
  `mandarin/pinyin.diy-annotation.csv`, `taiwanese/sutian.diy-annotation.csv`).
- Any other `NAME` ending in `.csv` → a mapping, path relative to
  [`python/mappings/`](https://github.com/chunlaw/wing-font-generator/tree/main/python/mappings)
  in the repo (e.g. `cantonese/canto-lshk.csv`, `mandarin/mandarin-cn.csv`,
  `taiwanese/taigi-tl-toned.csv`, `japanese/japanese-onkun.csv`).
- Any other `NAME` → a font file from
  [wing-font-hub](https://github.com/chunlaw/wing-font-hub) (all SIL OFL), e.g.
  `NotoSansHK-VariableFont_wght.ttf`, `NotoSerif-Regular.ttf`.
- Files already downloaded are skipped unless you pass `--force`.

## Quick start: Cantonese Jyutping on Noto Sans HK

```sh
wing-font fetch NotoSansHK-VariableFont_wght.ttf "NotoSans-VariableFont_wdth,wght.ttf" --dest fonts
wing-font fetch cantonese/canto-lshk.csv cantonese/lshk.diy-annotation.csv --dest mappings

wing-font -i fonts/NotoSansHK-VariableFont_wght.ttf \
          -a "fonts/NotoSans-VariableFont_wdth,wght.ttf" --anno-axis wdth=75 \
          -m mappings/canto-lshk.csv --diy-annotations mappings/lshk.diy-annotation.csv \
          -o out/NotoSansHK-Jyutping -opt -as 0.39 -bs 0.70 -y 0.70
```

Output: `out/NotoSansHK-Jyutping.ttf` and `.woff2`. Install the `.ttf` and type
Chinese. Polyphonic characters pick their reading from word context (銀行 →
hong4, 行人 → hang4). You can also force a reading by typing its number after
the character (行1, 行2, …).

`wing-font --help` lists every option (scales, offsets, annotation below,
variable-font axes, DIY annotations, …).

## Your own language

A mapping is a UTF-8 CSV, one row per character or word:

```
各,gok3
銀行,ngan4 hong4
```

Pick an annotation font that covers every letter and mark in your readings.
The full format, and how to add a new script, is in the repo:
[CONTRIBUTING-mappings.md](https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/CONTRIBUTING-mappings.md)
and [AGENTS.md](https://github.com/chunlaw/wing-font-generator/blob/main/AGENTS.md).

## From Python

```python
from wingfont.cli import main

main(
    base_font_file="fonts/NotoSansHK-VariableFont_wght.ttf",
    anno_font_file="fonts/NotoSerif-Regular.ttf",
    mapping="mappings/canto-lshk.csv",
    output_prefix="out/NotoSansHK-Jyutping",
)
```

## Name table (Google Fonts-ready by default)

Every build rewrites the provenance records so the output is ready for
Google Fonts onboarding. Upstream copyright lines and designer credits
are kept; pass `--keep-base-names` to leave all of these as the base font
set them.

| Record | Default | Override |
| --- | --- | --- |
| nameID 0 Copyright | `Copyright {year} The Wing Font Project Authors (https://github.com/chunlaw/wing-font-generator)` first, then the base and annotation fonts' notices, one sentence each on a single line | `--copyright-line TEXT` (`{year}` is filled in) |
| nameID 3 Unique ID / OS/2 `achVendID` | vendor `WING` | `--vendor-id XXXX` |
| nameID 6 PostScript name | family without spaces + `-` + style, e.g. `WingSansYueJyutping-Regular` | `--postscript-name` |
| nameID 7 Trademark | none (base font's notice removed) | `--trademark` |
| nameID 8 Manufacturer | `Wing Font` | `--manufacturer` |
| nameID 9 Designer | base designers + `; Wing Font (annotations)` | `--designer` |
| nameID 11 / 12 Vendor / designer URL | `https://wing-font.chunlaw.io` | `--vendor-url`, `--designer-url` |
| nameID 5 Version / head.fontRevision | base version + `; modified by Wing Font <date>` | `--font-version X.YYY` (e.g. `1.000`) |
| nameID 13 / 14 License | SIL OFL 1.1 text and `https://openfontlicense.org` — only when both input fonts are OFL | — |

nameID 10 (Description) gets `Annotations added via Wing Font` appended
regardless. `-opt` always keeps the base font's Latin, punctuation and
U+25CC (dotted circle) so the output covers Google Fonts' Latin Core.

## Licences

Code: MIT. Fonts you build inherit the licences of the input fonts (SIL OFL
for everything on wing-font-hub). Each mapping CSV keeps its own data licence.
See [LICENSES.md](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSES.md).
