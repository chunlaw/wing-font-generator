"""
Runner shim that adapts wing-font.py for invocation from JavaScript via Pyodide.

The original CLI in `wingfont_main.py` (renamed from `wing-font.py` because
hyphens are not valid in Python module names) reads file paths and writes
outputs to disk. In a browser there is no real disk, so this module:

  1. Writes the uploaded base font, annotation font, and mapping CSV to a
     scratch directory in Pyodide's in-memory filesystem (MEMFS).
  2. Calls `wingfont_main.main(...)` with that scratch directory as the
     output prefix.
  3. Reads the resulting `.ttf` and `.woff` back as bytes and returns them.

Two entry points:

  * generate(...) — full pipeline. Used by the Step 4 "real" run that
    produces the user's downloadable font.

  * prepare_preview_fonts(...) — pre-trim the input fonts to just the
    chars likely needed for live previews, and cache the trimmed bytes
    in a module-global. Subsequent generate() calls with
    use_trim_cache=True pick up the cached trim and skip the slow
    TTFont.open + subset on the original 10-20 MB CJK font, collapsing
    preview latency from 2-4 s to <1 s.

Everything is synchronous; the caller (a Web Worker) is responsible
for not blocking the UI.
"""

import contextlib
import hashlib
import io
import os
import sys
import time
import traceback
from typing import Optional, Tuple

# Ensure /home/pyodide/wingfont is on sys.path so `import wingfont_main`,
# `import mappings.csv_parser`, etc. resolve to our bundled sources.
_WINGFONT_DIR = "/home/pyodide/wingfont"
if _WINGFONT_DIR not in sys.path:
    sys.path.insert(0, _WINGFONT_DIR)


# ---------------------------------------------------------------------------
# Pre-trim cache for live previews
# ---------------------------------------------------------------------------
#
# The full input font for a CJK base (e.g. ChironSungHK) weighs 10-20 MB
# and ~20k glyphs. TTFont.open() + fontTools subset() of the full glyph
# set together take 2-4 s in Pyodide every preview run, even though a
# single-mapping preview only needs ~10 glyphs.
#
# `prepare_preview_fonts()` runs the subset once over a "generous"
# char set (union of every char from every potentially-sampled
# mapping row), stashes the trimmed bytes here, and tags them with
# a content hash so subsequent generate() calls can swap in the
# trimmed version safely. The trimmed font is typically <100 KB, so
# the rest of the pipeline runs in a few hundred ms.
#
# The cache holds ONE entry; a new prepare_preview_fonts() call
# evicts whatever was there before. This is fine because the
# expected workflow is "edit mappings → preview → edit mappings →
# preview …" with the same font pair throughout. If the user later
# swaps fonts, the next prepare call simply re-trims.
#
# Tuple layout: (base_hash, anno_hash, chars_covered, base_bytes, anno_bytes)
_preview_trim_cache: Optional[Tuple[str, str, frozenset, bytes, bytes]] = None


def _hash_bytes(data: bytes) -> str:
    """Fast content fingerprint for cache keys. Not for security."""
    return hashlib.md5(data).hexdigest()


def _subset_font_to_chars(font_bytes: bytes, chars: frozenset) -> bytes:
    """
    Reduce a TTF/OTF to just the glyphs for the given Unicode chars
    (plus the recommended glyphs — .notdef, space, etc.). Preserves
    name table, layout features (we keep '*' so the wing-font
    pipeline's later GSUB additions blend with whatever feature
    machinery the input already had), and glyph names.

    Used as the one-off "pre-trim" step that lets every subsequent
    preview run open a tiny font instead of the 10-20 MB original.
    """
    # Lazy imports keep the module-load cheap for the
    # `prepare_preview_fonts` cache-hit path.
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont

    font = TTFont(io.BytesIO(font_bytes))
    opts = Options()
    # Glyph-set knobs: keep .notdef + recommended glyphs so the
    # font remains structurally valid even if all our requested
    # chars happened to be missing from the cmap.
    opts.notdef_glyph = True
    opts.notdef_outline = True
    opts.recommended_glyphs = True
    opts.glyph_names = True
    # '*' = preserve everything. The wing-font pipeline reads the
    # existing GSUB/GPOS, then *adds* its own rules; we don't want
    # subset to drop tables the pipeline assumes are there.
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    # Chars that aren't in the cmap are silently dropped instead
    # of raising. Important because we pass a union of all
    # mapping chars including annotation Latin letters that may
    # not exist in the base CJK font.
    opts.ignore_missing_glyphs = True
    opts.ignore_missing_unicodes = True

    subsetter = Subsetter(options=opts)
    subsetter.populate(text="".join(chars))
    subsetter.subset(font)

    out = io.BytesIO()
    font.save(out)
    return out.getvalue()


