"""
chain_context_handler — build the `calt` Chain Contextual Substitution
that selects the correct variant glyph for each character based on the
surrounding word.

Implementation note
-------------------

The previous version of this file built the GSUB Type 6 (Format 1)
subtable by hand: instantiating ``otTables.ChainContextSubst``,
``ChainSubRuleSet``, ``ChainSubRule``, ``SubstLookupRecord``, walking
``ScriptList`` to register the feature, and chunking rules across
subtables (``MAX_chainSets_chunk``) to avoid OpenType offset overflow.

That whole apparatus is now replaced by
``fontTools.otlLib.builder.ChainContextSubstBuilder``, which:

  * Auto-selects the most compact subtable format (1, 2 or 3).
  * Handles subtable overflow itself via subtable breaks — no manual
    chunking needed.
  * Lays out ``SubstLookupRecord`` entries from a flat ``rules`` list of
    ``ChainContextualRule`` namedtuples.

We still keep ownership of:

  * Building the per-variant ``SingleSubstBuilder`` lookups (one per
    variant index, 0..MAX_VARIANT_LOOKUPS-1).
  * Appending the built ``Lookup`` objects onto the existing
    ``gsub.LookupList`` — feaLib would clobber the source font's 82
    other lookups, so we deliberately use the lower-level builders and
    splice in additively instead.
  * Setting ``lookup_index`` on each SingleSubstBuilder *before* the
    chain builder's ``build()`` runs; the chain builder reads that
    attribute to write ``SubstLookupRecord.LookupListIndex`` correctly.
"""

from fontTools.otlLib.builder import (
    ChainContextSubstBuilder,
    ChainContextualRule,
    SingleSubstBuilder,
)
from utils import get_glyph_name_by_char, register_feature_lookup

# Upper bound on the number of distinct annotations any single character
# can have. Matches the limit enforced by csv_parser.MAX_CHAR_VARIANTS.
# Variant index 0 is the "default" reading; 1..N-1 are alternates.
MAX_VARIANT_LOOKUPS = 10

# Maximum number of rules per chain-context subtable before we force a
# subtable break. OpenType subtable offsets are uint16, so any single
# subtable that compiles to more than ~64KB will overflow. fontTools'
# ChainContextSubstBuilder *should* recover from such overflows, but a
# bug in `OTTableWriter.getOverflowErrorRecord` raises AttributeError
# instead of OTLOffsetOverflowError when the builder is measuring sizes
# in isolation via `getCompiledSize_` (the OTTableWriter created there
# has no LookupList ancestor with `repeatIndex` set). Pre-emptively
# splitting prevents us from ever entering that broken code path.
#
# 50 is conservative — a single rule is on the order of 10-20 bytes, so
# 50 rules per subtable stays comfortably under 1KB and leaves headroom
# for unusually long-context words. Higher numbers work in normal cases
# but get punished hard if a single subtable trips the size threshold.
RULES_PER_SUBTABLE = 50


