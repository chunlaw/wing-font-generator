"""
generate_test_font.py — produce a small test font for visual verification.

This is a thin driver around the existing `wing-font.py` pipeline that:
  * Loads a deliberately tiny mapping (test_mapping.csv) chosen to exercise
    every GSUB rule type — default reading, word-context ccmp, digit-trigger
    liga, and the Chinese-numeral fallback. (Our chain-context rules are
    registered under ccmp rather than calt; see chain_context_handler.py
    for why.)
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
        anno_scale=0.13,
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

      * `liga_default_rules`     — `(char, '0')` identity rules
      * `liga_variant_rules`     — `(char, digit)` variant-pick rules (digit != 0)
      * `liga_trigger_rules`     — 3-component `(char, 丅, numeral)` fallback rules
      * `ccmp_rule_count`        — number of chain-context substitution rules
                                   our ccmp lookup contains. We isolate it via
                                   the ccmp FeatureRecord's LookupListIndex,
                                   so the count excludes any source-font
                                   lookups that happen to share a Type number.

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

    # Walk the liga lookups our handler added (Type 4 with flag=0) and
    # bucket each rule by its component count. The source font also has
    # Type-4 ligas (English f-i / f-l) — those have non-digit, non-numeral
    # components, so we exclude them by checking that the second component
    # is one of the digits/numerals we keep.
    digit_glyph_set = {cmap.get(ord(d)) for d in "0123456789"} - {None}
    numeral_glyph_set = {cmap.get(ord(d)) for d in "零一二三四五六七八九"} - {None}
    trigger_glyph = cmap.get(0x4E05)  # 丅

    liga_default = 0
    liga_variant = 0
    liga_trigger = 0
    digit_zero_glyph = cmap.get(ord("0"))

    for lookup in gsub.LookupList.Lookup:
        if lookup.LookupType != 4:
            continue
        for st in lookup.SubTable:
            for cov_glyph, ligs in st.ligatures.items():
                for lig in ligs:
                    components = list(lig.Component)
                    if len(components) == 1 and components[0] in digit_glyph_set:
                        if components[0] == digit_zero_glyph:
                            liga_default += 1
                        else:
                            liga_variant += 1
                    elif (
                        len(components) == 2
                        and components[0] == trigger_glyph
                        and components[1] in numeral_glyph_set
                    ):
                        liga_trigger += 1

    # Count the rules in our chain-context substitution lookups. To
    # avoid mis-attributing the source font's own chain-context lookups
    # (Chiron has its own `calt` Type 6 lookups), we resolve OUR lookups
    # via the `ccmp` FeatureRecord — that's where wing-font registers
    # its chain-context rules now. Then handle all three OpenType
    # ChainContextSubst subtable formats:
    #   Format 1 — ChainSubRuleSet/ChainSubRule (per-glyph groupings)
    #   Format 2 — ChainSubClassSet/ChainSubClassRule (class-based)
    #   Format 3 — InputCoverage (single coverage-based pattern per subtable)
    # fontTools' ChainContextSubstBuilder auto-picks the most compact
    # format, so all three may appear in the same lookup.
    ccmp_lookup_indexes: set[int] = set()
    for record in gsub.FeatureList.FeatureRecord:
        if record.FeatureTag == "ccmp":
            ccmp_lookup_indexes.update(record.Feature.LookupListIndex)

    ccmp_rules = 0
    for idx in ccmp_lookup_indexes:
        if idx >= len(gsub.LookupList.Lookup):
            continue
        lookup = gsub.LookupList.Lookup[idx]
        if lookup.LookupType != 6:
            continue
        for st in lookup.SubTable:
            if hasattr(st, "ChainSubRuleSet") and st.ChainSubRuleSet:
                for rs in st.ChainSubRuleSet:
                    if rs and getattr(rs, "ChainSubRule", None):
                        ccmp_rules += len(rs.ChainSubRule)
            elif hasattr(st, "ChainSubClassSet") and st.ChainSubClassSet:
                for rs in st.ChainSubClassSet:
                    if rs and getattr(rs, "ChainSubClassRule", None):
                        ccmp_rules += len(rs.ChainSubClassRule)
            elif hasattr(st, "InputCoverage"):
                # Format 3: one pattern per subtable.
                ccmp_rules += 1

    # Spot-check the polyphonic chars we deliberately put in the mapping
    # are still encoded in the output cmap. If subsetting drops them, the
    # whole test plan falls apart.
    polyphonic_present = {
        "行": cmap.get(0x884C) is not None,
        "畫": cmap.get(0x756B) is not None,
        "丅 (trigger)": cmap.get(0x4E05) is not None,
        "一 (numeral)": cmap.get(0x4E00) is not None,
    }

    return {
        "total_glyphs": len(font.getGlyphOrder()),
        "gsub_lookup_count": gsub.LookupList.LookupCount,
        "gsub_feature_count": gsub.FeatureList.FeatureCount,
        "feature_tags_present": sorted(feature_counts.keys()),
        "lookup_types": {str(k): v for k, v in sorted(lookup_types.items())},
        "has_ccmp": "ccmp" in feature_counts,
        "has_liga": "liga" in feature_counts,
        "liga_default_rules": liga_default,
        "liga_variant_rules": liga_variant,
        "liga_trigger_rules": liga_trigger,
        "ccmp_rule_count": ccmp_rules,
        "polyphonic_chars_present": polyphonic_present,
    }


if __name__ == "__main__":
    raise SystemExit(main())
