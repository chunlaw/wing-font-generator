#!/usr/bin/env python3
"""
gen-fonts-index.py — generate site/fonts/index.html

GitHub Pages does NOT serve directory indexes. Without this script,
a request to https://wing-font.chunlaw.io/fonts/ returns a blank
404 page — confusing for anyone who follows the link from the
README, and an unused crawl surface for Google.

This generator walks the published fonts directory and produces a
static HTML page listing every .ttf / .woff with direct download
links. It runs late in the deploy pipeline (after collect-fonts
has been flattened into site/fonts/) and writes its output
alongside the font files so the produced site has:

    site/fonts/
    ├── index.html              ← generated here
    ├── NotoSansHK-Noto-lshk.ttf
    ├── NotoSansHK-Noto-lshk.woff
    ├── ...

Lives in .github/scripts/ rather than inline in deploy-pages.yml on
purpose: the deploy workflow's font cache key folds in the YAML
content (so any matrix edit busts the cache), and we'd rather not
trigger a full 70-font rebuild every time we tweak the index
page's CSS. Edits to this script are cache-neutral.

The script is dependency-free — pure stdlib. Runs on the ubuntu-
latest GitHub Actions runner with no setup-python step needed
beyond the system Python 3.10+ that's already on the image.

Inputs:
  - argv[1] (optional): fonts directory path. Defaults to
    "site/fonts" so the standard deploy invocation is just
    `python3 .github/scripts/gen-fonts-index.py`.
  - env GITHUB_SHA (optional): commit SHA, used in the footer.
    Defaults to "unknown" when missing (e.g. local invocation).
  - env GITHUB_REPOSITORY (optional): "owner/repo" form. Used to
    build the GitHub Releases URL for the .ttf pill. Falls back
    to "chunlaw/wing-font-generator" when missing — that's the
    project's canonical home, so local invocations still produce
    a working URL.

Outputs:
  - <fonts_dir>/index.html
  - Stdout: count summary for the CI log.

WOFF2 vs TTF link routing:
  - `.woff2` pill → relative `./<name>.woff2`. Files live next
    to index.html under the Pages /fonts/ path.
  - `.ttf` pill → absolute URL into the rolling GitHub Release
    (`/releases/latest/download/<name>.ttf`). TTFs aren't on
    Pages — they live in the build-<sha> releases the deploy
    workflow cuts. The `latest/download/` redirect tracks the
    most recent of the 3 retained releases.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from html import escape
from pathlib import Path


# ── Static page template ───────────────────────────────────────────
#
# Why a single `format`-style template instead of a Jinja-style
# engine: it's ~80 lines of HTML. A template engine would add a
# dependency (Jinja) and a learning curve for no real win. Plain
# str.replace() with `{{TOKEN}}` placeholders keeps the script
# stdlib-only and the substitution intent obvious at a glance.
#
# CSS uses CSS variables for theming + a prefers-color-scheme media
# query so the page picks up the visitor's OS preference. Same
# token palette as the React app's theme so the page doesn't look
# alien when a user clicks back to /showcase. System font stack
# (San Francisco / Segoe UI / Roboto / Helvetica) keeps the page
# weightless — no webfont fetch on what's already a font directory.
PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wing Font · Pre-built fonts</title>
  <meta name="description" content="Direct .ttf / .woff downloads for every pre-built Wing Font variant — Cantonese Jyutping, Mandarin Pinyin, Taiwanese Tâi-lô, Teochew Peng'im, and more OpenType fonts with romanization baked in.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://wing-font.chunlaw.io/fonts/">
  <meta property="og:title" content="Wing Font · Pre-built fonts">
  <meta property="og:description" content="Direct .ttf / .woff downloads for every pre-built Wing Font variant.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://wing-font.chunlaw.io/fonts/">
  <meta property="og:image" content="https://wing-font.chunlaw.io/share.svg">
  <style>
    :root {
      --bg: #ffffff;
      --fg: #1a1a1a;
      --muted: #6b7280;
      --link: #1f7a8c;
      --border: #e5e7eb;
      --row-alt: #f8f9fa;
      --pill-bg: #ffffff;
      --pill-hover: #f1f5f9;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --fg: #e2e8f0;
        --muted: #94a3b8;
        --link: #38bdf8;
        --border: #1e293b;
        --row-alt: #15213a;
        --pill-bg: #0f172a;
        --pill-hover: #1e293b;
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
    body {
      font: 15px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 980px;
      margin: 0 auto;
      padding: 40px 24px 64px;
    }
    header { margin-bottom: 28px; }
    h1 {
      font-size: 30px;
      margin: 0 0 8px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .lede {
      color: var(--muted);
      margin: 0 0 14px;
      max-width: 640px;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 14px;
    }
    .nav-links a {
      color: var(--link);
      text-decoration: none;
    }
    .nav-links a:hover { text-decoration: underline; }
    .count {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 32px 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      vertical-align: middle;
    }
    tr:nth-child(even) td { background: var(--row-alt); }
    tr:hover td { background: var(--pill-hover); }
    td.name code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px;
      color: var(--fg);
    }
    td.dl {
      text-align: right;
      white-space: nowrap;
    }
    td.dl a {
      display: inline-block;
      color: var(--link);
      text-decoration: none;
      padding: 3px 10px;
      margin-left: 6px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--pill-bg);
      font-size: 12px;
      font-weight: 500;
    }
    td.dl a:hover {
      background: var(--pill-hover);
    }
    footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 13px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
    }
    footer a { color: var(--link); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
    @media (max-width: 600px) {
      body { padding: 24px 16px 48px; }
      h1 { font-size: 24px; }
      td.dl a { padding: 2px 8px; font-size: 11px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Wing Font · Pre-built fonts</h1>
    <p class="lede">
      Direct downloads for every CI-built variant. OpenType fonts whose
      glyphs carry their own romanization above them — Cantonese
      Jyutping, Mandarin Pinyin, Taiwanese Tâi-lô, Teochew Peng'im,
      and more.
    </p>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/showcase">Browse with previews</a>
      <a href="/generate">Build your own</a>
      <a href="https://github.com/chunlaw/wing-font-generator">Source</a>
    </div>
  </header>
  <main>
    <p class="count">{{COUNT}} font variants</p>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th style="text-align:right;">Downloads</th>
        </tr>
      </thead>
      <tbody>
{{ROWS}}
      </tbody>
    </table>
  </main>
  <footer>
    <span>MIT License · <a href="https://github.com/chunlaw/wing-font-generator">github.com/chunlaw/wing-font-generator</a></span>
    <span>Built {{BUILD_DATE}}{{SHA_LINE}}</span>
  </footer>
</body>
</html>
"""


