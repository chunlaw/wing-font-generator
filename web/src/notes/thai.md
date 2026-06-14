# Thai (ภาษาไทย)

**Romanization.** A **Paiboon-style phonemic** transcription (the "thai-ink"
schema): IPA-ish vowels (`ɔ ʉ ə ɛ`), a tone diacritic over the vowel nucleus,
and `g / dt / bp` for ก / ต / ป. It is a pronunciation transcription, not a
letter-for-letter transliteration, so it reflects Thai's complex
spelling-to-sound rules (consonant classes, leading ห/อ, อักษรนำ tone
governance, clusters, vowel length).

**How annotations are made.** This is a **word-unit** mapping over **unspaced**
Thai (Thai has no spaces between words), reached by longest-match GSUB ligation.
Two tiers of data: ≈906 **hand-curated** rows from thai-ink (ground truth,
always win) plus ≈84k words from PyThaiNLP romanized by an algorithmic engine
(`thai_paiboon.py`), weighted by corpus frequency. A separate
`thai-canto-soramimi` file plays Cantonese readings as Thai "soramimi".

**Limitations.**

- The algorithmic tier is an **approximation** — measured at **~82% exact /
  ~86% ignoring tone** against a held-out curated set. Irregular spellings,
  rare words, and proper nouns are the weak spots.
- Word segmentation is longest-match; an unusual compound may be split wrong,
  changing the reading.
- Thai stacks vowels and tone marks tall, so pairing with a low-ascent base font
  may need `--out-ascent` to avoid clipping in Word / Pages / Canva.
