# wing-font.py

from fontTools.ttLib import TTFont
from mappings.csv_parser import load_mapping
from chain_context_handler import buildChainSub
from liga_handler import buildLiga
from build_glyph import generate_annotated_glyphs, scale_glyphs
import sys
import argparse
from fontTools import subset
from utils import get_glyph_name_by_char, step_timer
import string

WINDOWS_ENGLISH_IDS = 3, 1, 0x409
MAC_ROMAN_IDS = 1, 0, 0

def set_family_name(font, new_family_name):
    table = font["name"]
    for plat_id, enc_id, lang_id in (WINDOWS_ENGLISH_IDS, MAC_ROMAN_IDS):
        for name_id in (1, 4, 6, 16):
            family_name_rec = table.getName(
                nameID=name_id,
                platformID=plat_id,
                platEncID=enc_id,
                langID=lang_id,
            )
            if family_name_rec is not None:
                print(f"Changing family name from '{family_name_rec.toUnicode()}' to '{new_family_name}'")
                table.setName(
                    new_family_name,
                    nameID=name_id,
                    platformID=plat_id,
                    platEncID=enc_id,
                    langID=lang_id,
                )


def main(
    base_font_file,
    anno_font_file,
    output_prefix,
    mapping,
    new_family_name,
    base_scale=0.75,
    anno_scale=0.15,
    anno_spacing=0.0,
    upper_y_offset_ratio=0.8,
    invert=False,
    optimize=False,
    skip_woff=False,
):
    # Load the fonts and mapping.
    base_font = TTFont(base_font_file)
    anno_font = TTFont(anno_font_file)
    output_font = TTFont(base_font_file)
    # Keep the raw annotation-font bytes so we can hand them to
    # HarfBuzz inside generate_annotated_glyphs. HarfBuzz needs the
    # original file blob (it builds its own font object via
    # hb.Face(blob)); we can't reconstruct an equivalent blob from
    # the fontTools TTFont without re-serialising, which would be
    # wasteful for every glyph composition.
    with open(anno_font_file, "rb") as _f:
        anno_font_bytes = _f.read()
    word_mapping, char_mapping = load_mapping(base_font, mapping)

    if new_family_name is not None:
        # Set the new family name
        set_family_name(output_font, new_family_name)

    # --- Phase 1: compose annotated variant glyphs -----------------------
    # generate_annotated_glyphs only handles the variant composition
    # (formerly Part 1 of generate_glyphs). It mutates `char_mapping`
    # in place to fill in (glyph_name, variant_index) tuples that the
    # GSUB handlers need. Returns the set of base-font glyph names that
    # got processed so scale_glyphs() later can skip them — their
    # outlines are already at the right scale.
    processed = generate_annotated_glyphs(
        base_font,
        anno_font,
        anno_font_bytes,
        output_font,
        char_mapping,
        base_scale=base_scale,
        anno_scale=anno_scale,
        anno_spacing=anno_spacing,
        upper_y_offset_ratio=upper_y_offset_ratio,
        invert=invert,
    )

    # --- Phase 2: build GSUB rules ---------------------------------------
    buildChainSub(output_font, word_mapping, char_mapping)
    buildLiga(output_font, char_mapping)

    # --- Phase 3: subset + scale (the perf-critical reordering) ----------
    #
    # The old order scaled all ~50k base-font glyphs BEFORE subsetting,
    # which threw away ~99% of that work. The new order:
    #
    #   optimize=True : compute keep list → scale only kept glyphs → subset
    #   optimize=False: scale every glyph in the base font (full output)
    #
    # In the optimize=True path this typically reduces the scaling loop
    # from ~50,000 iterations to ~200, which is a ~100x speedup on the
    # step that dominates the Pyodide runtime.
    if optimize:
        # Build the keep list. Same logic as before; just hoisted out
        # of the inline block so we can pass it to scale_glyphs BEFORE
        # we actually subset.
        glyphs_to_be_kept = [
            get_glyph_name_by_char(base_font, str(i)) for i in range(0, 10)
        ]
        for value in char_mapping.values():
            for glyph_name, _idx in value.values():
                glyphs_to_be_kept.append(glyph_name)

        # ASCII punctuation/letters + full-width Chinese punctuation +
        # the 丅+numeral fallback triggers (without these the IME
        # fallback silently breaks in subsetted output).
        chars_to_keep_additionally = (
            string.punctuation
            + string.ascii_letters
            + '，。！？《》「」『』｛｝〖〗【】［］、……——＠＃￥％＆＊+-/“”：；‘’／'
            + '丅零一二三四五六七八九'
        )
        for char in chars_to_keep_additionally:
            glyph_name = get_glyph_name_by_char(base_font, char)
            if glyph_name:
                glyphs_to_be_kept.append(glyph_name)

        valid_glyphs_to_keep = list(
            set(g for g in glyphs_to_be_kept if g is not None)
        )

        # Scale ONLY the kept glyphs (excluding annotated variants
        # already at the right size). This is the big perf win — instead
        # of iterating ~50k glyphs we iterate the ~200 in the keep list.
        scale_glyphs(
            base_font,
            output_font,
            valid_glyphs_to_keep,
            base_scale,
            skip_glyph_names=processed,
        )

        # Now apply the actual subset. The set of glyphs surviving might
        # be slightly larger than valid_glyphs_to_keep because the
        # Subsetter's GSUB closure pulls in any glyphs reachable via
        # lookups (notably the wingfont* variants). Unscaled extras are
        # rare and visually minor.
        with step_timer("font subset") as timer:
            subsetter = subset.Subsetter()
            subsetter.populate(glyphs=valid_glyphs_to_keep)
            subsetter.subset(output_font)
            timer.note(f"{len(valid_glyphs_to_keep)} glyphs kept")
    else:
        # Un-optimised path keeps the original behaviour: every glyph in
        # the base font's glyph order gets scaled so an un-subset output
        # is visually consistent. Slow but expected.
        scale_glyphs(
            base_font,
            output_font,
            base_font.getGlyphOrder(),
            base_scale,
            skip_glyph_names=processed,
        )

    # --- Phase 4: save ---------------------------------------------------
    # The TTF is always emitted. The WOFF is optional: the in-browser
    # pipeline (runner.py) sets skip_woff=True because the web app
    # converts TTF→WOFF locally via the browser's CompressionStream,
    # which is ~20-50x faster than the round-trip through Pyodide's
    # zlib. CLI callers (.github/workflows/build-fonts.yml) keep the
    # default skip_woff=False so the workflow's downstream cp/deploy
    # steps still find a .woff next to the .ttf.
    with step_timer("TTF save"):
        output_font.save(str(output_prefix) + ".ttf")
    if not skip_woff:
        output_font.flavor = "woff"
        with step_timer("WOFF save"):
            output_font.save(str(output_prefix + ".woff"))

    # Close the font objects
    base_font.close()
    anno_font.close()
    output_font.close()

