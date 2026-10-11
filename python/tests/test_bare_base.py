"""test_bare_base.py — hermetic tests for the DIY bare scaled-base glyphs
emitted by build_glyph.generate_annotated_glyphs(emit_bare_bases=True).

A mapped char's default glyph carries its baked default reading; the
manual annotation path needs an annotation-free scaled base to stack a
mark on. These tests build tiny synthetic fonts and assert the bare glyph
is emitted, centred, annotation-free, advance-preserving, recorded in
bare_base_map, and gated off by default.

Run standalone:   python tests/test_bare_base.py
Run under pytest:  pytest tests/test_bare_base.py
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

from wingfont.build_glyph import BARE_PREFIX, generate_annotated_glyphs  # noqa: E402

UPM = 1000
HANG = 0x884C  # 行
# A full-width CJK-ish base box, centred in the 1000-unit em.
_BASE_CONTOUR = [(80, 0), (920, 0), (920, 840), (80, 840)]
_LETTER_CONTOUR = [(50, 0), (550, 0), (550, 700), (50, 700)]


def _simple_glyph(contour):
    pen = TTGlyphPen(None)
    pen.moveTo(contour[0])
    for pt in contour[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return pen.glyph()


def _build_base_font():
    fb = FontBuilder(UPM, isTTF=True)
    order = [".notdef", "uni884C"]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({HANG: "uni884C"})
    fb.setupGlyf(
        {".notdef": TTGlyphPen(None).glyph(), "uni884C": _simple_glyph(_BASE_CONTOUR)}
    )
    fb.setupHorizontalMetrics({".notdef": (UPM, 0), "uni884C": (UPM, 80)})
    fb.setupHorizontalHeader(ascent=880, descent=-120)
    fb.setupNameTable({"familyName": "BaseTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.font.save(buf)
    raw = buf.getvalue()
    return TTFont(io.BytesIO(raw)), raw


def _build_anno_font():
    """Letters for 'hang4' (h a n g 4), each a centred box."""
    fb = FontBuilder(UPM, isTTF=True)
    letters = {"h": 0x68, "a": 0x61, "n": 0x6E, "g": 0x67, "four": 0x34}
    order = [".notdef", *letters.keys()]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({cp: name for name, cp in letters.items()})
    glyfs = {".notdef": TTGlyphPen(None).glyph()}
    for name in letters:
        glyfs[name] = _simple_glyph(_LETTER_CONTOUR)
    fb.setupGlyf(glyfs)
    fb.setupHorizontalMetrics({g: (600, 50) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "AnnoTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.font.save(buf)
    return TTFont(io.BytesIO(buf.getvalue())), buf.getvalue()


def _run(emit_bare_bases, cell_width=1.0):
    base, base_raw = _build_base_font()
    out = TTFont(io.BytesIO(base_raw))  # output starts as a copy of base
    anno, anno_raw = _build_anno_font()
    mapping = {"行": {"hang4": None}}
    bbm: dict = {}
    generate_annotated_glyphs(
        base, anno, anno_raw, out, mapping,
        anno_scale=0.25, base_scale=0.75,
        emit_bare_bases=emit_bare_bases, bare_base_map=bbm,
        cell_width=cell_width,
    )
    return out, bbm


def test_bare_emitted_and_mapped():
    out, bbm = _run(emit_bare_bases=True)
    assert bbm == {"uni884C": f"{BARE_PREFIX}00884C"}
    assert f"{BARE_PREFIX}00884C" in set(out.getGlyphOrder())


def test_bare_preserves_advance():
    out, bbm = _run(emit_bare_bases=True)
    adv, _lsb = out["hmtx"][bbm["uni884C"]]
    assert adv == UPM, f"bare base should keep full advance, got {adv}"


def test_bare_is_annotation_free():
    out, bbm = _run(emit_bare_bases=True)
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[bbm["uni884C"]].draw(bp)
    _x0, _y0, _x1, y1 = bp.bounds
    # Base box 840u scaled 0.75 → ~630u tall, nothing up in the
    # annotation band (~800u). The baked variant-0 glyph (uni884C) WOULD
    # have ink up there; the bare one must not.
    assert y1 < 0.75 * UPM, f"bare base must carry no annotation (y1={y1:.0f})"


def test_bare_is_centred():
    out, bbm = _run(emit_bare_bases=True)
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[bbm["uni884C"]].draw(bp)
    x0, _y0, x1, _y1 = bp.bounds
    centre = (x0 + x1) / 2
    assert abs(centre - UPM / 2) < 5, (
        f"bare base ink centre {centre:.0f} should match the em centre "
        f"{UPM / 2:.0f} (so it sits where the composite base ends up)"
    )


def test_baked_variant_still_has_annotation():
    # Sanity: variant 0 still bakes its reading into the codepoint glyph,
    # so the bare glyph is genuinely an ADDITION, not a replacement.
    out, _bbm = _run(emit_bare_bases=True)
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs["uni884C"].draw(bp)
    _x0, _y0, _x1, y1 = bp.bounds
    assert y1 > 0.75 * UPM, "variant-0 glyph should still carry its baked annotation"


def test_gated_off_by_default():
    out, bbm = _run(emit_bare_bases=False)
    assert bbm == {}
    assert not any(n.startswith(BARE_PREFIX) for n in out.getGlyphOrder())


def test_cell_width_widens_and_centres():
    # --cell-width 1.2: baked and bare glyphs both get a 1200u advance,
    # and the bare base's ink is centred in the wider cell.
    out, bbm = _run(emit_bare_bases=True, cell_width=1.2)
    assert out["hmtx"]["uni884C"][0] == 1200
    adv, lsb = out["hmtx"][bbm["uni884C"]]
    assert adv == 1200
    gs = out.getGlyphSet()
    bp = BoundsPen(gs)
    gs[bbm["uni884C"]].draw(bp)
    x0, _y0, x1, _y1 = bp.bounds
    assert abs((x0 + x1) / 2 - 600) < 5


def test_cell_width_auto():
    # Auto (None): 8 letters x 600u x 0.25 = 1200u -> 1.20 em + 0.05 gap
    # -> 1.25. The two-syllable reading (has a space) is ignored.
    base, base_raw = _build_base_font()
    out = TTFont(io.BytesIO(base_raw))
    anno, anno_raw = _build_anno_font()
    metrics: dict = {}
    generate_annotated_glyphs(
        base, anno, anno_raw, out,
        {"行": {"hanghang": None, "hang4 hang4 hang4": None}},
        anno_scale=0.25, base_scale=0.75, cell_width=None,
        char_metrics=metrics,
    )
    assert metrics["cell_width"] == 1.25
    assert out["hmtx"]["uni884C"][0] == 1250


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
