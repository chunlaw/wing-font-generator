from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from fontTools.ttLib.tables import otTables as ot
from mappings.parser import load_mapping
from chain_context_handler import buildChainSub
from liga_handler import buildLiga
from utils import get_glyph_name_by_char
import sys

GLYPH_PREFIX = "wingfont"

# assume base_font and output_font are from the same source
def generate_glyphs(base_font, anno_font, output_font, mapping):
    output_glyph_name_used = {}
    """Create a new TTF file with combined glyphs."""
    base_glyph_set = base_font.getGlyphSet()
    anno_glyph_set = anno_font.getGlyphSet()
    output_glyph_set = output_font.getGlyphSet()

    # Get font metrics
    units_per_em = base_font['head'].unitsPerEm
    y_offset = round(units_per_em * 0.8)
    anno_scale = 0.12
    base_scale = 0.75

    # resize each glyph for supporting anno_str
    cnt = 0
    for base_char, anno_strs_dict in mapping.items():
        for i, anno_str in enumerate(anno_strs_dict.keys()):
            glyph_name = get_glyph_name_by_char(base_font, base_char)
            pen = TTGlyphPen(output_glyph_set)
            # Draw the base glyph at the bottom (original position)
            if glyph_name in base_glyph_set:
                base_glyph_set[glyph_name].draw(TransformPen(pen, (base_scale, 0, 0, base_scale, 0, 0)))
            else:
                print(f"Char '{base_char}' not found in base font, skipping")
                continue
            
            # create glyph for the anno_str
            anno_len = 0
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                anno_len += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
            x_position = ( base_font['hmtx'][glyph_name][0] * base_scale - anno_len ) / 2
            
            # Draw each anno string glyph
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                if anno_glyph_name in anno_glyph_set:
                    # Transform pen to position anno glyph
                    transform = (anno_scale, 0, 0, anno_scale, x_position, y_offset)  # Move up by y_offset
                    tpen = TransformPen(pen, transform)
                    anno_glyph_set[anno_glyph_name].draw(tpen)
                    # Increment x_position by the advance width
                    x_position += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
                else:
                    print(f"Glyph '{anno_glyph_name}' not found in anno font")

            # add to output_font
            new_glyph_name = glyph_name if glyph_name not in output_glyph_name_used else GLYPH_PREFIX+str(cnt).zfill(6) 
            cnt += 1

            if 'vmtx' in output_font.keys():
                output_font['vmtx'][new_glyph_name] = base_font['vmtx'][glyph_name]
            if 'hmtx' in output_font:
                output_font['hmtx'][new_glyph_name] = (
                    base_font['hmtx'][glyph_name][0],
                    base_font['hmtx'][glyph_name][1] + base_font['hmtx'][glyph_name][0] * ( 1 - base_scale ) / 2
                )
            
            output_font['glyf'][new_glyph_name] = pen.glyph()
            output_glyph_name_used[new_glyph_name] = True
            mapping[base_char][anno_str] = (new_glyph_name, i)
    

def main():
    # Input files (replace with your actual file paths)
    base_font_file = sys.argv[1]
    anno_font_file = sys.argv[2]
    csv_file = sys.argv[3]
    output_prefix = sys.argv[4]

    # Load the fonts and mapping
    base_font = TTFont(base_font_file)
    anno_font = TTFont(anno_font_file)
    output_font = TTFont(base_font_file)
    word_mapping, char_mapping = load_mapping(base_font, csv_file)

    # Combine the glyphs and save the new font
    generate_glyphs(base_font, anno_font, output_font, char_mapping)

    # Build Chain Contextual Substitution
    buildChainSub(output_font, word_mapping, char_mapping)
    
    # Replace glyph by new glyph using liga
    buildLiga(output_font, char_mapping)

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
    main()