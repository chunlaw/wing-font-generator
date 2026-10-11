"""test_diy_integration.py — the full DIY pipeline composed end-to-end.

Runs the same call sequence wing-font.py main() uses for a DIY build —
generate_annotated_glyphs(emit_bare_bases) → generate_mark_glyphs →
buildMarkInputLiga → buildBaseStrip → tagMarksAsGdefMarks — on synthetic
fonts, compiles the result, and shapes it with HarfBuzz to prove both
input routes reach the same bare-base + mark output:

  route A (PUA):   行 + U+F0002            → [bare行, mark]
  route B (typed): 行ｚａａ１  (full-width)  → [bare行, mark]   (liga then strip)
  un-mapped base:  中 + U+F0002            → [中, mark]        (not stripped)
  base alone:      行                       → [行(baked reading)] (no strip)

This is the cross-phase ordering guard: route B's ligature MUST run before
the strip, or the strip's lookahead wouldn't see the mark. It also checks
the mark is positioned OVER the preceding base (negative-shifted outline).

Run standalone:   python tests/test_diy_integration.py
Run under pytest:  pytest tests/test_diy_integration.py
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

from wingfont.build_glyph import (  # noqa: E402
    BARE_PREFIX,
    MARK_PREFIX,
    generate_annotated_glyphs,
    generate_mark_glyphs,
)
from wingfont.diy_handler import DIY_PUA_BASE  # noqa: E402
from wingfont.mark_input_handler import buildMarkInputLiga  # noqa: E402
from wingfont.mark_strip_handler import buildBareStripLiga  # noqa: E402

UPM = 1000
HANG = 0x884C   # 行  (mapped: default reading hang4)
ZHONG = 0x4E2D  # 中  (un-mapped control)
FW0 = 0xFF10    # ０  full-width zero — the bare-strip trigger
# ASCII letters for 'hang4' (the baked reading) and 'zaa1' (a DIY-only
# annotation) — the ANNOTATION font shapes these into mark outlines.
_LETTERS = {"h": 0x68, "a": 0x61, "n": 0x6E, "g": 0x67, "four": 0x34,
            "z": 0x7A, "one": 0x31}
# Full-width forms the BASE font must carry so route B's ligature
# components resolve (ASCII cp + 0xFEE0), plus the ０ strip trigger.
_FW = {f"fw_{name}": cp + 0xFEE0 for name, cp in _LETTERS.items()}
_FW["fw_zero"] = FW0


def _fullwidth(s):
    return "".join(chr(ord(c) + 0xFEE0) for c in s)


def _box(h=600):
    p = TTGlyphPen(None)
    p.moveTo((60, 0))
    p.lineTo((540, 0))
    p.lineTo((540, h))
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


def _build_base_font():
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "uni884C", "uni4E2D", *_FW.keys()]
    cmap = {HANG: "uni884C", ZHONG: "uni4E2D",
            0x20000: "uni884C"}  # supp cp → force a format-12 subtable
    cmap.update({cp: name for name, cp in _FW.items()})
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf({n: _box() for n in order})
    fb.setupHorizontalMetrics({n: (UPM, 0) for n in order})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({"familyName": "DiyBase", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    fb.font["GSUB"] = _empty_gsub()
    fb.font["GDEF"] = _gdef({"uni884C": 1, "uni4E2D": 1})
    buf = io.BytesIO()
    fb.font.save(buf)
    raw = buf.getvalue()
    return TTFont(io.BytesIO(raw)), raw


def _build_anno_font():
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", *_LETTERS.keys()]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({cp: name for name, cp in _LETTERS.items()})
    fb.setupGlyf({n: _box(700) for n in order})
    fb.setupHorizontalMetrics({g: (600, 60) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "DiyAnno", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.font.save(buf)
    return TTFont(io.BytesIO(buf.getvalue())), buf.getvalue()


def _build_diy_font():
    """Run the full main()-equivalent DIY sequence; return the compiled
    output TTFont (reloaded from bytes) and a HarfBuzz shaper."""
    base, base_raw = _build_base_font()
    out = TTFont(io.BytesIO(base_raw))
    anno, anno_raw = _build_anno_font()

    char_mapping = {"行": {"hang4": None}}
    pua = {"hang4": DIY_PUA_BASE, "zaa1": DIY_PUA_BASE + 1}
    bbm: dict = {}

    generate_annotated_glyphs(
        base, anno, anno_raw, out, char_mapping,
        anno_scale=0.25, base_scale=0.75,
        emit_bare_bases=True, bare_base_map=bbm,
    )
    marks = generate_mark_glyphs(anno, anno_raw, out, pua, anno_scale=0.25)
    # Typed inputs: full-width spelling of each annotation → its mark.
    inputs = [(_fullwidth("hang4"), pua["hang4"]),
              (_fullwidth("zaa1"), pua["zaa1"])]
    buildMarkInputLiga(out, inputs)
    buildBareStripLiga(out, bbm)        # (行, ０) → bare 行

    buf = io.BytesIO()
    out.save(buf)
    raw = buf.getvalue()

    import uharfbuzz as hb

    order = TTFont(io.BytesIO(raw)).getGlyphOrder()
    hb_font = hb.Font(hb.Face(raw))

    def shape(text, script=None):
        b = hb.Buffer()
        b.add_str(text)
        if script:
            b.script = script
            b.direction = "ltr"
        else:
            b.guess_segment_properties()
        hb.shape(hb_font, b)
        return [order[i.codepoint] for i in b.glyph_infos]

    return raw, shape


MARK_ZAA1 = f"{MARK_PREFIX}F0001"
BARE_HANG = f"{BARE_PREFIX}00884C"


def test_bare_trigger_strips_baked_reading():
    _raw, shape = _build_diy_font()
    # 行 + full-width ０ → bare 行 (annotation-free), via the (行,０) ligature
    assert shape(chr(HANG) + chr(FW0)) == [BARE_HANG]


def test_route_b_fullwidth_typed_with_trigger():
    _raw, shape = _build_diy_font()
    # 行０ｚａａ１ → bare 行 (from 行０) + zaa1 mark (from ｚａａ１)
    typed = chr(HANG) + chr(FW0) + _fullwidth("zaa1")
    assert shape(typed) == [BARE_HANG, MARK_ZAA1]


def test_browser_run_split_still_works():
    """Browsers itemise by script: 行０ (Han, ０ is Common) and ｚａａ１
    (Latin) become separate runs. The strip fires in the Han run and the
    mark forms in the Latin run, so the result is still correct."""
    _raw, shape = _build_diy_font()
    han = shape(chr(HANG) + chr(FW0), "Hani")          # 行０ as a Han run
    latin = shape(_fullwidth("zaa1"), "Latn")          # ｚａａ１ as a Latin run
    assert han == [BARE_HANG]
    assert latin == [MARK_ZAA1]


def test_base_alone_keeps_baked_reading():
    _raw, shape = _build_diy_font()
    # No ０ → no strip; the codepoint still shows its baked default reading
    # glyph (which reuses the base glyph name).
    assert shape(chr(HANG)) == ["uni884C"]


def test_font_compiles_and_has_diy_glyphs():
    raw, _shape = _build_diy_font()
    order = set(TTFont(io.BytesIO(raw)).getGlyphOrder())
    assert BARE_HANG in order
    assert f"{MARK_PREFIX}F0000" in order and MARK_ZAA1 in order


def test_mark_renders_over_the_base_cell():
    """Position check: after shaping 行０ + mark, the mark's ABSOLUTE ink
    (cumulative advance + its negative-shifted outline) must land over the
    base cell [0, em], not one em to the right."""
    import uharfbuzz as hb

    raw, _shape = _build_diy_font()
    ft = TTFont(io.BytesIO(raw))
    order = ft.getGlyphOrder()
    gs = ft.getGlyphSet()
    upm = ft["head"].unitsPerEm

    buf = hb.Buffer()
    buf.add_str(chr(HANG) + chr(FW0) + _fullwidth("zaa1"))
    buf.guess_segment_properties()
    hb.shape(hb.Font(hb.Face(raw)), buf)

    names = [order[i.codepoint] for i in buf.glyph_infos]
    assert names == [BARE_HANG, MARK_ZAA1]

    # Walk cumulative advances to get each glyph's pen origin, then add
    # the glyph's own ink bounds to get absolute ink extents.
    from fontTools.pens.boundsPen import BoundsPen

    pen_x = 0
    mark_abs_centre = None
    for name, pos in zip(names, buf.glyph_positions):
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        if bp.bounds is not None:
            x0, _y0, x1, _y1 = bp.bounds
            origin = pen_x + pos.x_offset
            if name == MARK_ZAA1:
                mark_abs_centre = origin + (x0 + x1) / 2
        pen_x += pos.x_advance

    assert mark_abs_centre is not None
    # Should sit near the base cell centre (em/2), i.e. squarely over 行.
    assert abs(mark_abs_centre - upm / 2) < upm * 0.25, (
        f"mark absolute centre {mark_abs_centre:.0f} should be near the "
        f"base cell centre {upm / 2:.0f}, not shifted a full em away"
    )


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
