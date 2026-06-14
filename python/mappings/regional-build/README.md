# Regional Mandarin mappings (CN / TW / SG / MY)

This folder documents how `mandarin.csv` was split into four region variants:
`mandarin-cn.csv`, `mandarin-tw.csv`, `mandarin-sg.csv`, `mandarin-my.csv`
(saved next to `mandarin.csv` in `python/mappings/`).

## 1. Source of `mandarin.csv`

Per `python/README.md`, `mandarin.csv` is built entirely from mozillazg's
MIT-licensed data:

- **[mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data)** — per-character
  readings, derived from the Unicode **Unihan** database
  (`kTGHZ2013` / `kHanyuPinyin` / `kXHC1983` / `kMandarin`). Each character's
  default reading follows Unihan's `kMandarin` field.
- **[mozillazg/phrase-pinyin-data](https://github.com/mozillazg/phrase-pinyin-data)** —
  word/phrase readings that drive contextual 多音字 (homograph) disambiguation.

Because `kMandarin` is PRC-based, the original `mandarin.csv` is effectively the
**Mainland China 普通話 standard**.

## 2. How the regions differ (and why three are identical)

| Region | Standard body | Treatment |
|--------|---------------|-----------|
| **China (CN)** | 普通話 / 《通用规范汉字表》 | = original `mandarin.csv` |
| **Singapore (SG)** | 华语规范理事会 (Promote Mandarin Council) | officially adopts the PRC 普通話 pronunciation standard → = CN |
| **Malaysia (MY)** | 马来西亚华语规范理事会 | officially adopts the PRC 普通話 pronunciation standard → = CN |
| **Taiwan (TW)** | 教育部《國語辭典》/《國語一字多音審訂表》 | genuinely diverges → re-derived (see below) |

Singapore and Malaysia both formally standardised on Mainland 普通話
pronunciation. Their real differences from China are **vocabulary**
(e.g. 巴刹, 德士, 组屋), not single-character readings — so at the character
level used by this font pipeline, CN = SG = MY by design. `mandarin-cn.csv`,
`mandarin-sg.csv` and `mandarin-my.csv` are therefore byte-identical to
`mandarin.csv` (same MD5).

## 3. How `mandarin-tw.csv` was built

The authoritative Taiwan source is the **教育部《國語辭典》**, taken from
[g0v/moedict-data](https://github.com/g0v/moedict-data) (`dict-revised`), which
provides a Hanyu-Pinyin reading for every standard character reading.

For each single character we compared:

- **PRC default** = the `1000000`-weighted row in `mandarin.csv`.
- **Taiwan standard readings** = the MOE heteronyms, *excluding* those marked
  `又音` (secondary/acceptable variants).

A character's default was changed in the Taiwan variant **only when the PRC
default reading is not a Taiwan standard reading at all** — i.e. a genuine
cross-strait divergence, not merely a different ordering of shared heteronyms.
This conservative rule was further restricted to characters whose **simplified
form equals themselves** (`s2t(ch) == ch`), which removes Han-unification traps
where a simplified glyph collides with a rare traditional character
(万→mò, 价→jiè, 么→yāo were all correctly excluded).

**Result: 753 characters re-defaulted** in `mandarin-tw.csv`. Examples:

| Char | CN (普通話) | TW (國語) |
|------|-----------|-----------|
| 期 | qī | qí |
| 危 | wēi | wéi |
| 質 | (see below) | — |
| 究 | jiū | jiù |
| 突 | tū | tú |
| 企 | qǐ | qì |
| 息 / 熄 | xī | xí |
| 夕 / 汐 | xī | xì |
| 跌 | diē | dié |
| 蹈 | dǎo | dào |
| 播 | bō | bò |
| 裳 | shang | cháng |
| 藩 | fān | fán |
| 蝸 | wō | guā |
| 識 | shí | shì |

When a character's default changes, the original PRC reading is **kept as a
secondary (alternate) reading** in the Taiwan file, so phrase context can still
resolve to it where appropriate. The pipeline's per-character weighting
(`csv_parser.py`) makes the new `1000000` reading the default glyph annotation.

## 3b. Which script is `mandarin-tw.csv` for? (Traditional)

`mandarin-tw.csv` spans the full Unihan range (both Simplified and
Traditional codepoints, like every mapping here), but its **753 Taiwan
reading differences target Traditional Chinese**: 166 of them sit on
traditional-only glyphs (質, 識, 蝸, 緝, 擲, 檔, …) that a Simplified font
cannot render, and the remaining 587 are on shared glyphs. So the `-tw`
fonts should be built on **Traditional bases**.

Coverage of the common Traditional set (the 8105 通用规范 chars mapped to
Traditional) across the hub fonts:

| Font | Common-Traditional | TW overrides | Verdict |
|------|--------------------|--------------|---------|
| **Noto Sans TC** | 97.8 % | 736 / 753 | ✅ used for `-tw` (sans) |
| **Xiaolai SC** | 100 % | 753 / 753 | ✅ used for `-tw` (handwritten) — covers Traditional despite the "SC" name |
| Noto Serif SC (`SourceHanSerif-Regular.ttf`) | — | — | ❌ Simplified-region serif → `-cn` only |

Uncovered rare characters are simply skipped by the subsetter (it trims to
the base font's cmap), exactly as for every other mapping.

## 4. Known limitations

- **Phrase rows are unchanged.** Word/phrase readings still come from
  `phrase-pinyin-data` (PRC). Taiwan word-level readings (e.g. 和 as `hàn`,
  垃圾 `lè-sè`) are *not* applied. Only single-character defaults were
  regionalised.
- **"Same heteronyms, different default" cases are not auto-applied.** Where a
  character shares the same standard readings in both regions but the *common*
  default differs (e.g. 質 zhí↔zhì, 法 fǎ↔fà colloquial, 識 nuances), dictionary
  heteronym ordering is not a reliable frequency signal, so these were left to
  manual review. The 476 candidates are in `classB_review.csv` — promote any you
  want by moving them into the override list.
- **Simplified-only forms** (质, 价, 万, …) keep PRC readings in the TW file,
  since a Taiwan user types traditional characters anyway.

## 5. Reproducing / extending

- `analyze2.py` — diffs `mandarin.csv` against MOE, emits `classA_safe.csv`
  (the 753 applied overrides) and `classB_review.csv` (candidates for review).
- `generate.py` — copies CN/SG/MY and writes `mandarin-tw.csv` from
  `classA_safe.csv`.

To add Taiwan cases from `classB_review.csv`, append the chosen rows to
`classA_safe.csv` and re-run `generate.py`.

### Data licences
- pinyin-data / phrase-pinyin-data — MIT
- Unihan — Unicode licence
- moedict-data (教育部國語辭典) — CC BY-ND 3.0 TW (中華民國教育部)
