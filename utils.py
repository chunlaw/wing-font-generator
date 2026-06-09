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
"""

from fontTools.ttLib.tables import otTables


def get_glyph_name_by_char(font, char):
    """
    Resolve a Unicode character to a glyph name via the font's best cmap.

    Returns ``None`` if the character is not encoded. Some cmap subtables
    map to glyph *indices* rather than names (rare but legal); we handle
    that case by indexing the glyph order.
    """
    cmap = font.getBestCmap()
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


def _build_default_langsys():
    """Construct a minimal DefaultLangSys for scripts that don't have one."""
    ls = otTables.LangSys()
    ls.LookupOrder = None
    ls.ReqFeatureIndex = 0xFFFF
    ls.FeatureIndex = []
    ls.FeatureCount = 0
    return ls


def register_feature_lookup(gsub, feature_tag: str, lookup_index: int) -> None:
    """
    Make a newly-appended lookup discoverable under ``feature_tag``.

    Behaviour matches what the old chain_context_handler / liga_handler did
    inline:
      * If a FeatureRecord with this tag already exists, append our lookup
        index to its LookupListIndex (de-duplicated).
      * Otherwise create a new FeatureRecord and register it on every
        script's DefaultLangSys (and any named LangSys siblings), creating
        a DefaultLangSys if the source font didn't provide one.

    This function only mutates ``gsub`` — the caller is responsible for
    having already appended the built ``Lookup`` to ``gsub.LookupList`` so
    that ``lookup_index`` is valid.
    """
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
