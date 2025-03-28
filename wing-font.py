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

def main(
    base_font_file, 
    anno_font_file, 
    output_prefix, 
    mapping, 
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

    # Combine the glyphs and save the new font
    generate_glyphs(base_font, anno_font, output_font, char_mapping, base_scale=base_scale, anno_scale=anno_scale, anno_y_offset=anno_y_offset)

    # Build Chain Contextual Substitution
    buildChainSub(output_font, word_mapping, char_mapping)
    
    # Replace glyph by new glyph using liga
    buildLiga(output_font, char_mapping)

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
    parser.add_argument('-y', '--anno-y-offset', help="Y offset in (percentage) for annotation string")
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
        base_scale=0.75,
        anno_scale=0.15,
        anno_y_offset=0.8,
        optimize=options.optimize
    )