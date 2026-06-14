# Cantonese (廣東話)

**Romanization.** The primary scheme is **LSHK Jyutping** (`canto-lshk`), with
alternate systems **Yale**, **Lau**, **Guangdong** and **Chishima**. Tone is a
trailing digit (`hang4`); the `*-notone` files strip it for decorative use.
Beyond Latin, Cantonese readings are also **transliterated into other scripts**
— Katakana, Hangul, Thai, Devanagari (Hindi), Gurmukhi (Punjabi), Urdu
Nastaliq, and a Filipino spelling — so the same pronunciation can be annotated
in a reader's own script.

**How annotations are made.** Each row maps a character (or word) to its
space-separated syllables: `行,hang4`. Multi-character rows additionally seed
**word-context disambiguation** — 行 reads `hang4` alone but `hong4` in 銀行,
because listing the word fixes the contextual reading over OpenType `ccmp`. When
a character has several readings, the highest **weight** wins as the font
default (weights are frequency-derived; hand-curated rows sit far above).

**Limitations.**

- A polyphonic character with no word rule covering its context shows its
  single most-frequent reading. Contextual correction only happens where a
  multi-character word entry exists.
- The cross-script transliterations (Katakana, Hangul, Thai, …) are
  *approximations* — Cantonese has sounds and tones the target scripts can't
  represent exactly, so they map to the nearest available syllable, not a
  perfect phonetic match.
- Tone is shown as a digit (or diacritic); it is not an audio cue, and tonal
  contour isn't conveyed by the glyph.
