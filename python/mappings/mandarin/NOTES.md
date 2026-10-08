# Mandarin (普通話 / 國語)

**Romanization.** **Hanyu Pinyin** in numeric-tone form (`ling2`, `yuan2`), in
two regional variants:

- `mandarin-cn` — Mainland 普通話 (also used for Singapore / Malaysia).
- `mandarin-tw` — Taiwan 國語, with 753 single-character defaults re-derived
  from the MOE 國語辭典 (so e.g. 突 reads `tú`, not `tū`).

**How annotations are made.** The mapping covers the **full CJK Unified
Ideograph range** (≈95k rows / ≈3 MB per variant). Each character maps to its
pinyin syllable; multi-character words add **phrase-level disambiguation** for
多音字 (e.g. 行 reads differently in 銀行 vs 行走). In the browser pipeline only
the entries whose character exists in your chosen base font are surfaced, so the
generated font stays as small as the base allows.

**Limitations.**

- The file is large; building the full range produces many glyphs (the pipeline
  trims to what the base font covers).
- A polyphonic character defaults to its most frequent reading; contextual
  correction only happens where a multi-character phrase entry exists, so an
  uncommon phrase may still show the default.
- Tone is a digit, not a contour; neutral-tone and erhua nuances are
  approximate.

## Traditional-Chinese word keys — `mandarin-cn-toned-tc.csv`

`mandarin-cn-toned.csv` covers the full CJK range, so every *single* character,
simplified and traditional alike, already has correct readings. What is
simplified-only is the **word list**: all 39,373 multi-character keys are written
in simplified Chinese, and those are the rows that drive 多音字 disambiguation.
Traditional text therefore got single-character defaults and no contextual
correction.

