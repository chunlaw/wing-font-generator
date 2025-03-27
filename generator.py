from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib.tables import otTables
from fontTools.otlLib import builder
from fontTools.ttLib.tables import otTables as ot
import csv
import sys

GLYPH_PREFIX = "wingfont"

def buildCoverage() -> otTables.Coverage:
    self = ot.Coverage()
    self.glyphs = []
    return self

def buildChainSubRuleSet() -> otTables.ChainSubRuleSet:
    self = otTables.ChainSubRuleSet()
    self.ChainSubRule = []
    return self

def load_mapping(csv_file):
    """Read the CSV file and return a dictionary mapping base characters to anno strings."""
    word_mapping = {} # {"畫畫": ["waa6", "waa2"]}
    char_mapping = {} # {"一": {"jat1": None | (glyph_name, idx)}} <-- idx is used to ligature the anno_str
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) == 2:
                base_chars, anno_strs = (row[0], row[1].split(' '))
                if len(base_chars) == len(anno_strs):
                    if len(base_chars) > 1 and base_chars not in word_mapping:
                        word_mapping[base_chars] = anno_strs
                    for base_char, anno_str in zip(base_chars, anno_strs):
                        if anno_str != '':
                            if base_char not in char_mapping:
                                char_mapping[base_char] = {}
                            char_mapping[base_char][anno_str] = None
                            if len(char_mapping[base_char]) > 10:
                                print("Potential missed annotation in typing for '"+base_char+"' ("+anno_str+")")
    
    return (word_mapping, char_mapping)

def get_glyph_name_by_char(font, char):
    cmap = font.getBestCmap()
    # Get the glyph name for the base character
    if ord(char) not in cmap:
        print(f"Skipping '{char}' - not found in base font")
        raise "char not found"
    return cmap[ord(char)]

# assume base_font and output_font are from the same source
def generate_glyphs(base_font, anno_font, output_font, mapping):
    output_glyph_name_used = {}
    """Create a new TTF file with combined glyphs."""
    base_glyph_set = base_font.getGlyphSet()
    anno_glyph_set = anno_font.getGlyphSet()
    output_glyph_set = output_font.getGlyphSet()

    # Get font metrics
    units_per_em = base_font['head'].unitsPerEm
    y_offset = round(units_per_em * 0.8)
    anno_scale = 0.12
    base_scale = 0.75

    # resize each glyph for supporting anno_str
    cnt = 0
    for base_char, anno_strs_dict in mapping.items():
        for i, anno_str in enumerate(anno_strs_dict.keys()):
            glyph_name = get_glyph_name_by_char(base_font, base_char)
            pen = TTGlyphPen(output_glyph_set)
            # Draw the base glyph at the bottom (original position)
            if glyph_name in base_glyph_set:
                base_glyph_set[glyph_name].draw(TransformPen(pen, (base_scale, 0, 0, base_scale, 0, 0)))
            else:
                print(f"Glyph '{glyph_name}' not found in base font")
                continue
            
            # create glyph for the anno_str
            anno_len = 0
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                anno_len += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
            x_position = ( base_font['hmtx'][glyph_name][0] * base_scale - anno_len ) / 2
            
            # Draw each anno string glyph
            for char in anno_str:
                anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                if anno_glyph_name in anno_glyph_set:
                    # Transform pen to position anno glyph
                    transform = (anno_scale, 0, 0, anno_scale, x_position, y_offset)  # Move up by y_offset
                    tpen = TransformPen(pen, transform)
                    anno_glyph_set[anno_glyph_name].draw(tpen)
                    # Increment x_position by the advance width
                    x_position += round(anno_font['hmtx'][anno_glyph_name][0] * anno_scale)
                else:
                    print(f"Glyph '{anno_glyph_name}' not found in anno font")

            # add to output_font
            new_glyph_name = glyph_name if glyph_name not in output_glyph_name_used else GLYPH_PREFIX+str(cnt).zfill(6) 
            cnt += 1

            if 'vmtx' in output_font.keys():
                output_font['vmtx'][new_glyph_name] = base_font['vmtx'][glyph_name]
            if 'hmtx' in output_font:
                output_font['hmtx'][new_glyph_name] = (
                    base_font['hmtx'][glyph_name][0],
                    base_font['hmtx'][glyph_name][1] + base_font['hmtx'][glyph_name][0] * ( 1 - base_scale ) / 2
                )
            
            output_font['glyf'][new_glyph_name] = pen.glyph()
            output_glyph_name_used[new_glyph_name] = True
            mapping[base_char][anno_str] = (new_glyph_name, i)

