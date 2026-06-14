# Japanese (`japanese-onkun`) — design notes and the Han/Kana limitation

This mapping annotates Japanese kanji with **hiragana furigana**. It is built
from two open dictionaries shipped, ready-parsed, in the `jamdict-data` pip
package: **KanjiDic2** (per-kanji readings) and **JMdict** (vocabulary). The
two generators are `gen_japanese_onkun.py` (per-kanji rows + defaults) and
`gen_japanese_compounds.py` (compound / conjugation rules). `wordfreq`
(optional, needs `mecab-python3` + `ipadic`) is used at generation time to rank
readings by real corpus frequency.

Before anything else, the most important thing to understand about this mapping
is a **structural limitation it cannot overcome**, described below. The design
of the data is shaped entirely by working around it.

## The core limitation: kanji and kana are different scripts

Text engines — every one of them — split a string into **runs by Unicode
script** *before* a font is ever consulted, and an OpenType `GSUB`/`GPOS`
lookup can only act on glyphs **within a single run**. Kanji are script `Hani`,
hiragana `Hira`, katakana `Kana` — three different scripts. So `遠い` is shaped
as two runs, `遠` and `い`, and a rule that would read `遠` as `とお` *because*
it is followed by `い` can never match: the `い` is in a different run.

This means a self-contained font can influence a kanji's reading through only
**two** mechanisms, both of which stay inside one run:

1. the kanji's **default glyph** (one reading, no context), and
2. **all-kanji compound rules** — when several kanji are adjacent they form a
   single `Hani` run, so a contextual rule across them *does* apply
   (`銀行` → `ぎん こう`, `三人` → `さん にん`, `日本人` → `に ほん じん`).

Anything whose correct reading depends on an **adjacent kana** (all okurigana
verbs and adjectives, e.g. `行く`, `食べる`, `遠い`) is **out of reach**. This
is not a Wing Font bug and not fixable in the font: run segmentation happens in
the layout engine, on the text's Unicode properties, and the OpenType spec
itself states that itemization into single-script runs is a precondition done
*before* the font applies. It reproduces identically across HarfBuzz
(Chrome, Firefox, Edge, Android, Linux, LibreOffice), CoreText (macOS, iOS,
Safari, Pages/Keynote), and DirectWrite (Windows, Microsoft Office).

## Design decisions that follow from it

Because the okurigana context is unreachable but the all-kanji-compound context
*is* reachable, the readings are arranged to put each kanji's **non-compound
(kun / standalone) reading on the default glyph**, and to carry its **on'yomi
through all-kanji compound rules**:

- **On'yomi is folded katakana → hiragana** (`コウ` → `こう`); the whole
  annotation layer is one kana set (ordinary furigana, not an on=katakana /
  kun=hiragana split).
- **Kun readings are the kanji-part stem**, before the okurigana dot
  (`食` = `た`, `遠` = `とお`, not the full `たべる`/`とおい`). The stem is what
  composes correctly when the okurigana is written as ordinary kana beside it,
  and it is the reading the kanji needs as its default so that `食べる` / `遠い`
  read correctly with no rule.
- **Each kanji defaults to its most frequent non-compound reading** — the
  reading it takes as a single-kanji word (`彼` → `かれ`, `本` → `ほん`) or as a
  verb/adjective stem (`遠い` → `遠 = とお`, `食べる` → `食 = た`). This is
  `build_default_readings` in `gen_japanese_onkun.py`, ranked by `wordfreq`.
- **On'yomi in 熟語 is emitted as all-kanji compound rules** by
  `gen_japanese_compounds.py` — these *do* fire in every engine. So
  `遠 = とお` by default, but `永遠` gets a rule `えい えん`, `銀行` → `ぎん こう`,
  `行 = い` by default but `行政` → `ぎょう せい`.
- **Conjugation** is covered by emitting the disambiguating *stem* of each
  verb/adjective rather than every inflected form (a kanji's reading is
  invariant across conjugation). These stem rules only help inside all-kanji
  runs; the kun default is what makes `行った`, `食べて`, `遠かった` correct.
- **Kana and Japanese symbols** carry a blank (ideographic-space `U+3000`)
  "scale-only" annotation, so a mixed kanji+kana line shrinks to one uniform
  body size with no furigana drawn over the kana.

## What works and what doesn't (plain text, no preprocessing)

| Context | Example | Result |
|---|---|---|
| Standalone kanji | `彼`, `本`, `昔` | ✓ default reading (かれ / ほん / むかし) |
| All-kanji 熟語 / counters | `銀行`, `放課後`, `三人` | ✓ contextual rule (ぎんこう / ほうかご / さんにん) |
| Kanji + okurigana (single dominant reading) | `食べる`, `遠い`, `笑う` | ✓ kun default (た / とお / わら) |
| Kanji + okurigana on a **polysemous** kanji | `行く` vs `行う`, `上がる` vs `上る`, `生きる` vs `生まれる` | ✗ shows the most-frequent default only |

The failing row is the entire residual: a kanji that takes **different readings
in different okurigana contexts** can only show one of them, because the
deciding kana is cross-script.

## Correctness ceiling (measured, frequency-weighted)

