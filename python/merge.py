from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.merge import Merger
import os
import sys

def stack_glyphs(font_a_path, font_b_path, output_path):
    # Open the source fonts
    font_a = TTFont(font_a_path)  # Contains 'a'
    font_b = TTFont(font_b_path)  # Contains 'b'
    
    # Get glyph sets
    a_glyphs = font_a.getGlyphSet()
    b_glyphs = font_b.getGlyphSet()
    
    # Get individual glyphs
    glyph_a = a_glyphs['a']
    glyph_b = b_glyphs['ü']
    
    # Create a pen to draw the combined glyph
    pen = TTGlyphPen(None)
    
    # Draw glyph 'a' at the bottom
    glyph_a.draw(pen)
    
    # Get metrics to calculate vertical positioning
    a_height = font_a['hhea'].ascent - font_a['hhea'].descent
    b_height = font_b['hhea'].ascent - font_b['hhea'].descent
    
    # Calculate offset to place 'b' above 'a'
    # You can adjust this value to change the vertical spacing
    vertical_offset = a_height
    
    # Center 'b' horizontally above 'a'
    horizontal_offset = (glyph_a.width - glyph_b.width) // 2
    
    # Draw glyph 'b' above 'a'
    pen.transform = (1, 0, 0, 1, horizontal_offset, vertical_offset)
    glyph_b.draw(pen)
    
    # Create the combined glyph
    combined_glyph = pen.glyph()
    
    # Set width to the wider of the two glyphs
    combined_glyph.width = max(glyph_a.width, glyph_b.width)
    
    # Create glyph dictionary
    glyphs = {
        '.notdef': a_glyphs['.notdef'],  # Required glyph
        'ab': combined_glyph            # New combined glyph
    }
    
    # Map to Private Use Area
    new_cmap = {
        0xE000: 'ab'  # Unicode Private Use Area
    }
    
    # Create new font
    from fontTools.fontBuilder import FontBuilder
    fb = FontBuilder(unitsPerEm=font_a['head'].unitsPerEm)
    
    fb.setupGlyphOrder(['.notdef', 'ab'])
    fb.setupCharacterMap(new_cmap)
    fb.setupGlyf(glyphs)
    
    # Set font metrics
    hhea = font_a['hhea']
    os2 = font_a['OS/2']
    
    # Adjust ascent to accommodate stacked glyphs
    new_ascent = max(hhea.ascent, a_height + b_height)
    
    fb.setupHorizontalHeader(
        ascent=new_ascent,
        descent=hhea.descent,
        advanceWidthMax=max(hhea.advanceWidthMax, combined_glyph.width)
    )
    
    fb.setupOS2(
        sTypoAscender=new_ascent,
        sTypoDescender=os2.sTypoDescender,
        usWinAscent=new_ascent,
        usWinDescent=os2.usWinDescent
    )
    
    fb.setupNameTable({
        1: "StackedGlyphFont",
        2: "Regular",
        4: "StackedGlyphFont Regular",
        6: "StackedGlyphFont-Regular"
    })
    
    # Save the new font
    fb.save(output_path)
    print(f"New font saved as: {output_path}")
    print("The stacked glyph ('b' above 'a') is mapped to U+E000")
    
    # Clean up
    font_a.close()
    font_b.close()

if __name__ == "__main__":
    font_a_path = sys.argv[1]    # Font A (source of 'a')
    font_b_path = sys.argv[2]    # Font B (source of 'b')
    output_path = sys.argv[3]

    font_a = TTFont(font_a_path)  # Contains 'a'
    font_b = TTFont(font_b_path)  # Contains 'b'
    
    merger = Merger()
    out_font = merger.merge([font_a_path, font_b_path])
    out_font.save(output_path)