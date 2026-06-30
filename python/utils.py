"""
Shared helpers for wing-font generation.

This module used to contain hand-rolled equivalents of fontTools' otlLib
builders (`buildCoverage`, `buildChainSubRuleSet`, `chunk` for splitting
contextual lookups across subtables). Those are now gone — the handler
modules use `fontTools.otlLib.builder.ChainContextSubstBuilder` and
`LigatureSubstBuilder`, which produce the same output without manual
otTables construction.

What remains here:
  - `get_glyph_name_by_char` — small cmap convenience used throughout.
  - `register_feature_lookup` — adds a freshly-built lookup to an existing
    GSUB feature, creating the feature record on any script/langsys that
    doesn't yet expose it. Both handlers share this so they don't each
    reimplement the script/langsys walk.
  - `step_timer` — context manager that emits the standard
    "Processing X..." → "Processing X... DONE (Ns)" progress lines so
    every step uses the same format and gets elapsed-time reporting.
"""

import time

from fontTools.ttLib.tables import otTables


# Process-global recorder used by step_timer and any inline timing
# code (runner.py). Reset at the start of each pipeline run via
# reset_step_timings(); read for the summary table via get_step_timings().
_step_timings: list[tuple[str, float]] = []


def record_step_time(name: str, elapsed: float) -> None:
    """Public hook so callers that do their own time.perf_counter()
    bookkeeping (e.g. runner.py's inline-timed input/output steps) can
    still contribute to the final summary table."""
    _step_timings.append((name, elapsed))


def get_step_timings() -> list[tuple[str, float]]:
    """Return a copy of the recorded (name, elapsed_seconds) tuples in
    the order they completed."""
    return list(_step_timings)


def reset_step_timings() -> None:
    """Clear the recorder. Call once at the start of each pipeline run
    so consecutive runs don't accumulate stale timings."""
    _step_timings.clear()


class step_timer:
    """
    Context manager for the project-wide step-progress convention.

    Usage:

        with step_timer("chain context substitution") as t:
            ... do work ...
            t.note("17 rules")   # optional extra info appended to DONE

    Output (one line in the web UI thanks to GenerateContext's
    `appendOrCoalesce` trick that collapses Processing/DONE pairs):

        Processing chain context substitution... DONE (1.2s, 17 rules)

    Also records its elapsed time into the process-global recorder
    consumed by runner.py to print a per-step summary table at the
    end of the run.
    """

    def __init__(self, name: str):
        self.name = name
        self._note = ""
        self._t0 = 0.0

    def __enter__(self) -> "step_timer":
        print(f"Processing {self.name}...", flush=True)
        self._t0 = time.perf_counter()
        return self

    def note(self, info: str) -> None:
        """Append a note that will be shown inside the DONE parentheses."""
        self._note = info

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.perf_counter() - self._t0
        record_step_time(self.name, elapsed)
        suffix = f"{elapsed:.1f}s"
        if self._note:
            suffix += f", {self._note}"
        # On exception, still emit a final line so the UI doesn't show
        # the step as forever pending — mark it as FAILED so the user
        # knows what happened. Don't swallow the exception either.
        marker = "DONE" if exc_type is None else "FAILED"
        print(f"Processing {self.name}... {marker} ({suffix})", flush=True)
        return False


# Subtable-count threshold above which a GSUB Lookup gets pre-wrapped
# in Extension subtables. Subtable offsets within a parent Lookup are
# uint16 from the lookup start, so for our ~10 KiB chain-context
# subtables the cumulative offset to subtable #7 already crosses
# 64 KiB. fontTools' save-time Extension promotion is meant to handle
# this, but its overflow-error-record code crashes with
# `AttributeError: 'OTTableWriter' object has no attribute 'name'`
# on lookups whose writer hierarchy lacks the expected ancestors.
# Pre-wrapping at build time means save() never enters that broken
# recovery path: each Extension subtable carries a 32-bit offset to
# its wrapped subtable, so wrapped data can live anywhere.
#
# Threshold of 4 leaves comfortable margin: with 500-rule-per-subtable
# budgets (~10 KiB each), 4 subtables consume ~40 KiB — well under
# 64 KiB. 5+ subtables get pre-wrapped.
EXTENSION_WRAP_SUBTABLE_THRESHOLD = 4


