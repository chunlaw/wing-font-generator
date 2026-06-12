# Taiwanese per-腔 (accent) mapping CSVs — from MOE 語音差異

Nine `character/word,romanization` mapping CSVs, one per representative 腔口
(accent point), derived from the **語音差異** ("phonetic differences") field of
the MOE *臺灣台語常用詞辭典* (sutian / `kautian.ods`). Same row format as the
other `taigi-mappings/*.csv` files — no header, `漢字,台羅` per line — so they
feed straight into `wing-font.py`.

## The nine accent points

MOE's 綜合比較 (comprehensive comparison) documents each varying entry at nine
fixed survey locations. These are the columns of the 語音差異 table:

| File | 腔口 | Accent type |
| --- | --- | --- |
| `taigi-tl-taipak.csv`   | 台北 | 臺北偏泉腔 |
| `taigi-tl-sannkiap.csv` | 三峽 | 三峽偏泉腔 (distinctive `kere` 雞, `kere` vowels) |
| `taigi-tl-sintik.csv`   | 新竹 | 新竹偏泉腔 |
| `taigi-tl-taitiong.csv` | 台中 | 臺中偏漳腔 |
| `taigi-tl-lokkang.csv`  | 鹿港 | 鹿港泉腔 (海口腔, the most 泉-leaning point) |
| `taigi-tl-tailam.csv`   | 台南 | 臺南混合腔 |
| `taigi-tl-kohiong.csv`  | 高雄 | 高雄混合腔 — closest to the MOE 優勢腔 standard |
| `taigi-tl-gilan.csv`    | 宜蘭 | 宜蘭偏漳腔 |
| `taigi-tl-manking.csv`  | 馬公 | 馬公 (澎湖) 偏泉腔 |

Each file is a **full dictionary** (~27,000 rows): every headword gets that
accent's reading where 語音差異 records one, otherwise the standard reading
(`KipUnicode`). So the nine files share the same key set and differ only where
the dictionary actually documents a difference (1,472 headwords).

## Romanization scheme

**Tâi-lô (台羅) with tone diacritics** — the native scheme of the source ods.
Strings are NFC-normalized. Alternate readings (`又音`, source `/` or `;`) each
get their own row; 文/白/替 parenthetical markers are stripped.

## Worked examples (correctness spot-checks)

| 漢字 | 台北 | 三峽 | 鹿港 | 台中 | 台南 | 高雄 | 宜蘭 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 雞 | kue | **kere** | kue | ke | ke | ke | ke |
| 二 | lī | jī | lī | jī | jī | jī | jī |
| 刀 | to | to | to | to | **tor** | **tor** | to |

These match the textbook 漳/泉 splits (j/l, e/ue/ere, o/ɔ).

## Source & provenance

The MOE site (`sutian.moe.edu.tw`) was not reachable from the build sandbox
(network allowlist), so the data was taken from the **ChhoeTaigi open database**
(`github.com/ChhoeTaigi/ChhoeTaigiDatabase`), file
`ChhoeTaigi_KauiokpooTaigiSutian.csv` — a faithful conversion of the same MOE
sutian dataset. Field `KipDictDialects` is the 語音差異 table; `KipUnicode` is
the standard reading. Regenerate with `gen_dialects.py` (in this folder) once a
copy of `kautian.ods`/`sutian_source.csv` is available.

## Build an accent-specific font

```sh
cd python
python wing-font.py \
  -i input_fonts/ChironSungHK-R.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m ../taigi-mappings/dialects/taigi-tl-sannkiap.csv \
  -o ChironSungHK-Taigi-Sanxia -opt -as 0.13
```

## Licensing note

The underlying dictionary content is © Ministry of Education (Taiwan), released
as open data; ChhoeTaigi redistributes it under their stated terms. Check both
before redistributing derived fonts.
