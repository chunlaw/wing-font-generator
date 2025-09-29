from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, chunk, buildDefaultLangSys
from typing import Dict, Tuple, Any

chunk_size = 5000

# Expected format for char_mapping:
# {"一": {"jat1": (glyph_name_str, idx_int)}} 

def buildLiga(output_font, char_mapping: Dict[str, Dict[str, Tuple[str, int]]]):
    gsub = output_font["GSUB"].table

    # 1. 建立字形索引到名稱的映射，用於數字字形 (0-9)
    number_glyph_names: Dict[int, str] = {}
    for i in range(10): 
        char = str(i)
        glyph_name = get_glyph_name_by_char(output_font, char)
        if glyph_name:
            number_glyph_names[i] = glyph_name
            
    if not number_glyph_names:
        print("Warning: Cannot find glyphs for numbers 0-9 in the font. Skipping buildLiga.")
        return

    # create the set of ligatures
    for anno_strs_dict_chunk in list(chunk(list(char_mapping.values()), chunk_size)):
        ligaBuilder = builder.LigatureSubstBuilder(output_font, None)
        
        # 外層循環：遍歷所有字元的變體 (Base Glyph)
        for anno_strs_dict in anno_strs_dict_chunk:
            # idx 是基本字形變體 
            # glyph_name 是基本字形變體名稱 (例如 uni4E00)
            for glyph_name, idx in anno_strs_dict.values(): 
                
                # 內層循環：遍歷所有變體 (Target Glyph and Index)
                # *** 修正點：將 _idx 和 _glyph_name 順序交換 ***
                for _glyph_name, _idx in anno_strs_dict.values():
                    
                    # 確保 _idx 是整數，並檢查它是否在 1 到 9 之間
                    if isinstance(_idx, int) and 0 < _idx < 10 and _idx in number_glyph_names:
                        
                        # 第一個字形 (Input 1): Base Glyph Name
                        input_glyph_1 = glyph_name
                        
                        # 第二個字形 (Input 2): Number Glyph Name (例如 '1' 的字形)
                        input_glyph_2 = number_glyph_names[_idx] 
                        
                        # 替換後的字形 (Output): Variant Glyph Name
                        target_glyph = _glyph_name
                        
                        # 建立規則：(基本字形, 數字字形) -> 變體字形
                        ligaBuilder.ligatures[(input_glyph_1, input_glyph_2)] = target_glyph
                        
        
        # assign the ligature to all related features and their scripts (此處邏輯未變)
        ligaFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'liga']
        if len(ligaBuilder.ligatures) > 0: # 只有當有規則時才建立 Lookup
            if len(ligaFeatureIndexes) == 0:
                featureRecord = otTables.FeatureRecord()
                featureRecord.Feature = otTables.Feature()
                featureRecord.FeatureTag = 'liga'
                featureRecord.Feature.LookupListIndex = [len(gsub.LookupList.Lookup)]
                featureRecord.Feature.LookupCount = 1
                for scriptRecord in gsub.ScriptList.ScriptRecord:
                    if scriptRecord.Script.DefaultLangSys is None:
                        scriptRecord.Script.DefaultLangSys = buildDefaultLangSys()
                    
                    # 檢查 Feature 是否已存在，避免重複添加
                    feature_index_to_add = len(gsub.FeatureList.FeatureRecord)
                    if feature_index_to_add not in scriptRecord.Script.DefaultLangSys.FeatureIndex:
                        scriptRecord.Script.DefaultLangSys.FeatureIndex.append(feature_index_to_add)
                        scriptRecord.Script.DefaultLangSys.FeatureCount += 1
                        
                gsub.FeatureList.FeatureRecord.append(featureRecord)
                gsub.FeatureList.FeatureCount += 1
            else:
                for idx in ligaFeatureIndexes:
                    gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex.append(len(gsub.LookupList.Lookup))
                    gsub.FeatureList.FeatureRecord[idx].Feature.LookupCount += 1 

            # insert the lookup into the font
            gsub.LookupList.Lookup.append(ligaBuilder.build())
            gsub.LookupList.LookupCount += 1