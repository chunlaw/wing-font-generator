from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from utils import get_glyph_name_by_char

GLYPH_PREFIX = "wingfont"

# assume base_font and output_font are from the same source
def generate_glyphs(base_font, anno_font, output_font, mapping, anno_scale = 0.15, base_scale = 0.75, anno_y_offset=0.8):
    output_glyph_name_used = {}
    """Create a new TTF file with combined glyphs."""
    base_glyph_set = base_font.getGlyphSet()
    anno_glyph_set = anno_font.getGlyphSet()
    output_glyph_set = output_font.getGlyphSet()

    # Get font metrics
    units_per_em = base_font['head'].unitsPerEm
    y_offset = round(units_per_em * anno_y_offset)

    # resize each glyph for supporting anno_str
    cnt = 0
    for base_char, anno_strs_dict in mapping.items():
        for i, anno_str in enumerate(anno_strs_dict.keys(), 1): # <--- 將這裡的計數從 0 改成 1
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
                    round(max(
                        0,
                        min( 
                            ( base_font['hmtx'][glyph_name][0] * base_scale - anno_len ) / 2,
                            base_font['hmtx'][glyph_name][1] * base_scale
                        ) + ( 1 - base_scale ) * base_font['hmtx'][glyph_name][0] / 2
                    ))
                )
            
            output_font['glyf'][new_glyph_name] = pen.glyph()
            output_glyph_name_used[new_glyph_name] = True
            # 確保 mapping 中的 variant 索引 i 是正確的
            mapping[base_char][anno_str] = (new_glyph_name, i) # <--- i > 0