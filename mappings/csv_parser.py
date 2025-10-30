# csv_parser.py: load_mapping 函數的最終更正版 (支援來源追蹤)

import csv
from collections import defaultdict
import re

# 只保留長度 <= 7 的詞組 根據實際情況調整
MAX_base_chars = 7
# 每個單字的最大註音變體數量限制
MAX_CHAR_VARIANTS = 10

# --- 輔助函數：從註音字串中提取聲調 ---
def get_tone(anno_str):
    """
    從註音字串末尾提取數字聲調。
    例如 'bo1' -> 1, 'a6' -> 6。
    如果沒有聲調，則視為輕聲，返回 5。
    """
    match = re.search(r'(\d)$', anno_str)
    if match:
        return int(match.group(1))
    return 5 # 輕聲或無聲調，給予預設值以便排序

def load_mapping(font, csv_file):
    cmap = font.getBestCmap()
    word_mapping = {}
    char_cnt = defaultdict(lambda: defaultdict(int))
    
    # raw_word_entries 用於生成最終的 "詞組" 映射 (word_mapping)
    raw_word_entries = []
    
    # --- [新增] ---
    # all_csv_entries 用於追蹤所有條目(單字+詞組)，以便在丟棄註音時報告來源
    all_csv_entries = []
    
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
                    print(f"Skip {base_chars} as there is char not found in the font")
                    continue
                
                if len(base_chars) == len(anno_strs):
                    
                    # --- [修改] ---
                    # 需求 1：收集所有 CSV 條目 (單字和詞組) 以便後續追蹤來源
                    all_csv_entries.append((base_chars, anno_strs, weight))
                    
                    if len(base_chars) > 1:
                        if len(base_chars) <= MAX_base_chars: # 只保留長度 <= MAX_base_chars 的詞組
                            MIN_WEIGHT = 1  # 可調整權重閾值
                            if weight >= MIN_WEIGHT:
                                # 詞組處理：儲存詞組、拼音列表和權重 (這部分保持不變，用於生成 word_mapping)
                                raw_word_entries.append((base_chars, anno_strs, weight))
                        else:
                            # 新增的列印信息：大於 MAX_base_chars 的詞組跳過
                            print(f"Skip, {len(base_chars)} is too long (>{MAX_base_chars})， word'{base_chars}'。")
                
                    # 單字和字頻處理
                    for base_char, anno_str in zip(base_chars, anno_strs):
                        if anno_str != '':
                            char_cnt[base_char][anno_str] += weight
                            
    # --- char_mapping 的排序與截斷邏輯 ---
    char_mapping_raw = {}
    for char, cnts in char_cnt.items():
        # 排序標準: 權重降序 -> 聲調降序 -> 註音降序
        sorted_cnts = sorted(
            cnts.items(),
            key=lambda item: (item[1], get_tone(item[0]), item[0]),
            reverse=True
        )
        
        # 在排序後，如果變體數量超過限制，則進行截斷並打印信息
        if len(sorted_cnts) > MAX_CHAR_VARIANTS:
            kept_variants = sorted_cnts[:MAX_CHAR_VARIANTS]
            discarded_variants = sorted_cnts[MAX_CHAR_VARIANTS:]
            
            kept_str = [f"{item[0]} (weight:{item[1]})" for item in kept_variants]
            
            # --- [修改] ---
            # 為了找出是哪些詞組 (或單字) 使用了這些被丟棄的發音
            discarded_annos_set = {item[0] for item in discarded_variants} # 取得所有被丟棄的發音 (e.g., {'di2', 'di4'})
            problematic_entries = defaultdict(set) # key: 被丟棄的發音, value: set(包含該發音的詞組或單字)
            
            # 需求 2：遍歷所有 CSV 條目 (all_csv_entries) 來查找來源，而不是只查詞組 (raw_word_entries)
            for word, annos, _ in all_csv_entries: # <--- [核心修改]
                for i, c in enumerate(word):
                    if c == char and annos[i] in discarded_annos_set:
                        # 這個詞 (word) 的第 i 個字 (c) 是當前處理的字 (char)
                        # 且其發音 (annos[i]) 是被丟棄的發音之一
                        problematic_entries[annos[i]].add(word)

            # 構建更詳細的 discarded_str
            discarded_str_detailed = []
            for anno, weight in discarded_variants:
                entry_str = f"{anno} (weight:{weight})"
                if anno in problematic_entries:
                    # 為了避免訊息太長，只顯示幾個例子，最多3個
                    example_words = list(problematic_entries[anno])[:3]
                    examples_str = ", ".join([f"'{w}'" for w in example_words])
                    if len(problematic_entries[anno]) > 3:
                        examples_str += ", ..." # 如果來源詞組太多，用 ... 省略
                    entry_str += f" [found in: {examples_str}]"
                discarded_str_detailed.append(entry_str)
            # --- [修改結束] ---
            
            
            # --- [修改後的 print] ---
            # 使用新構建的 discarded_str_detailed 替換舊的 discarded_str
            print(f"Skip, {len(discarded_variants)} annos of '{char}': {', '.join(discarded_str_detailed)}, too high {len(sorted_cnts)}>{MAX_CHAR_VARIANTS}, Keep {len(kept_variants)} : {', '.join(kept_str)}")
            
            sorted_cnts = kept_variants
        
        char_mapping_raw[char] = {k: None for k, v in sorted_cnts}

    # --- [核心修正] word_mapping 的排序邏輯 ---
    # (這部分不需要修改，它仍然正確地使用 raw_word_entries 來生成 "詞組" 映射)
    
    # 步驟 1. 按第四標準「註音降序」排序
    temp_sorted = sorted(raw_word_entries, key=lambda item: " ".join(item[1]), reverse=True)
    
    # 步驟 2. 按第三標準「聲調升序」排序 (穩定排序)
    temp_sorted = sorted(temp_sorted, key=lambda item: tuple(get_tone(s) for s in item[1]))
    
    # 步驟 3. 按第二標準「權重降序」排序 (穩定排序)
    temp_sorted = sorted(temp_sorted, key=lambda item: item[2], reverse=True)
    
    # 步驟 4. 按第一標準「詞組長度降序」排序 (穩定排序)，得到最終結果
    sorted_word_entries = sorted(temp_sorted, key=lambda item: len(item[0]), reverse=True)
    
    # 由於 Python 3.7+ 的字典會保持插入順序，
    # 這裡生成的 word_mapping_final 將會是已經排序好的。
    word_mapping_final = {}
    for word, anno_strs, _ in sorted_word_entries:
        if word not in word_mapping_final:
            word_mapping_final[word] = anno_strs
    
    return (word_mapping_final, char_mapping_raw)