def prepare_preview_fonts(
    base_font_bytes: bytes,
    anno_font_bytes: bytes,
    chars_text: str,
    progress_cb=None,
) -> dict:
    """
    Pre-trim the input fonts to just the chars listed in `chars_text`
    and cache the result. Subsequent generate() calls with
    use_trim_cache=True will see the cache and skip the expensive
    TTFont.open + subset on the original full-size font.

    Idempotent: if the cache already holds a trim whose char set
    covers what's being requested for the same font hashes, returns
    immediately without redoing work.

    Returns a small dict with `{cached, elapsed_s?}` so the caller
    can log/measure if it cares.
    """
    global _preview_trim_cache

    chars = frozenset(c for c in chars_text if c.strip())
    if not chars:
        return {"cached": False, "reason": "no chars"}

    base_hash = _hash_bytes(base_font_bytes)
    anno_hash = _hash_bytes(anno_font_bytes)

    # Cache hit: previous trim covers the same font pair AND its
    # char set is a superset of what we need now. Subset-superset is
    # important because the workflow "preview char A, then add B to
    # mappings, then preview again" must invalidate.
    if _preview_trim_cache is not None:
        c_base, c_anno, c_chars, _, _ = _preview_trim_cache
        if (
            c_base == base_hash
            and c_anno == anno_hash
            and chars.issubset(c_chars)
        ):
            return {"cached": True}

    _emit(progress_cb, "Processing preview pre-trim...")
    t0 = time.perf_counter()

    # Subset both fonts to the same char set. fontTools' subset
    # silently drops chars that aren't in the cmap, so passing the
    # full union to both fonts is safe; the base font keeps its CJK
    # chars and ignores the Latin annotation chars, and vice versa.
    trimmed_base = _subset_font_to_chars(base_font_bytes, chars)
    trimmed_anno = _subset_font_to_chars(anno_font_bytes, chars)

    elapsed = time.perf_counter() - t0
    _preview_trim_cache = (
        base_hash,
        anno_hash,
        chars,
        trimmed_base,
        trimmed_anno,
    )

    _emit(
        progress_cb,
        f"Processing preview pre-trim... DONE ({elapsed:.1f}s, "
        f"{len(trimmed_base) // 1024} KB + {len(trimmed_anno) // 1024} KB)",
    )
    return {"cached": False, "elapsed_s": elapsed}


def _format_summary(timings: list[tuple[str, float]], total: float) -> list[str]:
    """Build a small monospace-friendly summary table.

    Returns a list of lines that the caller can _emit one-by-one. Done
    that way (rather than one big multi-line string) so each row
    arrives as its own progress event and they don't get coalesced by
    the UI's appendOrCoalesce trick.
    """
    if not timings:
        return []
    name_width = max(len(name) for name, _ in timings)
    name_width = max(name_width, len("Step"))
    # 8 chars handles up to "9999.9s" with room to spare.
    time_width = 8
    sep = "─" * (name_width + time_width + 3)

    lines = [
        "Per-step timing summary:",
        sep,
        f"  {'Step':<{name_width}}  {'Time':>{time_width}}",
        sep,
    ]
    for name, elapsed in timings:
        lines.append(f"  {name:<{name_width}}  {elapsed:>{time_width - 1}.1f}s")
    lines.append(sep)
    lines.append(f"  {'Total':<{name_width}}  {total:>{time_width - 1}.1f}s")
    lines.append(sep)
    return lines


def _emit(progress_cb, message: str) -> None:
    """Forward a status string to JS, if a callback was supplied."""
    if progress_cb is not None:
        try:
            progress_cb(message)
        except Exception:
            # Progress reporting is best-effort; never let it crash the run.
            pass


