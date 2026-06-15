import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Share as ShareIcon,
} from "@mui/icons-material";

// Workbox runtime cache name for fonts. Must stay in sync with
// `cacheName` in vite.config.ts's VitePWA → runtimeCaching block.
// If the SW config ever splits fonts across multiple cache names
// (e.g. one for hub-hosted, one for same-origin), refresh below
// has to iterate all of them.
const FONT_CACHE_NAME = "wing-font-fonts-v1";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import AppContext from "../AppContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useDocumentMeta,
  useSharedTick,
  useTemplateRotation,
} from "../utils/hooks";
import { FontHeader } from "../components/components/FonttHeader";
import FontPicker from "../components/main/FontPicker";
import LinguistHelpMemo from "../components/LinguistHelpMemo";
import { useTranslation } from "../i18n/LanguageContext";
import {
  FontOption,
  USER_FONTS_GROUP_KEY,
  findDialectKey,
  getDialectLabel,
} from "../utils/const";
import {
  recentEntryToFontOption,
  useRecentFonts,
} from "../RecentFontsContext";
import UploadFontButton from "../components/main/UploadFontButton";
import TypographyControls, {
  useTypographySettings,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LETTER_SPACING_MAX,
  LETTER_SPACING_MIN,
  type TypographySettings,
} from "../components/TypographyControls";
import { effectiveDir } from "../utils/textDirection";

// Showcase-specific default: 48 px — matches the previous
// md-breakpoint rendering, generous enough that the annotation
// strokes (~25% of the base char height per default anno_scale)
// render in the legible 10-12 px zone. Reset to this value via
// the TypographyControls "Reset" link.
const SHOWCASE_TYPO_DEFAULTS: TypographySettings = {
  fontSizePx: 48,
  letterSpacingEm: 0,
};
import type { Language } from "../i18n/translations";

// Query-string parameter for the picked-font list. Comma-separated
// font NAMES (the stable identifier in AVAILABLE_FONTS), not
// displayNames. Example:
//   /showcase?fonts=ChironSungHK-Noto-lshk,NotoSansTC-Huninn-tailo
//
// Names are URL-encoded by react-router automatically, so spaces /
// punctuation in future font names won't break the encoding.
const FONTS_PARAM = "fonts";

// Query-string parameter for the live-preview text. A user typing
// "今晚打老虎" into the "Try it" field has the URL update to
//   /showcase?fonts=...&text=今晚打老虎
// so they can share the exact preview they're looking at. CJK
// characters are percent-encoded by URLSearchParams automatically.
//
// The param is intentionally LIVE-bound (one URL write per keystroke
// via setSearchParams(..., { replace: true })) rather than debounced.
// replaceState is cheap and history stays clean because we never
// push, so even a 50-character paste produces ~50 silent URL
// rewrites and zero back-button stops. If we later add expensive
// per-keystroke work elsewhere this can be debounced — for now the
// simpler model wins.
const TEXT_PARAM = "text";

// Query-string parameters for the TypographyControls settings.
// Persisting them in the URL means a share link captures the exact
// preview a sender was looking at — including the size/spacing they
// chose, not just the picked fonts and text. Format:
//   /showcase?size=64&spacing=0.05
// Values that match the page defaults (or fall outside the slider
// range) are omitted to keep share URLs short for the common case.
const FONT_SIZE_PARAM = "size";
const LETTER_SPACING_PARAM = "spacing";

