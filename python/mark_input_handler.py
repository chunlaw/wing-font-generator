"""
mark_input_handler — the typed-input route (route B) for DIY manual
annotations: ligate the literal **input** sequence of each inventory row
into its mark glyph, under ``ccmp``.

The inputs come from ``diy_handler.build_diy_inventory(...).inputs`` —
``[(input_string, codepoint), …]``. For a row like ``ｚａａ１,zaa1`` the
input is the full-width ``ｚａａ１`` and the target is the ``zaa1`` mark;
typing ``行ｚａａ１`` ligates ``[ｚ, ａ, ａ, １]`` → the mark, and the
base-strip lookup then swaps ``行`` → its bare scaled base.

This module no longer derives the input — ``diy_handler`` does that (the
one-column shorthand auto-derives a full-width input; two-column rows give
it explicitly). Here we simply resolve each input character to a BASE-font
glyph and emit the ligature. An input whose characters aren't all in the
font is skipped for the typed route (the annotation is still reachable via
its PUA codepoint, route A).

Why full-width inputs are recommended: full-width forms (U+FF01–FF5E) are
East-Asian-Width = Fullwidth, so text engines keep them in the surrounding
CJK run instead of splitting them into a separate Latin run (the same
reason ``liga_handler`` uses full-width digits). That choice now lives in
the CSV / ``diy_handler``, not here.

Lookup type is GSUB Type 4 (Ligature Substitution), registered under
``ccmp``. Run order: ``generate_mark_glyphs`` first (targets must exist),
and register this BEFORE the base-strip so the mark is present when the
strip's lookahead tests for it. (Route A marks come from cmap, present
before any GSUB.)
"""

from typing import List, Tuple

from fontTools.otlLib.builder import LigatureSubstBuilder

from build_glyph import MARK_PREFIX
from utils import get_glyph_name_by_char, register_feature_lookup, step_timer

# Inputs sharing a first glyph live in one LigatureSet; keep them in a
# single subtable while under the GSUB Type-4 64 KiB offset budget. Past
# this we add a subtable break — OpenType tries a lookup's subtables in
# order, so a later-subtable match is still found.
_MARK_LIGATURES_PER_SUBTABLE = 2000


def buildMarkInputLiga(output_font, inputs: List[Tuple[str, int]]) -> int:
    """Build the typed-input ligature lookup (route B) and register it
    under ``ccmp``.

    Args:
        output_font: TTFont being mutated (must carry GSUB and the DIY
            mark glyphs from ``generate_mark_glyphs``).
        inputs: ``[(input_string, codepoint), …]`` from
            ``diy_handler.build_diy_inventory(...).inputs``. The mark glyph
            for each is ``MARK_PREFIX + f"{codepoint:05X}"``.

    Returns the number of ligature rules emitted (0 if empty or none
    resolvable).
    """
    if not inputs:
        return 0

    with step_timer("diy mark-input ligatures") as timer:
        gsub = output_font["GSUB"].table

        builder = LigatureSubstBuilder(output_font, None)
        rules_in_subtable = 0
        break_counter = 0
        emitted = 0
        skipped: List[str] = []

        for input_str, cp in inputs:
            mark_name = f"{MARK_PREFIX}{cp:05X}"

            # Resolve each input character to a glyph via the base font's
            # cmap. If any is missing, skip this input's typed route — the
            # annotation stays reachable via its PUA codepoint.
            comps: List[str] = []
            ok = True
            for ch in input_str:
                g = get_glyph_name_by_char(output_font, ch)
                if not g:
                    ok = False
                    break
                comps.append(g)
            if not ok or not comps:
                skipped.append(input_str)
                continue

            # fontTools sorts a ligature set longest-first, so an input
            # that shares a prefix with a shorter one still wins.
            builder.ligatures[tuple(comps)] = mark_name
            emitted += 1
            rules_in_subtable += 1
            if rules_in_subtable >= _MARK_LIGATURES_PER_SUBTABLE:
                builder.add_subtable_break(break_counter)
                break_counter += 1
                rules_in_subtable = 0

        if emitted == 0:
            if skipped:
                print(
                    f"[diy] no typed-input ligatures emitted — all "
                    f"{len(skipped)} input(s) had unresolvable glyphs "
                    "(annotations still reachable via PUA codepoint)."
                )
            timer.note("0 rules")
            return 0

        lookup = builder.build()
        lookup_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
        # ccmp, not liga — iWork/CoreText-proof feature.
        register_feature_lookup(gsub, "ccmp", lookup_index)

        if skipped:
            print(
                f"[diy] {len(skipped)} input(s) had no typed-input ligature "
                f"(missing glyphs), e.g. {skipped[0]!r}; the annotation is "
                "still reachable via PUA codepoint."
            )
        timer.note(f"{emitted} rules in {lookup.SubTableCount} subtable(s)")
        return emitted
