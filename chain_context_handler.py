from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, buildChainSubRuleSet, buildCoverage, chunk, buildDefaultLangSys

def buildChainSub(output_font, word_mapping, char_mapping):
    # 1. Preparation: setup all single substitution table
    gsub = output_font["GSUB"].table
    singleSubBuilders: list[builder.SingleSubstBuilder] = []
    base_lookup_index = len(gsub.LookupList.Lookup)
    
    # assume each singleSubBuilders will be inserted right after the currect lookup list
    for i in range(0,10):
        singleSubBuilders.append(builder.SingleSubstBuilder(output_font, None))

    # identify all chains substitution and build all single substitution
    chainSets = {} # {"<initialGlyph>": [{"input": [], "lookupIndex":[]}}}
    debug_cnt = -1
    for word, anno_strs in word_mapping.items():
        isSpecialIdx = []
        if len(chainSets) == debug_cnt:
            break
        # check if it match the original annotation
        for i, char in enumerate(word):
            glyph_name, variant = char_mapping[char][anno_strs[i]]
            if variant != 0:
                isSpecialIdx.append(i)
                # add into substitution
                singleSubBuilders[variant].mapping[get_glyph_name_by_char(output_font, char)] = glyph_name
        if len(isSpecialIdx) > 0:
            if get_glyph_name_by_char(output_font, word[0]) not in chainSets:
                chainSets[get_glyph_name_by_char(output_font, word[0])] = []
            chainSets[get_glyph_name_by_char(output_font, word[0])].append({
                "_debug": word + " " + " ".join(anno_strs),
                "input": [get_glyph_name_by_char(output_font, char) for char in word[1:]],
                "lookupIndex": [
                    base_lookup_index + char_mapping[word[i]][anno_str][1] - 1 \
                        if char_mapping[word[i]][anno_str][1] != 0 \
                        else None \
                        for i, anno_str in enumerate(anno_strs)
                ] # indexes of using which subst per character, note that 0 denote None
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
def insert_chain_context_subst_into_gsub(output_font, all_chain_sets):
    gsub = output_font["GSUB"].table
    # Example ChainContextSubStLookup record, such that it replace 
    #   Rule 1. 'axyzb' -> 'aXyZb'; and
    #   Rule 2. 'azyxb' -> 'aZyXb';
    # otTables.ChainContextSubStLookup {
    #     LookupType: 6,
    #     SubTable: [
    #         {
    #             Format: 1,
    #             Coverage: {
    #                 glyphs: ['x', 'z']
    #             }
    #             ChainSubRuleSet: [
    #                 {
    #                     # each set is for the same glyph
    #                     ChainSubRule: [
    #                         Backtrack: ['a'],
    #                         Input: ['y', 'z'],
    #                         LookAhead: ['b'],
    #                         SubstLookupRecord: [
    #                             {
    #                                 SequenceIndex: 0,
    #                                 LookupListIndex: 81 // x -> X
    #                             },
    #                             {
    #                                 SequenceIndex: 2,
    #                                 LookupListIndex: 82 // z -> Z
    #                             }
    #                         ]
    #                     ]
    #                 },
    #                 {
    #                     ChainSubRule: [
    #                         Backtrack: ['a'],
    #                         Input: ['y', 'x'],
    #                         LookAhead: ['b'],
    #                         SubstLookupRecord: [
    #                             {
    #                                 SequenceIndex: 0,
    #                                 LookupListIndex: 82 // z -> Z
    #                             },
    #                             {
    #                                 SequenceIndex: 2,
    #                                 LookupListIndex: 81 // x -> X
    #                             }
    #                         ]
    #                     ]
    #                 }
    #             ]
    #         }
    #     ],
    # }
    # add the Subst in a low-level way
    chainSubStLookup = otTables.Lookup()
    chainSubStLookup.LookupType = 6
    chainSubStLookup.LookupFlag = 0
    chainSubStLookup.SubTable = []
    chainSubStLookup.SubTableCount = 0
    for i, chainSets in enumerate(list(chunk(all_chain_sets, 50))):
        chainSubStLookup.SubTable.append(otTables.ChainContextSubst())
        chainSubStLookup.SubTableCount += 1
        chainSubStLookup.SubTable[i].Format = 1
        # programming hack to construct the Coverage type
        chainSubStLookup.SubTable[i].Coverage = buildCoverage()
        chainSubStLookup.SubTable[i].ChainSubRuleSet = []
        chainSubStLookup.SubTable[i].ChainSubRuleSetCount = 0
        for coverage, chainSet in chainSets:
            chainSubStLookup.SubTable[i].Coverage.glyphs.append(coverage)
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
                for seqenceIndex, lookupIndex in enumerate(chain['lookupIndex']):
                    if lookupIndex is not None:
                        substLookupRecord= otTables.SubstLookupRecord()
                        substLookupRecord.SequenceIndex = seqenceIndex
                        substLookupRecord.LookupListIndex = lookupIndex
                        chainSubRule.SubstLookupRecord.append(substLookupRecord)
                        chainSubRule.SubstCount += 1
                chainSubRuleSet.ChainSubRule.append(chainSubRule)
                chainSubRuleSet.ChainSubRuleCount = len(chainSubRuleSet.ChainSubRule)
            chainSubStLookup.SubTable[i].ChainSubRuleSet.append(chainSubRuleSet)
            chainSubStLookup.SubTable[i].ChainSubRuleSetCount = len(chainSubStLookup.SubTable[i].ChainSubRuleSet)
        
    # assign the ChainContextualSubst to all related features and their scripts
    caltFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'calt']
    if len(caltFeatureIndexes) == 0:
        featureRecord = otTables.FeatureRecord()
        featureRecord.Feature = otTables.Feature()
        featureRecord.FeatureTag = 'calt'
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
        for idx in caltFeatureIndexes:
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex.append(len(gsub.LookupList.Lookup))
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupCount += 1 
    
    # insert the lookup into the font
    gsub.LookupList.Lookup.append(chainSubStLookup)
    gsub.LookupList.LookupCount += 1
    print("Done ChainContextSubst")