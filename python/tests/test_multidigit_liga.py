"""
test_multidigit_liga.py — regression guard for the 1-indexed digit
selection in liga_handler.buildLiga.

User-facing digit semantics (the 0-indexed `(行, 1) → variant 1` scheme
was retired in favour of the 1-indexed scheme):
  * `行`     → default reading (cmap, no GSUB rule)
  * `行0`    → bare 行 (no annotation on top) — emitted only when a
              bare_base_map entry is provided
  * `行1`    → 1st reading (= default)
  * `行N` for N ≥ 2 → N-th reading (internal variant N-1)
  * Multi-digit `行10`, `行11`, `行111` → 10th, 11th, 111th reading

This is realised as GSUB Type-4 ligatures whose components spell the
1-indexed number, started from the character's default glyph only (the
per-variant "override" start was removed in an earlier refactor and
isn't restored here).

These tests build a synthetic font + char_mapping + bare_base_map
(shaped like build_glyph's output with emit_bare_bases=True), run
buildLiga, and inspect the emitted ligatures:
  * single-digit 1..9 stay 2-component   (行,'1') -> default, (行,'9') -> 9th
  * N ≥ 10 become multi-component        (行,'1','0') -> 10th, etc.
  * '0' strips → bare base
  * variant glyphs are NOT registered as ligature starts (no override)

Hermetic: tiny in-memory font; no input fonts needed.

Run standalone:   python tests/test_multidigit_liga.py
Run under pytest: pytest tests/test_multidigit_liga.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.liga_handler import buildLiga  # noqa: E402

_BASE_CP = 0x884C  # 行
_N_VARIANTS = 12  # indices 0..11 → exercises 1-digit and 2-digit numbers


def _box():
    p = TTGlyphPen(None)
    p.moveTo((0, 0))
    p.lineTo((400, 0))
    p.lineTo((400, 400))
    p.closePath()
    return p.glyph()


def _make_font_and_mapping():
    digit_chars = {ord(str(d)): f"dig{d}" for d in range(10)}
    variant_glyphs = [f"v{i}" for i in range(_N_VARIANTS)]
    # variant 0 reuses the base glyph name (build_glyph does the same:
    # the default reading keeps the original glyph).
    variant_glyphs[0] = "base"
    bare_glyph = "bare_base"  # the un-annotated 行 (variant -1 conceptually)

    order = [".notdef", "base", bare_glyph, *digit_chars.values(),
             *[g for g in variant_glyphs if g != "base"]]
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(order)
    cmap = {_BASE_CP: "base"}
    cmap.update(digit_chars)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf({n: _box() for n in order})
    fb.setupHorizontalMetrics({n: (500, 0) for n in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "LigTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    # Minimal empty GSUB for buildLiga to append into.
    from fontTools.ttLib import newTable
    from fontTools.ttLib.tables import otTables as ot

    gsub = newTable("GSUB")
    gsub.table = ot.GSUB()
    gsub.table.Version = 0x00010000
    gsub.table.ScriptList = ot.ScriptList()
    gsub.table.ScriptList.ScriptRecord = []
    gsub.table.ScriptList.ScriptCount = 0
    gsub.table.FeatureList = ot.FeatureList()
    gsub.table.FeatureList.FeatureRecord = []
    gsub.table.FeatureList.FeatureCount = 0
    gsub.table.LookupList = ot.LookupList()
    gsub.table.LookupList.Lookup = []
    gsub.table.LookupList.LookupCount = 0
    fb.font["GSUB"] = gsub

    # char_mapping: char -> {annotation_str: (glyph_name, variant_index)}
    char_mapping = {
        "行": {
            f"reading{i}": (variant_glyphs[i], i) for i in range(_N_VARIANTS)
        }
    }
    # bare_base_map: {default_base_glyph: bare_base_glyph}
    bare_base_map = {"base": bare_glyph}
    return fb.font, char_mapping, bare_base_map


def _ligature_map(font):
    """Flatten the built GSUB Type-4 lookup into {component-tuple: target}.

    Resolves digit/base glyph names back to readable tokens so assertions
    read naturally."""
    gsub = font["GSUB"].table
    result = {}
    for lk in gsub.LookupList.Lookup:
        for st in lk.SubTable:
            for first, ligs in getattr(st, "ligatures", {}).items():
                for lg in ligs:
                    result[(first, *lg.Component)] = lg.LigGlyph
    return result


def test_one_indexed_digit_rules():
    """1-indexed digits: type N → N-th reading (internal variant N-1)."""
    font, mapping, bare_map = _make_font_and_mapping()
    # Disable the trigger+numeral path so we test the digit path in
    # isolation (the synthetic font has no Chinese numeral glyphs anyway).
    buildLiga(font, mapping, trigger_char="", bare_base_map=bare_map)
    ligs = _ligature_map(font)

    # Single digit:
    #   `行1` → 1st reading = default (= internal variant 0 = "base" glyph)
    #   `行2` → 2nd reading (= internal variant 1 = "v1")
    #   `行9` → 9th reading (= internal variant 8 = "v8")
    assert ligs.get(("base", "dig1")) == "base"   # 1st = default
    assert ligs.get(("base", "dig2")) == "v1"
    assert ligs.get(("base", "dig9")) == "v8"


def test_multidigit_rules():
    """Multi-digit `行10`, `行11` etc. resolve to the N-th reading
    (1-indexed). Internal variant index = N - 1."""
    font, mapping, bare_map = _make_font_and_mapping()
    buildLiga(font, mapping, trigger_char="", bare_base_map=bare_map)
    ligs = _ligature_map(font)

    # `行10` → 10th reading = internal variant 9 = "v9"
    assert ligs.get(("base", "dig1", "dig0")) == "v9"
    # `行11` → 11th reading = internal variant 10 = "v10"
    assert ligs.get(("base", "dig1", "dig1")) == "v10"
    # `行12` → 12th reading = internal variant 11 = "v11"
    assert ligs.get(("base", "dig1", "dig2")) == "v11"


def test_zero_strips_to_bare():
    """`行0` → bare 行 (no annotation) when a bare_base_map entry exists."""
    font, mapping, bare_map = _make_font_and_mapping()
    buildLiga(font, mapping, trigger_char="", bare_base_map=bare_map)
    ligs = _ligature_map(font)

    # (base, '0') → bare_base
    assert ligs.get(("base", "dig0")) == "bare_base"


def test_zero_no_op_when_no_bare_glyph():
    """When `bare_base_map` doesn't carry an entry for this base, the
    `(base, 0)` rule is intentionally skipped — the literal '0' falls
    through to be rendered. This matches the no-DIY / no-bare-bases
    build mode where typing `行0` should show literal `行0`."""
    font, mapping, _bare_map = _make_font_and_mapping()
    buildLiga(font, mapping, trigger_char="", bare_base_map=None)
    ligs = _ligature_map(font)

    assert ("base", "dig0") not in ligs


def test_no_variant_glyph_is_a_ligature_start():
    """The override path was removed: only the character's default glyph
    starts a ligature, never the variant glyphs (v1, v2, …)."""
    font, mapping, bare_map = _make_font_and_mapping()
    buildLiga(font, mapping, trigger_char="", bare_base_map=bare_map)
    ligs = _ligature_map(font)
    starts = {comps[0] for comps in ligs}
    variant_only = {f"v{i}" for i in range(1, _N_VARIANTS)}
    assert starts & variant_only == set(), (
        f"variant glyphs must not be ligature starts; found {starts & variant_only}"
    )
    assert starts == {"base"}


def main() -> int:
    tests = [
        test_one_indexed_digit_rules,
        test_multidigit_rules,
        test_zero_strips_to_bare,
        test_zero_no_op_when_no_bare_glyph,
        test_no_variant_glyph_is_a_ligature_start,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS  {t.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL  {t.__name__}: {exc}")
    print()
    print(f"{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
