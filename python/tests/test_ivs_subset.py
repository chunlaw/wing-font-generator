"""
test_ivs_subset.py — regression guard for IVS (cmap format-14) survival
through the optimize/subset phase.

fontTools' Subsetter drops the entire format-14 subtable when populated
with `glyphs=` only: the variant *glyphs* are kept, but the
`<base> + <variation selector>` mappings that reach them are stripped,
silently disabling the IVS selector in every optimized (shipped) build.
wing-font.py's optimize path fixes this by also passing the variation
selectors in `unicodes=` (mirroring ivs_handler's index→selector math).

These tests pin that contract at the fontTools level so a future
refactor of the subset call can't regress it unnoticed:
  * glyph-only subset DROPS format-14 (the failure mode we guard against);
  * glyph subset + the VS codepoints in `unicodes` RETAINS it, including
    a variant index past 9 (the >10-readings case Part 1 enabled).

Hermetic: builds a tiny synthetic font in-memory; no input fonts needed.

Run standalone:   python tests/test_ivs_subset.py
Run under pytest: pytest tests/test_ivs_subset.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools import subset

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.ivs_handler import IVS_BASE  # noqa: E402

_BASE_CP = 0x884C  # 行
# Variant 10 lives past the single-digit (0-9) selector — exactly the
# range Part 1 (MAX_CHAR_VARIANTS raised to 240) made keepable.
_VARIANT_INDEX = 10
_VS_CP = IVS_BASE + (_VARIANT_INDEX - 1)  # U+E0109


def _box():
    p = TTGlyphPen(None)
    p.moveTo((0, 0))
    p.lineTo((400, 0))
    p.lineTo((400, 400))
    p.closePath()
    return p.glyph()


def _make_font():
    fb = FontBuilder(1000, isTTF=True)
    order = [".notdef", "base", "v10"]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({_BASE_CP: "base"})
    fb.setupGlyf({n: _box() for n in order})
    fb.setupHorizontalMetrics({n: (500, 0) for n in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "IVSTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    font = fb.font
    sub = CmapSubtable.newSubtable(14)
    sub.platformID, sub.platEncID, sub.language = 0, 5, 0xFFFFFFFF
    sub.cmap = {}
    sub.uvsDict = {_VS_CP: [(_BASE_CP, "v10")]}
    font["cmap"].tables.append(sub)
    return font


def _uvs_variants(font):
    f14 = [t for t in font["cmap"].tables if t.format == 14]
    if not f14:
        return []
    return [
        (cp, g) for entries in f14[0].uvsDict.values() for cp, g in entries
    ]


def test_glyph_only_subset_drops_ivs():
    """Documents the failure mode: without the VS codepoints in
    `unicodes`, format-14 is stripped entirely."""
    font = _make_font()
    ss = subset.Subsetter()
    ss.populate(glyphs=["base", "v10"])
    ss.subset(font)
    assert _uvs_variants(font) == [], (
        "expected glyph-only subset to drop format-14 — if this now "
        "retains it, fontTools changed and the wing-font.py workaround "
        "may be simplifiable"
    )


def test_subset_with_vs_unicodes_retains_ivs():
    """The fix: passing the variation selector in `unicodes` keeps the
    `<base> + <VS>` mapping for a variant index past 9."""
    font = _make_font()
    ss = subset.Subsetter()
    ss.populate(glyphs=["base", "v10"], unicodes=[_VS_CP])
    ss.subset(font)
    variants = _uvs_variants(font)
    assert (_BASE_CP, "v10") in variants, (
        f"variant {_VARIANT_INDEX} (U+{_VS_CP:05X}) must survive the "
        f"subset; got {variants}"
    )


def main() -> int:
    tests = [
        test_glyph_only_subset_drops_ivs,
        test_subset_with_vs_unicodes_retains_ivs,
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
