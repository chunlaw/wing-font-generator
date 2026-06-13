# wing-font.py

from fontTools.ttLib import TTFont
from mappings.csv_parser import (
    load_mapping,
    WORD_UNIT_SCRIPT_RANGES,
    get_word_unit_script,
)
from chain_context_handler import buildChainSub
from ivs_handler import buildIvs
from liga_handler import buildLiga, DEFAULT_TRIGGER_CHAR
from word_liga_handler import buildWordLiga, buildLigCarets
from build_glyph import generate_annotated_glyphs, scale_glyphs
import gc
import sys
import argparse
from fontTools import subset
from utils import get_glyph_name_by_char, step_timer
import string

WINDOWS_ENGLISH_IDS = 3, 1, 0x409
MAC_ROMAN_IDS = 1, 0, 0

# OpenType `maxp` table stores numGlyphs as a uint16 — hard cap 65,535.
# A font with more than that cannot be saved as TTF/OTF (struct.error
# during pack of format 'H'). We check predicted glyph count against a
# soft cap a touch below the absolute limit so the few structural
# glyphs the subsetter retains (.notdef, .null, CR, space, plus a
# handful introduced by GSUB build) don't push us over the edge
# AFTER the check passed.
OPENTYPE_NUMGLYPHS_CAP = 65535
GLYPH_BUDGET_SOFT_CAP = 65000


def _prepare_word_mode_fonts(
    base_font, output_font, base_font_file, base_axis_location
):
    """Word-unit (Arabic/Thai) mode needs raw base-font bytes for
    HarfBuzz shaping. Returns ``(base_font_bytes, output_font)`` —
    output_font may be REPLACED, see below.

    Two paths:

      * Base font was instanced from a variable master — the on-disk
        bytes don't match the in-memory static instance, so serialise
        it. This save runs with fontTools' DEFAULT serializer config
        (hb.repack enabled) — safe because the GSUB is still the
        source font's own (no wing lookups yet) — and it bakes
        Extension (type 7) wrapping into any overflow-prone lookups.
        We then RELOAD output_font from those very bytes: a
        freshly-instanced in-memory font has every lookup unwrapped,
        and big Arabic GSUB tables (Noto Nastaliq: ~200 lookups,
        ~2.5k subtables) make Phase 4's repacker-disabled save
        re-discover the Extension promotions one full GSUB recompile
        at a time (30s+ instead of ~1s). The round-trip preserves the
        baked-in wrapping through subset + save.
      * Static base — just read the file.
    """
    if base_axis_location and "fvar" not in base_font:
        import io as _io
        _buf = _io.BytesIO()
        base_font.save(_buf)
        base_font_bytes = _buf.getvalue()
        output_font.close()
        output_font = TTFont(_io.BytesIO(base_font_bytes))
    else:
        with open(base_font_file, "rb") as _f:
            base_font_bytes = _f.read()
    return base_font_bytes, output_font


def _word_mode_keep_glyphs(base_font, char_mapping, word_components):
    """Extra glyphs the optimize/subset path must keep for word-unit
    outputs:

      * the ligature-component glyphs of every mapped word — the match
        input the user actually types (post shaper-preprocessing,
        e.g. Thai NIKHAHIT);
      * the whole encoded repertoire of every word-unit script present
        (letters, marks, digits, punctuation, tatweel) so un-mapped
        words still render, the Arabic boundary-guard coverages stay
        meaningful, and the variant-override triggers survive;
      * the space glyph — Arabic words are space-separated and Thai
        uses spaces between clauses.
    """
    keep: list = []
    for comps in word_components.values():
        keep.extend(comps)
    scripts_present = {
        get_word_unit_script(key) for key in char_mapping if len(key) > 1
    }
    keep_ranges = [
        r
        for tag, ranges in WORD_UNIT_SCRIPT_RANGES.items()
        if tag in scripts_present
        for r in ranges
    ]
    base_cmap = base_font.getBestCmap() or {}
    for cp, g in base_cmap.items():
        if isinstance(g, str) and any(
            lo <= cp <= hi for lo, hi in keep_ranges
        ):
            keep.append(g)
    space_glyph = get_glyph_name_by_char(base_font, " ")
    if space_glyph:
        keep.append(space_glyph)
    return keep