def buildChainSub(output_font, word_mapping, char_mapping):
    """
    Add a `calt` Chain Contextual Substitution that, when the user types
    a known multi-character word, swaps each character glyph for the
    correct variant.

    Args:
        output_font: TTFont being mutated.
        word_mapping: Ordered dict of ``word -> [annotation_per_char]``.
            Order determines rule priority (earlier rules win in calt).
        char_mapping: ``char -> {annotation_str: (glyph_name, variant_index)}``.
    """
    gsub = output_font["GSUB"].table
    glyph_order = output_font.getGlyphOrder()

    # One SingleSubst lookup per variant slot. We build them lazily into
    # the same N-element array regardless of whether they end up populated
    # so the index math below stays trivial.
    single_sub_builders = [
        SingleSubstBuilder(output_font, None) for _ in range(MAX_VARIANT_LOOKUPS)
    ]

    chain_builder = ChainContextSubstBuilder(output_font, None)

    # Counts only the *real* rules appended (subtable breaks don't count
    # toward the per-subtable budget).
    rules_in_current_subtable = 0

    # add_subtable_break() appends a sentinel ChainContextualRule to
    # self.rules. ChainContextSubstBuilder's `rules` is a list (not a
    # dict), so collisions aren't an issue — each call appends a fresh
    # sentinel — but we still pass a counter so subtable breaks in stack
    # traces are easy to identify by source order.
    subtable_break_counter = 0

    # Iterate words in their incoming order. csv_parser already sorted
    # them (longer/higher-weighted entries first), so we preserve that
    # priority when emitting rules.
    for word, anno_strs in word_mapping.items():
        if len(word) <= 1:
            # calt is for *multi*-glyph context. Single characters are
            # handled by the liga (digit-triggered) path.
            continue

        input_glyphs = []
        per_position_variant = []
        is_buildable = True

        for i, char in enumerate(word):
            glyph_name = get_glyph_name_by_char(output_font, char)
            if not isinstance(glyph_name, str) or glyph_name not in glyph_order:
                # Word references a character not in the font — skip the
                # whole rule rather than emitting a partial chain.
                is_buildable = False
                break
            input_glyphs.append(glyph_name)

            anno_str = anno_strs[i]
            if char not in char_mapping or anno_str not in char_mapping[char]:
                # Position is matched but has no substitution — encode as
                # a "passthrough" slot (None in the lookups list).
                per_position_variant.append(None)
                continue

            target_glyph_name, variant = char_mapping[char][anno_str]
            single_sub_builders[variant].mapping[glyph_name] = target_glyph_name
            per_position_variant.append(variant)

        if not is_buildable:
            continue

        # Convert variant indices to the (list of LookupBuilder | None)
        # shape that ChainContextSubstBuilder expects per position.
        rule_lookups = [
            [single_sub_builders[v]] if v is not None else None
            for v in per_position_variant
        ]
        chain_builder.rules.append(
            ChainContextualRule(
                prefix=[],
                glyphs=[[g] for g in input_glyphs],
                suffix=[],
                lookups=rule_lookups,
            )
        )
        rules_in_current_subtable += 1

        # Force a subtable boundary every RULES_PER_SUBTABLE rules so we
        # never let any single subtable approach the 64KB OpenType offset
        # limit. The builder honours these breaks when it composes the
        # final lookup (see ChainContextualBuilder.rulesets()).
        if rules_in_current_subtable >= RULES_PER_SUBTABLE:
            chain_builder.add_subtable_break(subtable_break_counter)
            subtable_break_counter += 1
            rules_in_current_subtable = 0

    # --- Append the SingleSubst lookups to the live GSUB table -----------
    #
    # Order is critical: the chain context lookup we're about to build
    # encodes references to these lookups by index (LookupListIndex), and
    # those references are resolved from each builder's `.lookup_index`
    # attribute. So we have to append → assign `.lookup_index` → build the
    # chain in that order.
    next_index = len(gsub.LookupList.Lookup)
    for builder in single_sub_builders:
        if not builder.mapping:
            continue
        lookup = builder.build()
        # IgnoreBaseGlyphs (flag bit 1): historically set on the original
        # implementation; preserved for output-compatibility. In practice
        # most CJK shapers ignore the bit because the glyphs aren't marks
        # anyway, but it doesn't hurt to keep it.
        lookup.LookupFlag = 1
        builder.lookup_index = next_index
        gsub.LookupList.Lookup.append(lookup)
        next_index += 1

    # --- Build and register the chain context lookup ---------------------
    if not chain_builder.rules:
        # No multi-character words were buildable; nothing to register.
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
        return

    chain_lookup = chain_builder.build()
    chain_index = len(gsub.LookupList.Lookup)
    gsub.LookupList.Lookup.append(chain_lookup)
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

    register_feature_lookup(gsub, "calt", chain_index)

    print("Done ChainContextSubst")
