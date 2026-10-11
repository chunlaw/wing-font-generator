# Hero example — the smallest Wing Font build

Eight Cantonese characters, Jyutping on top, built in well under a second.
Use it as the template when you add a new language.

```sh
pip install ./python          # from the repo root; gives the `wing-font` command
cd python
wing-font -i examples/hero/NotoSansHK-hero-subset.ttf \
          -a examples/hero/NotoSerif-hero-subset.ttf \
          -m mappings/hero-sample.csv \
          -o outputs/WingFontHero -f WingFontHero
```

Output: `outputs/WingFontHero.ttf` and `.woff2`. Type 各有唱自己歌找我 in that font
and every character shows its reading (gok3, jau5, coeng3, …) above it.

`tests/test_hero_example.py` runs this exact build and checks each character is
the base glyph plus exactly the letters of its reading, placed above the base.

## Inputs

| File | What | Licence |
| --- | --- | --- |
| `../../mappings/hero-sample.csv` | `character,reading` — one row per character | MIT (this repo) |
| `NotoSansHK-hero-subset.ttf` | Noto Sans HK, instanced at wght 400 and cut to the 8 characters | SIL OFL 1.1 — `OFL-NotoSansHK.txt` |
| `NotoSerif-hero-subset.ttf` | Noto Serif Regular cut to `a–z 0–9 space` | Apache 2.0 — `Apache-2.0-NotoSerif.txt` |

Both fonts are subsets made with fontTools (see AGENTS.md → "Make a small
fixture font"); the full fonts come from `wing-font fetch`.
