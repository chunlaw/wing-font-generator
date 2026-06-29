"""
chain_context_handler — build the `ccmp` Chain Contextual Substitution
that selects the correct variant glyph for each character based on the
surrounding word.

Two-pass design (compound-variant cycling)
------------------------------------------

A compound like 佗位 may have multiple weighted readings in the
mapping (`tuē _,2` / `tueh _,2` / `tó uī`). The historical pipeline
deduped these in csv_parser and only emitted a chain rule for the
first one, so users had no way to select an alternate compound
reading without editing the CSV. Two design goals were in tension:

  (a) `佗位2` should cycle to the 2nd compound variant — `tueh _`.
      Requires the compound chain to CONSUME the digit before the
      per-char digit-trigger (liga_handler) eats it.

  (b) `斷０` after `一刀兩斷` should leave a bare 斷 — without
      cancelling the compound chain on the OTHER three characters?
      Per Task #22 the user accepted that the surrounding compound
      annotation drops in this case; in exchange they get a clean
      per-char strip on the trailing 斷.

A single-lookup design can satisfy (a) OR (b), not both. The split:

  PASS 1 — ``buildChainSubVariantOverrides`` (BEFORE liga)
    Emits chain rules ONLY for compounds where word_mapping[word]
    has ≥ 2 variants. Each rule's input is
    ``[base_chars, digit_for_(variant_idx+1)]``; the digit position
    is substituted to a zero-width invisible glyph (injected by
    ``utils.ensure_invisible_glyph``). User-num = variant_idx + 1
    matches the 1-indexed semantics of the per-char digit trigger
    (variant_idx 1 → user types `2`, variant_idx 2 → `3`, …).

    No rule is emitted for variant_idx 0 here — that's the default,
    handled by pass 2.

    Both halfwidth (`0`-`9`) and fullwidth (`０`-`９`) digit forms
    get their own rule, because DirectWrite splits halfwidth ASCII
    digits into a separate shaping run from the surrounding Han —
    same reason ``liga_handler`` emits parallel rules.

  LIGA — ``liga_handler.buildLiga`` (BETWEEN the two passes)
    Per-char `(base, digit) → variant` and `(base, '0') → bare`.
    For compounds with only ONE entry in the mapping (no pass-1
    rules), liga's per-char digit override fires normally and the
    pass-2 default chain match fails on the resulting variant glyph
    — that's the Task #22 behaviour for `斷０`.

  PASS 2 — ``buildChainSub`` (AFTER liga)
    Default compound chain — emits rules for variant_idx 0 only,
    input is ``[base_chars]`` (no digit). Reads ``variants[0]`` off
    the new word_mapping shape (see below).

Shape of word_mapping
---------------------

csv_parser now keeps every weighted compound entry instead of
deduping. The shape is::

    {word: [variant_anno_strs_list, variant_anno_strs_list, ...]}

``variants[0]`` is the highest-priority (weight desc, tone asc, …)
entry — the "default" reading consumed by pass 2. ``variants[1:]``
are the additional readings consumed by pass 1.

When the user typed digit overshoots ``len(variants)`` (e.g.
`佗位9` on a compound with 3 variants), no pass-1 rule matches.
Liga's per-char rule on the last char also doesn't match if that
char has fewer than the requested readings, so the digit falls
through as literal text and the default compound chain still
applies — matching the "out-of-range N → default + literal digit"
choice the user picked.

Why `ccmp`, not `calt`
----------------------

We originally registered this lookup under `calt` (Contextual
Alternates), which works in browsers (HarfBuzz) and in TextEdit
(CoreText via Cocoa's text engine). But Apple's iWork typesetter —
used by Pages, Keynote, and Numbers — silently suppresses `calt`
on CJK text runs even when the user toggles "Contextual Alternates"
on. Concretely: `畫畫` rendered as `waa2 waa2` (both default
readings) instead of the intended `waak6 waa2`. Tagging the run as
Traditional Chinese in Pages didn't help, ruling out a langsys-
selection problem; PDF export also showed the wrong glyphs, ruling
out a Pages-display-only quirk. TextEdit shaping the same font
correctly proved the GSUB itself is fine — iWork is overriding
feature selection above the font level.

`ccmp` (Glyph Composition/Decomposition) is specified as required —
shapers MUST apply it, there is no user-facing toggle, and there is
no script-suppression list. Its semantic intent ("convert character
sequences to glyph sequences in a manner dependent on context")
matches what we're doing; the spec doesn't restrict `ccmp` to any
particular GSUB lookup type, so a Chain Context Substitution
under `ccmp` is valid. Moving the rules from `calt` → `ccmp` gets
them applied universally without changing what they do.

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
    variant index that actually appears in the mapping; lazy-built
    on demand — see ``_get_builder`` inside ``buildChainSub``).
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
from utils import (
    get_glyph_name_by_char,
    maybe_wrap_lookup_in_extension,
    register_feature_lookup,
    step_timer,
)

# Per-variant SingleSubstBuilder lookups used to live in a
# pre-allocated fixed-size list capped at 10 — historical assumption
# that no character has more than 10 readings. That holds for
# Cantonese / Mandarin (max ~5 readings on common 多音字) but breaks
# on Japanese on-kun mappings, where high-frequency kanji can have
# 10+ on + kun readings (csv_parser caps at MAX_CHAR_VARIANTS = 240).
# Indexing the fixed list with `variant >= 10` raised `IndexError:
# list index out of range` deep inside the chain-build phase.
#
# The current implementation lazy-allocates one builder per
# distinct variant index actually encountered (see buildChainSub
# below). No hard ceiling here — the upstream cap in csv_parser is
# the single source of truth.

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
    Add a `ccmp` Chain Contextual Substitution that, when the user types
    a known multi-character word, swaps each character glyph for the
    correct variant. This is PASS 2 of the two-pass design — see the
    module docstring section "Two-pass design" for the full picture.

    Pass 2 emits the DEFAULT compound chain (variant_idx 0) for each
    word with no digit input. It must be called AFTER ``buildLiga``
    so liga's per-char digit overrides have already mutated any base
    glyph the user explicitly redirected — when that happens, this
    pass's rule simply fails to match on the resulting variant glyph
    and the per-char override wins.

    Args:
        output_font: TTFont being mutated.
        word_mapping: Ordered dict of
            ``word -> [variant_anno_strs_list, ...]``. Only
            ``variants[0]`` (highest-priority entry) is consumed here;
            ``variants[1:]`` are handled by
            ``buildChainSubVariantOverrides`` in pass 1.
        char_mapping: ``char -> {annotation_str: (glyph_name, variant_index)}``.
    """
    # All progress / timing handled by step_timer — it emits the
    # "Processing ..." line on enter and the "... DONE (Ns, note)" line
    # on exit. Returning inside the with-block is fine; __exit__ fires
    # either way.
    with step_timer("chain context substitution (default pass 2)") as timer:
        gsub = output_font["GSUB"].table
        glyph_order = output_font.getGlyphOrder()
        # Membership tests on a set are O(1); on the list from
        # getGlyphOrder() they're O(n). With 50k glyphs and a long
        # word_mapping iteration this is a free win.
        glyph_order_set = set(glyph_order)

        # One SingleSubst lookup per variant index actually seen in
        # the mapping. Stored as a dict so we can grow it on demand
        # (variant indices range over 1..MAX_CHAR_VARIANTS-1, but
        # most fonts use only a handful). Variant 0 never lands here
        # — it's the "default reading" and the `if variant > 0`
        # guard below filters it before the dict is touched.
        single_sub_builders: dict = {}

        def _get_builder(variant: int):
            """Lazy-allocate the SingleSubstBuilder for `variant`.
            Idempotent — repeated calls for the same variant return
            the same builder instance, so its `.mapping` accumulates
            entries from every word that references that variant."""
            b = single_sub_builders.get(variant)
            if b is None:
                b = SingleSubstBuilder(output_font, None)
                single_sub_builders[variant] = b
            return b

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
        #
        # word_mapping shape is now
        # ``{word: [variant_anno_strs_list, ...]}``. Pass 2 reads
        # ``variants[0]`` only (the default reading); ``variants[1:]``
        # are emitted by ``buildChainSubVariantOverrides`` (pass 1).
        for word, variants in word_mapping.items():
            if len(word) <= 1:
                # Chain context is for *multi*-glyph words. Single-character
                # variants are handled by the ligature substitution path
                # (digit-triggered or 丅+numeral); both lookup families
                # register under `ccmp` now — see liga_handler.py docstring.
                continue
            if not variants:
                # Defensive: a degenerate entry with no variants would
                # have been caught upstream, but guard anyway so we
                # never index into an empty list.
                continue
            anno_strs = variants[0]

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
                    _get_builder(variant).mapping[glyph_name] = target_glyph_name
                per_position_variant.append(variant)

            if not is_buildable:
                continue

            # --- No-op rule filter (big perf win) ---------------------
            #
            # Variant 0 always means "use the default reading" and the
            # default reading IS the original glyph (no substitution).
            # A rule whose positions are ALL variant-0-or-None is
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
            # Every v > 0 here was registered by the loop above
            # (`_get_builder(variant)`), so dict lookup is safe
            # without a default. v == 0 / v is None go to the
            # passthrough branch.
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
        # Iterate variants in ascending order so the rule lookups
        # we built above (which reference builders by their dict
        # entry, not by lookup_index yet) get LookupListIndices
        # assigned deterministically — useful for binary diffs
        # against earlier builds. Builders with empty `.mapping`
        # (variant index added by an earlier word but its glyphs
        # later filtered out) are skipped the same way the old
        # list iteration did.
        next_index = len(gsub.LookupList.Lookup)
        for variant in sorted(single_sub_builders):
            builder = single_sub_builders[variant]
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

        # Big CJK mappings (Mandarin: ~40k chain rules → ~80 subtables;
        # Cantonese: ~24k chain rules → ~50 subtables) push the
        # cumulative subtable-offset array past uint16. Pre-wrap in
        # Extension to avoid fontTools' broken save-time recovery
        # (`AttributeError: 'OTTableWriter' object has no attribute
        # 'name'`). Threshold and rationale: utils.maybe_wrap_…
        maybe_wrap_lookup_in_extension(chain_lookup)

        chain_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(chain_lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

        # ccmp instead of calt — see module docstring "Why `ccmp`, not
        # `calt`" for the iWork-suppression rationale. Same lookup body,
        # different feature tag.
        register_feature_lookup(gsub, "ccmp", chain_index)
        timer.note(f"{len(chain_builder.rules)} rules")


# Fullwidth digit codepoint base: U+FF10 = FULLWIDTH DIGIT ZERO. Mirrors
# the constant in liga_handler — kept duplicated here rather than imported
# to avoid a circular-ish coupling between the two GSUB-builder modules.
_FULLWIDTH_DIGIT_BASE = 0xFF10


def _resolve_digit_glyphs(font, *, fullwidth: bool):
    """Resolve glyph names for digits 0-9 in the requested width form.

    Returns ``{user_num: glyph_name}`` where ``user_num`` is the literal
    decimal value the digit represents (`1`-`9`; `0` is intentionally
    excluded — pass 1 only emits rules for variants ≥ 1, and the bare
    strip is liga's job). Missing digits are silently omitted — the
    caller skips emitting rules that would reference an unresolved
    glyph.
    """
    base = _FULLWIDTH_DIGIT_BASE if fullwidth else ord("0")
    glyphs = {}
    for value in range(1, 10):
        name = get_glyph_name_by_char(font, chr(base + value))
        if name:
            glyphs[value] = name
    return glyphs


def buildChainSubVariantOverrides(
    output_font,
    word_mapping,
    char_mapping,
    *,
    invisible_glyph: str,
) -> None:
    """
    Pass 1 of the two-pass chain context — emit chain rules for compound
    VARIANTS (``word_mapping[word][1:]``) with a trailing digit consumed
    by the rule. See the module docstring section "Two-pass design" for
    the full architectural rationale.

    For each ``word`` with ``len(variants) >= 2`` and each
    ``variant_idx`` in ``1..len(variants)-1`` (single-digit only — user
    numbers > 9 fall through to a future multi-digit extension or to the
    default chain in pass 2):

      Rule  ``[base_chars, digit_for_(variant_idx + 1)]``
            → at base positions: SingleSubst applying ``variants[idx]``
              per-position glyph swaps (variant_idx 0 entries are
              passthrough, like pass 2).
            → at digit position: SingleSubst ``digit_glyph → invisible``
              so the user-typed digit visually disappears.

    Both halfwidth (`0`-`9`) and fullwidth (`０`-`９`) digit forms emit
    parallel rules — DirectWrite's run itemiser splits halfwidth ASCII
    out of Han runs, so the fullwidth rule is what fires in Microsoft
    Word while the halfwidth rule covers HarfBuzz / CoreText / mobile.
    See ``liga_handler.py`` for the original observation.

    Args:
        output_font: TTFont being mutated.
        word_mapping: ``{word: [variant_anno_strs_list, ...]}`` — the
            new csv_parser shape. Pass 1 reads ``variants[1:]``.
        char_mapping: ``char -> {annotation_str: (glyph_name, variant_index)}``.
        invisible_glyph: Glyph name of the zero-advance empty glyph used
            as the digit-substitution target. Inject it with
            ``utils.ensure_invisible_glyph`` before calling this.

    No-op short-circuits: if no compound has more than one variant, or
    the font carries no digit glyphs, the function emits a "0 rules"
    timer note and returns without touching GSUB.
    """
    with step_timer("chain context substitution (variant override pass 1)") as timer:
        # Quick rejection: if every compound has at most one variant
        # (typical for mappings that don't carry weighted alternates),
        # we have nothing to do and shouldn't even build the helper
        # lookups.
        has_multi_variant = any(
            len(word) > 1 and len(variants) >= 2
            for word, variants in word_mapping.items()
        )
        if not has_multi_variant:
            timer.note("0 rules (no multi-variant compounds)")
            return

        # Both digit forms — empty dict if the font doesn't carry that
        # form, which causes the per-form rule loop below to skip.
        halfwidth_digits = _resolve_digit_glyphs(output_font, fullwidth=False)
        fullwidth_digits = _resolve_digit_glyphs(output_font, fullwidth=True)

        if not halfwidth_digits and not fullwidth_digits:
            timer.note("0 rules (no digit glyphs in font)")
            return

        gsub = output_font["GSUB"].table
        glyph_order_set = set(output_font.getGlyphOrder())

        if invisible_glyph not in glyph_order_set:
            # ensure_invisible_glyph hit its CFF fallback (no glyf
            # table). Pass 1 can't emit rules that reference a
            # non-existent target glyph, so bail. Pass 2 still runs
            # normally — only compound-variant cycling is lost.
            timer.note(
                f"0 rules (invisible glyph {invisible_glyph!r} not in font; "
                "compound-variant cycling disabled)"
            )
            return

        # Same lazy-allocate pattern as pass 2's buildChainSub. Pass 1
        # builders are distinct objects from pass 2's because each call
        # creates its own dict — that's fine; SingleSubst lookups can
        # repeat the same `glyph → variant_glyph` mapping across two
        # lookup-list entries without semantic conflict. The cost is a
        # handful of extra Lookup objects in GSUB, which is negligible
        # next to the chain-rule subtables we're about to emit.
        single_sub_builders: dict = {}

        def _get_builder(variant: int):
            b = single_sub_builders.get(variant)
            if b is None:
                b = SingleSubstBuilder(output_font, None)
                single_sub_builders[variant] = b
            return b

        # Shared digit-eater: ONE SingleSubst mapping every digit glyph
        # (halfwidth ∪ fullwidth) to the invisible glyph. The chain rule
        # at the digit position references this single lookup; at
        # runtime the engine substitutes whichever specific digit glyph
        # the user typed (because SingleSubst dispatches by input GID).
        digit_eater_builder = SingleSubstBuilder(output_font, None)
        for glyph in halfwidth_digits.values():
            digit_eater_builder.mapping[glyph] = invisible_glyph
        for glyph in fullwidth_digits.values():
            digit_eater_builder.mapping[glyph] = invisible_glyph

        chain_builder = ChainContextSubstBuilder(output_font, None)
        rules_in_current_subtable = 0
        subtable_break_counter = 0

        for word, variants in word_mapping.items():
            if len(word) <= 1 or len(variants) < 2:
                continue

            # Build the base input glyph list once — same for every
            # variant of this compound. If any base char isn't in the
            # font, skip the whole compound (same behaviour as pass 2).
            input_glyphs = []
            buildable = True
            for char in word:
                glyph_name = get_glyph_name_by_char(output_font, char)
                if not isinstance(glyph_name, str) or glyph_name not in glyph_order_set:
                    buildable = False
                    break
                input_glyphs.append(glyph_name)
            if not buildable:
                continue

            # Emit one chain rule per variant_idx ≥ 1, per digit form.
            # variants[0] is the default — pass 2's job.
            for variant_idx in range(1, len(variants)):
                user_num = variant_idx + 1
                if user_num > 9:
                    # Single-digit suffix only. Multi-digit compound
                    # cycling (`字字10`+) is a future extension that
                    # would need multi-component chain rules and a
                    # decimal decoder — out of scope for the initial
                    # implementation. Users typically have 2-3 readings
                    # per compound at most, so the 9-variant ceiling
                    # covers every real-world case in the shipped data.
                    break

                anno_strs = variants[variant_idx]

                # Compute per_position_variant for THIS variant. Same
                # logic as pass 2: variant 0 positions are passthrough,
                # variants > 0 register a substitution in the
                # per-variant SingleSubst builder.
                per_position_variant = []
                variant_buildable = True
                for i, char in enumerate(word):
                    anno_str = anno_strs[i]
                    if char not in char_mapping or anno_str not in char_mapping[char]:
                        per_position_variant.append(None)
                        continue
                    target_glyph_name, variant = char_mapping[char][anno_str]
                    if variant > 0:
                        _get_builder(variant).mapping[input_glyphs[i]] = target_glyph_name
                    per_position_variant.append(variant)
                if not variant_buildable:
                    continue

                # NOTE: NO no-op filter here, in contrast to pass 2.
                # Even if all base-position substitutions are
                # passthrough (the variant happens to use each
                # character's default reading), the rule still has the
                # critical side effect of CONSUMING the user-typed
                # digit. Emitting it preserves the digit-eater
                # semantics — without this rule, the digit would render
                # as literal text and the variant override would feel
                # broken even though the visual result on the bases
                # would be the same.

                # Per-position rule_lookups, then the digit-eater at
                # the trailing digit position.
                base_lookups = [
                    [single_sub_builders[v]] if v is not None and v > 0 else None
                    for v in per_position_variant
                ]
                rule_lookups = base_lookups + [[digit_eater_builder]]

                # Emit parallel rules — one for each digit width form
                # the font supports. The two rules are independent
                # (different input coverage); the shaper picks
                # whichever matches the user's typed digit form.
                for digit_set in (halfwidth_digits, fullwidth_digits):
                    digit_glyph = digit_set.get(user_num)
                    if not digit_glyph:
                        continue
                    chain_input = [[g] for g in input_glyphs] + [[digit_glyph]]
                    chain_builder.rules.append(
                        ChainContextualRule(
                            prefix=[],
                            glyphs=chain_input,
                            suffix=[],
                            lookups=rule_lookups,
                        )
                    )
                    rules_in_current_subtable += 1

                if rules_in_current_subtable >= RULES_PER_SUBTABLE:
                    chain_builder.add_subtable_break(subtable_break_counter)
                    subtable_break_counter += 1
                    rules_in_current_subtable = 0

        # --- Append SingleSubst lookups; record indices ----------------
        # Same ordering contract as pass 2: append → assign
        # `.lookup_index` → build the chain. Variant SingleSubst
        # lookups go first, then the shared digit-eater. The chain
        # rules reference both by builder identity; their
        # lookup_index attrs are read during `chain_builder.build()`
        # below to write SubstLookupRecord.LookupListIndex.
        next_index = len(gsub.LookupList.Lookup)
        for variant in sorted(single_sub_builders):
            builder = single_sub_builders[variant]
            if not builder.mapping:
                continue
            lookup = builder.build()
            # IgnoreBaseGlyphs (flag bit 1) — matches pass 2's flag for
            # output-compatibility across both passes' SingleSubst
            # lookups. The flag is harmless for our use (we substitute
            # base glyphs, and they're never tagged as base in GDEF —
            # GDEF base entries are for mark-positioning bases, not
            # GSUB IgnoreBaseGlyphs which only filters when a font
            # explicitly tags ideographs as "Base" in GDEF GlyphClass,
            # which our outputs don't).
            lookup.LookupFlag = 1
            builder.lookup_index = next_index
            gsub.LookupList.Lookup.append(lookup)
            next_index += 1

        if digit_eater_builder.mapping:
            lookup = digit_eater_builder.build()
            lookup.LookupFlag = 1
            digit_eater_builder.lookup_index = next_index
            gsub.LookupList.Lookup.append(lookup)
            next_index += 1

        if not chain_builder.rules:
            # Every multi-variant compound was un-buildable (e.g. every
            # base char absent from the font), or every variant_idx was
            # > 9 and got skipped. Update LookupCount to reflect the
            # SingleSubst lookups we DID append and bail.
            gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
            timer.note("0 rules")
            return

        chain_lookup = chain_builder.build()

        # Wrap in Extension when the cumulative subtable offsets are at
        # risk of overflowing uint16. Pass 1 is typically much smaller
        # than pass 2 (only multi-variant compounds, only a handful per
        # mapping), so the wrap usually isn't needed — but keep the
        # call for consistency with pass 2.
        maybe_wrap_lookup_in_extension(chain_lookup)

        chain_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(chain_lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

        # Same feature as pass 2 — ccmp, not calt. The two passes share
        # the feature tag; their relative shaping order is enforced by
        # LookupListIndex (pass 1 appended before liga, pass 2 after).
        register_feature_lookup(gsub, "ccmp", chain_index)
        timer.note(f"{len(chain_builder.rules)} rules")
