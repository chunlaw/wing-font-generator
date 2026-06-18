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
import { effectiveDir } from "../utils/textDirection";

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

  // SEO meta — interpolate the font's displayName AND its dialect into
  // the i18n template (`meta.specimen.title` / `meta.specimen.description`
  // carry {name} and {dialect} placeholders). The description introduces
  // what the font IS (a {dialect} font with pronunciation annotations)
  // and how it's produced (Wing Font composes open-source base +
  // annotation fonts), so the prerendered <head> of every specimen page
  // gives crawlers and social unfurlers font-specific, descriptive copy
  // instead of one generic blurb. canonicalPath includes the family name
  // so each specimen page has its own canonical URL, letting Google index
  // every variant as a distinct resource for long-tail
  // "[font name] download" queries.
  //
  // `dialectLabel` is undefined only for off-catalog / user-generated
  // fonts (not prerendered); fall back to a generic "Chinese" / "中文"
  // so the placeholder never leaks into the rendered tag.
  const dialectForMeta = dialectLabel ?? (lang === "zh" ? "中文" : "Chinese");
  useDocumentMeta(
    t("meta.specimen.title")
      .replace("{name}", fontOption.displayName)
      .replace("{dialect}", dialectForMeta),
    t("meta.specimen.description")
      .replace("{name}", fontOption.displayName)
      .replace("{dialect}", dialectForMeta),
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

  // Effective writing direction for the editor — drives both
  // typing direction (caret on the right for Arabic) AND display
  // alignment (right-anchored prose). Memoized because effectiveDir
  // walks `msg` codepoint-by-codepoint to find a strong-RTL
  // character, and on a long pasted paragraph that's O(n) per
  // render. With memoization the scan only fires when `msg` or the
  // picked dialect actually changes.
  //
  // Empty-state special case: when `msg` is empty AND the font is
  // an Arabic-base specimen, this resolves to "rtl" so the caret
  // starts on the right — matches what an Arabic typist expects
  // before they've typed anything. See effectiveDir's docstring
  // for the full decision rules.
  const editorDir = useMemo(
    () => effectiveDir(msg, dialectKey),
    [msg, dialectKey],
  );

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      // No `height` constraint — the editor below grows with its
      // content (MUI's TextareaAutosize behaviour), so the page
      // length is whatever the prose + chrome adds up to. The
      // browser viewport scrolls naturally once the page exceeds
      // it. `minHeight: 100vh` keeps the page at least one viewport
      // tall on first paint so the background extends through the
      // empty space when the user hasn't typed anything yet.
      minHeight="100vh"
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
        The previously-separate "tiny TextField input + large read-
        only Typography render" pair collapses into one large
        multiline TextField. The input element itself uses the
        specimen's font / size / letter spacing / line height — so
        the user TYPES IN the actual font and gets immediate WYSIWYG
        feedback. No more typing in a system-font field above and
        inferring the look from a separate echo below.

        Sizing model — TextareaAutosize / page scrolls:
        `multiline` + `minRows` (no `maxRows`) makes MUI wrap the
        underlying <textarea> in TextareaAutosize, which grows the
        textarea's intrinsic height with content. There is NO
        scrollbar inside the field — the user always sees their
        entire prose laid out. When the textarea's natural height
        exceeds the viewport, the BROWSER VIEWPORT scrolls; the
        outer page-column wrapper above has `minHeight: 100vh` (not
        `height: 100vh`) so it can grow past the viewport without
        clipping.

        That's the inverse of the earlier "fixed-height field with
        internal scroll" attempt: this matches what designers
        actually want when authoring at the specimen's size —
        scrolling the page reveals more of THEIR own document, not
        a window into a hidden middle.

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
          editor area so its boundary is legible against the page
          background.
        - `minRows={6}` ensures the editor starts at a comfortable
          ~6-line floor even when empty — gives visual weight to
          the empty state (where the placeholder rotation lives).
          No `maxRows`, so growth is unbounded.
        - `lineHeight: 2.3` is the same value the old Typography
          render used. Word-unit fonts (Arabic / Thai base) put
          the romanization in the descender — the natural line box
          is ~2.26em. 2.3 sits just above that so below-annotation
          lines never overlap, and it strictly exceeds the old 1.6
          so the above-the-character cases (Xiaolai + Thai /
          Katakana / Korean / Urdu with raised winAscent) keep
          their headroom. Cost: airier spacing on plain CJK
          pairings, which is fine on a large single-font specimen.
        - `opacity` on the input only — the outline border is
          unchanged during loading, so the "dim while loading"
          state reads as content-dim, not field-dim.
        - `::placeholder` selector inherits fontFamily etc. from
          the input by default; we only adjust opacity to mute the
          placeholder relative to typed text.
        - `resize: vertical` is the deliberate trade-off — letting
          the user shrink the field if they want a compact view
          for a short snippet — but since the autosize already
          tracks content height, the resize handle is mostly
          cosmetic; leaving it as `none` is also fine and avoids
          a visual handle on the bottom-right corner.
      */}
      <TextField
        value={msg}
        onChange={({ target: { value } }) => setMsg(value)}
        placeholder={msgShown}
        multiline
        minRows={6}
        fullWidth
        variant="outlined"
        aria-label={t("specimen.editorAriaLabel")}
        // `dir` on the underlying <textarea> drives both typing
        // direction (caret + line wrapping) and display direction
        // (right-anchoring for RTL prose). The MUI bidi algorithm
        // still handles in-line mixed-script resolution within the
        // run, so a Latin word inside an Arabic sentence renders
        // correctly without further wrapping.
        slotProps={{ htmlInput: { dir: editorDir } }}
        sx={{
          // Apply user-tunable type controls directly to the input
          // element so the user types in the actual font at the
          // actual size. No height / overflow overrides — the
          // textarea autosizes to its content and the outer page
          // viewport scrolls when content overflows.
          "& .MuiInputBase-input": {
            fontFamily: fontOption.name,
            fontSize: `${typoSettings.fontSizePx}px`,
            letterSpacing: `${typoSettings.letterSpacingEm}em`,
            lineHeight: 2.3,
            textWrap: "wrap" as const,
            opacity: previewOpacity,
            transition: `opacity ${PREVIEW_OPACITY_TRANSITION_MS}ms ease-in-out`,
            // Hide the native resize handle (bottom-right corner).
            // The textarea autosizes to content, so a drag handle
            // would just fight the autoresize on next keypress.
            resize: "none",
          },
          "& .MuiInputBase-input::placeholder": {
            // Placeholder inherits fontFamily etc. from the input
            // by default. We only mute it relative to typed text
            // so the empty-state rotation reads as discovery hint,
            // not as user content.
            opacity: 0.45,
          },
        }}
      />
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
