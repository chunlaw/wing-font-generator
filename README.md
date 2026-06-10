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
  layer adds two OpenType features (`ccmp`, `liga`) so polyphonic
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

Two GitHub Actions handle the two halves independently. They publish to
**different paths on the same `gh-pages` branch**, so they don't
overwrite each other:

| Workflow | Trigger | What it publishes |
| --- | --- | --- |
| `build-fonts.yml` | push to `python/**` (auto) or `workflow_dispatch` (manual) | Runs `wing-font.py` 25× → deploys outputs to `gh-pages` `/fonts/` subfolder (served at <https://wing-fonts.chunlaw.io/fonts/X.woff>) + uploads a `wing-fonts` artifact for inspection |
| `build-demo.yml` | push to `web/**` or `python/**` | `yarn build` (which includes the sync step), uploads the dist as a `web-dist` artifact (validation only, no deploy) |

### Publishing the React app

`cd web && yarn deploy`. It runs `yarn build` then `gh-pages -d dist --add`
to push `web/dist/` to the gh-pages ROOT. The `--add` flag is important:
it adds/updates files without wiping the `/fonts/` subfolder that the
fonts workflow placed there. CNAME (`wing-fonts.chunlaw.io`) comes from
`web/public/CNAME` which Vite copies into `dist/`.

### Publishing fonts

Automatic on every push that touches `python/**`. The workflow
generates the 25 fonts, force-with-lease-pushes them into the
`/fonts/` subfolder of `gh-pages`, and uploads a copy as a workflow
artifact for inspection. To trigger manually (e.g. after re-running
the test rig and confirming output): Actions tab → "Fonts Generation"
→ "Run workflow".

### How the two writers coexist

- `build-fonts.yml` uses `target-folder: fonts` + `clean: true`. The
  `clean: true` is **scoped to the target folder** — it wipes only
  `/fonts/`, never the React app at the branch root.
- `yarn deploy` uses `gh-pages -d dist --add`. The `--add` flag adds and
  updates files without wiping anything else — so `/fonts/` survives
  every web deploy.
- A `concurrency: gh-pages-fonts` group in `build-fonts.yml` serialises
  CI runs (so two simultaneous font deploys can't fight). For the
  much rarer case of `yarn deploy` colliding with an in-progress CI
  push, the gh-pages action uses force-with-lease and will retry on
  non-fast-forward.

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
