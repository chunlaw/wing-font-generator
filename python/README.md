# Wing Font Generator

Generate OpenType fonts that show **pronunciation annotations stacked above
Chinese characters** in plain text — no HTML `<ruby>` markup, no separate
text layers, no special apps. Type the character, the romanization shows up.

Live examples (Cantonese in LSHK / Yale / Chishima / 劉錫祥 schemes, plus
Cangjie input codes) at <https://wing-fonts.chunlaw.io/>.

This directory is the **Python pipeline** that produces those fonts. The
sibling [`../web/`](../web/) directory hosts the React + Vite site that
exposes the same pipeline in the browser via Pyodide, so anyone can
generate their own font without installing Python.

---

## How it works in one paragraph

Each annotated glyph (e.g. `行` with `hang4` above it) is **a single
TrueType glyph** drawn by [`build_glyph.py`](build_glyph.py): the base
character outline is scaled down and placed at the bottom, the romanization
glyphs are scaled smaller and laid out above it. Because the annotation is
inside the glyph itself, it survives copy-paste into a `<textarea>`, a Word
doc, an email — anywhere plain text goes. Polyphonic characters are
disambiguated through two OpenType GSUB layers: `ccmp` (Glyph
Composition / Decomposition) automatically picks the right reading when
the character appears in a known word (e.g. `銀行` → `行/hong4`,
`行人` → `行/hang4`), and `liga` (Ligature Substitution) lets the user
manually pick a variant by typing `字1` / `字2` / … or the IME-friendly
`字丅一` / `字丅二` fallback. (We use `ccmp` for the chain-context
rules rather than `calt` because Apple's iWork typesetter — Pages,
Keynote, Numbers — silently suppresses `calt` on CJK text runs. See the
`chain_context_handler.py` deep-dive below.)

---

## Layout (this directory only)

```
python/
├── wing-font.py                # CLI entry point — argparse + main()
├── runner.py                   # Pyodide wrapper (called from the web app)
├── build_glyph.py              # Pen-based glyph composition (base + anno)
├── chain_context_handler.py    # Builds the `ccmp` GSUB rules
├── liga_handler.py             # Builds the `liga` GSUB rules
├── utils.py                    # cmap lookup + GSUB feature registration helper
├── mappings/                   # CSVs that map char → romanization (+csv_parser)
├── input_fonts/                # Source TTFs (Chiron, NotoSerif, NotoSansTC, …)
├── tests/                      # Local test rig — small font + HTML viewer
├── requirements.txt            # Pinned: fontTools, Brotli, unicodedata2
└── README.md
```

The five hand-written modules at the top are the core. Everything else is
data, tooling, or tests. `runner.py` is only invoked from the in-browser
pipeline (it imports `wingfont_main`, which is the sync-renamed name for
`wing-font.py` — see [`../web/scripts/sync-python.mjs`](../web/scripts/sync-python.mjs)).

---

## Installation

Python 3.10+ (3.13 tested). Create a venv and install pinned dependencies:

```sh
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

If you're modifying GSUB code you may also want `uharfbuzz` to verify
shaping locally:

```sh
pip install uharfbuzz
```

---

## Quick start

Generate one font from a Cantonese-LSHK mapping:

```sh
python wing-font.py \
  -i input_fonts/ChironSungHK-R.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/canto-lshk.csv \
  -o ChironSungHK-Noto-lshk \
  -opt -as 0.13
