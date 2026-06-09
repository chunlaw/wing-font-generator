import { Box, IconButton, MenuItem, TextField } from "@mui/material"
import { useCallback, useContext, useState } from "react"
import AppContext from "../../AppContext"
import { AVAILABLE_FONTS } from "../../utils/const"
import { AddCircleOutline } from "@mui/icons-material"

interface FontPickerState {
  lang: string,
  fontName: string,
}

const FontPicker = () => {
  const { addPickedFont } = useContext(AppContext)
  
  const [state, setState] = useState<FontPickerState>(DEFAULT_STATE)

  const handleLangChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      lang: value,
      fontName: Object.keys(AVAILABLE_FONTS[value].fonts)[0],
    }))
  }, [])

  const handleFontNameChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      fontName: value,
    }))
  }, [])

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
        {Object.entries(AVAILABLE_FONTS).map(([key, {lang}]) => 
          <MenuItem key={`${key}-option`} value={key}>
            {lang["zh"]}
          </MenuItem>
        )}
      </TextField>
      <TextField
        select
        value={state.fontName}
        onChange={({target: {value}}) => handleFontNameChange(value)}
        fullWidth
      >
        {Object.values(AVAILABLE_FONTS[state.lang].fonts).map(({name, displayName}) => 
          <MenuItem key={`${name}-option`} value={name}>
            {displayName}
          </MenuItem>
        )}
      </TextField>
      <IconButton onClick={() => addPickedFont(state.lang, state.fontName)}>
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