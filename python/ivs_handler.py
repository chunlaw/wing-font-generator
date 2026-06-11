"""
ivs_handler — emit a cmap format-14 (Unicode Variation Sequences)
subtable so users with a VS-capable IME can pick a polyphonic-character
variant by typing ``<base codepoint> + <variation selector>``, in
addition to the digit-suffix and ``丅+numeral`` paths emitted by
liga_handler.

Each polyphonic character with N annotations gets N-1 IVS entries::

    base + VS17 (U+E0100) → variant 1
    base + VS18 (U+E0101) → variant 2
    ...
    base + VS(16+N) (≤ U+E01EF) → variant N

Variant 0 (the default reading) needs no IVS entry — typing the bare
base character already resolves through the normal format-4/12 cmap
subtable to whatever default-reading variant glyph composition
produced.

Why ship this on top of the GSUB ligature paths
-----------------------------------------------

Three reasons:

1. **Universal shaper support, no feature toggle.** Format-14 is
   consulted at cmap-lookup time by every modern shaper (HarfBuzz,
   CoreText, DirectWrite). There is no script-suppression list, no
   user-facing toggle, no font feature involved — it just works.

2. **No extra characters in the document.** Where the ligature path
   leaves the trigger (``丅``) and numeral visible in plain text when
   the font isn't loaded, IVS is zero-width: the document stores
   ``行 + U+E0100`` and renders bare ``行`` everywhere else.

3. **Zero risk to existing paths.** IVS lives entirely in cmap. The
   ccmp chain-context and ligature lookups built by
   ``chain_context_handler`` / ``liga_handler`` are untouched, so
   ``銀行`` / ``行1`` / ``行丅一`` keep working exactly as today.

Trade-off worth flagging
------------------------

The same zero-width property that makes IVS compact also makes the
chosen variant invisible without our font installed: a copy-paste of
``行 + U+E0100`` into a system without Wing Font looks identical to a
bare ``行``. The existing ligature paths in liga_handler stay
human-readable as a fallback, so we ship IVS as a SUPPLEMENT, not a
replacement.

A second practical caveat: typing a VS character is annoying without
IME support. Power users on macOS (Character Viewer), Adobe apps
(Glyphs panel), or Japanese IMEs (which expose IVS for kanji shape
variants) get it for free; most other users will still reach for the
liga paths.
"""

from typing import Dict, Tuple

from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

from utils import step_timer

# Variation Selector Supplement: U+E0100 (VS17) through U+E01EF (VS256).
# IVS uses the supplement range, NOT the lower VS1–VS16 (U+FE00–U+FE0F)
# range which Unicode reserves for older variation sequences (KangXi
# radicals, math symbol shapes, etc.).
IVS_BASE = 0xE0100
IVS_LIMIT = 0xE01EF  # inclusive — 240 selectors total

# Format-14 cmap subtable identifier triple. Platform 0 / encoding 5 is
# the Unicode Variation Sequences platform-encoding pair; the OpenType
# spec allows only one such subtable per font.
_UVS_PLATFORM_ID = 0
_UVS_PLAT_ENC_ID = 5
_UVS_FORMAT = 14


