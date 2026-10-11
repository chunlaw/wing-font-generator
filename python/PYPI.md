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

## `wing-font fetch` — when and how

Use it **once, before your first build**, to download ready-made inputs into a
folder. Skip it if you bring your own fonts and CSV.

```sh
wing-font fetch --list                              # what's available
wing-font fetch NAME [NAME ...] [--dest DIR] [--force]
```

- `NAME` ending in `.csv` → a mapping, path relative to
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
wing-font fetch cantonese/canto-lshk.csv --dest mappings

wing-font -i fonts/NotoSansHK-VariableFont_wght.ttf \
          -a "fonts/NotoSans-VariableFont_wdth,wght.ttf" --anno-axis wdth=75 \
          -m mappings/canto-lshk.csv \
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

## Licences

Code: MIT. Fonts you build inherit the licences of the input fonts (SIL OFL
for everything on wing-font-hub). Each mapping CSV keeps its own data licence.
See [LICENSES.md](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSES.md).