def wrap_lookup_in_extension(lookup) -> None:
    """Convert each subtable of `lookup` into an Extension subtable
    (Format 1) holding the original subtable in its ExtSubTable
    field, and flip the lookup's LookupType to 7. In place.

    No-op on a lookup that's already Extension or has no subtables —
    defensive against double-wrapping.

    See EXTENSION_WRAP_SUBTABLE_THRESHOLD above for when callers
    should invoke this.
    """
    if lookup.LookupType == 7 or not lookup.SubTable:
        return
    original_type = lookup.LookupType
    wrapped = []
    for st in lookup.SubTable:
        ext = otTables.ExtensionSubst()
        ext.Format = 1
        ext.ExtensionLookupType = original_type
        ext.ExtSubTable = st
        wrapped.append(ext)
    lookup.LookupType = 7
    lookup.SubTable = wrapped


def maybe_wrap_lookup_in_extension(lookup) -> bool:
    """Pre-wrap `lookup` if it has more than
    EXTENSION_WRAP_SUBTABLE_THRESHOLD subtables. Returns True if it
    wrapped, False if it left the lookup as-is. Safe to call on None
    (returns False)."""
    if lookup is None:
        return False
    if len(lookup.SubTable or []) <= EXTENSION_WRAP_SUBTABLE_THRESHOLD:
        return False
    wrap_lookup_in_extension(lookup)
    return True


def get_glyph_name_by_char(font, char):
    """
    Resolve a Unicode character to a glyph name via the font's best cmap.

    Returns ``None`` if the character is not encoded. Some cmap subtables
    map to glyph *indices* rather than names (rare but legal); we handle
    that case by indexing the glyph order.

    Defensive against ``getBestCmap()`` returning ``None`` — that
    happens when a font has no usable Unicode cmap subtable at all
    (rare for legit fonts; common when an upstream loader fed us
    HTML or other garbage instead of font bytes). Treating no-cmap
    as "char not encoded" gives the caller a clean None instead of
    a confusing ``TypeError: argument of type 'NoneType' is not
    iterable``.
    """
    cmap = font.getBestCmap()
    if cmap is None:
        return None
    char_code = ord(char)
    if char_code not in cmap:
        return None
    glyph_identifier = cmap[char_code]
    if isinstance(glyph_identifier, str):
        return glyph_identifier
    if isinstance(glyph_identifier, int):
        try:
            return font.getGlyphOrder()[glyph_identifier]
        except IndexError:
            return None
    return None


