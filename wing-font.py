from fontTools.ttLib import TTFont
from mappings.csv_parser import load_mapping
from chain_context_handler import buildChainSub
from liga_handler import buildLiga
from build_glyph import generate_glyphs
import sys
import argparse
from fontTools import subset
from functools import reduce
from utils import get_glyph_name_by_char
import operator

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
    anno_y_offset=0.8,
    optimize=False
):
    # Load the fonts and mapping
    base_font = TTFont(base_font_file)
    anno_font = TTFont(anno_font_file)
    output_font = TTFont(base_font_file)
    word_mapping, char_mapping = load_mapping(base_font, mapping)

    if new_family_name is not None:
        # Set the new family name
        set_family_name(output_font, new_family_name)

    # Combine the glyphs and save the new font
    generate_glyphs(base_font, anno_font, output_font, char_mapping, base_scale=base_scale, anno_scale=anno_scale, anno_y_offset=anno_y_offset)

    # Build Chain Contextual Substitution
    buildChainSub(output_font, word_mapping, char_mapping)
    
    # Replace glyph by new glyph using liga
    buildLiga(output_font, char_mapping)

    # if size optimization is required
    if optimize:
        # keep number and glyph to be used
        glyphs_to_be_kept = [get_glyph_name_by_char(base_font, str(i)) for i in range(0, 10)]
        for value in char_mapping.values():
            for glyph_name, idx in value.values():
                glyphs_to_be_kept.append(glyph_name)
        
        # Make subset to reduce file size
        subsetter = subset.Subsetter()
        subsetter.populate(glyphs=list(set(glyphs_to_be_kept)))
        subsetter.subset(output_font)

    # Save the new font
    output_font.save(str(output_prefix)+".ttf")
    print(f"New font saved as {output_prefix}.ttf")
    output_font.flavor = 'woff'
    output_font.save(str(output_prefix+".woff"))
    print(f"New font saved as {output_prefix}.woff")
    
    # Close the font objects
    base_font.close()
    anno_font.close()
    output_font.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog=sys.argv[0])
    parser.add_argument('-i', '--base-font-file', help="Base font in .ttf fomrat", required=True)
    parser.add_argument('-a', '--anno-font_file', help="Annotation font in .ttf fomrat", required=True)
    parser.add_argument('-o', '--output-prefix', help="Output prefix for .ttf and .woff file", required=True)
    parser.add_argument('-m', '--mapping', help="CSV file for the mapping between base font and annotation font", required=True)
    parser.add_argument('-f', '--family-name', help="Replace with the new family name")
    parser.add_argument('-y', '--anno-y-offset', type=float, default=0.8, help="Y offset in (percentage) for annotation string")
    parser.add_argument('-bs', '--base-scale', type=float, default=0.75, help="The scaling factor for the base font")
    parser.add_argument('-as', '--anno-scale', type=float, default=0.15, help="The scaling factor for the base font")
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
        anno_y_offset=options.anno_y_offset,
        optimize=options.optimize
    )