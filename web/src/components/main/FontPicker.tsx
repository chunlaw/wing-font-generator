import { Box, IconButton, ListSubheader, MenuItem, TextField } from "@mui/material"
import { useCallback, useContext, useEffect, useState } from "react"
import AppContext, { USER_FONTS_GROUP_KEY } from "../../AppContext"
import { AVAILABLE_FONTS, getDialectLabel } from "../../utils/const"
import { useRecentFonts } from "../../RecentFontsContext"
import { AddCircleOutline } from "@mui/icons-material"
import { useTranslation } from "../../i18n/LanguageContext"

interface FontPickerState {
  lang: string,
  fontName: string,
}

const FontPicker = () => {
  const { addPickedFont } = useContext(AppContext)
  const { lang, t } = useTranslation()
  const { entries: recentEntries } = useRecentFonts()

  const [state, setState] = useState<FontPickerState>(DEFAULT_STATE)

  // Whenever the recent-fonts list changes (e.g. the user just
  // generated a font and the chip row added a new entry), keep the
  // picker's fontName in sync: if the selected lang is the
  // user-fonts group, default to the first available entry so the
  // dropdown doesn't show a stale id that no longer maps to
  // anything renderable.
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

  const handleLangChange = useCallback((value: string) => {
    setState(prev => {
      if (value === USER_FONTS_GROUP_KEY) {
        return {
          ...prev,
          lang: value,
          fontName: recentEntries[0]?.id ?? "",
        };
      }
      return {
        ...prev,
        lang: value,
        fontName: Object.keys(AVAILABLE_FONTS[value].fonts)[0],
      };
    })
  }, [recentEntries])

  const handleFontNameChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      fontName: value,
    }))
  }, [])

  // Show the user-fonts group as an extra lang option only when at
  // least one user font exists. No point exposing an empty group on
  // first-time visits — the dropdown stays simpler until earned.
  const showUserFontsGroup = recentEntries.length > 0;
  const userFontsLabel =
    lang === "zh" ? t("showcase.userFonts.zh") : t("showcase.userFonts.en");

  // The font-name dropdown's options depend on which lang is
  // selected. User-fonts entries don't live in AVAILABLE_FONTS so
  // we branch the render.
  const fontOptions =
    state.lang === USER_FONTS_GROUP_KEY
      ? recentEntries.map((e) => ({ name: e.id, displayName: e.displayName }))
      : Object.values(AVAILABLE_FONTS[state.lang]?.fonts ?? {}).map((opt) => ({
          name: opt.name,
          displayName: opt.displayName,
        }));

  return (
    <Box
      width="100%"
      display="flex"
      gap={1}
    >
      <TextField
        select
        value={state.lang}
        onChange={({target: {value}}) => handleLangChange(value)}
        fullWidth
      >
        {Object.keys(AVAILABLE_FONTS).map((key) =>
          <MenuItem key={`${key}-option`} value={key}>
            {getDialectLabel(key, lang)}
          </MenuItem>
        )}
        {showUserFontsGroup && [
          // ListSubheader visually separates user fonts from the
          // built-in dialect set. pointerEvents: none prevents the
          // header itself from acting as a Select target.
          <ListSubheader
            key="user-fonts-header"
            sx={{ pointerEvents: "none", lineHeight: 2.2 }}
          >
            {userFontsLabel}
          </ListSubheader>,
          <MenuItem
            key={`${USER_FONTS_GROUP_KEY}-option`}
            value={USER_FONTS_GROUP_KEY}
            sx={{ pl: 4 }}
          >
            {userFontsLabel}
          </MenuItem>,
        ]}
      </TextField>
      <TextField
        select
        value={state.fontName}
        onChange={({target: {value}}) => handleFontNameChange(value)}
        fullWidth
        disabled={fontOptions.length === 0}
      >
        {fontOptions.map(({ name, displayName }) => (
          <MenuItem key={`${name}-option`} value={name}>
            {displayName}
          </MenuItem>
        ))}
      </TextField>
      <IconButton
        onClick={() => addPickedFont(state.lang, state.fontName)}
        disabled={!state.fontName}
      >
        <AddCircleOutline />
      </IconButton>
    </Box>
  )
}

export default FontPicker

const DEFAULT_STATE: FontPickerState = {
  lang: "cantonese",
  fontName: Object.keys(AVAILABLE_FONTS["cantonese"].fonts)[0],
}
