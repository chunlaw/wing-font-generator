/**
 * FontPicker — two cascading Autocompletes for the /showcase page:
 *
 *   ┌─────────────┐ ┌─────────────┐ ┌─┐
 *   │  Dialect    │ │  Font       │ │+│
 *   └─────────────┘ └─────────────┘ └─┘
 *
 * Why Autocomplete instead of Select:
 *   • The dialect list grew past 10 entries and the font list per
 *     dialect can reach 30+ — scrolling through them on a mobile
 *     dropdown is painful.
 *   • Type-to-filter cuts the path to a known font from "scroll +
 *     squint" to one or two keystrokes.
 *   • Autocomplete's mobile experience opens with the input focused
 *     and the keyboard up, which the native <select> derivative
 *     emphatically doesn't do.
 *
 * Why React.memo:
 *   The parent /showcase page (Main.tsx) owns a 5-second sharedTick
 *   that drives the per-card sample-text rotation. Without
 *   memoization, every tick re-rendered this component and the open
 *   Autocomplete listbox lost its scroll position mid-browse. The
 *   FontPicker takes NO props, so memoization is a strict win: it
 *   simply never re-renders due to a parent update; only its own
 *   AppContext / RecentFontsContext / useTranslation reads can
 *   cause a re-render.
 *
 * Why the filename caption + filename search:
 *   Catalogue fonts have a Chinese-only `displayName`, opaque to a user
 *   who doesn't read Chinese. Each option therefore also shows its Latin
 *   filename (`name`, e.g. NotoSansHK-NotoKR-korean) as a dimmed caption
 *   line, and that filename is folded into the Autocomplete filter so
 *   typing "korean" / "thai" finds the font without Chinese input. Both
 *   are gated to catalogue fonts — user fonts' `name` is an opaque id.
 *
 * Why useMemo on the option arrays:
 *   Belt-and-braces for the same reason. Even with React.memo, if
 *   the dialect option list got recreated on a context update that
 *   ISN'T related to the options themselves, Autocomplete would
 *   reset its filter / scroll. Memoizing keeps the array reference
 *   stable across renders where the underlying data hasn't changed.
 */
import { useCallback, useContext, useEffect, useMemo, useState, memo } from "react";
import {
  Autocomplete,
  Box,
  createFilterOptions,
  IconButton,
  ListSubheader,
  TextField,
  Typography,
} from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import AppContext from "../../AppContext";
import {
  AVAILABLE_FONTS,
  getDialectLabel,
  USER_FONTS_GROUP_KEY,
} from "../../utils/const";
import { useRecentFonts } from "../../RecentFontsContext";
import { useTranslation } from "../../i18n/LanguageContext";

interface DialectOption {
  value: string;
  label: string;
}

interface FontPickOption {
  /** Stable id used as the value when picked + as the React key. */
  name: string;
  /** Display copy shown in the listbox + the input. */
  displayName: string;
  /** Optional grouping label for Autocomplete's `groupBy`. */
  group?: string;
}

interface FontPickerState {
  lang: string;
  fontName: string;
}

