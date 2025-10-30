# build_glyph.py 的診斷版本 (打印被跳過的字形)
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from utils import get_glyph_name_by_char

GLYPH_PREFIX = "wingfont"

def generate_glyphs(base_font, anno_font, output_font, mapping, anno_scale=0.15, base_scale=0.75, anno_y_offset=0.8):
    output_glyph_name_used = {}
    
    base_glyph_set = base_font.getGlyphSet()
    anno_glyph_set = anno_font.getGlyphSet()
    output_glyph_set = output_font.getGlyphSet()

    anno_glyph_order = anno_font.getGlyphOrder()
    base_glyph_order = base_font.getGlyphOrder()
    
    units_per_em = base_font['head'].unitsPerEm
    y_offset = round(units_per_em * anno_y_offset)

    # --- 第一部分：處理有註音的字形 ---
    processed_chars = set(mapping.keys())
    processed_glyph_names = set() # 新增：記錄被第一部分處理過的字形名稱
    cnt = 0
    for base_char, anno_strs_dict in mapping.items():
        glyph_name_raw = get_glyph_name_by_char(base_font, base_char)
        
        if not isinstance(glyph_name_raw, str) or glyph_name_raw not in base_glyph_order:
            continue
            
        glyph_name = glyph_name_raw
        processed_glyph_names.add(glyph_name) # 記錄下來

        if glyph_name not in base_glyph_set:
            continue
            
        base_advance_width = base_font['hmtx'][glyph_name][0]
            
        for i, anno_str in enumerate(anno_strs_dict.keys()):
            # ... (這部分剩餘代碼與之前版本相同，為節省篇幅省略)
            if i == 0:
                new_glyph_name = glyph_name
            else:
                new_glyph_name = GLYPH_PREFIX+str(cnt).zfill(6)
            
            while new_glyph_name in output_glyph_name_used or (i > 0 and new_glyph_name == glyph_name):
                new_glyph_name = GLYPH_PREFIX+str(cnt).zfill(6)
                cnt += 1
            
            pen = TTGlyphPen(output_glyph_set)
            base_glyph_set[glyph_name].draw(TransformPen(pen, (base_scale, 0, 0, base_scale, 0, 0)))
            anno_len = 0
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                if isinstance(anno_glyph_name, str) and anno_glyph_name in anno_glyph_order: 
                    anno_len += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
            
            x_position = ( base_advance_width * base_scale - anno_len ) / 2
            
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                if isinstance(anno_glyph_name, str) and anno_glyph_name in anno_glyph_set:
                    transform = (anno_scale, 0, 0, anno_scale, x_position, y_offset)
                    tpen = TransformPen(pen, transform)
                    anno_glyph_set[anno_glyph_name].draw(tpen)
                    
                    if anno_glyph_name in anno_glyph_order:
                        x_position += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
            if 'vmtx' in output_font.keys():
                if glyph_name in base_glyph_order: 
                    output_font['vmtx'][new_glyph_name] = base_font['vmtx'][glyph_name]
            
            if 'hmtx' in output_font:
                output_font['hmtx'][new_glyph_name] = (
                    base_advance_width,
                    round(max(0,min(( base_advance_width * base_scale - anno_len ) / 2, base_font['hmtx'][glyph_name][1] * base_scale) + ( 1 - base_scale ) * base_advance_width / 2))
                )
            output_font['glyf'][new_glyph_name] = pen.glyph()
            output_glyph_name_used[new_glyph_name] = True
            mapping[base_char][anno_str] = (new_glyph_name, i)
            if i == 0:
                output_font.getBestCmap()[ord(base_char)] = new_glyph_name

    # --- 第二部分：處理沒有註音的字形 (帶有診斷信息) ---
    print("\nProcessing and scaling un-annotated glyphs...")
    print("="*40)
    
    skipped_unencoded = []
    skipped_no_outline = []
    
    # 改變邏輯：直接檢查字形名是否在第一部分處理過
    for glyph_name in base_glyph_order:
        # 如果字形已在第一部分處理過，直接跳過
        if glyph_name in processed_glyph_names:
            continue

        # 如果字形沒有輪廓（如空格），記錄並跳過
        if glyph_name not in base_glyph_set:
            skipped_no_outline.append(glyph_name)
            continue
        
        # --- 對所有剩下未處理的、有輪廓的字形進行縮放 ---
        base_advance_width, base_lsb = base_font['hmtx'][glyph_name]
        pen = TTGlyphPen(output_glyph_set)
        x_offset = (base_advance_width * (1 - base_scale)) / 2
        transform = (base_scale, 0, 0, base_scale, x_offset, 0)
        tpen = TransformPen(pen, transform)
        base_glyph_set[glyph_name].draw(tpen)
        
        output_font['glyf'][glyph_name] = pen.glyph()
        
        new_lsb = round(base_lsb * base_scale + x_offset)
        output_font['hmtx'][glyph_name] = (base_advance_width, new_lsb)
    
    # --- 打印診斷報告 ---
    if skipped_no_outline:
        print(f"\n[INFO] Skipped {len(skipped_no_outline)} glyphs because they have no outlines (e.g., space):")
        # 只打印前10個以避免刷屏
        print(" -> ", ", ".join(skipped_no_outline[:10]) + ('...' if len(skipped_no_outline) > 10 else ''))

    # 我們的新邏輯會處理未編碼字形，所以這裡的檢查是為了完整性
    print("\n[INFO] Unencoded glyphs are now being scaled.")
    print("="*40)
    print("Done scaling un-annotated glyphs.")