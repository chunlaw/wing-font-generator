# wing-font.py

from fontTools.ttLib import TTFont
from mappings.csv_parser import load_mapping
from chain_context_handler import buildChainSub
from ivs_handler import buildIvs
from liga_handler import buildLiga, DEFAULT_TRIGGER_CHAR
from build_glyph import generate_annotated_glyphs, scale_glyphs
import gc
import sys
import argparse
from fontTools import subset
from utils import get_glyph_name_by_char, step_timer
import string

WINDOWS_ENGLISH_IDS = 3, 1, 0x409
MAC_ROMAN_IDS = 1, 0, 0

def set_family_name(font, new_family_name):
    table = font["name"]
    for plat_id, enc_id, lang_id in (WINDOWS_ENGLISH_IDS, MAC_ROMAN_IDS):
        for name_id in (1, 4, 6, 16):
            family_name_rec = table.getName(
                nameID=name_id,
                platformID=plat_id,
                platEncID=enc_id,
                langID=lang_id,
            )
            if family_name_rec is not None:
                print(f"Changing family name from '{family_name_rec.toUnicode()}' to '{new_family_name}'")
                table.setName(
                    new_family_name,
                    nameID=name_id,
                    platformID=plat_id,
                    platEncID=enc_id,
                    langID=lang_id,
                )