def _auto_extend_vertical_metrics(output_font, word_metrics, margin=20):
    """Extend the output font's vertical metrics to the composed word
    glyphs' actual ink (plus a small safety margin) so neither direction
    gets clipped or overlaps the adjacent line: the below-the-word
    annotation default puts ink underneath the base font's descent, and
    the above-the-word `-v` variant can poke past its ascent.

    Unlike the CJK above-the-character path (and the --out-ascent flag),
    this extends the sTypo* metrics too, not just hhea + OS/2 win. The
    reason is line spacing: word-unit fonts add a whole extra row of
    annotation (a romanization line under each Arabic word, or above it
    when inverted), and the base fonts ship with `USE_TYPO_METRICS` set,
    so the apps that lay out multi-line text — Chrome, Firefox, Word,
    InDesign — derive line height from sTypoAscender/Descender. If those
    stayed at the base font's values while win/hhea grew, the reserved
    line box would be shallower than the annotation ink and the
    annotation row would collide with the next line as soon as line
    spacing is tightened. We know the exact ink extent here
    (`word_metrics`), so we set all three metric families consistently.

    This only fires for word-unit builds: `min_y`/`max_y` are populated
    solely by the word-composition path in build_glyph, so the CJK
    single-character fonts (including the Urdu/Thai annotation-on-CJK
    pairings) never reach these branches and keep their native line
    spacing."""
    os2 = output_font["OS/2"]
    if word_metrics.get("min_y") is not None:
        ink_floor = int(word_metrics["min_y"]) - margin
        if ink_floor < output_font["hhea"].descent:
            output_font["hhea"].descent = ink_floor
        if -ink_floor > os2.usWinDescent:
            os2.usWinDescent = -ink_floor
        if ink_floor < os2.sTypoDescender:
            os2.sTypoDescender = ink_floor
    if word_metrics.get("max_y") is not None:
        ink_top = int(word_metrics["max_y"]) + margin
        if ink_top > output_font["hhea"].ascent:
            output_font["hhea"].ascent = ink_top
        if ink_top > os2.usWinAscent:
            os2.usWinAscent = ink_top
        if ink_top > os2.sTypoAscender:
            os2.sTypoAscender = ink_top

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


# Low-profile attribution: append a single line to the OpenType
# `name` table's Description (nameID 10). Everything else — Copyright
# (0), Manufacturer (8), Designer (9), Vendor URL (11), Version (5) —
# is left exactly as the base font set it. This matches the design
# intent of "respect all real design work by the base font and
# annotation font; Wing Font is a tooling step, not a designer or
# manufacturer."
#
# Wording is deliberately framed as a modification note ("Annotations
# added via Wing Font") rather than a claim of ownership. URL is
# included so a curious user opening the font in macOS Font Book or
# Windows Font Properties has a one-step lookup back to the project.
WING_FONT_PROVENANCE_NOTE = (
    "Annotations added via Wing Font — https://wing-font.chunlaw.io"
)


def tag_wing_font_provenance(font):
    """Append a low-profile Wing Font note to the output font's
    Description (nameID 10).

    For each of the two name-table records Wing Font's pipeline
    consistently writes to (Windows-English and Mac-Roman), this:
      * Reads the existing Description record (may be missing —
        not every base font ships nameID 10).
      * If present, appends our note after a blank line so visual
        separation is preserved between the upstream description
        and the Wing Font line.
      * If absent, creates the record with just our note.

    No other nameIDs are touched. Manufacturer / Designer /
    Copyright / Vendor URL / Version stay exactly as the base font
    set them — Wing Font is a tooling step in the pipeline, not a
    designer or manufacturer of the typeface itself.
    """
    table = font["name"]
    for plat_id, enc_id, lang_id in (WINDOWS_ENGLISH_IDS, MAC_ROMAN_IDS):
        existing = table.getName(
            nameID=10,
            platformID=plat_id,
            platEncID=enc_id,
            langID=lang_id,
        )
        if existing is not None:
            existing_text = existing.toUnicode()
            # Idempotent — re-running the pipeline on an already-
            # tagged font (e.g. a regenerate-with-different-params
            # pass that reads a previously-built TTF) wouldn't
            # double-stamp it. Cheap substring check; the URL is
            # the stable signature regardless of whether we ever
            # tweak the leading text.
            if "wing-font.chunlaw.io" in existing_text:
                continue
            new_text = f"{existing_text}\n\n{WING_FONT_PROVENANCE_NOTE}"
        else:
            new_text = WING_FONT_PROVENANCE_NOTE
        table.setName(
            new_text,
            nameID=10,
            platformID=plat_id,
            platEncID=enc_id,
            langID=lang_id,
        )


