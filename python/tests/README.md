# Wing Font — pipeline test rig

A small end-to-end test for the refactored `chain_context_handler.py` /
`liga_handler.py`. Generates a tiny WOFF and serves an HTML page that
visually verifies every rule type fires.

## Files

| File                         | Purpose                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `test_mapping.csv`           | Curated 43-line mapping. Includes polyphonic chars (行, 畫) and words that trigger `calt`. |
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
2. **Word context (`calt`)** — types `銀行` / `行家` and the same char
   `行` switches between `hong4` and `hang4` depending on the word.
   This proves the new `ChainContextSubstBuilder` rules are wired
   correctly and the source font's existing `calt` lookups didn't get
   overwritten.
3. **Digit trigger (`liga`)** — types `行1` and the `1` disappears
   while `行` switches to its variant-1 reading. Proves the
   `LigatureSubstBuilder` rules and `utils.register_feature_lookup`
   correctly added our lookup to the existing `liga` feature.
4. **Chinese-numeral fallback** — types `行丅一` and the same
   substitution happens via the three-glyph ligature path.

If the **right column looks identical to the left column** in any panel,
the font failed to load (check the status banner at the top of the page)
or that rule didn't fire (open the page's devtools console for hints).

## Cleaning up

```sh
rm -rf tests/output
```

`tests/output/` is gitignored.
