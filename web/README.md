# Wing Font — Web

React + Vite site that wraps the [`../python/`](../python/) font-generation
pipeline in a Web Worker via Pyodide, so anyone can generate a Wing Font
without installing Python.

For the project overview see the [root README](../README.md). For the
pipeline internals see [`../python/README.md`](../python/README.md).

---

## Quick start

```sh
yarn install
yarn dev
```

Visit the URL Vite prints (defaults to <http://localhost:5173>) and
navigate to `/generate`. The first generation downloads ~10–15 MB of
Pyodide + fontTools and takes a couple of seconds to boot; everything
after that is cached.

`yarn build` produces a static `dist/` deployable to any host (Netlify,
Vercel, GitHub Pages, Cloudflare Pages, …).

---

## How the in-browser pipeline works

```
┌──────────────────┐    postMessage    ┌──────────────────────────┐
│ Main thread      │ ───────────────▶ │ Web Worker               │
│                  │                   │                          │
│ Generate.tsx     │                   │ wingfontWorker.ts        │
│ ↓                │                   │ ↓                        │
│ utils/wingfont.ts│                   │ Pyodide (WebAssembly)    │
│                  │ ◀───────────────  │ ↓                        │
│ FontFace.load()  │   ttf + woff      │ runner.py                │
│ + Blob download  │   ArrayBuffers    │ ↓                        │
└──────────────────┘                   │ wingfont_main.main(...)  │
                                       │ ↓                        │
                                       │ build_glyph.py            │
                                       │ chain_context_handler.py  │
                                       │ liga_handler.py           │
                                       └──────────────────────────┘
```

The worker boots Pyodide from the jsdelivr CDN on demand, fetches the
bundled Python files from `/wingfont/*.py`, writes them into Pyodide's
in-memory filesystem, then exposes `runner.generate(...)` as a callable.
The main thread sends the user's base font + annotation font + mapping
CSV as transferable `ArrayBuffer`s, gets back the generated TTF + WOFF,
registers the WOFF as an `@font-face`, and offers the TTF for download.

`runner.py` is a thin shim that adapts `wing-font.py`'s file-based CLI
signature (`base_font_file=path, ...`) to a bytes-in/bytes-out callable
suitable for invocation from JavaScript. It writes the uploaded buffers
to `/tmp/` in MEMFS, calls `wingfont_main.main(...)`, reads the
generated `.ttf` and `.woff` back, returns them as bytes.

---

## The sync step

Anything under `public/wingfont/` is **generated** by
[`scripts/sync-python.mjs`](scripts/sync-python.mjs) — never edit those
files. The script copies the canonical sources from `../python/` (and
renames `wing-font.py` → `wingfont_main.py` because Python imports can't
contain hyphens). It runs automatically before `yarn dev` and
`yarn build` because the package.json scripts are wired as:

```json
"scripts": {
  "sync": "node scripts/sync-python.mjs",
  "dev": "yarn sync && vite",
  "build": "yarn sync && tsc && vite build --mode production"
}
```

If you add a new Python module that the worker needs to load, add it to
the `MANIFEST` array in `sync-python.mjs`. The script exits non-zero if
any manifest entry is missing, so a forgotten add will fail CI loudly
rather than silently shipping a broken bundle.

`public/wingfont/` is in `.gitignore`. CI re-runs the sync on every
build for the same reason.

---

## Repo layout

```
web/
├── src/
│   ├── pages/
│   │   ├── Main.tsx            # Existing showcase page
│   │   ├── Specimen.tsx        # Existing per-font specimen page
│   │   └── Generate.tsx        # In-browser font generator
│   ├── workers/
│   │   └── wingfontWorker.ts   # Boots Pyodide, hosts runner.py
│   ├── utils/
│   │   └── wingfont.ts         # Main-thread promise-based client
│   └── components/             # UI primitives (header, layout, dialogs)
├── public/
│   ├── wingfont/               # ← AUTO-GENERATED from ../python/
│   ├── favicon.ico
│   └── …
├── scripts/
│   └── sync-python.mjs         # Run before vite to populate public/wingfont/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .gitignore                  # ignores node_modules, dist, public/wingfont
└── README.md                   # ← you are here
```

---

## Deployment

The build produces a static `dist/` with no server-side dependencies.
The Pyodide runtime and the Python sources are all fetched lazily at
runtime — by the user's browser from jsdelivr (Pyodide) and from your
own host (the `/wingfont/` static assets).

Recommended hosts: **Netlify** or **Vercel** for one-click `git push`
deploys with Vite-aware build detection. **GitHub Pages** also works if
you set `base` in `vite.config.ts` to the repo subpath; note that the
sibling [`build-fonts.yml`](../.github/workflows/build-fonts.yml)
workflow already publishes the *font CDN* to the `gh-pages` branch, so
if you also want the React site on Pages you'd need a different branch
or a separate domain.

CI in [`../.github/workflows/build-demo.yml`](../.github/workflows/build-demo.yml)
runs `yarn build` on every push touching `web/` or `python/` and
uploads the resulting `dist/` as a workflow artifact so you can inspect
the bundle without deploying.

---

## Performance notes

* **First-run cost** is dominated by Pyodide download (~10 MB compressed)
  + fontTools package (~3 MB). All cached after first visit.
* **Per-generation cost** scales with mapping size. Small mappings
  (hundreds of entries) finish in a few seconds; full Cantonese
  mappings (130K+ entries) take 30–120 s.
* **The worker self-starts** as soon as `wingfont.ts` is imported (on
  Generate page mount), so by the time the user clicks the file picker
  the runtime is usually warm.
