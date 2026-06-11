import { useEffect, useMemo, useState } from "react";
import { TEMPLATES, TEMPLATES_BY_DIALECT } from "./const";

/**
 * Rotates through a pool of sample lyrics for the showcase preview,
 * unless the user has typed their own `msg` (in which case that
 * always wins).
 *
 * Three modes:
 *
 *   useTemplateRotation(msg)
 *     — No dialect, no external tick. Hook owns a 5 s interval and
 *       rotates through the flat global TEMPLATES list. Used by the
 *       Specimen page, where there's only ever one font on screen.
 *
 *   useTemplateRotation(msg, dialectKey)
 *     — Dialect-filtered pool, hook owns its own interval. Used in
 *       isolation when there's no shared cadence to follow.
 *
 *   useTemplateRotation(msg, dialectKey, externalTick)
 *     — Dialect-filtered pool, NO internal timer. Re-rolls the
 *       template index whenever `externalTick` changes. Used by the
 *       /showcase page so every font card updates in lockstep with
 *       a single Main.tsx-owned timer instead of N timers ticking
 *       at slightly different phases.
 *
 * In every mode the pool is restricted by dialectKey when present
 * and falls back to the flat list otherwise; an unknown dialect key
 * also falls back so a stale localStorage entry can't blank the
 * preview.
 */
export const useTemplateRotation = (
  msg: string | null,
  dialectKey?: string,
  externalTick?: number,
) => {
  // Pick the pool. `useMemo` so the pool reference is stable across
  // re-renders that don't change the dialect — without it, the
  // effects below would re-arm on every render of the parent.
  const pool = useMemo<string[]>(() => {
    if (dialectKey) {
      const dialectPool = TEMPLATES_BY_DIALECT[dialectKey];
      if (dialectPool && dialectPool.length > 0) return dialectPool;
    }
    return TEMPLATES;
  }, [dialectKey]);

  const [templateIdx, setTemplateIdx] = useState<number>(() =>
    Math.floor(Math.random() * pool.length),
  );

  // Reset the index whenever the pool changes (e.g. dialect changed
  // mid-mount — rare but cheap insurance).
  useEffect(() => {
    setTemplateIdx(Math.floor(Math.random() * pool.length));
  }, [pool]);

  // Internal timer ONLY when no externalTick was provided. When the
  // caller threads in an external tick, that caller is responsible
  // for the cadence and we just react to it — running our own
  // setInterval too would double the rotation rate.
  useEffect(() => {
    if (externalTick !== undefined) return;
    const interval = setInterval(() => {
      setTemplateIdx(Math.floor(Math.random() * pool.length));
    }, 5000);
    return () => clearInterval(interval);
  }, [pool, externalTick]);

  // External-tick mode: re-pick whenever the caller's tick counter
  // changes. All hook instances sharing the same tick will re-pick
  // on the same render, giving the visual effect of "all cards roll
  // their lyrics at the same moment."
  useEffect(() => {
    if (externalTick === undefined) return;
    setTemplateIdx(Math.floor(Math.random() * pool.length));
  }, [externalTick, pool]);

  const msgShown = useMemo(() => {
    return msg || pool[templateIdx] || "";
  }, [msg, templateIdx, pool]);

  return msgShown;
};

/**
 * Drives a global rotation counter that increments every
 * `intervalMs` (default 5 s). Components on the same page that want
 * to update in lockstep can call this once at the top of their
 * tree, then thread the returned number into `useTemplateRotation`
 * as the `externalTick` arg.
 *
 * Single source of truth = single setInterval. Compared to each
 * card owning its own timer, this both saves N-1 timers and keeps
 * the cards visually synchronised, which reads as more intentional
 * for a comparison view.
 */
export const useSharedTick = (intervalMs: number = 5000): number => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((prev) => prev + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return tick;
};

// Absolute base for canonical / og:url. Hard-coded because the SPA
// is single-host (wing-font.chunlaw.io) — there's no preview-URL
// case where we'd want a different base, and pulling from
// window.location would emit chunlaw.github.io URLs while a Cloudflare
// preview is up, which is exactly the SEO mistake canonical exists
// to prevent.
const SITE_URL = "https://wing-font.chunlaw.io";

/**
 * Find or create a `<meta name="X">` tag and set its `content`. The
 * "or create" branch is important — index.html ships with a meta
 * description but not, say, an og:url, and pages calling
 * useDocumentMeta should be able to set whatever they need without
 * us pre-declaring every variant in index.html.
 */
function upsertMetaName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Same as upsertMetaName but for `<meta property="X">` tags. Open
 * Graph uses the `property` attribute instead of `name`; conflating
 * the two makes Facebook's debugger throw "missing property" errors.
 */
function upsertMetaProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Find or create `<link rel="canonical">` and set its href. */
function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

interface DocumentMetaOptions {
  /**
   * Path component for canonical / og:url. Should start with "/".
   * Examples: "/", "/about", "/specimen/NotoSansHK-Noto-lshk".
   *
   * Routes with query strings (e.g. /showcase?fonts=A,B) should pass
   * the BARE path here ("/showcase") — canonical URLs deliberately
   * collapse query variants onto the same resource so search engines
   * don't see every ?fonts= permutation as a duplicate page.
   */
  canonicalPath?: string;
}

/**
 * Per-route SEO meta hook. Updates `document.title`, the meta
 * description, Open Graph / Twitter Card title + description + url,
 * and the canonical link tag whenever its arguments change.
 *
 * Why per-route meta at all on a client-rendered SPA: Google's
 * crawler DOES execute JS and reads what we set here. Other crawlers
 * (social unfurlers — Slack / X / Discord / Telegram / iMessage /
 * Facebook / LinkedIn) only see the static HTML in index.html. So:
 *   - index.html ships sensible defaults (the brand title + intro
 *     description + og:image) that cover every unfurled link.
 *   - This hook adds the per-route nuance Google indexes once it
 *     renders the page — so each route shows a distinct title and
 *     snippet in search results instead of every URL inheriting the
 *     same homepage title.
 *
 * Usage:
 *
 *   useDocumentMeta(
 *     t("meta.showcase.title"),
 *     t("meta.showcase.description"),
 *     { canonicalPath: "/showcase" },
 *   );
 *
 * For dynamic pages (e.g. /specimen/:family), interpolate via
 * `.replace("{name}", value)` in the call site — keeps the i18n
 * strings translatable while letting the page inject specifics.
 */
export const useDocumentMeta = (
  title: string,
  description: string,
  options: DocumentMetaOptions = {},
): void => {
  const { canonicalPath } = options;
  useEffect(() => {
    if (title) {
      document.title = title;
      upsertMetaProperty("og:title", title);
      upsertMetaName("twitter:title", title);
    }
    if (description) {
      upsertMetaName("description", description);
      upsertMetaProperty("og:description", description);
      upsertMetaName("twitter:description", description);
    }
    if (canonicalPath !== undefined) {
      const fullUrl = `${SITE_URL}${canonicalPath}`;
      upsertCanonical(fullUrl);
      upsertMetaProperty("og:url", fullUrl);
    }
  }, [title, description, canonicalPath]);
};
