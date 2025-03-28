from fontTools.ttLib.tables import otTables
from fontTools.ttLib.tables import otTables as ot

def buildCoverage() -> otTables.Coverage:
    self = ot.Coverage()
    self.glyphs = []
    return self

def buildChainSubRuleSet() -> otTables.ChainSubRuleSet:
    self = otTables.ChainSubRuleSet()
    self.ChainSubRule = []
    return self

def get_glyph_name_by_char(font, char):
    cmap = font.getBestCmap()
    # Get the glyph name for the base character
    if ord(char) not in cmap:
        print(f"Skipping '{char}' - not found in base font")
        return None
    return cmap[ord(char)]

def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]