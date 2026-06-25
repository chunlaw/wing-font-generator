"""
mark_strip_handler — strip a mapped base's baked annotation so a DIY mark
can sit cleanly above it.

Primary mechanism — ``buildBareStripLiga``: an explicit-trigger ``ccmp``
**ligature** ``(mappedBase, ０) → bareBase``, where ``０`` is the
**full-width digit zero** (U+FF10). The user types ``行０ｚａａ１``:

  * ``行０`` — ``０`` is Unicode script **Common**, so it stays in the same
    Han shaping run as ``行``; the ligature fires there and yields the
    annotation-free bare ``行``.
  * ``ｚａａ１`` — full-width letters are script **Latin**, so browsers put
    them in a SEPARATE run; the mark-input ligature
    (``mark_input_handler``) forms the ``zaa1`` mark there, and the mark's
    negative x-offset draws it back over the preceding (now bare) ``行``.

This is why an explicit ``０`` trigger is needed instead of a chain rule
that looks ahead at the mark: browsers itemise text into runs by Unicode
*script* before shaping, and a Han base + full-width-Latin annotation land
in different runs, so a lookahead can't reach across them. ``０`` is
Common and joins the base's run, so the strip works everywhere (the same
reason the existing ``行2`` variant selector works). It also avoids the
uint16 overflow the old chain-context strip hit, since a plain ligature
isn't probe-compiled at build time.

``buildBaseStrip`` (below) is the older Chain-Context strip keyed on a
following mark. It only works when the base and mark are in ONE run (some
non-browser shapers), so it is kept for reference / single-run use but is
NOT used by the main pipeline.

``tagMarksAsGdefMarks`` sets GDEF glyph class 3 (mark) on the mark glyphs
so shapers give them combining cursor/selection behaviour. Following
``word_liga_handler``'s rule, we only do this when the font ALREADY
carries a ``GlyphClassDef`` — fabricating one where the source relied on
Unicode-property fallback would silently reclassify every other glyph.
"""

from typing import Dict, List

from fontTools.otlLib.builder import (
    ChainContextSubstBuilder,
    ChainContextualRule,
    LigatureSubstBuilder,
    SingleSubstBuilder,
)

from utils import get_glyph_name_by_char, register_feature_lookup, step_timer

# Full-width digit zero (U+FF10) — the bare-strip trigger. Script Common,
# so it joins the preceding CJK run (unlike the Latin full-width letters).
BARE_TRIGGER_CHAR = "０"

# GSUB Type-4 64 KiB offset budget guard — same rationale as liga_handler.
_BARE_LIGATURES_PER_SUBTABLE = 1000

# GDEF GlyphClassDef class values (OpenType): 1 base, 2 ligature, 3 mark,
# 4 component.
_GDEF_MARK_CLASS = 3


def buildBareStripLiga(
    output_font,
    bare_base_map: Dict[str, str],
    *,
    trigger_char: str = BARE_TRIGGER_CHAR,
) -> int:
    """Add the explicit ``(mappedBase, ０) → bareBase`` ligature under
    ``ccmp`` — the run-safe way to strip a mapped base's baked annotation.

    The user types the full-width ``０`` between the base and the manual
    annotation (``行０ｚａａ１``). Because ``０`` is script Common it stays
    in the base's run, so this ligature fires regardless of the separate
    Latin run the full-width annotation forms (see module docstring).

    Args:
        output_font: TTFont being mutated (must carry GSUB and the bare
            base glyphs from ``generate_annotated_glyphs(emit_bare_bases=
            True)``).
        bare_base_map: ``{default_base_glyph: bare_base_glyph}``.
        trigger_char: the strip trigger; default full-width ``０``.

    IMPORTANT lookup order: register this BEFORE ``liga_handler.buildLiga``
    so it wins the ``(base, ０) → default-reading`` reset rule that
    handler also emits (lower lookup index fires first and consumes the
    ``０``). Build it pre-subset alongside the other ccmp lookups.

    Returns the number of base→bare rules emitted (0 if nothing to do or
    the trigger glyph is missing).
    """
    if not bare_base_map:
        return 0

    with step_timer("diy bare-strip ligature") as timer:
        gsub = output_font["GSUB"].table
        glyph_order_set = set(output_font.getGlyphOrder())

        zero_glyph = get_glyph_name_by_char(output_font, trigger_char)
        if not zero_glyph:
            print(
                f"[diy] bare-strip trigger {trigger_char!r} (U+"
                f"{ord(trigger_char):04X}) is not in the font; the manual "
                "annotation path can't strip the base reading."
            )
            timer.note("skipped — trigger glyph missing")
            return 0

        builder = LigatureSubstBuilder(output_font, None)
        rules_in_subtable = 0
        break_counter = 0
        emitted = 0
        for base, bare in bare_base_map.items():
            if base in glyph_order_set and bare in glyph_order_set:
                builder.ligatures[(base, zero_glyph)] = bare
                emitted += 1
                rules_in_subtable += 1
                if rules_in_subtable >= _BARE_LIGATURES_PER_SUBTABLE:
                    builder.add_subtable_break(break_counter)
                    break_counter += 1
                    rules_in_subtable = 0

        if emitted == 0:
            timer.note("0 rules")
            return 0

        lookup = builder.build()
        lookup_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
        register_feature_lookup(gsub, "ccmp", lookup_index)
        timer.note(f"{emitted} (base,０)→bare rules")
        return emitted


