import {
  Box,
  Divider,
  SxProps,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import { useContext } from "react";
import AppContext from "../AppContext";
import { useNavigate } from "react-router-dom";
import { useTemplateRotation } from "../utils/hooks";
import { FontHeader } from "../components/components/FonttHeader";
import FontPicker from "../components/main/FontPicker";
import { useTranslation } from "../i18n/LanguageContext";

const Main = () => {
  const { msg, setMsg, pickedFonts } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const msgShown = useTemplateRotation(msg);
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
      {pickedFonts.map((pickedFont, idx) => 
        <Box width="100%" key={`${pickedFont.name}-showcase`}>
          <FontHeader family={pickedFont.name} displayName={pickedFont.displayName} idx={idx} />
          <Box>
            <Typography
              sx={{ ...msgSx, cursor: "pointer" }}
              fontFamily={pickedFont.name}
              onClick={() => navigate(`/specimen/${pickedFont.name}`)}
            >
              {msgShown}
            </Typography>
          </Box>
          <Divider />
        </Box>
      )}
    </Box>
  );
};

export default Main;

const msgSx: SxProps<Theme> = {
  fontSize: 36,
  textWrap: "nowrap",
};