def generate(
    base_font_bytes: bytes,
    anno_font_bytes: bytes,
    mapping_csv_text: str,
    *,
    new_family_name: str | None = None,
    base_scale: float = 0.75,
    anno_scale: float = 0.15,
    anno_spacing: float = 0.0,
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    optimize: bool = True,
    use_trim_cache: bool = False,
    base_axis_location: dict | None = None,
    anno_axis_location: dict | None = None,
    progress_cb=None,
):
    """
    Run the wing-font pipeline end-to-end. Returns a dict:

        {
          "ttf":   <bytes>,
          "woff":  <bytes>,
          "stdout": <str>,   # captured stdout from the pipeline
        }

    When `use_trim_cache=True` AND `prepare_preview_fonts()` has been
    called with this same (base, anno) font pair, the cached
    pre-trimmed bytes are swapped in before the pipeline runs.
    That collapses the input-font load and the in-pipeline subset
    step from ~3 s to a few hundred ms — the main mechanism for
    sub-second live previews. The full-run path (Step 4) leaves the
    flag at its default `False` so it sees the original full-size
    font.

    Raises on failure; the worker should catch and forward the message.
    """

    # Wall-clock start — used for the final "All Done (Ns total)" line so
    # the user can see end-to-end runtime regardless of how many inner
    # steps printed their own timings.
    _t0_total = time.perf_counter()

    # Reset the process-global timing recorder so we don't accumulate
    # across runs in a long-lived Pyodide session.
    from utils import (
        get_step_timings,
        record_step_time,
        reset_step_timings,
    )
    reset_step_timings()

    # ── Pre-trim cache swap ────────────────────────────────────────
    # If the caller asked for the cache AND the cache holds a trim
    # matching our font pair, swap the input bytes for the trimmed
    # versions. We compare by content hash, not object identity, so
    # the JS side doesn't need to track which buffer was sent — it
    # just sets the flag and we figure it out from the bytes.
    if use_trim_cache and _preview_trim_cache is not None:
        c_base, c_anno, _c_chars, t_base_bytes, t_anno_bytes = _preview_trim_cache
        if (
            _hash_bytes(base_font_bytes) == c_base
            and _hash_bytes(anno_font_bytes) == c_anno
        ):
            _emit(
                progress_cb,
                f"Using pre-trimmed fonts "
                f"({len(t_base_bytes) // 1024} KB + "
                f"{len(t_anno_bytes) // 1024} KB)",
            )
            base_font_bytes = t_base_bytes
            anno_font_bytes = t_anno_bytes
        # Cache miss is silent — the run continues with the original
        # bytes, just slower. The JS side is responsible for calling
        # prepare_preview_fonts() before previews if it wants fast
        # ones.

    work_dir = "/tmp/wingfont_run"
    os.makedirs(work_dir, exist_ok=True)

    base_path = os.path.join(work_dir, "base.ttf")
    anno_path = os.path.join(work_dir, "anno.ttf")
    mapping_path = os.path.join(work_dir, "mapping.csv")
    output_prefix = os.path.join(work_dir, "output")

    # Step convention (matches utils.step_timer's output):
    #   "Processing X..."          shown immediately
    #   "Processing X... DONE (Ns)" shown when finished; UI replaces the
    # previous line in place via GenerateContext.appendOrCoalesce.
    _t0 = time.perf_counter()
    _emit(progress_cb, "Processing input files...")
    with open(base_path, "wb") as f:
        f.write(base_font_bytes)
    with open(anno_path, "wb") as f:
        f.write(anno_font_bytes)
    with open(mapping_path, "w", encoding="utf-8") as f:
        f.write(mapping_csv_text)
    _elapsed = time.perf_counter() - _t0
    record_step_time("input files", _elapsed)
    _emit(progress_cb, f"Processing input files... DONE ({_elapsed:.1f}s)")

    _t0 = time.perf_counter()
    _emit(progress_cb, "Processing module imports...")
    # Imported lazily so the import cost only hits when we actually generate.
    import wingfont_main  # noqa: E402
    _elapsed = time.perf_counter() - _t0
    record_step_time("module imports", _elapsed)
    _emit(progress_cb, f"Processing module imports... DONE ({_elapsed:.1f}s)")

    captured = io.StringIO()

    # Pyodide's stdout is forwarded to the JS console by default; we also
    # tee it through our own buffer so the caller can show progress in-page.
    class _Tee:
        def __init__(self, *streams):
            self.streams = streams

        def write(self, s):
            for stream in self.streams:
                stream.write(s)
            if progress_cb is not None and s and not s.isspace():
                # Strip trailing newlines for nicer status display.
                _emit(progress_cb, s.rstrip("\n"))
            return len(s)

        def flush(self):
            for stream in self.streams:
                try:
                    stream.flush()
                except Exception:
                    pass

    tee = _Tee(sys.stdout, captured)

    # The inner pipeline (chain_context_handler, liga_handler,
    # build_glyph, wing-font.py) prints its own granular
    # "Processing X..." → "Processing X... DONE" pairs, which the UI
    # coalesces into single updating lines. No outer wrapper needed.
    with contextlib.redirect_stdout(tee):
        try:
            wingfont_main.main(
                base_font_file=base_path,
                anno_font_file=anno_path,
                output_prefix=output_prefix,
                mapping=mapping_path,
                new_family_name=new_family_name,
                base_scale=base_scale,
                anno_scale=anno_scale,
                anno_spacing=anno_spacing,
                base_axis_location=base_axis_location,
                anno_axis_location=anno_axis_location,
                upper_y_offset_ratio=upper_y_offset_ratio,
                invert=invert,
                optimize=optimize,
                # WOFF is generated in JS via CompressionStream — much
                # faster than Pyodide doing it via wasm-compiled zlib.
                skip_woff=True,
            )
        except Exception:
            traceback.print_exc(file=tee)
            raise

    _t0 = time.perf_counter()
    _emit(progress_cb, "Processing output files...")
    with open(output_prefix + ".ttf", "rb") as f:
        ttf_bytes = f.read()
    _elapsed = time.perf_counter() - _t0
    record_step_time("output files", _elapsed)
    _emit(progress_cb, f"Processing output files... DONE ({_elapsed:.1f}s)")

    # Per-step summary table — emitted line-by-line so the UI's
    # appendOrCoalesce trick doesn't collapse it into one update.
    total_elapsed = time.perf_counter() - _t0_total
    for line in _format_summary(get_step_timings(), total_elapsed):
        _emit(progress_cb, line)

    _emit(progress_cb, f"All Done ({total_elapsed:.1f}s total)")
    # `woff` is intentionally None — the worker fills it in by running
    # the TTF bytes through the browser's CompressionStream, which is
    # an order of magnitude faster than Pyodide doing zlib in wasm.
    return {
        "ttf": ttf_bytes,
        "woff": None,
        "stdout": captured.getvalue(),
    }
