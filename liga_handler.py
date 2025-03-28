from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from utils import get_glyph_name_by_char, chunk

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
                    if glyph_name == _glyph_name:
                        continue
                    # hindered by the cross-script handling in opentype parser, ligature cannot mix Chinese character with a series of latin characters
                    # use number instead...
                    ligaBuilder.ligatures[(
                        glyph_name,
                        get_glyph_name_by_char(output_font, str(_idx))
                    )] = _glyph_name
        
        # assign the ligature to all related features and their scripts
        ligaFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'liga']
        if len(ligaFeatureIndexes) == 0:
            featureRecord = otTables.FeatureRecord()
            featureRecord.Feature = otTables.Feature()
            featureRecord.FeatureTag = 'liga'
            featureRecord.Feature.LookupListIndex = [len(gsub.LookupList.Lookup)]
            featureRecord.Feature.LookupCount = 1
            for scriptRecord in gsub.ScriptList.ScriptRecord:
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