from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, buildChainSubRuleSet, buildCoverage, chunk, buildDefaultLangSys

# 設定變體上限為 256 (0-255)
MAX_VARIANT_LOOKUPS = 30

# --- 請將這整個函數複製並替換掉你文件中的舊版本 ---
def buildChainSub(output_font, word_mapping, char_mapping):
    gsub = output_font["GSUB"].table
    
    # 1. 準備 Lookup Builders (Type 1)
    singleSubBuilders = []
    for i in range(0, MAX_VARIANT_LOOKUPS):
        singleSubBuilders.append(builder.SingleSubstBuilder(output_font, None))

    # 初始化一個字典，按詞組長度儲存規則集
    chainSets_by_length = {}
    
    def word_sort_key_for_chain_sub(item):
        word, anno_strs = item
        return (-len(word), " ".join(anno_strs))

    # 預排序 word_mapping 的項目
    sorted_words = sorted(word_mapping.items(), key=word_sort_key_for_chain_sub)
    
    # 遍歷排序後的詞組映射
    for word, anno_strs in sorted_words:
        if len(word) <= 1:
            continue
            
        # [MODIFIED] 移除了 needs_chain_sub 邏輯，現在為所有詞組創建規則
        
        lookup_builders = []
        
        for i, char in enumerate(word):
            anno_str = anno_strs[i]
            if char not in char_mapping or anno_str not in char_mapping[char]:
                lookup_builders.append(None)
                continue
            
            # 假設 char_mapping 的結構是 ('glyph_name', variant_index)
            # 如果不是，請根據實際情況調整下面這行
            target_glyph_name, variant = char_mapping[char][anno_str]
            
            # [MODIFIED] 核心修改：不再檢查 variant != 0
            original_glyph_name = get_glyph_name_by_char(output_font, char)
            
            if not isinstance(original_glyph_name, str) or original_glyph_name not in output_font.getGlyphOrder():
                lookup_builders.append(None)
                continue
                
            if variant >= MAX_VARIANT_LOOKUPS:
                print(f"Warning: Variant index {variant} for char '{char}' is too high (> {MAX_VARIANT_LOOKUPS - 1}), skipping.")
                lookup_builders.append(None)
                continue
            
            # [MODIFIED & UNINDENTED] 即使 variant 是 0，也填充替換信息
            # target_glyph_name 是替換字形名稱，之前您的代碼中是 '_'
            singleSubBuilders[variant].mapping[original_glyph_name] = target_glyph_name
            lookup_builders.append(variant)
            
        # [UNINDENTED] 這部分代碼塊現在對所有詞組執行
        initial_glyph = get_glyph_name_by_char(output_font, word[0])
        if initial_glyph is None or not isinstance(initial_glyph, str):
            continue
        
        if len(word) not in chainSets_by_length:
            chainSets_by_length[len(word)] = {}

        current_chainSets = chainSets_by_length[len(word)]

        if initial_glyph not in current_chainSets:
            current_chainSets[initial_glyph] = []
        
        input_glyphs = [get_glyph_name_by_char(output_font, char) for char in word[1:]]
        input_glyphs = [g for g in input_glyphs if isinstance(g, str)]
        
        if len(input_glyphs) != len(word) - 1:
            continue

        current_chainSets[initial_glyph].append({
            "_debug": word + " " + " ".join(anno_strs),
            "input": input_glyphs,
            "variantIndex": lookup_builders
        })
            
    # 建立 Type 1 Lookups 的實際 GSUB 索引映射
    single_sub_lookup_indices = {}
    
    current_lookup_index = len(gsub.LookupList.Lookup)
    
    # [MODIFIED] 循環從 0 開始，以包含 variant 0 (默認發音) 的 lookup
    for i in range(0, MAX_VARIANT_LOOKUPS):
        if len(singleSubBuilders[i].mapping) > 0:
            lookup = singleSubBuilders[i].build()
            lookup.LookupFlag = 1
            
            gsub.LookupList.Lookup.append(lookup)
            single_sub_lookup_indices[i] = current_lookup_index
            current_lookup_index += 1

    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
    
    # 調整 Chain Contextual 規則中的索引
    rule_groups_to_write = []
    
    for length, chainSets in chainSets_by_length.items():
        for initial_glyph, chainSet in chainSets.items():
            for chain in chainSet:
                new_lookup_indices = []
                for variant_index in chain['variantIndex']:
                    if variant_index is not None and variant_index in single_sub_lookup_indices:
                        new_lookup_indices.append(single_sub_lookup_indices[variant_index])
                    else:
                        new_lookup_indices.append(None)
                chain['lookupIndex'] = new_lookup_indices
            
            chainSet.sort(key=lambda chain: (-len(chain['input']), chain['_debug']))


    reverseMap = output_font.getReverseGlyphMap()
    
    sorted_lengths = sorted(chainSets_by_length.keys(), reverse=True)
    
    for length in sorted_lengths:
        chainSets = chainSets_by_length[length]
        sorted_chainSets = list(sorted(chainSets.items(), key=lambda item: reverseMap.get(item[0], 0)))
        rule_groups_to_write.append(sorted_chainSets)
    
    # 插入 Chain Contextual Lookup (Type 6)
    chain_lookup_index = len(gsub.LookupList.Lookup)
    
    insert_chain_context_subst_into_gsub_logic(output_font, rule_groups_to_write, chain_lookup_index)

    # 更新 Features
    calt_lookups = [chain_lookup_index]
    _update_or_create_feature(gsub, 'calt', calt_lookups)
    
    print("Done ChainContextSubst")

