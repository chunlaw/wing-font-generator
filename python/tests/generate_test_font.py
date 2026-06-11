"""
generate_test_font.py — produce a small test font for visual verification.

This is a thin driver around the existing `wing-font.py` pipeline that:
  * Loads a deliberately tiny mapping (test_mapping.csv) chosen to exercise
    every variant-selection path — default reading, word-context chain
    substitution, digit-trigger ligature, the Chinese-numeral
    fallback, and the cmap format-14 IVS supplement. The first four
    register lookups under the OpenType `ccmp` feature; the IVS path
    lives in cmap. See chain_context_handler.py, liga_handler.py, and
    ivs_handler.py for why each path is implemented as it is.
  * Writes the resulting TTF and WOFF into tests/output/.
  * Inspects the produced GSUB and prints a short report so a human can
    confirm the right number of lookups were added without opening ttx.

Usage (run from the repo root):

    python tests/generate_test_font.py

Then open tests/viewer.html via a local HTTP server (file:// won't load
WOFFs cross-origin in most browsers — use tests/serve.py).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Allow the script to be run from anywhere — make the repo root importable
# so the `import wing-font` / handler modules resolve.
THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

# These imports come from the repo root; they exercise the refactored
# chain_context_handler / liga_handler.
import importlib.util


def _import_wing_font():
    """Import wing-font.py despite the hyphen in the filename."""
    spec = importlib.util.spec_from_file_location(
        "wing_font_main", REPO_ROOT / "wing-font.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


# Inputs the test wants to use. The Chiron font is ~23 MB but only loaded
# briefly; NotoSerif provides the small Latin annotation glyphs.
BASE_FONT = REPO_ROOT / "input_fonts" / "ChironSungHK-R.ttf"
ANNO_FONT = REPO_ROOT / "input_fonts" / "NotoSerif-Regular.ttf"
MAPPING_CSV = THIS_DIR / "test_mapping.csv"

OUTPUT_DIR = THIS_DIR / "output"
OUTPUT_PREFIX = OUTPUT_DIR / "test"
REPORT_PATH = OUTPUT_DIR / "report.json"


def main() -> int:
    for path in (BASE_FONT, ANNO_FONT, MAPPING_CSV):
        if not path.exists():
            print(f"ERROR: required input missing: {path}", file=sys.stderr)
            return 1

    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"Base font:  {BASE_FONT}")
    print(f"Anno font:  {ANNO_FONT}")
    print(f"Mapping:    {MAPPING_CSV}")
    print(f"Output:     {OUTPUT_PREFIX}.{{ttf,woff}}")
    print()

    wing_font = _import_wing_font()
    wing_font.main(
        base_font_file=str(BASE_FONT),
        anno_font_file=str(ANNO_FONT),
        output_prefix=str(OUTPUT_PREFIX),
        mapping=str(MAPPING_CSV),
        new_family_name="WingFontTest",
        base_scale=0.75,
        # UPM-independent now (see build_glyph.py). 0.27 with the
        # 2048-UPM NotoSerif annotation matches the production Latin look.
        anno_scale=0.27,
        upper_y_offset_ratio=0.8,
        invert=False,
        optimize=True,  # subset so the output WOFF is small enough to serve quickly
    )

    print()
    print("=== Verification report ===")
    report = _inspect_output(OUTPUT_PREFIX.with_suffix(".ttf"))
    print(json.dumps(report, indent=2, ensure_ascii=False))
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print()
    print(f"WOFF size:  {(OUTPUT_PREFIX.with_suffix('.woff')).stat().st_size:,} bytes")
    print(f"TTF size:   {(OUTPUT_PREFIX.with_suffix('.ttf')).stat().st_size:,} bytes")
    print()
    print("Next: open the viewer with:")
    print(f"    python tests/serve.py")
    return 0


def _inspect_output(ttf_path: Path) -> dict:
    """Return a structured summary suitable for human + viewer.html.

    Breaks down the rule counts per category so the viewer can show
    concrete pass/fail evidence for each test panel:

      * `lig_default_rules`      — `(char, '0')` identity rules (Type 4 ligature)
      * `lig_variant_rules`      — `(char, digit)` variant-pick rules (Type 4)
      * `lig_trigger_rules`      — 3-component `(char, 丅, numeral)` fallback (Type 4)
      * `ccmp_chain_rule_count`  — number of chain-context substitution rules
                                   (Type 6) in our ccmp lookups.
      * `ivs_entry_count`        — total `(base, VS)` entries in the cmap
                                   format-14 subtable.
      * `ivs_vs_slots`           — distinct Variation Selectors used (e.g.
                                   one slot per "variant index" across the
                                   whole mapping).

    The four GSUB families ride under the same `ccmp` feature tag (lookup
    *types* differ — 4 vs 6); we isolate "our" lookups via the ccmp
    FeatureRecord's LookupListIndex so counts exclude any source-font
    lookups that happen to share a Type number. The IVS path is
    separate — it lives in cmap, not GSUB.

    These counts let the viewer assert e.g. "test 4 should work because the
    font has N>0 trigger rules" rather than relying purely on visual diff.
    """
    from fontTools.ttLib import TTFont

    font = TTFont(str(ttf_path))
    gsub = font["GSUB"].table
    cmap = font.getBestCmap()

    feature_counts: dict[str, int] = {}
    for record in gsub.FeatureList.FeatureRecord:
        feature_counts[record.FeatureTag] = feature_counts.get(record.FeatureTag, 0) + 1

    lookup_types: dict[int, int] = {}
    for lookup in gsub.LookupList.Lookup:
        lookup_types[lookup.LookupType] = lookup_types.get(lookup.LookupType, 0) + 1

    # Both rule families (chain-context substitution AND ligature
    # substitution for the digit/numeral overrides) now register their
    # lookups under the `ccmp` FeatureRecord. We resolve "our" lookups via
    # that FeatureRecord's LookupListIndex so we don't mis-attribute the
    # source font's own Type-4 ligatures (Chiron has English f-i / f-l
    # ligas under `liga`) or its own Type-6 chain lookups under `calt`.
    digit_glyph_set = {cmap.get(ord(d)) for d in "0123456789"} - {None}
    numeral_glyph_set = {cmap.get(ord(d)) for d in "零一二三四五六七八九"} - {None}
    trigger_glyph = cmap.get(0x4E05)  # 丅
    digit_zero_glyph = cmap.get(ord("0"))

    ccmp_lookup_indexes: set[int] = set()
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag == "ccmp":
            ccmp_lookup_indexes.update(record.Feature.LookupListIndex)

    lig_default = 0
    lig_variant = 0
    lig_trigger = 0
    ccmp_chain_rules = 0

    for idx in ccmp_lookup_indexes:
        if idx >= len(gsub.LookupList.Lookup):
            continue
        lookup = gsub.LookupList.Lookup[idx]

        # Type 4 — Ligature Substitution (our digit + 丅+numeral overrides).
        # Component shape disambiguates the three buckets even though all
        # rules live under the same `ccmp` lookup family now.
        if lookup.LookupType == 4:
            for st in lookup.SubTable:
                for _cov_glyph, ligs in st.ligatures.items():
                    for lig in ligs:
                        components = list(lig.Component)
                        if len(components) == 1 and components[0] in digit_glyph_set:
                            if components[0] == digit_zero_glyph:
                                lig_default += 1
                            else:
                                lig_variant += 1
                        elif (
                            len(components) == 2
                            and components[0] == trigger_glyph
                            and components[1] in numeral_glyph_set
                        ):
                            lig_trigger += 1
            continue

        # Type 6 — Chain Context Substitution (our word-context rules).
        # Handle all three OpenType subtable formats; fontTools'
        # ChainContextSubstBuilder picks the most compact one, so any may
        # appear in the same lookup.
        #   Format 1 — ChainSubRuleSet/ChainSubRule (per-glyph groupings)
        #   Format 2 — ChainSubClassSet/ChainSubClassRule (class-based)
        #   Format 3 — InputCoverage (single coverage-based pattern per subtable)
        if lookup.LookupType == 6:
            for st in lookup.SubTable:
                if hasattr(st, "ChainSubRuleSet") and st.ChainSubRuleSet:
                    for rs in st.ChainSubRuleSet:
                        if rs and getattr(rs, "ChainSubRule", None):
                            ccmp_chain_rules += len(rs.ChainSubRule)
                elif hasattr(st, "ChainSubClassSet") and st.ChainSubClassSet:
                    for rs in st.ChainSubClassSet:
                        if rs and getattr(rs, "ChainSubClassRule", None):
                            ccmp_chain_rules += len(rs.ChainSubClassRule)
                elif hasattr(st, "InputCoverage"):
                    # Format 3: one pattern per subtable.
                    ccmp_chain_rules += 1

    # Spot-check the polyphonic chars we deliberately put in the mapping
    # are still encoded in the output cmap. If subsetting drops them, the
    # whole test plan falls apart.
    polyphonic_present = {
        "行": cmap.get(0x884C) is not None,
        "畫": cmap.get(0x756B) is not None,
        "丅 (trigger)": cmap.get(0x4E05) is not None,
        "一 (numeral)": cmap.get(0x4E00) is not None,
    }

    # Probe the cmap format-14 (IVS) subtable for our supplement.
    # fontTools represents it as a CmapSubtable with `.format == 14`
    # and a `.uvsDict` mapping VS codepoint → [(base, glyphName)].
    ivs_entries = 0
    ivs_vs_slots = 0
    for sub in font["cmap"].tables:
        if getattr(sub, "format", None) == 14:
            uvs = getattr(sub, "uvsDict", None) or {}
            ivs_vs_slots = len(uvs)
            for entries in uvs.values():
                ivs_entries += len(entries)
            break

    # Sanity probe — did anything still register annotation ligatures
    # under `liga`? The source font has its own `liga` for English f-i /
    # f-l, so the feature tag alone isn't proof of regression; we look
    # specifically for ligatures whose second component is one of our
    # trigger glyphs (digits or 丅+numerals).
    liga_lookup_indexes: set[int] = set()
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag == "liga":
            liga_lookup_indexes.update(record.Feature.LookupListIndex)
    our_rules_in_liga = 0
    for idx in liga_lookup_indexes:
        if idx >= len(gsub.LookupList.Lookup):
            continue
        lookup = gsub.LookupList.Lookup[idx]
        if lookup.LookupType != 4:
            continue
        for st in lookup.SubTable:
            for _cov, ligs in st.ligatures.items():
                for lig in ligs:
                    comps = list(lig.Component)
                    if comps and (
                        comps[0] in digit_glyph_set or comps[0] == trigger_glyph
                    ):
                        our_rules_in_liga += 1

    return {
        "total_glyphs": len(font.getGlyphOrder()),
        "gsub_lookup_count": gsub.LookupList.LookupCount,
        "gsub_feature_count": gsub.FeatureList.FeatureCount,
        "feature_tags_present": sorted(feature_counts.keys()),
        "lookup_types": {str(k): v for k, v in sorted(lookup_types.items())},
        "has_ccmp": "ccmp" in feature_counts,
        "annotation_rules_still_under_liga": our_rules_in_liga,
        "lig_default_rules": lig_default,
        "lig_variant_rules": lig_variant,
        "lig_trigger_rules": lig_trigger,
        "ccmp_chain_rule_count": ccmp_chain_rules,
        "ivs_entry_count": ivs_entries,
        "ivs_vs_slots": ivs_vs_slots,
        "polyphonic_chars_present": polyphonic_present,
    }


if __name__ == "__main__":
    raise SystemExit(main())
