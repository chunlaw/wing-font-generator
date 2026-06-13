#!/usr/bin/env python3
"""
init_fonts.py — fetch the source TTFs into python/input_fonts/.

Wing Font's input fonts live in a SEPARATE repository
(https://github.com/chunlaw/wing-font-hub by default), served via
GitHub Pages. Keeping them out of this repo means:

  * A first-time clone of wing-font-generator is small (~5 MB) — no
    longer ~300 MB of TTF binaries on the wire. That matters for the
    project's target audience (teachers, designers, linguists) who
    aren't necessarily comfortable with multi-hundred-MB git clones.
  * No Git LFS quota / billing — the input-fonts repo is plain
    Git + Pages, and Pages bandwidth is free at any volume Wing Font
    will realistically push.
  * Input fonts version independently of pipeline code. Updating
    Noto Sans SC, or adding a new base font, doesn't bloat this
    repo's history.

When to run this
----------------

* First-time clone of wing-font-generator, before running any
  wing-font.py build or `yarn dev` in the web app.
* After pulling changes that bumped the FONT_FILES list below — new
  entries get fetched, existing files are left alone if already
  present.
* CI pipelines run it automatically (see
  `.github/workflows/deploy-pages.yml`).

Usage
-----

    python python/init_fonts.py

Idempotent: any TTF already at the expected size is left in place.
Pass `--force` to re-download regardless. The CDN base URL is
configurable via the `WING_FONT_INPUTS_URL` env var, defaulting to
the public chunlaw/wing-font-hub Pages site.
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Default base URL for the input-fonts CDN. Override via env var
# `WING_FONT_INPUTS_URL` for staging / fork mirrors.
DEFAULT_BASE_URL = "https://wing-font-hub.chunlaw.io"

# Single source of truth for which TTFs the pipeline needs. Keep in
# sync with sync-python.mjs's MANIFEST (any `input_fonts/` entry there
# should appear here) and with the input-fonts repo's actual contents.
# A divergence will surface either as a download 404 (this list has a
# font the CDN doesn't host) or as `wing-font.py` complaining about a
# missing file (the MANIFEST references a font this list didn't fetch).
FONT_FILES: list[str] = [
    "ChironHeiHK-B.ttf",
    "ChironHeiHK-R.ttf",
    "ChironSungHK-R-It.ttf",
    "ChironSungHK-R.ttf",
    "GoogleSans-VariableFont_GRAD,opsz,wght.ttf",
    "Huninn-Regular.ttf",
    "MPLUSRounded1c-Regular.ttf",
    "NotoSansJP-VariableFont_wght.ttf",
    "NotoSansHK-VariableFont_wght.ttf",
    "NotoSansKR-VariableFont_wght.ttf",
    "NotoSansSC-VariableFont_wght.ttf",
    "NotoSansTC-VariableFont_wght.ttf",
    "NotoSansTagalog-Regular.ttf",
    "NotoSansGurmukhi-VariableFont_wdth,wght.ttf",
    "NotoNastaliqUrdu-VariableFont_wght.ttf",
    # NotoSansArabic — used as the BASE for the first Arabic word-
    # unit curated font (the experimental word-unit pipeline that
    # composes whole Arabic words into single annotated glyphs with
    # the DIN 31635 romanization above). Naskh-style (general MSA
    # body-text rendering) — distinct from the Nastaliq above which
    # is the Urdu calligraphic style. Variable axes: wdth + wght.
    # OFL (Google Fonts).
    "NotoSansArabic-VariableFont_wdth,wght.ttf",
    "Hind-Regular.ttf",
    "NotoSerif-Regular.ttf",
    "SourceHanSerif-Regular.ttf",
    "XiaolaiSC-Regular.ttf",
    "mplus-1m-medium.ttf",
]

# Files smaller than this are treated as broken downloads. Any
# legitimate TTF here is at least a few hundred KB; tripping below 1
# KiB almost always means a 404 page got saved with a .ttf extension
# (the same failure mode `wing-font.py`'s input-size guard catches).
_MIN_FONT_BYTES = 1024

# Custom user-agent for download requests. urllib's default UA is
# literally "Python-urllib/3.X", which Cloudflare's default bot-
# mitigation managed rules block with a 403 — even though the same
# URL serves 200 to curl, browsers, etc. The chunlaw.io apex is
# behind Cloudflare, so we hit that rule on every fetch unless we
# identify as something less automated-sounding. Picking a UA
# string that names this tool gives any future Cloudflare operator
# (or upstream-font-repo maintainer) a clear signal about who's
# pulling files.
_USER_AGENT = (
    "wing-font-generator-init-fonts "
    "(+https://github.com/chunlaw/wing-font-generator)"
)


def _input_fonts_dir() -> Path:
    """`python/input_fonts/` resolved from this script's location."""
    return Path(__file__).resolve().parent / "input_fonts"


