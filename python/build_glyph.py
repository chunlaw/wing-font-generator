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
    output_font,
    mapping,
    *,
    anno_scale: float = 0.15,
    base_scale: float = 0.75,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
):
    """
    Compose annotated variant glyphs (former Part 1 of generate_glyphs).

    For each char in `mapping`, draws the base outline scaled by
    `base_scale` plus its annotation glyphs scaled by `anno_scale`,
    centred horizontally above (or below if `invert`) the base.
    The first annotation per char re-uses the original glyph name; later
    variants get fresh `wingfontNNNNNN` names appended to the font.

    Mutates `mapping` in place: each annotation value becomes the tuple
    `(target_glyph_name, variant_index)` that the GSUB handlers need.

    Returns the set of *base-font* glyph names that this function
    processed — pass it to `scale_glyphs(..., skip_glyph_names=...)`
    later so those glyphs aren't re-scaled (their outlines are already
    at the right size, having been composed via the same scale here).
    """
    with step_timer("annotated glyph composition") as timer:
        output_glyph_name_used: dict[str, bool] = {}

        base_glyph_set = base_font.getGlyphSet()
        anno_glyph_set = anno_font.getGlyphSet()
        output_glyph_set = output_font.getGlyphSet()

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

                # Resolve each annotation character once, cache (name,
                # width). The original code looked the name up twice
                # (once for total-width math, once for drawing) — a
                # noticeable cost when this runs ~30k times per build
                # for the bigger mappings.
                anno_glyph_info: list[tuple[str, int]] = []
                for char in anno_str:
                    anno_glyph_name = get_glyph_name_by_char(anno_font, char)
                    if (
                        isinstance(anno_glyph_name, str)
                        and anno_glyph_name in anno_glyph_order_set
                    ):
                        width = round(anno_hmtx[anno_glyph_name][0] * anno_scale)
                        anno_glyph_info.append((anno_glyph_name, width))

                anno_len = sum(w for _, w in anno_glyph_info)
                x_position = (base_advance_width * base_scale - anno_len) / 2

                for anno_glyph_name, width in anno_glyph_info:
                    if anno_glyph_name in anno_glyph_set:
                        anno_glyph_set[anno_glyph_name].draw(
                            TransformPen(
                                pen,
                                (
                                    anno_scale,
                                    0,
                                    0,
                                    anno_scale,
                                    x_position,
                                    anno_y_offset,
                                ),
                            )
                        )
                        x_position += width

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

        timer.note(f"{len(processed_glyph_names)} characters processed")
        return processed_glyph_names


def scale_glyphs(
    base_font,
    output_font,
    glyph_names,
    base_scale: float,
    *,
    skip_glyph_names: set[str] | None = None,
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
        base_glyph_set = base_font.getGlyphSet()
        output_glyph_set = output_font.getGlyphSet()
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
    """
    processed = generate_annotated_glyphs(
        base_font,
        anno_font,
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