const Main = () => {
  const { msg, setMsg, pickedFonts, setPickedFonts, addPickedFontOption, loadingFonts } =
    useContext(AppContext);
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();


  // SEO meta. canonicalPath omits the `?fonts=...` query string —
  // every picked-fonts permutation collapses to the same canonical
  // URL so Google doesn't treat each share link as a separate page.
  useDocumentMeta(t("meta.showcase.title"), t("meta.showcase.description"), {
    canonicalPath: "/showcase",
  });
  // ── Unified template-rotation cadence ─────────────────────────────
  // Single 5 s tick counter owned by Main; every FontShowcaseCard
  // below threads this into its own `useTemplateRotation(msg,
  // dialectKey, sharedTick)` call so every card re-picks its lyric
  // on the same render. Without this each card owned its own
  // setInterval and the rows drifted out of phase, which read as
  // accidental flicker rather than intentional rotation.
  const sharedTick = useSharedTick();

  // Typography preferences (font size + letter spacing) shared
  // across all rendered cards. Persisted to localStorage so the
  // user's last-set size carries across /showcase ↔ /specimen
  // visits — a designer who picks 56 px while looking at one font
  // sees the next font at 56 px too.
  const [typoSettings, setTypoSettings] = useTypographySettings(
    SHOWCASE_TYPO_DEFAULTS,
  );

  // ── Share-link affordance ──────────────────────────────────────────
  // One-tap share of the current URL — which now encodes everything
  // (picked fonts, preview text, size, spacing) thanks to the
  // URL-sync effects below. On platforms with the native Web Share
  // API (most mobile browsers, recent desktop Safari/Edge) we
  // invoke it directly so the user can hand the link to any app.
  // Everywhere else we fall back to clipboard copy with a Snackbar
  // confirmation. `snackbarKey` is a translation key so the
  // success/failure copy is bilingual — null means snackbar closed.
  const [snackbarKey, setSnackbarKey] = useState<
    "showcase.shareCopied" | "showcase.shareFailed" | null
  >(null);

  const handleShare = async () => {
    const url = window.location.href;
    // Prefer the native share sheet when available. Skipping it on
    // desktop browsers that expose it but route through "share via
    // email" sub-menus would be a worse UX than direct copy — so we
    // sniff the existence of `navigator.share` only, which is gated
    // to secure contexts and typically only present where the OS
    // actually has a share sheet to invoke.
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({ url, title: "Wing Font" });
        // navigator.share resolves on success and rejects (with an
        // AbortError) when the user cancels — we don't snackbar on
        // success because the OS share sheet IS the feedback.
        return;
      } catch (err) {
        // User-cancelled share → no message. Real errors → fall
        // through to the clipboard path so the user has SOME way
        // to get the link.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    // Clipboard path. `navigator.clipboard` requires secure
    // context (https or localhost) — true for our deploy and dev
    // server. If it's missing or rejects, show the "manual copy"
    // hint Snackbar instead of failing silently.
    try {
      await navigator.clipboard.writeText(url);
      setSnackbarKey("showcase.shareCopied");
    } catch {
      setSnackbarKey("showcase.shareFailed");
    }
  };

  // ── Refresh-fonts affordance ──────────────────────────────────────
  // Drops the Service Worker's font cache and hard-reloads the page,
  // forcing every pre-generated font to be re-fetched from the CDN on
  // the next render.
  //
  // Why this is needed at all:
  // Pre-generated fonts (e.g. NotoSansArabic-Noto-romanization.woff2)
  // are served under `StaleWhileRevalidate` (see vite.config.ts). That
  // gives users an instant cache hit and quietly revalidates the bytes
  // in the background — so an updated build lands on visit N+1 rather
  // than visit N. That's the right default for casual readers, but a
  // designer / maintainer verifying "did my deploy actually ship?"
  // wants the new bytes NOW, not on the next page load. Without this
  // button their only options were a hard-reload (Cmd+Shift+R, which
  // not every user knows) or DevTools → Application → Storage → Clear
  // (which most users wouldn't know to find).
  //
  // The operation is non-destructive: user-uploaded / generated fonts
  // live in IndexedDB (via `RecentFontsContext`), NOT in the SW cache,
  // so wiping the font cache only loses transient HTTP responses that
  // re-download on the very next request. No confirmation dialog —
  // the button click is the confirmation.
  const handleRefreshFonts = async () => {
    // `caches` is only available in secure contexts and where the SW
    // registered. Both true for production but worth guarding
    // defensively so a dev console / older browser doesn't throw.
    if (typeof caches !== "undefined") {
      try {
        await caches.delete(FONT_CACHE_NAME);
      } catch {
        // Cache deletion can fail (rare, e.g. private-browsing
        // restrictions). The reload below still wipes the in-memory
        // FontFace registrations and re-fetches via the SWR path
        // which itself re-validates — so we still make forward
        // progress even if the cache delete didn't take.
      }
    }
    // Hard navigation rather than .reload(true): the boolean overload
    // of reload was deprecated in modern browsers. window.location's
    // assignment behaves like a navigation, which is what we want.
    window.location.reload();
  };

  // ── URL ↔ pickedFonts synchronisation ─────────────────────────────
  // Two effects:
  //   1) ONCE on mount: if the URL has ?fonts=..., that wins over the
  //      localStorage-restored state. Lets a recipient of a shared
  //      link see exactly the fonts the sender picked.
  //   2) On every pickedFonts change AFTER mount: serialise the
  //      current list back into the URL via replaceState. Each
  //      add/remove updates the URL in-place without polluting the
  //      browser history stack.
  //
  // The `didApplyUrlRef` guard prevents effect (2) from running on
  // the first render before effect (1) has had a chance to seed
  // state from the URL — without it, an empty pickedFonts on first
  // render would clobber the URL's `?fonts` param before we got to
  // read it.
  const didApplyUrlRef = useRef(false);

  useEffect(() => {
    if (didApplyUrlRef.current) return;
    didApplyUrlRef.current = true;
    // ── Pull fonts list from URL ──
    const urlFonts = searchParams.get(FONTS_PARAM);
    if (urlFonts) {
      const names = urlFonts.split(",").map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        setPickedFonts(names);
      }
    }
    // ── Pull preview text from URL ──
    // If `?text=...` is present, it wins over whatever AppContext.msg
    // held (which itself was either localStorage-restored from a
    // previous visit, or empty on first load). This lets a recipient
    // of a shared link see the exact same preview text the sender
    // was looking at — not just the picked-fonts list.
    const urlText = searchParams.get(TEXT_PARAM);
    if (urlText !== null) {
      setMsg(urlText);
    }
    // ── Pull typography settings from URL ──
    // size and spacing each parsed independently — a partial URL
    // (e.g. only ?size=) still wins for the one provided, the other
    // falls back to localStorage / page default via useTypographySettings.
    // Range-clamp via Number.isFinite + min/max so a malformed share
    // link can't drive the slider to an invalid value.
    const urlSize = searchParams.get(FONT_SIZE_PARAM);
    const urlSpacing = searchParams.get(LETTER_SPACING_PARAM);
    if (urlSize !== null || urlSpacing !== null) {
      const parsedSize = urlSize !== null ? Number(urlSize) : NaN;
      const parsedSpacing = urlSpacing !== null ? Number(urlSpacing) : NaN;
      setTypoSettings({
        fontSizePx:
          Number.isFinite(parsedSize) &&
          parsedSize >= FONT_SIZE_MIN &&
          parsedSize <= FONT_SIZE_MAX
            ? parsedSize
            : typoSettings.fontSizePx,
        letterSpacingEm:
          Number.isFinite(parsedSpacing) &&
          parsedSpacing >= LETTER_SPACING_MIN &&
          parsedSpacing <= LETTER_SPACING_MAX
            ? parsedSpacing
            : typoSettings.letterSpacingEm,
      });
    }
    // Intentionally no deps — this is a once-on-mount sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didApplyUrlRef.current) return;
    const names = pickedFonts.map((f) => f.name).join(",");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (names) {
          next.set(FONTS_PARAM, names);
        } else {
          // Empty pickedFonts → drop the param entirely, so an empty
          // showcase reads as `/showcase` rather than `/showcase?fonts=`.
          next.delete(FONTS_PARAM);
        }
        return next;
      },
      // replace:true avoids creating a history entry per add/remove —
      // the back button should take you to wherever you came from,
      // not step through each font you picked.
      { replace: true },
    );
  }, [pickedFonts, setSearchParams]);

  // Mirror msg → `?text=` whenever the user edits the field. Same
  // replace-not-push policy as the fonts effect so the back button
  // stays useful (one URL state per visit, not one per keystroke).
  useEffect(() => {
    if (!didApplyUrlRef.current) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (msg) {
          next.set(TEXT_PARAM, msg);
        } else {
          // Empty msg → drop the param so the URL doesn't carry a
          // dangling `&text=`. Mirrors the FONTS_PARAM behaviour.
          next.delete(TEXT_PARAM);
        }
        return next;
      },
      { replace: true },
    );
  }, [msg, setSearchParams]);

  // Mirror typoSettings → `?size=` / `?spacing=` whenever the user
  // drags either slider. Defaults are OMITTED from the URL so the
  // share link stays clean for the common case where someone
  // didn't tweak the controls — only their override (if any) ends
  // up in the link.
  useEffect(() => {
    if (!didApplyUrlRef.current) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (typoSettings.fontSizePx !== SHOWCASE_TYPO_DEFAULTS.fontSizePx) {
          next.set(FONT_SIZE_PARAM, String(typoSettings.fontSizePx));
        } else {
          next.delete(FONT_SIZE_PARAM);
        }
        if (
          typoSettings.letterSpacingEm !==
          SHOWCASE_TYPO_DEFAULTS.letterSpacingEm
        ) {
          // toFixed(2) keeps the URL stable across mathematically-
          // identical float representations (0.05 vs 0.0500…0001).
          next.set(
            LETTER_SPACING_PARAM,
            typoSettings.letterSpacingEm.toFixed(2),
          );
        } else {
          next.delete(LETTER_SPACING_PARAM);
        }
        return next;
      },
      { replace: true },
    );
  }, [typoSettings, setSearchParams]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      alignItems="center"
      gap={2}
      my={1}
    >
      {/*
        Single layout, both breakpoints — source order matches
        visual order top-down:
          1. TextField + FontPicker (the controls cluster)
          2. Upload + Share row
          3. TypographyControls (collapsible Display options)
          4. Cards (the font previews)

        The mobile-special pinned-bar / append-on-mobile / scroll-
        into-view experiment was reverted (tasks #248-#250). Mobile
        now reads identically to desktop — controls at top, cards
        below — with no flex-order shuffling, no fixed-position
        chrome, and the historical "new card prepended to the top
        of the list" behaviour on both breakpoints.
       */}
      <TextField
        label={t("showcase.tryIt")}
        value={msg}
        onChange={({ target: { value } }) => setMsg(value)}
        fullWidth
        // This input feeds every card below, so its direction
        // tracks the typed text only — no font-dialect hint. An
        // empty field is LTR; the first strong-RTL keystroke flips
        // it to RTL. effectiveDir is cheap on short inputs; for the
        // "Try it" field the text rarely exceeds a few words.
        slotProps={{ htmlInput: { dir: effectiveDir(msg) } }}
      />
      <FontPicker />
      {/*
        Secondary-actions row. Right-aligned so the FontPicker
        above takes the full visual weight and Upload + Share read
        as supporting affordances. text variant + startIcon keeps
        them visually quiet; per-button Snackbars (one inside
        UploadFontButton, the page-level Snackbar below for share)
        surface operation feedback.
      */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 0.5,
          width: "100%",
        }}
      >
        <UploadFontButton
          onUploaded={(entry) => {
            // After save resolves, the entry is persisted in
            // IndexedDB and its FontFace is registered (the
            // context's refresh ran inside save()). React hasn't
            // propagated the new entries list to AppContext's
            // recentFontEntriesRef yet, though — so the standard
            // addPickedFont(USER_FONTS_GROUP_KEY, id) path would
            // see a stale ref and silently no-op. Skip the lookup
            // and hand the resolved FontOption straight to
            // addPickedFontOption — we already have the entry.
            // The new card appears at the top of the picked list
            // and renders immediately because FontFace is live.
            addPickedFontOption(recentEntryToFontOption(entry));
          }}
        />
        {/*
          Refresh-fonts button. Same text variant + pill shape as
          Share so the secondary-actions row reads as a single
          stylistic family. Positioned BEFORE Share because the
          Share button is the row's terminator: it's a single-tap
          publish action, so it naturally sits flush-right.
          Refresh is more of a "fix things if they look wrong"
          escape hatch and belongs left of the primary action,
          mirroring the convention in document apps where Undo /
          Refresh sit before Save / Share.
        */}
        <Button
          size="small"
          variant="text"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshFonts}
          sx={{ borderRadius: "9999px", px: 1.5 }}
        >
          {t("showcase.refreshFonts")}
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          sx={{ borderRadius: "9999px", px: 1.5 }}
        >
          {t("showcase.share")}
        </Button>
      </Box>

      <TypographyControls
        defaults={SHOWCASE_TYPO_DEFAULTS}
        settings={typoSettings}
        setSettings={setTypoSettings}
      />

      {pickedFonts.length === 0 ? (
        // Empty-state hint. Only earns its keep when there's
        // genuinely nothing to render — non-empty showcase
        // displays the cards directly. Quiet body2 + secondary
        // colour so it reads as a nudge, not as an error.
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ py: { xs: 4, md: 6 }, fontStyle: "italic", width: "100%" }}
        >
          {t("showcase.emptyHint")}
        </Typography>
      ) : (
        pickedFonts.map((pickedFont, idx) => (
          <FontShowcaseCard
            key={`${pickedFont.name}-showcase`}
            pickedFont={pickedFont}
            idx={idx}
            msg={msg}
            lang={lang}
            isLoading={Boolean(loadingFonts[pickedFont.name])}
            sharedTick={sharedTick}
            typoSettings={typoSettings}
          />
        ))
      )}

      {/*
        Community-help memo. The showcase presents several languages at
        once, so this lists them all, each deep-linking to its /notes tab.
      */}
      <Box sx={{ width: "100%", maxWidth: 720, mt: 1 }}>
        <LinguistHelpMemo />
      </Box>

      {/*
        Share-confirmation Snackbar. Anchored bottom-centre with
        the MUI default 24px bottom offset on both breakpoints.
        autoHideDuration=3 s gives plenty of time to read a short
        confirmation without lingering. Message is i18n-driven via
        the snackbarKey state.
      */}
      <Snackbar
        open={snackbarKey !== null}
        autoHideDuration={3000}
        onClose={() => setSnackbarKey(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={snackbarKey ? t(snackbarKey) : ""}
      />
    </Box>
  );
};

