# Review: current taigi mappings vs. the MOE ods (語音差異)

Comparing the earlier `taigi-mappings/taigi-tl-toned.csv` (8,346 char-reading
rows, from a third-party community 字庫) against the MOE *臺灣台語常用詞辭典*
(sutian / `kautian.ods`) — the analysis that led us to adopt the MOE dataset.

## 1. The current mapping is a single, un-labelled accent — and it isn't the standard one

The current taigi CSVs carry **one reading per character** with no accent
dimension. The ods shows that 1,472 common headwords vary across the nine 腔;
the current data flattens that to a single idiolect. Measuring which MOE accent
the *standard* (優勢腔) reading is closest to, among those 1,472 varying words:

| 腔口 | % of varying words read identically to the MOE standard |
| --- | --- |
| 臺中偏漳腔 | 88% |
| 宜蘭偏漳腔 | 81% |
| 高雄混合腔 | 80% |
| 臺南混合腔 | 70% |
| 臺北偏泉腔 | 64% |
| 新竹偏泉腔 | 61% |
| 馬公偏泉腔 | 59% |
| 三峽偏泉腔 | 58% |
| 鹿港泉腔 | 43% |

The MOE 優勢腔 leans 漳 (closest to 台中/宜蘭/高雄); 鹿港 is the outlier. This is
the natural "default" accent for the existing single-variant font.

## 2. But the current data leans 泉, not 優勢腔

The current mapping is **not** the MOE standard. 188 characters in it carry the
泉腔 vowels `er / ir / ee / ur` (e.g. 伙 `hér`, 倪 `gerê`, 余 `îr`, 倭 `er`) that
the MOE recommended reading never uses (standard would be `hué/hé`, `gê`, `û`,
`e`). That earlier 字庫 already flagged these as "dialectal vowels"
that fall back to raw Tâi-lô. So the current font is effectively a **泉-flavoured
mixed idiolect**, sitting between the 鹿港/三峽 泉 points and the 高雄 standard —
not cleanly any one of the nine.

## 3. Reading-level agreement is high but not total

Of 4,180 single characters shared between the current mapping and sutian's
single-character headwords:

- **93%** (3,898) share at least one reading.
- **282** have fully disjoint reading sets; **237** remain disjoint after
  case-folding (the other ~45 are just capitalization artifacts — sutian
  capitalizes some surname/sentence-initial readings, e.g. 佛 `Hu̍t/Pu̍t`,
  余 `Û`).

The 237 genuine differences fall into three buckets:

1. **泉-vowel idiolect** (largest) — `er/ir/ee` forms above.
2. **Aspiration / initial mismatches** — e.g. 僭 current `tshiàm` vs sutian
   `tsiàm`; 俱 `ku/kū` vs `khū`.
3. **Different lexical reading chosen** — e.g. 侗 current `siâng/sâng` vs sutian
   `tòng`; 仗 `tiāng` vs `tiōng`.

These are worth auditing upstream if the goal is to match the MOE standard.

## 4. Coverage

- Current mapping: **5,302** distinct characters.
- Sutian single-character headwords: **4,399**; **1,122** current-mapping
  characters are not present as single-character sutian headwords (sutian often
  only lists them inside multi-character words). The current char-level data
  therefore has *broader single-character coverage*, while the ods adds
  *word-level and accent-level* information the current data lacks entirely.

## Recommendation

The ods is complementary, not a drop-in replacement:

1. **Add accent variants.** Ship the nine per-腔 CSVs as new font variants
   (e.g. `Taigi-Sanxia`, `Taigi-Lukang`) — this is information the current
   pipeline has no equivalent for.
2. **Relabel the existing variant.** It is a 泉-leaning mixed idiolect; either
   document it as such, or regenerate it from sutian's `KipUnicode` to get a
   clean 教育部標準 (≈ 高雄優勢腔) variant.
3. **Audit the 237 disjoint single-char readings** (and the 188 `er/ir/ee/ur`
   forms) against the ods if standard-conformance matters; keep them if the
   泉腔 flavour is intentional.
4. **Keep the current char-level file for coverage** — it covers ~1,100 single
   characters the sutian word list does not expose individually.

## Native-speaker feedback vs. the MOE 語音差異 (kept faithful)

Native reviewers flagged two reading classes where the MOE 語音差異 table
records a vowel shift they say their accent does not actually use:

- **臺南 `-iunn` → `-ionn`** (17 single chars: 香 hiunn→hionn, 張 tiunn→tionn,
  章, 腔, 傷, 槍, 樟, 漿, 箱, 羌, …). Reviewer: 臺南 keeps `-iunn`.
- **宜蘭 syllabic `-ng` → `-uinn`** (e.g. 飯 pn̄g→puīnn, 光 kng→kuinn,
  酸 sng→suinn, 磚, 荒, 昏, 穿, …). Reviewer: 宜蘭 keeps `-ng` (飯 = pn̄g).

**Decision: keep the MOE readings as-is.** These values are exactly what the
教育部《臺灣台語常用詞辭典》 records for those survey points, and the project's
policy is to stay faithful to the authoritative source rather than layer in
per-speaker corrections. The dispute is genuine (MOE's 臺南 `-ionn` in
particular is contested), so it's recorded here; if we later decide to honour
the corrections, the clean way is a small documented override file applied on
top of the MOE base in `gen_moe_standard.py`, not hand-edits to the CSVs.

> Separately fixed (not an MOE dispute, a generator bug): per-腔 readings now
> apply to syllables **inside multi-character words**, not just standalone
> characters — so e.g. 鹿港/三峽 去 is `khìr` in 無去 / 去了了, not just alone.
> Previously words fell back to the 優勢腔 standard, which erased the accent in
> connected text.
