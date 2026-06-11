# Wing Font — pipeline test rig

A small end-to-end test for the refactored `chain_context_handler.py` /
`liga_handler.py`. Generates a tiny WOFF and serves an HTML page that
visually verifies every rule type fires.

## Files

| File                         | Purpose                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `test_mapping.csv`           | Curated 43-line mapping. Includes polyphonic chars (行, 畫) and words that trigger `ccmp`. |
| `generate_test_font.py`      | Runs `wing-font.py` against `test_mapping.csv`. Writes `output/test.{ttf,woff,…}`.         |
| `viewer.html`                | Static page that loads the WOFF and renders each test case side-by-side with the system font. |
| `serve.py`                   | Regenerates + serves over HTTP (browsers won't load `@font-face` from `file://`).         |

## Quick start

```sh
# from the repo root
python tests/serve.py
```

This regenerates `tests/output/test.{ttf,woff}` and opens
<http://127.0.0.1:8765/viewer.html> in your browser.

For fast iteration after editing only the HTML:

```sh
python tests/serve.py --no-regen
```

## What each test panel proves

1. **Default reading** — every char in the mapping shows its primary
   romanization. This proves `build_glyph.py` produces the variant-0
   glyphs and the cmap remap works.
2. **Word context (`ccmp` chain substitution)** — types `銀行` / `行家`
   and the same char `行` switches between `hong4` and `hang4` depending
   on the word. This proves the new `ChainContextSubstBuilder` rules
   (Type 6) are wired correctly. We register them under `ccmp` rather
   than `calt` because iWork (Pages/Keynote/Numbers) silently suppresses
   `calt` on CJK runs — see `chain_context_handler.py` for the full
   rationale.
3. **Digit trigger (`ccmp` ligature)** — types `行1` and the `1`
   disappears while `行` switches to its variant-1 reading. Proves the
   `LigatureSubstBuilder` rules (Type 4) and
   `utils.register_feature_lookup` correctly added our lookup. The
   lookup is registered under `ccmp` (NOT `liga`) for the same iWork
   reason — see `liga_handler.py` for the full rationale.
4. **Chinese-numeral fallback** — types `行丅一` and the same
   substitution happens via the three-glyph ligature path (also under
   `ccmp`).
5. **IVS (cmap format-14)** — `行` followed by U+E0100 (VS17) picks
   variant 1 at cmap-lookup time, before GSUB runs. The Variation
   Selector itself is zero-width, so an `行+VS17` sequence renders
   as bare `行` in any font that lacks our IVS supplement — a
   trade-off the GSUB ligature paths in panels 3/4 don't have. See
   `ivs_handler.py` for the rationale on shipping IVS alongside,
   not instead of, the ligature paths.

If the **right column looks identical to the left column** in any panel,
the font failed to load (check the status banner at the top of the page)
or that rule didn't fire (open the page's devtools console for hints).

## Cleaning up

```sh
rm -rf tests/output
```

`tests/output/` is gitignored.