def main(
    base_font_file,
    anno_font_file,
    output_prefix,
    mapping,
    new_family_name,
    base_scale=0.75,
    anno_scale=0.25,
    anno_spacing=0.0,
    upper_y_offset_ratio=0.8,
    invert=False,
    optimize=False,
    skip_woff=False,
    base_axis_location=None,
    anno_axis_location=None,
    # --- Override-trigger character ---
    #
    # Controls the character that goes between a base char and a
    # Chinese numeral when the user wants to manually select a
    # variant via the IME-friendly path (e.g. `行<trigger>一` →
    # variant 1 of 行). Default `丅` (U+4E05) is a deliberately-rare
    # Han character that won't collide with normal text; users can
    # override to something easier to type with their IME (e.g.
    # `々`, `〇`). Empty string disables the trigger+numeral path
    # entirely while leaving the universal digit-suffix path
    # (`行1`, `行2`, …) intact.
    trigger_char=DEFAULT_TRIGGER_CHAR,
    # --- Output ascent override ------------------------------------
    #
    # Raises the output font's hhea.ascent and OS/2.usWinAscent to
    # the requested value (in font units, same UPM=1000 as
    # everything else). Pairings where the annotation cascades far
    # above the base character (Urdu Nastaliq, tall Thai marks,
    # tall Hangul jamo) need more headroom than the base font's
    # native ascent provides — without this lever, the annotation's
    # top is clipped by apps that strictly honor winAscent (Word,
    # Pages, Keynote, Canva). The cost is a slightly taller line
    # height in those apps; the gain is the annotation actually
    # being visible.
    #
    # When None, the output keeps the BASE font's ascent unchanged
    # (legacy behaviour — matches every build before the Xiaolai
    # variant tuning of June 2026). When set, BOTH hhea.ascent and
    # OS/2.usWinAscent are bumped together; sTypoAscender is left
    # alone so the typographic baseline stays where designers
    # expect it (apps that respect typo metrics get the same line
    # spacing as before).
    out_ascent=None,
):
    # Sanity-check input font sizes before letting fontTools blow up
    # with a cryptic "bad sfntVersion" error. A common failure mode
    # is the input download silently returning an error page (e.g.
    # `404: Not Found` saved with a .ttf extension), which TTFont
    # would crash on at table-parse time with no hint that the file
    # is just a tiny text blob. Any legitimate base/annotation font
    # is >> 1 KiB; flagging anything smaller catches the
    # download-broke-but-saved-anyway case cleanly.
    import os as _os
    for label, path in (("base font", base_font_file),
                        ("annotation font", anno_font_file)):
        try:
            size = _os.path.getsize(path)
        except OSError as e:
            raise SystemExit(f"Cannot read {label} {path!r}: {e}") from e
        if size < 1024:
            head = ""
            try:
                with open(path, "rb") as f:
                    head = f.read(64).decode("utf-8", errors="replace")
            except OSError:
                pass
            raise SystemExit(
                f"{label.capitalize()} {path!r} is only {size} byte(s) — "
                f"this almost certainly isn't a real TTF. "
                f"Did the download fail and save an error page? "
                f"First bytes: {head!r}"
            )

    # Load the fonts and mapping.
    base_font = TTFont(base_font_file)
    anno_font = TTFont(anno_font_file)
    output_font = TTFont(base_font_file)

    # ── Tier 1: auto-instance a variable BASE font ──────────────────
    # If the base font is variable and the caller didn't pick an
    # explicit axis location, derive a sensible static instance. The
    # composition step rewrites glyf outlines and the subsetter cannot
    # reconcile a leftover gvar against them (it crashes in
    # TupleVariation.decompileDeltas_), so a variable base MUST be made
    # static before we touch glyf. This lets callers pass e.g.
    # NotoSansTC-VariableFont_wght.ttf directly.
    #
    # We pin the weight axis to Regular (400), NOT the font's own axis
    # default: several CJK variable fonts — Noto Sans TC among them —
    # default `wght` to Thin (100), which is far too light to read as
    # an annotation base. 400 is clamped into the axis's range; every
    # other axis (width, optical size, …) takes its default. Callers
    # can still override via `base_axis_location`.
    if "fvar" in base_font and not base_axis_location:
        base_axis_location = {}
        for axis in base_font["fvar"].axes:
            if axis.axisTag == "wght":
                base_axis_location[axis.axisTag] = min(
                    max(400.0, axis.minValue), axis.maxValue
                )
            else:
                base_axis_location[axis.axisTag] = axis.defaultValue

    # Annotation fonts get the SAME default-weight treatment as the
    # base. Without this, a variable annotation font shapes and draws
    # at its fvar default weight — which for Noto Sans JP/KR is Thin
    # (wght=100) — producing hairline annotations that are far too
    # light once scaled down to annotation size. Clamp to at least
    # Regular (400). This is a no-op for fonts whose default is already
    # >= 400 (Google Sans, Noto Nastaliq Urdu) and for static fonts
    # with no fvar (Noto Sans Tagalog, Noto Serif, Huninn). The chosen
    # location is instanced into both the drawn outlines and the
    # HarfBuzz shaping bytes below, so weight stays consistent. Callers
    # can still override via `anno_axis_location`.
    if "fvar" in anno_font and not anno_axis_location:
        anno_axis_location = {}
        for axis in anno_font["fvar"].axes:
            if axis.axisTag == "wght":
                anno_axis_location[axis.axisTag] = min(
                    max(400.0, axis.minValue), axis.maxValue
                )
            else:
                anno_axis_location[axis.axisTag] = axis.defaultValue

    # ── Tier 2: variable-font axis instancing ───────────────────────
    # When the caller picked an axis location for a VARIABLE font,
    # bake the chosen instance into the glyf table NOW and drop
    # fvar/gvar/HVAR/etc. Why upfront, not lazily inside
    # build_glyph?
    #
    # The composition pipeline writes new outlines into
    # output_font["glyf"][name] for every annotated variant glyph.
    # If output_font still has its original gvar table, the
    # subsetter later walks gvar lazily and tries to decompile delta
    # blocks whose point counts no longer match what's in glyf —
    # crashes with IndexError inside TupleVariation.decompileDeltas_.
    # Instancing destroys gvar entirely, which sidesteps the whole
    # class of "static glyf, variable gvar, inconsistent" bugs.
    #
    # Also: instancing the base/output fonts means the downstream
    # `getGlyphSet(location=...)` calls become no-ops — the font is
    # already at the right location. We keep the kwargs anyway as
    # belt-and-braces (and to spare a wider refactor).
    if base_axis_location and "fvar" in base_font:
        from fontTools.varLib.instancer import instantiateVariableFont
        base_font = instantiateVariableFont(
            base_font, base_axis_location, inplace=True
        )
        # output_font was opened from the same file, so it carries
        # the same variations. Instance it to the same location so
        # the un-annotated glyphs (kept via scale_glyphs) match the
        # weight we picked.
        output_font = instantiateVariableFont(
            output_font, base_axis_location, inplace=True
        )

    if anno_axis_location and "fvar" in anno_font:
        from fontTools.varLib.instancer import instantiateVariableFont
        anno_font = instantiateVariableFont(
            anno_font, anno_axis_location, inplace=True
        )

    # Raw annotation-font bytes for HarfBuzz. Two paths:
    #   • If the anno font was instanced, the on-disk bytes are
    #     STILL the variable-font master and don't match the static
    #     anno_font TTFont we now hold. Re-serialise so HB sees the
    #     same weight as fontTools does — keeps shaping output
    #     consistent with what the composition pipeline draws.
    #   • Otherwise, just slurp the file. Cheaper than serialising
    #     a 10+ MB CJK font when nothing changed.
    if anno_axis_location and "fvar" not in anno_font:
        # `not in` is true post-instancing (instantiateVariableFont
        # removes fvar). Serialise the in-memory static font.
        import io as _io
        _buf = _io.BytesIO()
        anno_font.save(_buf)
        anno_font_bytes = _buf.getvalue()
    else:
        with open(anno_font_file, "rb") as _f:
            anno_font_bytes = _f.read()

    word_mapping, char_mapping = load_mapping(base_font, mapping)

    # ── Memory: drop CSV-parse transients before Phase 1 ─────────────
    # load_mapping does four stable sorts in succession (each allocates
    # a fresh list) plus builds char_cnt as a nested defaultdict that's
    # not returned. Pyodide's GC won't reap those until something
    # forces it; ~5-10 MB of transient state can be reclaimed before
    # the heavy compose+build phases kick in.
    gc.collect()

    if new_family_name is not None:
        # Set the new family name
        set_family_name(output_font, new_family_name)

    # --- Phase 1: compose annotated variant glyphs -----------------------
    # generate_annotated_glyphs only handles the variant composition
    # (formerly Part 1 of generate_glyphs). It mutates `char_mapping`
    # in place to fill in (glyph_name, variant_index) tuples that the
    # GSUB handlers need. Returns the set of base-font glyph names that
    # got processed so scale_glyphs() later can skip them — their
    # outlines are already at the right scale.
    processed = generate_annotated_glyphs(
        base_font,
        anno_font,
        anno_font_bytes,
        output_font,
        char_mapping,
        base_scale=base_scale,
        anno_scale=anno_scale,
        anno_spacing=anno_spacing,
        upper_y_offset_ratio=upper_y_offset_ratio,
        invert=invert,
        base_axis_location=base_axis_location,
        anno_axis_location=anno_axis_location,
    )

    # ── Memory: release the annotation font ASAP ────────────────────
    # After composition completes, anno_font + anno_font_bytes are
    # dead weight. The GSUB build phase that follows (chain_context +
    # liga + ivs) is the pipeline's peak-memory phase — every MB freed
    # here is a MB the Pyodide tab doesn't have to fit alongside the
    # in-progress GSUB tree. For a CJK annotation font that's ~10-20
    # MB for the TTFont object + another ~10-20 MB for the raw bytes
    # that HarfBuzz needed.
    #
    # `base_font` STAYS alive — Phase 3's scale_glyphs reads outlines
    # from base_font['glyf'] to scale them down into output_font, so
    # it's a hard dependency through the end of the pipeline.
    anno_font.close()
    del anno_font, anno_font_bytes
    gc.collect()

    # --- Phase 2: build GSUB rules + IVS cmap supplement -----------------
    #
    # We DELIBERATELY do NOT strip the source font's existing GSUB
    # lookups before adding ours. They carry genuinely useful features
    # — `locl` (language-specific Han variants for zh-Hans vs zh-Hant
    # readers), `vert` / `vrt2` (vertical-text forms for CJK vertical
    # typesetting), `ruby` (smaller variants used in furigana), `liga`
    # (source's own typography ligatures) — and there is no good
    # reason to drop them in our output. Earlier diagnoses suspected
    # them of causing the "Don't know how to split GSUB lookup type 5"
    # crash on the Mandarin mapping, but the root cause turned out to
    # be hb.repack's Type 6 → Type 5 lookup downgrade (see Phase 4's
    # `USE_HARFBUZZ_REPACKER = False`), not the source lookups at all.
    #
    # If a future user reports an actual lookup-interaction problem
    # (e.g. source `locl` swapping a glyph our chain context expects),
    # `utils.clear_source_layout_lookups` is available as an opt-in
    # escape hatch — it preserves the GSUB structural shell so our
    # handlers can still register into it cleanly. Not wired in by
    # default because no such conflict has been observed.
    #
    # Step 2a — GSUB rules: chain context for word-level disambiguation,
    # then per-character ligature substitution under `ccmp`. Both
    # families build into the same `ccmp` lookup family — see the
    # docstrings in chain_context_handler.py / liga_handler.py for why.
    #
    # Step 2b — IVS: cmap format-14 lives outside GSUB entirely, so it
    # can't interfere with the ccmp lookups we just built. It
    # supplements them with a zero-width `<base> + <VS17+N>` path for
    # users on IMEs that expose Variation Selectors (Japanese IMEs,
    # macOS Character Viewer, Adobe Glyphs panel). The existing
    # digit-suffix and 丅+numeral paths in liga_handler stay as
    # human-readable fallbacks for users without VS input.
    buildChainSub(output_font, word_mapping, char_mapping)
    buildLiga(output_font, char_mapping, trigger_char=trigger_char)
    buildIvs(output_font, char_mapping)

    # ── Memory: drop GSUB build transients before Phase 3 ───────────
    # The Chain Context / Ligature builders allocate large intermediate
    # rule dicts (~100k+ entries combined on Mandarin) that go out of
    # scope when each build*() returns — but Pyodide's GC may not have
    # collected them yet by the time scale_glyphs() starts allocating
    # outline buffers. Forcing a sweep here keeps the two peaks from
    # overlapping.
    #
    # word_mapping is also no longer needed after this point — Phase 3
    # only reads from char_mapping. Drop the reference so the dict can
    # be reclaimed. For mandarin.csv that's ~40k phrase entries.
    del word_mapping
    gc.collect()

    # --- Phase 3: subset + scale (the perf-critical reordering) ----------
    #
    # The old order scaled all ~50k base-font glyphs BEFORE subsetting,
    # which threw away ~99% of that work. The new order:
    #
    #   optimize=True : compute keep list → scale only kept glyphs → subset
    #   optimize=False: scale every glyph in the base font (full output)
    #
    # In the optimize=True path this typically reduces the scaling loop
    # from ~50,000 iterations to ~200, which is a ~100x speedup on the
    # step that dominates the Pyodide runtime.
    if optimize:
        # Build the keep list. Same logic as before; just hoisted out
        # of the inline block so we can pass it to scale_glyphs BEFORE
        # we actually subset.
        glyphs_to_be_kept = [
            get_glyph_name_by_char(base_font, str(i)) for i in range(0, 10)
        ]
        for value in char_mapping.values():
            for glyph_name, _idx in value.values():
                glyphs_to_be_kept.append(glyph_name)

        # ASCII punctuation/letters + full-width Chinese punctuation +
        # the 丅+numeral fallback triggers (without these the IME
        # fallback silently breaks in subsetted output).
        chars_to_keep_additionally = (
            string.punctuation
            + string.ascii_letters
            + '，。！？《》「」『』｛｝〖〗【】［］、……——＠＃￥％＆＊+-/“”：；‘’／'
            + '丅零一二三四五六七八九'
        )
        for char in chars_to_keep_additionally:
            glyph_name = get_glyph_name_by_char(base_font, char)
            if glyph_name:
                glyphs_to_be_kept.append(glyph_name)

        valid_glyphs_to_keep = list(
            set(g for g in glyphs_to_be_kept if g is not None)
        )

        # Scale ONLY the kept glyphs (excluding annotated variants
        # already at the right size). This is the big perf win — instead
        # of iterating ~50k glyphs we iterate the ~200 in the keep list.
        scale_glyphs(
            base_font,
            output_font,
            valid_glyphs_to_keep,
            base_scale,
            skip_glyph_names=processed,
            base_axis_location=base_axis_location,
        )

        # Now apply the actual subset. The set of glyphs surviving might
        # be slightly larger than valid_glyphs_to_keep because the
        # Subsetter's GSUB closure pulls in any glyphs reachable via
        # lookups (notably the wingfont* variants). Unscaled extras are
        # rare and visually minor.
        with step_timer("font subset") as timer:
            subsetter = subset.Subsetter()
            subsetter.populate(glyphs=valid_glyphs_to_keep)
            subsetter.subset(output_font)
            timer.note(f"{len(valid_glyphs_to_keep)} glyphs kept")
    else:
        # Un-optimised path keeps the original behaviour: every glyph in
        # the base font's glyph order gets scaled so an un-subset output
        # is visually consistent. Slow but expected.
        scale_glyphs(
            base_font,
            output_font,
            base_font.getGlyphOrder(),
            base_scale,
            skip_glyph_names=processed,
            base_axis_location=base_axis_location,
        )

    # --- Phase 4: save ---------------------------------------------------
    # The TTF is always emitted. The WOFF2 is optional and only the CLI
    # path produces it:
    #
    #   * CLI callers (.github/workflows/deploy-pages.yml) keep the
    #     default skip_woff=False. The matrix uploads both .ttf AND
    #     .woff2 artifacts; the deploy job places both under /fonts/
    #     on the published site. Switched from WOFF (zlib) → WOFF2
    #     (Brotli) in June 2026 to cut the published-site footprint
    #     by ~30-50% and ease the 100 GB/month GH Pages bandwidth
    #     ceiling. Verified ccmp / GSUB are byte-identical after the
    #     WOFF2 encode round-trip on representative builds — see
    #     python/tools/verify_woff2_ccmp.py for the empirical check.
    #
    #   * The in-browser pipeline (runner.py) sets skip_woff=True
    #     because the web app converts TTF → WOFF (1.0) locally via
    #     the browser's CompressionStream, which is ~20-50x faster
    #     than round-tripping through Pyodide's zlib. WOFF2 requires
    #     a Brotli ENCODER which browsers don't ship natively (only
    #     decoder), so the in-browser path stays on WOFF1 — different
    #     audience (single user's own machine, not bandwidth-bound).
    #
    # ── Why disable hb.repack on save ───────────────────────────────
    # fontTools' default serializer for GSUB/GPOS calls into HarfBuzz's
    # repacker (uharfbuzz.repack) for compactness. For very large GSUB
    # tables (Mandarin pinyin: ~40k chain context + ~140k ligature
    # rules) hb.repack runs out of resolution moves and raises
    # `RepackerError`. As part of its attempt, hb.repack DOWNGRADES some
    # of our Type 6 (Chain Context Substitution) lookups to Type 5
    # (Context Substitution) — valid because the rules have empty
    # backtrack/lookahead, but a no-op-and-a-half: fontTools' fallback
    # `splitOverflowingSubtable` doesn't implement Type-5 splitting and
    # the recovery loop spins forever logging "Don't know how to split
    # GSUB lookup type 5". The user has to Ctrl+C.
    #
    # Disabling hb.repack here forces fontTools' pure-Python serializer
    # (`OTTableWriter.getAllData()`), which handles overflow by wrapping
    # lookups in OpenType Extension format (Type 7 with 32-bit offsets)
    # instead of by splitting or downgrading. Slower than hb.repack on
    # paper (~10-20% over the whole save) but never trips the Type-5
    # path. For small / medium mappings (Cantonese / Cangjie) it makes
    # no observable difference; for the Mandarin mapping it's the
    # difference between "saves in ~5 s" and "hangs forever."
    #
    # If a future fontTools release teaches the splitter how to handle
    # Type 5, this can be removed without changing the rest of the
    # pipeline.
    from fontTools.ttLib.tables.otBase import USE_HARFBUZZ_REPACKER
    output_font.cfg[USE_HARFBUZZ_REPACKER] = False

    # ── Ascent override (optional) ────────────────────────────────
    # Bump the output font's vertical-metrics ascent values so the
    # annotation has somewhere to grow. We touch:
    #   * hhea.ascent      — used by macOS / iOS / CoreText layout
    #   * OS/2.usWinAscent — the "clipping" ascent honored by
    #                        Windows-derived apps (Word, Pages,
    #                        Keynote, Canva). Without this, those
    #                        apps clip anything above winAscent.
    # We deliberately leave OS/2.sTypoAscender unchanged: that's
    # the "designer's preferred baseline" used by apps that respect
    # typo metrics (Adobe InDesign, modern browsers in some
    # contexts), and keeping it constant means typo-metrics
    # consumers get the same line spacing as before. The "useTypo
    # metrics" bit in fsSelection isn't toggled by this path
    # either — apps that DO respect typo metrics inherit the base
    # font's setting (NotoSansHK / Xiaolai both have it off, so
    # winAscent is what most renderers actually use).
    if out_ascent is not None:
        output_font["hhea"].ascent = int(out_ascent)
        output_font["OS/2"].usWinAscent = int(out_ascent)

    with step_timer("TTF save"):
        output_font.save(str(output_prefix) + ".ttf")
    if not skip_woff:
        # WOFF2 = Brotli-compressed sfnt. fontTools' encoder picks up
        # the local `brotli` (or `brotlicffi`) package automatically;
        # both are in python/requirements.txt. Encoder is lossless —
        # every GSUB lookup (including ccmp chain-context rules) is
        # byte-preserved across the round-trip.
        output_font.flavor = "woff2"
        with step_timer("WOFF2 save"):
            output_font.save(str(output_prefix + ".woff2"))

    # Close the font objects. `anno_font` was already closed + deleted
    # right after Phase 1 (see the "release the annotation font ASAP"
    # block) so it isn't repeated here — referring to it would raise
    # NameError on every successful run.
    base_font.close()
    output_font.close()

