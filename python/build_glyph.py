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
from fontTools.pens.recordingPen import DecomposingRecordingPen

from mappings.csv_parser import WORD_SCRIPTS, get_word_unit_script
from utils import get_glyph_name_by_char, step_timer

GLYPH_PREFIX = "wingfont"
# DIY manual-annotation mark glyphs (one per CSV-A entry). Named by their
# Plane-15 PUA codepoint for stable, collision-free names, e.g.
# ``wingfontmarkF0000``. See HYBRID_ANNOTATION_DESIGN.md and diy_handler.py.
MARK_PREFIX = "wingfontmark"
# DIY bare scaled-base glyphs (one per MAPPED char). A mapped char's
# default glyph has its default reading baked in, so the manual path must
# strip it to an annotation-free scaled base before stacking a mark.
# Named by the base codepoint, e.g. ``wingfontbare00884C`` for 行.
BARE_PREFIX = "wingfontbare"


def _draw_decomposed(glyph_set, glyph_name, target_pen):
    """Draw ``glyph_name`` into ``target_pen`` with composite components
    flattened to contours.

    Drawing a *composite* source glyph straight into a TTGlyphPen (even
    through a TransformPen) forwards ``addComponent()`` calls, which the
    TTGlyphPen records as component references. When that glyph is one of
    many merged into a single word/annotation glyph, the component's own
    offset bypasses the surrounding annotation/base scale and the merged
    glyph drops or mis-places those components. Precomposed long vowels
    (ā/ī/ū = base letter + ``uni02C9`` macron) collapsed to a small, low
    base glyph this way. Decomposing first resolves every component into
    plain contours in the source coordinate space, so the surrounding
    TransformPen scale then applies uniformly. For simple (non-composite)
    glyphs this is a no-op: the recorded contours replay identically."""
    rec = DecomposingRecordingPen(glyph_set)
    glyph_set[glyph_name].draw(rec)
    rec.replay(target_pen)


# ── Shared HarfBuzz shape/draw helpers ───────────────────────────────
# These were closures inside generate_annotated_glyphs; lifted to module
# scope so generate_mark_glyphs (the DIY manual-annotation path) reuses
# the EXACT same shaping + drawing logic instead of duplicating it. The
# composite path keeps thin wrapper closures that bind its loop-shared
# buffer / scales and delegate here.


def _shape_run(hb_font, hb_buffer, text, glyph_order, glyph_order_set):
    """Shape `text` against `hb_font` using the caller's (reused)
    `hb_buffer`. Returns a list of ``(glyph_name, cluster, x_offset,
    y_offset, x_advance)`` tuples in the buffer's output order (visual
    order for RTL runs — exactly the order to draw at cumulative
    advances)."""
    import uharfbuzz as hb

    hb_buffer.clear_contents()
    hb_buffer.add_str(text)
    hb_buffer.guess_segment_properties()
    hb.shape(hb_font, hb_buffer)
    out = []
    for info, pos in zip(hb_buffer.glyph_infos, hb_buffer.glyph_positions):
        gid = info.codepoint  # post-shaping glyph index, not a Unicode cp
        if 0 <= gid < len(glyph_order):
            name = glyph_order[gid]
            if name in glyph_order_set:
                out.append(
                    (
                        name,
                        info.cluster,
                        pos.x_offset,
                        pos.y_offset,
                        pos.x_advance,
                    )
                )
    return out


def _shaped_width(anno_shaped, anno_scale_eff, anno_spacing_units):
    """Total width the shaped annotation block occupies in OUTPUT units,
    including the (N-1) inter-glyph `anno_spacing` gaps. Per-glyph width
    is the post-shape x_advance, so it respects GSUB substitutions and
    GPOS spacing adjustments."""
    return sum(
        round(adv * anno_scale_eff) for *_rest, adv in anno_shaped
    ) + max(0, len(anno_shaped) - 1) * anno_spacing_units


def _draw_shaped(
    pen,
    anno_shaped,
    x_start,
    y_offset,
    anno_glyph_set,
    anno_scale_eff,
    anno_spacing_units,
):
    """Draw a shaped annotation run into `pen`, starting at `x_start`
    with its baseline at `y_offset`.

    Each glyph's HarfBuzz (x_offset, y_offset) is applied on top of the
    running position — that's what places mark glyphs (Thai vowels,
    Arabic dots, Devanagari ukar, …); the offsets are zero for plain
    Latin so linear scripts render exactly as a naive advance walk
    would. The cursor advances by the SHAPED x_advance (not the hmtx
    advance — they differ when GPOS adjusts spacing or GSUB substituted a
    glyph with different metrics), plus the inter-glyph gap after every
    glyph except the last."""
    n_anno = len(anno_shaped)
    x_position = x_start
    for j, (a_name, _cluster, xoff, yoff, xadv) in enumerate(anno_shaped):
        if a_name in anno_glyph_set:
            _draw_decomposed(
                anno_glyph_set,
                a_name,
                TransformPen(
                    pen,
                    (
                        anno_scale_eff,
                        0,
                        0,
                        anno_scale_eff,
                        x_position + xoff * anno_scale_eff,
                        y_offset + yoff * anno_scale_eff,
                    ),
                ),
            )
            x_position += round(xadv * anno_scale_eff)
            if j < n_anno - 1:
                x_position += anno_spacing_units