`gen_mandarin_tc.py` fixes that by appending the traditional counterpart of every
simplified word key, via [OpenCC](https://github.com/BYVoid/OpenCC) `s2t` at the
**phrase** level:

```sh
pip install opencc
python gen_mandarin_tc.py --review          # --variant s2t|s2tw|s2hk|s2twp
```

| | rows |
|---|---|
| `mandarin-cn-toned.csv` (source, unchanged) | 95,380 |
| `mandarin-cn-toned-tc.csv` | 120,446 |

25,066 new traditional words; 14,272 already identical in both scripts; 20
already present; 15 exact duplicates folded. **Zero** rows lost to a length
change, so every reading stays positionally aligned.

**Single characters pass through untouched.** S→T is one-to-many — 发 → 發 (fā) /
髮 (fà), 干 → 乾 (gān) / 幹 (gàn) — but the split does not need resolving: all
3,733 traditional targets are already keys with readings derived for the
traditional character itself. Writing 发's merged readings onto 發 would overwrite
correct data. This is the mirror image of `gen_canto_hkied_sc.py`, whose T→S
direction *is* many-to-one and so needs a frequency-weighted merge.

**Phrase level is the whole point.** Per character, 头发 → 头發; on the whole
string `s2t` gives 頭髮, and likewise routes 干燥→乾燥 against 干部→幹部, 里面→裏面
against 公里→公里, 一只→一隻 against 只是→只是.

**Variant caveat.** Plain `s2t` maps 为 → **爲**, the orthodox form; `s2tw` and
`s2hk` both give the far commoner **為**. `s2t` also prefers 裏面 / 麪條 where
`s2tw` gives 裡面 / 麵條. Regenerating is a one-flag change. `s2twp` additionally
swaps mainland vocabulary and is the only variant that breaks alignment (22 rows).

**Weights.** New word rows carry no weight column, matching the existing word
rows (`csv_parser` reads them as 1), so they cannot outrank a 1,000,000
single-character row. The generator verifies this by simulating
`load_mapping`'s `char_cnt[char][anno] += weight` accumulation over its own
output and reporting every character whose default moved.

### The build-ready trim — `mandarin-cn-toned-tc-trimmed.csv`

The full expansion is comfortable on glyph count but expensive on
**chain-context rules**, which is the budget that is actually tight: every
multi-character word becomes a chain rule, and the expansion takes the word list
from 39,373 to 64,439. `--trim` applies two cuts:

1. **URO only** (U+4E00–9FFF), the same rule as `mandarin-cn-toned-trimmed.csv`.
   This is what lets the pipeline re-enable bare-base emission (the `字0`
   strip-annotation feature) — with the full CJK range the bare bases alone
   overflow the cap. It costs traditional coverage exactly one word (嶺𫶕).
2. **Traditional-priority words** — a simplified word entry is dropped when its
   traditional form is also present. Traditional text keeps full word-level
   多音字 disambiguation; simplified text degrades to per-character defaults
   rather than losing annotation, because the simplified single-character rows
   stay.

Cut 2 is what makes this affordable. It returns the word count to roughly what
already builds today, so the traditional word list costs almost no chain rules:

| | rows | words | variants | bases | predicted glyphs |
|---|---|---|---|---|---|
| `mandarin-cn-toned-trimmed.csv` (shipping) | 69,130 | 39,365 | 30,422 | 20,924 | 54,481 |
| `mandarin-cn-toned-tc-trimmed.csv` | 69,314 | 39,549 | 30,459 | 20,924 | **54,518** |
| `mandarin-cn-toned-tc.csv` (untrimmed) | 120,446 | 64,439 | 56,864 | 44,435 | 104,434 |

`predicted` = variants + bare bases + 2,135 DIY pinyin marks + ~1,000
structural, against a 64,000 soft cap — **9,482 headroom**. +184 words and +37
variants over the shipping file. 24,881 simplified word keys are traded for
25,062 traditional ones.

Verified: validator clean, **0 characters left without a reading**, and **0
character defaults moved** by trimming.

```sh
python gen_mandarin_tc.py --review --trim
```

**Watch the `是否已是繁體` trap.** `s2t(k) != k` is *not* a usable test for "this
word is simplified" — OpenCC also rewrites traditional spellings to a different
traditional form (為 → 爲, 裡 → 裏, 了解 → 瞭解). A first cut using that test
dropped 了解, which is perfectly good traditional orthography and is in the
shipping file. The trim instead classifies each *character* by round trip — c is
simplified iff `t2s(s2t(c)) == c` — and only considers a word for dropping if it
contains one:

```
为   s2t→爲  t2s→为  == 为   simplified
為   s2t→爲  t2s→为  != 為   traditional (variant of 爲)
了   s2t→了                  unchanged, traditional
```

So 了解 and 瞭解 both survive; 银行 and 头发 are dropped in favour of 銀行 and 頭髮.

**This fixes the traditional-polyphonic gap** diagnosed earlier: 音樂 yīn yuè,
銀行 yín háng, 頭髮 tóu fà, 的確 dí què, 會計 kuài jì, 便宜 pián yi, 參差 cēn cī,
當鋪 dàng pù, 提防 dī fáng, 強迫 qiǎng pò, 幾乎 jī hū, 傳記 zhuàn jì, 薄荷 bò hé
all now carry word entries. Previously every one of them fell through to the
single-character default (音樂 rendered yīn **lè**).

**Base font.** The build intersects the mapping with the base font's cmap, so
the real glyph count lands below the prediction. With a traditional base
(NotoSansTC, ChironSungHK) the surviving simplified single-character rows are
largely dropped by that intersection anyway — more headroom than the table
suggests. Build command follows the existing toned recipe:

```sh
python wing-font.py -opt \
  -i input_fonts/NotoSansTC-VariableFont_wght.ttf \
  -a input_fonts/Huninn-Regular.ttf \
  -m mappings/mandarin/mandarin-cn-toned-tc-trimmed.csv \
  --diy-annotations diy-mappings/mandarin/pinyin.diy-annotation.csv \
  -o outputs/<name> -as 0.25
```

Not yet built, and no `deploy-pages.yml` matrix entry added. The chain-context
subtable chunking should hold at this word count since it already does at 39,365,
but that wants an actual build to confirm.

### Pre-existing bug this surfaced

21 single-character rows in `mandarin-cn-toned.csv` have a **doubled primary
annotation** — the toneless form and the toned form as two tokens for a one-
character key:

```
識,shi shì,1000000        # should be   識,shì,1000000
髮,fa fǎ,1000000          # should be   髮,fǎ,1000000
誰,shui shéi,1000000
```

`csv_parser.load_mapping` skips any row whose token count differs from its
character count, so these 1,000,000-weight rows are **silently dropped** and the
character falls back to its unit-weight variant rows, tie-broken alphabetically.
Full list: 㪅 嘸 噠 杣 筽 繃 蓻 誰 諞 諷 識 蹣 醱 隄 頗 髪 髮 麃 𩷕 𲆦 𲆰.

Five of them are the characters whose default moved when the traditional words
were added, and in every case the move is a **correction**:

| | before | after |
|---|---|---|
| 識 | zhì | **shí** (知識, 認識) |
| 髮 | fǎ | **fà** (頭髮) |
| 頗 | pǒ | **pō** (頗有, 偏頗) |
| 繃 | běng | **bēng** (繃帶) |
| 嘸 | wǔ | **fǔ** |

The remaining 16 are unaffected only because no new word happens to cover them.
The rows themselves are **not** fixed by `gen_mandarin_tc.py` — that belongs in
whatever generates `mandarin-cn-toned.csv`.

### Review file

`--review` writes `mandarin-cn-toned-tc-review.csv`: the 756 of 77,832 positions
(0.97%) where a new traditional word assigns a reading that the traditional
character's own single-character row does not list. Neutral-tone forms of a
listed reading (兒 `er`, 個 `ge`) are excluded as benign.

These are deliberately **not** auto-corrected. The tempting fix — switch to
whichever other traditional candidate does list the reading — appears to resolve
553 of them, but most of those candidates are just the simplified or variant
glyph whose entry happens to be more complete (全軍覆沒 mò → 没, 一剎那 chà → 刹,
內金 nà → 内), so applying it would push traditional keys back to simplified
forms. The actual cause is a gap in the traditional character's reading list
(沒 lists only méi, 剝 only bō, 掙 only zhēng).

A residue of true mis-routings does exist — 朴 piáo (surname) → 樸, 斗 dǒu → 鬥,
干 qián → 幹 — but separating them from the variant-glyph noise needs Unihan
variant data, not the reading list. They are left in the review file for human
judgement.

Three words receive two readings from two different simplified sources, kept as
ranked variants: 應徵 (yìng zhēng / yìng zhǐ), 風流蘊藉 (wēn jiè / yùn jiè),
廕監生 (yìn / yīn).

## Taiwan, MOE-only — `mandarin-tw-zhuyin.csv` / `mandarin-tw-toned.csv`

`gen_mandarin_tw.py` generates both files from **one source**: g0v `moedict-data`
`dict-revised.json` (教育部《重編國語辭典修訂本》, CC BY-ND 3.0 TW). The file is
80 MB, so keep it out of the repo and pass its path as the script's argument.
Both files have the same rows; only the annotation differs:

| file | annotation |
|---|---|
| `mandarin-tw-zhuyin.csv` | 注音符號, verbatim from MOE (˙ before the syllable, 1st tone unmarked) |
| `mandarin-tw-toned.csv` | Hanyu Pinyin with tone marks |

- **Characters:** 11,213 characters, which is every MOE entry with a reading.
  Where MOE gives no reading but marks the entry 「X」的異體字, the character
  takes X's readings ahead of its own (台 → 臺 ㄊㄞˊ, 唇 → 脣 ㄔㄨㄣˊ).
  Anything MOE lacks gets no annotation.
- **Defaults:** MOE lists readings alphabetically (和 starts with ˙ㄏㄨㄛ), so
  the default comes from somewhere else. It's the `mandarin-tw.csv` default
  when MOE lists that reading, otherwise the reading used most across MOE's
  words, otherwise MOE's first. Three are set by hand, because they're used in
  running text in ways dictionary words rarely show: 著 ˙ㄓㄜ (it also spells
  mainland 着), 得 ˙ㄉㄜ (說得對) and 血 ㄒㄧㄝˇ (MOE's reading in 血液 / 血管). 114 defaults differ from
  `mandarin-tw.csv`, all of them MOE's own readings.
- **Words:** 18,104 of MOE's 148,859 words are included, the ones whose
  reading differs from the per-character defaults (垃圾 ㄌㄜˋ ㄙㄜˋ,
  認為 ㄖㄣˋ ㄨㄟˊ, 著名 ㄓㄨˋ ㄇㄧㄥˊ). Words the defaults already get right
  would only cost chain rules. Where a word has several MOE readings, the one
  `mandarin-tw.csv`'s word list uses wins (便宜 ㄆㄧㄢˊ ˙ㄧ, not ㄅㄧㄢˋ ㄧˊ).
- **Erhua:** the ㄦ is split back onto 兒: 一塊兒 → ㄧ ㄎㄨㄞˋ ㄦ / yī kuài r.
- **Pinyin:** each 注音 syllable is spelled with the pinyin MOE uses for it
  most often, which drops MOE's pinyin typos (瓦 once as wā). 誒 ㄝˋ is ề,
  which isn't in `pinyin.diy-annotation.csv`.
- **Budget:** about 27k predicted glyphs for 注音 and 29k for pinyin with DIY
  marks, against the 64k cap. The 18k word rows compare with 39.5k in the
  shipping mandarin file.
- **Skipped:** 997 MOE titles with punctuation (一不做，二不休).
- **一 / 不 變調:** 修訂本 marks only the 本調 (its Q&A 【音讀】Q2 says so). Pass
  《國語辭典簡編本》's xlsx as the second argument and its 712 一/不 words typed
  變 get the 變調 (一樣 yí yàng, 不對 bú duì, 一起 yì qǐ); 第一 / 統一 stay yī.
  Its other 變 rows (葡萄 pú tao) are ignored.
- **一 + 量詞:** 簡編本 lacks 一對 / 一個, so `MEASURE` (≈170 common 量詞) adds 一X
  by rule — ㄧˊ before a 4th tone, else ㄧˋ, tone taken from 修訂本's 量詞 reading
  (一個 yí ge via 個 ㄍㄜˋ). Characters 修訂本 doesn't define as 量詞 are skipped.
  第一X / 十一X rows pin ordinals and numbers to yī (longer words win).
  年 月 日 號 樓 班 are left out on purpose: 一年級, 一月, 一號 are ordinal.
- **DIY:** the script also writes `diy-mappings/mandarin/zhuyin.diy-annotation.csv`,
  1,559 syllables typed like the pinyin DIY file and rendered as 注音
  (`字０ｘｉｎｇ２` → ㄒㄧㄥˊ). Erhua ㄦ and ê (ㄝ) have no ASCII spelling there,
  so they're left out.
- **CI:** every 國語 font in `deploy-pages.yml` uses these files, with
  `--diy-annotations`: `NotoSansTC-mandarin-tw-zhuyin` (注音; Noto Sans TC for
  both base and annotation, like `NotoSansTC-tps`) and the tone-marked pinyin
  fonts `NotoSansTC-NotoCond-mandarin-tw`, `Xiaolai-NotoCond-mandarin-tw` and
  `Xiaolai-NotoCond-mandarin-tw` (with `pinyin.diy-annotation.csv`). The old
  `mandarin-tw.csv` is no longer built; `gen_mandarin_tw.py` still reads it to
  rank MOE's readings. 普通話 fonts keep `mandarin-cn-toned-trimmed.csv`.