def buildChainSub(output_font, word_mapping, char_mapping):
    # 1. Preparation: setup all single substitution table
    gsub = output_font["GSUB"].table
    singleSubBuilders: list[builder.SingleSubstBuilder] = []
    
    # assume each singleSubBuilders will be inserted right after the currect lookup list
    for i in range(0,10):
        singleSubBuilders.append(builder.SingleSubstBuilder(output_font, None))

    # identify all chains substitution and build all single substitution
    chains = []
    for word, anno_strs in word_mapping.items():
        isSpecialIdx = []
        # check if it match the original annotation
        for i, char in enumerate(word):
            glyph_name, variant = char_mapping[char][anno_strs[i]]
            if variant != 0:
                isSpecialIdx.append(i)
                # add into substitution
                singleSubBuilders[variant].mapping[get_glyph_name_by_char(output_font, char)] = glyph_name
        if len(isSpecialIdx) > 0:
            chains.append({
                "coverageGlyph": get_glyph_name_by_char(output_font, word[0]),
                "input": [get_glyph_name_by_char(output_font, char) for char in word[1:]],
                "lookupOffset": [
                    char_mapping[char][anno_str][1] for anno_str in anno_strs
                ] # indexes of using which subst per character, note that 0 denote None
            })
    
    base_lookup_index = len(gsub.LookupList.Lookup)
    for i in range(1, 10):
        gsub.LookupList.Lookup.append(singleSubBuilders[i].build())
    
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
    chainSubStLookup.SubTable = [otTables.ChainContextSubst()]
    chainSubStLookup.SubTable[0].Format = 1
    # programming hack to construct the Coverage type
    chainSubStLookup.SubTable[0].Coverage = buildCoverage()
    chainSubStLookup.SubTable[0].ChainSubRuleSet = []
    for chain in chains:
        chainSubStLookup.SubTable[0].Coverage.glyphs.append(chain['coverageGlyph'])
        chainSubRuleSet = buildChainSubRuleSet()
        chainSubRule = otTables.ChainSubRule()
        chainSubRule.Backtrack = []
        chainSubRule.Input = chain['input']
        chainSubRule.LookAhead = []
        chainSubRule.SubstLookupRecord = []
        for seqenceIndex, lookupOffset in enumerate(chain['lookupOffset']):
            if lookupOffset != 0:
                substLookupRecord= otTables.SubstLookupRecord()
                substLookupRecord.SequenceIndex = seqenceIndex
                substLookupRecord.LookupListIndex = lookupOffset + base_lookup_index - 1
                chainSubRule.SubstLookupRecord.append(substLookupRecord)
        chainSubRuleSet.ChainSubRule.append(chainSubRule)
        chainSubStLookup.SubTable[0].ChainSubRuleSet.append(chainSubRuleSet)
    
    # assign the ChainContextualSubst to all related features and their scripts
    caltFeatureIndexes = [i for i, featureRecord in enumerate(gsub.FeatureList.FeatureRecord) if featureRecord.FeatureTag == 'calt']
    if len(caltFeatureIndexes) == 0:
        featureRecord = otTables.FeatureRecord()
        featureRecord.Feature = otTables.Feature()
        featureRecord.FeatureTag = 'calt'
        featureRecord.Feature.LookupListIndex = [len(gsub.LookupList.Lookup)]
        for scriptRecord in gsub.ScriptList.ScriptRecord:
            scriptRecord.Script.DefaultLangSys.FeatureIndex.append(len(gsub.FeatureList.FeatureRecord))
        gsub.FeatureList.FeatureRecord.append(featureRecord)
    else:
        for idx in caltFeatureIndexes:
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex.append(len(gsub.LookupList.Lookup))
    
    # insert the lookup into the font
    gsub.LookupList.Lookup.append(chainSubStLookup)

# Expected format for mapping
# {"一": {"jat1": None | (glyph_name, idx)}} <-- idx is used to ligature the anno_str
def setLiga(output_font, char_mapping):
    gsub = output_font["GSUB"].table

    # create the set ofligatures
    ligaBuilder = builder.LigatureSubstBuilder(output_font, None)
    for anno_strs_dict in char_mapping.values():
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
        for scriptRecord in gsub.ScriptList.ScriptRecord:
            scriptRecord.Script.DefaultLangSys.FeatureIndex.append(len(gsub.FeatureList.FeatureRecord))
        gsub.FeatureList.FeatureRecord.append(featureRecord)
    else:
        for idx in ligaFeatureIndexes:
            gsub.FeatureList.FeatureRecord[idx].Feature.LookupListIndex.append(len(gsub.LookupList.Lookup))
    
    # insert the lookup into the font
    gsub.LookupList.Lookup.append(ligaBuilder.build())
    

def main():
    # Input files (replace with your actual file paths)
    base_font_file = sys.argv[1]
    anno_font_file = sys.argv[2]
    csv_file = sys.argv[3]
    output_prefix = sys.argv[4]

    # Load the fonts and mapping
    base_font = TTFont(base_font_file)
    anno_font = TTFont(anno_font_file)
    output_font = TTFont(base_font_file)
    word_mapping, char_mapping = load_mapping(csv_file)

    # Combine the glyphs and save the new font
    generate_glyphs(base_font, anno_font, output_font, char_mapping)

    # Build Chain Contextual Substitution
    buildChainSub(output_font, word_mapping, char_mapping)
    
    # Replace glyph by new glyph using liga
    setLiga(output_font, char_mapping)

    # Save the new font
    output_font.save(str(output_prefix)+".ttf")
    print(f"New font saved as {output_prefix}.ttf")
    output_font.flavor = 'woff'
    output_font.save(str(output_prefix+".woff"))
    print(f"New font saved as {output_prefix}.woff")
    
    # Close the font objects
    base_font.close()
    anno_font.close()
    output_font.close()

if __name__ == "__main__":
    main()