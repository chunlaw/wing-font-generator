"""`wing-font fetch` — download input fonts and mapping CSVs.

Neither ships inside the pip package: the fonts are OFL binaries hosted by
wing-font-hub, and the mappings (~140 MB, each with its own data licence)
live in this repo under python/mappings/.

    wing-font fetch NotoSansHK-VariableFont_wght.ttf NotoSerif-Regular.ttf
    wing-font fetch cantonese/canto-lshk.csv --dest mappings/
    wing-font fetch --list          # what's available

A name ending in .csv is a mapping path relative to python/mappings/;
anything else is a font file name on wing-font-hub.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

FONTS_URL = os.environ.get("WING_FONT_INPUTS_URL", "https://wing-font-hub.chunlaw.io")
# shortcut: tracks `main`, so a mapping can be newer than the installed code; pin to a release tag once releases are tagged.
MAPPINGS_URL = os.environ.get(
    "WING_FONT_MAPPINGS_URL",
    "https://raw.githubusercontent.com/chunlaw/wing-font-generator/main/python/mappings",
)

# A real TTF is at least a few hundred KB; under 1 KiB is an error page saved as .ttf.
MIN_FONT_BYTES = 1024

# urllib's default "Python-urllib/X.Y" user-agent gets a 403 from the
# Cloudflare rules in front of chunlaw.io.
_USER_AGENT = (
    "wing-font-generator-fetch "
    "(+https://github.com/chunlaw/wing-font-generator)"
)


def fetch_file(url: str, dest: Path, min_bytes: int = 1) -> None:
    """Download `url` to `dest`, atomically (via a `.partial` sibling) so an
    interrupted download never leaves a truncated file behind."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".partial")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(
            f"HTTP {e.code} fetching {url}.\n"
            f"  Check the name, or point WING_FONT_INPUTS_URL / "
            f"WING_FONT_MAPPINGS_URL at your fork or mirror."
        )
    except urllib.error.URLError as e:
        raise SystemExit(f"Network error fetching {url}: {e.reason}.")
    if len(data) < min_bytes:
        raise SystemExit(
            f"Download from {url} is only {len(data)} byte(s); first bytes: "
            f"{data[:80].decode('utf-8', errors='replace')!r}"
        )
    tmp.write_bytes(data)
    tmp.replace(dest)


def list_available() -> tuple[list[str], list[str]]:
    """(font names, mapping paths) currently on GitHub, via the git-trees API."""
    def tree(repo: str) -> list[str]:
        url = f"https://api.github.com/repos/{repo}/git/trees/main?recursive=1"
        req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        try:
            with urllib.request.urlopen(req) as resp:
                return [e["path"] for e in json.load(resp)["tree"] if e["type"] == "blob"]
        except urllib.error.URLError as e:  # includes HTTPError (e.g. 403 rate limit)
            raise SystemExit(f"Could not list {repo}: {e}")
    fonts = [p for p in tree("chunlaw/wing-font-hub") if p.endswith(".ttf")]
    prefix = "python/mappings/"
    mappings = [p[len(prefix):] for p in tree("chunlaw/wing-font-generator")
                if p.startswith(prefix) and p.endswith(".csv")]
    return sorted(fonts), sorted(mappings)


def url_for(name: str) -> tuple[str, int]:
    """(download URL, minimum plausible size) for a font or mapping name."""
    if name.endswith(".csv"):
        return f"{MAPPINGS_URL}/{name.lstrip('/')}", 1
    return f"{FONTS_URL.rstrip('/')}/{name}", MIN_FONT_BYTES


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="wing-font fetch",
        description="Download Wing Font input fonts (from wing-font-hub) "
        "or mapping CSVs (e.g. cantonese/canto-lshk.csv).",
    )
    parser.add_argument("names", nargs="*", help="font file names or mapping paths")
    parser.add_argument("--list", action="store_true", help="list fonts and mappings available to fetch")
    parser.add_argument("--dest", default=".", help="directory to save into (default: .)")
    parser.add_argument("--force", action="store_true", help="re-download files already present")
    args = parser.parse_args(argv)
    if args.list:
        fonts, mappings = list_available()
        print("Fonts (wing-font-hub):")
        print("\n".join(f"  {f}" for f in fonts))
        print("Mappings (python/mappings/):")
        print("\n".join(f"  {m}" for m in mappings))
        return 0
    if not args.names:
        parser.error("give one or more names, or --list")

    for name in args.names:
        url, min_bytes = url_for(name)
        dest = Path(args.dest) / Path(name).name
        if dest.is_file() and dest.stat().st_size >= min_bytes and not args.force:
            print(f"  ✓ already present: {dest}")
            continue
        print(f"  ⇣ {url}")
        fetch_file(url, dest, min_bytes)
        print(f"    → {dest}")
    return 0
