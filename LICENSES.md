# Licenses

Wing Font's code is MIT-licensed; the input font binaries it composes
into annotation fonts are each licensed by their respective upstreams.
This file is the index — for the canonical license text of any given
input font, see the per-font credits in **wing-font-hub**:

> <https://github.com/chunlaw/wing-font-hub/blob/main/LICENSES/CREDITS.md>

`wing-font-hub` hosts the actual TTF binaries and bundles each font's
SIL OFL 1.1 text alongside the copyright statements and Reserved Font
Name lists as required by OFL Section 4. The two repositories together
satisfy redistribution requirements.

## Code license

[MIT](./LICENSE).

Applies to everything under this repo except the input font binaries
(which are pulled into `python/input_fonts/` at build time and are not
checked in — see [`python/init_fonts.py`](python/init_fonts.py)) and
their derivative output fonts (which inherit each base + annotation
font's OFL terms — see below).

## Input font licenses

Every TTF that lands in `python/input_fonts/` via `init_fonts.py` is
**SIL Open Font License 1.1**. The OFL text is identical for all of
them; what differs per font is the copyright statement and Reserved
Font Name. See
[wing-font-hub/LICENSES/CREDITS.md](https://github.com/chunlaw/wing-font-hub/blob/main/LICENSES/CREDITS.md)
for each.

| Filename in `python/input_fonts/` | Upstream | License |
| --- | --- | --- |
| `ChironSungHK-R.ttf` | [chiron-fonts/chiron-sung-hk](https://github.com/chiron-fonts/chiron-sung-hk) | SIL OFL 1.1 |
| `ChironSungHK-R-It.ttf` | [chiron-fonts/chiron-sung-hk](https://github.com/chiron-fonts/chiron-sung-hk) | SIL OFL 1.1 |
| `ChironHeiHK-R.ttf` | [chiron-fonts/chiron-hei-hk](https://github.com/chiron-fonts/chiron-hei-hk) | SIL OFL 1.1 |
| `ChironHeiHK-B.ttf` | [chiron-fonts/chiron-hei-hk](https://github.com/chiron-fonts/chiron-hei-hk) | SIL OFL 1.1 |
| `Huninn-Regular.ttf` | [justfont/open-huninn-font](https://github.com/justfont/open-huninn-font) | SIL OFL 1.1 |
| `NotoSerif-Regular.ttf` | [notofonts/latin-greek-cyrillic](https://github.com/notofonts/latin-greek-cyrillic) | SIL OFL 1.1 |
| `NotoSansTC-VariableFont_wght.ttf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1 |
| `NotoSansSC-VariableFont_wght.ttf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1 |
| `NotoSansHK-VariableFont_wght.ttf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1 |
| `NotoSansJP-VariableFont_wght.ttf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1 |
| `NotoSansKR-VariableFont_wght.ttf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) | SIL OFL 1.1 |
| `SourceHanSerif-Regular.ttf` | [adobe-fonts/source-han-serif](https://github.com/adobe-fonts/source-han-serif) | SIL OFL 1.1 |
| `XiaolaiSC-Regular.ttf` | [lxgw / Xiaolai SC](https://github.com/lxgw/Xiaolai-Sansserif) | SIL OFL 1.1 |
| `mplus-1m-medium.ttf` | [coz-m/mplus_outline_fonts](https://github.com/coz-m/mplus_outline_fonts) | SIL OFL 1.1 |
| `MPLUSRounded1c-Regular.ttf` | [coz-m/mplus_outline_fonts](https://github.com/coz-m/mplus_outline_fonts) | SIL OFL 1.1 |
| `GoogleSans-VariableFont_GRAD,opsz,wght.ttf` | [itfoundry/google-sans-thai](https://github.com/itfoundry/google-sans-thai) | SIL OFL 1.1 |

Reserved Font Names retained from upstream (must NOT be used in any
derivative without each holder's explicit written permission):
**Chiron**, **Open Huninn / Huninn / jf-openhuninn**, **Noto**,
**Source**, **Xiaolai**, **M+ / M PLUS**, **Google Sans**.

## Output font licenses

The TTF/WOFF files Wing Font produces are derivatives of one base
font + one annotation font, composited per-glyph. As OFL-derivatives
of OFL-licensed sources, **the outputs inherit SIL OFL 1.1** —
specifically the more restrictive RFN constraints of whichever input
fonts they composite.

Practical implications when you redistribute a Wing Font output:

1. **Use a family name that does NOT contain any input font's
   Reserved Font Name.** If you generate a "Cantonese annotation"
   font from Chiron Sung HK + Noto Serif, you cannot name the
   output anything containing "Chiron" or "Noto". The Generate
   page's "Font family name" field is for picking your own
   independent name.
2. **Ship the input fonts' license text with your redistribution**
   (OFL Section 2). The easiest way is to bundle a `LICENSE` file
   that names both input fonts and reproduces the OFL-1.1 text —
   one copy is enough since all inputs use the same text. See
   `wing-font-hub/LICENSES/OFL-1.1.txt`.
3. **Don't sell the output by itself.** Bundle-with-software /
   bundle-with-document is fine (OFL Section 1).
4. **Outputs must remain OFL** — you can't relicense them as
   proprietary (OFL Section 5).

These aren't Wing Font's restrictions — they're the input fonts'
restrictions, inherited by the derivative. Wing Font itself adds no
license terms on top.

## CC mapping data + mapping CSVs

`python/mappings/*.csv` is sourced from third-party romanization
databases. See the
[Acknowledgements page on wing-font.chunlaw.io](https://wing-font.chunlaw.io/credits)
for per-language attribution (Piau-Im, rime-tlpa, learn-teochew,
mozillazg's pinyin-data, the Unihan database, etc.) and their
respective licenses (mostly MIT and similar permissive).
