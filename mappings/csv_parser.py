import csv
from collections import defaultdict
from utils import get_glyph_name_by_char # 確保能引入
from collections import Counter

def load_mapping(font, csv_file):
    cmap = font.getBestCmap()
    
    # 儲存詞組 (word_mapping 在最後生成，用於去重排序)
    raw_word_entries = [] 
    
    # 單字註音頻率統計：儲存的是單字註音的 (weight) 總和
    char_cnt = defaultdict(lambda: defaultdict(int))
    
    # 詞組出現次數統計
    word_freq = Counter()
    
    # 用於在檔案讀取階段檢查單字的不同註音數量
    char_anno_set = defaultdict(set) 
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                base_chars = row[0]
                anno_str_raw = row[1]
                anno_strs = anno_str_raw.split(' ')
                
                # 詞條權重：從 row[2] 獲取，否則默認為 1
                weight = int(row[2]) if len(row) > 2 and row[2].isdigit() else 1

                # 1. 檢查字體字形是否存在
                if True in [ord(char) not in cmap for char in base_chars]:
                    print(f"Skip {base_chars} as there is char not found in the font (Unicode missing).")
                    continue # 仍然跳過字形缺失的行
                
                if len(base_chars) != len(anno_strs):
                    # 確保字符數量和註音數量匹配
                    continue

                # --- 通過檢查，開始累積數據 ---
                
                # 處理單字和詞組的註音數量限制（這裡只累積數據，不檢查）
                for base_char, anno_str in zip(base_chars, anno_strs):
                    if anno_str != '':
                        char_anno_set[base_char].add(anno_str)

                # 2. 檢查單字/詞組的不同註音數量是否超過限制（10 種）
                # 這裡只進行 "警告/提示"，不跳過該行
                for char in base_chars:
                    # 由於我們還沒累積 char_cnt，這裡檢查的是 char_anno_set 的累積總數
                    if len(char_anno_set[char]) > 10:
                        print(f"WARNING: Char '{char}' (in {base_chars}) now has too many different annotations ({len(char_anno_set[char])} > 10).")
                        # 不執行 continue，讓後續的數據累積繼續進行
                
                # --- 數據累積 ---
                
                if len(base_chars) > 1:
                    # 3. 詞組處理：儲存並統計詞組出現次數
                    raw_word_entries.append((base_chars, anno_strs, weight)) 
                    word_freq[base_chars] += 1 # 統計詞組出現次數

                # 單字和詞頻處理 (將詞條權重計入其所有單字的詞頻)
                for base_char, anno_str in zip(base_chars, anno_strs):
                    if anno_str != '':
                        # char_cnt[base_char][anno_str] 儲存的就是單字出現次數與權重之和
                        char_cnt[base_char][anno_str] += weight
    
    # --- 排序邏輯實現 ---
    
    # 1. 整理 char_mapping (單字常用音排序)
    # 邏輯：單字出現次數與權重之和降序 -> 詞組拼音升序
    char_mapping_raw = {} 
    for char, cnts in char_cnt.items():
        # item[1] 就是「單字出現次數與權重之和」，item[0] 就是「註音」
        sorted_cnts = sorted(cnts.items(), key=lambda item: (-item[1], item[0])) 
        char_mapping_raw[char] = {k: None for k, v in sorted_cnts}
        
    # 2. 整理 word_mapping (詞組上下文排序)
    
    # 邏輯：長度降序 -> 詞組出現次數與權重之和降序 -> 詞組拼音升序
    def word_sort_key(item):
        word, anno_strs, weight = item
        
        # 獲取詞組出現次數
        freq = word_freq[word] 
        # 計算總優先級 (出現次數 + 權重)
        total_priority = freq + weight 
        
        # 排序：長度降序 -> 總優先級降序 -> 拼音升序
        return (-len(word), -total_priority, " ".join(anno_strs))
        
    # 對 raw_word_entries 進行排序
    sorted_word_entries = sorted(raw_word_entries, key=word_sort_key)
    
    # 去重並生成最終 word_mapping
    word_mapping_final = {}
    for word, anno_strs, _ in sorted_word_entries:
        if word not in word_mapping_final:
            word_mapping_final[word] = anno_strs
            
    return (word_mapping_final, char_mapping_raw)