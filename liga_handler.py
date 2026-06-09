"""
liga_handler — emit the `liga` Ligature Substitution lookup that lets the
user manually pick a variant by typing ``<char><digit>`` (or, as a fallback
for IMEs that don't easily type Latin digits, ``<char>丅<chinese-numeral>``).

This file no longer manages the OpenType ScriptList/LangSys plumbing
inline — that's centralised in ``utils.register_feature_lookup``. The
ligature construction itself was already using
``fontTools.otlLib.builder.LigatureSubstBuilder`` so the only structural
change is dropping the chunking workaround (``chunk_size``) — the builder
handles subtable splitting internally via subtable breaks.
"""

from typing import Dict, Tuple

from fontTools.otlLib.builder import LigatureSubstBuilder

from utils import get_glyph_name_by_char, register_feature_lookup

# Chinese numeral fallback. When typing Latin digits is inconvenient, the
# user can type 字 + 丅 + 一/二/三/... to pick a variant.
_CHINESE_NUMERALS = ("零", "一", "二", "三", "四", "五", "六", "七", "八", "九")
_TRIGGER_CHAR = "丅"

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
    output_font, char_mapping: Dict[str, Dict[str, Tuple[str, int]]]
) -> None:
    """
    Build the `liga` lookup with per-character variant-selection rules.

    For each character with N annotations the builder emits:
      - ``(any-variant, '0')   -> default glyph``
      - ``(any-variant, 'i')   -> variant-i glyph`` for i in 1..N-1
      - ``(any-variant, 丅, 零/一/二/...) -> default/variant-i`` as fallback

    Args:
        output_font: TTFont being mutated.
        char_mapping: ``char -> {annotation_str: (glyph_name, variant_index)}``.
    """
    gsub = output_font["GSUB"].table

    digit_glyphs = _resolve_digits(output_font)
    trigger_glyph = get_glyph_name_by_char(output_font, _TRIGGER_CHAR)
    numeral_glyphs = _resolve_chinese_numerals(output_font)

    if not digit_glyphs and not (trigger_glyph and numeral_glyphs):
        print(
            "Skipping liga: neither Latin digits nor the 丅+numeral "
            "fallback is available in the font."
        )
        return

    # One unified LigatureSubstBuilder for the whole feature, but we
    # interleave SUBTABLE_BREAK sentinels every _LIGATURES_PER_SUBTABLE
    # additions so the eventual build() emits multiple compact subtables
    # within one Lookup rather than one giant subtable that overflows.
    liga_builder = LigatureSubstBuilder(output_font, None)

    # Tracks the number of real (non-sentinel) ligatures since the last
    # subtable break, so we know when to insert another break.
    rules_in_subtable = 0

    # `add_subtable_break(location)` stores its sentinel keyed by
    # `(SUBTABLE_BREAK_, location)`. Two calls with the same location
    # overwrite each other — only one break gets recorded — so we feed
    # the call a monotonically increasing counter to keep each sentinel
    # key unique.
    subtable_break_counter = 0

    for original_char, anno_strs_dict in char_mapping.items():
        default_glyph_name = get_glyph_name_by_char(output_font, original_char)
        if not default_glyph_name:
            continue

        # {variant_index: glyph_name} — needed because we want the *target*
        # glyph by index, not by annotation string.
        index_to_glyph = {idx: name for name, idx in anno_strs_dict.values()}
        all_variant_glyphs = [name for name, _ in anno_strs_dict.values()]

        # Each variant can be the *starting* glyph of a ligature (so a
        # second digit overrides whatever the first sub picked).
        for base_glyph in all_variant_glyphs:
            before = len(liga_builder.ligatures)
            _add_digit_rules(
                liga_builder,
                base_glyph=base_glyph,
                default_glyph=default_glyph_name,
                index_to_glyph=index_to_glyph,
                digit_glyphs=digit_glyphs,
            )
            if trigger_glyph and numeral_glyphs:
                _add_chinese_numeral_rules(
                    liga_builder,
                    base_glyph=base_glyph,
                    default_glyph=default_glyph_name,
                    index_to_glyph=index_to_glyph,
                    trigger_glyph=trigger_glyph,
                    numeral_glyphs=numeral_glyphs,
                )
            rules_in_subtable += len(liga_builder.ligatures) - before

            # Insert a subtable break between *characters*, never mid-base,
            # so a single character's variants stay coverage-grouped.
            if rules_in_subtable >= _LIGATURES_PER_SUBTABLE:
                liga_builder.add_subtable_break(subtable_break_counter)
                subtable_break_counter += 1
                rules_in_subtable = 0

    # Count excludes the sentinel break entries (their keys start with
    # the SUBTABLE_BREAK_ marker, which is a string not a glyph tuple).
    real_rule_count = sum(
        1 for k in liga_builder.ligatures
        if not (isinstance(k, tuple) and k and k[0] == liga_builder.SUBTABLE_BREAK_)
    )
    if real_rule_count == 0:
        print("No liga rules produced.")
        return

    lookup = liga_builder.build()
    lookup_index = len(gsub.LookupList.Lookup)
    gsub.LookupList.Lookup.append(lookup)
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

    register_feature_lookup(gsub, "liga", lookup_index)
    print(
        f"Done liga ({real_rule_count} rules in "
        f"{lookup.SubTableCount} subtable(s))"
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


def _add_digit_rules(
    builder: LigatureSubstBuilder,
    *,
    base_glyph: str,
    default_glyph: str,
    index_to_glyph: Dict[int, str],
    digit_glyphs: Dict[int, str],
) -> None:
    """Emit (base, digit) -> variant rules for one character's variants."""
    for num_index, digit_glyph in digit_glyphs.items():
        # Digit '0' resets to the character's default reading; digits 1..9
        # pick the corresponding variant if it exists.
        target = default_glyph if num_index == 0 else index_to_glyph.get(num_index)
        if target:
            builder.ligatures[(base_glyph, digit_glyph)] = target


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
