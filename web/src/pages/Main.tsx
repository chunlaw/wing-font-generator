import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  SxProps,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import AppContext from "../AppContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useDocumentMeta,
  useSharedTick,
  useTemplateRotation,
} from "../utils/hooks";
import { FontHeader } from "../components/components/FonttHeader";
import FontPicker from "../components/main/FontPicker";
import { useTranslation } from "../i18n/LanguageContext";
import { FontOption, findDialectKey, getDialectLabel } from "../utils/const";
import type { Language } from "../i18n/translations";

// Query-string parameter for the picked-font list. Comma-separated
// font NAMES (the stable identifier in AVAILABLE_FONTS), not
// displayNames. Example:
//   /showcase?fonts=ChironSungHK-Noto-lshk,NotoSansTC-Huninn-tailo
//
// Names are URL-encoded by react-router automatically, so spaces /
// punctuation in future font names won't break the encoding.
const FONTS_PARAM = "fonts";

const Main = () => {
  const { msg, setMsg, pickedFonts, setPickedFonts, loadingFonts } =
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
    const urlFonts = searchParams.get(FONTS_PARAM);
    if (urlFonts) {
      const names = urlFonts.split(",").map((n) => n.trim()).filter(Boolean);
      if (names.length > 0) {
        setPickedFonts(names);
      }
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

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      alignItems="center"
      gap={2}
      my={1}
    >
      <TextField
        label={t("showcase.tryIt")}
        value={msg}
        onChange={({ target: { value } }) => setMsg(value)}
        fullWidth
      />
      <FontPicker />
      {pickedFonts.map((pickedFont, idx) => (
        <FontShowcaseCard
          key={`${pickedFont.name}-showcase`}
          pickedFont={pickedFont}
          idx={idx}
          msg={msg}
          lang={lang}
          isLoading={Boolean(loadingFonts[pickedFont.name])}
          sharedTick={sharedTick}
        />
      ))}
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
}

const FontShowcaseCard = ({
  pickedFont,
  idx,
  msg,
  lang,
  isLoading,
  sharedTick,
}: FontShowcaseCardProps) => {
  const navigate = useNavigate();
  // Reverse-lookup the dialect from the font name. Returns undefined
  // for stale localStorage entries pointing at a font we no longer
  // expose — render without the chip rather than crashing.
  const dialectKey = findDialectKey(pickedFont.name);
  const dialectLabel = dialectKey
    ? getDialectLabel(dialectKey, lang)
    : undefined;
  // Per-card rotation, filtered by this card's dialect, driven by
  // the shared tick so all cards roll together. When dialectKey is
  // undefined the hook falls back to the global flat TEMPLATES list.
  const msgShown = useTemplateRotation(msg, dialectKey, sharedTick);

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
            ...msgSx,
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
          onClick={() => navigate(`/specimen/${pickedFont.name}`)}
        >
          {displayedMsg}
        </Typography>
      </Box>
      <Divider />
    </Box>
  );
};

const msgSx: SxProps<Theme> = {
  // Responsive: bumped up from the original 22/28/36 ramp because the
  // annotation strokes — which render at roughly 25% of the base
  // character height per the default `anno_scale` — became
  // illegible at the small end (~5-6px tall on phones, ~9px on
  // desktop). The new ramp keeps the base char comfortably scannable
  // while pushing the annotation into the 9-12 px range where Latin
  // letters and pinyin tone marks read cleanly without anti-aliasing
  // mush. textWrap=nowrap keeps a single sample on one line so
  // rotation between lyrics doesn't reflow the row height.
  fontSize: { xs: 28, sm: 36, md: 48 },
  textWrap: "nowrap",
};
