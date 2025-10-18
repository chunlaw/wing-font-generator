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
        print("Warning: Cannot find glyphs for numbers 0-9 in the font. Skipping number-based liga rules.")

    # [新規則] 1b. 獲取 '丅' 字元的字形名稱
    hen_char = '丅'
    hen_glyph_name = get_glyph_name_by_char(output_font, hen_char)
    if not hen_glyph_name:
        print("Warning: Cannot find glyph for '丅' in the font. Skipping '丅'-based liga rules.")

    # 如果兩種規則的觸發字元都不存在，則直接返回
    if not number_glyph_names and not hen_glyph_name:
        print("Error: No trigger glyphs (0-9 or '丅') found. Skipping buildLiga.")
        return

    # 2. 遍歷數據塊，為每個塊建立一個 Lookup Subtable
    for char_mapping_chunk in chunk(list(char_mapping.items()), chunk_size):
        ligaBuilder = builder.LigatureSubstBuilder(output_font, None)
        
        # 遍歷塊中的每個字元及其所有注音變體
        for original_char, anno_strs_dict in char_mapping_chunk:
            
            # --- 高效的規則建立邏輯 ---

            # a. 獲取該字的原始預設字形
            default_glyph_name = get_glyph_name_by_char(output_font, original_char)
            if not default_glyph_name:
                continue

            # b. 建立一個從變體索引到字形名稱的映射，方便快速查找
            # 例如 {1: 'uni4E00.v1', 2: 'uni4E00.v2', ...}
            index_to_glyph_map = {idx: name for name, idx in anno_strs_dict.values()}
            
            # c. 獲取該字的所有變體字形列表 (用於作為連字的起始字元)
            all_variant_glyphs = [name for name, idx in anno_strs_dict.values()]

            # d. 外層迴圈：遍歷該字的所有變體（作為輸入的基礎字形）
            for base_glyph in all_variant_glyphs:
                
                # --- [規則一] 建立 '字+數字' 的連字規則 ---
                if number_glyph_names:
                    for num_index, num_glyph_name in number_glyph_names.items():
                        target_glyph = None
                        if num_index == 0:
                            # 規則: (任何變體, '0') -> 預設字形
                            target_glyph = default_glyph_name
                        else:
                            # 規則: (任何變體, 'N') -> 索引為 N 的變體
                            target_glyph = index_to_glyph_map.get(num_index)
                        
                        # 如果找到了目標字形，則建立連字規則
                        if target_glyph:
                            ligaBuilder.ligatures[(base_glyph, num_glyph_name)] = target_glyph

                # --- [規則二] 建立 '字+丅...' 的連字規則 ---
                if hen_glyph_name:
                    # 內層迴圈：為每個基礎字形創建 1-10 個 '丅' 的連字規則
                    for num_hens in range(1, 11): # 代表 1 到 10 個 '丅'
                        target_glyph_for_hen = None
                        # '丅' 的數量 (num_hens) 映射到數字索引
                        # 1個丅 -> 數字0, 2個丅 -> 數字1, ..., 10個丅 -> 數字9
                        target_index = num_hens - 1

                        if target_index == 0:
                            # 規則: (任何變體, '丅') -> 預設字形
                            target_glyph_for_hen = default_glyph_name
                        else:
                            # 規則: (任何變體, N 個 '丅') -> 索引為 N-1 的變體
                            target_glyph_for_hen = index_to_glyph_map.get(target_index)

                        # 如果找到了目標字形，則建立連字規則
                        if target_glyph_for_hen:
                            # 建立輸入序列，例如 (base_glyph, '丅', '丅')
                            input_sequence_components = [base_glyph]
                            input_sequence_components.extend([hen_glyph_name] * num_hens)
                            ligaBuilder.ligatures[tuple(input_sequence_components)] = target_glyph_for_hen


        # --- 後續的 GSUB 表寫入邏輯 (與之前版本相同) ---
        if len(ligaBuilder.ligatures) > 0:
            # 檢查 'liga/rlig/dlig/calt/ccmp' feature 是否存在
            featureTag = 'liga'
            ligaFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == featureTag]
            
            new_lookup_index = len(gsub.LookupList.Lookup)
            
            if not ligaFeatureIndexes:
                featureRecord = otTables.FeatureRecord()
                featureRecord.Feature = otTables.Feature()
                featureRecord.FeatureTag = featureTag
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