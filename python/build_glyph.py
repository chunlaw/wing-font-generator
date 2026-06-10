"""
build_glyph — compose annotated variant glyphs + scale un-annotated ones.

Split into two functions:

  * `generate_annotated_glyphs(...)` composes the variant glyphs (one
    per `(base_char, annotation)` pair from the mapping). This is the
    only step that *adds* glyphs to the font.
  * `scale_glyphs(...)` shrinks a given list of glyph names by
    `base_scale` so they sit at the same visual size as the annotated
    variants (whose base outlines were also drawn at `base_scale`).

The split matters for performance: scaling all 50k glyphs in a typical
CJK source font dominates the runtime in Pyodide (~3-5x slower than
native CPython for pure-Python loops). When the user generates a
subsetted output, only ~200 glyphs actually survive — so calling
`scale_glyphs` with just the keep list shaves minutes off the run.

`generate_glyphs(...)` remains as a thin wrapper that does both steps in
the old order, so callers that haven't been updated still work.
"""

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

from utils import get_glyph_name_by_char, step_timer

GLYPH_PREFIX = "wingfont"


def generate_annotated_glyphs(
    base_font,
    anno_font,
    anno_font_bytes,
    output_font,
    mapping,
    *,
    anno_scale: float = 0.15,
    anno_spacing: float = 0.0,
    base_scale: float = 0.75,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    base_axis_location: dict | None = None,
    anno_axis_location: dict | None = None,
):
    """
    Compose annotated variant glyphs (former Part 1 of generate_glyphs).

    For each char in `mapping`, draws the base outline scaled by
    `base_scale` plus its annotation glyphs scaled by `anno_scale`,
    centred horizontally above (or below if `invert`) the base.
    The first annotation per char re-uses the original glyph name; later
    variants get fresh `wingfontNNNNNN` names appended to the font.

    Layout uses real OpenType shaping via HarfBuzz. The earlier
    implementation did a naive per-char advance walk, which worked for
    Latin romanizations and Cangjie radicals (linear scripts with
    full-advance glyphs) but mispositioned Thai vowel/tone marks,
    Arabic dots, Indic vowel-mark stacks, and anything else relying on
    GSUB substitution or GPOS mark-anchor positioning. We now shape
    each annotation string with HarfBuzz, then place the resulting
    glyph run using each glyph's (x_offset, y_offset, x_advance).

    `anno_font_bytes` is the raw bytes of the annotation font; HarfBuzz
    builds its own font object from this blob via `hb.Face(blob)`. We
    can't reuse the fontTools `anno_font` object because HarfBuzz
    expects a serialised font, not a parsed TTFont.

    `anno_spacing` (em-units) adds an extra horizontal gap between
    consecutive annotation glyphs in the post-shape layout. Default 0
    reproduces natural-advance positioning. Positive values open the
    block up (useful for CJK-radical mappings like Cangjie where the
    default em-width feels cramped). Negative values tighten — push
    too far and glyphs visibly overlap. The whole annotation block is
    re-centred to account for the added width.

    Mutates `mapping` in place: each annotation value becomes the tuple
    `(target_glyph_name, variant_index)` that the GSUB handlers need.

    Returns the set of *base-font* glyph names that this function
    processed — pass it to `scale_glyphs(..., skip_glyph_names=...)`
    later so those glyphs aren't re-scaled (their outlines are already
    at the right size, having been composed via the same scale here).
    """
    # Lazy import so the module loads cheaply on hosts that don't run
    # the composition path (test scripts, etc.). The Pyodide worker
    # installs uharfbuzz via micropip at boot; the native-Python
    # build-fonts CI installs uharfbuzz from PyPI.
    import uharfbuzz as hb

    # Build the HarfBuzz font once per `generate_annotated_glyphs`
    # call — every annotation string in the mapping is shaped against
    # the same face. Re-creating the face per shape would be wasteful
    # when a 100k-row mapping triggers tens of thousands of shape
    # calls.
    hb_face = hb.Face(anno_font_bytes)
    hb_font = hb.Font(hb_face)
    # When the annotation font is a variable font and the caller
    # picked a non-default axis location, push the same coordinates
    # into the HB shaper so substitutions / mark anchors that depend
    # on the axis (e.g. weight-specific kerning) match the glyph
    # outlines we'll later draw from `anno_glyph_set`. `set_variations`
    # silently ignores tags the face doesn't actually declare, so
    # passing a stray axis is harmless.
    if anno_axis_location:
        hb_font.set_variations(
            {k: float(v) for k, v in anno_axis_location.items()}
        )
    # The fontTools anno_font is still used for glyph-name resolution
    # (HarfBuzz returns numeric glyph IDs; we need names to feed
    # `anno_glyph_set[name].draw(...)` below). The HB glyph index
    # corresponds 1:1 with fontTools' getGlyphOrder() output.
    with step_timer("annotated glyph composition") as timer:
        output_glyph_name_used: dict[str, bool] = {}

        # `location=None` is the same as omitting the kwarg — fontTools
        # returns the default-instance glyph set. Passing a dict tells
        # the variable-font machinery to interpolate outlines at that
        # axis location, which is how Tier 2 variable-font support
        # actually picks up the chosen weight / width / etc. Non-variable
        # fonts ignore the kwarg entirely.
        base_glyph_set = base_font.getGlyphSet(location=base_axis_location)
        anno_glyph_set = anno_font.getGlyphSet(location=anno_axis_location)
        # The output font's variable axes mirror the base font's (we
        # initialised output_font = TTFont(base_font_file)), so we use
        # the same base axis location.
        output_glyph_set = output_font.getGlyphSet(location=base_axis_location)

        anno_glyph_order = anno_font.getGlyphOrder()
        base_glyph_order = base_font.getGlyphOrder()
        # Set membership tests over a frozen set are O(1) vs O(n) on the
        # list returned by getGlyphOrder() — this matters when the inner
        # loop checks `glyph_name in base_glyph_order` for every char.
        base_glyph_order_set = set(base_glyph_order)
        anno_glyph_order_set = set(anno_glyph_order)

        units_per_em = base_font["head"].unitsPerEm
        if not invert:
            base_y_offset = 0
            anno_y_offset = round(units_per_em * upper_y_offset_ratio)
        else:
            base_y_offset = round(units_per_em * upper_y_offset_ratio)
            anno_y_offset = 0

        # Em-units → absolute font units. Done once outside the hot
        # loop because every annotated glyph uses the same value.
        anno_spacing_units = round(units_per_em * anno_spacing)

        # Hoist tables to locals once — every iteration would otherwise
        # do __getitem__ on the TTFont dict-like object, which involves
        # an attribute lookup chain in pure-Python land.
        base_hmtx = base_font["hmtx"]
        anno_hmtx = anno_font["hmtx"]
        out_glyf = output_font["glyf"]
        out_hmtx = output_font["hmtx"]
        out_vmtx = output_font["vmtx"] if "vmtx" in output_font.keys() else None
        out_cmap = output_font.getBestCmap()

        processed_glyph_names: set[str] = set()
        cnt = 0

        for base_char, anno_strs_dict in mapping.items():
            glyph_name_raw = get_glyph_name_by_char(base_font, base_char)
            if (
                not isinstance(glyph_name_raw, str)
                or glyph_name_raw not in base_glyph_order_set
            ):
                continue

            glyph_name = glyph_name_raw
            processed_glyph_names.add(glyph_name)

            if glyph_name not in base_glyph_set:
                continue

            base_advance_width = base_hmtx[glyph_name][0]

            for i, anno_str in enumerate(anno_strs_dict.keys()):
                if i == 0:
                    new_glyph_name = glyph_name
                else:
                    new_glyph_name = GLYPH_PREFIX + str(cnt).zfill(6)

                while new_glyph_name in output_glyph_name_used or (
                    i > 0 and new_glyph_name == glyph_name
                ):
                    new_glyph_name = GLYPH_PREFIX + str(cnt).zfill(6)
                    cnt += 1

                pen = TTGlyphPen(output_glyph_set)
                base_glyph_set[glyph_name].draw(
                    TransformPen(
                        pen, (base_scale, 0, 0, base_scale, 0, base_y_offset)
                    )
                )

                # Shape the annotation string with HarfBuzz. This
                # applies the annotation font's GSUB rules (Indic
                # reordering, Arabic positional forms, etc.) and
                # GPOS positioning (mark-to-base anchors that put
                # Thai vowels above their consonants, kerning, …).
                # The result is a list of (glyph_id, x_offset,
                # y_offset, x_advance) tuples in the font's native
                # design units — same coordinate space as
                # `hmtx[name][0]` returned for the naive path.
                buf = hb.Buffer()
                buf.add_str(anno_str)
                # `guess_segment_properties` auto-detects script,
                # direction, and language from the Unicode codepoints
                # in the buffer. Good enough for our use case
                # (Latin, Thai, Arabic, Indic, CJK) without
                # requiring the caller to tag each annotation.
                buf.guess_segment_properties()
                hb.shape(hb_font, buf)

                # Translate HarfBuzz output into the (name, width)
                # pairs the existing layout code expects. The shape
                # result already includes any GPOS x_offset; we keep
                # it separate so we can add it AT DRAW TIME rather
                # than baking it into the running x_position
                # (otherwise marks that re-emit advance=0 would
                # accumulate the offset wrong).
                shaped: list[tuple[str, int, int, int]] = []
                # Tuple shape: (glyph_name, x_offset, y_offset, x_advance)
                # all in unscaled font-design units.
                for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
                    gid = info.codepoint  # HarfBuzz quirk: `codepoint`
                    # field on glyph_info is actually the glyph index
                    # post-shaping, NOT the original Unicode
                    # codepoint. Naming is a long-standing HB
                    # confusion — see harfbuzz/uharfbuzz#142.
                    if 0 <= gid < len(anno_glyph_order):
                        anno_glyph_name = anno_glyph_order[gid]
                        if anno_glyph_name in anno_glyph_order_set:
                            shaped.append(
                                (
                                    anno_glyph_name,
                                    pos.x_offset,
                                    pos.y_offset,
                                    pos.x_advance,
                                )
                            )

                # `anno_len` is the total width the annotation block
                # will occupy in OUTPUT units, including (N-1)
                # inter-glyph gaps so the re-centring math below
                # positions it correctly. The width per glyph is the
                # post-shape x_advance (which respects substitutions
                # and per-glyph adjustments). When `anno_spacing` is
                # 0 and the annotation is a linear script (Latin,
                # cangjie) this collapses to the same number as the
                # old naive walk.
                n_anno = len(shaped)
                inter_glyph_padding = max(0, n_anno - 1) * anno_spacing_units
                anno_len = (
                    sum(round(adv * anno_scale) for _, _, _, adv in shaped)
                    + inter_glyph_padding
                )
                x_position = (base_advance_width * base_scale - anno_len) / 2

                for j, (anno_glyph_name, xoff, yoff, xadv) in enumerate(shaped):
                    if anno_glyph_name in anno_glyph_set:
                        # Apply the per-glyph (x_offset, y_offset)
                        # from HarfBuzz on top of the running
                        # x_position / anno_y_offset. The offsets
                        # are what makes mark glyphs (Thai vowels,
                        # Arabic dots, Devanagari ukar etc.) sit at
                        # the right place over the base glyph; the
                        # offsets are zero for plain Latin and
                        # cangjie so the existing scripts render
                        # identically to before.
                        anno_glyph_set[anno_glyph_name].draw(
                            TransformPen(
                                pen,
                                (
                                    anno_scale,
                                    0,
                                    0,
                                    anno_scale,
                                    x_position + xoff * anno_scale,
                                    anno_y_offset + yoff * anno_scale,
                                ),
                            )
                        )
                        # Advance by the shaped x_advance (NOT the
                        # naive hmtx advance — they differ when GPOS
                        # adjusts spacing or GSUB has substituted in
                        # a glyph with a different metric).
                        x_position += round(xadv * anno_scale)
                        # Add the inter-glyph gap after every glyph
                        # except the last — keeps the block flush at
                        # the right edge.
                        if j < n_anno - 1:
                            x_position += anno_spacing_units

                if out_vmtx is not None and glyph_name in base_glyph_order_set:
                    out_vmtx[new_glyph_name] = base_font["vmtx"][glyph_name]

                out_hmtx[new_glyph_name] = (
                    base_advance_width,
                    round(
                        max(
                            0,
                            min(
                                (base_advance_width * base_scale - anno_len) / 2,
                                base_hmtx[glyph_name][1] * base_scale,
                            )
                            + (1 - base_scale) * base_advance_width / 2,
                        )
                    ),
                )
                out_glyf[new_glyph_name] = pen.glyph()
                output_glyph_name_used[new_glyph_name] = True
                mapping[base_char][anno_str] = (new_glyph_name, i)
                if i == 0:
                    out_cmap[ord(base_char)] = new_glyph_name

        # Push the new wingfont* glyph names from glyf.glyphOrder
        # up into font.glyphOrder. fontTools' glyf table __setitem__
        # auto-appends new names to its OWN glyphOrder, but the
        # FONT-level cached glyphOrder doesn't refresh — which bites
        # us specifically when the input was a variable font that
        # `instantiateVariableFont` populated font.glyphOrder for in
        # main(). Without this sync, the subsetter later builds
        # reverseGlyphMap from the stale font.glyphOrder and throws
        # KeyError on every wingfont* name we added. For the
        # non-instanced path this is effectively a no-op (the two
        # orders are already in sync).
        output_font.setGlyphOrder(output_font["glyf"].glyphOrder)

        timer.note(f"{len(processed_glyph_names)} characters processed")
        return processed_glyph_names