def ensure_trigger_char_glyph(output_font, trigger_char: str) -> bool:
    """
    Guarantee that ``trigger_char`` (the IME-friendly variant-picker
    separator, default ``丅`` U+4E05) is encoded in ``output_font``'s
    cmap. If it's missing, inject a zero-width empty glyph and add the
    codepoint→glyph mapping to every Unicode cmap subtable that can
    legally carry it.

    Why this is necessary
    ---------------------

    ``liga_handler.buildLiga`` emits ``(base, trigger, numeral) →
    variant`` ligature rules under the ``ccmp`` feature for IMEs that
    can't easily type Latin digits. For the ligature to fire at runtime
    the shaper must encounter all three components in a single shaping
    run. If ``trigger_char`` is missing from the font's cmap, two things
    break:

      1. ``get_glyph_name_by_char(font, trigger_char)`` returns None, so
         ``buildLiga`` silently skips the trigger-numeral path entirely.
      2. Even if the rule were emitted, typing ``丅`` in Word would
         trigger DirectWrite font-fallback for that one glyph, splitting
         ``[base][丅][numeral]`` across two fonts. Ligature substitution
         can't bridge that fallback split.

    The fix is the same in both cases: make sure the font owns a glyph
    for ``trigger_char`` so the shaper keeps all three components in one
    run owned by us. The glyph itself doesn't need to render anything
    meaningful — when the ligature fires it gets consumed and replaced;
    when the user types the trigger without a numeral after it, the
    zero-width invisible glyph keeps the text reading naturally (``呀丅``
    visually = ``呀`` with the trigger silently held in the buffer).

    NotoSansHK / NotoSansTC / Huninn / NotoSerif don't ship ``丅`` (U+4E05)
    — only ChironHei / ChironSung do. So absent this helper, every
    Cantonese / Taiwanese / Latin annotation font built on a Noto base
    has a broken trigger-numeral path. That's why this runs in
    ``wing-font.py``'s Phase 2 unconditionally.

    Returns
    -------
    True  - the glyph was injected (caller may want to log it).
    False - no-op (empty trigger_char, already present, or font lacks
            a glyf table — CFF fonts hit the last case; the standard
            pipeline only sees TTF inputs, so that path stays a warning
            rather than an error).
    """
    if not trigger_char:
        return False
    if len(trigger_char) != 1:
        # buildLiga's contract is single-codepoint trigger; defend here too.
        return False

    cp = ord(trigger_char)
    # If any cmap subtable already encodes the trigger, we're done. We
    # check the "best" cmap (the one shapers actually consult) rather
    # than the union of every subtable — a codepoint present only in,
    # say, a Mac-specific format-0 table wouldn't help DirectWrite, and
    # injecting into the BMP / full-Unicode subtables fixes that.
    best = output_font.getBestCmap() or {}
    if cp in best:
        return False

    # CFF fonts have a "CFF " or "CFF2" outline table instead of "glyf".
    # Injecting outlines into CFF requires a CharString builder — out of
    # scope for the standard TTF pipeline. Warn and bail; the trigger
    # path will stay broken for that font, but every other GSUB path
    # still works.
    if "glyf" not in output_font:
        print(
            f"Warning: ensure_trigger_char_glyph: output font has no 'glyf' "
            f"table; cannot inject trigger char U+{cp:04X}. The "
            f"(base, trigger, numeral) ligature path will be skipped."
        )
        return False

    # Pick a glyph name that won't collide. The conventional Adobe Glyph
    # List form `uniXXXX` for BMP / `uXXXXX` for non-BMP is what most
    # tools expect, and it's exactly what the source font's own cmap
    # uses for its CJK ideographs (e.g. uni5440 for 呀). Suffix only on
    # collision — fontTools' glyphOrder is a flat list, name reuse
    # would corrupt the mapping.
    base_name = f"uni{cp:04X}" if cp <= 0xFFFF else f"u{cp:05X}"
    glyph_order = output_font.getGlyphOrder()
    glyph_name = base_name
    suffix = 1
    while glyph_name in glyph_order:
        glyph_name = f"{base_name}.wf{suffix}"
        suffix += 1

    # Build an empty glyph — zero contours, zero advance, zero LSB. The
    # glyf table's __setitem__ both stores the glyph AND appends the
    # name to its OWN glyphOrder. We then sync that up to the font-
    # level glyph order via setGlyphOrder() so downstream consumers
    # (subsetter, CFF builders, hb-shape) see a consistent list — same
    # pattern build_glyph.py uses after adding wingfont* glyphs.
    from fontTools.ttLib.tables._g_l_y_f import Glyph
    empty_glyph = Glyph()
    empty_glyph.numberOfContours = 0

    output_font["glyf"][glyph_name] = empty_glyph
    output_font["hmtx"][glyph_name] = (0, 0)

    # vmtx: only present on CJK fonts that support vertical typesetting.
    # When present, fontTools' vmtx compiler requires an entry for every
    # glyph in the glyph order — leaving it unset crashes save(). Match
    # the pattern in build_glyph.py: width = units_per_em, tsb = 0.
    if "vmtx" in output_font:
        upm = output_font["head"].unitsPerEm
        output_font["vmtx"][glyph_name] = (upm, 0)

    # Add the codepoint→glyph mapping to every Unicode cmap subtable. We
    # add to all of them (not just the "best") so legacy consumers that
    # read format 4 instead of format 12 still see the trigger. The
    # subtable formats we touch: 0 (Mac), 4 (BMP), 6 (trimmed mapping),
    # 10 (trimmed array), 12 (segmented coverage, full Unicode), 13
    # (many-to-one mappings). Format 14 is variation selectors only —
    # skip; it has no .cmap dict to mutate.
    UNICODE_CMAP_FORMATS = {0, 4, 6, 10, 12, 13}
    for subtable in output_font["cmap"].tables:
        if subtable.format not in UNICODE_CMAP_FORMATS:
            continue
        # Format-0 only covers U+0000..U+00FF — skip BMP/SMP additions
        # that would overflow it.
        if subtable.format == 0 and cp > 0xFF:
            continue
        # Format-4 is BMP only — skip non-BMP additions that would
        # overflow its uint16 codepoints.
        if subtable.format == 4 and cp > 0xFFFF:
            continue
        subtable.cmap[cp] = glyph_name

    # Sync font.glyphOrder with glyf.glyphOrder (the glyf table mutates
    # its own copy on __setitem__; the font-level copy doesn't refresh
    # automatically). Mirrors the call at the end of
    # generate_annotated_glyphs in build_glyph.py.
    output_font.setGlyphOrder(output_font["glyf"].glyphOrder)
    return True


