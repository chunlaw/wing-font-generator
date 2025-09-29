# chain_context_handler.py 的最終且極端修正 (分離 Lookups)

from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, buildChainSubRuleSet, buildCoverage, chunk, buildDefaultLangSys

# *** 修正點 1: 設定變體上限為 256 (0-255) ***
MAX_VARIANT_LOOKUPS = 256

def buildChainSub(output_font, word_mapping, char_mapping):
    gsub = output_font["GSUB"].table
    
    # 1. 準備 Lookup Builders
    singleSubBuilders: list[builder.SingleSubstBuilder] = []
    # 循環到 MAX_VARIANT_LOOKUPS，而不是硬編碼的 10
    for i in range(0, MAX_VARIANT_LOOKUPS): 
        singleSubBuilders.append(builder.SingleSubstBuilder(output_font, None))

    chainSets = {} 
    
    # 遍歷詞組映射，準備 Chain Contextual 和 Single Substitution 數據
    for word, anno_strs in word_mapping.items():
        if len(word) <= 1:
             continue 
             
        needs_chain_sub = False
        lookup_indices = []
        
        for i, char in enumerate(word):
            anno_str = anno_strs[i]
            if char not in char_mapping or anno_str not in char_mapping[char]:
                lookup_indices.append(None)
                continue
            
            # 從 char_mapping 中獲取替換字形名稱 (_) 和變體索引 (variant)
            _, variant = char_mapping[char][anno_str] 
            
            if variant != 0:
                needs_chain_sub = True
                original_glyph_name = get_glyph_name_by_char(output_font, char)
                
                if not isinstance(original_glyph_name, str) or original_glyph_name not in output_font.getGlyphOrder():
                    lookup_indices.append(None)
                    continue
                    
                # *** 檢查 variant 索引是否超出範圍 ***
                if variant >= MAX_VARIANT_LOOKUPS:
                    print(f"Warning: Variant index {variant} for char '{char}' is too high (> {MAX_VARIANT_LOOKUPS - 1}), skipping.")
                    lookup_indices.append(None)
                    continue
                
                # _ 是替換字形名稱
                singleSubBuilders[variant].mapping[original_glyph_name] = _
                lookup_indices.append(variant) 
            else:
                lookup_indices.append(None)
                
        if needs_chain_sub:
            initial_glyph = get_glyph_name_by_char(output_font, word[0])
            if initial_glyph is None or not isinstance(initial_glyph, str):
                continue
                
            if initial_glyph not in chainSets:
                chainSets[initial_glyph] = []
            
            # 確保只取有效的字形名稱
            input_glyphs = [get_glyph_name_by_char(output_font, char) for char in word[1:]]
            input_glyphs = [g for g in input_glyphs if isinstance(g, str)]
            
            if len(input_glyphs) != len(word) - 1:
                # 至少有一個後續字元的字形無法找到
                continue

            chainSets[initial_glyph].append({
                "_debug": word + " " + " ".join(anno_strs),
                "input": input_glyphs,
                "lookupIndex": lookup_indices 
            })
            
    # 2. 插入 Single Substitution Lookups (Type 1)
    
    # *** 將 Single Sub Lookups 放入一個新的 GSUB Lookup 列表區間 ***
    single_sub_lookup_start_index = len(gsub.LookupList.Lookup) 
    single_sub_lookup_indices = {} 
    current_lookup_index = single_sub_lookup_start_index
    
    # 循環到 MAX_VARIANT_LOOKUPS，而不是硬編碼的 10
    for i in range(1, MAX_VARIANT_LOOKUPS): 
        if len(singleSubBuilders[i].mapping) > 0:
            gsub.LookupList.Lookup.append(singleSubBuilders[i].build())
            gsub.LookupList.LookupCount += 1
            single_sub_lookup_indices[i] = current_lookup_index 
            current_lookup_index += 1
            
    # Single Sub Lookups 結束索引
    single_sub_lookup_end_index = len(gsub.LookupList.Lookup)
            
    # 3. 調整 Chain Contextual 規則中的索引 (指向 Single Sub Lookups)
    for initial_glyph, chainSet in chainSets.items():
        for chain in chainSet:
            new_lookup_indices = []
            # 'lookupIndex' 存儲的是 variant 變體索引
            for variant_index in chain['lookupIndex']:
                if variant_index is not None and variant_index in single_sub_lookup_indices:
                    # 替換成實際的 GSUB LookupList 索引
                    new_lookup_indices.append(single_sub_lookup_indices[variant_index])
                else:
                    new_lookup_indices.append(None)
            chain['lookupIndex'] = new_lookup_indices
    
    reverseMap = output_font.getReverseGlyphMap()
    sorted_chainSets = list(sorted(chainSets.items(), key=lambda item: reverseMap.get(item[0], 0)))
    
    # 4. 插入 Chain Contextual Lookup (Type 6)
    chain_lookup_index = len(gsub.LookupList.Lookup) 
    insert_chain_context_subst_into_gsub_logic(output_font, sorted_chainSets, chain_lookup_index)

    # 5. 更新 Features：將 Type 6 和 Type 1 分離到不同 Feature

    # 5a. 設置 calt Feature (只包含 Type 6 Chain Contextual)
    calt_lookups = [chain_lookup_index]
    _update_or_create_feature(gsub, 'calt', calt_lookups)
    
    # 5b. 設置 locl Feature (包含所有 Type 1 Single Substitution)
    # 查找 Type 1 Lookups 的索引
    locl_lookups = list(range(single_sub_lookup_start_index, single_sub_lookup_end_index))
    _update_or_create_feature(gsub, 'locl', locl_lookups)
    
    print("Done ChainContextSubst")

