"""
diy_handler — parse the optional DIY-annotations CSV (``A``) into the
manual-annotation inventory: the **annotations** that become mark glyphs
(each assigned a Plane-15 PUA codepoint) and the **typed inputs** that
ligate into them.

CSV format (``--diy-annotations A.csv``)
----------------------------------------

Two columns, ``input,annotation``::

    ｚａａ１,zaa1        # type full-width ｚａａ１ → render "zaa1"
    coeng1,coeng˥      # type ASCII coeng1   → render "coeng˥"
    zaa1,ザー           # type romanization   → render Katakana

* **annotation** (2nd field) is shaped by the annotation font into the
  mark glyph and gets the PUA codepoint. It can be ANY string — Latin
  romanization, diacritics, Katakana, Hangul, Thai, … — because the user
  never has to type it directly.
* **input** (1st field) is the literal sequence the user types; its
  glyphs (resolved from the BASE font) ligate into that mark. Use
  full-width forms (U+FF01–FF5E) so the run stays in the CJK shaping run
  (see ``mark_input_handler``).

One column is shorthand: ``zaa1`` ≡ ``ｚａａ１,zaa1`` — the input is the
auto-derived full-width form of the annotation (skipped if the annotation
isn't printable ASCII). An explicit empty input (``,ザー``) means "PUA
codepoint only, no typed route".

Multiple rows may share one annotation (several inputs → one mark).
Blank lines and lines whose first cell starts with ``#`` are skipped.

The assigned Plane-15 PUA codepoints are used ONLY as internal, stable
mark-glyph ids (deterministic glyph naming/ordering). They are never put
in the output cmap and there is no "type the codepoint" route and no
sidecar file — the only way to reach a mark is the typed-input ligature.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ── Plane-15 Supplementary Private Use Area-A: U+F0000 … U+FFFFD ──────
# 65 534 codepoints — far more than any realistic DIY inventory. Avoids
# U+E0100…U+E01EF (IVS selectors) and BMP PUA U+E000…U+F8FF (often used
# internally by CJK fonts). Plane-15 needs a format-12 cmap subtable;
# every CJK base font Wing targets ships one.
DIY_PUA_BASE = 0xF0000
DIY_PUA_LIMIT = 0xFFFFD  # inclusive
DIY_PUA_CAPACITY = DIY_PUA_LIMIT - DIY_PUA_BASE + 1

# Skip absurdly long fields defensively — an annotation / input is a short
# string, not a paragraph.
MAX_FIELD_LEN = 32

# Printable-ASCII → full-width offset: U+0021..U+007E map to U+FF01..U+FF5E.
_FULLWIDTH_OFFSET = 0xFEE0


class DiyInventoryError(ValueError):
    """Raised when the DIY inventory cannot be built (e.g. it exceeds the
    Plane-15 PUA capacity)."""


@dataclass
class DiyInventory:
    """Result of parsing ``A``.

    Attributes:
        pua_map: ``{annotation: codepoint}`` — one mark glyph per distinct
            annotation, ordered by codepoint. The codepoint is an internal
            mark-glyph id only (no cmap entry); drives ``generate_mark_glyphs``.
        inputs: ``[(input_string, codepoint), …]`` — the typed-input
            ligatures to build (route B). Several inputs may target the
            same codepoint; entries with no typed route are omitted.
    """

    pua_map: Dict[str, int]
    inputs: List[Tuple[str, int]]


def _derive_fullwidth(s: str) -> Optional[str]:
    """Full-width rendering of a printable-ASCII string, or None if any
    character has no full-width form (so no input can be auto-derived)."""
    out = []
    for ch in s:
        cp = ord(ch)
        if 0x21 <= cp <= 0x7E:
            out.append(chr(cp + _FULLWIDTH_OFFSET))
        else:
            return None
    return "".join(out)


def load_diy_rows(path: str) -> List[Tuple[Optional[str], str]]:
    """Parse ``A`` into ``[(input_or_None, annotation), …]``.

    * ``input,annotation`` (non-empty 2nd field) → explicit input.
    * ``,annotation`` (empty 1st field, non-empty 2nd) → no typed route.
    * ``annotation`` (single field) → input auto-derived as full-width.

    ``input_or_None`` is the final input string (already full-width for
    the shorthand case) or None when there is no typed route. Blank lines
    and ``#`` comments are skipped; over-long fields are dropped.
    """
    rows: List[Tuple[Optional[str], str]] = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for raw in csv.reader(fh):
            if not raw:
                continue
            first = raw[0].strip()
            if first.startswith("#"):
                continue

            if len(raw) >= 2 and raw[1].strip():
                # Explicit two-column row.
                annotation = raw[1].strip()
                input_str: Optional[str] = first or None  # empty → PUA only
            else:
                # One-column shorthand: derive the full-width input.
                if not first:
                    continue
                annotation = first
                input_str = _derive_fullwidth(annotation)
                if input_str is None:
                    print(
                        f"[diy] {annotation!r} has no full-width form; "
                        "add an explicit input column to make it typeable "
                        "(PUA codepoint still works)."
                    )

            if len(annotation) > MAX_FIELD_LEN or (
                input_str is not None and len(input_str) > MAX_FIELD_LEN
            ):
                print(f"[diy] skipping over-long entry: {annotation[:16]!r}…")
                continue
            rows.append((input_str, annotation))
    return rows


def assign_pua(annotations: List[str]) -> Dict[str, int]:
    """Map each annotation to a Plane-15 PUA codepoint, ``DIY_PUA_BASE``
    upward in the given order. Raises :class:`DiyInventoryError` on
    overflow."""
    if len(annotations) > DIY_PUA_CAPACITY:
        raise DiyInventoryError(
            f"DIY inventory has {len(annotations):,} distinct annotations "
            f"but the Plane-15 PUA range holds only {DIY_PUA_CAPACITY:,}."
        )
    return {anno: DIY_PUA_BASE + i for i, anno in enumerate(annotations)}


def build_diy_inventory(path: str) -> DiyInventory:
    """Parse ``A`` and return the :class:`DiyInventory`.

    Distinct annotations (sorted) get PUA codepoints; each row with a
    typed input yields one ``(input, codepoint)`` ligature. Duplicate
    inputs are de-duplicated (first wins). Returns empty maps for an empty
    file."""
    rows = load_diy_rows(path)
    annotations = sorted({anno for _inp, anno in rows})
    pua_map = assign_pua(annotations)

    inputs: List[Tuple[str, int]] = []
    seen: set[str] = set()
    for input_str, annotation in rows:
        if input_str is None or input_str in seen:
            continue
        seen.add(input_str)
        inputs.append((input_str, pua_map[annotation]))
    # Stable order for deterministic GSUB diffs: by codepoint, then input.
    inputs.sort(key=lambda pair: (pair[1], pair[0]))
    return DiyInventory(pua_map=pua_map, inputs=inputs)