def _check_glyph_count_budget(output_font, char_mapping, optimize, mapping_path):
    """Pre-flight check: bail early if the predicted output glyph count
    would exceed OpenType's hard 65,535 ceiling.

    Why here, not at save time:
    The composition phase (Phase 1) and the GSUB build phase (Phase 2)
    each take many seconds to minutes on large mappings — on Pyodide,
    saving with subset is also expensive. fontTools doesn't surface
    the overflow until ``output_font.save(...)`` packs the maxp table,
    by which time the user has spent minutes burning CPU on something
    that was structurally doomed from row count alone. We can predict
    it cheaply right after ``load_mapping`` and fail in milliseconds
    with an actionable message instead.

    Estimation:
      * each (key, [variant1, variant2, ...]) entry in char_mapping
        contributes ``len(variants)`` NEW glyphs — both for single-char
        bases (the variant glyphs sit alongside the original in the
        font) and for word-unit keys (the composed word glyph is
        entirely new — the base font doesn't have it);
      * with ``-opt``, fontTools.subset keeps only the glyphs Phase 4's
        keep-list explicitly names, plus a small set of structurally
        required ones (.notdef, .null, space, basic ASCII for fallback)
        — call that ~1,000 as a safe overestimate;
      * without ``-opt``, every glyph already in ``output_font`` survives
        AS WELL AS the new ones we add.

    So:
        predicted = NEW + (1000 if optimize else existing)
    """
    predicted_new = sum(len(v) for v in char_mapping.values())
    existing = output_font["maxp"].numGlyphs
    if optimize:
        # Subset will discard most of `existing`. The keep-list is
        # essentially char_mapping's keys + a small structural retain
        # set; 1,000 is a generous overestimate of "what the subsetter
        # holds onto regardless of mapping".
        predicted_total = predicted_new + 1000
        budget_explanation = (
            f"{predicted_new} new glyphs from your CSV + ~1,000 "
            "structural glyphs kept by --optimize subset"
        )
    else:
        predicted_total = existing + predicted_new
        budget_explanation = (
            f"{existing} glyphs already in the base font + "
            f"{predicted_new} new glyphs from your CSV"
        )
    if predicted_total > GLYPH_BUDGET_SOFT_CAP:
        # Hand the caller a concrete trim target rather than a vague
        # "make it smaller": ROWS = predicted_new − overshoot, capped
        # below SOFT - 1000-glyph buffer.
        budget_remaining_for_new = GLYPH_BUDGET_SOFT_CAP - (
            1000 if optimize else existing
        )
        target_row_estimate = max(0, budget_remaining_for_new)
        # Two-step error reporting: print the long friendly diagnostic
        # to stdout FIRST (so it lands in runner.py's tee'd progress
        # log — Step 4 in /generate displays everything captured here),
        # then raise a short RuntimeError to abort the pipeline.
        #
        # Why split it: SystemExit inherits from BaseException, not
        # Exception, so runner.py's `except Exception: print_exc()`
        # wouldn't catch it — the diagnostic would be lost. Using a
        # regular Exception keeps it inside the catch, but the
        # traceback would dwarf the message itself. Printing first
        # solves both: the user sees the actionable explanation in
        # the Step 4 log right where they're reading; the traceback
        # behind it is short and unobtrusive.
        diagnostic = (
            f"\n[wing-font] Pre-flight glyph budget exceeded.\n"
            f"\n"
            f"  Predicted output glyph count: {predicted_total:,}\n"
            f"  Computed as: {budget_explanation}.\n"
            f"  OpenType `maxp` hard cap:     "
            f"{OPENTYPE_NUMGLYPHS_CAP:,} (uint16).\n"
            f"  Safe budget (with margin):    "
            f"{GLYPH_BUDGET_SOFT_CAP:,}.\n"
            f"\n"
            f"Each row in the mapping CSV whose first column uses only\n"
            f"characters present in the base font becomes its own glyph\n"
            f"in the output (one composed glyph per word for word-unit\n"
            f"scripts like Thai/Arabic; one variant glyph per reading\n"
            f"for CJK). Mapping: {mapping_path}\n"
            f"\n"
            f"Trim the CSV so the result stays under the cap. As a\n"
            f"rough target: keep about the top {target_row_estimate:,}\n"
            f"rows (by weight — the third CSV column), then retry.\n"
            f"\n"
            f"Aborting before the {('composition + ') if not optimize else ''}"
            f"save phase to spare you the wasted compute.\n"
        )
        print(diagnostic, flush=True)
        raise RuntimeError(
            f"Pre-flight glyph budget exceeded: predicted "
            f"{predicted_total:,} glyphs > soft cap "
            f"{GLYPH_BUDGET_SOFT_CAP:,} (OpenType uint16 hard cap is "
            f"{OPENTYPE_NUMGLYPHS_CAP:,}). See the diagnostic printed "
            f"above for the recommended fix."
        )


