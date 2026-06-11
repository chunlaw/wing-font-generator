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