# --- 輔助函數 (與您提供的代碼一致，故省略，但請確保其存在) ---

def insert_chain_context_subst_into_gsub_logic(output_font, all_chain_sets, chain_lookup_index):
    # ... (此處代碼未變) ...
    gsub = output_font["GSUB"].table
    chainSubStLookup = otTables.Lookup()
    chainSubStLookup.LookupType = 6
    chainSubStLookup.LookupFlag = 0
    chainSubStLookup.SubTable = []
    chainSubStLookup.SubTableCount = 0
    
    for i, chainSets_chunk in enumerate(list(chunk(all_chain_sets, 50))):
        chainSubStLookup.SubTable.append(otTables.ChainContextSubst())
        chainSubStLookup.SubTableCount += 1
        chainSubStLookup.SubTable[i].Format = 1
        chainSubStLookup.SubTable[i].Coverage = buildCoverage(glyphs=[item[0] for item in chainSets_chunk]) 
        chainSubStLookup.SubTable[i].ChainSubRuleSet = []
        chainSubStLookup.SubTable[i].ChainSubRuleSetCount = 0
        
        for initial_glyph, chainSet in chainSets_chunk: 
            chainSubRuleSet = buildChainSubRuleSet()
            for chain in chainSet: 
                chainSubRule = otTables.ChainSubRule()
                chainSubRule.Backtrack = []
                chainSubRule.BacktrackGlyphCount = 0
                chainSubRule.Input = chain['input']
                chainSubRule.InputGlyphCount = len(chain["input"])
                chainSubRule.LookAhead = []
                chainSubRule.LookAheadGlyphCount = 0
                chainSubRule.SubstLookupRecord = []
                chainSubRule.SubstCount = 0
                
                for word_index, lookupIndex in enumerate(chain['lookupIndex']):
                    if lookupIndex is not None:
                        substLookupRecord = otTables.SubstLookupRecord()
                        substLookupRecord.SequenceIndex = word_index # 最終正確的 Type 6 Format 1 索引
                        substLookupRecord.LookupListIndex = lookupIndex
                        chainSubRule.SubstLookupRecord.append(substLookupRecord)
                        chainSubRule.SubstCount += 1
                        
                chainSubRuleSet.ChainSubRule.append(chainSubRule)
            chainSubRuleSet.ChainSubRuleCount = len(chainSubRuleSet.ChainSubRule)
            chainSubStLookup.SubTable[i].ChainSubRuleSet.append(chainSubRuleSet)
            chainSubStLookup.SubTable[i].ChainSubRuleSetCount = len(chainSubStLookup.SubTable[i].ChainSubRuleSet)

    gsub.LookupList.Lookup.append(chainSubStLookup)
    gsub.LookupList.LookupCount += 1

def _update_or_create_feature(gsub, feature_tag, lookup_indices):
    # ... (此處代碼未變) ...
    featureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == feature_tag]
    
    if len(featureIndexes) == 0:
        # 創建新 Feature
        featureRecord = otTables.FeatureRecord()
        featureRecord.Feature = otTables.Feature()
        featureRecord.FeatureTag = feature_tag
        featureRecord.Feature.LookupListIndex = lookup_indices 
        featureRecord.Feature.LookupCount = len(lookup_indices)
        
        # 註冊 Feature 到 ScriptList/LangSys
        feature_index = len(gsub.FeatureList.FeatureRecord)
        for scriptRecord in gsub.ScriptList.ScriptRecord:
            langSysList = [scriptRecord.Script.DefaultLangSys]
            if scriptRecord.Script.LangSysRecord:
                 langSysList.extend([l.LangSys for l in scriptRecord.Script.LangSysRecord])
                 
            for langSys in langSysList:
                if langSys is None:
                    continue # 假設 buildDefaultLangSys 已經處理了 None 的情況
                    
                if feature_index not in langSys.FeatureIndex:
                    langSys.FeatureIndex.append(feature_index)
                    langSys.FeatureCount += 1

        gsub.FeatureList.FeatureRecord.append(featureRecord)
        gsub.FeatureList.FeatureCount += 1
        
    else:
        # 更新現有 Feature
        for idx in featureIndexes:
            # 確保現有的 Feature 列表被替換成新的列表
            current_lookups = gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex
            new_lookups = lookup_indices + [idx for idx in current_lookups if idx not in lookup_indices]
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex = new_lookups
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupCount = len(new_lookups)