def _format_cli_invocation(
    base_font_file,
    anno_font_file,
    mapping,
    output_prefix,
    new_family_name,
    base_scale,
    anno_scale,
    anno_spacing,
    upper_y_offset_ratio,
    invert,
    optimize,
    trigger_char,
    out_ascent,
    base_axis_location,
    anno_axis_location,
):
    """Build the equivalent `python wing-font.py ...` command from
    the kwargs main() actually received.

    Printed at the top of every run so the log shows what's about to
    happen in a copy-paste-runnable form. For CLI invocations the
    output is essentially the user's own command line round-tripped
    through argparse defaults; for Pyodide / runner.py invocations
    it's the same information but constructed from the runner's
    kwargs, giving the user a clean fallback CLI command they can
    run locally if Pyodide crashes mid-run (file paths will be
    Pyodide temp dirs they'd need to substitute).

    Args matching the CLI default are omitted to keep the line
    short. Variable-font axis_location dicts have no CLI flag yet
    and are surfaced as `# NOTE:` lines underneath.
    """
    import shlex

    parts = [
        "python wing-font.py",
        f"-i {shlex.quote(str(base_font_file))}",
        f"-a {shlex.quote(str(anno_font_file))}",
        f"-m {shlex.quote(str(mapping))}",
        f"-o {shlex.quote(str(output_prefix))}",
    ]
    if new_family_name:
        parts.append(f"-f {shlex.quote(str(new_family_name))}")
    if base_scale != 0.75:
        parts.append(f"-bs {base_scale}")
    if anno_scale != 0.25:
        parts.append(f"-as {anno_scale}")
    if anno_spacing != 0.0:
        parts.append(f"--anno-spacing {anno_spacing}")
    if upper_y_offset_ratio != 0.8:
        parts.append(f"-y {upper_y_offset_ratio}")
    if invert:
        parts.append("-v")
    if optimize:
        parts.append("-opt")
    if trigger_char != DEFAULT_TRIGGER_CHAR:
        # Empty string is a legitimate value (disables the trigger
        # + numeral path); shlex.quote handles it correctly.
        parts.append(f"--trigger-char {shlex.quote(str(trigger_char))}")
    if isinstance(out_ascent, (int, float)) and out_ascent > 0:
        parts.append(f"--out-ascent {int(out_ascent)}")

    # Variable-font axis pins: --base-axis TAG=VALUE / --anno-axis
    # TAG=VALUE, repeated per axis. Mirrors the CLI flag shape so the
    # printed command round-trips through argparse cleanly. Values
    # are emitted as int when they have no fractional part (cleaner
    # log) and as float otherwise.
    def _fmt_axis(value):
        return str(int(value)) if float(value).is_integer() else str(value)
    if base_axis_location:
        for tag, value in base_axis_location.items():
            parts.append(f"--base-axis {tag}={_fmt_axis(value)}")
    if anno_axis_location:
        for tag, value in anno_axis_location.items():
            parts.append(f"--anno-axis {tag}={_fmt_axis(value)}")

    return " ".join(parts)


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
    # First log line: the equivalent CLI command this invocation
    # corresponds to. Useful both for CLI users (round-tripping the
    # canonical flag forms) and for Pyodide / runner.py callers
    # (gives the Step 4 progress log a copy-paste-ready local-CLI
    # fallback if Pyodide crashes mid-run — the file paths will be
    # Pyodide temp dirs the user needs to substitute, but the
    # numeric / boolean args are exactly what was passed).
    print(_format_cli_invocation(
        base_font_file=base_font_file,
        anno_font_file=anno_font_file,
        mapping=mapping,
        output_prefix=output_prefix,
        new_family_name=new_family_name,
        base_scale=base_scale,
        anno_scale=anno_scale,
        anno_spacing=anno_spacing,
        upper_y_offset_ratio=upper_y_offset_ratio,
        invert=invert,
        optimize=optimize,
        trigger_char=trigger_char,
        out_ascent=out_ascent,
        base_axis_location=base_axis_location,
        anno_axis_location=anno_axis_location,
    ))

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

    # ── Pre-flight: glyph count vs OpenType's uint16 ceiling ─────────
    # Most word-unit mappings (Thai, Arabic) and the larger CJK
    # mappings can, in principle, push the output past `maxp`'s
    # 65,535-glyph hard cap. Without this check the failure surfaces
    # ~4 minutes in, deep inside `output_font.save(...)`, with an
    # opaque `struct.error: 'H' format requires 0 <= number <= 65535`.
    # Check now so we can bail with an actionable error in milliseconds.
    _check_glyph_count_budget(output_font, char_mapping, optimize, mapping)

    # ── Arabic word-unit entries ─────────────────────────────────────
    # Multi-character keys in char_mapping are joining-script (Arabic)
    # WORD entries: build_glyph shapes them against the BASE font and
    # composes the whole word into one glyph, word_liga_handler makes
    # them reachable via guarded ccmp ligation, and GDEF ligature
    # carets keep the text cursor steppable inside the word glyph.
    #
    # The HarfBuzz face for base-font shaping needs raw bytes that
    # MATCH the (possibly instanced) base_font TTFont — same two-path
    # logic as anno_font_bytes below.
    has_word_entries = any(len(k) > 1 for k in char_mapping)
    base_font_bytes = None
    if has_word_entries:
        # NB: output_font may be REPLACED here (round-trip through
        # hb-packed bytes when the base was instanced) — see the
        # helper's docstring for the save-time perf rationale.
        base_font_bytes, output_font = _prepare_word_mode_fonts(
            base_font, output_font, base_font_file, base_axis_location
        )

    # Filled by generate_annotated_glyphs with caret X positions at
    # letter boundaries of each composed word glyph; consumed by
    # buildLigCarets after the GSUB phase.
    ligature_carets: dict = {}

    # Filled with the extreme ink Y of the composed word glyphs.
    # Word-mode annotations sit BELOW the word by default, under the
    # base font's descent — Phase 4 extends the output font's descent
    # metrics to cover them so winDescent-clipping apps (Word, Pages,
    # Keynote, Canva) don't truncate the annotation.
    word_metrics: dict = {}

    # Filled with the exact ligature-component glyph sequence per word
    # (post shaper-preprocessing — matters for Thai SARA AM); consumed
    # by buildWordLiga and the subset keep-list.
    word_components: dict = {}

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

    # Append a low-profile "Annotations added via Wing Font — URL"
    # line to the output font's Description (nameID 10). All other
    # name-table fields stay exactly as the base font set them, so
    # the upstream designer and manufacturer keep full attribution;
    # Wing Font is acknowledged only as a tooling step. See
    # tag_wing_font_provenance() above for the rationale + wording
    # decisions.
    tag_wing_font_provenance(output_font)

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
        base_font_bytes=base_font_bytes,
        ligature_carets=ligature_carets,
        word_metrics=word_metrics,
        word_components=word_components,
    )
    # The base-font blob was only needed for HarfBuzz shaping of word
    # entries during composition; release it before the GSUB phase.
    del base_font_bytes

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

    # Step 2c — Arabic word entries: guarded ccmp word→glyph ligation
    # (+ tatweel variant cycling) and GDEF ligature carets. Both are
    # no-ops when the mapping has no multi-character keys.
    if has_word_entries:
        buildWordLiga(output_font, char_mapping, word_components)
        buildLigCarets(output_font, ligature_carets)

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
            for composed in value.values():
                # Entries whose composition was skipped (e.g. a word
                # whose shaping produced nothing) still hold the
                # parser's None placeholder — don't unpack those.
                if isinstance(composed, tuple):
                    glyphs_to_be_kept.append(composed[0])

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

        if has_word_entries:
            glyphs_to_be_kept.extend(
                _word_mode_keep_glyphs(
                    base_font, char_mapping, word_components
                )
            )

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
    #
    # ── Guard type ────────────────────────────────────────────────
    # The CLI path passes either None (default) or argparse-parsed
    # int. The in-browser path (worker → Pyodide) hands the value
    # in via `pyodide.toPy(params)`, where JS `null` arrives as
    # JsNull rather than Python `None` — a naive `is not None`
    # check lets JsNull through and the subsequent `int()` raises
    # TypeError. Asking for a real positive number explicitly
    # short-circuits None, JsNull, undefined, 0, "", and any other
    # "no override" shape uniformly.
    if isinstance(out_ascent, (int, float)) and out_ascent > 0:
        output_font["hhea"].ascent = int(out_ascent)
        output_font["OS/2"].usWinAscent = int(out_ascent)

    # ── Auto-extend metrics for word-unit (Arabic/Thai) outputs ───
    # Composed word glyphs can carry ink below the base font's
    # descent (below-the-word annotations) or above its ascent
    # (`-v`). Explicit --out-ascent above still wins if it asked for
    # more — this only ever widens.
    _auto_extend_vertical_metrics(output_font, word_metrics)

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
    parser.add_argument(
        '--anno-spacing',
        type=float,
        default=0.0,
        help=(
            "Extra inter-glyph gap inside an annotation string, in em "
            "units. 0 = natural advance (each glyph sits at its native "
            "advance position). Positive opens up — useful for CJK "
            "radical annotations (e.g. cangjie's 一弓十山) where the "
            "default packing looks like a single visual blob. Negative "
            "tightens; push too far and glyphs visibly overlap. The "
            "in-browser /generate Step 3 'Annotation spacing' slider "
            "drives this same parameter."
        ),
    )
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
    # ── Variable-font axis pin ─────────────────────────────────────
    # Both flags repeat: pass `--base-axis tag=value` once per axis
    # you want to pin. Mirrors what the in-browser /generate Step 1
    # axis sliders set on the base / annotation font slots.
    # Example:
    #   --base-axis wght=700 --base-axis ital=1
    # Each invocation collects one string; the post-parse loop below
    # splits the strings into a {tag: float} dict that's forwarded
    # to main() as base_axis_location / anno_axis_location.
    parser.add_argument(
        '--base-axis',
        action='append',
        default=[],
        metavar='TAG=VALUE',
        help=(
            "Pin a base-font variable axis. TAG is the 4-character "
            "OpenType axis tag (e.g. wght, ital, opsz, wdth); VALUE "
            "is a float within the axis's declared range. Repeat the "
            "flag for each axis. Mirrors the per-axis sliders in "
            "/generate Step 1. Example: --base-axis wght=700"
        ),
    )
    parser.add_argument(
        '--anno-axis',
        action='append',
        default=[],
        metavar='TAG=VALUE',
        help=(
            "Pin an annotation-font variable axis. Same syntax as "
            "--base-axis. Example: --anno-axis wght=500"
        ),
    )
    try:
        options = parser.parse_args()
    except:
        parser.print_help()
        exit()

    # Parse the TAG=VALUE strings collected by --base-axis /
    # --anno-axis into the {tag: float} dicts main() expects. None
    # when no flag was passed so the existing "skip instancing"
    # branch fires (matches the pre-flag default behaviour).
    def _parse_axis_args(items, label):
        if not items:
            return None
        loc = {}
        for raw in items:
            if "=" not in raw:
                parser.error(
                    f"--{label}-axis expects TAG=VALUE; got {raw!r}"
                )
            tag, value = raw.split("=", 1)
            tag = tag.strip()
            if not tag:
                parser.error(f"--{label}-axis: empty TAG in {raw!r}")
            try:
                loc[tag] = float(value)
            except ValueError:
                parser.error(
                    f"--{label}-axis: VALUE must be a number; "
                    f"got {value!r} in {raw!r}"
                )
        return loc

    base_axis_location = _parse_axis_args(options.base_axis, "base")
    anno_axis_location = _parse_axis_args(options.anno_axis, "anno")

    main(
        base_font_file = options.base_font_file,
        anno_font_file = options.anno_font_file,
        output_prefix = options.output_prefix,
        mapping = options.mapping,
        new_family_name = options.family_name,
        base_scale=options.base_scale,
        anno_scale=options.anno_scale,
        anno_spacing=options.anno_spacing,
        upper_y_offset_ratio=options.upper_y_offset_ratio,
        invert=options.invert,
        optimize=options.optimize,
        trigger_char=options.trigger_char,
        out_ascent=options.out_ascent,
        base_axis_location=base_axis_location,
        anno_axis_location=anno_axis_location,
    )