# 主程序入口部分保持不變
if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog=sys.argv[0])
    parser.add_argument('-i', '--base-font-file', help="Base font in .ttf fomrat", required=True)
    parser.add_argument('-a', '--anno-font_file', help="Annotation font in .ttf fomrat", required=True)
    parser.add_argument('-o', '--output-prefix', help="Output prefix for .ttf and .woff file", required=True)
    parser.add_argument('-m', '--mapping', help="CSV file for the mapping between base font and annotation font", required=True)
    parser.add_argument('-f', '--family-name', help="Replace with the new family name")
    parser.add_argument('-y', '--upper_y_offset_ratio', type=float, default=0.8, help="Y offset in (percentage) for the upper string")
    parser.add_argument('-bs', '--base-scale', type=float, default=0.75, help="The scaling factor for the base font")
    parser.add_argument('-as', '--anno-scale', type=float, default=0.25, help="The scaling factor for the annotation glyphs, as a fraction of the output em (UPM-independent: same visual size regardless of the annotation font's unitsPerEm)")
    parser.add_argument('-v', '--invert', action='store_true', help='Invert the annotation and base glyph')
    parser.add_argument('-opt', '--optimize', action="store_true", help="Optimizing size by subsetting annotated glyph only")
    parser.add_argument(
        '--trigger-char',
        default=DEFAULT_TRIGGER_CHAR,
        help=(
            "Override-trigger character for the IME-friendly variant "
            "path: `<base><trigger><numeral>` → variant N. Default "
            f"`{DEFAULT_TRIGGER_CHAR}` (U+4E05). Pass an empty string "
            "to disable the trigger+numeral path while keeping "
            "the digit-suffix path (`<base><1-9>`)."
        ),
    )
    parser.add_argument(
        '--out-ascent',
        type=int,
        default=None,
        help=(
            "Override the output font's hhea.ascent and "
            "OS/2.usWinAscent (font units, UPM=1000). Pairings with "
            "tall annotations (Urdu Nastaliq, tall Thai marks, "
            "Hangul jamo on low-ascent bases like Xiaolai 880u) "
            "need more headroom than the base font's native ascent. "
            "Without this flag the output inherits the base font's "
            "ascent and apps that strictly clip at winAscent (Word, "
            "Pages, Keynote, Canva) truncate the top of the tallest "
            "annotation. Typical values: 1200 for Xiaolai + Thai / "
            "Katakana / Korean, 1300 for Xiaolai + Urdu. Leaving "
            "unset preserves the previous behaviour."
        ),
    )
    try:
        options = parser.parse_args()
    except:
        parser.print_help()
        exit()
    main(
        base_font_file = options.base_font_file,
        anno_font_file = options.anno_font_file,
        output_prefix = options.output_prefix,
        mapping = options.mapping,
        new_family_name = options.family_name,
        base_scale=options.base_scale,
        anno_scale=options.anno_scale,
        upper_y_offset_ratio=options.upper_y_offset_ratio,
        invert=options.invert,
        optimize=options.optimize,
        trigger_char=options.trigger_char,
        out_ascent=options.out_ascent,
    )