# Glyph name used by ensure_invisible_glyph. Single shared name so multiple
# callers see (and reuse) the same injected glyph rather than racing each
# other to create variants. The `wingfont.` prefix marks it as wing-font's
# own glyph in the font's glyph order, mirroring the prefix convention
# used by build_glyph for composed glyphs.
_INVISIBLE_GLYPH_NAME = "wingfont.invisible"


def ensure_invisible_glyph(output_font) -> str:
    """
    Guarantee the output font owns a zero-advance, zero-contour glyph that
    chain-context substitutions can use as the "consume this glyph" target,
    and return its glyph name.

    What it's for
    -------------

    ``chain_context_handler.buildChainSubVariantOverrides`` emits chain
    rules whose input includes a trailing digit — `[base_chars, digit]`
    — and substitutes the digit position to this glyph so the user-typed
    digit visually disappears once the variant override fires. Without
    such a target the rule would either leave the digit visible (no
    substitution) or require a per-digit invisible glyph (wasteful).

    Idempotent
    ----------

    If the glyph already exists (a previous call, or the source font
    happened to ship one with this name), this returns the existing
    name without re-injecting. The function makes no cmap entry: the
    glyph is reachable only through GSUB substitution, never through
    direct codepoint lookup.

    CFF fonts
    ---------

    Like ``ensure_trigger_char_glyph``, this only handles TTF/glyf
    fonts. CFF (CFF / CFF2) injection requires a CharString builder
    that's out of scope here; the standard wing-font pipeline always
    uses TTF inputs, so the warning branch is theoretical.

    Returns
    -------
    The glyph name. Always non-empty for a TTF font, even on idempotent
    re-call. For a CFF font with no existing entry, returns the
    canonical name anyway so callers don't need to handle ``None`` —
    the chain rules that reference it will simply never fire because
    the glyph isn't in the glyph order, which is a graceful no-op.
    """
    glyph_order = output_font.getGlyphOrder()
    if _INVISIBLE_GLYPH_NAME in glyph_order:
        return _INVISIBLE_GLYPH_NAME

    if "glyf" not in output_font:
        print(
            "Warning: ensure_invisible_glyph: output font has no 'glyf' "
            "table; cannot inject the digit-eater glyph. Compound-variant "
            "override chain rules will be skipped."
        )
        return _INVISIBLE_GLYPH_NAME

    from fontTools.ttLib.tables._g_l_y_f import Glyph
    empty_glyph = Glyph()
    empty_glyph.numberOfContours = 0

    output_font["glyf"][_INVISIBLE_GLYPH_NAME] = empty_glyph
    output_font["hmtx"][_INVISIBLE_GLYPH_NAME] = (0, 0)
    if "vmtx" in output_font:
        upm = output_font["head"].unitsPerEm
        output_font["vmtx"][_INVISIBLE_GLYPH_NAME] = (upm, 0)

    # Sync the font-level glyph order with glyf's mutated copy. Same
    # rationale as ensure_trigger_char_glyph — fontTools doesn't
    # auto-refresh the outer list when glyf.__setitem__ appends to its
    # own internal list.
    output_font.setGlyphOrder(output_font["glyf"].glyphOrder)
    return _INVISIBLE_GLYPH_NAME


