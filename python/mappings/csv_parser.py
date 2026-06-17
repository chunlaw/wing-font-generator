# csv_parser.py: load_mapping 函數的最終更正版 (支援來源追蹤)

import csv
from collections import defaultdict
from typing import NamedTuple
import re

# 只保留長度 <= 7 的詞組 根據實際情況調整
MAX_base_chars = 7
# Maximum number of annotation variants kept per single character.
#
# This used to be 10, matching the single ASCII digit (0–9) the
# liga_handler digit-suffix selector can type: variant 0 = default
# reading, variants 1–9 selectable as `<char>1` … `<char>9`. Readings
# past the 10th were discarded.
#
# It's now 240 — the capacity of the IVS (cmap format-14) selector path
# (ivs_handler: VS17…VS256 → variant indices 1…240). Variants beyond the
# 9th that aren't reachable through a single-digit suffix ARE reachable
# as `<base> + <variation selector>` on any VS-capable IME (and via the
# multi-digit suffix `<char>11` / `<char>111` once liga_handler emits
# those), so keeping them is useful rather than dead weight. 240 is the
# hard ceiling of the IVS supplement range, so anything kept here stays
# selectable by at least one mechanism; no realistic mapping has more
# than a handful of readings for one character anyway (the truncation
# branch below fires only a few times across the entire Mandarin set).
MAX_CHAR_VARIANTS = 240
# Tokens that mark a MUTED character inside a word (e.g. 毋 in the 合音
# 拍毋見). "_" is canonical; "-", "∅", and the ideographic space are
# accepted as aliases. All are normalised to the empty annotation.
_MUTE_MARKERS = {"_", "-", "∅", "　"}

# --- Word-unit script entries (Arabic, Thai, …) -------------------------
#
# CJK rows are per-character: `base_chars,anno1 anno2 ...` with one
# space-separated annotation per character. That model cannot work for
# every script:
#
#   * Arabic — letters change shape contextually (init/medi/fina) and
#     join cursively;
#   * Thai — words are built from base consonants plus stacking
#     vowel/tone marks, and running text has no spaces between words.
#
# For these scripts the meaningful annotated unit is the WORD, composed
# as a single glyph by build_glyph. Their rows use a per-word format:
#
#     <word>,<whole-word annotation>[,weight]
#
# The annotation may contain spaces (e.g. a multi-word gloss); it is NOT
# split per character. Rows are auto-detected by script — any base
# string containing a codepoint from a word-unit script takes this path
# — so one CSV can freely mix CJK per-char rows and word-unit rows.
#
# Word entries are keyed into `char_mapping` by the FULL word string
# (the downstream handlers detect `len(key) > 1` and route them to the
# word-ligation path instead of cmap/chain-context/IVS).
MAX_WORD_CHARS = 16

# Unicode ranges considered "Arabic script" for row auto-detection AND
# for the boundary-guard glyph class built by word_liga_handler. Kept
# here so both modules agree on what counts as an Arabic letter.
ARABIC_RANGES = (
    (0x0600, 0x06FF),   # Arabic
    (0x0750, 0x077F),   # Arabic Supplement
    (0x08A0, 0x08FF),   # Arabic Extended-A
    (0xFB50, 0xFDFF),   # Arabic Presentation Forms-A
    (0xFE70, 0xFEFF),   # Arabic Presentation Forms-B
)

THAI_RANGES = (
    (0x0E00, 0x0E7F),   # Thai (consonants, vowels, tones, digits ๐-๙)
)

DEVANAGARI_RANGES = (
    (0x0900, 0x097F),   # Devanagari (consonants, matras, digits ०-९)
)

MALAYALAM_RANGES = (
    (0x0D00, 0x0D7F),   # Malayalam (consonants, matras, chillu, digits ൦-൯)
)

SIDDHAM_RANGES = (
    (0x11580, 0x115FF),  # Siddham (悉曇文字; abugida, supplementary plane)
)


