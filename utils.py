import collections
from fontTools.ttLib.tables import otTables

def get_glyph_name_by_char(font, char):
    """
    Finds the glyph name corresponding to a character in the font's CMAP.
    Safely handles both index and name lookup, converting index to name.
    """
    
    # 1. 獲取最佳 CMAP
    cmap = font.getBestCmap()
    char_code = ord(char)
    
    if char_code in cmap:
        glyph_identifier = cmap[char_code]
        
        # 如果返回的是字形名稱 (str)
        if isinstance(glyph_identifier, str):
            return glyph_identifier
            
        # 如果返回的是字形索引 (int)
        elif isinstance(glyph_identifier, int):
            try:
                # 必須使用 font.getGlyphOrder() 進行轉換
                return font.getGlyphOrder()[glyph_identifier]
            except IndexError:
                # 索引超出範圍
                return None
        
    return None # 找不到字符，返回 None

def buildCoverage(glyphs=None):
    """
    Builds a Format 1 Coverage table. 
    Accepts an optional 'glyphs' keyword argument.
    """
    coverage = otTables.Coverage()
    coverage.Format = 1
    # 確保 glyphs 是一個列表，如果未提供則使用空列表
    coverage.glyphs = glyphs if glyphs is not None else []
    return coverage

def buildChainSubRuleSet():
    """Builds a basic ChainSubRuleSet."""
    srs = otTables.ChainSubRuleSet()
    srs.ChainSubRule = []
    srs.ChainSubRuleCount = 0
    return srs

def buildCoverage(glyphs=None):
    """Builds a Format 1 Coverage table."""
    coverage = otTables.Coverage()
    coverage.Format = 1
    coverage.glyphs = glyphs if glyphs is not None else []
    return coverage

def buildDefaultLangSys():
    """Builds a basic DefaultLangSys table."""
    ls = otTables.LangSys()
    ls.LookupOrder = None
    ls.ReqFeatureIndex = 0xFFFF
    ls.FeatureIndex = []
    ls.FeatureCount = 0
    return ls

def chunk(lst, n):
    """Yields successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]