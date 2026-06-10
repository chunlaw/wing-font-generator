# Third-party Pyodide wheels

This folder ships pre-built emscripten/wasm Python wheels that the
Pyodide worker installs at boot via `micropip.install(<URL>)`. PyPI
doesn't host emscripten wheels, so for any C-extension package we
need in the browser, the canonical artefact has to live here (or on
a CDN we control).

`sync-python.mjs` copies the contents of this folder to
`web/public/wingfont/wheels/`, where the worker fetches them as
origin-relative URLs (`/wingfont/wheels/<filename>`).

## Current wheels

| File | Source | Purpose |
|---|---|---|
| `uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl` | [uharfbuzz v0.55.0 release](https://github.com/harfbuzz/uharfbuzz/releases/tag/v0.55.0) | OpenType shaping for the annotation glyph composer in `build_glyph.py`. Replaces the naive per-char advance walk so complex scripts (Thai vowel marks + tone marks, Arabic positional forms, Indic reordering, etc.) lay out correctly via GPOS. |

## ABI tag matching

The wheel filename ends in `pyodide_YYYY_N_wasm32`. This MUST match
the ABI of the Pyodide release pinned in
`web/src/workers/wingfontWorker.ts` (`PYODIDE_VERSION`).

The reliable way to read off the ABI tag is **NOT** the Pyodide
changelog (which can be misleading across patch releases) — it's to
let the runtime tell you. Boot the worker once and check the
browser console:

```js
// In the worker, after pyodide loads:
await pyodide.runPythonAsync(`
  import sys
  print(sys.platform, sys.version)
`)
// e.g. "emscripten 3.13.x (main, ...)"
//      └─────────┘ └──┘
//      ABI hint    Python version
```

The platform tag the wheel filename needs is whatever emscripten +
Python combination uharfbuzz published for that Pyodide release:

| Emscripten ABI | Python | uharfbuzz wheel tag |
|---|---|---|
| `emscripten-3.1.58` | 3.12 | `pyodide_2024_0` |
| `emscripten-4.0.9` | 3.13 | `pyodide_2025_0` ← current (Pyodide 0.29.4) |

If `micropip` rejects the wheel with `Wheel platform '…' is not
compatible with Pyodide's platform 'emscripten-X.Y.Z-wasm32'`, read
the emscripten version from the error and swap the wheel filename
in both this README and `wingfontWorker.ts`.

## How to refresh

```bash
# 1. Pick the release that matches the Pyodide ABI we ship.
#    https://github.com/harfbuzz/uharfbuzz/releases
# 2. Download the matching wheel into this folder:
cd python/wheels/
curl -LO https://github.com/harfbuzz/uharfbuzz/releases/download/v0.55.0/uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl
# 3. Commit it (binary; tracked directly — <1 MB so git-lfs not needed).
git add uharfbuzz-0.55.0-cp310-abi3-pyodide_2025_0_wasm32.whl
git commit -m "Refresh uharfbuzz wheel to vX.Y.Z"
# 4. Update the URL constant in web/src/workers/wingfontWorker.ts and
#    the sync-python.mjs MANIFEST entry to match the new filename.
# 5. Re-run yarn sync (yarn dev does this automatically).
```

## Why we don't fetch the wheel from GitHub at runtime

Bundling the wheel in our repo guarantees:

- the wheel can't disappear on us (GitHub releases occasionally get retagged or pulled),
- the URL the worker hits is same-origin (no extra CORS or jsdelivr-style routing),
- offline / behind-the-firewall users still get a working build,
- the wheel ABI is locked at deploy time, not at install time.

Cost is a ~1 MB binary in the repo per wheel. Acceptable for the
benefit.