```

This writes `ChironSungHK-Noto-lshk.ttf` and `ChironSungHK-Noto-lshk.woff`
to the working directory. Drop the WOFF into a page with
`@font-face { font-family: …; src: url('…') }` and any Chinese text using
mapped characters will render with romanization stacked above.

### Full CLI

| Flag | Long form | Default | Meaning |
| --- | --- | --- | --- |
| `-i` | `--base-font-file` | required | TTF whose glyphs become the bottom of each annotated glyph |
| `-a` | `--anno-font-file` | required | TTF supplying the romanization letterforms |
| `-o` | `--output-prefix` | required | Output basename; `.ttf` and `.woff` are appended |
| `-m` | `--mapping` | required | CSV mapping characters/words to romanizations |
| `-f` | `--family-name` | source name | Overwrites `name` table family entries |
| `-bs` | `--base-scale` | `0.75` | How much to shrink the base character (vertical room for anno) |
| `-as` | `--anno-scale` | `0.15` | How much to shrink the annotation glyphs |
| `-y` | `--upper_y_offset_ratio` | `0.8` | Where to put the annotation (fraction of em) |
| `-v` | `--invert` | off | Swap positions: annotation below, base above |
| `-opt` | `--optimize` | off | Subset the output to just glyphs we actually use (drops it from ~30 MB to ~200–500 KB per font) |

---

## Testing

A local test rig lives in [`tests/`](tests/):

```sh
python tests/serve.py
```

This regenerates a tiny test font from
[`tests/test_mapping.csv`](tests/test_mapping.csv) and serves
[`tests/viewer.html`](tests/viewer.html) on
<http://127.0.0.1:8765/viewer.html>. The viewer renders four panels —
default reading, word context (`ccmp`), digit trigger (`liga`), and the
丅 fallback — each comparing the system font (left) against the
generated font (right). Visual differences prove the GSUB rules fired.

See [`tests/README.md`](tests/README.md) for the per-panel pass/fail
guide and the JSON report schema written to `tests/output/report.json`.

---

## Adding a new mapping

The mapping format is a UTF-8 CSV:

```
單字,單注音[,權重]
詞組,注音1 注音2[ 注音3 …][,權重]
```

The third column is an optional integer weight that biases the
`csv_parser.py` sort order so common readings appear as variant 0
(default). Lines whose `len(base_chars) > MAX_base_chars` (default 7)
are skipped — long phrases would blow up the GSUB rule count without
adding much value.

To wire a new mapping into the production batch build, add a line to
[`.github/workflows/build-fonts.yml`](../.github/workflows/build-fonts.yml)
modelled on the existing entries, then push.

---

## CI / batch build

[`.github/workflows/build-fonts.yml`](../.github/workflows/build-fonts.yml)
runs on every push: it sets up Python 3.12, installs
`requirements.txt`, then invokes `wing-font.py` once per output font
(Hei + Sung × LSHK / Yale / Chishima / Guangdong / 劉錫祥 + Cangjie,
regular and italic, with and without inversion). The resulting `.ttf`
and `.woff` files are pushed to the `gh-pages` branch, which is what
<https://wing-fonts.chunlaw.io/> serves.

---

## Architecture deep-dive

### `build_glyph.py` — glyph composition

For every entry in `char_mapping` (char → {annotation: (target_glyph_name,
variant_index)}), opens a `TTGlyphPen`, draws the base character through
a `TransformPen` (scale + Y offset), then draws each annotation character
through another `TransformPen` (smaller scale + X offset to center +
upper Y offset). The first variant reuses the original glyph name; later
variants get freshly minted `wingfontNNNNNN` names that go straight into
the output font's `glyf` table.

Un-annotated glyphs (most of the font) are scaled down with the same
`base_scale` so the whole font is visually consistent.

### `chain_context_handler.py` — `ccmp` builder (was `calt`)

Uses `fontTools.otlLib.builder.ChainContextSubstBuilder` to build a
Chain Contextual Substitution lookup. For each multi-character word in
the mapping, emits a rule that says "when these glyphs appear in this
order, run lookup *N* at position *i* to swap to the right variant."
The subordinate lookups are `SingleSubstBuilder`s, one per variant
slot (0..9), populated as a side effect of walking the words.

The lookup is **appended** to the font's existing GSUB
(`gsub.LookupList.Lookup.append(...)`) so the source font's 80+ existing
lookups (`vert`, `vrt2`, `locl`, `ss01..ss20`, the source's own `calt`)
all survive. Then `utils.register_feature_lookup` wires the new lookup
into the `ccmp` `FeatureRecord` on every script/langsys.

**Why `ccmp` and not `calt`?** This used to be a `calt` (Contextual
Alternates) lookup, which is what the OT spec was written for. It
works in browsers (HarfBuzz) and TextEdit (CoreText via Cocoa text).
But Apple's iWork typesetter — Pages, Keynote, Numbers — silently
suppresses `calt` on CJK text runs even when the user has "Contextual
Alternates" toggled on; PDF export from those apps also embeds the
unsubstituted glyphs. Tagging the run as Traditional Chinese in Pages
didn't help, ruling out a language-system selection problem. `ccmp`
(Glyph Composition/Decomposition) is required-by-spec — shapers MUST
apply it and there's no user-facing toggle — so the rules now land
under `ccmp` and apply universally. Lookup body is identical; only the
feature tag changed. Trade-off: users can no longer disable the
annotations via an app's "Contextual Alternates" toggle. See the
docstring in `chain_context_handler.py` for the full rationale.

A defensive `add_subtable_break()` is inserted every 50 rules so no
single subtable approaches the OpenType 64 KB offset limit — fontTools'
own auto-splitter has bugs (`AttributeError` on
`OTTableWriter.repeatIndex`, `UnboundLocalError` on `newLen`) that this
sidesteps.

### `liga_handler.py` — `liga` builder

Uses `LigatureSubstBuilder` to emit two kinds of rules per polyphonic
character:

* `(any_variant, '0')` → default reading, `(any_variant, 'N')` → variant N.
* `(any_variant, '丅', '零/一/二/…')` → same mapping via the
  IME-friendly trigger.

Same `add_subtable_break()` chunking as the chain handler, with the
slight wrinkle that `LigatureSubstBuilder` keys its sentinel by
`(SUBTABLE_BREAK_, location)` so we pass a monotonically-increasing
counter to avoid dict-key collisions that would silently drop all
breaks after the first.

### `utils.register_feature_lookup`

Tiny helper that exists because the chain and liga handlers used to
duplicate ~40 lines each of script/langsys walking. Now both just call
`register_feature_lookup(gsub, 'ccmp', lookup_index)` (or `'liga'`).
The helper also force-creates `hani` / `latn` / `kana` / `hang` /
`bopo` script records if missing, so CoreText finds the feature under
whichever script tag it picks for the text run.

### Subsetting

`wing-font.py` calls `fontTools.subset.Subsetter` with an explicit keep
list: the variant glyphs (`wingfontNNNNNN`), digits 0–9, ASCII
letters/punctuation, common CJK punctuation, **plus 丅 and 零一二三四五六七八九**
(those last 11 are easy to forget — without them the 丅+numeral
fallback silently breaks even though the rules exist in GSUB).
Subsetter trims the source font from ~30 MB down to ~200–500 KB per
output.

---

## Why not use `feaLib`?

`feaLib`'s `addOpenTypeFeatures` (the standard "compile a `.fea` file
into a font" path) **replaces** any existing `GSUB` table:

> *Note that this replaces any features currently present.*  
> — `fontTools.feaLib.builder.addOpenTypeFeatures` docstring

Our source fonts (Chiron, NotoSerif) have 80+ carefully-built lookups
across 36 features that we want to keep. So we use `otlLib.builder`
directly — same high-level abstraction (`ChainContextSubstBuilder`,
`LigatureSubstBuilder`, `SingleSubstBuilder`) but additive: it gives us
`Lookup` objects we can append to the existing `LookupList`. The cost
is having to wire `lookup_index` ourselves and call
`register_feature_lookup` to plumb features into all scripts/langsyses.

---

## Related

* **[`../web/`](../web/)** — the React + Vite site in this same repo.
  It bundles this pipeline into a Web Worker via Pyodide so anyone can
  generate a font in their browser with no Python install. Same Python
  sources (the `web/scripts/sync-python.mjs` step copies the files in
  this directory into `web/public/wingfont/` at build time).
* **[wing-fonts.chunlaw.io](https://wing-fonts.chunlaw.io/)** — the
  output of the CI workflow, served as a font CDN.

---

## Further reading

* **Know the differences between Jyutping and Yale** — a short visual
  primer by lingtsi_linguistics:
  <https://www.instagram.com/p/DS0_iMdD-9G/>.

## Mapping sources

1. [Typeduck-HK](https://github.com/TypeDuck-HK/TypeDuck-Mac/blob/master/Preparing/Sources/Preparing/Resources/data.csv)
2. [粵語審音配詞字庫](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/)
3. [Cantonese Romanization Converter](https://www.kodensha.jp/webapp/cantonese/can_converter_e.html)

---

## Contact

[Instagram](https://instagram.com/wingfont) · [Telegram](https://t.me/wingfont) · [Sponsor on GitHub](https://github.com/sponsors/chunlaw)

## License

MIT — see [`LICENSE`](../LICENSE).
