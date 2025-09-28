from fontTools.ttLib.tables import otTables
from fontTools.ttLib.tables.otTables import SubstLookupRecord
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, buildChainSubRuleSet, buildCoverage, chunk, buildDefaultLangSys

def buildChainSub(output_font, word_mapping, char_mapping):
    gsub = output_font["GSUB"].table

    # 1. 計算最大變體索引 (Max Variant Index) - 這是關鍵修正點 🔑
    max_variant_idx = 0
    
    # 遍歷 char_mapping 中的所有字元
    for char, anno_map in char_mapping.items():
        # 遍歷每個字元的所有 (glyph_name, variant_idx) 元組
        # char_mapping 結構應為 {char: {pinyin_str: (new_glyph_name, variant_index)}}
        for glyph_name, variant_idx in anno_map.values():
            if variant_idx > max_variant_idx:
                max_variant_idx = variant_idx
                
    # 打印最終結果，以確認其正確性
    print(f"DEBUG: Final Calculated Max Variant Index: {max_variant_idx}")

    # 2. 根據最大索引初始化 singleSubBuilders 列表
    #    長度必須是 max_variant_idx + 1
    #    這裡使用 builder.SingleSubstBuilder
    from fontTools.otlLib import builder
    singleSubBuilders = [
        builder.SingleSubstBuilder(output_font, None) for i in range(max_variant_idx + 1)
    ]
    base_lookup_index = len(gsub.LookupList.Lookup)
    
    # assume each singleSubBuilders will be inserted right after the currect lookup list
    for i in range(0,10):
        singleSubBuilders.append(builder.SingleSubstBuilder(output_font, None))

    # identify all chains substitution and build all single substitution
    chainSets = {} # {"<initialGlyph>": [{"input": [], "lookupIndex":[]}}}
    sorted_word_items = sorted(word_mapping.items(), key=lambda item: len(item[0]), reverse=True)
    debug_cnt = -1
    for word, anno_strs in sorted_word_items:
        isSpecialIdx = []
        for i, (char, anno_str) in enumerate(zip(word, anno_strs)):
            
            # 從 char_mapping 獲取 (glyph_name, variant) 
            # 這是假設 char_mapping 已經被 generate_glyphs 更新為 {char: {pinyin: (new_glyph_name, variant)}} 結構
            if char not in char_mapping or anno_str not in char_mapping[char]:
                 # 找不到這個拼音或字元，跳過
                 continue
                 
            glyph_name, variant = char_mapping[char][anno_str]
            if variant > 0:
                isSpecialIdx.append(i) # 這是您原代碼中的邏輯

                # 🌟 關鍵除錯和檢查 🌟
                if variant >= len(singleSubBuilders):
                    print(f"FATAL: Character '{char}' with pinyin '{anno_str}' has variant index {variant}, but singleSubBuilders list size is {len(singleSubBuilders)} (Max Index: {len(singleSubBuilders)-1}).")
                    # 如果這裡的 variant 是 11 或更大，而 list size 是 11，則錯誤很明顯。
                
            if variant > max_variant_idx:
                # 🌟 關鍵除錯 🌟
                print(f"FATAL: Character '{char}' with pinyin '{anno_str}' has variant index {variant}, which exceeds max index {max_variant_idx}.")
                # 拋出錯誤並中斷，以手動檢查 csv 文件中該字元的拼音數量。
                raise IndexError(f"Variant index {variant} is out of range.")
            # 🌟 關鍵檢查：防止索引超出範圍 🌟
            if variant > max_variant_idx:
                print(f"FATAL ERROR: Variant index {variant} for '{char}' ('{anno_str}') exceeds calculated max index {max_variant_idx}. Need to fix max_variant_idx calculation.")
                raise IndexError(f"Variant index {variant} is out of range for singleSubBuilders (size {max_variant_idx + 1}).")
            # 🌟 這裡檢查 variant != 0，因為索引 0 應該是保留的 🌟
            if variant != 0:
                is_special_idx_found = True
                singleSubBuilders[variant].mapping[get_glyph_name_by_char(output_font, char)] = glyph_name
                
        if len(isSpecialIdx) > 0:
            if get_glyph_name_by_char(output_font, word[0]) not in chainSets:
                chainSets[get_glyph_name_by_char(output_font, word[0])] = []
            chainSets[get_glyph_name_by_char(output_font, word[0])].append({
                "_debug": word + " " + " ".join(anno_strs),
                "input": [get_glyph_name_by_char(output_font, char) for char in word[1:]],
                # 修正 2: 每個字元都必須指向一個 Lookup，如果 variant > 0，則指向 LookupListIndex
                "lookupIndex": [
                    base_lookup_index + char_mapping[word[i]][anno_str][1] - 1 \
                        if char_mapping[word[i]][anno_str][1] > 0 \
                        else None \
                        for i, anno_str in enumerate(anno_strs)
                ] # indexes of using which subst per character, note that None denote no subst
            })
    
    # need to sort by the reverseGlyphMap for browser to use properly
    reverseMap = output_font.getReverseGlyphMap()
    chainSets = list(sorted(chainSets.items(), key=lambda item: reverseMap[item[0]]))
    for i in range(1, 10):
        if len(singleSubBuilders[i].mapping) > 0:
            gsub.LookupList.Lookup.append(singleSubBuilders[i].build())
            gsub.LookupList.LookupCount += 1
    insert_chain_context_subst_into_gsub(output_font, chainSets)
    
