# build_glyph.py 的最終修正
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from utils import get_glyph_name_by_char # 假設 utils.py 已修正

GLYPH_PREFIX = "wingfont"

def generate_glyphs(base_font, anno_font, output_font, mapping, anno_scale = 0.15, base_scale = 0.75, anno_y_offset=0.8):
    output_glyph_name_used = {}
    
    # 確保所有必要的字形集已定義
    base_glyph_set = base_font.getGlyphSet()
    anno_glyph_set = anno_font.getGlyphSet()
    output_glyph_set = output_font.getGlyphSet()

    # 獲取字形名稱列表 (用於安全檢查)
    anno_glyph_order = anno_font.getGlyphOrder() 
    base_glyph_order = base_font.getGlyphOrder()
    
    # Get font metrics
    units_per_em = base_font['head'].unitsPerEm
    y_offset = round(units_per_em * anno_y_offset)

    # resize each glyph for supporting anno_str
    cnt = 0
    for base_char, anno_strs_dict in mapping.items():
        
        # 獲取原始字形名稱 (可能是 str 或 None)
        glyph_name_raw = get_glyph_name_by_char(base_font, base_char)
        
        # 驗證 base_char 的字形名稱是否有效 (防禦性檢查)
        if not isinstance(glyph_name_raw, str) or glyph_name_raw not in base_glyph_order:
            # print(f"Char '{base_char}' not found or invalid in base font, skipping.")
            continue
            
        glyph_name = glyph_name_raw # 使用驗證過的字形名稱
        
        # 檢查基本字形是否能從 glyph set 中繪製
        if glyph_name not in base_glyph_set:
             # print(f"Char '{base_char}' glyph '{glyph_name}' exists in CMAP but not in glyf table, skipping.")
             continue
            
        # 獲取基本字形寬度 (安全查詢，因為 glyph_name 已驗證)
        base_advance_width = base_font['hmtx'][glyph_name][0]
            
        for i, anno_str in enumerate(anno_strs_dict.keys()):
            # 1. 確定新字形名稱和變體索引 (i=0 是 Variant 0)
            if i == 0:
                new_glyph_name = glyph_name
            else:
                new_glyph_name = GLYPH_PREFIX+str(cnt).zfill(6)
            
            # 確保新字形名稱不會與已存在的字形名稱衝突
            while new_glyph_name in output_glyph_name_used or (i > 0 and new_glyph_name == glyph_name):
                 new_glyph_name = GLYPH_PREFIX+str(cnt).zfill(6)
                 cnt += 1
            
            # 2. 創建字形繪製筆
            pen = TTGlyphPen(output_glyph_set)

            # 3. 繪製基本字形
            base_glyph_set[glyph_name].draw(TransformPen(pen, (base_scale, 0, 0, base_scale, 0, 0)))

            # 4. 計算註音字串的長度和位置
            anno_len = 0
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                
                # 只有當字形名稱為字串且存在於字形順序列表中時，才進行 hmtx 查詢。
                if isinstance(anno_glyph_name, str) and anno_glyph_name in anno_glyph_order: 
                    anno_len += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
                else:
                    pass
            
            x_position = ( base_advance_width * base_scale - anno_len ) / 2
            
            # 5. 繪製註音字串
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                
                # 再次檢查註音字形是否有效
                if isinstance(anno_glyph_name, str) and anno_glyph_name in anno_glyph_set:
                    # Transform pen to position anno glyph
                    transform = (anno_scale, 0, 0, anno_scale, x_position, y_offset)
                    tpen = TransformPen(pen, transform)
                    anno_glyph_set[anno_glyph_name].draw(tpen)
                    
                    # 只有當字形名稱存在於 glyph_order 時才增加 x_position
                    if anno_glyph_name in anno_glyph_order:
                       x_position += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
                # 否則，這個無效的字形會被忽略，x_position 不變

            # 6. 插入新字形和度量
            if 'vmtx' in output_font.keys():
                # 安全查詢 vmtx，使用 base_glyph_order 列表進行 'in' 檢查
                if glyph_name in base_glyph_order: 
                    output_font['vmtx'][new_glyph_name] = base_font['vmtx'][glyph_name]
                else:
                    pass
            
            if 'hmtx' in output_font:
                output_font['hmtx'][new_glyph_name] = (
                    base_advance_width, # 使用原始寬度
                    round(max(
                        0,
                        min( 
                            ( base_advance_width * base_scale - anno_len ) / 2,
                            base_font['hmtx'][glyph_name][1] * base_scale
                        ) + ( 1 - base_scale ) * base_advance_width / 2
                    ))
                )
            
            output_font['glyf'][new_glyph_name] = pen.glyph()
            output_glyph_name_used[new_glyph_name] = True
            
            # 7. 儲存變體資訊並更新 CMAP (Variant 0)
            mapping[base_char][anno_str] = (new_glyph_name, i)
            
            if i == 0:
                output_font.getBestCmap()[ord(base_char)] = new_glyph_name