def clear_source_layout_lookups(output_font) -> int:
    """
    Strip the source font's existing GSUB lookups (and the feature records
    that reference them) before our handlers append their own.

    Status: AVAILABLE BUT NOT CALLED BY DEFAULT
    -------------------------------------------

    `wing-font.py` does NOT call this in its standard Phase-2 build.
    Source-font GSUB lookups are preserved because they carry features
    that benefit a wing-font output (see "What you would lose" below).

    This function exists as an opt-in escape hatch for the rare case
    where a source-font lookup actively interferes with annotation
    rendering — e.g. a `locl` rule that swaps a base glyph our chain-
    context expects, or a `liga` that consumes characters before our
    digit-trigger ligatures can fire. If you hit such a case, call
    this helper between Phase 1 (composition) and Phase 2 (GSUB
    build) in `wing-font.py`. No conflict has been observed in the
    shipped mappings so far.

    Historical note
    ---------------

    An earlier version of `wing-font.py` called this unconditionally,
    on the (incorrect) hypothesis that source GSUB lookups were
    responsible for the "Don't know how to split GSUB lookup type 5"
    crash on the Mandarin mapping. The actual root cause is hb.repack
    downgrading our Type-6 chain context to Type-5 during compaction,
    fixed independently by `USE_HARFBUZZ_REPACKER = False` at save
    time. Empirically: clearing source GSUB alone did NOT prevent the
    crash. Once the hb.repack disable was in place, clearing source
    GSUB became unnecessary, so we stopped doing it.

    What you would lose
    -------------------

    Source-font typography features — `aalt` (stylistic alternates),
    `dlig` (discretionary ligatures), `liga` (e.g. English f-i / f-l),
    `locl` (language-specific Han variants, useful for zh-Hans vs
    zh-Hant tagged text), `ruby` (smaller variants for furigana),
    `vert` / `vrt2` (vertical-text forms — required for CJK vertical
    typesetting), `fwid` / `hwid` / `pwid` (width variants), `hist`
    (historical forms). For an annotation font in horizontal Latin-
    overlay use these mostly don't matter; for vertical CJK with
    annotations they very much do.

    What you would keep
    -------------------

    The GSUB table's structural shell — `ScriptList`, `LookupList`
    (emptied), `FeatureList` (emptied). `register_feature_lookup`
    expects to find a non-None ScriptList so it can append entries
    under the appropriate script/langsys records; recreating it from
    scratch would mean duplicating the script-net logic centralised
    in that helper.

    GPOS is left untouched — kerning, mark positioning, etc. live
    there and are useful for the final output.

    Returns the number of lookups removed, for the caller to log.
    """
    if "GSUB" not in output_font:
        return 0
    gsub = output_font["GSUB"].table
    removed = gsub.LookupList.LookupCount if gsub.LookupList else 0

    # Empty the LookupList in place (preserve the table object so our
    # handlers can `append` to it without rebinding).
    gsub.LookupList.Lookup = []
    gsub.LookupList.LookupCount = 0

    # Empty the FeatureList similarly. Our register_feature_lookup
    # helper will re-create FeatureRecord entries for `ccmp` as needed.
    gsub.FeatureList.FeatureRecord = []
    gsub.FeatureList.FeatureCount = 0

    # Detach every existing FeatureIndex pointer from each script's
    # DefaultLangSys / LangSys records. Without this, the script-net
    # walker in register_feature_lookup would happily re-attach our
    # new feature record under a script whose LangSys still pointed
    # at the OLD (now-deleted) feature indices, leaving dangling
    # references that crash the serializer.
    for script_record in gsub.ScriptList.ScriptRecord:
        script = script_record.Script
        if script.DefaultLangSys is not None:
            script.DefaultLangSys.FeatureIndex = []
            script.DefaultLangSys.FeatureCount = 0
        for lang_sys_record in script.LangSysRecord:
            lang_sys_record.LangSys.FeatureIndex = []
            lang_sys_record.LangSys.FeatureCount = 0

    return removed


def _build_default_langsys():
    """Construct a minimal DefaultLangSys for scripts that don't have one."""
    ls = otTables.LangSys()
    ls.LookupOrder = None
    ls.ReqFeatureIndex = 0xFFFF
    ls.FeatureIndex = []
    ls.FeatureCount = 0
    return ls