def buildIvs(
    output_font,
    char_mapping: Dict[str, Dict[str, Tuple[str, int]]],
) -> None:
    """
    Build (or augment) the cmap format-14 subtable so every variant
    glyph in ``char_mapping`` is reachable as ``<base> + <VS>``.

    No-op when the mapping contains only single-variant characters
    (nothing to disambiguate via IVS).
    """
    with step_timer("ivs (cmap fmt 14)") as timer:
        cmap = output_font["cmap"]

        # Find or create the format-14 subtable. Most CJK source fonts
        # don't ship one; Adobe-Japan1 fonts and a handful of others do,
        # carrying kanji-shape variations. When present, we ADD our
        # entries to its uvsDict without disturbing the existing ones.
        fmt14 = _find_or_create_uvs_subtable(cmap)

        rules_added = 0
        chars_with_variants = 0
        overflow_warned = False

        for original_char, anno_strs_dict in char_mapping.items():
            # IVS attaches to a single base codepoint. Skip multi-char
            # entries (the mapping format technically allows them; word
            # context goes through chain_context_handler instead).
            if len(original_char) != 1:
                continue
            base_unicode = ord(original_char)

            # {variant_index: glyph_name}. Index 0 is the default
            # reading — bare base codepoint already maps to it via
            # format-4/12, so no IVS entry needed.
            index_to_glyph: Dict[int, str] = {
                idx: name for name, idx in anno_strs_dict.values()
            }
            non_default_variants = sorted(
                (idx, glyph)
                for idx, glyph in index_to_glyph.items()
                if idx >= 1
            )
            if not non_default_variants:
                continue

            chars_with_variants += 1

            for variant_index, glyph_name in non_default_variants:
                vs_codepoint = IVS_BASE + (variant_index - 1)
                if vs_codepoint > IVS_LIMIT:
                    # 240 selectors should be plenty (no realistic
                    # mapping has 240 readings of the same character),
                    # but emit one warning and skip the overflow rather
                    # than write malformed cmap data.
                    if not overflow_warned:
                        print(
                            "Warning: ivs_handler: variant index "
                            f"{variant_index} of {original_char!r} "
                            "exceeds the IVS supplement range "
                            "(U+E0100–U+E01EF); skipping further "
                            "overflow entries silently."
                        )
                        overflow_warned = True
                    continue

                entries = fmt14.uvsDict.setdefault(vs_codepoint, [])
                entries.append((base_unicode, glyph_name))
                rules_added += 1

        if rules_added == 0:
            # Either no polyphonic chars in the mapping, or every
            # mapped char has only its default reading. Leave the
            # subtable in place (if we created it) but empty — fontTools
            # will skip-emit it on compile when uvsDict is empty.
            timer.note("no IVS entries needed")
            return

        # The OpenType spec requires VarSelector records sorted by
        # selector codepoint, and within each, NonDefaultUVS entries
        # sorted by base codepoint. fontTools sorts the outer dict at
        # compile, but only sorts the inner list iff it's already
        # tuple-of-tuples — sort defensively to avoid relying on that.
        for entries in fmt14.uvsDict.values():
            entries.sort(key=lambda e: e[0])

        timer.note(
            f"{rules_added} entries across "
            f"{chars_with_variants} char(s), "
            f"{len(fmt14.uvsDict)} VS slot(s)"
        )


def _find_or_create_uvs_subtable(cmap):
    """Return the existing format-14 subtable, or attach a new empty one."""
    for sub in cmap.tables:
        if sub.format == _UVS_FORMAT:
            # Ensure uvsDict exists — older fontTools versions leave it
            # unset on freshly-loaded fonts that have an empty fmt14.
            if not hasattr(sub, "uvsDict") or sub.uvsDict is None:
                sub.uvsDict = {}
            return sub

    # fontTools API note: `CmapSubtable.newSubtable(format)` constructs
    # an instance of the right subclass and pre-sets `format` for us.
    # Older versions of fontTools spelled this `newSubtableClass(fmt)()`
    # — that method was renamed/removed in recent releases, so don't
    # be tempted to bring back the old call.
    sub = CmapSubtable.newSubtable(_UVS_FORMAT)
    sub.platformID = _UVS_PLATFORM_ID
    sub.platEncID = _UVS_PLAT_ENC_ID
    # Format-14 has no per-table language; the spec reserves the
    # `language` field as zero, but fontTools' compiler uses
    # 0xFFFFFFFF as a sentinel for "not applicable." Either value
    # produces valid output; we use the sentinel because that's what
    # fontTools itself writes when it creates a fresh fmt14.
    sub.language = 0xFFFFFFFF
    # `cmap` and `uvsDict` are both expected by fontTools' compile
    # path. `cmap` stays empty (format-14 carries its data in uvsDict).
    sub.cmap = {}
    sub.uvsDict = {}
    cmap.tables.append(sub)
    return sub
