"""
liga_handler — emit Ligature Substitution lookups that let the user
manually pick a variant by typing ``<char><number>`` (or, as a fallback
for IMEs that don't easily type Latin digits, ``<char>丅<chinese-numeral>``).

Multi-digit selection
---------------------

The number after the character is read in full decimal, so a character
with more than nine variants is still reachable from the keyboard:
``行1`` → variant 1, ``行11`` → variant 11, ``行111`` → variant 111, and
``行0`` resets to the default reading. This works because every variant
is emitted as a ligature whose components spell its index
(``(行,1,1) -> variant 11``), and fontTools orders the ligatures in a set
longest-first, so the longest valid number wins (``行11`` matches the
3-component rule before the 2-component ``行1``).

The ligature always STARTS from the character's default glyph (the glyph
the bare character maps to), and the whole number is typed in one run
after it. An earlier design also registered each variant glyph as a
ligature start so a trailing digit could "re-pick" from whatever was
already showing; that's incompatible with reading a multi-digit number
(``行12`` would mean "variant 1, then re-pick 2" instead of "variant
12"), so it was removed. Re-picking still works the ordinary way — the
text run reshapes from the base character, so editing the trailing
number re-selects. A number with no matching variant resolves its
longest matching prefix and leaves the leftover digits as literal text.

The ``丅 + chinese-numeral`` fallback and the IVS (``<base> + variation
selector``) path remain single-step per variant; for variants past the
9th that you'd rather not type as a multi-digit number, the IVS path
(ivs_handler) addresses up to 240 variants directly.

Filename keeps the historical "liga_handler" prefix because the LOOKUP
TYPE is still GSUB Type 4 (Ligature Substitution) — that part hasn't
changed. What changed is which FEATURE those lookups are registered
under: it used to be the OpenType ``liga`` feature, and is now ``ccmp``.

Why `ccmp`, not `liga`
----------------------

Same reason ``chain_context_handler.py`` is under ``ccmp``: Apple's
iWork typesetter (Pages, Keynote, Numbers) silently suppresses
``liga`` on CJK text runs even when the user has toggled "Ligatures"
on in the text settings. Concretely, ``行丅一`` would render as
``行 丅 一`` (three separate glyphs, no annotation override applied)
in Pages no matter what the user did. Other apps had a different but
related problem: ``liga`` is "default on but user-toggleable," so
users in Canva / Microsoft Word had to find the ligature toggle to
make the digit-trigger overrides work.

Moving these rules to ``ccmp`` solves both — ``ccmp`` is
required-by-spec, applied universally by every shaper with no
user-facing toggle and no script-suppression list. Trade-off: users
lose the ability to disable annotation overrides via app settings.
For an annotation font that's a feature, not a bug.

The lookup stays GSUB Type 4 (``LigatureSubstBuilder``): char+digit
rules (now 2-or-more components, one per decimal digit of the variant
number — see "Multi-digit selection") and char+trigger+numeral rules
(3 components). The feature registration is ``ccmp``, not ``liga``.

This file no longer manages the OpenType ScriptList/LangSys plumbing
inline — that's centralised in ``utils.register_feature_lookup``.
"""

from typing import Dict, Tuple

from fontTools.otlLib.builder import LigatureSubstBuilder

from utils import get_glyph_name_by_char, register_feature_lookup, step_timer

# Chinese numeral fallback. When typing Latin digits is inconvenient, the
# user can type 字 + <trigger> + 一/二/三/... to pick a variant. The
# trigger character is configurable via the `trigger_char` param to
# buildLiga(); the default `丅` is a deliberately-rare Han character so
# it doesn't collide with normal text, but users can override to
# something easier-to-type with their IME (e.g. `々`, `〇`, `〃`).
_CHINESE_NUMERALS = ("零", "一", "二", "三", "四", "五", "六", "七", "八", "九")
DEFAULT_TRIGGER_CHAR = "丅"

# OpenType Ligature Substitution (GSUB4) uses uint16 offsets within each
# subtable. A subtable with thousands of ligatures will overflow that
# 64KB budget — fontTools' auto-splitter has a bug here too
# (UnboundLocalError on `newLen`), so we pre-emptively split via
# add_subtable_break() before any subtable approaches the limit.
#
# Each ligature serializes to roughly 6 + 2*components bytes plus a
# 4-byte offset entry. 1000 ligatures per subtable lands well under
# 32KB even for the 3-component (trigger+numeral) rules, leaving plenty
# of headroom. Going much higher risks tripping the overflow on fonts
# with many polyphonic characters; going much lower bloats GSUB size.
_LIGATURES_PER_SUBTABLE = 1000


