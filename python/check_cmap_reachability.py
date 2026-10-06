"""check_cmap_reachability.py — list glyphs GSUB can produce that no
cmap entry (format 4/12 or format-14 IVS) reaches.

Apps that don't run GSUB on CJK (PowerPoint) can only show a glyph that
has a pure-cmap path, so the Office add-in needs this list to be empty.

    python check_cmap_reachability.py outputs/Foo.ttf

Run on a saved file it also lists the SOURCE font's GSUB-only glyphs
(vert, locl, kana voicing…); the build itself warns only about generated
(``wingfont*``) ones. Exits 1 when any glyph is unreachable. Importable:
``unreachable_glyphs(font) -> {glyph_name: lookup_type}``.
"""

from __future__ import annotations

import sys
from collections import Counter

from fontTools.ttLib import TTFont


def _gsub_outputs(font):
    """Yield (glyph, lookup_type) for every glyph any GSUB lookup can
    emit. Over-approximates (ignores feature/script gating) — fine for a
    check whose pass condition is "nothing left over"."""
    if "GSUB" not in font:
        return
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 7:  # extension wrapper
                st = st.ExtSubTable
            t = st.LookupType
            if t == 1:
                for g in st.mapping.values():
                    yield g, t
            elif t == 2:
                for seq in st.mapping.values():
                    for g in seq:
                        yield g, t
            elif t == 3:
                for alts in st.alternates.values():
                    for g in alts:
                        yield g, t
            elif t == 4:
                for ligs in st.ligatures.values():
                    for lig in ligs:
                        yield lig.LigGlyph, t
            # 5/6 (context) only dispatch to the lookups above.
            # 8 (reverse chain) unused by the generator.


def reachable_glyphs(font) -> set:
    reach = set()
    for sub in font["cmap"].tables:
        if sub.format == 14:
            for entries in sub.uvsDict.values():
                # glyph None = "default UVS": same glyph as the base cmap.
                reach.update(g for _u, g in entries if g)
        else:
            reach.update(sub.cmap.values())
    return reach


def unreachable_glyphs(font) -> dict:
    reach = reachable_glyphs(font)
    return {g: t for g, t in _gsub_outputs(font) if g not in reach}


def main(argv) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    bad = unreachable_glyphs(TTFont(argv[1]))
    if not bad:
        print("OK: every GSUB-produced glyph has a cmap path.")
        return 0
    by_type = Counter(bad.values())
    print(f"{len(bad)} GSUB-produced glyph(s) have no cmap path "
          f"(by lookup type: {dict(by_type)}):")
    for g in sorted(bad)[:50]:
        print(f"  {g} (type {bad[g]})")
    if len(bad) > 50:
        print(f"  … and {len(bad) - 50} more")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
