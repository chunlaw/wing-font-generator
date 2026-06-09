import { GitHub as GitHubIcon, Instagram, Telegram } from "@mui/icons-material";
import { Box, IconButton, SxProps, Theme } from "@mui/material";

const Footer = () => {
  return (
    <Box sx={rootSx}>
      <Box>
        <IconButton
          onClick={() => {
            window.open(
              "https://github.com/chunlaw/wing-font-generator",
              "_blank",
            );
          }}
          size="small"
        >
          <GitHubIcon />
        </IconButton>
        <IconButton
          onClick={() => window.open("https://t.me/wingfont", "_blank")}
        >
          <Telegram />
        </IconButton>
        <IconButton
          onClick={() =>
            window.open("https://www.instagram.com/wingfont", "_blank")
          }
        >
          <Instagram />
        </IconButton>
      </Box>
      <Box>MIT License (Free & Open Source)</Box>
    </Box>
  );
};

export default Footer;

const rootSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
};
