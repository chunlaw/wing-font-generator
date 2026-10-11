"""test_ivs_slots.py — buildIvs selector numbering.

Slots come from the readings' annotation strings, not their weight rank,
so re-weighting a mapping can't renumber sequences already stored in
documents (the Office add-in writes them).

Run standalone:   python tests/test_ivs_slots.py
Run under pytest: pytest tests/test_ivs_slots.py
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.diy_handler import DIY_PUA_BASE, build_diy_inventory  # noqa: E402
from wingfont.ivs_handler import (  # noqa: E402
    BARE_SELECTOR,
    IVS_BASE,
    MUTE_SELECTOR,
    _find_or_create_uvs_subtable,
    buildIvs,
)

HANG = 0x884C  # 行
GLYPHS = [".notdef", "a", "b", "c", "bare", "mute"]


def _font():
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder(GLYPHS)
    fb.setupCharacterMap({HANG: "a"})
    fb.setupGlyf({g: TTGlyphPen(None).glyph() for g in GLYPHS})
    fb.setupHorizontalMetrics({g: (1000, 0) for g in GLYPHS})
    fb.setupHorizontalHeader()
    fb.setupNameTable({"familyName": "T", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    return fb.font


def _uvs(font):
    sub = next(t for t in font["cmap"].tables if t.format == 14)
    return {vs: dict(entries) for vs, entries in sub.uvsDict.items()}


def test_slots_sort_by_annotation_and_include_the_default():
    font = _font()
    used = buildIvs(
        font,
        {"行": {"hong4": ("a", 0), "hang4": ("b", 1), "haang4": ("c", 2)}},
        {"a": "bare"},
    )
    uvs = _uvs(font)
    assert uvs[IVS_BASE][HANG] == "c"  # haang4
    assert uvs[IVS_BASE + 1][HANG] == "b"  # hang4
    assert uvs[IVS_BASE + 2][HANG] == "a"  # hong4, the default
    assert uvs[BARE_SELECTOR][HANG] == "bare"
    assert used == {IVS_BASE, IVS_BASE + 1, IVS_BASE + 2, BARE_SELECTOR}


def test_reweighting_does_not_move_slots():
    before, after = _font(), _font()
    buildIvs(before, {"行": {"hong4": ("a", 0), "hang4": ("b", 1), "haang4": ("c", 2)}})
    # Same readings and glyphs, different weight ranking / default.
    buildIvs(after, {"行": {"haang4": ("c", 0), "hong4": ("a", 1), "hang4": ("b", 2)}})
    assert _uvs(before) == _uvs(after)


def test_single_reading_gets_no_selector_and_muted_has_a_fixed_one():
    font = _font()
    buildIvs(font, {"行": {"hong4": ("a", 0), "": ("mute", 1)}})
    assert _uvs(font) == {MUTE_SELECTOR: {HANG: "mute"}}


def test_our_entry_replaces_source_font_ivs_on_same_pair():
    font = _font()
    src = _find_or_create_uvs_subtable(font["cmap"])
    src.uvsDict[IVS_BASE] = [(HANG, "c"), (0x8FBB, "c")]  # base font's own IVS
    buildIvs(font, {"行": {"hong4": ("a", 0), "hang4": ("b", 1)}})
    entries = next(t for t in font["cmap"].tables if t.format == 14).uvsDict[IVS_BASE]
    assert entries == [(HANG, "b"), (0x8FBB, "c")]  # ours wins, others kept, sorted


def test_diy_numbers_follow_csv_row_order():
    p = Path(tempfile.mkdtemp()) / "a.csv"
    p.write_text("ｚａａ１,zaa1\nｈｏｎｇ２,hong2\n", encoding="utf-8")
    first = build_diy_inventory(str(p)).pua_map
    assert first == {"zaa1": DIY_PUA_BASE, "hong2": DIY_PUA_BASE + 1}
    # Appending a new annotation (even one that sorts first) moves nothing.
    p.write_text("ｚａａ１,zaa1\nｈｏｎｇ２,hong2\nａａ１,aa1\n", encoding="utf-8")
    second = build_diy_inventory(str(p)).pua_map
    assert all(second[a] == cp for a, cp in first.items())
    assert second["aa1"] == DIY_PUA_BASE + 2


if __name__ == "__main__":
    tests = [v for k, v in dict(globals()).items() if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS  {t.__name__}")
    print(f"\n{len(tests)}/{len(tests)} passed")
