import csv
from functools import reduce

def load_mapping(font, csv_file):
    cmap = font.getBestCmap()

    """Read the CSV file and return a dictionary mapping base characters to anno strings."""
    word_mapping = {} # {"畫畫": ["waa6", "waa2"]}
    char_cnt = {} # {"一": {"jat1": None | (glyph_name, idx)}} <-- idx is used to ligature the anno_str
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) == 2:
                base_chars, anno_strs = (row[0], row[1].split(' '))
                if True in [ord(char) not in cmap for char in base_chars]:
                    print(f"Skip {base_chars} as there is char not found in the font")
                    continue
                if len(base_chars) == len(anno_strs):
                    if len(base_chars) > 1 and base_chars not in word_mapping:
                        word_mapping[base_chars] = anno_strs
                    for base_char, anno_str in zip(base_chars, anno_strs):
                        if anno_str != '':
                            if base_char not in char_cnt:
                                char_cnt[base_char] = {}
                            if anno_str not in char_cnt[base_char]:
                                char_cnt[base_char][anno_str] = 0
                            char_cnt[base_char][anno_str] += 1
                            if len(char_cnt[base_char]) > 10:
                                print("Potential missed annotation in typing for '"+base_char+"' ("+anno_str+")")
    
    # char_mapping: {"一": {"jat1": None | (glyph_name, idx)}} <-- idx is used to ligature the anno_str
    char_mapping = {char: {k: None for k, v in sorted(cnts.items(), key=lambda v: v[1], reverse=True)} for char, cnts in char_cnt.items()}
    return (word_mapping, char_mapping)

if __name__ == "__main__":
  print("main")