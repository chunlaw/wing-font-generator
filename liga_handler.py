from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, chunk, buildDefaultLangSys

chunk_size = 5000

# Expected format for mapping
# {"一": {"jat1": None | (glyph_name, idx)}} <-- idx is used to ligature the anno_str
def buildLiga(output_font, char_mapping):
    gsub = output_font["GSUB"].table

    # create the set ofligatures
    for anno_strs_dict_chunk in list(chunk(list(char_mapping.values()), chunk_size)):
        ligaBuilder = builder.LigatureSubstBuilder(output_font, None)
        for anno_strs_dict in anno_strs_dict_chunk:
            for glyph_name, idx in anno_strs_dict.values():
                for _glyph_name, _idx in anno_strs_dict.values():
                    # hindered by the cross-script handling in opentype parser, ligature cannot mix Chinese character with a series of latin characters
                    # use number instead...
# liga_handler.py (buildLiga 函數內，約 line 19 附近)

# 原有錯誤的單次調用邏輯：
#                         # ...
#                         ligaBuilder.ligatures[(
#                             glyph_name,
#                             get_glyph_name_by_char(output_font, str(_idx)) # <-- 錯誤點
#                         )] = _glyph_name


# 🌟 修正後的邏輯 🌟
                    # 將數字索引轉換為字元序列 (例如 10 -> '1', '0')
                    idx_chars = [char for char in str(_idx)]
                        
                    # 獲取變體索引中每個數字的字形名稱
                    number_glyph_names = [
                        get_glyph_name_by_char(output_font, char) for char in idx_chars
                    ]
                    
                    # 連字的輸入元組：(中文字形名稱) + (數字字形名稱序列)
                    # 注意：這裡應該是擴展現有的元組
                    
                    # 這是您程式碼結構中的一個**連字設計選擇**：
                    # 您的連字輸入是：(中文字形, 數字字形)
                    # 對於 10 號索引，它必須是：(中文字形, "1"字形, "0"字形)
                    
                    if len(number_glyph_names) == 1:
                        # 1 到 9 的情況
                        input_tuple = (glyph_name, number_glyph_names[0])
                    elif len(number_glyph_names) > 1:
                        # 10 及以上的情況：將多個數字字形添加到元組中
                        input_tuple = tuple([glyph_name] + number_glyph_names)
                    else:
                        # 不應發生的情況
                        continue
                        
                    ligaBuilder.ligatures[input_tuple] = _glyph_name
        
        # assign the ligature to all related features and their scripts
        ligaFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'liga']
        if len(ligaFeatureIndexes) == 0:
            featureRecord = otTables.FeatureRecord()
            featureRecord.Feature = otTables.Feature()
            featureRecord.FeatureTag = 'liga'
            featureRecord.Feature.LookupListIndex = [len(gsub.LookupList.Lookup)]
            featureRecord.Feature.LookupCount = 1
            for scriptRecord in gsub.ScriptList.ScriptRecord:
                if scriptRecord.Script.DefaultLangSys is None:
                    scriptRecord.Script.DefaultLangSys = buildDefaultLangSys()
                scriptRecord.Script.DefaultLangSys.FeatureIndex.append(len(gsub.FeatureList.FeatureRecord))
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