class WordScript(NamedTuple):
    """Everything that differs between word-unit scripts, as data.

    Adding a script = adding one entry to WORD_SCRIPTS; the pipeline
    modules read these fields instead of branching on script tags:

      * ``ranges`` — codepoint ranges for row auto-detection
        (csv_parser), the subset keep-list (wing-font), and the
        boundary-guard glyph classes (word_liga_handler).
      * ``boundary_guards`` — emit backtrack/lookahead blocker rules
        around the word ligation (word_liga_handler). True for
        space-separated scripts where a real boundary is detectable
        (Arabic, Hindi); False for unspaced scripts (Thai), which
        instead rely on longest-match rule ordering, CJK-style.
      * ``variant_trigger`` — manual variant-override mechanism
        (word_liga_handler): ``"cycle"`` = a trailing trigger_char
        cycles readings (RTL scripts, where typed digits land in a
        different bidi run and can never ligate with the word);
        ``"digits"`` = CJK-style digit suffix (LTR scripts).
      * ``trigger_char`` — the cycling character for ``"cycle"``
        (Arabic: tatweel ـ — joining, on every keyboard, self-erasing
        once consumed). None for ``"digits"``. Also excluded from the
        LOOKAHEAD guard class so the trigger can follow a word
        without blocking its ligation (it still BLOCKS as backtrack:
        a preceding kashida means mid-word).
      * ``component_mode`` — how build_glyph computes the ligature
        component sequence (it must equal the shaper's buffer at the
        moment our lookups run):
          - ``"cmap"``  — per-codepoint cmap lookups. Right for
            Arabic: no shaper preprocessing, and a GSUB-less Arabic
            font would trigger HarfBuzz's legacy presentation-forms
            fallback.
          - ``"bare"``  — shape against a substitution-less copy of
            the base font. Right for Thai, whose shaper REWRITES text
            before any GSUB (SARA AM → NIKHAHIT + SARA AA, reordered
            around tone marks).
          - ``"basic"`` — shape with the REAL base font but with the
            late (post-syllabic) features disabled. Right for Indic
            scripts: the buffer our lookups see has already been
            through syllable reordering AND the font's per-syllable
            basic features (nukt/half/cjct conjunct formation), so
            neither cmap nor bare shaping matches it.
      * ``feature`` — the OpenType feature the ligation lookups are
        registered under. ``"ccmp"`` wherever possible (required by
        spec, applied by every shaper, no user toggle). Indic scripts
        need ``"pres"`` instead: HarfBuzz applies ccmp/locl and the
        basic features PER SYLLABLE for Indic shapers, so a word
        ligature spanning syllables can never match there — the
        "other" features (init/pres/abvs/blws/psts/haln) run
        buffer-globally after final reordering, and pres is the
        first of them.
    """

    tag: str
    ranges: tuple
    boundary_guards: bool
    variant_trigger: str
    trigger_char: str | None
    component_mode: str
    feature: str


WORD_SCRIPTS = {
    "arab": WordScript(
        "arab", ARABIC_RANGES, True, "cycle", "ـ", "cmap", "ccmp"
    ),
    "thai": WordScript(
        "thai", THAI_RANGES, False, "digits", None, "bare", "ccmp"
    ),
    # Experimental — see the "Indic scripts" notes in
    # word_liga_handler.py for the per-syllable shaping caveats.
    "deva": WordScript(
        "deva", DEVANAGARI_RANGES, True, "digits", None, "basic", "calt"
    ),
    # Experimental — Malayalam (മലയാളം). Like Devanagari it is a Brahmic
    # abugida shaped by HarfBuzz's legacy Indic shaper, so it mirrors
    # deva's "basic" component_mode / "calt" feature. Space-separated, so
    # boundary_guards is True. See mappings/malayalam/NOTES.md.
    "mlym": WordScript(
        "mlym", MALAYALAM_RANGES, True, "digits", None, "basic", "calt"
    ),
    # Experimental — Siddhaṃ (悉曇文字). Structurally a Brahmic abugida
    # like Devanagari, but HarfBuzz shapes it with the Universal Shaping
    # Engine (USE), not the legacy Indic shaper, and the block lives in
    # the supplementary plane (>U+FFFF). The "basic"/"pres" config below
    # mirrors deva as a starting point; the shaping mode may need tuning
    # once a Siddham base font (e.g. Noto Sans Siddham) is wired in.
    "sidd": WordScript(
        "sidd", SIDDHAM_RANGES, True, "digits", None, "basic", "pres"
    ),
}

# OpenType script tag → codepoint ranges (derived view kept for
# convenience of range-only consumers).
WORD_UNIT_SCRIPT_RANGES = {
    tag: ws.ranges for tag, ws in WORD_SCRIPTS.items()
}


def is_arabic_char(char: str) -> bool:
    cp = ord(char)
    return any(lo <= cp <= hi for lo, hi in ARABIC_RANGES)


def is_arabic_word(s: str) -> bool:
    """True when the base string contains any Arabic-script codepoint."""
    return any(is_arabic_char(c) for c in s)


def get_word_unit_script(s: str):
    """Return the OpenType script tag ('arab', 'thai', …) of the first
    word-unit-script codepoint in `s`, or None if there is none."""
    for c in s:
        cp = ord(c)
        for tag, ws in WORD_SCRIPTS.items():
            if any(lo <= cp <= hi for lo, hi in ws.ranges):
                return tag
    return None


def is_word_unit_word(s: str) -> bool:
    """True when the base string belongs to any word-unit script."""
    return get_word_unit_script(s) is not None

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