const FontPicker = () => {
  const { addPickedFont } = useContext(AppContext);
  const { t, lang } = useTranslation();
  const { entries: recentEntries } = useRecentFonts();

  const [state, setState] = useState<FontPickerState>(() => ({
    lang: "cantonese",
    fontName:
      Object.keys(AVAILABLE_FONTS.cantonese.fonts).find(
        (k) => !AVAILABLE_FONTS.cantonese.fonts[k].pending,
      ) ?? "",
  }));

  // ── Dialect options ───────────────────────────────────────────────
  // The built-in catalogue is always present; the user-fonts group is
  // only exposed once the user has at least one uploaded / generated
  // font. Hide any dialect whose every font is pending CDN
  // availability — exposing it would surface an empty font list.
  const dialectOptions = useMemo<DialectOption[]>(() => {
    const fromCatalog = Object.keys(AVAILABLE_FONTS)
      .filter((key) =>
        Object.values(AVAILABLE_FONTS[key].fonts).some(
          (opt) => !opt.pending,
        ),
      )
      .map((key) => ({ value: key, label: getDialectLabel(key, lang) }));

    if (recentEntries.length > 0) {
      fromCatalog.push({
        value: USER_FONTS_GROUP_KEY,
        label: getDialectLabel(USER_FONTS_GROUP_KEY, lang),
      });
    }
    return fromCatalog;
    // `lang` is the UI language (zh-yue / en) — labels are
    // language-keyed via getDialectLabel. recentEntries.length is the
    // boolean that decides whether the user-fonts group renders, so
    // it's the only relevant axis of recentEntries we track here.
  }, [lang, recentEntries.length]);

  // ── Font options for the currently-selected dialect ───────────────
  // User-fonts entries don't live in AVAILABLE_FONTS so they go down
  // a different branch. Built-in entries carry an optional `group`
  // field that Autocomplete's `groupBy` consumes to render
  // <ListSubheader>s at runs of matching options.
  //
  // The `pending: true` filter lives at this layer so removing the
  // flag in const.ts is the single switch that re-exposes the font.
  const fontOptions = useMemo<FontPickOption[]>(() => {
    if (state.lang === USER_FONTS_GROUP_KEY) {
      return recentEntries.map((e) => ({
        name: e.id,
        displayName: e.displayName,
      }));
    }
    const dialect = AVAILABLE_FONTS[state.lang];
    if (!dialect) return [];
    return Object.values(dialect.fonts)
      .filter((opt) => !opt.pending)
      .map((opt) => ({
        name: opt.name,
        displayName: opt.displayName,
        group: opt.group,
      }));
  }, [state.lang, recentEntries]);

  // Selected option objects derived from the keys in state — fed back
  // into Autocomplete's controlled `value`. `null` when the saved id
  // no longer maps to anything (recent fonts list shrank, dialect
  // catalogue changed) so Autocomplete shows an empty input rather
  // than the previous selection's label.
  // `?? undefined` (not null) because `disableClearable` narrows
  // Autocomplete's value type to `T | undefined` — null would type-
  // error. In practice these `find`s land hits virtually always
  // because state.lang / state.fontName are seeded from the catalog
  // itself; the fallback only kicks in transiently when the user
  // fonts list mutates under us before the dependent useEffect runs.
  const selectedDialect =
    dialectOptions.find((d) => d.value === state.lang) ?? undefined;
  const selectedFont =
    fontOptions.find((f) => f.name === state.fontName) ?? undefined;

  // Built-in catalogue fonts carry a Chinese-only `displayName`
  // (e.g. 思源黑體 香港（諺文標注）) — unreadable to a user who doesn't
  // read Chinese. The `name` is the Latin filename
  // (NotoSansHK-NotoKR-korean), which encodes base font + annotation +
  // variant and is far more guessable. We surface it as a dimmed
  // caption line under each option (see renderOption below) AND fold it
  // into the search text here, so typing "korean" / "thai" reaches the
  // font even without Chinese input.
  //
  // User fonts are excluded from both: their `name` is an opaque id, not
  // a filename, so a caption / search match on it would be noise.
  const isUserFontsDialect = state.lang === USER_FONTS_GROUP_KEY;
  const filterFontOptions = useMemo(
    () =>
      createFilterOptions<FontPickOption>({
        stringify: (opt) =>
          isUserFontsDialect
            ? opt.displayName
            : `${opt.displayName} ${opt.name}`,
      }),
    [isUserFontsDialect],
  );

  // Keep `state.fontName` valid when the user-fonts list mutates
  // under us (most commonly: user just generated a new font, which
  // gets prepended; or deleted one that was selected). If the saved
  // id no longer exists, fall back to the first available entry so
  // the + button stays click-enabled.
  useEffect(() => {
    if (
      state.lang === USER_FONTS_GROUP_KEY &&
      !recentEntries.some((e) => e.id === state.fontName)
    ) {
      setState((prev) => ({
        ...prev,
        fontName: recentEntries[0]?.id ?? "",
      }));
    }
  }, [recentEntries, state.lang, state.fontName]);

  const handleDialectChange = useCallback(
    (value: string) => {
      setState(() => {
        if (value === USER_FONTS_GROUP_KEY) {
          return {
            lang: value,
            fontName: recentEntries[0]?.id ?? "",
          };
        }
        const firstAvailable = Object.values(AVAILABLE_FONTS[value].fonts).find(
          (opt) => !opt.pending,
        );
        return {
          lang: value,
          fontName: firstAvailable?.name ?? "",
        };
      });
    },
    [recentEntries],
  );

  const handleFontChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, fontName: value }));
  }, []);

  return (
    <Box width="100%" display="flex" gap={1} alignItems="center">
      {/*
        Dialect picker. `disableClearable` because the picker only
        makes sense with a dialect selected — clearing it would
        require special-casing the font picker as "no options" and
        the + button as "disabled-no-selection", neither of which
        improves UX. `disablePortal=false` (the MUI default) keeps
        the popper above the surrounding card without z-index
        gymnastics.
      */}
      <Autocomplete
        sx={{ flex: 1, minWidth: 0 }}
        size="small"
        options={dialectOptions}
        value={selectedDialect}
        onChange={(_, value) => {
          if (value) handleDialectChange(value.value);
        }}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(opt, value) => opt.value === value.value}
        disableClearable
        autoHighlight
        // openOnFocus surfaces options on first tap (mobile) /
        // first focus (desktop) without requiring the user to type
        // — important because most users browse rather than search.
        openOnFocus
        renderInput={(params) => (
          <TextField {...params} label={t("picker.dialect")} />
        )}
      />
      {/*
        Font picker. groupBy emits ListSubheaders for matching runs of
        options (same look as the old Select had via flatMap +
        ListSubheader). Disabled when the current dialect has no
        non-pending fonts — shouldn't usually happen because we
        filter empty dialects out of `dialectOptions` above, but a
        belt-and-braces guard keeps the picker from rendering an
        un-resolvable selection.
      */}
      <Autocomplete
        sx={{ flex: 1.5, minWidth: 0 }}
        size="small"
        options={fontOptions}
        value={selectedFont}
        onChange={(_, value) => {
          if (value) handleFontChange(value.name);
        }}
        getOptionLabel={(opt) => opt.displayName}
        isOptionEqualToValue={(opt, value) => opt.name === value.name}
        // Match on displayName + Latin filename (see filterFontOptions)
        // so the font is reachable without typing Chinese.
        filterOptions={filterFontOptions}
        groupBy={(opt) => opt.group ?? ""}
        // Two-line option: the (Chinese) displayName, plus a dimmed
        // monospace caption with the filename so a foreign user can
        // guess what the font is. Caption suppressed for user fonts
        // (their `name` is an opaque id). The input box still shows
        // only displayName via getOptionLabel.
        renderOption={(props, option) => {
          // MUI v6 puts `key` in `props`; it must be passed directly,
          // not spread, or React warns.
          const { key, ...optionProps } = props;
          return (
            <Box
              component="li"
              key={key}
              {...optionProps}
              sx={{
                // Override Autocomplete's default centered row so the
                // two lines stack, left-aligned.
                flexDirection: "column",
                alignItems: "flex-start !important",
                gap: 0,
              }}
            >
              <Typography variant="body2" component="span">
                {option.displayName}
              </Typography>
              {!isUserFontsDialect && (
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    color: "text.secondary",
                    fontFamily: "monospace",
                    lineHeight: 1.3,
                  }}
                >
                  {option.name}
                </Typography>
              )}
            </Box>
          );
        }}
        renderGroup={(params) =>
          // Suppress the ListSubheader entirely for ungrouped options
          // (empty `group` string). Without this, Autocomplete would
          // render an empty header band above the un-grouped run,
          // visually identical to a strange dotted line.
          params.group ? (
            <li key={params.key}>
              <ListSubheader
                sx={{ pointerEvents: "none", lineHeight: 2.2 }}
              >
                {params.group}
              </ListSubheader>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          ) : (
            <ul key={params.key} style={{ padding: 0 }}>
              {params.children}
            </ul>
          )
        }
        disableClearable
        autoHighlight
        openOnFocus
        disabled={fontOptions.length === 0}
        renderInput={(params) => (
          <TextField {...params} label={t("picker.font")} />
        )}
        noOptionsText={t("picker.noOptions")}
      />
      <IconButton
        onClick={() => addPickedFont(state.lang, state.fontName)}
        disabled={!state.fontName}
        aria-label={t("picker.addAriaLabel")}
      >
        <AddCircleOutline />
      </IconButton>
    </Box>
  );
};

// React.memo with no comparator: FontPicker takes no props, so the
// default shallow-equality check (which trivially passes when there
// are no props) keeps the parent's 5-second tick from triggering a
// re-render. Internal context / state updates still re-render
// normally, which is what we want for the dialect / font selection.
export default memo(FontPicker);
