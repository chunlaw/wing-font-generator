"""
test_composite_glyphs.py — regression guard for composite annotation /
base glyphs (e.g. precomposed long vowels ā/ī/ū = base + combining macron).

Background
----------
`build_glyph` composes a word/character variant by drawing each source
glyph into a single `TTGlyphPen` through a `TransformPen` (annotation row
scaled by `anno_scale`, base row by `base_scale`). When a source glyph is
a *composite* (its outline is stored as component references — the way
Noto Serif stores ``amacron`` = ``a`` + ``uni02C9``), drawing it straight
into the pen forwards ``addComponent()`` calls. The TTGlyphPen records
those as component references rather than contours, so:

  * the component's own offset bypasses the surrounding annotation/base
    scale, and
  * when the composite is merged with the other (contour) glyphs of the
    word, those components are dropped or mis-placed.

Symptom in shipped fonts: every long vowel ``ā``/``ī``/``ū`` collapsed to
a small, low base letter with the following consonant detached
(``as-salām`` rendered as ``as-salₐ m``). Short vowels and consonants
(simple glyphs) were unaffected.

Fix: `build_glyph._draw_decomposed` flattens composites to contours
(via `DecomposingRecordingPen`) before they hit the `TransformPen`, so the
surrounding scale applies uniformly. For simple glyphs it is a no-op.

These tests build a tiny synthetic font in-memory (a simple base glyph, a
simple mark glyph, and a composite of the two) so they are hermetic — no
input-font download required — and assert both that the fix flattens the
composite and that simple glyphs are drawn byte-for-byte as before (so the
existing CJK fonts can't silently regress).

Run standalone:   python tests/test_composite_glyphs.py
Run under pytest: pytest tests/test_composite_glyphs.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

# Make the repo root importable so `build_glyph` resolves when this file
# is run directly (python tests/test_composite_glyphs.py) or by pytest.
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from wingfont.build_glyph import _draw_decomposed  # noqa: E402

# Geometry of the synthetic font, in font units (UPM 1000).
_BASE_CONTOUR = [(100, 0), (400, 0), (400, 700), (100, 700)]   # the "a"
_MARK_CONTOUR = [(100, 750), (400, 750), (400, 800), (100, 800)]  # the macron
_MARK_X_OFFSET = 50  # component x-shift of the macron inside the composite
_SCALE = 0.25        # stand-in for anno_scale_eff


def _simple_glyph(contour):
    pen = TTGlyphPen(None)
    pen.moveTo(contour[0])
    for pt in contour[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return pen.glyph()


def _build_synthetic_font():
    """A 4-glyph TTF: .notdef, A (simple), macron (simple),
    Amacron (composite = A + macron offset)."""
    fb = FontBuilder(1000, isTTF=True)
    order = [".notdef", "A", "macron", "Amacron"]
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({0x41: "A", 0x0304: "macron", 0x0100: "Amacron"})

    composite = Glyph()
    composite.numberOfContours = -1
    composite.components = []
    for name, xoff in (("A", 0), ("macron", _MARK_X_OFFSET)):
        comp = GlyphComponent()
        comp.glyphName = name
        comp.x, comp.y = xoff, 0
        comp.flags = 0
        composite.components.append(comp)

    fb.setupGlyf(
        {
            ".notdef": TTGlyphPen(None).glyph(),
            "A": _simple_glyph(_BASE_CONTOUR),
            "macron": _simple_glyph(_MARK_CONTOUR),
            "Amacron": composite,
        }
    )
    fb.setupHorizontalMetrics({g: (500, 0) for g in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({"familyName": "CompositeRegressionTest", "styleName": "R"})
    fb.setupOS2()
    fb.setupPost()
    return fb.font


def test_old_path_reproduces_the_bug():
    """Sanity anchor: drawing the composite *directly* into a TTGlyphPen
    (the pre-fix behaviour) produces component references, not contours.
    This documents exactly what the fix must avoid."""
    gs = _build_synthetic_font().getGlyphSet()
    pen = TTGlyphPen(gs)
    gs["Amacron"].draw(TransformPen(pen, (_SCALE, 0, 0, _SCALE, 0, 0)))
    glyph = pen.glyph()
    assert glyph.isComposite(), "expected the unfixed path to emit components"
    assert {c.glyphName for c in glyph.components} == {"A", "macron"}


def test_decompose_flattens_composite():
    """The fix: _draw_decomposed turns the composite into plain, correctly
    scaled contours — the macron is retained, not dropped."""
    gs = _build_synthetic_font().getGlyphSet()
    pen = TTGlyphPen(gs)
    _draw_decomposed(gs, "Amacron", TransformPen(pen, (_SCALE, 0, 0, _SCALE, 0, 0)))
    glyph = pen.glyph()

    assert not glyph.isComposite(), "composite must be flattened to contours"
    assert glyph.numberOfContours == 2, (
        f"expected base + macron = 2 contours, got {glyph.numberOfContours} "
        "(the macron component was dropped — this is the ā/ī/ū bug)"
    )

    # The macron contour must survive AND land at the scaled position
    # (~y 187-200 = 750-800 * 0.25), proving the surrounding scale was
    # applied to the component rather than bypassed.
    bp = BoundsPen(gs)
    _draw_decomposed(gs, "Amacron", TransformPen(bp, (_SCALE, 0, 0, _SCALE, 0, 0)))
    _x0, _y0, _x1, top = bp.bounds
    assert abs(top - _MARK_CONTOUR[2][1] * _SCALE) < 1.0, (
        f"macron top at {top}, expected ~{_MARK_CONTOUR[2][1] * _SCALE}"
    )


def test_simple_glyph_is_unchanged():
    """Guard against CJK regressions: for a *simple* source glyph,
    _draw_decomposed must emit exactly the same pen calls as a direct
    draw — i.e. the fix is a no-op for non-composite glyphs."""
    gs = _build_synthetic_font().getGlyphSet()
    transform = (_SCALE, 0, 0, _SCALE, 0, 0)

    direct = RecordingPen()
    gs["A"].draw(TransformPen(direct, transform))

    via_fix = RecordingPen()
    _draw_decomposed(gs, "A", TransformPen(via_fix, transform))

    assert via_fix.value == direct.value, (
        "decompose path altered a simple glyph — existing fonts would change"
    )


def test_merged_word_keeps_every_contour():
    """End-to-end shape of the bug: when a composite is merged with other
    (simple) glyphs into one word glyph, every contour must survive AND
    land at its correctly scaled position.

    A plain contour-count check is not enough — when contours and
    components are mixed in one TTGlyphPen, fontTools decomposes the
    components, so the count can look right while the component's own
    offset is applied in the wrong coordinate space (the macron drifts).
    We pin the macron's x-position to catch that drift."""
    gs = _build_synthetic_font().getGlyphSet()
    pen = TTGlyphPen(gs)
    # Simple 'A' at x=0, then composite 'Amacron' at x=200 — side by side,
    # the way the annotation walk lays out a run.
    _draw_decomposed(gs, "A", TransformPen(pen, (_SCALE, 0, 0, _SCALE, 0, 0)))
    _draw_decomposed(gs, "Amacron", TransformPen(pen, (_SCALE, 0, 0, _SCALE, 200, 0)))
    glyph = pen.glyph()

    assert not glyph.isComposite()
    assert glyph.numberOfContours == 3, (
        f"expected 1 (A) + 2 (Amacron) = 3 contours, got {glyph.numberOfContours}"
    )

    # Identify the macron contour (the topmost ink) and assert its left
    # edge sits where the scale+offset put it:
    #   base x100 -> *0.25 = 25 ; component offset 50 -> *0.25 = 12.5 ;
    #   run translate 200  ->  25 + 12.5 + 200 = 237.5
    contours = _contour_bounds(glyph)
    macron = max(contours, key=lambda b: b[3])  # largest max-y
    expected_left = (
        _MARK_CONTOUR[0][0] * _SCALE + _MARK_X_OFFSET * _SCALE + 200
    )
    assert abs(macron[0] - expected_left) < 1.0, (
        f"macron left edge at {macron[0]}, expected ~{expected_left} "
        "(component offset applied in the wrong coordinate space)"
    )


def _contour_bounds(glyph):
    """(min_x, min_y, max_x, max_y) per contour of a simple glyf Glyph."""
    coords, ends = glyph.coordinates, glyph.endPtsOfContours
    out, start = [], 0
    for end in ends:
        pts = coords[start : end + 1]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        out.append((min(xs), min(ys), max(xs), max(ys)))
        start = end + 1
    return out


def main() -> int:
    tests = [
        test_old_path_reproduces_the_bug,
        test_decompose_flattens_composite,
        test_simple_glyph_is_unchanged,
        test_merged_word_keeps_every_contour,
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
