"""
test_auto_fit_ascent.py — regression guard for the CJK auto-fit ascent path.

The CJK single-character path places the annotation above (or, inverted, the
base above) the glyph, and on a low-ascent base (e.g. Xiaolai 880u) that ink
can poke past the font's `winAscent` line — apps that strictly clip at
winAscent (Word, Pages, Keynote, Canva) then truncate the tallest glyphs.

`_auto_fit_ascent` widens the output font's CLIPPING ascent (hhea.ascent +
OS/2.usWinAscent) to clear the tallest composed glyph's ink (+margin), leaving
sTypoAscender alone so typo-metrics line spacing is unchanged. `out_ascent`
itself is normalised by `_resolve_out_ascent` into one of three policies:
auto (default), explicit pin, or off.

These tests assert:
  * auto-fit raises hhea + winAscent to ink+margin but never touches sTypo,
  * auto-fit is widen-only (a base that already covers the ink is untouched),
  * an empty/None char_metrics is a no-op (word-unit-only builds), and
  * _resolve_out_ascent maps every input shape (None / "auto" / "off" /
    positive int / int-string / JsNull-ish / garbage) to the right policy.

Hermetic: builds a tiny synthetic font in-memory; no input fonts required.

Run standalone:   python tests/test_auto_fit_ascent.py
Run under pytest: pytest tests/test_auto_fit_ascent.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))


def _load_mod():
    """Import the pipeline module (wingfont.cli)."""
    from wingfont import cli as mod
    return mod


_mod = _load_mod()
_auto_fit_ascent = _mod._auto_fit_ascent
_resolve_out_ascent = _mod._resolve_out_ascent
_MARGIN = _mod.AUTO_ASCENT_MARGIN

# Low-ascent stand-in (Xiaolai-like 880u on a UPM-1000 em).
_BASE_ASCENT = 880
_BASE_WIN_ASC = 880
_BASE_TYPO_ASC = 880


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
    fb.setupHorizontalHeader(ascent=_BASE_ASCENT, descent=-200)
    fb.setupNameTable({"familyName": "AscentTest", "styleName": "R"})
    fb.setupOS2(
        sTypoAscender=_BASE_TYPO_ASC,
        sTypoDescender=-200,
        usWinAscent=_BASE_WIN_ASC,
        usWinDescent=200,
    )
    fb.setupPost()
    return fb.font


def test_auto_fit_raises_clipping_ascent_not_typo():
    """Tall ink (1032u) past the 880u base ascent must push hhea.ascent and
    usWinAscent to ink+margin, while sTypoAscender stays at the base value."""
    font = _make_font()
    _auto_fit_ascent(font, {"max_y": 1032, "min_y": 0})
    top = 1032 + _MARGIN
    assert font["hhea"].ascent == top
    assert font["OS/2"].usWinAscent == top
    assert font["OS/2"].sTypoAscender == _BASE_TYPO_ASC, (
        "sTypoAscender must NOT move — CJK builds keep typo-metrics line "
        "spacing; only the winAscent clip line grows"
    )


def test_auto_fit_is_widen_only():
    """Ink that already fits under the base ascent leaves every metric be."""
    font = _make_font()
    _auto_fit_ascent(font, {"max_y": 600, "min_y": 0})
    assert font["hhea"].ascent == _BASE_ASCENT
    assert font["OS/2"].usWinAscent == _BASE_WIN_ASC
    assert font["OS/2"].sTypoAscender == _BASE_TYPO_ASC


def test_auto_fit_empty_metrics_noop():
    """Word-unit-only builds never populate char_metrics → no-op."""
    font = _make_font()
    for metrics in ({}, None, {"min_y": -10}):  # no max_y in the last one
        _auto_fit_ascent(font, metrics)
    assert font["hhea"].ascent == _BASE_ASCENT
    assert font["OS/2"].usWinAscent == _BASE_WIN_ASC
    assert font["OS/2"].sTypoAscender == _BASE_TYPO_ASC


class _JsNullish:
    """Stand-in for the Pyodide bridge's JsNull (not None/int/float/str)."""


def test_resolve_out_ascent_policies():
    cases = {
        None: ("auto", None),
        "auto": ("auto", None),
        "AUTO": ("auto", None),
        "  auto ": ("auto", None),
        "": ("auto", None),
        "off": ("off", None),
        "none": ("off", None),
        0: ("off", None),
        -5: ("off", None),
        "0": ("off", None),
        1300: ("explicit", 1300),
        "1300": ("explicit", 1300),
        "1300.0": ("explicit", 1300),
        1200.7: ("explicit", 1200),
        "garbage": ("auto", None),  # unparseable → safe default
    }
    for value, expected in cases.items():
        got = _resolve_out_ascent(value)
        assert got == expected, f"{value!r} -> {got}, expected {expected}"
    # A JsNull-like object (unknown type) must fall back to auto, never raise.
    assert _resolve_out_ascent(_JsNullish()) == ("auto", None)


def main() -> int:
    tests = [
        test_auto_fit_raises_clipping_ascent_not_typo,
        test_auto_fit_is_widen_only,
        test_auto_fit_empty_metrics_noop,
        test_resolve_out_ascent_policies,
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
