"""test_mark_glyphs.py — hermetic tests for build_glyph.generate_mark_glyphs
(the DIY manual-annotation path).

Builds two tiny synthetic fonts in-memory — an "annotation" font whose
ASCII letters HarfBuzz can shape, and an "output" font with a format-12
cmap (so Plane-15 PUA codepoints fit) — then composes mark glyphs for a
couple of annotation strings and asserts the invariants the design
guarantees: zero advance (combining), a PUA cmap entry, ink centred in
the em, glyph-order sync, and ascent metrics tracked.

Run standalone:   python tests/test_mark_glyphs.py
Run under pytest:  pytest tests/test_mark_glyphs.py
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.build_glyph import MARK_PREFIX, generate_mark_glyphs  # noqa: E402
from wingfont.diy_handler import DIY_PUA_BASE  # noqa: E402

UPM = 1000
LETTER_ADV = 600
# Letter ink centred in its advance (centre x = 300 = LETTER_ADV/2) so a
# shaped block of letters has ink centred on the block's geometric centre.
_LETTER_CONTOUR = [(50, 0), (550, 0), (550, 700), (50, 700)]


def _simple_glyph(contour):
    pen = TTGlyphPen(None)
    pen.moveTo(contour[0])
    for pt in contour[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return pen.glyph()


def _build_anno_font():
    """Annotation font: ASCII letters a, z, 1 (each a centred box) so
    HarfBuzz can shape strings like 'zaa1' / 'aa1'. Returns (TTFont,
    raw_bytes)."""
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "a", "z", "one"]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({0x61: "a", 0x7A: "z", 0x31: "one"})
    fb.setupGlyf(
        {
            ".notdef": TTGlyphPen(None).glyph(),
            "a": _simple_glyph(_LETTER_CONTOUR),
            "z": _simple_glyph(_LETTER_CONTOUR),
            "one": _simple_glyph(_LETTER_CONTOUR),
        }
    )
    fb.setupHorizontalMetrics({g: (LETTER_ADV, 50) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "AnnoTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.font.save(buf)
    return TTFont(io.BytesIO(buf.getvalue())), buf.getvalue()


def _build_output_font():
    """Output (base) font with a format-12 cmap subtable so Plane-15 PUA
    codepoints can be mapped. One full-width base glyph is enough."""
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "uni4E00"]
    fb.setupGlyphOrder(order)
    # Include a supplementary-plane entry so FontBuilder emits a
    # format-12 (segmented) subtable, which is what _add_cmap_entry needs
    # for the Plane-15 PUA marks.
    fb.setupCharacterMap({0x4E00: "uni4E00", 0x20000: "uni4E00"})
    fb.setupGlyf(
        {
            ".notdef": TTGlyphPen(None).glyph(),
            "uni4E00": _simple_glyph([(80, 0), (920, 0), (920, 840), (80, 840)]),
        }
    )
    fb.setupHorizontalMetrics({".notdef": (UPM, 0), "uni4E00": (UPM, 80)})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({"familyName": "OutTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    return fb.font


def _run(pua_map, **kw):
    anno_font, anno_bytes = _build_anno_font()
    out = _build_output_font()
    metrics: dict = {}
    names = generate_mark_glyphs(
        anno_font, anno_bytes, out, pua_map,
        anno_scale=0.25, char_metrics=metrics, **kw,
    )
    return out, names, metrics


def test_names_and_count():
    pua = {"zaa1": DIY_PUA_BASE, "aa1": DIY_PUA_BASE + 1}
    out, names, _ = _run(pua)
    # one mark per entry, named by codepoint hex, ordered by codepoint
    assert names == [f"{MARK_PREFIX}F0000", f"{MARK_PREFIX}F0001"]
    # synced into the font glyph order
    order = set(out.getGlyphOrder())
    assert all(n in order for n in names)


def test_zero_advance_combining():
    pua = {"zaa1": DIY_PUA_BASE}
    out, names, _ = _run(pua)
    adv, _lsb = out["hmtx"][names[0]]
    assert adv == 0, f"mark must be zero-advance (combining), got {adv}"


def test_mark_has_cmap_route():
    # Apps without GSUB (PowerPoint) reach a mark through a BMP PUA
    # carrier (+ IVS past the first of each 241-block); Plane-15 PUA
    # doesn't render in Windows PowerPoint.
    pua = {"a1": DIY_PUA_BASE, "zaa1": DIY_PUA_BASE + 1, "x": DIY_PUA_BASE + 241}
    out, names, _ = _run(pua)
    cmap = out.getBestCmap()
    uvs = next(t for t in out["cmap"].tables if t.format == 14).uvsDict
    assert cmap[0xE000] == names[0]
    assert (0xE000, names[1]) in uvs[0xE0100]
    assert cmap[0xE001] == names[2]


def test_ink_centred_over_preceding_em():
    # The mark is a trailing zero-advance glyph drawn one em to the RIGHT
    # of the base cell, so its outline is shifted back by one em: the ink
    # centre sits near -em/2 in the mark's own space, which renders at the
    # base cell centre (em + (-em/2) = em/2), over the x-centred bare base.
    pua = {"zaa1": DIY_PUA_BASE}
    out, names, _ = _run(pua)
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[names[0]].draw(bp)
    x0, _y0, x1, _y1 = bp.bounds
    centre = (x0 + x1) / 2
    assert abs(centre - (-UPM / 2)) < 40, (
        f"mark ink centre {centre:.0f} should sit near -em/2 "
        f"({-UPM / 2:.0f}) so it overlaps the preceding base cell centre"
    )


def _mark_ink_centre(out, name):
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, _y0, x1, _y1 = bp.bounds
    return (x0 + x1) / 2


def test_mark_x_offset_shifts_ink_by_em_fraction():
    # The knob is expressed as a fraction of the output em; a negative
    # value moves the mark LEFT by exactly offset * UPM, length-independent.
    pua = {"zaa1": DIY_PUA_BASE}
    out0, names0, _ = _run(pua)
    outL, namesL, _ = _run(pua, mark_x_offset=-0.0625)
    c0 = _mark_ink_centre(out0, names0[0])
    cL = _mark_ink_centre(outL, namesL[0])
    assert abs((cL - c0) - (-0.0625 * UPM)) < 1.0, (
        f"offset -0.0625em should move ink centre by {-0.0625 * UPM:.0f}; "
        f"got {cL - c0:.1f}"
    )


def test_mark_x_offset_default_is_zero():
    # Default must be a no-op (Word-favoured geometric centre) so existing
    # builds are byte-for-byte unchanged.
    pua = {"zaa1": DIY_PUA_BASE}
    out_default, names_d, _ = _run(pua)
    out_explicit, names_e, _ = _run(pua, mark_x_offset=0.0)
    assert (
        _mark_ink_centre(out_default, names_d[0])
        == _mark_ink_centre(out_explicit, names_e[0])
    )


def test_mark_x_offset_keeps_lsb_eq_xmin():
    # lsb MUST track the (shifted) outline xMin — this is what makes
    # browsers, which position the orphaned cross-run mark relative to lsb,
    # honour the baked position at all.
    pua = {"zaa1": DIY_PUA_BASE}
    out, names, _ = _run(pua, mark_x_offset=-0.0625)
    adv, lsb = out["hmtx"][names[0]]
    assert adv == 0
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[names[0]].draw(bp)
    outline_xmin = round(bp.bounds[0])
    assert lsb == outline_xmin, (
        f"lsb {lsb} must equal the shifted outline xMin {outline_xmin}"
    )


def test_ink_sits_at_annotation_height():
    pua = {"zaa1": DIY_PUA_BASE}
    out, names, _ = _run(pua)
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[names[0]].draw(bp)
    _x0, y0, _x1, _y1 = bp.bounds
    # default upper_y_offset_ratio 0.8 → baseline at y=800; letters draw
    # upward from there.
    assert y0 >= 0.75 * UPM, f"mark should sit high (got y0={y0:.0f})"


def test_char_metrics_tracked():
    pua = {"zaa1": DIY_PUA_BASE}
    _out, _names, metrics = _run(pua)
    assert metrics.get("max_y", 0) > 0.75 * UPM


def test_empty_map_noop():
    out = _build_output_font()
    before = list(out.getGlyphOrder())
    anno_font, anno_bytes = _build_anno_font()
    names = generate_mark_glyphs(anno_font, anno_bytes, out, {})
    assert names == []
    assert list(out.getGlyphOrder()) == before


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
