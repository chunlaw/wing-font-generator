"""
test_vertical_metrics.py — regression guard for `_auto_extend_vertical_metrics`.

Word-unit fonts (Arabic/Thai base) add a whole extra annotation row, so the
output font's vertical metrics must grow to contain it. The subtlety is that
the base fonts ship with `USE_TYPO_METRICS` set, so multi-line layout in most
apps (Chrome, Firefox, Word, InDesign) derives line height from
sTypoAscender/Descender — NOT win/hhea. If only win/hhea were extended (the
old behaviour), the reserved line box stayed shallower than the annotation
ink and the annotation row collided with the next line under tightened line
spacing.

These tests assert:
  * all three descent families (hhea.descent, OS/2.usWinDescent,
    OS/2.sTypoDescender) are extended together when the ink floor is deeper,
  * the same for the ascent side (inverted / above-the-word builds),
  * metrics that already cover the ink are left alone, and
  * an empty `word_metrics` (the CJK single-character path) changes nothing —
    so the existing CJK / Urdu-on-CJK fonts keep their native line spacing.

Hermetic: builds a tiny synthetic font in-memory; no input fonts required.

Run standalone:   python tests/test_vertical_metrics.py
Run under pytest: pytest tests/test_vertical_metrics.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

REPO_ROOT = Path(__file__).resolve().parent.parent
# python/ must be importable so `import wingfont` resolves.
sys.path.insert(0, str(REPO_ROOT))


def _load_extend_fn():
    """Import `_auto_extend_vertical_metrics` from wingfont.cli."""
    from wingfont import cli as mod
    return mod._auto_extend_vertical_metrics


_auto_extend_vertical_metrics = _load_extend_fn()

# Stand-in for a base font's native metrics (UPM 1000). Descent/ascent are
# intentionally shallower than the annotation ink the tests feed in.
_BASE_ASCENT = 800
_BASE_DESCENT = -200
_BASE_TYPO_ASC = 800
_BASE_TYPO_DESC = -200
_BASE_WIN_ASC = 800
_BASE_WIN_DESC = 200


def _make_font():
    fb = FontBuilder(1000, isTTF=True)
    fb.setupGlyphOrder([".notdef", "A"])
    fb.setupCharacterMap({0x41: "A"})
    pen = TTGlyphPen(None)
    pen.moveTo((0, 0))
    pen.lineTo((300, 0))
    pen.lineTo((300, 700))
    pen.closePath()
    fb.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "A": pen.glyph()})
    fb.setupHorizontalMetrics({".notdef": (500, 0), "A": (500, 0)})
    fb.setupHorizontalHeader(ascent=_BASE_ASCENT, descent=_BASE_DESCENT)
    fb.setupNameTable({"familyName": "VMetricsTest", "styleName": "R"})
    fb.setupOS2(
        sTypoAscender=_BASE_TYPO_ASC,
        sTypoDescender=_BASE_TYPO_DESC,
        usWinAscent=_BASE_WIN_ASC,
        usWinDescent=_BASE_WIN_DESC,
    )
    fb.setupPost()
    return fb.font


def test_below_annotation_extends_all_descent_families():
    """A below-the-word annotation deeper than the base descent must push
    hhea.descent, usWinDescent AND sTypoDescender together (margin 20)."""
    font = _make_font()
    _auto_extend_vertical_metrics(font, {"min_y": -823, "max_y": 500})
    floor = -823 - 20  # ink floor minus the safety margin
    assert font["hhea"].descent == floor
    assert font["OS/2"].usWinDescent == -floor
    assert font["OS/2"].sTypoDescender == floor, (
        "sTypoDescender not extended — USE_TYPO_METRICS apps would under-"
        "reserve the line box and the annotation would overlap the next line"
    )


def test_inverted_annotation_extends_all_ascent_families():
    """An above-the-word (inverted) annotation taller than the base ascent
    must push hhea.ascent, usWinAscent AND sTypoAscender together."""
    font = _make_font()
    _auto_extend_vertical_metrics(font, {"min_y": -100, "max_y": 1500})
    top = 1500 + 20
    assert font["hhea"].ascent == top
    assert font["OS/2"].usWinAscent == top
    assert font["OS/2"].sTypoAscender == top


def test_metrics_already_covering_ink_are_untouched():
    """If the base metrics already contain the ink, nothing shrinks."""
    font = _make_font()
    _auto_extend_vertical_metrics(font, {"min_y": -50, "max_y": 50})
    assert font["hhea"].descent == _BASE_DESCENT
    assert font["OS/2"].usWinDescent == _BASE_WIN_DESC
    assert font["OS/2"].sTypoDescender == _BASE_TYPO_DESC
    assert font["OS/2"].sTypoAscender == _BASE_TYPO_ASC


def test_empty_word_metrics_changes_nothing():
    """The CJK single-character path never populates word_metrics, so the
    function must be a no-op and leave the base line spacing intact."""
    font = _make_font()
    before = (
        font["hhea"].ascent,
        font["hhea"].descent,
        font["OS/2"].usWinAscent,
        font["OS/2"].usWinDescent,
        font["OS/2"].sTypoAscender,
        font["OS/2"].sTypoDescender,
    )
    _auto_extend_vertical_metrics(font, {})
    after = (
        font["hhea"].ascent,
        font["hhea"].descent,
        font["OS/2"].usWinAscent,
        font["OS/2"].usWinDescent,
        font["OS/2"].sTypoAscender,
        font["OS/2"].sTypoDescender,
    )
    assert before == after, "empty word_metrics must not touch any metric"


def main() -> int:
    tests = [
        test_below_annotation_extends_all_descent_families,
        test_inverted_annotation_extends_all_ascent_families,
        test_metrics_already_covering_ink_are_untouched,
        test_empty_word_metrics_changes_nothing,
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
