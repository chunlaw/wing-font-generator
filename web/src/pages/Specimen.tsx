import {
  Box,
  Chip,
  CircularProgress,
  SxProps,
  TextField,
  Theme,
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
import { useTranslation } from "../i18n/LanguageContext";

const Specimen = () => {
  const { msg, setMsg, loadFont, loadingFonts } = useContext(AppContext);
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
    }
    // No (or unknown) family param — return the first available font
    // so the page renders something useful instead of a blank pane.
    const firstGroup = Object.values(AVAILABLE_FONTS)[0];
    return Object.values(firstGroup.fonts)[0];
  }, [family]);

  // Reverse-lookup the dialect so we can (a) show the Chip badge above
  // the FontHeader and (b) feed `useTemplateRotation` the right
  // template pool. `findDialectKey` returns undefined for fonts not
  // listed in AVAILABLE_FONTS (e.g. a stale URL); in that case we
  // render without the chip and fall back to the flat global pool.
  const dialectKey = useMemo(
    () => findDialectKey(fontOption.name),
    [fontOption.name],
  );
  const dialectLabel = dialectKey
    ? getDialectLabel(dialectKey, lang)
    : undefined;

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
      <Box flex={1} display="flex" width="100%" overflow="scroll">
        <Typography
          sx={{
            ...msgSx,
            opacity: previewOpacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
          fontFamily={fontOption.name}
        >
          {displayedMsg}
        </Typography>
      </Box>
    </Box>
  );
};

export default Specimen;

const msgSx: SxProps<Theme> = {
  // Specimen pages exist to *display* fonts large — but 72px overflows
  // phones. Scale gradually so the font still feels like a feature
  // on desktop while remaining usable on a 360-wide screen.
  fontSize: { xs: 32, sm: 44, md: 56, lg: 72 },
  textWrap: "wrap",
  lineHeight: 1.4,
};