def buildLiga(
    output_font,
    char_mapping: Dict[str, Dict[str, Tuple[str, int]]],
    *,
    trigger_char: str = DEFAULT_TRIGGER_CHAR,
) -> None:
    """
    Build the per-character variant-selection ligature lookup and
    register it under the ``ccmp`` feature. See module docstring for
    why ``ccmp`` and not ``liga``.

    For each character with N annotations the builder emits, all
    starting from the character's default glyph:
      - ``(default, '0')                    -> default glyph``
      - ``(default, <decimal digits of i>)  -> variant-i glyph`` for
        i in 1..N-1 (single component for 1–9, multi-component for ≥10 —
        see _add_digit_rules / the module docstring)
      - ``(default, <trigger>, 零/一/二/...) -> default/variant-i`` as a
        single-numeral fallback (1–9)

    Args:
        output_font: TTFont being mutated.
        char_mapping: ``char -> {annotation_str: (glyph_name, variant_index)}``.
        trigger_char: The single-character separator for the IME-friendly
            variant override (e.g. ``行<trigger>一`` to select variant 1).
            Defaults to ``丅`` (U+4E05). Pass ``""`` to disable the
            trigger+numeral path entirely (only the digit-suffix path will
            be emitted). The character MUST exist in the font's cmap, MUST
            be a single codepoint, and SHOULD NOT appear in the user's
            mapping (it'd collide with an annotated character).
    """
    with step_timer("ligature substitution") as timer:
        gsub = output_font["GSUB"].table

        digit_glyphs = _resolve_digits(output_font)
        # Empty trigger_char disables the trigger+numeral path. We still
        # honour the digit-suffix rules in that case so the user can
        # always override via the universal Latin-digit path.
        trigger_glyph = (
            get_glyph_name_by_char(output_font, trigger_char)
            if trigger_char
            else None
        )
        numeral_glyphs = _resolve_chinese_numerals(output_font)

        if not digit_glyphs and not (trigger_glyph and numeral_glyphs):
            timer.note("skipped — no triggers available")
            return

        # One unified LigatureSubstBuilder for the whole feature, but
        # we interleave SUBTABLE_BREAK sentinels every
        # _LIGATURES_PER_SUBTABLE additions so the eventual build()
        # emits multiple compact subtables rather than one giant subtable
        # that overflows.
        liga_builder = LigatureSubstBuilder(output_font, None)

        # Tracks the number of real (non-sentinel) ligatures since the
        # last subtable break, so we know when to insert another break.
        rules_in_subtable = 0

        # `add_subtable_break(location)` stores its sentinel keyed by
        # `(SUBTABLE_BREAK_, location)`. Two calls with the same location
        # overwrite each other — only one break gets recorded — so we
        # feed the call a monotonically increasing counter to keep each
        # sentinel key unique.
        subtable_break_counter = 0

        for original_char, anno_strs_dict in char_mapping.items():
            # Multi-character keys are Arabic word-unit entries — their
            # variant selection is tatweel-based and lives in
            # word_liga_handler (digit suffixes don't survive the bidi
            # run split after Arabic text anyway).
            if len(original_char) != 1:
                continue
            default_glyph_name = get_glyph_name_by_char(output_font, original_char)
            if not default_glyph_name:
                continue

            # {variant_index: glyph_name} — needed because we want the
            # *target* glyph by index, not by annotation string.
            resolved = [t for t in anno_strs_dict.values() if isinstance(t, tuple)]
            index_to_glyph = {idx: name for name, idx in resolved}

            # The ligature start is ALWAYS the character's default
            # (variant-0) glyph — i.e. the glyph the bare character cmaps
            # to. The whole number is typed in one run after it
            # (`行11` → [行, 1, 1]), so longest-match picks the variant
            # directly from the default base; we no longer register each
            # variant glyph as its own ligature start. See the module
            # docstring ("Multi-digit selection") for why that override
            # was dropped.
            before = len(liga_builder.ligatures)
            _add_digit_rules(
                liga_builder,
                base_glyph=default_glyph_name,
                default_glyph=default_glyph_name,
                index_to_glyph=index_to_glyph,
                digit_glyphs=digit_glyphs,
            )
            if trigger_glyph and numeral_glyphs:
                _add_chinese_numeral_rules(
                    liga_builder,
                    base_glyph=default_glyph_name,
                    default_glyph=default_glyph_name,
                    index_to_glyph=index_to_glyph,
                    trigger_glyph=trigger_glyph,
                    numeral_glyphs=numeral_glyphs,
                )
            rules_in_subtable += len(liga_builder.ligatures) - before

            # Insert a subtable break between *characters*, never
            # mid-character, so a single character's variants stay
            # coverage-grouped.
            if rules_in_subtable >= _LIGATURES_PER_SUBTABLE:
                liga_builder.add_subtable_break(subtable_break_counter)
                subtable_break_counter += 1
                rules_in_subtable = 0

        # Count excludes the sentinel break entries (their keys start
        # with the SUBTABLE_BREAK_ marker, which is a string not a
        # glyph tuple).
        real_rule_count = sum(
            1 for k in liga_builder.ligatures
            if not (
                isinstance(k, tuple) and k and k[0] == liga_builder.SUBTABLE_BREAK_
            )
        )
        if real_rule_count == 0:
            timer.note("0 rules")
            return

        lookup = liga_builder.build()
        lookup_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(lookup)
        gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

        # Registered under ccmp, NOT liga — see module docstring "Why
        # `ccmp`, not `liga`" for the iWork-suppression rationale.
        # Same lookup body (GSUB Type 4 Ligature Substitution),
        # different feature tag.
        register_feature_lookup(gsub, "ccmp", lookup_index)
        timer.note(
            f"{real_rule_count} rules in {lookup.SubTableCount} subtable(s)"
        )


