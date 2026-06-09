import { Box, Button, Link, Typography, IconButton } from "@mui/material";
import { useTheme } from "../../ThemeContext";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useState } from "react";
import IntroDialog from "../components/IntroDialog";

const Header = () => {
  const { mode, toggleTheme } = useTheme();
  const [isDialog, setIsDialog] = useState<boolean>(false);

  return (
    <Box
      display="flex"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
      my={1}
    >
      <Box>
        <Link
          href="/"
          sx={{ textDecoration: "none", color: "inherit" }}
          paddingY={2}
        >
          <Typography variant="h5" letterSpacing={-1}>
            Wing Font
          </Typography>
        </Link>
        <Typography variant="body1" mb={1}>
          免費開源，適合製作不同字體以供開發／教學等用途
        </Typography>
      </Box>
      <Box display="flex" gap={1} alignItems="center">
        <Button
          variant="contained"
          color="primary"
          href="/generate"
          sx={{ borderRadius: "9999px" }}
          size="small"
        >
          自製字體
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsDialog(true)}
          sx={{
            borderRadius: "9999px",
          }}
          size="small"
        >
          了解更多！
        </Button>
        <Button
          onClick={() =>
            window.open("https://github.com/sponsors/chunlaw", "_blank")
          }
          variant="contained"
          sx={{
            borderRadius: "9999px",
          }}
        >
          捐助
        </Button>
        <IconButton onClick={toggleTheme} color="inherit">
          {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Box>
      <IntroDialog open={isDialog} onClose={() => setIsDialog(false)} />
    </Box>
  );
};

export default Header;