def _add_cmap_entry(output_font, codepoint, glyph_name):
    """Map `codepoint` → `glyph_name` in every cmap subtable that can
    represent it. Supplementary-plane codepoints (> U+FFFF, e.g. the
    Plane-15 PUA used for DIY marks) only fit format 12/13 segmented
    subtables; BMP codepoints go into all subtables. Returns True if at
    least one subtable accepted the entry."""
    added = False
    for sub in output_font["cmap"].tables:
        if codepoint > 0xFFFF:
            if sub.format in (12, 13):
                sub.cmap[codepoint] = glyph_name
                added = True
        else:
            sub.cmap[codepoint] = glyph_name
            added = True
    return added


def generate_annotated_glyphs(
    base_font,
    anno_font,
    anno_font_bytes,
    output_font,
    mapping,
    *,
    anno_scale: float = 0.25,
    anno_spacing: float = 0.0,
    base_scale: float = 0.75,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    anno_below: bool = False,
    base_axis_location: dict | None = None,
    anno_axis_location: dict | None = None,
    base_font_bytes: bytes | None = None,
    ligature_carets: dict | None = None,
    word_metrics: dict | None = None,
    word_components: dict | None = None,
    char_metrics: dict | None = None,
    emit_bare_bases: bool = True,
    bare_base_map: dict | None = None,
):
    """
    Compose annotated variant glyphs (former Part 1 of generate_glyphs).

    For each char in `mapping`, draws the base outline scaled by
    `base_scale` plus its annotation glyphs scaled by `anno_scale`,
    centred horizontally above (or below if `invert`) the base.

    `anno_scale` is UPM-independent: it is interpreted as a fraction of
    the OUTPUT em and internally rescaled by `output_upm / anno_upm`
    before being applied to the annotation outlines (see the
    normalization note in the body). This means one `anno_scale` value
    renders at the same visual size no matter what unitsPerEm the
    annotation font uses.
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

    Word-unit entries (Arabic)
    --------------------------

    Mapping keys longer than one character are treated as WORD entries:
    the whole string is shaped with HarfBuzz against the BASE font (so
    Arabic init/medi/fina forms, lam-alef ligatures, and mark anchors
    all come out exactly as the base font renders them), and the entire
    shaped run is drawn into ONE new glyph with the annotation centred
    above it. This requires `base_font_bytes` (raw bytes of the —
    possibly instanced — base font) for the HarfBuzz face; word entries
    are skipped with a warning when it's None.

    Differences from the single-char path:
      * The annotation sits BELOW the word by default (the reverse of
        the CJK above-the-character default): its top edge is placed at
        the base font's scaled hhea descent, so it clears even the
        deepest bowls. Pass `invert=True` to flip it above the word at
        `upper_y_offset_ratio` (note this is also the reverse of what
        `invert` means for single-char entries). The word outline
        itself always stays on the baseline — raising it would knock
        Arabic text out of alignment with everything around it.
      * The composed glyph's advance is the SHAPED word width scaled by
        `base_scale` (proportional — joining scripts can't tolerate the
        CJK trick of keeping the full em advance around a shrunken
        outline), widened only if the annotation is wider than the word.
      * No cmap entry is written (there is no single codepoint to map);
        the word glyph is only reachable through the GSUB ligation that
        word_liga_handler builds from the mutated `mapping`.
      * When `ligature_carets` (a dict) is passed, it is filled with
        ``{glyph_name: [x, ...]}`` caret positions at letter-cluster
        boundaries of the shaped run, for GDEF LigCaretList — this is
        what lets text editors step the cursor *through* the word glyph
        instead of jumping over it.
      * When `word_metrics` (a dict) is passed, its ``"min_y"`` /
        ``"max_y"`` keys are updated with the extreme ink Y of the
        composed word glyphs, so the caller can extend the output
        font's descent (or ascent) to keep below-the-word annotations
        from being clipped by winDescent-honouring apps.
      * When `word_components` (a dict) is passed, it is filled with
        ``{word: [glyph_name, ...]}`` — the EXACT glyph sequence the
        shaper's buffer will contain when word_liga_handler's
        (prepended, so first-running) lookups see the typed word.
        For Thai this is computed by shaping against a
        substitution-less copy of the base font, because HarfBuzz's
        Thai shaper preprocesses text before any GSUB: typed SARA AM
        (ำ U+0E33) becomes NIKHAHIT + SARA AA, reordered around tone
        marks — nominal per-codepoint cmap lookups would never match
        words containing it. For Arabic the nominal cmap glyphs ARE
        the buffer content (no shaper preprocessing), and shaping a
        GSUB-less Arabic font would instead trigger HarfBuzz's
        legacy presentation-forms fallback, so Arabic deliberately
        stays on per-codepoint cmap resolution.

    Single-char (CJK) ink metrics
    -----------------------------

    When `char_metrics` (a dict) is passed, its ``"min_y"`` / ``"max_y"``
    keys are updated with the extreme ink Y of the composed
    SINGLE-character glyphs (base + above/below annotation). The caller
    uses ``max_y`` to auto-fit the output font's clipping ascent
    (hhea.ascent + OS/2.usWinAscent) so a tall annotation — Thai marks,
    Hangul jamo, Urdu Nastaliq on a low-ascent base like Xiaolai — isn't
    truncated by winAscent-honouring apps (Word, Pages, Keynote, Canva)
    without the user having to guess a `--out-ascent` value. This is the
    single-char counterpart to `word_metrics`; they are kept separate
    because the word path also extends the typo + descent metrics (it
    adds a whole annotation row), whereas the CJK path widens only the
    clipping ascent (see wing-font.py's `_auto_fit_ascent`).
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

        # ── UPM normalization for the annotation scale ──────────────────
        # Annotation outlines are drawn from the ANNOTATION font in its
        # own design units, then placed into the output font (which
        # inherits the BASE font's unitsPerEm). The TransformPen does not
        # reconcile the two coordinate systems, so a raw `anno_scale`
        # renders at a size proportional to the annotation font's UPM:
        # NotoSerif (UPM 2048) came out ~2x larger than GoogleSans /
        # Noto Sans JP·KR (UPM 1000) or Huninn (UPM 1024) at the SAME
        # `anno_scale`. Multiplying by output_upm / anno_upm makes
        # `anno_scale` mean "fraction of the OUTPUT em" regardless of the
        # annotation font's internal UPM, so one value renders at a
        # consistent visual size across every annotation font. (For an
        # annotation font whose UPM already equals the output UPM this is
        # a no-op, i.e. anno_scale_eff == anno_scale.)
        anno_units_per_em = anno_font["head"].unitsPerEm
        anno_scale_eff = anno_scale * units_per_em / anno_units_per_em

        # ── Single-char composite y-offsets ──────────────────────────
        # Three regimes — `anno_below` and `invert` are independent but
        # one-or-the-other; if both happen to be set, `anno_below`
        # wins because it is the more natural representation (caller
        # is explicitly opting into the descent-extension semantics).
        #
        #   • DEFAULT (neither flag):
        #       base on baseline (y=0), annotation ABOVE at +0.8em.
        #       Standard furigana-on-top layout.
        #
        #   • `--anno-below` (new, recommended for "below" use cases):
        #       base STAYS on baseline (y=0), annotation drops into
        #       the descent area (negative y). Output font's typo +
        #       hhea descent gets auto-widened by wing-font.py to
        #       reserve the line-box space. This mirrors what the
        #       word-unit (Arabic) default path does and keeps the
        #       inverted text's baseline aligned with surrounding
        #       un-annotated CJK in mixed runs.
        #
        #   • `--invert` (legacy, preserved for back-compat):
        #       lifts the base CJK to +0.8em and parks the annotation
        #       at y=0. The composite's origin is then the bottom of
        #       the annotation, so text rendered with this font sits
        #       visibly higher than un-annotated CJK on the same
        #       baseline. Inconsistent with the word-unit path's
        #       `invert` semantics (which means "annotation goes
        #       ABOVE" for words). Kept because some existing
        #       deployments depend on it; new builds should prefer
        #       `--anno-below`.
        base_descent = min(0, base_font["hhea"].descent)
        anno_hhea_ascent = max(0, anno_font["hhea"].ascent)
        if anno_below:
            base_y_offset = 0
            # Annotation's TOP lands at the scaled base-descent (just
            # below the baseline, clear of any base ink), extending
            # downward by anno_hhea_ascent * anno_scale_eff. Same
            # formula the word-unit "default" path uses below for
            # word_anno_y, so single-char and word-unit emit
            # annotation at the same y when both pick the "below"
            # branch.
            anno_y_offset = round(
                base_descent * base_scale
                - anno_hhea_ascent * anno_scale_eff
            )
        elif invert:
            base_y_offset = round(units_per_em * upper_y_offset_ratio)
            anno_y_offset = 0
        else:
            base_y_offset = 0
            anno_y_offset = round(units_per_em * upper_y_offset_ratio)

        # Em-units → absolute font units. Done once outside the hot
        # loop because every annotated glyph uses the same value.
        anno_spacing_units = round(units_per_em * anno_spacing)

        # ── Word-unit (Arabic) annotation placement ──────────────────
        # Default is BELOW the word: the annotation's tallest ink
        # (approximated by the annotation font's hhea ascent, scaled)
        # is dropped to the base font's scaled hhea descent so it
        # clears even the deepest descender bowls (Nastaliq dips far
        # below the baseline). `invert=True` flips it above the word at
        # `upper_y_offset_ratio` — the mirror of the single-char
        # semantics, where the default is above and invert means below.
        # `base_descent` / `anno_hhea_ascent` were declared just above
        # for the single-char `anno_below` branch; reuse them here.
        if not invert:
            word_anno_y = round(
                base_descent * base_scale
                - anno_hhea_ascent * anno_scale_eff
            )
        else:
            word_anno_y = round(units_per_em * upper_y_offset_ratio)

        # Hoist tables to locals once — every iteration would otherwise
        # do __getitem__ on the TTFont dict-like object, which involves
        # an attribute lookup chain in pure-Python land.
        base_hmtx = base_font["hmtx"]
        out_glyf = output_font["glyf"]
        out_hmtx = output_font["hmtx"]
        out_vmtx = output_font["vmtx"] if "vmtx" in output_font.keys() else None
        out_cmap = output_font.getBestCmap()

        processed_glyph_names: set[str] = set()
        cnt = 0

        # ── HarfBuzz buffer reuse ────────────────────────────────────────
        # One buffer for the whole composition phase. The inner loop
        # below calls `hb.shape` once per annotation string — for the
        # Mandarin mapping (~95k mapping rows × ~5-10 variants each)
        # that's 200-500k shape calls. Previously each call allocated
        # a fresh hb.Buffer(), churning through the WASM heap and
        # forcing Pyodide's GC to walk that many short-lived objects.
        # Hoisting the allocation out of the loop and calling
        # `clear_contents()` between uses keeps the underlying glyph
        # array in place — the API contract is the same (empty buffer
        # → add_str → guess_segment_properties → shape) but the
        # allocator only runs once.
        hb_buffer = hb.Buffer()

        def _shape_with(hb_f, text, glyph_order, glyph_order_set):
            """Shape `text` against `hb_f` via the loop-shared
            `hb_buffer`. Thin wrapper over the module-level
            `_shape_run` so the DIY mark path (`generate_mark_glyphs`)
            shares one implementation."""
            return _shape_run(
                hb_f, hb_buffer, text, glyph_order, glyph_order_set
            )

        def _annotation_width(anno_shaped):
            """Shaped-block width in OUTPUT units — delegates to the
            module-level `_shaped_width`."""
            return _shaped_width(
                anno_shaped, anno_scale_eff, anno_spacing_units
            )

        def _draw_annotation(pen, anno_shaped, x_start, y_offset):
            """Draw a shaped annotation run — delegates to the
            module-level `_draw_shaped`."""
            _draw_shaped(
                pen,
                anno_shaped,
                x_start,
                y_offset,
                anno_glyph_set,
                anno_scale_eff,
                anno_spacing_units,
            )

        # HarfBuzz font over the BASE font — built lazily, only when the
        # mapping actually contains word-unit (multi-char) entries.
        # CJK-only runs never pay for it.
        hb_base_font = None
        warned_no_base_bytes = False

        # HarfBuzz font over a SUBSTITUTION-LESS copy of the base font,
        # used to compute the exact ligature-component sequence for
        # scripts whose shaper preprocesses text (Thai SARA AM
        # decomposition). Built lazily on the first word that needs it.
        hb_bare_font = None

        def _buffer_component_names():
            """Glyph names currently in `hb_buffer`, in buffer order
            (None for out-of-range glyph IDs so callers can detect
            unresolvable words)."""
            names = []
            for info in hb_buffer.glyph_infos:
                gid = info.codepoint
                if 0 <= gid < len(base_glyph_order):
                    names.append(base_glyph_order[gid])
                else:
                    names.append(None)
            return names

        def _bare_components(text):
            """component_mode="bare" — the glyph sequence the real
            shaping buffer holds BEFORE any GSUB lookup runs: cmap +
            Unicode normalization + the script shaper's preprocessing,
            no substitutions. Direction is forced LTR so the output
            stays in LOGICAL order (with no GSUB, direction can't
            change which glyphs come out — only whether the buffer
            gets reversed)."""
            nonlocal hb_bare_font
            if hb_bare_font is None:
                import io as _io
                from fontTools.ttLib import TTFont as _TTFont
                bare = _TTFont(_io.BytesIO(base_font_bytes), lazy=True)
                for tag in ("GSUB", "GPOS"):
                    if tag in bare:
                        del bare[tag]
                _buf = _io.BytesIO()
                bare.save(_buf)
                bare.close()
                hb_bare_font = hb.Font(hb.Face(_buf.getvalue()))
            hb_buffer.clear_contents()
            hb_buffer.add_str(text)
            hb_buffer.guess_segment_properties()
            hb_buffer.direction = "ltr"
            hb.shape(hb_bare_font, hb_buffer)
            return _buffer_component_names()

        # GSUB features that run in the FINAL (buffer-global) stage of
        # the Indic shapers, i.e. at-or-after the point where our
        # `pres`-registered lookups fire. component_mode="basic"
        # disables exactly these, so the resulting glyph sequence is
        # the buffer state our lookups will actually see: post
        # syllable-reordering, post per-syllable basic features
        # (nukt/akhn/half/cjct conjunct formation by the font's own
        # GSUB), but before any late substitutions.
        _LATE_STAGE_FEATURES = (
            "init", "pres", "abvs", "blws", "psts", "haln",
            "calt", "liga", "clig", "dlig", "rlig",
        )

        def _basic_components(text):
            """component_mode="basic" — shape with the REAL base font
            (its preprocessing, reordering and per-syllable basic
            features all apply) but with the late buffer-global
            features disabled. See _LATE_STAGE_FEATURES."""
            hb_buffer.clear_contents()
            hb_buffer.add_str(text)
            hb_buffer.guess_segment_properties()
            hb_buffer.direction = "ltr"
            hb.shape(
                hb_base_font,
                hb_buffer,
                {f: False for f in _LATE_STAGE_FEATURES},
            )
            return _buffer_component_names()

        def _compose_word_entry(base_char, anno_strs_dict):
            """Compose ONE word-unit entry — all its annotation
            variants. Factored out of the main loop so the per-entry
            dispatch below stays readable; closes over the same fonts,
            glyph sets, scales/offsets and output tables as the
            single-char path and writes to the same structures."""
            nonlocal cnt, hb_base_font, warned_no_base_bytes

            if base_font_bytes is None:
                if not warned_no_base_bytes:
                    print(
                        "Warning: word-unit mapping entries present "
                        "but no base_font_bytes supplied — skipping "
                        "all word entries."
                    )
                    warned_no_base_bytes = True
                return
            if hb_base_font is None:
                hb_base_font = hb.Font(hb.Face(base_font_bytes))
                if base_axis_location:
                    hb_base_font.set_variations(
                        {
                            k: float(v)
                            for k, v in base_axis_location.items()
                        }
                    )

            # Shape the word once — all annotation variants share the
            # same base drawing. This is where Arabic contextual forms
            # (init/medi/fina), mandatory ligatures (lam-alef) and mark
            # anchoring happen, courtesy of the base font's own
            # GSUB/GPOS.
            base_shaped = _shape_with(
                hb_base_font,
                base_char,
                base_glyph_order,
                base_glyph_order_set,
            )
            if not base_shaped:
                return

            # Ligature components — the sequence word_liga_handler must
            # match. How they're computed is a per-script decision
            # (WordScript.component_mode — see csv_parser for the
            # cmap/bare/basic rationale).
            script = WORD_SCRIPTS.get(get_word_unit_script(base_char))
            mode = script.component_mode if script is not None else "cmap"
            if mode == "bare":
                components = _bare_components(base_char)
            elif mode == "basic":
                components = _basic_components(base_char)
            else:
                components = [
                    get_glyph_name_by_char(base_font, c)
                    for c in base_char
                ]
            if any(
                not isinstance(g, str) or g == ".notdef"
                for g in components
            ):
                print(
                    f"Skip word '{base_char}': component glyphs "
                    "unresolvable in the base font"
                )
                return
            if word_components is not None:
                word_components[base_char] = components

            word_adv = round(
                sum(adv for *_rest, adv in base_shaped) * base_scale
            )

            # Caret positions at letter-cluster boundaries (visual
            # order, unscaled units; scaled + offset per variant
            # below). A boundary exists wherever the cluster value
            # changes between consecutive shaped glyphs — marks share
            # their base's cluster and base-font-internal ligatures
            # merge clusters, so this naturally yields "between
            # letters the user typed" positions.
            carets_unscaled: list[float] = []
            x_run = 0.0
            for j, (_n, cluster, _xo, _yo, xadv) in enumerate(base_shaped):
                x_run += xadv
                if (
                    j < len(base_shaped) - 1
                    and base_shaped[j + 1][1] != cluster
                ):
                    carets_unscaled.append(x_run)

            for i, anno_str in enumerate(anno_strs_dict.keys()):
                # Word glyphs ALWAYS get fresh names — there is no
                # original single glyph to re-use for variant 0.
                new_glyph_name = GLYPH_PREFIX + str(cnt).zfill(6)
                while new_glyph_name in output_glyph_name_used:
                    cnt += 1
                    new_glyph_name = GLYPH_PREFIX + str(cnt).zfill(6)

                anno_shaped = _shape_with(
                    hb_font,
                    anno_str,
                    anno_glyph_order,
                    anno_glyph_order_set,
                )
                anno_len = _annotation_width(anno_shaped)

                # If the annotation is wider than the word, widen the
                # glyph's advance so it doesn't collide with its
                # neighbours; both word and annotation are centred in
                # whatever the final advance is.
                total_advance = max(word_adv, int(anno_len))
                word_x0 = (total_advance - word_adv) / 2

                pen = TTGlyphPen(output_glyph_set)
                x_cursor = 0.0
                for b_name, _cluster, xoff, yoff, xadv in base_shaped:
                    if b_name in base_glyph_set:
                        # The word always sits ON the baseline
                        # (deliberately NOT base_y_offset — raising
                        # the word would knock it out of alignment
                        # with surrounding un-annotated text).
                        _draw_decomposed(
                            base_glyph_set,
                            b_name,
                            TransformPen(
                                pen,
                                (
                                    base_scale,
                                    0,
                                    0,
                                    base_scale,
                                    word_x0
                                    + x_cursor
                                    + xoff * base_scale,
                                    yoff * base_scale,
                                ),
                            ),
                        )
                        x_cursor += xadv * base_scale

                _draw_annotation(
                    pen,
                    anno_shaped,
                    (total_advance - anno_len) / 2,
                    word_anno_y,
                )

                glyph = pen.glyph()
                # hmtx LSB should track the outline's real xMin
                # (TTGlyphPen emits simple glyphs with a flat
                # `coordinates` array, so this is cheap).
                lsb = 0
                coords = getattr(glyph, "coordinates", None)
                if coords is not None and len(coords):
                    lsb = round(min(x for x, _y in coords))
                    if word_metrics is not None:
                        ys = [y for _x, y in coords]
                        word_metrics["min_y"] = min(
                            word_metrics.get("min_y", 0), min(ys)
                        )
                        word_metrics["max_y"] = max(
                            word_metrics.get("max_y", 0), max(ys)
                        )

                out_hmtx[new_glyph_name] = (total_advance, lsb)
                if out_vmtx is not None:
                    # Only relevant when the BASE font carries vmtx
                    # (CJK base + word entries — unusual but legal):
                    # fontTools' vmtx compiler requires an entry for
                    # every glyph in the glyph order.
                    out_vmtx[new_glyph_name] = (units_per_em, 0)
                out_glyf[new_glyph_name] = glyph
                output_glyph_name_used[new_glyph_name] = True
                mapping[base_char][anno_str] = (new_glyph_name, i)
                # NO cmap entry — multi-char keys have no codepoint.
                # The glyph is reached via word_liga_handler's GSUB.

                if ligature_carets is not None and carets_unscaled:
                    ligature_carets[new_glyph_name] = [
                        round(word_x0 + c * base_scale)
                        for c in carets_unscaled
                    ]

        for base_char, anno_strs_dict in mapping.items():
            # Multi-char keys are word-unit entries (Arabic / Thai —
            # see csv_parser.WORD_SCRIPTS); single chars take the
            # original CJK-style path below.
            if len(base_char) > 1:
                _compose_word_entry(base_char, anno_strs_dict)
                continue

            # ──────────────────── single-char entries ────────────────────
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
                _draw_decomposed(
                    base_glyph_set,
                    glyph_name,
                    TransformPen(
                        pen, (base_scale, 0, 0, base_scale, 0, base_y_offset)
                    ),
                )

                # Shape the annotation string with HarfBuzz — this
                # applies the annotation font's GSUB rules (Indic
                # reordering, Arabic positional forms, …) and GPOS
                # positioning (mark-to-base anchors that put Thai
                # vowels above their consonants, kerning, …), then
                # draw the run centred over the scaled base. The
                # shaping/layout mechanics are shared with the
                # word-unit path — see _shape_with /
                # _annotation_width / _draw_annotation above.
                anno_shaped = _shape_with(
                    hb_font,
                    anno_str,
                    anno_glyph_order,
                    anno_glyph_order_set,
                )
                anno_len = _annotation_width(anno_shaped)
                _draw_annotation(
                    pen,
                    anno_shaped,
                    (base_advance_width * base_scale - anno_len) / 2,
                    anno_y_offset,
                )

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
                composed_glyph = pen.glyph()
                # Track the composed glyph's ink extent so the caller can
                # auto-fit the output ascent to the tallest annotation
                # (see char_metrics in the docstring). TTGlyphPen emits a
                # simple glyph with a flat `coordinates` array; empty for
                # ink-less glyphs (skip those).
                if char_metrics is not None:
                    coords = getattr(composed_glyph, "coordinates", None)
                    if coords is not None and len(coords):
                        ys = [y for _x, y in coords]
                        char_metrics["max_y"] = max(
                            char_metrics.get("max_y", 0), max(ys)
                        )
                        char_metrics["min_y"] = min(
                            char_metrics.get("min_y", 0), min(ys)
                        )
                out_glyf[new_glyph_name] = composed_glyph
                output_glyph_name_used[new_glyph_name] = True
                mapping[base_char][anno_str] = (new_glyph_name, i)
                if i == 0:
                    out_cmap[ord(base_char)] = new_glyph_name

            # ── DIY bare scaled-base glyph ───────────────────────────
            # A mapped char's default glyph (variant 0) carries its
            # baked default reading, so the manual mark path can't stack
            # a mark on it without colliding. Emit an annotation-free
            # scaled base, drawn the way scale_glyphs centres an
            # un-annotated glyph (x-centred, so a stripped base blends
            # with surrounding un-annotated CJK and sits under the
            # em-centred mark), and record default→bare for the strip
            # GSUB the manual path builds later. Gated so non-DIY builds
            # add nothing. One per base glyph (deduped on glyph_name).
            if (
                emit_bare_bases
                and bare_base_map is not None
                and glyph_name not in bare_base_map
            ):
                bare_name = f"{BARE_PREFIX}{ord(base_char):06X}"
                while bare_name in output_glyph_name_used:
                    cnt += 1
                    bare_name = GLYPH_PREFIX + str(cnt).zfill(6)
                bare_pen = TTGlyphPen(output_glyph_set)
                # x-centre the scaled base (same effective placement the
                # baked composite ends up at), so a DIY-annotated 行 sits
                # at the same x as the automatic composite 行.
                bare_x = (base_advance_width * (1 - base_scale)) / 2
                _draw_decomposed(
                    base_glyph_set,
                    glyph_name,
                    TransformPen(
                        bare_pen,
                        (base_scale, 0, 0, base_scale, bare_x, base_y_offset),
                    ),
                )
                out_glyf[bare_name] = bare_pen.glyph()
                out_hmtx[bare_name] = (
                    base_advance_width,
                    round(base_hmtx[glyph_name][1] * base_scale + bare_x),
                )
                if out_vmtx is not None and glyph_name in base_glyph_order_set:
                    out_vmtx[bare_name] = base_font["vmtx"][glyph_name]
                output_glyph_name_used[bare_name] = True
                bare_base_map[glyph_name] = bare_name

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
    anno_scale: float = 0.25,
    base_scale: float = 0.75,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    anno_below: bool = False,
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
        anno_below=anno_below,
    )
    scale_glyphs(
        base_font,
        output_font,
        base_font.getGlyphOrder(),
        base_scale,
        skip_glyph_names=processed,
    )


def generate_mark_glyphs(
    anno_font,
    anno_font_bytes,
    output_font,
    pua_map,
    *,
    anno_scale: float = 0.25,
    anno_spacing: float = 0.0,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    anno_below: bool = False,
    base_descent: int = 0,
    base_scale: float = 0.75,
    assumed_base_advance: float | None = None,
    mark_x_offset: float = 0.0,
    anno_axis_location: dict | None = None,
    base_axis_location: dict | None = None,
    char_metrics: dict | None = None,
):
    """Compose one **zero-advance combining mark** glyph per DIY
    annotation string and map it to its Plane-15 PUA codepoint.

    This is the manual-annotation counterpart to
    `generate_annotated_glyphs`: instead of baking ``base + annotation``
    into a composite, it draws the annotation **alone**, horizontally
    centred over the *assumed* base cell at ``upper_y_offset_ratio`` (or
    at the baseline if ``invert``), with a **zero advance width** so it
    stacks over whatever base precedes it — exactly how a Thai vowel mark
    combines. The position is baked into the mark's own outline, so **no
    GPOS mark-to-base anchors are needed** (the same robustness trade the
    composite path makes).

    ⚠ **Full-width / CJK assumption.** The mark is ONE shared glyph reused
    after any base, so it cannot know the advance of the specific base it
    will follow — it must assume one, via ``assumed_base_advance`` (default
    = the output em). This is exact for full-width CJK ideographs
    (advance == em). For variable-width bases (Latin, Thai consonants,
    Arabic, Devanagari, …) the real advance differs and the mark sits
    off-centre over the base by ~(real_advance − assumed)/2; the DIY typed
    path is therefore a **CJK / full-width-base feature**. (Non-CJK *base*
    scripts are handled instead by the word-unit composite path, which
    bakes base+annotation into a single glyph.)

    `pua_map` is ``{annotation_string: codepoint}`` from
    `diy_handler.build_diy_inventory`. Each mark glyph is named
    ``wingfontmark<CODEPOINT-HEX>`` (stable, collision-free) and given a
    cmap entry at its codepoint in every format-12/13 subtable.

    The shaping + drawing reuse the shared `_shape_run` / `_shaped_width`
    / `_draw_shaped` helpers, so a DIY annotation renders identically to
    the same string baked into a composite. `anno_scale` is normalised by
    ``output_upm / anno_upm`` exactly as in the composite path, so the
    two paths match visually.

    When `char_metrics` (a dict) is passed, its ``"min_y"`` / ``"max_y"``
    keys are updated with the extreme ink Y of the mark glyphs, so the
    caller's auto-fit-ascent can keep tall marks from being clipped (the
    mark counterpart to the composite path's `char_metrics`).

    Returns the list of mark glyph names that were added (empty if
    `pua_map` is empty). Later phases tag these GDEF class 3 (mark) and
    build the base-strip + typed-letter ligature lookups that reach them.
    """
    import uharfbuzz as hb

    if not pua_map:
        return []

    hb_face = hb.Face(anno_font_bytes)
    hb_font = hb.Font(hb_face)
    if anno_axis_location:
        hb_font.set_variations(
            {k: float(v) for k, v in anno_axis_location.items()}
        )

    with step_timer("diy mark glyph composition") as timer:
        anno_glyph_set = anno_font.getGlyphSet(location=anno_axis_location)
        output_glyph_set = output_font.getGlyphSet(location=base_axis_location)
        anno_glyph_order = anno_font.getGlyphOrder()
        anno_glyph_order_set = set(anno_glyph_order)

        # Output UPM (the output font inherited the base font's head).
        units_per_em = output_font["head"].unitsPerEm

        # ── Assumed base advance — the full-width / CJK assumption ───────
        # A mark is ONE shared glyph reused after ANY base, so at draw time
        # it cannot know the advance of the specific base that will precede
        # it; it must assume a single value. We assume the base advances by
        # exactly one em (full-width), which is true for CJK ideographs.
        # For variable-width bases (Latin, Thai consonants, Arabic, …) the
        # real advance differs, so the mark — centred over this assumed
        # advance — sits off-centre over the base by ~(real_adv − assumed)/2.
        # The value is exposed so a caller targeting a monospaced non-em
        # advance can override it; default = the em.
        if assumed_base_advance is None:
            assumed_base_advance = units_per_em
        anno_units_per_em = anno_font["head"].unitsPerEm
        # Same UPM normalization as generate_annotated_glyphs so a DIY
        # mark and a baked composite of the same string are the same size.
        anno_scale_eff = anno_scale * units_per_em / anno_units_per_em
        anno_spacing_units = round(units_per_em * anno_spacing)

        # Marks sit where the composite path puts its annotation. Three
        # regimes — see _compose_char_entry's matching block for the
        # full design rationale:
        #
        #   • default: anno ABOVE the base at +upper_y_offset_ratio.
        #   • `anno_below`: anno DROPS into the descent area, top at
        #     the scaled base-descent. Same formula the composite path
        #     uses so a DIY mark and a baked composite of the same
        #     string land at the same y.
        #   • `invert` (legacy): anno parked at y=0 (baseline). The
        #     base-lift that the composite does has no analogue here —
        #     the mark is a standalone glyph drawn after a separately-
        #     drawn base — so legacy invert here just means "anno on
        #     baseline".
        anno_hhea_ascent = max(0, anno_font["hhea"].ascent)
        if anno_below:
            anno_y_offset = round(
                base_descent * base_scale
                - anno_hhea_ascent * anno_scale_eff
            )
        elif invert:
            anno_y_offset = 0
        else:
            anno_y_offset = round(units_per_em * upper_y_offset_ratio)

        out_glyf = output_font["glyf"]
        out_hmtx = output_font["hmtx"]
        out_vmtx = output_font["vmtx"] if "vmtx" in output_font.keys() else None

        hb_buffer = hb.Buffer()
        mark_names: list[str] = []
        skipped: list[str] = []

        # Deterministic order (by codepoint) for stable glyph-order diffs.
        for anno_str, cp in sorted(pua_map.items(), key=lambda kv: kv[1]):
            mark_name = f"{MARK_PREFIX}{cp:05X}"

            anno_shaped = _shape_run(
                hb_font, hb_buffer, anno_str, anno_glyph_order,
                anno_glyph_order_set,
            )
            if not anno_shaped:
                skipped.append(anno_str)
                continue

            anno_len = _shaped_width(
                anno_shaped, anno_scale_eff, anno_spacing_units
            )

            pen = TTGlyphPen(output_glyph_set)
            # The mark is a TRAILING, zero-advance glyph: the shaper draws
            # it at the cursor AFTER the preceding base, i.e. one
            # `assumed_base_advance` to the right of the base cell's origin.
            # To centre its ink OVER that base we draw the annotation back
            # by that advance and centre it within it — the x-centred bare
            # base ends up at the same centre, so the annotation lands
            # centred over it (exactly so when the real base advance equals
            # `assumed_base_advance`, i.e. a full-width CJK base).
            #
            # `mark_x_offset` is an optional renderer-compensation nudge,
            # expressed as a fraction of the output em and applied to every
            # mark. Default 0 keeps the geometric centre (correct in
            # DirectWrite/Word and print). Some browsers position the
            # orphaned cross-run mark from a pen origin ~0.125em to the right
            # of the font's assumption; a negative offset (e.g. -0.0625em)
            # can split that difference. It is NOT baked by default because
            # it trades Word centring for browser centring — see
            # HYBRID_ANNOTATION_DESIGN.md §"Cross-run positioning".
            mark_x_start = (
                -(assumed_base_advance + anno_len) / 2
                + mark_x_offset * units_per_em
            )
            _draw_shaped(
                pen,
                anno_shaped,
                mark_x_start,
                anno_y_offset,
                anno_glyph_set,
                anno_scale_eff,
                anno_spacing_units,
            )

            glyph = pen.glyph()
            # Zero advance → combining behaviour; lsb tracks the real ink
            # xMin (TTGlyphPen emits a simple glyph with a flat
            # `coordinates` array — empty for ink-less strings, skipped).
            lsb = 0
            coords = getattr(glyph, "coordinates", None)
            if coords is not None and len(coords):
                xs = [x for x, _y in coords]
                ys = [y for _x, y in coords]
                lsb = round(min(xs))
                if char_metrics is not None:
                    char_metrics["max_y"] = max(
                        char_metrics.get("max_y", 0), max(ys)
                    )
                    char_metrics["min_y"] = min(
                        char_metrics.get("min_y", 0), min(ys)
                    )

            out_glyf[mark_name] = glyph
            out_hmtx[mark_name] = (0, lsb)
            if out_vmtx is not None:
                out_vmtx[mark_name] = (units_per_em, 0)

            # NO cmap entry: marks are reached ONLY through the typed
            # full-width input ligature (mark_input_handler). The codepoint
            # `cp` is used purely as a stable, unique glyph-name suffix —
            # there is no PUA "type the codepoint" route (it isn't
            # user-typable, and the typed full-width sequence already
            # survives copy-paste).

            mark_names.append(mark_name)

        # Sync glyf.glyphOrder → font.glyphOrder so the subsetter and any
        # later table builders see the new mark names (mirrors the tail
        # of generate_annotated_glyphs).
        output_font.setGlyphOrder(output_font["glyf"].glyphOrder)

        if skipped:
            print(
                f"[diy] {len(skipped)} annotation(s) produced no glyphs "
                f"and were skipped (e.g. {skipped[0]!r})"
            )
        timer.note(f"{len(mark_names)} mark glyphs")
        return mark_names
