# AGENTS.md — working on Wing Font

Wing Font builds OpenType fonts where each glyph carries its own reading
(e.g. Jyutping) above the character, in plain text, no `<ruby>` needed.
Input: a **base font**, an **annotation font**, and a **mapping CSV**
(`character,reading`). Output: `.ttf` + `.woff2`.

## Layout

| Path | What |
| --- | --- |
| `python/wingfont/` | The pip package (`wing-font`). All pipeline code lives here. |
| `python/wingfont/cli.py` | `main(...)` = build API; `run(argv)` = CLI. Four phases, marked `# --- Phase N` in `main()`: 1 compose annotated glyphs → 2 GSUB rules + IVS → 3 subset + scale → 4 save. |
| `python/wingfont/csv_parser.py` | Mapping parser. `WORD_SCRIPTS` is the per-script registry for word-unit bases (Arabic, Thai, …). |
| `python/wingfont/fetch.py` | `wing-font fetch` — fonts from wing-font-hub, CSVs from `python/mappings/`; `--list` shows both. |
| `python/mappings/` | Mapping CSVs (data, not shipped in the wheel). Format: `python/mappings/CONTRIBUTING-mappings.md`. |
| `python/examples/hero/` | Smallest complete build: 8 characters, two tiny fonts, < 1 s. |
| `python/tests/` | pytest suite. `test_hero_example.py` is the end-to-end check. |
| `python/wing-font.py` | Shim so `python wing-font.py …` (CI, `run.sh`, docs) still works. |
| `web/` | React + Vite site; runs the same package in the browser via Pyodide. |
| `.github/workflows/deploy-pages.yml` | The matrix of published fonts (one entry per font). |

## Commands

```sh
pip install -e "./python[test]"            # gives the `wing-font` command
pytest -q python/tests                     # all tests, ~1 s
python python/mappings/validate_mappings.py python/mappings/<file>.csv
python python/init_fonts.py                # all CI input fonts → python/input_fonts/
cd web && yarn install && yarn build       # web: sync-python + tsc + vite
```

## Adding a language or romanization (the usual task)

1. **Start from the hero example.** Run it once (`python/examples/hero/README.md`)
   so you know the build works before changing anything.
2. **Write the mapping** in `python/mappings/<language>/<name>.csv`.
   CJK rows: `銀行,ngan4 hong4` (one space-separated token per character;
   multi-character rows also drive word-context disambiguation). Word-unit
   scripts (Arabic, Thai, Devanagari, …): `word,whole annotation`. With
   several readings, the optional `weight` column decides the default
   (higher wins). Keep a generator script next to it
   (`gen_*.py`) if the CSV is derived from a dictionary, and cite the source
   and its licence in a `*-NOTES.md` or the README.
3. **Validate:** `python python/mappings/validate_mappings.py <csv>`.
4. **Pick fonts** whose glyphs cover both sides: every base character, and
   every character used in the readings (letters, digits, tone marks). Missing
   annotation glyphs are the most common silent failure.
5. **Build a small test font first.** Cut a few rows into a sample CSV, subset
   the fonts (below), and run `wing-font -i … -a … -m … -o outputs/<name>`.
   Then copy `tests/test_hero_example.py` for the new sample: it asserts each
   output glyph = base contours + exactly the reading's letters, above the base.
6. **New base script** (not CJK, not already in `WORD_SCRIPTS`): add a
   `WordScript` entry in `csv_parser.py`, following the comments on the
   existing entries.
7. **Publish** (maintainer's call): add a matrix entry to
   `deploy-pages.yml`; for the web demo add the CSV to `MANIFEST` in
   `web/scripts/sync-python.mjs` *and* `BUILT_IN_MAPPINGS` in
   `web/src/utils/wingfontPresets.ts`.

### Make a small fixture font

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
f = TTFont("input_fonts/NotoSansHK-VariableFont_wght.ttf")
f = instancer.instantiateVariableFont(f, {"wght": 400})   # variable fonts only
s = subset.Subsetter(subset.Options()); s.populate(text="各有唱"); s.subset(f)
f.save("my-subset.ttf")
```

Only redistribute OFL / Apache fonts, keep their licence text next to them,
and don't reuse a Reserved Font Name for a modified font.

## Rules that are easy to break

- **Readings are baked into the base glyphs** (one composite glyph per
  character+reading), not added as separate marks. This is deliberate: it
  keeps per-reading IVS working. Don't refactor toward mark attachment.
- **GSUB lookups go under `ccmp`, not `calt`/`liga`.** Apple iWork drops
  `calt`/`liga` on CJK runs. Reasons are documented in
  `chain_context_handler.py` and `liga_handler.py`.
- **No colour in annotations.** Reading corrections go through
  `--diy-annotations` and the mapping CSVs.
- **CLI and web must stay identical.** `uharfbuzz==0.55.0` in
  `pyproject.toml`/`requirements.txt` must match the Pyodide wheel in
  `python/wheels/`. A new module in `wingfont/` must also be added to
  `MANIFEST` in `web/scripts/sync-python.mjs`, or the web demo can't import it.
- **`wingfont/__init__.py` stays import-free.** The Pyodide runner times its
  own lazy imports.
- **Imports inside `wingfont/` are relative** (`from .utils import …`).
- Input fonts and mapping CSVs are **not** in the wheel; `wing-font fetch`
  downloads them. Each mapping keeps its own data licence (see `LICENSES.md`).

## Deeper reading

- `python/README.md` — CLI flags, GSUB architecture, word-unit pipeline.
- `python/HYBRID_ANNOTATION_DESIGN.md` — `--diy-annotations` design.
- `python/mappings/CONTRIBUTING-mappings.md` — mapping columns, provenance, scale limits.
- `web/README.md` — Pyodide worker and sync step.