def buildBaseStrip(
    output_font,
    bare_base_map: Dict[str, str],
    mark_names: List[str],
) -> int:
    """Add the ``[mappedBase][mark] → bareBase`` chain-context lookup
    under ``ccmp``.

    Args:
        output_font: TTFont being mutated (must carry GSUB and contain
            both the bare-base glyphs and the mark glyphs).
        bare_base_map: ``{default_base_glyph: bare_base_glyph}`` from
            ``generate_annotated_glyphs(emit_bare_bases=True)``.
        mark_names: the mark glyph names from ``generate_mark_glyphs``.

    Returns the number of base→bare substitutions wired (0 if there's
    nothing to do).
    """
    if not bare_base_map or not mark_names:
        return 0

    with step_timer("diy base-strip chain sub") as timer:
        gsub = output_font["GSUB"].table
        glyph_order_set = set(output_font.getGlyphOrder())

        # Keep only entries whose glyphs actually exist in the output.
        bases = [
            b
            for b, bare in bare_base_map.items()
            if b in glyph_order_set and bare in glyph_order_set
        ]
        marks = [m for m in mark_names if m in glyph_order_set]
        if not bases or not marks:
            timer.note("skipped — no resolvable bases/marks")
            return 0

        # Nested single substitution: each mapped base → its bare glyph.
        ss = SingleSubstBuilder(output_font, None)
        for b in bases:
            ss.mapping[b] = bare_base_map[b]

        # One coverage-based chain rule: at a mapped base followed by any
        # mark, apply `ss` at the base position. `glyphs` / `suffix` are
        # lists of per-position coverage lists.
        chain = ChainContextSubstBuilder(output_font, None)
        chain.rules.append(
            ChainContextualRule(
                prefix=[],
                glyphs=[bases],
                suffix=[marks],
                lookups=[[ss]],
            )
        )

        # Append the nested SingleSubst lookup first and record its
        # index, then build the chain (its SubstLookupRecord references
        # `ss.lookup_index`). The single-sub is NOT registered as a
        # feature lookup — only the chain is.
        ss_index = len(gsub.LookupList.Lookup)
        ss_lookup = ss.build()
        ss.lookup_index = ss_index
        gsub.LookupList.Lookup.append(ss_lookup)

        chain_lookup = chain.build()
        chain_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(chain_lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

        # ccmp — runs universally, no app toggle (see liga/chain handlers).
        register_feature_lookup(gsub, "ccmp", chain_index)
        timer.note(f"{len(bases)} base→bare under 1 chain rule")
        return len(bases)


def tagMarksAsGdefMarks(output_font, mark_names: List[str]) -> int:
    """Set GDEF glyph class 3 (mark) on the DIY mark glyphs.

    Only acts when the font already has a ``GDEF.GlyphClassDef``: adding
    one where it was absent would force every unlisted glyph to class 0
    and change how shapers classify the rest of the font (see
    ``word_liga_handler``'s same guard). Returns the number of marks
    tagged (0 if there's no GlyphClassDef to extend)."""
    if not mark_names or "GDEF" not in output_font:
        return 0
    gdef = output_font["GDEF"].table
    if getattr(gdef, "GlyphClassDef", None) is None:
        print(
            "[diy] GDEF has no GlyphClassDef; not fabricating one "
            "(would reclassify the whole font). Marks rely on zero "
            "advance for combining behaviour."
        )
        return 0
    glyph_order_set = set(output_font.getGlyphOrder())
    n = 0
    for m in mark_names:
        if m in glyph_order_set:
            gdef.GlyphClassDef.classDefs[m] = _GDEF_MARK_CLASS
            n += 1
    return n
