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

The function `generate(...)` is the single entry point. Everything is
synchronous; the caller (a Web Worker) is responsible for not blocking the UI.
"""

import contextlib
import io
import os
import sys
import time
import traceback

# Ensure /home/pyodide/wingfont is on sys.path so `import wingfont_main`,
# `import mappings.csv_parser`, etc. resolve to our bundled sources.
_WINGFONT_DIR = "/home/pyodide/wingfont"
if _WINGFONT_DIR not in sys.path:
    sys.path.insert(0, _WINGFONT_DIR)


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
    upper_y_offset_ratio: float = 0.8,
    invert: bool = False,
    optimize: bool = True,
    progress_cb=None,
):
    """
    Run the wing-font pipeline end-to-end. Returns a dict:

        {
          "ttf":   <bytes>,
          "woff":  <bytes>,
          "stdout": <str>,   # captured stdout from the pipeline
        }

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
