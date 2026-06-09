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
from utils import get_glyph_name_by_char, register_feature_lookup, step_timer

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
# Each rule is ~10-50 bytes after compilation. 500 rules/subtable
# lands at ~5-25KB, well under the 64KB ceiling, while keeping the
# *number* of subtables low — the builder's `getCompiledSize_` runs
# format 1 and format 3 compilation for *each* subtable to pick the
# smaller, so fewer subtables means dramatically fewer measurement
# compilations. Bumping from 50 → 500 cut chain-build time roughly
# 5-10× on the 100K-rule mappings we tested.
RULES_PER_SUBTABLE = 500


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
    # All progress / timing handled by step_timer — it emits the
    # "Processing ..." line on enter and the "... DONE (Ns, note)" line
    # on exit. Returning inside the with-block is fine; __exit__ fires
    # either way.
    with step_timer("chain context substitution") as timer:
        gsub = output_font["GSUB"].table
        glyph_order = output_font.getGlyphOrder()
        # Membership tests on a set are O(1); on the list from
        # getGlyphOrder() they're O(n). With 50k glyphs and a long
        # word_mapping iteration this is a free win.
        glyph_order_set = set(glyph_order)

        # One SingleSubst lookup per variant slot. Lazily built into a
        # fixed-size array so the index math below stays trivial.
        single_sub_builders = [
            SingleSubstBuilder(output_font, None) for _ in range(MAX_VARIANT_LOOKUPS)
        ]

        chain_builder = ChainContextSubstBuilder(output_font, None)

        # Counts only the *real* rules appended (subtable breaks don't
        # count toward the per-subtable budget).
        rules_in_current_subtable = 0

        # add_subtable_break() appends a sentinel ChainContextualRule to
        # self.rules. ChainContextSubstBuilder's `rules` is a list (not
        # a dict), so collisions aren't an issue — each call appends a
        # fresh sentinel — but we still pass a counter so subtable
        # breaks in stack traces are easy to identify by source order.
        subtable_break_counter = 0

        # Iterate words in their incoming order. csv_parser already
        # sorted them (longer/higher-weighted entries first), so we
        # preserve that priority when emitting rules.
        for word, anno_strs in word_mapping.items():
            if len(word) <= 1:
                # calt is for *multi*-glyph context. Single characters
                # are handled by the liga (digit-triggered) path.
                continue

            input_glyphs = []
            per_position_variant = []
            is_buildable = True

            for i, char in enumerate(word):
                glyph_name = get_glyph_name_by_char(output_font, char)
                if not isinstance(glyph_name, str) or glyph_name not in glyph_order_set:
                    # Word references a character not in the font — skip
                    # the whole rule rather than emitting a partial chain.
                    is_buildable = False
                    break
                input_glyphs.append(glyph_name)

                anno_str = anno_strs[i]
                if char not in char_mapping or anno_str not in char_mapping[char]:
                    # Position is matched but has no substitution —
                    # encode as a passthrough slot (None in the lookups).
                    per_position_variant.append(None)
                    continue

                target_glyph_name, variant = char_mapping[char][anno_str]
                # Only populate non-zero variant builders. Variant 0 is
                # the default reading (identity substitution), and we
                # no longer emit rule lookups that reference it (see
                # the no-op filter below), so its mapping would be
                # dead weight in the output GSUB.
                if variant > 0:
                    single_sub_builders[variant].mapping[glyph_name] = target_glyph_name
                per_position_variant.append(variant)

            if not is_buildable:
                continue

            # --- No-op rule filter (big perf win) ---------------------
            #
            # Variant 0 always means "use the default reading" and the
            # default reading IS the original glyph (no substitution).
            # A calt rule whose positions are ALL variant-0-or-None is
            # therefore a pure no-op — it matches the word and then
            # substitutes nothing. Emitting it pollutes GSUB, makes the
            # build / serialize / subset steps proportionally slower,
            # and changes no rendering. Skip such rules entirely.
            #
            # For mixed rules where SOME positions are variant 0 we
            # also turn those positions into `None` (passthrough) so
            # the shaper doesn't run a useless lookup at runtime — and
            # so we don't even need the variant-0 SingleSubstBuilder.
            if not any(v is not None and v > 0 for v in per_position_variant):
                continue

            # Build rule_lookups, treating variant-0 positions as
            # passthroughs (None) so the shaper skips them and so the
            # subset closure has fewer references to chase.
            rule_lookups = [
                [single_sub_builders[v]] if v is not None and v > 0 else None
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

            # Force a subtable boundary every RULES_PER_SUBTABLE rules
            # so we never let any single subtable approach the 64KB
            # OpenType offset limit. The builder honours these breaks
            # when it composes the final lookup
            # (see ChainContextualBuilder.rulesets()).
            if rules_in_current_subtable >= RULES_PER_SUBTABLE:
                chain_builder.add_subtable_break(subtable_break_counter)
                subtable_break_counter += 1
                rules_in_current_subtable = 0

        # --- Append SingleSubst lookups; record indices ----------------
        # Order is critical: the chain context lookup we're about to
        # build encodes references to these lookups by index
        # (LookupListIndex), and those references are resolved from each
        # builder's `.lookup_index` attribute. So we have to
        # append → assign `.lookup_index` → build the chain in that order.
        next_index = len(gsub.LookupList.Lookup)
        for builder in single_sub_builders:
            if not builder.mapping:
                continue
            lookup = builder.build()
            # IgnoreBaseGlyphs (flag bit 1): historically set on the
            # original implementation; preserved for output-compatibility.
            lookup.LookupFlag = 1
            builder.lookup_index = next_index
            gsub.LookupList.Lookup.append(lookup)
            next_index += 1

        # --- Build and register the chain context lookup ---------------
        if not chain_builder.rules:
            # No multi-character words were buildable; nothing to register.
            gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
            timer.note("0 rules")
            return

        chain_lookup = chain_builder.build()
        chain_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(chain_lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

        register_feature_lookup(gsub, "calt", chain_index)
        timer.note(f"{len(chain_builder.rules)} rules")