export default Main;

/**
 * One row of the /showcase comparison view. Extracted from Main.tsx's
 * map body so the per-card `useTemplateRotation` call is at the top
 * level of a component (legal under React's rules-of-hooks) rather
 * than inside an array iteration (illegal).
 *
 * Each instance maintains its own rotation timer, so two cards for
 * different dialects can be showing different lyric lines at any
 * given moment — that's intentional. A Mandarin card sometimes
 * showing 月亮代表我的心 while a Cantonese card sometimes shows
 * 富士山下 is exactly the "lyrics that match the font's intended
 * dialect" UX we wanted.
 *
 * When the user types into the text field at the top of Main, `msg`
 * becomes non-empty and every card displays that same text
 * (useTemplateRotation's msg-wins-over-pool rule).
 */
interface FontShowcaseCardProps {
  pickedFont: FontOption;
  idx: number;
  msg: string;
  lang: Language;
  isLoading: boolean;
  /**
   * Shared tick from Main's `useSharedTick`. Threaded through so
   * every card's `useTemplateRotation` re-rolls on the same render
   * — cards roll their lyrics in lockstep rather than each card
   * owning its own setInterval. Omitting the prop would resurrect
   * the per-card-timer behaviour.
   */
  sharedTick: number;
  /**
   * Active font-size + letter-spacing from the page-level
   * TypographyControls. Threaded down so every card renders at the
   * same size — the controls drive the whole comparison view in
   * lockstep, not per-card.
   */
  typoSettings: TypographySettings;
}

