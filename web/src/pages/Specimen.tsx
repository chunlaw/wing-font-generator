import {
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo } from "react";
import AppContext from "../AppContext";
import { useNavigate, useParams } from "react-router-dom";
import UploadFontButton from "../components/main/UploadFontButton";
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
  const navigate = useNavigate();
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
          const opt = group.fonts[family];
          // Skip `pending` entries — the catalog row exists but
          // the CDN doesn't serve the font yet, so the FontFace
          // load would 404 and the page would render text in the
          // fallback system face with no annotation visible. Fall
          // through to the recent-fonts lookup + default below
          // instead, which gives the user something usable rather
          // than a silently-broken specimen.
          if (!opt.pending) return opt;
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
    // No (or unknown) family param — return the first NON-PENDING
    // font from the first dialect group so the page renders
    // something useful instead of a blank pane (or a 404'd font).
    for (const group of Object.values(AVAILABLE_FONTS)) {
      const usable = Object.values(group.fonts).find((opt) => !opt.pending);
      if (usable) return usable;
    }
    // Defensive: every dialect has only pending fonts (shouldn't
    // happen in practice — at minimum one Cantonese variant should
    // always be live). Fall back to the first entry of the first
    // group, accepting the broken-load tradeoff over a crash.
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
  const dialectLabel = useMemo(
    () => (dialectKey ? getDialectLabel(dialectKey, lang) : undefined),
    [dialectKey, lang],
  );

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
  //
  // The value is fed into the editable area below as the textarea's
  // `placeholder`. Browser placeholder rendering uses the same font
  // / size / spacing / GSUB pipeline as the actual input text, so
  // the rotation shows users what the font does (incl. its
  // annotations) on real prose. As soon as the user types, native
  // textarea behavior hides the placeholder and they edit their own
  // text in the same font.
  const msgShown = useTemplateRotation(msg, dialectKey);

  // Dim the editor while the FontFace is still resolving — same
  // affordance as the showcase cards. The rotation-fade transition
  // the previous read-only Typography needed is gone: native
  // placeholder swaps don't read as glitches because they happen on
  // a UI element the user perceives as "empty form field" rather
  // than "typeset prose", so an instant swap is fine.
  const previewOpacity = isLoading ? 0.35 : 1;
  const PREVIEW_OPACITY_TRANSITION_MS = 300;

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
        {/* Spacer pushes the upload affordance to the right edge so
            it doesn't compete with the dialect chip for the left
            anchor — same pattern as /showcase's Share row. */}
        <Box sx={{ flexGrow: 1 }} />
        <UploadFontButton
          onUploaded={(entry) => {
            // Specimen is a single-font page, so the natural thing
            // after upload is to switch the view to the just-
            // uploaded font. Navigate to its opaque-id URL — the
            // page's family-resolution effect walks recentEntries
            // for /specimen/<entry.id> lookups (see fontOption
            // useMemo at the top of this component).
            navigate(`/specimen/${entry.id}`);
          }}
        />
      </Box>
      <FontHeader
        family={fontOption.name}
        displayName={fontOption.displayName}
      />
      <TypographyControls
        defaults={SPECIMEN_TYPO_DEFAULTS}
        settings={typoSettings}
        setSettings={setTypoSettings}
      />
      {/*
        ── Editable specimen area ────────────────────────────────────
        The single biggest change to /specimen from the old layout:
        the previously-separate "tiny TextField input + large read-
        only Typography render" pair collapses into one large
        multiline TextField. The input element itself uses the
        specimen's font / size / letter spacing / line height — so
        the user TYPES IN the actual font and gets immediate WYSIWYG
        feedback. No more typing in a system-font field above and
        inferring the look from a separate echo below.

        Discovery affordance — the dialect-matched rotating sample
        (`msgShown`) is wired into the textarea's `placeholder`.
        Browser placeholder rendering uses the same font /
        GSUB pipeline as actual input text, so the rotation
        previews real prose at the specimen's chosen size, including
        annotations. As soon as the user types, native textarea
        behavior hides the placeholder; clearing the field brings
        the rotation back. The user's text persists in AppContext's
        `msg` so it carries to /showcase if they navigate back.

        Style notes:
        - `variant="outlined"` gives a soft border around the
          editor area; the outline keeps the editor visually
          contained (esp. on mobile where the page background and
          textarea background are otherwise indistinguishable).
        - `minRows={6}` ensures the editor is tall enough for prose
          on first paint even on short viewports; the wrapping Box
          claims `flex={1}` so the textarea expands to fill any
          extra vertical space available below.
        - `lineHeight: 2.3` is the same value the old Typography
          render used — see the long comment that lived there
          (preserved below) for why: word-unit fonts (Arabic /
          Thai base) put the romanization in the descender and
          need leading that contains the annotation per line.
        - `opacity` on the input only — the outline border is
          unchanged during loading, so the "dim while loading"
          state reads as content-dim, not field-dim.
        - `::placeholder` selector inherits font family from its
          input by default, so we don't have to repeat the font
          styles inside it; we only adjust opacity to mute the
          placeholder relative to typed text.
        - `resize: none` on the underlying textarea — the wrapping
          Box already handles vertical sizing and a user-drag
          handle would conflict with the controlled minRows.
      */}
      <Box flex={1} display="flex" width="100%" minHeight={0}>
        <TextField
          value={msg}
          onChange={({ target: { value } }) => setMsg(value)}
          placeholder={msgShown}
          multiline
          // `rows={1}` (NOT minRows) is load-bearing: with minRows /
          // maxRows MUI wraps the textarea in TextareaAutosize, which
          // measures the content and grows the element's intrinsic
          // height unbounded. The wrapping flex Box has no way to
          // constrain a child whose intrinsic height keeps expanding,
          // so a long prose paste pushes the textarea past the
          // viewport and the text visibly bleeds below the field's
          // outline (and past the report-error link at the page
          // bottom). With `rows={1}` MUI emits a plain `<textarea>`
          // with no autosize wrapper; we then force its height to
          // 100 % of the flex container below in `sx`, and native
          // textarea overflow handles the scroll bar.
          rows={1}
          fullWidth
          variant="outlined"
          aria-label={t("specimen.editorAriaLabel")}
          sx={{
            flex: 1,
            display: "flex",
            // Stretch the InputBase wrapper to fill the column,
            // and lay it out as a column itself so the inner
            // textarea can be told to fill it.
            "& .MuiInputBase-root": {
              flex: 1,
              height: "100%",
              alignItems: "stretch",
            },
            // Apply user-tunable type controls directly to the
            // input element so the user types in the actual font
            // at the actual size.
            //
            // lineHeight must contain the annotation row *per line*
            // for word-unit fonts (Arabic / Thai base) whose
            // romanization sits in the descender — the natural
            // line box is ~2.26em. 2.3 sits just above that so
            // below-annotation lines never overlap, and it
            // strictly exceeds the old 1.6 so the above-the-
            // character cases (Xiaolai + Thai/Katakana/Korean/Urdu
            // with raised winAscent) keep their headroom. Cost:
            // airier spacing on plain CJK pairings, which is fine
            // on a large single-font specimen.
            "& .MuiInputBase-input": {
              // `!important` overrides the inline `height` MUI sets
              // on the textarea from `rows={1}`. Without this the
              // element renders as a single line of glyphs and the
              // text caret jumps as the field wraps internally.
              height: "100% !important",
              // Native textarea scroll once content overflows the
              // fixed field height — keeps the rest of the page
              // (chip row, header, controls, report-error link)
              // anchored in place while the prose scrolls inside.
              overflow: "auto !important",
              fontFamily: fontOption.name,
              fontSize: `${typoSettings.fontSizePx}px`,
              letterSpacing: `${typoSettings.letterSpacingEm}em`,
              lineHeight: 2.3,
              textWrap: "wrap" as const,
              opacity: previewOpacity,
              transition: `opacity ${PREVIEW_OPACITY_TRANSITION_MS}ms ease-in-out`,
              // Hide the native resize handle (bottom-right
              // corner). The wrapping flex Box handles sizing.
              resize: "none",
            },
            "& .MuiInputBase-input::placeholder": {
              // Placeholder inherits fontFamily, fontSize, etc.
              // from the input by default. We only need to mute
              // it relative to typed text so the empty-state
              // rotation reads as discovery hint, not as user
              // content.
              opacity: 0.45,
            },
          }}
        />
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
