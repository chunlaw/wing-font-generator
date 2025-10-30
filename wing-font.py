# wing-font.py

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
import string # <--- 步驟 1: 導入 string 模組

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
    upper_y_offset_ratio=0.8,
    invert=False,
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
    # ！！！注意：build_glyph.py 在這裡已經縮放了所有未註音的字形，包括標點和字母
    generate_glyphs(base_font, anno_font, output_font, char_mapping, base_scale=base_scale, anno_scale=anno_scale, upper_y_offset_ratio=upper_y_offset_ratio, invert=invert)

    # Build Chain Contextual Substitution
    buildChainSub(output_font, word_mapping, char_mapping)
    
    # Replace glyph by new glyph using liga
    buildLiga(output_font, char_mapping)

    # if size optimization is required
    if optimize:
        print("Optimizing font size by subsetting...")
        # 初始列表：保留數字
        glyphs_to_be_kept = [get_glyph_name_by_char(base_font, str(i)) for i in range(0, 10)]
        
        # 添加所有註音變體字形
        for value in char_mapping.values():
            for glyph_name, idx in value.values():
                glyphs_to_be_kept.append(glyph_name)
        
        # --- 新增開始 (步驟 2: 擴展列表) ---
        
        # 1. 定義要額外保留的字符集 (ASCII 標點和字母)
        # 您也可以手動添加其他需要的字符，例如全形標點 '，。！？'
        # chars_to_keep_additionally = string.punctuation + string.ascii_letters
        chars_to_keep_additionally = string.punctuation + string.ascii_letters + '，。！？《》「」『』｛｝〖〗【】［］、……——＠＃￥％＆＊+-/“”：；‘’／'

        # 2. 遍歷這些字符，將它們的 glyph name 加入列表
        print(f"Keeping additional {len(chars_to_keep_additionally)} punctuation and letter glyphs...")
        for char in chars_to_keep_additionally:
            glyph_name = get_glyph_name_by_char(base_font, char)
            if glyph_name:  # 確保字形存在於字體中
                glyphs_to_be_kept.append(glyph_name)
        
        # --- 新增結束 ---

        # Make subset to reduce file size
        subsetter = subset.Subsetter()
        
        # --- 修改開始 (步驟 3: 清理列表) ---
        
        # 過濾掉 None 值並移除重複項，確保列表乾淨
        valid_glyphs_to_keep = list(set(g for g in glyphs_to_be_kept if g is not None))
        print(f"Total unique glyphs to keep: {len(valid_glyphs_to_keep)}")
        
        subsetter.populate(glyphs=valid_glyphs_to_keep)
        
        # --- 修改結束 ---
        
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