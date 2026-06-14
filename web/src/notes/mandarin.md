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
