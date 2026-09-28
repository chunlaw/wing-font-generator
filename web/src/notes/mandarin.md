# Mandarin (普通話 / 國語)

**Romanization.** Two regional standards:

- `mandarin-cn` — Mainland 普通話 (also used for Singapore / Malaysia), Hanyu
  Pinyin from the Unihan-based pinyin data.
- `mandarin-tw-toned` / `mandarin-tw-zhuyin` — Taiwan 國語, taken entirely from
  the MOE 《重編國語辭典修訂本》: tone-marked pinyin or 注音, with every
  character and word reading as the dictionary gives it (突 `tú`, 垃圾 `lè sè`).

**How annotations are made.** The 普通話 mapping covers the **full CJK Unified
Ideograph range** (≈95k rows / ≈3 MB); the 國語 mappings cover the ≈11k
characters the MOE dictionary has readings for. Each character maps to its
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
- In the numeric-tone 普通話 preset, tone is a digit, not a contour;
  neutral-tone and erhua nuances are approximate.
