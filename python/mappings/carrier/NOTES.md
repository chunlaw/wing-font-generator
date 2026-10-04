# Dakelh (Carrier) — `dakelh-clc.csv`

Carrier syllabics → Carrier Linguistic Committee (CLC) romanization,
one row per syllabic symbol (202 rows).

**Source.** Each row is the output of Bill Poser's Carrier
Transliterator (<https://www.billposer.org/TransliterateCarrier.html>,
"Syllabics to CLC") run on that single symbol, for every codepoint in
U+1400–U+167F and U+18B0–U+18FF that it converts. Provenance is
`auto` until a Dakelh speaker or Bill Poser has checked it.

**Known limits — no word list yet.** Syllabics leave out information
that CLC writes (Poser, *Comparison of the CLC and Carrier Syllabic
Writing Systems*):

* tone (CLC acute accent) is never written in syllabics;
* fronted s, z, ts, dz, ts' are only distinguished syllable-finally;
* syllable-final /w/, /kw/ and /wh/ have no symbol, so e.g. lhawh
  ᘳᐁᑋ reads as `lha oo h`.

Fixing these needs word-level rows from a community dictionary, used
only with the community's permission.

**Glyph note.** Shared finals such as ᒡ (lh) sit in the raised Cree
position by default; Carrier writes them at mid-line. Noto's `ss01`
lowers them, but it is not applied in this build yet.
