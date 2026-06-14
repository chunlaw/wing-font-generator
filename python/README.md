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
disambiguated through two layers of OpenType GSUB rules, both registered
under the `ccmp` (Glyph Composition / Decomposition) feature: chain-context
substitution picks the right reading when the character appears in a known
word (e.g. `銀行` → `行/hong4`, `行人` → `行/hang4`), and ligature
substitution lets the user manually pick a variant by typing `字1` / `字2`
/ … or the IME-friendly `字丅一` / `字丅二` fallback. The lookup _types_
differ (Type 6 ChainContextSubst vs Type 4 LigatureSubst), but the feature
_tag_ is the same — `ccmp`, not `calt` or `liga`. We pick `ccmp` because
it's required-by-spec (every shaper applies it, no user toggle) and because
Apple's iWork typesetter — Pages, Keynote, Numbers — silently suppresses
`calt` and `liga` on CJK text runs. See the `chain_context_handler.py` and
`liga_handler.py` deep-dives below.

A third path lives outside GSUB entirely: `ivs_handler.py` writes a cmap
format-14 (Unicode Variation Sequences) subtable, so users on VS-capable
IMEs can pick a variant by typing `<base> + <VS17+N>` (e.g.
`行 + U+E0100` → variant 1). IVS is zero-width and universally supported
across shapers, but the chosen variant becomes invisible without the font
installed; we ship it as a supplement to the human-readable ligature
paths, not a replacement. See the `ivs_handler.py` deep-dive below.

---

## Layout (this directory only)

```
python/
├── wing-font.py                # CLI entry point — argparse + main()
├── runner.py                   # Pyodide wrapper (called from the web app)
├── build_glyph.py              # Pen-based glyph composition (base + anno)
├── chain_context_handler.py    # Builds the `ccmp` GSUB rules
├── liga_handler.py             # Builds the `ccmp` ligature-substitution rules
├── word_liga_handler.py        # Arabic/Thai word-unit GSUB (ligation w/
│                               #   per-script guards + variant override,
│                               #   GDEF lig carets)
├── ivs_handler.py              # Builds the cmap format-14 IVS supplement
├── utils.py                    # cmap lookup + GSUB feature registration helper
├── mappings/                   # CSVs that map char → romanization (+csv_parser)
├── input_fonts/                # Source TTFs (Chiron, NotoSerif, NotoSansTC, …)
│                               #   — populated by `python init_fonts.py`
├── init_fonts.py               # Fetch source TTFs from the input-fonts CDN
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

First, fetch the input TTFs into `input_fonts/`. They live in a
separate gh-pages-served repo (default
`https://chunlaw.github.io/wing-font-inputs`) so this repo's clone
stays small:

```sh
python init_fonts.py
```

Idempotent: TTFs already present at the expected size are skipped.
Re-run after pulling changes that bump the `FONT_FILES` list inside
the script.

Then generate one font from a Cantonese-LSHK mapping:

```sh
python wing-font.py \
  -i input_fonts/ChironSungHK-R.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/cantonese/canto-lshk.csv \
  -o ChironSungHK-Noto-lshk \
  -opt -as 0.27
```

This writes `ChironSungHK-Noto-lshk.ttf` and `ChironSungHK-Noto-lshk.woff2`
to the working directory. Drop the WOFF2 into a page with
`@font-face { font-family: …; src: url('…') format('woff2') }` and any
Chinese text using mapped characters will render with romanization
stacked above.

### Tall annotations on low-ascent bases — use `--out-ascent`