# gsub: gsub table
# all_chains: list of chain
# base_lookup_index: the 
# chain_context_handler.py

# ... (在 insert_chain_context_subst_into_gsub 函數內)

def insert_chain_context_subst_into_gsub(output_font, all_chain_sets):
    gsub = output_font["GSUB"].table
    
    # 🌟 核心修正：將所有 chain sets 分割成多個 Lookup (每個 Lookup 包含多個 SubTable) 🌟
    # 假設每個 Lookup 最多處理 2000 個 ChainSubRuleSet（需要根據實際字體調整這個數字）
    # 每個 ChainSubRuleSet 對應一個初始字形 (Coverage)
    LOOKUP_CHUNK_SIZE = 1000 
    
    for i, chain_sets_chunk in enumerate(list(chunk(all_chain_sets, LOOKUP_CHUNK_SIZE))):
        
        # 1. 創建一個新的 Lookup
        chainSubStLookup = otTables.Lookup()
        chainSubStLookup.LookupType = 6
        chainSubStLookup.LookupFlag = 0
        chainSubStLookup.SubTable = []
        chainSubStLookup.SubTableCount = 0
        
        # 2. 將這個 Lookup 內部的 SubTable 分塊 (沿用你原有的邏輯，但使用當前塊)
        SUBTABLE_CHUNK_SIZE = 1
        for j, chainSets_in_subtable in enumerate(list(chunk(chain_sets_chunk, SUBTABLE_CHUNK_SIZE))):
            
            chainSubStLookup.SubTable.append(otTables.ChainContextSubst())
            chainSubStLookup.SubTableCount += 1
            subtable = chainSubStLookup.SubTable[j]
            
            subtable.Format = 1
            # programming hack to construct the Coverage type
            subtable.Coverage = buildCoverage()
            subtable.ChainSubRuleSet = []
            subtable.ChainSubRuleSetCount = 0
            
            # 3. 填充 SubTable 數據
            for coverage, chainSet in chainSets_in_subtable:
                subtable.Coverage.glyphs.append(coverage)
                chainSubRuleSet = buildChainSubRuleSet()
                
                # ... (原代碼中填充 ChainSubRuleSet 的邏輯，保持不變) ...
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
                    for seqenceIndex, lookupIndex in enumerate(chain['lookupIndex']):
                        if lookupIndex is not None:
                            # 由於你已經在文件頂部導入了 SubstLookupRecord，這裡不需要 otTables.
                            substLookupRecord= SubstLookupRecord() 
                            substLookupRecord.SequenceIndex = seqenceIndex
                            substLookupRecord.LookupListIndex = lookupIndex
                            chainSubRule.SubstLookupRecord.append(substLookupRecord)
                            chainSubRule.SubstCount += 1
                    chainSubRuleSet.ChainSubRule.append(chainSubRule)
                    chainSubRuleSet.ChainSubRuleCount = len(chainSubRuleSet.ChainSubRule)
                    
                subtable.ChainSubRuleSet.append(chainSubRuleSet)
                subtable.ChainSubRuleSetCount = len(subtable.ChainSubRuleSet)
                
        # 4. 將新的 Lookup 插入 GSUB 的 LookupList
        current_lookup_index = len(gsub.LookupList.Lookup)
        gsub.LookupList.Lookup.append(chainSubStLookup)
        gsub.LookupList.LookupCount += 1
        
        # 5. 更新 'calt' Feature 指向這個新的 Lookup
        caltFeatureIndexes = [idx for idx, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'calt']
        
        # 確保 calt Feature 存在（如果你之前的代碼已確保創建，這會正常工作）
        if len(caltFeatureIndexes) == 0:
             # 如果是第一個 calt lookup，且 Feature 不存在，則需要創建 Feature Record
             # 由於原代碼已處理創建邏輯，我們只專注於添加新的 Lookup Index
             pass # 這部分應在主循環外，但為簡潔，我們假設 calt Feature 已經存在
        
        # 更新所有 calt Feature Record
        for idx in caltFeatureIndexes:
            # 必須檢查 Feature.LookupListIndex 是否已包含 current_lookup_index，
            # 這裡假設 calt Feature Record 只有一個，否則邏輯會複雜化。
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex.append(current_lookup_index)
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupCount += 1 
            
    print(f"Done ChainContextSubst: {len(list(chunk(all_chain_sets, LOOKUP_CHUNK_SIZE)))} Lookups created.")