Roughly **two-thirds** of kanji-occurrence mass sits inside all-kanji runs
(rule-fixable to ~99%); the remaining **third** is lone/okurigana, where only
the single default is available and it captures on the order of ~⅔–¾ of the
reading mass for the ambiguous kanji. The irreducible errors concentrate in a
**bounded set of high-frequency polysemous kanji** — 人, 上, 下, 中, 日, 時, 何,
方, 一, 生, 行, 入, 開, 分, 来, 話 … — and the overall figure is **genre
dependent**: formal / compound-heavy text reads very well; colloquial,
okurigana-heavy text (dialogue, song lyrics) is lower. 100% is provably
unreachable for a font alone.

## Why it can't be fixed in the font, and why preprocessing is not an option here

- **No font table or CSS** assigns or merges Unicode scripts. `Script_Extensions`
  (the property that lets shared marks like `ー` join a neighbouring run) is a
  Unicode character property read from the *text*; a font cannot declare it. The
  font's `GSUB` `ScriptList` (`hani`/`kana`/`DFLT`) only selects which features
  apply to an already-formed run — it can't merge runs.
- **Variation Selectors / IVS** *can* cross the boundary (`遠`+VS is one `Hani`
  run, resolvable via `cmap` format 14) and are honoured by all three engines —
  but they must be **inserted into the text**. For a font **distributed to
  others who simply type normal Japanese**, expecting per-kanji selector
  insertion is unrealistic, so this path is out.
- **HTML `<ruby>` + a morphological tokenizer** (MeCab/UniDic) resolves readings
  *before* shaping and reaches ~99% — but it is markup, available only in
  environments you control, not in a plain-text font.

So a self-contained font is **structurally capped**, and this mapping is at that
cap. The limitation is inherent to *any* font-only Japanese reading annotation.

## Overriding a specific reading

Wing Font's variant selector still works per instance: type `遠1` (or, for IMEs,
`遠丅一`) to pick the next reading after the default (`遠1` → `えん`). This is a
manual, per-occurrence override and depends on the app applying `ccmp`; it is
available but not relied upon.

## The only path beyond the cap

Lifting the ceiling for distributed plain text requires an **upstream change**,
because no single engine fix is universal (HarfBuzz, CoreText and DirectWrite
each itemize independently) and preprocessing is off the table. The leverage
order:

1. **W3C i18n / [JLReq](https://github.com/w3c/jlreq/issues)** — frame the
   requirement; convenes browser vendors and owns Japanese layout.
2. **[Unicode UAX&nbsp;#24](https://www.unicode.org/reports/tr24/)** — the common
   dependency of every engine; the only place a change propagates everywhere
   (ISO&nbsp;15924 already defines `Jpan` = Han+Hira+Kana as precedent for
   "Japanese as one script").
3. **[HarfBuzz](https://github.com/harfbuzz/harfbuzz/issues)** — technical
   feasibility and the largest single coverage win (see prior art:
   [#717](https://github.com/harfbuzz/harfbuzz/issues/717),
   [#2730](https://github.com/harfbuzz/harfbuzz/issues/2730)).
4. **Apple (CoreText)** and **Microsoft (DirectWrite)** — engaged separately for
   macOS/iOS and Windows/Office.

OpenType (Microsoft Typography / ISO&nbsp;14496-22) is *not* the venue: the spec
explicitly places itemization outside its scope. It would matter only as a
follow-on if a font-requested merged-run mechanism were ever standardized — which
would still need every engine to honour it.

## Regenerating, and curated overrides

```sh
pip install jamdict-data wordfreq mecab-python3 ipadic
python gen_japanese_onkun.py        # per-kanji rows + defaults
python gen_japanese_compounds.py    # 熟語 + conjugation rules
```

Three small curated tables fix cases the frequency data gets wrong (mostly
on/kun homographs whose two readings share one surface, so frequency can't
separate them):

- `CURATED_STANDALONE` (in `gen_japanese_onkun.py`) — single-kanji defaults:
  `本`→ほん, `日`→ひ, `中`→なか, `会`→かい, `長`→なが, `軽`→かる, …
- `CURATED_READINGS` (in `gen_japanese_compounds.py`) — common irregular on'yomi
  KanjiDic2 omits: `日`→に, `中`→じゅう, `文`→も, 反応/天皇 連声 `→のう`, …
- `CURATED_WORDS` (in `gen_japanese_compounds.py`) — homograph compounds:
  `出来`→でき (not the rare しゅったい), `他愛`→たあい.

Known residual ambiguities that no single default resolves (the deciding context
is cross-script): `話` (はなし noun vs 話す→はな), `生` (なま vs 生きる→い),
`来` (irregular くる/きた/こ), `細` (こま vs 細い→ほそ). These render their most
frequent reading; the alternates remain reachable via compound rules or the
variant selector.

## Sources

- [Unicode UAX&nbsp;#24 — Script property & Script_Extensions](https://www.unicode.org/reports/tr24/)
- [OpenType spec overview — itemization/shaping out of scope](https://learn.microsoft.com/en-us/typography/opentype/spec/overview)
- [HarfBuzz #717 — Hrkt / merged Japanese script code](https://github.com/harfbuzz/harfbuzz/issues/717)
- [ISO&nbsp;15924 `Jpan` (Han+Hiragana+Katakana)](https://scriptsource.org/scr/Jpan)
- [W3C JLReq — Japanese text layout requirements](https://github.com/w3c/jlreq)
- KanjiDic2 & JMdict © EDRDG, used under the EDRDG licence (CC BY-SA 4.0).
