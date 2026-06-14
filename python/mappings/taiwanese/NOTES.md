# Taiwanese / Southern Min (台語 / 河洛話)

**Romanization.** The primary scheme is **Tâi-lô** (`taigi-tl`), in both
tone-diacritic and numeric-tone forms, alongside **POJ** (Pe̍h-ōe-jī),
**TLPA** and **BP**. Two non-Latin annotation schemes are also provided:
**TPS** (方音符號, extended Bopomofo — pair with a Bopomofo-covering CJK font)
and **Taiwanese Kana** (pair with Noto Sans JP). Nine regional **腔 (accent)**
variants of Tâi-lô are included (Taipak, Tailam, Kohiong, Gilan, …).

**How annotations are made.** Readings come from the Taiwan MOE
**臺灣台語常用詞辭典 (sutian)** via the ChhoeTaigi dataset, segmented one
syllable per character. Word entries are space-separated per character, so they
drive **多音字 (polyphone) disambiguation** the same way the Cantonese and
Mandarin mappings do. The standard **優勢腔** (prestige) reading is given the
highest weight, so it is the font default; the accent files swap in one survey
point's reading per syllable.

**Limitations.**

- Citation tones only — **tone sandhi is not applied** (Southern Min sandhi is
  phrase-level and context-dependent, beyond what per-character glyphs encode).
- Each 腔 variant reflects a single survey point and won't capture every
  speaker's idiolect.
- The diacritic schemes (Tâi-lô, POJ) require the **Huninn** annotation font,
  which carries every combining mark used (incl. the nasal ⁿ).
