# Migrating to Actions-based GitHub Pages

This repo no longer publishes to the `gh-pages` **branch**. The site
(React app + 46 generated fonts) is now built and deployed as a GitHub
Pages **artifact** by `.github/workflows/deploy-pages.yml`. Because the
artifact is never stored as git objects, a plain `git clone` no longer
drags down ~150 MB of generated fonts.

## What changed in the repo

- **Added** `.github/workflows/deploy-pages.yml` — one workflow that
  builds the web app + fonts (fonts cached, rebuilt only when
  `python/**` changes) and deploys via `actions/deploy-pages`.
- **Deleted** `.github/workflows/build-fonts.yml` — folded into the
  above.
- **`web/package.json`** — removed the `gh-pages` devDependency and the
  `deploy` / `predeploy` scripts. `web/yarn.lock` regenerated to match.
- **`build-demo.yml`** — now PR-only (pushes to main are built by the
  deploy workflow, so building twice was redundant).

## One-time manual steps (you must do these)

1. **Commit & push** the changes on `main`.

2. **Switch the Pages source to Actions.**
   Repo → Settings → Pages → "Build and deployment" → Source:
   change **Deploy from a branch** to **GitHub Actions**.
   (The `wing-fonts.chunlaw.io` custom domain setting carries over; the
   `CNAME` file is also re-written into every deploy as a safety net.)

3. **Run the workflow** — pushing to `main` triggers it, or run it
   manually from the Actions tab (`Deploy to GitHub Pages` →
   "Run workflow"). The first run is a cache miss, so it builds all 46
   fonts (~3–5 min) before deploying. Later web-only pushes restore the
   fonts from cache and deploy in seconds.

4. **Verify** https://wing-fonts.chunlaw.io loads and a font URL such as
   https://wing-fonts.chunlaw.io/fonts/ChironSungHK-Noto-lshk.woff
   resolves.

5. **Delete the `gh-pages` branch** — this is the step that actually
   shrinks new clones:
   ```
   git push origin --delete gh-pages
   git branch -D gh-pages        # local copy, if you have one
   ```

## Notes

- **Existing clones stay large** until people re-clone (or run
  `git gc`); deleting the branch only affects *future* clones.
- **Partial font failures don't deploy.** On a font rebuild, if any of
  the 46 fonts fails, the cache is not saved and the deploy is skipped,
  so a broken/incomplete `/fonts/` never ships and never poisons the
  cache. Fix the font and re-run.
- **Separate, still-open bloat:** `python/input_fonts/` (~132 MB of base
  TTFs) lives on `main` and is in every clone. If you later want to trim
  that too, the options are Git LFS or fetching those base fonts at
  build time instead of committing them — out of scope for this change.
- The `master` branch still exists on the remote
  (`remotes/origin/master`); delete it too if it's a leftover.