When the base font has a low native ascent (e.g. Xiaolai at 880u — vs.
NotoSansHK's 1160u) and the annotation cascades far above the base
character (Urdu Nastaliq's zabar/kasra stack, Thai vowel + tone marks,
Hangul jamo), the same `-as` value that's fine on NotoSansHK can push
the top of the annotation past Xiaolai's `winAscent` line. Browsers
will overflow gracefully, but apps that strictly clip at `winAscent`
(Word, Pages, Keynote, Canva) silently truncate the tallest glyphs.

Fix: pass `--out-ascent` to bump the output font's `hhea.ascent` +
`OS/2.usWinAscent` (font units, UPM=1000). For Xiaolai paired with
Thai/Katakana/Korean, `1200` is enough; for Urdu Nastaliq, use `1300`.
Recommended pairings:

```sh
# Xiaolai + Thai (Google Sans Thai)
python wing-font.py \
  -i input_fonts/XiaolaiSC-Regular.ttf \
  -a 'input_fonts/GoogleSans-VariableFont_GRAD,opsz,wght.ttf' \
  -m mappings/cantonese/canto-thai.csv \
  -o Xiaolai-Google-thai \
  -opt -as 0.26 --out-ascent 1200

# Xiaolai + Urdu Nastaliq (Noto Nastaliq Urdu)
python wing-font.py \
  -i input_fonts/XiaolaiSC-Regular.ttf \
  -a input_fonts/NotoNastaliqUrdu-VariableFont_wght.ttf \
  -m mappings/cantonese/canto-urdu.csv \
  -o Xiaolai-NotoNastaliq-urdu \
  -opt -as 0.22 --out-ascent 1300
```

You can leave `--out-ascent` unset for typical pairings (CJK + Latin
romanization, NotoSansHK base): the legacy "inherit from base" default
gives the right line heights everywhere with no clipping. See the
[`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) matrix for
the canonical `-as` / `--out-ascent` pairings shipped to
<https://wing-font.chunlaw.io/>.

The same lever is exposed in the in-browser pipeline at `/generate` →
Step 3 → Advanced → "Output ascent (font units)", so you can iterate
on a value visually before committing to a CLI invocation.

### Full CLI

| Flag | Long form | Default | Meaning |
| --- | --- | --- | --- |
| `-i` | `--base-font-file` | required | TTF whose glyphs become the bottom of each annotated glyph |
| `-a` | `--anno-font-file` | required | TTF supplying the romanization letterforms |
| `-o` | `--output-prefix` | required | Output basename; `.ttf` and `.woff2` are appended |
| `-m` | `--mapping` | required | CSV mapping characters/words to romanizations |
| `-f` | `--family-name` | source name | Overwrites `name` table family entries |
| `-bs` | `--base-scale` | `0.75` | How much to shrink the base character (vertical room for anno) |
| `-as` | `--anno-scale` | `0.25` | How much to shrink the annotation glyphs, as a fraction of the output em. UPM-independent: the same value renders at the same visual size regardless of the annotation font's unitsPerEm (so e.g. NotoSerif at 2048 UPM and Huninn at 1024 no longer need different numbers). |
| `-y` | `--upper_y_offset_ratio` | `0.8` | Where to put the annotation (fraction of em) |
| `-v` | `--invert` | off | Swap positions: annotation below, base above |
| `-opt` | `--optimize` | off | Subset the output to just glyphs we actually use (drops it from ~30 MB to ~200–500 KB per font) |
| | `--trigger-char` | `丅` (U+4E05) | Override-trigger character for the IME-friendly variant selection path (`<base><trigger><numeral>`). Pass an empty string to disable the trigger+numeral path while keeping the digit-suffix path (`<base><1-9>`) intact. |
| | `--out-ascent` | inherit | Override the output font's `hhea.ascent` + `OS/2.usWinAscent` (font units, UPM=1000). Pairings whose annotation cascades far above the base — Urdu Nastaliq, tall Thai marks, Hangul jamo on low-ascent bases like Xiaolai (880u) — need more headroom than the base provides; without this flag, apps that strictly honour `winAscent` (Word, Pages, Keynote, Canva) truncate the top of the tallest annotation. Typical values: `1200` for Xiaolai paired with Thai / Katakana / Korean, `1300` for Xiaolai paired with Urdu. Leaving unset preserves legacy behaviour. |

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
default reading, word context (chain-context under `ccmp`), digit
trigger (ligature substitution under `ccmp`), and the 丅 fallback —
each comparing the system font (left) against the generated font
(right). Visual differences prove the GSUB rules fired.

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

Rows whose base text is **Arabic script** are auto-detected and use a
per-WORD format instead — see the next section.

---

## Word-unit base fonts (Arabic, Thai)

CJK annotation works per character: one codepoint, one glyph, one
annotation. Some scripts can't be sliced that way — Arabic letters
take contextual forms (initial/medial/final) and join cursively; Thai
builds syllables from consonants plus stacking vowel/tone marks and
writes words without spaces. For these scripts the pipeline treats
the **word** as the annotated unit: the whole word is shaped with
HarfBuzz against the base font (positional forms, lam-alef, mark
anchors — exactly what the base font would render) and drawn into ONE
composed glyph with the annotation centred BELOW it.

Below is the word-mode default (the mirror of the CJK
above-the-character default): the annotation drops under the base
font's descent so it clears even Nastaliq's deepest bowls, and the
output font's `hhea`/`OS/2` win metrics are auto-extended to cover the
annotation ink, so nothing is clipped by winDescent-honouring apps —
no `--out-ascent`-style flag needed. Pass `-v` to flip the annotation
above the word instead (placed at `-y`, ascent auto-extended the same
way if it pokes past the base font's own).

Mapping rows are auto-detected by script; the annotation is the whole
second column (spaces allowed), NOT split per letter:

```
كتاب,kitab,10
كتاب,book,1
مدرسة,madrasa
```

Build like any other font; recommended geometry keeps the base at
full size (cursive joins can't tolerate the CJK shrink-and-centre
trick) — vertical headroom is handled automatically:

```sh
python wing-font.py \
  -i input_fonts/NotoNastaliqUrdu-VariableFont_wght.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/arabic-demo.csv \
  -o WingArabicDemo \
  -opt -bs 1.0 -as 0.18
```

(Add `-v -y 1.15` for above-the-word placement.)

Thai works identically — Thai-script rows are auto-detected the same
way (`mappings/thai-demo.csv` is the demo set, Google Sans Thai a
suitable base):

```sh
python wing-font.py \
  -i "input_fonts/GoogleSans-VariableFont_GRAD,opsz,wght.ttf" \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/thai-demo.csv \
  -o WingThaiDemo \
  -opt -bs 1.0 -as 0.18
```

Devanagari (Hindi) is supported as an **experimental** third script
(`mappings/hindi-demo.csv`, Hind-Regular as base) — same flags. It is
verified against HarfBuzz-based renderers (browsers, Android, Linux,
LibreOffice); CoreText / DirectWrite use their own Indic engines and
are unverified, see the Indic notes in
[`word_liga_handler.py`](word_liga_handler.py).

Per-script behaviour is data, not code: `csv_parser.WORD_SCRIPTS` maps
each script tag to a `WordScript` record (detection ranges, boundary
guards on/off, variant trigger, ligature-component computation mode,
and the OpenType feature to register under). Supporting a new
word-unit script starts with one registry entry — plus a demo mapping,
a behavioural test like `tests/test_*_word.py`, and real verification:
scripts whose shapers apply substitutions per-syllable (the Indic
family, Khmer, Myanmar) need the `calt`-stage treatment Devanagari
uses, and each script needs a sensible variant-trigger choice.

How the pieces map to OpenType (details in
[`word_liga_handler.py`](word_liga_handler.py)):

- **Reaching the glyph** — the composed glyph has no codepoint, so a
  GSUB Type 4 ligature keyed on the word's nominal letter glyphs
  substitutes it. It runs under `ccmp`, which shapers apply while the
  buffer still holds plain cmap glyphs in logical order (before
  `init`/`medi`/`fina`/`rlig`), and the lookups are **prepended** to
  the LookupList so they outrun the base font's own `ccmp`
  substitutions (Noto Nastaliq decomposes dotted letters right there).
- **Word boundaries** — *Arabic:* the ligation is nested inside a
  chain-context lookup with blocker rules, so a mapped word does NOT
  fire inside a longer unmapped word (كتاب stays plain inside كتابة)
  or after a joined prefix. *Thai:* there are no spaces between words,
  so blockers are deliberately omitted — adjacent mapped words both
  ligate (กินข้าว annotates as gin + khao), and longest-match rule
  ordering arbitrates overlaps (mapped น้ำใจ beats its mapped prefix
  น้ำ), the same trade-off the CJK chain-context already makes.
- **Shaper preprocessing** — ligature components are the glyph
  sequence the buffer REALLY contains when our (first-running) lookups
  fire. For Thai that sequence is computed by shaping each word
  against a substitution-less copy of the base font, because HarfBuzz
  rewrites Thai text before any GSUB: typed SARA AM (ำ) becomes
  NIKHAHIT + SARA AA reordered around tone marks — per-codepoint cmap
  lookups would never match น้ำ. (Arabic stays on cmap resolution: a
  GSUB-less Arabic font would trigger HarfBuzz's legacy
  presentation-forms fallback instead.)
- **Variant override** — digits don't work after Arabic (bidi splits
  the run), so a trailing *tatweel* (`ـ` U+0640, on every Arabic
  keyboard) cycles readings: `كتابـ` → variant 1, `كتابــ` → variant 2,
  … modulo the variant count. The tatweel is consumed by the ligature,
  so nothing stray renders. Thai is LTR, so it keeps the CJK-style
  digit suffix instead: `ผม1` picks variant 1, `ผม0` the default —
  with both ASCII and Thai digits (`ผม๑`) wired.
- **Cursor behaviour** — GDEF `LigCaretList` entries at letter-cluster
  boundaries let editors that honour ligature carets (CoreText,
  DirectWrite) step the cursor *through* the word glyph. Editors that
  ignore carets treat the word as one block — still consistent with
  how they treat any ligature.

Known limitations:

- *Arabic:* words written **with harakat** (vowel marks) don't match
  the nominal-letter sequence; they render normally, un-annotated.
  Add fully-vocalised spellings as separate rows if you need them.
- *Arabic:* a mapped word directly after a **non-joining prefix
  particle** (e.g. و in وكتاب) is conservatively NOT annotated — add
  the prefixed form as its own row.
- *Thai:* with no detectable word boundaries there are no guards — a
  mapped word that occurs as a substring of a longer UNMAPPED word
  will still ligate there. Mapping the longer word too fixes any
  specific case (longest match wins); this is the same compromise the
  CJK phrase rules live with.
- Words longer than `MAX_WORD_CHARS` (16) are skipped.
- `-opt` keeps the entire encoded repertoire of every word-unit
  script present (letters, marks, digits, punctuation) so unmapped
  words keep rendering correctly — these script blocks are small, so
  it costs little.

End-to-end behavioural tests (shaping with HarfBuzz against a built
font: ligation, both boundary guards, tatweel cycling, GDEF carets):

```sh
python wing-font.py -i NotoNastaliqUrdu.ttf -a NotoSerif-Regular.ttf \
  -m mappings/arabic-demo.csv -o /tmp/demo -opt -bs 1.0
python tests/test_arabic_word.py /tmp/demo.ttf
python tests/test_thai_word.py /tmp/demo-thai.ttf   # Thai counterpart
python tests/render_sample.py /tmp/demo.ttf sample.png "كتاب مدرسة"
```

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

### `liga_handler.py` — ligature substitution under `ccmp`

Uses `LigatureSubstBuilder` to emit two kinds of rules per polyphonic
character:

* `(any_variant, '0')` → default reading, `(any_variant, 'N')` → variant N.
* `(any_variant, '丅', '零/一/二/…')` → same mapping via the
  IME-friendly trigger.

The module is named `liga_handler` because the lookup *type* is still
GSUB Type 4 (Ligature Substitution) — that hasn't changed. What changed
is the feature *tag* the lookup is registered under: it used to be the
OpenType `liga` feature, and is now `ccmp`. Reason: Apple's iWork
typesetter silently suppresses `liga` on CJK runs even when the user
toggles "Ligatures" on, so `行丅一` would render as three separate
glyphs in Pages no matter what. Moving these rules to `ccmp`
(required-by-spec, applied universally) makes the digit-override and
trigger-fallback paths fire everywhere with no app-side toggle. The
trade-off — users lose the ability to disable annotation overrides via
an app setting — is acceptable for an annotation font.

Same `add_subtable_break()` chunking as the chain handler, with the
slight wrinkle that `LigatureSubstBuilder` keys its sentinel by
`(SUBTABLE_BREAK_, location)` so we pass a monotonically-increasing
counter to avoid dict-key collisions that would silently drop all
breaks after the first.

### `ivs_handler.py` — cmap format-14 (IVS) supplement

For each polyphonic character with N annotations, emits N-1 entries in
the cmap format-14 subtable: `(base, U+E0100)` → variant 1,
`(base, U+E0101)` → variant 2, etc. Variant 0 needs no entry because
the bare base codepoint already maps to the default-reading glyph
through cmap format-4/12.

IVS lives entirely outside GSUB, so it can't interfere with the ccmp
chain-context and ligature lookups above. Every modern shaper
(HarfBuzz, CoreText, DirectWrite) honours format-14 at cmap-lookup
time, no feature toggle, no script suppression — making this the
cleanest possible technical path. The catch is human-facing: a
Variation Selector is zero-width, so an `行 + U+E0100` sequence is
indistinguishable from a bare `行` in any font without our IVS table.
The existing ligature paths in `liga_handler.py` stay
copy-paste-portable as a fallback, so we ship IVS as a SUPPLEMENT
rather than a replacement.

Practical caveat on input: typing a VS without IME help is awkward.
Power users on Japanese IMEs (which expose IVS for kanji shape
variants), macOS Character Viewer, or Adobe's Glyphs panel get this
path for free; most other users will still reach for the ligature
paths.

### `utils.register_feature_lookup`

Tiny helper that exists because the chain and liga handlers used to
duplicate ~40 lines each of script/langsys walking. Now both just call
`register_feature_lookup(gsub, 'ccmp', lookup_index)`. The helper also
force-creates `hani` / `latn` / `kana` / `hang` / `bopo` script records
if missing, so CoreText finds the feature under whichever script tag it
picks for the text run.

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

### Cantonese (廣東話)

1. [Typeduck-HK](https://github.com/TypeDuck-HK/TypeDuck-Mac/blob/master/Preparing/Sources/Preparing/Resources/data.csv)
2. [粵語審音配詞字庫](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/)
3. [Cantonese Romanization Converter](https://www.kodensha.jp/webapp/cantonese/can_converter_e.html)

### Taiwanese / Southern Min (河洛話)

The standard (優勢腔) `taigi-{tl,tl-toned,poj,poj-toned,tlpa,bp}.csv`
mappings and the nine 腔 (accent) variants `taigi-tl-<accent>.csv` are
built from the **MOE 教育部《臺灣台語常用詞辭典》** (sutian /
`kautian.ods`), via the ChhoeTaigi conversion of that dataset:
`KipUnicode` → Tâi-lô, `PojUnicode` → POJ (both verbatim), and the
`KipDictDialects` 語音差異 table → the per-accent variants. TLPA and 閩拼
are derived from Tâi-lô with the standard initial/final correspondences
inlined in `gen_moe_standard.py`. Multi-character words are emitted **one syllable per
character** (`一刀兩斷,it to lióng tuān`) so `csv_parser` can use them
for 多音字 disambiguation. Regenerate everything (standard schemes **and**
the nine 腔, all in the pipeline-ready per-character format) with
[`taigi-mappings/gen_moe_standard.py`](../taigi-mappings/gen_moe_standard.py).
(`dialects/gen_dialects.py` is the original raw 語音差異 extractor —
hyphen-joined, kept for reference; superseded by `gen_moe_standard.py`.)

1. [教育部《臺灣台語常用詞辭典》](https://sutian.moe.edu.tw/) — authoritative readings + 語音差異 各腔 table. **Licence: CC BY-ND 3.0 TW** — verify terms before redistributing derived fonts/CSVs.
2. [ChhoeTaigi/ChhoeTaigiDatabase](https://github.com/ChhoeTaigi/ChhoeTaigiDatabase) — the dataset conversion actually consumed.

The romanization is set in [Huninn (jf-openhuninn)](https://github.com/justfont/open-huninn-font),
which carries the full Tâi-lô / POJ combining tone marks.

TLPA and 閩拼 are derived from Tâi-lô by the standard initial/final
correspondences inlined in `gen_moe_standard.py` (`INI_TBL` / `FIN_TBL`)
— no external database.

> `kana` is **not** produced from the MOE source (no 假名 column); it
> stays the taigivs-derived file below.

The two non-Latin Taiwanese annotation systems — `taigi-tps.csv`
(方音符號 / Taiwanese Phonetic Symbols) and `taigi-kana.csv`
(台灣語假名 / Taiwanese kana) — are derived from
[ButTaiwan/taigivs](https://github.com/ButTaiwan/taigivs) (Apache-2.0;
character readings from the MOE 教育部臺灣台語常用詞辭典). Each
character's primary reading follows taigivs's 教典-sourced ordering.
TPS is emitted as standard Unicode (Bopomofo + Bopomofo Extended + tone
marks) — pair it with a Bopomofo-covering CJK font such as Noto Sans TC.
The Taiwanese-kana column is a standard-Unicode approximation (katakana
+ tone digit), since the authentic tone diacritics are taigivs's custom
font glyphs rather than encoded characters; pair it with Noto Sans JP.

1. [ButTaiwan/taigivs](https://github.com/ButTaiwan/taigivs) — 方音符號 / 台灣語假名 transcriptions (Apache-2.0)
2. [教育部臺灣台語常用詞辭典](https://sutian.moe.edu.tw/) — upstream character readings

### Mandarin (普通話 / 國語)

The `mandarin.csv` mapping is built entirely from mozillazg's
MIT-licensed data, taken from its permissive upstream rather than from
any OFL-licensed font project. Per-character readings come from
`pinyin-data` (derived from the Unicode **Unihan** database —
`kTGHZ2013` / `kHanyuPinyin` / `kXHC1983` / `kMandarin` — under the
Unicode license); each character's default reading follows Unihan's
`kMandarin` field. The word/phrase readings that drive contextual
homograph (多音字) disambiguation come from `phrase-pinyin-data`.

1. [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data) — per-character readings (MIT; from Unihan)
2. [mozillazg/phrase-pinyin-data](https://github.com/mozillazg/phrase-pinyin-data) — word/phrase readings (MIT)
3. [Unicode Han Database (Unihan)](https://www.unicode.org/charts/unihan.html) — upstream reading data

The idea of baking pinyin annotations into the glyphs with contextual
disambiguation was pioneered by
[MaruTama/Mengshen-pinyin-font](https://github.com/MaruTama/Mengshen-pinyin-font)
(OFL-1.1); Wing Font does not reuse its data files, but gratefully
acknowledges it as inspiration.

---

## Contact

[Instagram](https://instagram.com/wingfont) · [Telegram](https://t.me/wingfont) · [Sponsor on GitHub](https://github.com/sponsors/chunlaw)

## License

MIT — see [`LICENSE`](../LICENSE).
