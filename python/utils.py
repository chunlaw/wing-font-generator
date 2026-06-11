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