def _resolve_digits(font) -> Dict[int, str]:
    """Resolve the glyph names for ASCII digits 0–9, skipping any missing."""
    glyphs: Dict[int, str] = {}
    for i in range(10):
        name = get_glyph_name_by_char(font, str(i))
        if name:
            glyphs[i] = name
    if not glyphs:
        print("Warning: no ASCII-digit glyphs found; digit-trigger rules will be skipped.")
    return glyphs


def _resolve_chinese_numerals(font) -> Dict[int, str]:
    """Resolve glyph names for 零..九, skipping any missing."""
    glyphs: Dict[int, str] = {}
    for idx, ch in enumerate(_CHINESE_NUMERALS):
        name = get_glyph_name_by_char(font, ch)
        if name:
            glyphs[idx] = name
    if not glyphs:
        print(
            "Warning: no Chinese-numeral glyphs found; 丅+numeral fallback "
            "rules will be skipped."
        )
    return glyphs


def _digit_components(index: int, digit_glyphs: Dict[int, str]):
    """Glyph names spelling `index` in decimal, or None if any required
    digit glyph is missing from the font.

    e.g. 7 -> ['seven'], 11 -> ['one', 'one'], 111 -> ['one','one','one'].
    """
    components = []
    for ch in str(index):
        glyph = digit_glyphs.get(int(ch))
        if glyph is None:
            return None
        components.append(glyph)
    return components


def _add_digit_rules(
    builder: LigatureSubstBuilder,
    *,
    base_glyph: str,
    default_glyph: str,
    index_to_glyph: Dict[int, str],
    digit_glyphs: Dict[int, str],
) -> None:
    """Emit ``(base, <decimal digits of i>) -> variant_i`` rules so the
    user picks variant *i* by typing its number after the character.

    Single-digit indices (1–9) produce a 2-component ligature
    ``(base, 'i')`` exactly as before; indices ≥ 10 produce a
    multi-component ligature, e.g. variant 11 -> ``(base, '1', '1')`` and
    variant 111 -> ``(base, '1', '1', '1')``. fontTools orders the
    ligatures within a set longest-first (``_getLigatureSortKey`` returns
    ``-len(components)``), so for ``行11`` the 3-component ``(行,1,1)``
    rule is tried before the 2-component ``(行,1)`` — the longest valid
    number wins. A number with no matching variant falls back to its
    longest matching prefix and leaves the remaining digits as literal
    text (e.g. ``行19`` with only variant 1 present → variant 1 then a
    literal ``9``).

    ``(base, '0')`` resets to the default reading. Because the reset
    target is the default glyph — which is itself the character's base —
    a leading-zero sequence like ``行01`` naturally re-enters and
    resolves to variant 1.
    """
    zero_glyph = digit_glyphs.get(0)
    if zero_glyph is not None:
        # '0' resets to the character's default reading.
        builder.ligatures[(base_glyph, zero_glyph)] = default_glyph
    for num_index, target in index_to_glyph.items():
        if num_index < 1:
            continue
        components = _digit_components(num_index, digit_glyphs)
        if components is None:
            # A digit glyph needed to spell this index is missing; the
            # variant stays reachable via the IVS path, just not by
            # typing its number.
            continue
        builder.ligatures[(base_glyph, *components)] = target


def _add_chinese_numeral_rules(
    builder: LigatureSubstBuilder,
    *,
    base_glyph: str,
    default_glyph: str,
    index_to_glyph: Dict[int, str],
    trigger_glyph: str,
    numeral_glyphs: Dict[int, str],
) -> None:
    """Emit (base, 丅, numeral) -> variant rules — the IME-friendly fallback."""
    for num_index, numeral_glyph in numeral_glyphs.items():
        target = default_glyph if num_index == 0 else index_to_glyph.get(num_index)
        if target:
            builder.ligatures[(base_glyph, trigger_glyph, numeral_glyph)] = target
