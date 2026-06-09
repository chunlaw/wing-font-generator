import { Box, TextField, Typography, SxProps, Theme } from "@mui/material";
import { useContext, useEffect, useMemo } from "react";
import AppContext from "../AppContext";
import { useParams } from "react-router-dom";
import { useTemplateRotation } from "../utils/hooks";
import { AVAILABLE_FONTS } from "../utils/const";
import { FontHeader } from "../components/components/FonttHeader";

const Specimen = () => {
  const { msg, setMsg, loadFont } = useContext(AppContext);
  const { family } = useParams<{ family: string }>();
  const msgShown = useTemplateRotation(msg);

  const fontOption = useMemo(() => {
    for ( const lang in AVAILABLE_FONTS ) {
      for ( const _family in AVAILABLE_FONTS[lang] ) {
        if ( _family === family ) {
          return AVAILABLE_FONTS[lang].fonts[_family]
        }
      }
    }
    return Object.values(Object.values(AVAILABLE_FONTS)[0].fonts)[0]
  }, [])

  useEffect(() => {
    loadFont(fontOption)
  }, [loadFont])
  
  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      height="100vh"
      gap={2}
      py={2}
    >
      <FontHeader family={fontOption.name} displayName={fontOption.displayName} />
      <TextField
        label="隨便試 (Try it!!)"
        value={msg}
        onChange={({ target: { value } }) => setMsg(value)}
        fullWidth
      />
      <Box flex={1} display="flex" width="100%" overflow="scroll">
        <Typography sx={msgSx} fontFamily={family}>
          {msgShown}
        </Typography>
      </Box>
    </Box>
  );
};

export default Specimen;

const msgSx: SxProps<Theme> = {
  fontSize: 72,
  textWrap: "wrap",
};
