import {
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import AppContext from "../AppContext";
import { useParams } from "react-router-dom";
import { useDocumentMeta, useTemplateRotation } from "../utils/hooks";
import {
  AVAILABLE_FONTS,
  FontOption,
  findDialectKey,
  getDialectLabel,
} from "../utils/const";
import { FontHeader } from "../components/components/FonttHeader";
import Markdown from "../components/Markdown";
import { useTranslation } from "../i18n/LanguageContext";
import {
  recentEntryToFontOption,
  useRecentFonts,
} from "../RecentFontsContext";
import { USER_FONTS_GROUP_KEY } from "../AppContext";
import TypographyControls, {
  useTypographySettings,
  type TypographySettings,
} from "../components/TypographyControls";

// Specimen-specific default: 56 px (the original md-breakpoint
// rendering) — bigger than the showcase default (36 px) because
// /specimen is a single-font detail page where typographic
// presence is the whole point.
const SPECIMEN_TYPO_DEFAULTS: TypographySettings = {
  fontSizePx: 56,
  letterSpacingEm: 0,
};

const Specimen = () => {
  const { msg, setMsg, loadFont, loadingFonts } = useContext(AppContext);
  const { entries: recentEntries } = useRecentFonts();
  const { family } = useParams<{ family: string }>();
  const { t, lang } = useTranslation();

  // Resolve the routed `family` URL param to a FontOption. We walk
  // AVAILABLE_FONTS — keyed by dialect → group → font name — and
  // return the matching option. The old implementation iterated a
  // `for...in` over the dialect group object, treating "fonts" /
  // "lang" as font names; in practice that loop never matched and
  // the page always fell back to the first font in the list. The
  // walk below uses `Object.entries(group.fonts)` so we hit the
  // actual font records.
  const fontOption: FontOption = useMemo(() => {
    if (family) {
      for (const group of Object.values(AVAILABLE_FONTS)) {
        if (family in group.fonts) {
          return group.fonts[family];
        }
      }
      // Fallback: check the IndexedDB recent-fonts cache. User-generated
      // fonts live there rather than in the static AVAILABLE_FONTS
      // catalog, so a /specimen/{entry.id} URL only resolves here.
      // If the visitor is on a different device than where the font
      // was generated, the entry won't exist and we fall through to
      // the "first available font" default below.
      const userEntry = recentEntries.find((e) => e.id === family);
      if (userEntry) return recentEntryToFontOption(userEntry);
    }
    // No (or unknown) family param — return the first available font
    // so the page renders something useful instead of a blank pane.
    const firstGroup = Object.values(AVAILABLE_FONTS)[0];
    return Object.values(firstGroup.fonts)[0];
  }, [family, recentEntries]);

  // Reverse-lookup the dialect so we can (a) show the Chip badge above
  // the FontHeader and (b) feed `useTemplateRotation` the right
  // template pool. `findDialectKey` returns undefined for fonts not
  // listed in AVAILABLE_FONTS (e.g. a stale URL); in that case we
  // render without the chip and fall back to the flat global pool.
  const dialectKey = useMemo(() => {
    // findDialectKey only walks the static AVAILABLE_FONTS map. For
    // user-generated fonts we surface a synthetic key so the
    // dialect chip can still render with a sensible label.
    const builtIn = findDialectKey(fontOption.name);
    if (builtIn) return builtIn;
    if (recentEntries.some((e) => e.id === fontOption.name)) {
      return USER_FONTS_GROUP_KEY;
    }
    return undefined;
  }, [fontOption.name, recentEntries]);
  const dialectLabel = useMemo(() => {
    if (!dialectKey) return undefined;
    if (dialectKey === USER_FONTS_GROUP_KEY) {
      return lang === "zh"
        ? t("showcase.userFonts.zh")
        : t("showcase.userFonts.en");
    }
    return getDialectLabel(dialectKey, lang);
  }, [dialectKey, lang, t]);

  const isLoading = Boolean(loadingFonts[fontOption.name]);

  // SEO meta — interpolate the font's displayName into the
  // i18n template (`meta.specimen.title` / `meta.specimen.description`
  // contain a {name} placeholder). canonicalPath includes the
  // family name so each specimen page has its own canonical URL,
  // letting Google index all 28 specimen variants as distinct
  // resources for long-tail "[font name] download" queries.
  useDocumentMeta(
    t("meta.specimen.title").replace("{name}", fontOption.displayName),
    t("meta.specimen.description").replace("{name}", fontOption.displayName),
    { canonicalPath: `/specimen/${fontOption.name}` },
  );

  // Pick a rotating template from the dialect-matched pool. Specimen
  // is a single-font page so we don't share a tick with anything
  // else — let the hook own its own 5 s interval. When dialectKey is
  // undefined the hook falls back to TEMPLATES (flat), so an unknown
  // font still gets sample text instead of blank.
  const msgShown = useTemplateRotation(msg, dialectKey);

  // ── Fade transition between rotations ────────────────────────────
  // Mirrors the /showcase pattern: hold `displayedMsg` constant while
  // opacity animates to 0, then swap the text and animate back to 1.
  // Without this the lyric snaps between lines and reads as a glitch
  // rather than a rotation.
  const FADE_MS = 300;
  const [displayedMsg, setDisplayedMsg] = useState(msgShown);
  const [isFadedIn, setIsFadedIn] = useState(true);
  useEffect(() => {
    if (msgShown === displayedMsg) return;
    setIsFadedIn(false);
    const timeout = setTimeout(() => {
      setDisplayedMsg(msgShown);
      setIsFadedIn(true);
    }, FADE_MS);
    return () => clearTimeout(timeout);
  }, [msgShown, displayedMsg]);

  // Compose two opacity sources: dim while the FontFace is still
  // resolving (same affordance as the showcase cards) and fade
  // between rotations. Min-of-both means whichever is more
  // restrictive wins — a font that's mid-rotation and mid-load
  // briefly reads as 0, which is fine.
  const previewOpacity = Math.min(isLoading ? 0.35 : 1, isFadedIn ? 1 : 0);

  // Typography preferences. Shared with /showcase via the same
  // localStorage keys — a designer who picks 64 px while looking
  // at a Mandarin specimen sees the showcase row at 64 px next
  // time too. Different page-level defaults (56 px here vs 36
  // for showcase) only kick in when localStorage is empty.
  const [typoSettings, setTypoSettings] = useTypographySettings(
    SPECIMEN_TYPO_DEFAULTS,
  );

  // Load the FontFace for this specimen. Re-fires if the user
  // navigates between specimen URLs without unmounting (e.g. from a
  // share link). loadingFonts[fontOption.name] gates the spinner.
  useEffect(() => {
    loadFont(fontOption);
  }, [fontOption, loadFont]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      height="100vh"
      gap={2}
      py={2}
    >
      {/*
        Dialect chip + loading affordance, mirroring /showcase. The
        Chip sits ABOVE the FontHeader so the visual reading order is
        "what dialect is this for" → "what font is this called" →
        "download buttons" → "the sample text". A non-developer
        scanning the specimen page learns the dialect before the
        typographic name, which is the right hierarchy for them.

        When dialectLabel is undefined (stale or out-of-list font),
        the chip is simply skipped — no placeholder, no error.
      */}
      <Box display="flex" alignItems="center" gap={1}>
        {dialectLabel && (
          <Chip
            label={dialectLabel}
            size="small"
            variant="outlined"
            color="primary"
          />
        )}
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
        family={fontOption.name}
        displayName={fontOption.displayName}
      />
      <TextField
        label={t("showcase.tryIt")}
        value={msg}
        onChange={({ target: { value } }) => setMsg(value)}
        fullWidth
      />
      <TypographyControls
        defaults={SPECIMEN_TYPO_DEFAULTS}
        settings={typoSettings}
        setSettings={setTypoSettings}
      />
      <Box flex={1} display="flex" width="100%" overflow="scroll">
        <Typography
          sx={{
            // Apply user-tunable type controls. textWrap=wrap +
            // lineHeight=1.4 preserved from the static msgSx —
            // specimen pages still want long sample text to break
            // across multiple lines (unlike /showcase where each
            // sample stays on one line).
            fontSize: `${typoSettings.fontSizePx}px`,
            letterSpacing: `${typoSettings.letterSpacingEm}em`,
            textWrap: "wrap" as const,
            lineHeight: 1.4,
            opacity: previewOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
          fontFamily={fontOption.name}
        >
          {displayedMsg}
        </Typography>
      </Box>
      {/*
        Per-font correction CTA. Lives at the bottom of the
        specimen page because that's the moment a reader has
        actually SEEN the annotated glyphs and might think "wait,
        that reading is wrong". The {name} placeholder gets the
        machine font name (used in the GitHub Issues title for
        triage), URL-encoded so spaces / Cantonese chars in the
        displayName don't break the link. Rendered via <Markdown>
        compact so the inline GitHub link is themed consistently
        with the rest of the site.
      */}
      <Box sx={{ opacity: 0.85 }}>
        <Markdown variant="compact">
          {t("specimen.reportError").replace(
            "{name}",
            encodeURIComponent(fontOption.name),
          )}
        </Markdown>
      </Box>
    </Box>
  );
};

export default Specimen;

// NOTE: the static `msgSx` (responsive xs:32 / sm:44 / md:56 / lg:72
// ladder) that used to live here has been retired. Typography now
// flows through the localStorage-persisted TypographyControls
// component — the previous md-breakpoint default (56 px) is what
// SPECIMEN_TYPO_DEFAULTS encodes and what the Reset link restores.
// Mobile users with the slider at 56 px will see overflow on very
// narrow viewports; that's expected — the Box wrapping the
// Typography uses `overflow: scroll` (see render above) so the
// page never breaks layout-wise.
