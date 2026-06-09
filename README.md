# Wing Font

Wing Font generates **OpenType fonts that show pronunciation annotations
stacked above Chinese characters in plain text** — no HTML `<ruby>`
markup, no separate text layers, no special apps. Type a character, the
romanization appears above it. Try it live at
<https://wing-fonts.chunlaw.io/>.

This is a monorepo with two halves:

```
wing-font/
├── python/    # The font-generation pipeline (CLI + library code)
└── web/       # React + Vite app that runs the pipeline in-browser via Pyodide
```

* **[`python/`](python/)** is the source of truth. A small Python program
  ([`python/wing-font.py`](python/wing-font.py)) reads a base TTF + an
  annotation TTF + a CSV mapping characters to romanizations, and emits
  a new TTF + WOFF whose glyphs have the annotations baked in. The GSUB
  layer adds two OpenType features (`calt`, `liga`) so polyphonic
  characters disambiguate automatically in context, and the user can
  manually pick a variant by typing `字1` / `字2` / `字丅一`. CI in
  [`.github/workflows/build-fonts.yml`](.github/workflows/build-fonts.yml)
  builds all 25 production fonts and publishes them to
  <https://wing-fonts.chunlaw.io/>.

* **[`web/`](web/)** is a React + Vite site that ships the same Python
  pipeline as WebAssembly. A Web Worker boots Pyodide on demand, fetches
  the Python sources, and runs the generator entirely in the user's
  browser. The `/generate` page lets anyone upload their own fonts +
  CSV, click Generate, and download the resulting WOFF. The sources
  under `web/public/wingfont/` are **generated from `python/`** by
  [`web/scripts/sync-python.mjs`](web/scripts/sync-python.mjs) on every
  build — `python/` is the single source of truth.

---

## Quick start

### Generate a font from the CLI (Python)

```sh
cd python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python wing-font.py \
  -i input_fonts/ChironSungHK-R.ttf \
  -a input_fonts/NotoSerif-Regular.ttf \
  -m mappings/canto-lshk.csv \
  -o ChironSungHK-Noto-lshk \
  -opt -as 0.13
```

See [`python/README.md`](python/README.md) for the full CLI reference,
the test rig, and the architecture deep-dive.

### Run the in-browser version locally

```sh
cd web
yarn install
yarn dev
```

The `yarn dev` script runs `node scripts/sync-python.mjs` first (which
copies the Python sources from `../python/` into
`web/public/wingfont/`), then starts Vite. Open the URL it prints and
navigate to `/generate`. First generation takes ~10–15 s for Pyodide to
boot; subsequent generations are warm.

See [`web/README.md`](web/README.md) for the worker architecture, sync
script details, and deployment notes.

---

## Why a monorepo

Until this restructuring, the Python sources lived in `wing-font-generator`
and the React site lived in `wing-font-demo`, with the Python files
duplicated into `wing-font-demo/public/wingfont/`. Every time we changed
a handler module, the two copies could drift silently. The new layout
makes `python/` the single source of truth and treats the web app's
bundled copies as build artifacts produced by `web/scripts/sync-python.mjs`.

Two GitHub Actions handle the two halves independently:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `build-fonts.yml` | `python/**` changes | Runs `wing-font.py` 25× and publishes results to `gh-pages` (the font CDN) |
| `build-demo.yml` | `web/**` or `python/**` changes | `yarn build` (which includes the sync step), uploads the dist as a CI artifact |

The font-CDN deploy and the web-app deploy stay separate. The Vite build
re-runs whenever the Python pipeline changes so we catch
incompatibilities before they ship.

---

## Directory map

```
wing-font/
├── .github/workflows/
│   ├── build-fonts.yml         # CI for python/ → publishes fonts to gh-pages
│   └── build-demo.yml          # CI for web/ → uploads dist artifact
├── python/                     # ← Python pipeline (read its README)
│   ├── wing-font.py            # CLI entry point
│   ├── runner.py               # Pyodide wrapper (consumed by web/)
│   ├── build_glyph.py
│   ├── chain_context_handler.py
│   ├── liga_handler.py
│   ├── utils.py
│   ├── mappings/               # Romanization CSVs + parser
│   ├── input_fonts/            # Source TTFs
│   ├── tests/                  # Local visual test rig
│   ├── requirements.txt
│   └── README.md
├── web/                        # ← React + Vite app (read its README)
│   ├── src/
│   │   ├── pages/Generate.tsx  # UI for the in-browser font generator
│   │   ├── workers/wingfontWorker.ts   # Boots Pyodide, runs runner.py
│   │   └── utils/wingfont.ts   # Main-thread client for the worker
│   ├── public/
│   │   └── wingfont/           # AUTO-GENERATED from python/ — do not edit
│   ├── scripts/sync-python.mjs # Populates public/wingfont/ before vite
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
├── CNAME                       # Custom domain for the gh-pages font CDN
├── LICENSE
└── README.md                   # ← you are here
```

---

## Mapping sources

See [`python/README.md#mapping-sources`](python/README.md#mapping-sources)
for the upstream data sources behind each CSV in `python/mappings/`.

## Contact

[Instagram](https://instagram.com/wingfont) · [Telegram](https://t.me/wingfont) · [Sponsor on GitHub](https://github.com/sponsors/chunlaw)

## License

MIT — see [`LICENSE`](LICENSE).