def scale_glyphs(
    base_font,
    output_font,
    glyph_names,
    base_scale: float,
    *,
    skip_glyph_names: set[str] | None = None,
    base_axis_location: dict | None = None,
):
    """
    Shrink the given glyph names in `output_font` by `base_scale`, using
    the outlines from `base_font`.

    Args:
        glyph_names: iterable of glyph names to consider. For the
            optimised (subset) path this is the keep list — only a few
            hundred entries instead of the full glyph order — which is
            what gives this refactor its 50-100x speedup.
        skip_glyph_names: set of names to skip, typically the value
            returned by `generate_annotated_glyphs` so we don't re-scale
            glyphs whose outlines were already composed at the right
            size.

    Returns ``(scaled_count, skipped_no_outline)``.
    """
    skip = skip_glyph_names or frozenset()

    with step_timer("un-annotated glyph scaling") as timer:
        # Hoist every dict/method access we can out of the hot loop. In
        # Pyodide each attribute lookup costs noticeably more than it
        # would under native CPython, so local-variable bindings here
        # buy a measurable speedup independent of the deferred-scaling
        # change.
        # Use the same axis location as generate_annotated_glyphs so
        # the un-annotated glyphs we shrink here are sampled from the
        # same variable-font instance as the annotated ones.
        base_glyph_set = base_font.getGlyphSet(location=base_axis_location)
        output_glyph_set = output_font.getGlyphSet(location=base_axis_location)
        base_hmtx = base_font["hmtx"]
        out_glyf = output_font["glyf"]
        out_hmtx = output_font["hmtx"]
        inv_base_scale = 1 - base_scale

        skipped_no_outline: list[str] = []
        scaled_count = 0

        for glyph_name in glyph_names:
            if glyph_name in skip:
                continue
            if glyph_name not in base_glyph_set:
                skipped_no_outline.append(glyph_name)
                continue

            base_advance_width, base_lsb = base_hmtx[glyph_name]
            pen = TTGlyphPen(output_glyph_set)
            x_offset = (base_advance_width * inv_base_scale) / 2
            tpen = TransformPen(
                pen, (base_scale, 0, 0, base_scale, x_offset, 0)
            )
            base_glyph_set[glyph_name].draw(tpen)

            out_glyf[glyph_name] = pen.glyph()
            out_hmtx[glyph_name] = (
                base_advance_width,
                round(base_lsb * base_scale + x_offset),
            )
            scaled_count += 1

        timer.note(
            f"{scaled_count} scaled, {len(skipped_no_outline)} skipped no-outline"
        )
        return scaled_count, skipped_no_outline


def generate_glyphs(
    base_font,
    anno_font,
    anno_font_bytes,
    output_font,
    mapping,
    anno_scale: float = 0.15,
    base_scale: float = 0.75,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
):
    """
    Backwards-compatible wrapper that runs the old two-phase pipeline
    (annotated composition + scale ALL glyphs in base_glyph_order).

    New callers (including wing-font.py with optimize=True) should use
    `generate_annotated_glyphs` + `scale_glyphs` directly so they can
    defer scaling until after subsetting and pass a much smaller list.

    `anno_font_bytes` is the raw bytes of the annotation font, used by
    `generate_annotated_glyphs` for HarfBuzz shaping. Callers that
    still use this wrapper need to read the file bytes themselves
    alongside the TTFont object.
    """
    processed = generate_annotated_glyphs(
        base_font,
        anno_font,
        anno_font_bytes,
        output_font,
        mapping,
        anno_scale=anno_scale,
        base_scale=base_scale,
        upper_y_offset_ratio=upper_y_offset_ratio,
        invert=invert,
    )
    scale_glyphs(
        base_font,
        output_font,
        base_font.getGlyphOrder(),
        base_scale,
        skip_glyph_names=processed,
    )