def render_row(name: str, ttf_base: str) -> str:
    """Render a single <tr> for one font family name (without extension).

    Each row offers TWO download formats with DIFFERENT hosts:

      * `.woff2` → relative `./<name>.woff2`. WOFF2 (Brotli-
        compressed sfnt) lives on the Pages site alongside this
        index page; same-origin, fast paint for the React app's
        FontFace registration. Switched from .woff → .woff2 in
        June 2026 (~30-50% smaller, every modern browser supports
        it natively; ccmp / GSUB verified preserved across the
        encode round-trip by python/tools/verify_woff2_ccmp.py).

      * `.ttf` → absolute URL into the rolling GitHub Release
        (`{ttf_base}/<name>.ttf`). TTFs are ~2× the WOFF2 bytes
        and would exhaust the Pages bandwidth budget, so the
        deploy workflow publishes them to a build-<sha> GitHub
        Release (keep-3 sliding window). The
        `/releases/latest/download/` path in `ttf_base` redirects
        to the current release; the URL itself never changes.

    The pair invariant (both formats exist) used to be guaranteed
    by the CI matrix; with TTFs now off-Pages, the WOFF2 file is
    the one on disk, and the TTF is just LINKED. We don't probe
    the Releases URL — if the release is mid-cut, the link 404s
    briefly. Acceptable for a directory listing.
    """
    safe = escape(name)
    return (
        f'        <tr>'
        f'<td class="name"><code>{safe}</code></td>'
        f'<td class="dl">'
        f'<a href="{ttf_base}/{safe}.ttf" download>.ttf</a>'
        f'<a href="{safe}.woff2" download>.woff2</a>'
        f'</td>'
        f'</tr>'
    )


def main() -> int:
    fonts_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "site/fonts")
    if not fonts_dir.is_dir():
        print(f"[gen-fonts-index] {fonts_dir} is not a directory", file=sys.stderr)
        return 1

    # Stem-set: every .woff2 in the directory contributes its
    # base name (sans extension). We enumerate by WOFF2 rather
    # than TTF because TTFs no longer ship on Pages — they live in
    # GitHub Releases (see render_row docstring). The .woff2 file
    # is the one physically on disk after the cp step in
    # deploy-pages.yml; the .ttf is just LINKED via the absolute
    # Releases URL the row template builds.
    #
    # Sorted alphabetically — the naming convention happens to
    # cluster fonts by base family (ChironHei*, ChironSung*,
    # NotoSansHK*, NotoSansSC*, NotoSansTC*, SourceHanSerif*,
    # Xiaolai*) which gives a usable implicit grouping without any
    # explicit categorisation logic.
    names = sorted(p.stem for p in fonts_dir.glob("*.woff2"))
    if not names:
        print(f"[gen-fonts-index] no .woff2 files in {fonts_dir}", file=sys.stderr)
        return 1

    # Build the TTF Releases base URL. GITHUB_REPOSITORY is set
    # automatically inside Actions runners ("owner/repo"); local
    # invocations fall back to the canonical project home so the
    # generated HTML still has working links.
    repo = os.environ.get("GITHUB_REPOSITORY", "chunlaw/wing-font-generator")
    ttf_base = f"https://github.com/{repo}/releases/latest/download"

    rows = "\n".join(render_row(n, ttf_base) for n in names)

    # Build timestamp — UTC for reproducibility across runners. Format
    # is human-readable + RFC-3339-ish, deliberately not ISO-8601 with
    # T separator so it reads like prose in the footer.
    build_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Commit SHA — short form (first 7 chars) linked back to the
    # GitHub commit when GITHUB_SHA is present. Local-dev invocations
    # leave it absent, in which case we drop the SHA line entirely.
    sha = os.environ.get("GITHUB_SHA", "")
    if sha:
        short = sha[:7]
        sha_line = (
            f' · <a href="https://github.com/chunlaw/wing-font-generator/commit/{sha}">{short}</a>'
        )
    else:
        sha_line = ""

    html = (
        PAGE_TEMPLATE
        .replace("{{COUNT}}", str(len(names)))
        .replace("{{ROWS}}", rows)
        .replace("{{BUILD_DATE}}", build_date)
        .replace("{{SHA_LINE}}", sha_line)
    )

    out = fonts_dir / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"[gen-fonts-index] wrote {out} ({len(names)} fonts, {len(html)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
