"""
ivs_handler — emit a cmap format-14 (Unicode Variation Sequences)
subtable so users with a VS-capable IME can pick a polyphonic-character
variant by typing ``<base codepoint> + <variation selector>``, in
addition to the digit-suffix and ``丅+numeral`` paths emitted by
liga_handler.

Each polyphonic character gets one IVS entry per reading — the default
included — numbered by sorting the readings' annotation strings::

    行 + VS17 (U+E0100) → haang1
    行 + VS18 (U+E0101) → haang4
    行 + VS19 (U+E0102) → hang4
    ...

plus two fixed slots: ``+ VS255`` (muted variant) and ``+ VS256`` (bare,
annotation-free glyph). See ``buildIvs`` for why the numbering ignores
the weight-ranked variant index.

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
# The last two selectors are fixed slots, so they never shift when a
# mapping gains readings:
#   VS256 — the BARE (annotation-free) glyph of a mapped char, i.e. the
#           pure-cmap path to what `行０` produces;
#   VS255 — the MUTED variant (empty annotation, e.g. 毋 in the 合音
#           拍毋見). Its empty string would otherwise sort first and
#           renumber every reading of a char the day it gains one.
BARE_SELECTOR = 0xE01EF
MUTE_SELECTOR = 0xE01EE
IVS_LIMIT = MUTE_SELECTOR - 1  # inclusive — 238 reading selectors


# Format-14 cmap subtable identifier triple. Platform 0 / encoding 5 is
# the Unicode Variation Sequences platform-encoding pair; the OpenType
# spec allows only one such subtable per font.
_UVS_PLATFORM_ID = 0
_UVS_PLAT_ENC_ID = 5
_UVS_FORMAT = 14


def buildIvs(
    output_font,
    char_mapping: Dict[str, Dict[str, Tuple[str, int]]],
    bare_base_map: Dict[str, str] | None = None,
) -> set:
    """
    Build (or augment) the cmap format-14 subtable so every variant
    glyph in ``char_mapping`` is reachable as ``<base> + <VS>``.

    ``bare_base_map`` (``{default_glyph: bare_glyph}``) additionally
    maps ``<base> + BARE_SELECTOR`` to the annotation-free glyph.

    Selector slots are derived from the readings themselves, NOT from
    the weight-ranked variant index: every reading of a char — the
    default included — is sorted by its annotation string (code point
    order) and position p gets ``IVS_BASE + p``. Re-weighting the CSV,
    adding words, or a different reading becoming the default therefore
    never renumbers anything; only adding/removing/respelling a reading
    of that same char moves the readings sorted after it. (The digit
    syntax `行２` still means "2nd most common" and is unaffected.)

    Returns the set of selector codepoints used (the subsetter must be
    told to keep them).
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

            by_index = sorted(
                (idx, anno, name) for anno, (name, idx) in anno_strs_dict.items()
            )
            slotted = [
                (slot, name)
                for slot, (anno, name) in enumerate(
                    sorted((anno, name) for _i, anno, name in by_index if anno)
                )
            ]
            muted = [name for _i, anno, name in by_index if not anno]
            if muted:
                fmt14.uvsDict.setdefault(MUTE_SELECTOR, []).append(
                    (base_unicode, muted[0])
                )
                rules_added += 1

            default_glyph = by_index[0][2] if by_index and by_index[0][0] == 0 else None
            bare_glyph = (bare_base_map or {}).get(default_glyph)
            if bare_glyph:
                fmt14.uvsDict.setdefault(BARE_SELECTOR, []).append(
                    (base_unicode, bare_glyph)
                )
                rules_added += 1

            # A single-reading char needs no selector: the bare codepoint
            # is the only thing a converter would ever emit for it.
            if len(slotted) < 2:
                continue

            chars_with_variants += 1

            for slot, glyph_name in slotted:
                vs_codepoint = IVS_BASE + slot
                if vs_codepoint > IVS_LIMIT:
                    # 238 selectors should be plenty (no realistic
                    # mapping has that many readings of one character),
                    # but emit one warning and skip the overflow rather
                    # than write malformed cmap data.
                    if not overflow_warned:
                        print(
                            "Warning: ivs_handler: slot "
                            f"{slot} of {original_char!r} "
                            "exceeds the IVS supplement range "
                            "(U+E0100–U+E01ED); skipping further "
                            "overflow entries silently."
                        )
                        overflow_warned = True
                    continue

                entries = fmt14.uvsDict.setdefault(vs_codepoint, [])
                entries.append((base_unicode, glyph_name))
                rules_added += 1

        # The OpenType spec requires VarSelector records sorted by
        # selector codepoint, and within each, NonDefaultUVS entries
        # sorted by base codepoint. fontTools sorts the outer dict at
        # compile, but only sorts the inner list iff it's already
        # tuple-of-tuples — sort defensively to avoid relying on that.
        # (Also covers the DIY mark entries build_glyph added earlier.)
        #
        # De-duplicate while sorting: a base font that ships its own IVS
        # (NotoSansJP has 13k Adobe-Japan1 sequences on U+E01xx) may
        # already map a (base, selector) pair we just appended. A pair
        # may appear only once, and ours — appended last — must win, or
        # the reading selector would pick an un-annotated shape variant.
        for entries in fmt14.uvsDict.values():
            entries[:] = sorted(dict(entries).items())

        if rules_added:
            timer.note(
                f"{rules_added} entries across "
                f"{chars_with_variants} char(s), "
                f"{len(fmt14.uvsDict)} VS slot(s)"
            )
        else:
            timer.note("no IVS entries needed")
        return set(fmt14.uvsDict)


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