def _find_problematic_entries(csv_file, cmap, char, discarded_annos_set):
    """
    Lazily re-scan the CSV to find which entries (single-char rows or
    multi-char phrases) used the pronunciations being dropped for
    ``char``. Replaces a full in-memory copy of every CSV row that we
    used to maintain just to power this rare-branch diagnostic.

    Returns ``dict[anno -> set[base_chars]]`` — the phrases / chars
    whose annotation matches a discarded reading. Capped via the
    caller's display logic, not here.
    """
    problematic = defaultdict(set)
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            for row in csv.reader(f):
                if len(row) < 2:
                    continue
                base_chars = row[0]
                # Word-unit rows: the whole second column is one
                # annotation keyed by the full word (mirrors the main
                # loop's routing).
                if is_word_unit_word(base_chars):
                    if (
                        base_chars == char
                        and row[1].strip() in discarded_annos_set
                    ):
                        problematic[row[1].strip()].add(base_chars)
                    continue
                anno_strs = row[1].split(' ')
                if len(base_chars) != len(anno_strs):
                    continue
                # Same filter the main loop applies — skip rows with
                # uncovered chars so the diagnostic matches what
                # actually went into char_cnt.
                if any(ord(c) not in cmap for c in base_chars):
                    continue
                for i, c in enumerate(base_chars):
                    if c == char and anno_strs[i] in discarded_annos_set:
                        problematic[anno_strs[i]].add(base_chars)
    except OSError:
        # Best-effort diagnostic: if re-opening the CSV fails we just
        # produce an empty source attribution rather than crashing
        # the whole pipeline.
        pass
    return problematic


def load_mapping(font, csv_file):
    cmap = font.getBestCmap()
    char_cnt = defaultdict(lambda: defaultdict(int))
    # Characters that appear with an EMPTY annotation inside a word — i.e.
    # muted characters, as in the 合音 拍毋見 → "phàng  kiàn" where 毋 is
    # silent. They get a '' variant appended last (see below).
    blank_chars = set()

    # raw_word_entries 用於生成最終的 "詞組" 映射 (word_mapping)
    raw_word_entries = []

    # NOTE: we used to also accumulate ``all_csv_entries`` here — a
    # full list of every CSV row (~95k tuples for mandarin.csv) used
    # only to power a rare diagnostic about which words drove a
    # particular reading to be dropped. That cost ~5-10 MB of peak
    # heap on the Mandarin run for a code path that fires maybe a
    # dozen times across the whole pipeline. The diagnostic is now
    # implemented by ``_find_problematic_entries`` above, which
    # re-reads the CSV lazily only when a character actually exceeds
    # MAX_CHAR_VARIANTS — a worthwhile trade for shaving allocations
    # in Pyodide.

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                base_chars = row[0]
                anno_str_raw = row[1]
                # MUTED-character marker for a character inside a word
                # (e.g. 毋 in the 合音 拍毋見 → "phàng _ kiàn"). A visible,
                # non-whitespace token is used so it survives CSV editors /
                # round-trips that would collapse a literal double-space.
                # "_" is the canonical marker; the others are accepted as
                # aliases. All normalise to the empty token, which the rest
                # of the pipeline treats as "blank annotation".
                anno_strs = [
                    "" if a in _MUTE_MARKERS else a
                    for a in anno_str_raw.split(" ")
                ]
                # 詞條權重：如果第三欄是數字則取其值，否則默認為 1
                weight = int(row[2]) if len(row) > 2 and row[2].isdigit() else 1

                if True in [ord(char) not in cmap for char in base_chars]:
                    print(f"Skip {base_chars} as there is char not found in the font")
                    continue

                # --- Word-unit rows (see module-level comment) ---------
                # The WHOLE second column is the annotation; nothing is
                # split per character, and the entry never participates
                # in the CJK chain-context word_mapping. Variants of the
                # same word accumulate by weight exactly like CJK
                # per-char readings do.
                if is_word_unit_word(base_chars):
                    if len(base_chars) > MAX_WORD_CHARS:
                        print(
                            f"Skip, {len(base_chars)} is too long "
                            f"(>{MAX_WORD_CHARS}), word '{base_chars}'."
                        )
                        continue
                    anno_whole = anno_str_raw.strip()
                    if anno_whole:
                        char_cnt[base_chars][anno_whole] += weight
                    continue

                if len(base_chars) == len(anno_strs):
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
                        elif len(base_chars) > 1:
                            # empty token inside a word → this character is
                            # muted here (合音); remember to give it a blank
                            # variant after the real readings are ranked.
                            blank_chars.add(base_char)
                            
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

            # 為了找出是哪些詞組 (或單字) 使用了這些被丟棄的發音
            # — re-scan the CSV lazily, only when this rare branch fires,
            # rather than holding every row in memory through the whole
            # pipeline. For mandarin.csv this branch fires ~10 times,
            # so 10 sequential file reads is cheap relative to the
            # memory we'd otherwise burn.
            discarded_annos_set = {item[0] for item in discarded_variants}
            problematic_entries = _find_problematic_entries(
                csv_file, cmap, char, discarded_annos_set
            )

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

    # --- Blank (muted) annotation variant -----------------------------
    # Characters muted inside a 合音 word get a '' annotation appended
    # LAST — so it is never the default reading (variant 0), but is a
    # selectable variant. build_glyph composes it as the bare base glyph
    # (an empty annotation string shapes to nothing), and the
    # chain-context lookup substitutes the character to this bare glyph
    # in the word — so e.g. 毋 in 拍毋見 renders with nothing above it
    # (phàng-∅-kiàn) rather than its default m̄.
    for char in blank_chars:
        if char in char_mapping_raw and '' not in char_mapping_raw[char]:
            char_mapping_raw[char][''] = None

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