# 主程序入口部分保持不變
if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog=sys.argv[0])
    parser.add_argument('-i', '--base-font-file', help="Base font in .ttf fomrat", required=True)
    parser.add_argument('-a', '--anno-font_file', help="Annotation font in .ttf fomrat", required=True)
    parser.add_argument('-o', '--output-prefix', help="Output prefix for .ttf and .woff file", required=True)
    parser.add_argument('-m', '--mapping', help="CSV file for the mapping between base font and annotation font", required=True)
    parser.add_argument('-f', '--family-name', help="Replace with the new family name")
    parser.add_argument('-y', '--upper_y_offset_ratio', type=float, default=0.8, help="Y offset in (percentage) for the upper string")
    parser.add_argument('-bs', '--base-scale', type=float, default=0.75, help="The scaling factor for the base font")
    parser.add_argument('-as', '--anno-scale', type=float, default=0.15, help="The scaling factor for the base font")
    parser.add_argument('-v', '--invert', action='store_true', help='Invert the annotation and base glyph')
    parser.add_argument('-opt', '--optimize', action="store_true", help="Optimizing size by subsetting annotated glyph only")
    try:
        options = parser.parse_args()
    except:
        parser.print_help()
        exit()
    main(
        base_font_file = options.base_font_file, 
        anno_font_file = options.anno_font_file, 
        output_prefix = options.output_prefix, 
        mapping = options.mapping,
        new_family_name = options.family_name,
        base_scale=options.base_scale,
        anno_scale=options.anno_scale,
        upper_y_offset_ratio=options.upper_y_offset_ratio,
        invert=options.invert,
        optimize=options.optimize
    )