import csv
from collections import defaultdict
# 假設 utils.py 和 get_glyph_name_by_char 已經存在並可以正常引入
# from utils import get_glyph_name_by_char 

# 設置警告限制
WORD_ANNO_LIMIT = 3
CHAR_ANNO_LIMIT = 10

def load_mapping(font, csv_file):
    # 假設 font 是一個 FontForge 或類似的字體對象，並提供 getBestCmap() 方法
    cmap = font.getBestCmap()
    
    # --- 階段一：預處理 - 建立已知詞條集合和查找表 ---
    
    known_entries = set() 
    anno_lookup = {} 

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                base_chars = row[0]
                anno_str_raw = row[1]
                anno_strs = anno_str_raw.split(' ') 
                
                if len(base_chars) == len(anno_strs):
                    known_entries.add(base_chars)
                    anno_lookup[base_chars] = (anno_strs, len(base_chars))

    # --- 階段二：正式處理與計數 ---

    char_cnt = defaultdict(lambda: defaultdict(int))
    word_anno_cnt = defaultdict(lambda: defaultdict(int))
    
    # 追蹤註音種類數量
    char_anno_set = defaultdict(set)
    word_anno_set = defaultdict(set)
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                base_chars = row[0]
                anno_str_raw = row[1] 
                anno_strs = anno_str_raw.split(' ') 
                
                weight = int(row[2]) if len(row) > 2 and row[2].isdigit() else 1

                if len(base_chars) != len(anno_strs):
                    continue
                    
                # 1. 檢查字體字形是否存在 (如果缺失，則跳過該行)
                if True in [ord(char) not in cmap for char in base_chars]:
                    print(f"Skip {base_chars} as there is char not found in the font (Unicode missing).")
                    continue 

                # --- 權重計算 ---
                effective_char_weight = weight
                if len(base_chars) > 1:
                    effective_char_weight = 1
                
                # --- 處理註音種類的累積 (用於種類限制檢查) ---
                
                # 累積單字種類
                for base_char, anno_str in zip(base_chars, anno_strs):
                    if anno_str != '':
                        char_anno_set[base_char].add(anno_str)

                # 累積獨立詞組種類
                if len(base_chars) > 1:
                    word_anno_set[base_chars].add(anno_str_raw)

                # --- 檢查與警告 ---
                
                # 檢查單字的不同註音種類數量是否超過限制（> 10）
                for char in base_chars:
                    if len(char_anno_set[char]) > CHAR_ANNO_LIMIT:
                        anno_list = sorted(list(char_anno_set[char]))
                        print(f"WARNING: Char '{char}' (in {base_chars}) has too many DIFFERENT annotations ({len(anno_list)} > {CHAR_ANNO_LIMIT}). All annotations: {anno_list}")
                
                # 檢查獨立詞組的不同註音種類數量是否超過限制（> 3）
                # 注意：這裡檢查的 word_anno_set[base_chars] 目前只包含了自身的註音，
                # 但下一段的內嵌邏輯會確保這個集合最終包含所有來源的註音。
                if len(base_chars) > 1 and len(word_anno_set[base_chars]) > WORD_ANNO_LIMIT:
                     anno_list = sorted(list(word_anno_set[base_chars]))
                     print(f"WARNING: Word '{base_chars}' has too many DIFFERENT word annotations ({len(anno_list)} > {WORD_ANNO_LIMIT}). All annotations: {anno_list}")

                # --- 數據累積 ---
                
                # 詞組註音頻率累積 - 1：累積當前行作為獨立詞條 (使用完整的行權重 `weight`)
                if len(base_chars) > 1:
                    word_anno_cnt[base_chars][anno_str_raw] += weight 
                
                    # 詞組註音頻率累積 - 2：累積內嵌短詞組（權重固定為 1）
                    max_len = len(base_chars) 
                    for start in range(max_len):
                        for length in range(2, max_len - start + 1): 
                            sub_word = base_chars[start:start + length]
                            
                            if sub_word in known_entries and sub_word != base_chars:
                                sub_anno_strs = anno_strs[start:start + length]
                                sub_anno_raw = " ".join(sub_anno_strs)
                                
                                # **關鍵修正：將內嵌詞組的註音種類也加入 word_anno_set**
                                word_anno_set[sub_word].add(sub_anno_raw)
                                
                                # **刪除內嵌詞組的獨立警告檢查**
                                
                                # 內嵌詞組的權重固定為 1
                                word_anno_cnt[sub_word][sub_anno_raw] += 1 

                # 單字註音頻率累積 (使用調整後的權重 `effective_char_weight`)
                for base_char, anno_str in zip(base_chars, anno_strs):
                    if anno_str != '':
                        char_cnt[base_char][anno_str] += effective_char_weight
    
    # --- 排序邏輯實現 (不變) ---
    
    # 1. 整理 char_mapping (單字常用音排序)
    char_mapping = {} 
    for char, cnts in char_cnt.items():
        sorted_cnts = sorted(cnts.items(), key=lambda item: (-item[1], item[0])) 
        char_mapping[char] = {k: None for k, v in sorted_cnts}
        
    # 2. 整理 word_mapping (詞組上下文排序)
    raw_word_entries = [] 
    for word, anno_cnts in word_anno_cnt.items():
        for anno_str_key, total_priority in anno_cnts.items():
            raw_word_entries.append((word, anno_str_key.split(' '), total_priority))
            
    def word_sort_key(item):
        word, anno_strs, total_priority = item
        return (-len(word), -total_priority, " ".join(anno_strs))
        
    sorted_word_entries = sorted(raw_word_entries, key=word_sort_key)
    
    # 去重並生成最終 word_mapping
    word_mapping_final = {}
    for word, anno_strs, _ in sorted_word_entries:
        if word not in word_mapping_final:
            word_mapping_final[word] = anno_strs
            
    return (word_mapping_final, char_mapping)