def _is_usable(path: Path) -> bool:
    """File exists and is at least minimally font-shaped (size > 1 KiB)."""
    try:
        return path.is_file() and path.stat().st_size >= _MIN_FONT_BYTES
    except OSError:
        return False


def _fetch_one(url: str, dest: Path) -> None:
    """Download `url` to `dest`. Atomic-replace on success.

    We write to a sibling `*.partial` path and rename only after the
    full body is received, so a Ctrl+C mid-download doesn't leave a
    truncated TTF that `_is_usable()` would mis-detect as good.
    """
    tmp = dest.with_suffix(dest.suffix + ".partial")
    try:
        # Build an explicit Request rather than passing the URL
        # string directly — `urlopen(str)` sends urllib's default
        # `Python-urllib/X.Y` user-agent, which Cloudflare blocks
        # on chunlaw.io with a 403. See _USER_AGENT comment.
        req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(req) as resp:
            tmp.write_bytes(resp.read())
        # Sanity-check the freshly-downloaded file before renaming so
        # the atomic swap only commits real fonts. Anything smaller
        # than _MIN_FONT_BYTES is almost certainly an error page.
        if tmp.stat().st_size < _MIN_FONT_BYTES:
            head = tmp.read_bytes()[:80].decode("utf-8", errors="replace")
            tmp.unlink(missing_ok=True)
            raise RuntimeError(
                f"download from {url} is only {tmp.stat().st_size} byte(s); "
                f"first bytes: {head!r}"
            )
        tmp.replace(dest)
    except urllib.error.HTTPError as e:
        tmp.unlink(missing_ok=True)
        raise SystemExit(
            f"HTTP {e.code} fetching {url}.\n"
            f"  If you forked the input-fonts repo, set "
            f"WING_FONT_INPUTS_URL to your fork's Pages URL.\n"
            f"  If chunlaw/wing-font-hub has dropped this font, "
            f"either add it back or remove it from FONT_FILES in "
            f"init_fonts.py."
        )
    except urllib.error.URLError as e:
        tmp.unlink(missing_ok=True)
        raise SystemExit(
            f"Network error fetching {url}: {e.reason}.\n"
            f"  Check connectivity, or override WING_FONT_INPUTS_URL "
            f"to a reachable mirror."
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Wing Font's input TTFs from the input-fonts CDN.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download every font even if already present.",
    )
    parser.add_argument(
        "--base-url",
        default=os.environ.get("WING_FONT_INPUTS_URL", DEFAULT_BASE_URL),
        help=(
            "Base URL of the input-fonts CDN. Defaults to "
            f"$WING_FONT_INPUTS_URL or {DEFAULT_BASE_URL!r}."
        ),
    )
    args = parser.parse_args(argv)

    base_url = args.base_url.rstrip("/")
    dest_dir = _input_fonts_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)

    print(f"Input-fonts source: {base_url}")
    print(f"Destination:        {dest_dir}")

    fetched, skipped, failed = 0, 0, 0
    for name in FONT_FILES:
        dest = dest_dir / name
        if not args.force and _is_usable(dest):
            print(f"  ✓ already present: {name}")
            skipped += 1
            continue
        url = f"{base_url}/{name}"
        print(f"  ⇣ fetching:         {name}")
        try:
            _fetch_one(url, dest)
            fetched += 1
        except SystemExit:
            failed += 1
            # Bubble up the formatted SystemExit message for the
            # FIRST failure rather than continuing — if the URL is
            # wrong, every subsequent attempt is wasted bandwidth.
            raise

    print(
        f"init_fonts: {fetched} fetched, {skipped} already present"
        + (f", {failed} failed" if failed else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
