# csv_parser.py: load_mapping 函數的最終版本 (無限制)

import csv
from collections import defaultdict 

def load_mapping(font, csv_file):
    cmap = font.getBestCmap()
    word_mapping = {}
    char_cnt = defaultdict(lambda: defaultdict(int))
    raw_word_entries = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                base_chars = row[0]
                anno_str_raw = row[1]
                anno_strs = anno_str_raw.split(' ')
                # 詞條權重：如果第三欄是數字則取其值，否則默認為 1
                weight = int(row[2]) if len(row) > 2 and row[2].isdigit() else 1 

                if True in [ord(char) not in cmap for char in base_chars]:
                    # print(f"Skip {base_chars} as there is char not found in the font")
                    continue
                
                if len(base_chars) == len(anno_strs):
                    if len(base_chars) > 1:
                        # 詞組處理：儲存詞組、拼音列表和權重
                        raw_word_entries.append((base_chars, anno_strs, weight))
                    
                    # 單字和詞頻處理
                    for base_char, anno_str in zip(base_chars, anno_strs):
                        if anno_str != '':
                            char_cnt[base_char][anno_str] += weight 
                            
                            # 由於我們不再限制變體數量，這個檢查可以保持原樣或移除
                            if len(char_cnt[base_char]) > 20: 
                                pass 
    
    # --- 排序邏輯實現 ---
    
    # 1. 整理 char_mapping (單字常用音排序)
    char_mapping_raw = {} 
    for char, cnts in char_cnt.items():
        # 排序：按權重/詞頻降序 -> 按拼音升序 (確保常用音排在 i=0)
        sorted_cnts = sorted(cnts.items(), key=lambda item: (-item[1], item[0])) 
        
        # *** 關鍵變更：移除切片操作，保留所有變體 ***
        # sorted_cnts = sorted_cnts[:10] <--- 移除此行
        
        char_mapping_raw[char] = {k: None for k, v in sorted_cnts}
        
    # 2. 整理 word_mapping (詞組上下文排序)
    def word_sort_key(item):
        word, anno_strs, weight = item
        return (-len(word), -weight, " ".join(anno_strs))
        
    sorted_word_entries = sorted(raw_word_entries, key=word_sort_key)
    
    word_mapping_final = {}
    for word, anno_strs, _ in sorted_word_entries:
        if word not in word_mapping_final:
            word_mapping_final[word] = anno_strs
    
    return (word_mapping_final, char_mapping_raw)
