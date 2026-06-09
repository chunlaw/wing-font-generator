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

import os
import sys
import io
import contextlib
import traceback

# Ensure /home/pyodide/wingfont is on sys.path so `import wingfont_main`,
# `import mappings.csv_parser`, etc. resolve to our bundled sources.
_WINGFONT_DIR = "/home/pyodide/wingfont"
if _WINGFONT_DIR not in sys.path:
    sys.path.insert(0, _WINGFONT_DIR)


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

    work_dir = "/tmp/wingfont_run"
    os.makedirs(work_dir, exist_ok=True)

    base_path = os.path.join(work_dir, "base.ttf")
    anno_path = os.path.join(work_dir, "anno.ttf")
    mapping_path = os.path.join(work_dir, "mapping.csv")
    output_prefix = os.path.join(work_dir, "output")

    _emit(progress_cb, "Writing inputs to virtual filesystem...")
    with open(base_path, "wb") as f:
        f.write(base_font_bytes)
    with open(anno_path, "wb") as f:
        f.write(anno_font_bytes)
    with open(mapping_path, "w", encoding="utf-8") as f:
        f.write(mapping_csv_text)

    _emit(progress_cb, "Importing wing-font modules...")
    # Imported lazily so the import cost only hits when we actually generate.
    import wingfont_main  # noqa: E402

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

    _emit(progress_cb, "Running pipeline (this can take 30-120s)...")
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
            )
        except Exception:
            traceback.print_exc(file=tee)
            raise

    _emit(progress_cb, "Reading generated font files...")
    with open(output_prefix + ".ttf", "rb") as f:
        ttf_bytes = f.read()
    with open(output_prefix + ".woff", "rb") as f:
        woff_bytes = f.read()

    _emit(progress_cb, "Done.")
    return {
        "ttf": ttf_bytes,
        "woff": woff_bytes,
        "stdout": captured.getvalue(),
    }
