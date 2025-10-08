# --- 請將這整個函數複製並替換掉你 liga_handler.py 文件中的舊版本 ---

from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, chunk, buildDefaultLangSys
from typing import Dict, Tuple, Any

chunk_size = 5000

def buildLiga(output_font, char_mapping: Dict[str, Dict[str, Tuple[str, int]]]):
    gsub = output_font["GSUB"].table

    # 1. 建立數字 0-9 的字形名稱映射
    number_glyph_names: Dict[int, str] = {}
    for i in range(10):
        char = str(i)
        glyph_name = get_glyph_name_by_char(output_font, char)
        if glyph_name:
            number_glyph_names[i] = glyph_name
            
    if not number_glyph_names:
        print("Warning: Cannot find glyphs for numbers 0-9 in the font. Skipping buildLiga.")
        return

    # 2. 遍歷數據塊，為每個塊建立一個 Lookup Subtable
    for char_mapping_chunk in chunk(list(char_mapping.items()), chunk_size):
        ligaBuilder = builder.LigatureSubstBuilder(output_font, None)
        
        # 遍歷塊中的每個字元及其所有注音變體
        for original_char, anno_strs_dict in char_mapping_chunk:
            
            # --- 高效的規則建立邏輯 ---

            # a. 獲取該字的原始預設字形 (用於處理數字 0)
            default_glyph_name = get_glyph_name_by_char(output_font, original_char)
            if not default_glyph_name:
                continue

            # b. 建立一個從變體索引到字形名稱的映射，方便快速查找
            # 例如 {1: 'uni4E00.v1', 2: 'uni4E00.v2', ...}
            index_to_glyph_map = {idx: name for name, idx in anno_strs_dict.values()}
            
            # c. 獲取該字的所有變體字形列表 (包括預設字形本身)
            all_variant_glyphs = [name for name, idx in anno_strs_dict.values()]

            # d. 外層迴圈：遍歷該字的所有變體（作為輸入的基礎字形）
            # 這是 V 次循環
            for base_glyph in all_variant_glyphs:
                
                # e. 內層迴圈：為每個基礎字形創建 0-9 的數字連字規則
                # 這是常數 10 次循環
                for num_index, num_glyph_name in number_glyph_names.items():
                    target_glyph = None
                    if num_index == 0:
                        # 規則: (任何變體, '0') -> 預設字形
                        target_glyph = default_glyph_name
                    else:
                        # 規則: (任何變體, 'N') -> 索引為 N 的變體
                        # 從映射中快速查找目標字形
                        target_glyph = index_to_glyph_map.get(num_index)
                    
                    # 如果找到了目標字形，則建立連字規則
                    if target_glyph:
                        ligaBuilder.ligatures[(base_glyph, num_glyph_name)] = target_glyph

        # --- 後續的 GSUB 表寫入邏輯 (與之前版本相同) ---
        if len(ligaBuilder.ligatures) > 0:
            # 檢查 'liga' feature 是否存在
            ligaFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'liga']
            
            new_lookup_index = len(gsub.LookupList.Lookup)
            
            if not ligaFeatureIndexes:
                featureRecord = otTables.FeatureRecord()
                featureRecord.Feature = otTables.Feature()
                featureRecord.FeatureTag = 'liga'
                featureRecord.Feature.LookupListIndex = [new_lookup_index]
                featureRecord.Feature.LookupCount = 1
                
                feature_index_to_add = len(gsub.FeatureList.FeatureRecord)
                gsub.FeatureList.FeatureRecord.append(featureRecord)
                gsub.FeatureList.FeatureCount += 1
                
                for scriptRecord in gsub.ScriptList.ScriptRecord:
                    if scriptRecord.Script.DefaultLangSys is None:
                        scriptRecord.Script.DefaultLangSys = buildDefaultLangSys()
                    
                    if feature_index_to_add not in scriptRecord.Script.DefaultLangSys.FeatureIndex:
                        scriptRecord.Script.DefaultLangSys.FeatureIndex.append(feature_index_to_add)
                        scriptRecord.Script.DefaultLangSys.FeatureCount += 1
            else:
                for idx in ligaFeatureIndexes:
                    feature = gsub.FeatureList.FeatureRecord[idx].Feature
                    if new_lookup_index not in feature.LookupListIndex:
                        feature.LookupListIndex.append(new_lookup_index)
                        feature.LookupCount += 1
            
            gsub.LookupList.Lookup.append(ligaBuilder.build())
            gsub.LookupList.LookupCount += 1