# --- 輔助函數 (與最終確認的版本一致) ---

def insert_chain_context_subst_into_gsub_logic(output_font, rule_groups_to_write, chain_lookup_index):
    gsub = output_font["GSUB"].table
    chainSubStLookup = otTables.Lookup()
    chainSubStLookup.LookupType = 6
    chainSubStLookup.LookupFlag = 0
    chainSubStLookup.SubTable = []
    chainSubStLookup.SubTableCount = 0
    
    subtable_index = 0
    
    # 遍歷按長度降序排列的規則組
    for all_chain_sets in rule_groups_to_write:
        if not all_chain_sets:
            continue
            
        # 遍歷 ChainSets 的塊 (每塊最多 50 個字形)
        for chainSets_chunk in chunk(all_chain_sets, 10):
            # 1. 創建新的 Subtable。
            chainSubStLookup.SubTable.append(otTables.ChainContextSubst())
            chainSubStLookup.SubTableCount += 1
            subtable = chainSubStLookup.SubTable[subtable_index]
            subtable_index += 1 

            subtable.Format = 1
            subtable.Coverage = buildCoverage(glyphs=[item[0] for item in chainSets_chunk])
            subtable.ChainSubRuleSet = []
            subtable.ChainSubRuleSetCount = 0
            
            # 2. 遍歷每個起始字形及其規則集
            for initial_glyph, chainSet in chainSets_chunk:
                chainSubRuleSet = buildChainSubRuleSet()
                
                # 3. 遍歷規則並寫入
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
                    
                    # 遍歷需要替換的 Lookup 索引
                    for word_index, lookupIndex in enumerate(chain['lookupIndex']):
                        if lookupIndex is not None:
                            substLookupRecord = otTables.SubstLookupRecord()
                            substLookupRecord.SequenceIndex = word_index
                            substLookupRecord.LookupListIndex = lookupIndex # 這是 Type 1 Lookup 的 GSUB 索引
                            chainSubRule.SubstLookupRecord.append(substLookupRecord)
                            chainSubRule.SubstCount += 1
                            
                    chainSubRuleSet.ChainSubRule.append(chainSubRule)
                    
                # 4. 將規則集添加到 Subtable
                chainSubRuleSet.ChainSubRuleCount = len(chainSubRuleSet.ChainSubRule)
                subtable.ChainSubRuleSet.append(chainSubRuleSet)
                subtable.ChainSubRuleSetCount += 1

    gsub.LookupList.Lookup.append(chainSubStLookup)
    gsub.LookupList.LookupCount += 1

def _update_or_create_feature(gsub, feature_tag, lookup_indices):
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
                    continue 
                    
                if feature_index not in langSys.FeatureIndex:
                    langSys.FeatureIndex.append(feature_index)
                    langSys.FeatureCount += 1

        gsub.FeatureList.FeatureRecord.append(featureRecord)
        gsub.FeatureList.FeatureCount += 1
        
    else:
        # 更新現有 Feature
        for idx in featureIndexes:
            current_lookups = gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex
            new_lookups = lookup_indices + [idx for idx in current_lookups if idx not in lookup_indices]
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex = new_lookups
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupCount = len(new_lookups)
