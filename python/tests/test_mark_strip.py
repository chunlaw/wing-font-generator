"""test_mark_strip.py — the DIY base-strip chain sub + GDEF mark class.

The strongest check is end-to-end via HarfBuzz: build a complete font
(base + bare + unmapped base + a PUA-mapped mark), wire the strip rule and
GDEF mark class, compile, then shape and assert the substitution fires:

  base + mark(PUA)  → [bare, mark]    (mapped base stripped)
  base alone        → [base]          (no mark → no strip)
  unmappedBase+mark → [other, mark]   (not in the strip coverage)

Run standalone:   python tests/test_mark_strip.py
Run under pytest:  pytest tests/test_mark_strip.py
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import otTables as ot

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.mark_strip_handler import buildBaseStrip, tagMarksAsGdefMarks  # noqa: E402

UPM = 1000
BASE_CP = 0x884C       # 行 (mapped)
OTHER_CP = 0x4E2D      # 中 (un-mapped control)
MARK_CP = 0xF0000      # Plane-15 PUA for the mark


def _box():
    p = TTGlyphPen(None)
    p.moveTo((50, 0))
    p.lineTo((450, 0))
    p.lineTo((450, 600))
    p.closePath()
    return p.glyph()


def _empty_gsub():
    g = newTable("GSUB")
    g.table = ot.GSUB()
    g.table.Version = 0x00010000
    g.table.ScriptList = ot.ScriptList()
    g.table.ScriptList.ScriptRecord = []
    g.table.ScriptList.ScriptCount = 0
    g.table.FeatureList = ot.FeatureList()
    g.table.FeatureList.FeatureRecord = []
    g.table.FeatureList.FeatureCount = 0
    g.table.LookupList = ot.LookupList()
    g.table.LookupList.Lookup = []
    g.table.LookupList.LookupCount = 0
    return g


def _gdef(classdefs):
    gd = newTable("GDEF")
    t = ot.GDEF()
    t.Version = 0x00010000
    cd = ot.GlyphClassDef()
    cd.classDefs = dict(classdefs)
    t.GlyphClassDef = cd
    t.AttachList = None
    t.LigCaretList = None
    t.MarkAttachClassDef = None
    gd.table = t
    return gd


def _build_font(with_gdef=True):
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "base", "bare", "other", "mark"]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({BASE_CP: "base", OTHER_CP: "other", MARK_CP: "mark"})
    fb.setupGlyf({n: _box() for n in order})
    hmtx = {n: (UPM, 0) for n in order}
    hmtx["mark"] = (0, 0)  # zero advance → combining
    fb.setupHorizontalMetrics(hmtx)
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({"familyName": "StripTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    fb.font["GSUB"] = _empty_gsub()
    if with_gdef:
        fb.font["GDEF"] = _gdef({"base": 1, "other": 1})
    return fb.font


def _shaper(font):
    import uharfbuzz as hb

    buf = io.BytesIO()
    font.save(buf)
    raw = buf.getvalue()
    order = TTFont(io.BytesIO(raw)).getGlyphOrder()
    hb_font = hb.Font(hb.Face(raw))

    def shape(text):
        b = hb.Buffer()
        b.add_str(text)
        b.guess_segment_properties()
        hb.shape(hb_font, b)
        return [order[i.codepoint] for i in b.glyph_infos]

    return shape


def test_strip_fires_for_mapped_base():
    font = _build_font()
    assert buildBaseStrip(font, {"base": "bare"}, ["mark"]) == 1
    tagMarksAsGdefMarks(font, ["mark"])
    shape = _shaper(font)
    assert shape(chr(BASE_CP) + chr(MARK_CP)) == ["bare", "mark"]


def test_base_alone_unchanged():
    font = _build_font()
    buildBaseStrip(font, {"base": "bare"}, ["mark"])
    shape = _shaper(font)
    assert shape(chr(BASE_CP)) == ["base"]


def test_unmapped_base_not_stripped():
    font = _build_font()
    buildBaseStrip(font, {"base": "bare"}, ["mark"])
    shape = _shaper(font)
    # 中 is not in the strip coverage → stays itself, mark still stacks.
    assert shape(chr(OTHER_CP) + chr(MARK_CP)) == ["other", "mark"]


def test_gdef_mark_class_set():
    font = _build_font()
    n = tagMarksAsGdefMarks(font, ["mark"])
    assert n == 1
    assert font["GDEF"].table.GlyphClassDef.classDefs["mark"] == 3


def test_registers_under_ccmp():
    font = _build_font()
    buildBaseStrip(font, {"base": "bare"}, ["mark"])
    fl = font["GSUB"].table.FeatureList
    assert any(fr.FeatureTag == "ccmp" for fr in fl.FeatureRecord)


def test_no_gdef_classdef_is_skipped():
    # GDEF present but no GlyphClassDef → must NOT fabricate one.
    font = _build_font(with_gdef=False)
    gd = newTable("GDEF")
    t = ot.GDEF()
    t.Version = 0x00010000
    t.GlyphClassDef = None
    t.AttachList = None
    t.LigCaretList = None
    t.MarkAttachClassDef = None
    gd.table = t
    font["GDEF"] = gd
    assert tagMarksAsGdefMarks(font, ["mark"]) == 0
    assert font["GDEF"].table.GlyphClassDef is None


def test_empty_inputs_noop():
    font = _build_font()
    assert buildBaseStrip(font, {}, ["mark"]) == 0
    assert buildBaseStrip(font, {"base": "bare"}, []) == 0


if __name__ == "__main__":
    import traceback

    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except Exception:
            failed += 1
            print(f"FAIL {t.__name__}")
            traceback.print_exc()
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
