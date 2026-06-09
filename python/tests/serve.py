"""
serve.py — one-shot driver: regenerate the test font, then serve viewer.html.

A web server is needed because browsers won't fetch @font-face WOFFs from
file:// URLs in most configurations. This script:

  1. Re-runs generate_test_font.py (so editing the mapping or the Python
     pipeline is one command away from being visible in the browser).
  2. Starts a local HTTP server in tests/ and opens viewer.html.

Run from the repo root:

    python tests/serve.py

Optional flags:
  --port N        bind to a different port (default 8765)
  --no-regen      skip the regeneration step (useful for quick reloads)
  --no-open       don't open the browser automatically
"""

from __future__ import annotations

import argparse
import http.server
import socketserver
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--no-regen", action="store_true", help="Skip the regenerate step")
    p.add_argument("--no-open", action="store_true", help="Don't auto-open the browser")
    return p.parse_args()


def regenerate() -> None:
    """Invoke generate_test_font.py as a subprocess so its prints stream live."""
    print("=" * 60)
    print("Regenerating test font...")
    print("=" * 60)
    result = subprocess.run(
        [sys.executable, str(THIS_DIR / "generate_test_font.py")],
        cwd=str(THIS_DIR.parent),
    )
    if result.returncode != 0:
        print(f"\nERROR: generator exited with status {result.returncode}", file=sys.stderr)
        sys.exit(result.returncode)


def serve(port: int, open_browser: bool) -> None:
    """Serve tests/ over HTTP. Blocks until Ctrl-C."""
    # Use a Handler bound to tests/ so requests for /viewer.html and
    # /output/test.woff both resolve correctly.
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(THIS_DIR), **kwargs)

        def log_message(self, fmt, *args):
            # Slightly quieter than the default — only log non-success and
            # non-GET requests, plus the WOFF load (handy for diagnosing
            # "did the browser actually fetch the font?").
            if args and "200" in str(args) and ".html" not in str(args[0]) and ".woff" not in str(args[0]):
                return
            super().log_message(fmt, *args)

    httpd = socketserver.TCPServer(("127.0.0.1", port), Handler)
    httpd.allow_reuse_address = True

    url = f"http://127.0.0.1:{port}/viewer.html"
    print()
    print("=" * 60)
    print(f"Serving tests/ on {url}")
    print("Press Ctrl-C to stop.")
    print("=" * 60)

    if open_browser:
        # Give the server a beat to bind before launching the browser.
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        httpd.server_close()


def main() -> int:
    args = parse_args()

    output_dir = THIS_DIR / "output"
    if not args.no_regen:
        regenerate()
    elif not output_dir.exists() or not (output_dir / "test.woff").exists():
        print(
            "ERROR: --no-regen passed but tests/output/test.woff is missing. "
            "Run without --no-regen first.",
            file=sys.stderr,
        )
        return 1

    serve(args.port, open_browser=not args.no_open)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