# Default set of OpenType script tags we GUARANTEE the feature lookup
# is registered under. The motivating bug: CoreText (the shaper used
# by Pages / InDesign on macOS) selects an OT script tag based on the
# Unicode script of the text run, then looks features up only under
# THAT tag — it does NOT fall back to DFLT when the script-specific
# script record doesn't declare the feature. HarfBuzz (browsers,
# Chrome / Firefox / Safari outside of Pages) DOES fall back to DFLT,
# which is why the same font shows contextual annotations correctly
# in a browser but renders flat in Pages.
#
# By creating ScriptRecords for the common CJK + Latin tags whenever
# the source font's GSUB doesn't already declare them, we ensure the
# ccmp lookups we add are found regardless of which script CoreText
# decides the text run is. (Historically we used `calt` for chain
# context and `liga` for ligatures; both have been consolidated under
# `ccmp` — see chain_context_handler.py and liga_handler.py docstrings
# for why — but the same script-net argument applies.)
#
#   DFLT  — the catch-all every font already has
#   hani  — Han characters (Chinese / Japanese kanji)
#   latn  — Latin (for the romanization parts and any Latin-only runs)
#   kana  — Hiragana + Katakana
#   hang  — Hangul
#   bopo  — Bopomofo (Taiwanese phonetics)
#
# Adding scripts a font doesn't need is harmless: shapers only consult
# the script that matches the text run, so an unused ScriptRecord is
# never touched.
_DEFAULT_FEATURE_SCRIPTS: tuple[str, ...] = (
    "DFLT",
    "hani",
    "latn",
    "kana",
    "hang",
    "bopo",
    # Arabic / Thai / Devanagari — required for the word-unit base
    # outputs: the word-ligation lookups must be discoverable when
    # CoreText tags the run as `arab` / `thai` / `deva` (no DFLT
    # fallback, same argument as above). `dev2` is the Indic-v2 script
    # tag modern shapers prefer when a font declares it. Harmless
    # extra ScriptRecords for CJK-only builds.
    "arab",
    "thai",
    "deva",
    "dev2",
)


