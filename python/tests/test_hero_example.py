"""End-to-end check of the one-command hero example (examples/hero/README.md).

Builds the 8-character hero font through the real CLI entry point and
checks every mapped character came out as base glyph + exactly the
letters of its reading, stacked above the base.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

PY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PY_ROOT))

from wingfont.cli import run  # noqa: E402

HERO = PY_ROOT / "examples" / "hero"
BASE = HERO / "NotoSansHK-hero-subset.ttf"
ANNO = HERO / "NotoSerif-hero-subset.ttf"
MAPPING = PY_ROOT / "mappings" / "hero-sample.csv"


def _contours(font, char):
    gs = font.getGlyphSet()
    pen = DecomposingRecordingPen(gs)
    gs[font.getBestCmap()[ord(char)]].draw(pen)
    return sum(1 for op, _ in pen.value if op == "closePath")


def _y_max(font, char):
    gs = font.getGlyphSet()
    pen = BoundsPen(gs)
    gs[font.getBestCmap()[ord(char)]].draw(pen)
    return pen.bounds[3]


def test_hero_example(tmp_path):
    prefix = tmp_path / "WingFontHero"
    run(["-i", str(BASE), "-a", str(ANNO), "-m", str(MAPPING),
         "-o", str(prefix), "-f", "WingFontHero"])

    assert (tmp_path / "WingFontHero.woff2").stat().st_size > 0
    out, base, anno = TTFont(f"{prefix}.ttf"), TTFont(BASE), TTFont(ANNO)
    assert out["name"].getDebugName(1) == "WingFontHero"

    rows = [line.split(",") for line in MAPPING.read_text("utf-8").split()]
    assert len(rows) == 8
    for char, reading in rows:
        expected = _contours(base, char) + sum(_contours(anno, c) for c in reading)
        assert _contours(out, char) == expected, (char, reading)
        # the reading sits above where the unannotated character tops out
        assert _y_max(out, char) > _y_max(base, char) + 100, char
