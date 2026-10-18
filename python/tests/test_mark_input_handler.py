"""test_mark_input_handler.py — typed-input ligation (route B).

buildMarkInputLiga now takes explicit `(input_string, codepoint)` pairs
(from diy_handler) and ligates the input glyphs verbatim — full-width or
otherwise. These tests build a font with the needed input glyphs + the
mark glyphs (from generate_mark_glyphs) and assert the ligatures, ccmp
registration, and skip behaviour.

Run standalone:   python tests/test_mark_input_handler.py
Run under pytest:  pytest tests/test_mark_input_handler.py
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

from wingfont.build_glyph import MARK_PREFIX, generate_mark_glyphs  # noqa: E402
from wingfont.diy_handler import DIY_PUA_BASE  # noqa: E402
from wingfont.mark_input_handler import buildMarkInputLiga  # noqa: E402

UPM = 1000
_BOX = [(50, 0), (550, 0), (550, 700), (50, 700)]
# Full-width forms for 'jat1'/'zaa1' + a couple of half-width ASCII for an
# explicit non-full-width input test.
FW = {"fj": 0xFF4A, "fa": 0xFF41, "ft": 0xFF54, "fz": 0xFF5A, "f1": 0xFF11}
ASCII = {"x": 0x78, "y": 0x79}
ANNO_LETTERS = {"j": 0x6A, "a": 0x61, "t": 0x74, "one": 0x31, "z": 0x7A}


def _fw(s):
    return "".join(chr(ord(c) + 0xFEE0) for c in s)


def _glyph(contour=_BOX):
    pen = TTGlyphPen(None)
    pen.moveTo(contour[0])
    for pt in contour[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return pen.glyph()


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


def _build_anno_font():
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", *ANNO_LETTERS.keys()]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({cp: name for name, cp in ANNO_LETTERS.items()})
    fb.setupGlyf({n: _glyph() for n in order})
    fb.setupHorizontalMetrics({g: (600, 50) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "AnnoTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.font.save(buf)
    return TTFont(io.BytesIO(buf.getvalue())), buf.getvalue()


def _build_output_font(include_fullwidth=True, include_ascii=True):
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "uni4E00"]
    cmap = {0x4E00: "uni4E00", 0x20000: "uni4E00"}  # supp cp → fmt-12
    if include_fullwidth:
        for name, cp in FW.items():
            order.append(name)
            cmap[cp] = name
    if include_ascii:
        for name, cp in ASCII.items():
            order.append(name)
            cmap[cp] = name
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf({n: _glyph() for n in order})
    fb.setupHorizontalMetrics({n: (UPM, 0) for n in order})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({"familyName": "OutTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    fb.font["GSUB"] = _empty_gsub()
    return fb.font


def _ligature_map(font):
    gsub = font["GSUB"].table
    out = {}
    for lk in gsub.LookupList.Lookup:
        for st in lk.SubTable:
            for first, ligs in getattr(st, "ligatures", {}).items():
                for lg in ligs:
                    out[(first, *lg.Component)] = lg.LigGlyph
    return out


def _has_feature(font, tag):
    fl = font["GSUB"].table.FeatureList
    return any(fr.FeatureTag == tag for fr in fl.FeatureRecord)


def _setup(pua, **out_kw):
    out = _build_output_font(**out_kw)
    anno, anno_bytes = _build_anno_font()
    generate_mark_glyphs(anno, anno_bytes, out, pua, anno_scale=0.25)
    return out


def test_fullwidth_inputs_ligate_to_marks():
    pua = {"jat1": DIY_PUA_BASE, "zaa1": DIY_PUA_BASE + 1}
    out = _setup(pua)
    inputs = [(_fw("jat1"), DIY_PUA_BASE), (_fw("zaa1"), DIY_PUA_BASE + 1)]
    assert buildMarkInputLiga(out, inputs) == 2
    ligs = _ligature_map(out)
    assert ligs.get(("fj", "fa", "ft", "f1")) == f"{MARK_PREFIX}F0000"
    assert ligs.get(("fz", "fa", "fa", "f1")) == f"{MARK_PREFIX}F0001"


def test_explicit_nonfullwidth_input_ligates_verbatim():
    # An explicit ASCII input 'xy' → mark, ligated verbatim (no transform).
    pua = {"zaa1": DIY_PUA_BASE}
    out = _setup(pua)
    assert buildMarkInputLiga(out, [("xy", DIY_PUA_BASE)]) == 1
    ligs = _ligature_map(out)
    assert ligs.get(("x", "y")) == f"{MARK_PREFIX}F0000"


def test_registers_under_ccmp_and_compiles():
    pua = {"jat1": DIY_PUA_BASE}
    out = _setup(pua)
    buildMarkInputLiga(out, [(_fw("jat1"), DIY_PUA_BASE)])
    assert _has_feature(out, "ccmp")
    buf = io.BytesIO()
    out.save(buf)
    assert buf.getvalue()


def test_unresolvable_input_glyph_is_skipped():
    # 'q' has no glyph in the font → that input is skipped; the resolvable
    # one still ligates.
    pua = {"jat1": DIY_PUA_BASE, "zaa1": DIY_PUA_BASE + 1}
    out = _setup(pua)
    inputs = [(_fw("jat1"), DIY_PUA_BASE), ("qq", DIY_PUA_BASE + 1)]
    assert buildMarkInputLiga(out, inputs) == 1
    ligs = _ligature_map(out)
    assert ligs.get(("fj", "fa", "ft", "f1")) == f"{MARK_PREFIX}F0000"
    assert not any(c == f"{MARK_PREFIX}F0001" for c in ligs.values())


def test_empty_inputs_returns_zero():
    out = _build_output_font()
    assert buildMarkInputLiga(out, []) == 0


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