def register_feature_lookup(
    gsub,
    feature_tag: str,
    lookup_index: int,
    *,
    ensure_scripts: tuple[str, ...] = _DEFAULT_FEATURE_SCRIPTS,
) -> None:
    """
    Make a newly-appended lookup discoverable under ``feature_tag``.

    Behaviour:
      * Ensure every tag in ``ensure_scripts`` exists in
        ``gsub.ScriptList.ScriptRecord``, creating a fresh
        ScriptRecord with an empty DefaultLangSys if not.
      * If a FeatureRecord with this tag already exists, append our
        lookup index to its LookupListIndex (de-duplicated).
      * Otherwise create a new FeatureRecord and register it on every
        script's DefaultLangSys (and any named LangSys siblings),
        creating a DefaultLangSys if the source font didn't provide one.

    This function only mutates ``gsub`` — the caller is responsible
    for having already appended the built ``Lookup`` to
    ``gsub.LookupList`` so that ``lookup_index`` is valid.

    See ``_DEFAULT_FEATURE_SCRIPTS`` for why we cast a wide net on the
    script tags (short version: CoreText doesn't fall back to DFLT).
    """
    # Ensure every requested script exists. Adding here BEFORE we walk
    # ScriptList.ScriptRecord below means the new feature gets
    # registered into the freshly-created scripts too.
    existing_tags = {sr.ScriptTag for sr in gsub.ScriptList.ScriptRecord}
    for tag in ensure_scripts:
        if tag in existing_tags:
            continue
        sr = otTables.ScriptRecord()
        sr.ScriptTag = tag
        sr.Script = otTables.Script()
        sr.Script.DefaultLangSys = _build_default_langsys()
        sr.Script.LangSysRecord = []
        sr.Script.LangSysCount = 0
        gsub.ScriptList.ScriptRecord.append(sr)
        existing_tags.add(tag)
    gsub.ScriptList.ScriptCount = len(gsub.ScriptList.ScriptRecord)

    feature_indexes = [
        i
        for i, record in enumerate(gsub.FeatureList.FeatureRecord)
        if record.FeatureTag == feature_tag
    ]

    if feature_indexes:
        # Extend each matching feature with our new lookup, preserving the
        # existing order so source-font lookups continue to fire first.
        for idx in feature_indexes:
            feature = gsub.FeatureList.FeatureRecord[idx].Feature
            if lookup_index not in feature.LookupListIndex:
                feature.LookupListIndex.append(lookup_index)
                feature.LookupCount = len(feature.LookupListIndex)
        # Even if the feature record exists, we may have just created
        # new ScriptRecords above whose DefaultLangSys doesn't yet
        # reference this feature. Wire it in for them too.
        for idx in feature_indexes:
            for script_record in gsub.ScriptList.ScriptRecord:
                script = script_record.Script
                if script.DefaultLangSys is None:
                    script.DefaultLangSys = _build_default_langsys()
                if idx not in script.DefaultLangSys.FeatureIndex:
                    script.DefaultLangSys.FeatureIndex.append(idx)
                    script.DefaultLangSys.FeatureCount = len(
                        script.DefaultLangSys.FeatureIndex
                    )

        # Patch named LangSys whose FeatureIndex omits `feature_tag`.
        #
        # Some source fonts ship named LangSys without ccmp by design
        # — ChironSungHK-R drops the upstream locl support, leaving
        # hani/ZHT, ZHS, JAN, KOR carrying only [locl, vert]. HarfBuzz
        # falls back to DefaultLangSys for missing features, so
        # browsers render correctly; DirectWrite (Word, Edge legacy)
        # does not fall back — when it resolves Traditional Chinese
        # text to `hani + ZHT`, finds no ccmp on ZHT, it skips the
        # feature entirely and the chain context we registered never
        # fires (symptom: `銀行` rendered as default-per-char `haang4`
        # instead of compound `hong4`).
        #
        # Append the first matching feature index to any named LangSys
        # whose FeatureIndex lacks our tag. Universal across scripts
        # so the fix also covers Thai, Arabic, Devanagari sources
        # with the same wiring gap. Already-wired LangSys are
        # untouched — their existing feature record was extended with
        # our lookup in the loop above and remains reachable.
        first_idx = feature_indexes[0]
        for script_record in gsub.ScriptList.ScriptRecord:
            for lsr in (script_record.Script.LangSysRecord or []):
                langsys = lsr.LangSys
                if langsys is None:
                    continue
                already_references_tag = any(
                    fi < len(gsub.FeatureList.FeatureRecord)
                    and gsub.FeatureList.FeatureRecord[fi].FeatureTag == feature_tag
                    for fi in langsys.FeatureIndex
                )
                if not already_references_tag:
                    langsys.FeatureIndex.append(first_idx)
                    langsys.FeatureCount = len(langsys.FeatureIndex)
        return

    # Create a fresh FeatureRecord for this tag.
    feature_record = otTables.FeatureRecord()
    feature_record.FeatureTag = feature_tag
    feature_record.Feature = otTables.Feature()
    feature_record.Feature.LookupListIndex = [lookup_index]
    feature_record.Feature.LookupCount = 1

    new_feature_index = len(gsub.FeatureList.FeatureRecord)
    gsub.FeatureList.FeatureRecord.append(feature_record)
    gsub.FeatureList.FeatureCount = len(gsub.FeatureList.FeatureRecord)

    # Wire the new feature into every script/langsys so it's actually
    # active. Without this step the feature record exists in the table but
    # no shaper will ever apply it.
    for script_record in gsub.ScriptList.ScriptRecord:
        script = script_record.Script
        if script.DefaultLangSys is None:
            script.DefaultLangSys = _build_default_langsys()
        langsys_list = [script.DefaultLangSys]
        if script.LangSysRecord:
            langsys_list.extend(lsr.LangSys for lsr in script.LangSysRecord)
        for langsys in langsys_list:
            if langsys is None:
                continue
            if new_feature_index not in langsys.FeatureIndex:
                langsys.FeatureIndex.append(new_feature_index)
                langsys.FeatureCount = len(langsys.FeatureIndex)