const FontShowcaseCard = ({
  pickedFont,
  idx,
  msg,
  lang,
  isLoading,
  sharedTick,
  typoSettings,
}: FontShowcaseCardProps) => {
  const navigate = useNavigate();
  const { entries: recentEntries } = useRecentFonts();
  // Reverse-lookup the dialect from the font name. Returns undefined
  // for stale localStorage entries pointing at a font we no longer
  // expose — render without the chip rather than crashing.
  //
  // User-generated fonts (cached via IndexedDB) live outside the
  // static dialect catalog. They get a special "Your generated
  // fonts" label (resolved by getDialectLabel via the synthetic
  // USER_FONTS_GROUP_KEY) but no associated dialect rotation pool
  // — the rotation falls back to the flat TEMPLATES list because
  // we don't know which dialect the user's mapping CSV represented.
  const builtInDialectKey = findDialectKey(pickedFont.name);
  const isUserFont =
    !builtInDialectKey &&
    recentEntries.some((e) => e.id === pickedFont.name);
  const dialectLabel = builtInDialectKey
    ? getDialectLabel(builtInDialectKey, lang)
    : isUserFont
      ? getDialectLabel(USER_FONTS_GROUP_KEY, lang)
      : undefined;
  // Per-card rotation, filtered by this card's dialect, driven by
  // the shared tick so all cards roll together. When dialectKey is
  // undefined (e.g. for user fonts, or stale entries) the hook
  // falls back to the global flat TEMPLATES list.
  const msgShown = useTemplateRotation(msg, builtInDialectKey, sharedTick);

  // Per-card writing direction. Drives the Typography render below
  // so a card showing an Arabic-base font right-anchors the prose
  // and lays glyphs right-to-left, even when this card is empty
  // (the card's dialect is the tie-breaker). Memoized because
  // effectiveDir codepoint-scans `msgShown`; the parent fires a
  // tick every 5s but msgShown only changes when the rotated
  // sample swaps, so memoization elides the scan on the in-between
  // ticks plus the FADE_MS-driven re-renders mid-rotation.
  const cardDir = useMemo(
    () => effectiveDir(msgShown, builtInDialectKey),
    [msgShown, builtInDialectKey],
  );

  // ── Fade transition between rotations ────────────────────────────
  // When the shared tick advances, `msgShown` changes synchronously
  // with the re-render. Without easing, the text would snap from
  // line A to line B — visually a glitch rather than a rotation.
  //
  // Two-stage state to interpose a fade:
  //   1) `displayedMsg` lags behind `msgShown` until the fade-out
  //      finishes — that's what the <Typography /> below actually
  //      renders, so its content doesn't change while the user can
  //      see it.
  //   2) `isFadedIn` drives the opacity transition. We flip it to
  //      false the moment we see a new msgShown, wait `FADE_MS`,
  //      then commit the swap + flip back to true.
  //
  // FADE_MS is shorter than the rotation interval (5 s) by an order
  // of magnitude so the visible text spends most of its time fully
  // opaque, with the transition being a brief breather between
  // lines rather than a constant pulse.
  const FADE_MS = 300;
  const [displayedMsg, setDisplayedMsg] = useState(msgShown);
  const [isFadedIn, setIsFadedIn] = useState(true);
  useEffect(() => {
    if (msgShown === displayedMsg) return;
    // Fade-out: flip opacity to 0; CSS transition handles the
    // animation over FADE_MS.
    setIsFadedIn(false);
    const t = setTimeout(() => {
      // Swap the actual text content while opacity is 0 — the user
      // never sees the text change.
      setDisplayedMsg(msgShown);
      // Fade-in: flip opacity back to 1; CSS transition animates
      // the new text into view over another FADE_MS.
      setIsFadedIn(true);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [msgShown, displayedMsg]);

  // Compose the two opacity sources:
  //   * `isLoading` dims to 0.35 while the FontFace is still
  //     fetching (existing affordance).
  //   * `isFadedIn` swings between 0 and 1 during a rotation.
  // Take the minimum so the more-restrictive value wins — a font
  // that's still loading AND mid-rotation reads as 0 momentarily,
  // which is fine.
  const previewOpacity = Math.min(isLoading ? 0.35 : 1, isFadedIn ? 1 : 0);

  return (
    <Box width="100%">
      {/* Dialect chip sits ABOVE the FontHeader so it reads as
          "I'm showing you a {dialect} font, called X" — a
          non-developer scanning the page sees the dialect
          before they see the typographic name. Outlined +
          small to stay quiet visually next to the larger
          downloadable font heading. */}
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
        {dialectLabel && (
          <Chip
            label={dialectLabel}
            size="small"
            variant="outlined"
            color="primary"
          />
        )}
        {/* Inline loading affordance: small spinner with a
            "Loading…" label. Sits next to the dialect chip so the
            visual hierarchy is "what this font is for" + "still on
            the way" before the typographic name. */}
        {isLoading && (
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            sx={{ color: "text.secondary" }}
          >
            <CircularProgress size={14} thickness={5} color="inherit" />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              Loading…
            </Typography>
          </Box>
        )}
      </Box>
      <FontHeader
        family={pickedFont.name}
        displayName={pickedFont.displayName}
        idx={idx}
      />
      <Box>
        <Typography
          sx={{
            // Apply the user-tunable typography from TypographyControls.
            // fontSizePx applies uniformly across breakpoints — the
            // user is making an explicit choice, so we trade the
            // responsive ladder for predictable WYSIWYG output.
            // letterSpacingEm threads in as em (so spacing scales
            // proportionally with size when the user adjusts both).
            //
            // lineHeight: 1.6 (was the default 1.4) absorbs the
            // taller line cells on fonts that ship with raised
            // winAscent for annotation headroom — specifically the
            // Xiaolai + Thai/Katakana/Korean/Urdu builds where
            // --out-ascent pushes the clipping ascent up from 880u
            // to 1200-1300u. Without the bump, those cards stack
            // tighter than peers and the showcase grid reads
            // unevenly when those rows are picked. 1.6 covers the
            // worst case (Urdu at 1300u) while still feeling
            // intentional on the typical NotoSansHK pairings.
            fontSize: `${typoSettings.fontSizePx}px`,
            letterSpacing: `${typoSettings.letterSpacingEm}em`,
            lineHeight: 1.6,
            // Reserve space for below-the-word annotations (Arabic /
            // Thai word-unit fonts put the romanization row in the
            // descender). The forced lineHeight 1.6 is shorter than
            // those fonts' natural line box (~2.26em), so the
            // annotation overflows past the bottom of this line box —
            // which is exactly where the sibling <Divider/> sits — and
            // paints *under* the divider. An em-based padding-bottom
            // (relative to this element's own fontSize, so it scales
            // with the size slider) pushes the divider below the
            // annotation. Applied uniformly so the card grid stays
            // even; above-the-character CJK fonts just gain a small,
            // consistent bottom gap. See _auto_extend_vertical_metrics
            // in python/wing-font.py for the matching font-side fix.
            pb: "0.5em",
            textWrap: "nowrap" as const,
            cursor: "pointer",
            // Composed opacity drives both:
            //   * The font-loading dim (0.35 while FontFace is
            //     resolving) — so a slow Chiron download reads as
            //     "not the real glyphs yet".
            //   * The rotation cross-fade (0 → 1 → 0 → 1 during
            //     lyric swaps) — so the text breathes between lines
            //     instead of snapping.
            // FADE_MS-matched transition timing means both stages
            // animate smoothly over the same 300 ms window.
            opacity: previewOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
          fontFamily={pickedFont.name}
          // `dir` right-anchors RTL prose to the right edge of the
          // card and lays glyphs right-to-left. For LTR prose
          // (CJK / Latin) this is a no-op so plain Cantonese
          // / Mandarin cards render exactly as before. The
          // browser bidi algorithm still resolves in-line mixed
          // script within the run, so a Latin word inside an
          // Arabic sentence remains correctly oriented.
          dir={cardDir}
          onClick={() => navigate(`/specimen/${pickedFont.name}`)}
        >
          {displayedMsg}
        </Typography>
      </Box>
      <Divider />
    </Box>
  );
};

// NOTE: the static `msgSx` (responsive xs:28/sm:36/md:48 ladder)
// that used to live here has been retired. Per-page TypographyControls
// drive font-size and letter-spacing via the localStorage-persisted
// `typoSettings` prop threaded into each FontShowcaseCard. The
// previous responsive ladder is captured as the SHOWCASE_TYPO_DEFAULTS
// (single value 36 px) that resets restore — a slight compromise on
// the desktop ramp in exchange for a single source of truth the
// user can tune.
