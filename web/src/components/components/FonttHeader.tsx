import { Box, Button, IconButton, Menu, MenuItem } from "@mui/material";
import { Download, RemoveCircleOutline } from "@mui/icons-material";
import { useContext, useRef, useState } from "react";
import AppContext from "../../AppContext";

interface FontHeaderProps {
  family: string;
  displayName: string;
  idx?: number
}

export const FontHeader = ({ family, displayName, idx }: FontHeaderProps) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { removePickedFont } = useContext(AppContext)

  const handleDownload = (format: "ttf" | "woff") => {
    window.open(`https://fonts.chunlaw.io/${family}.${format}`, "_blank");
    setOpen(false);
  };

  return (
    <Box
      display="flex"
      gap={1}
      alignItems="center"
      justifyContent="space-between"
    >
      <Box display="flex" gap={1} alignItems="center">
        {displayName}
        {idx !== undefined &&
          <IconButton size="small" onClick={() => removePickedFont(idx)}>
            <RemoveCircleOutline />
          </IconButton>}
      </Box>
      <Button
        ref={btnRef}
        onClick={() => setOpen(true)}
        size="small"
        variant="text"
        endIcon={<Download />}
        sx={{
          borderRadius: "9999px",
          color: "secondary.main",
        }}
      >
        免費下載
      </Button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={btnRef.current}
      >
        <MenuItem onClick={() => handleDownload("ttf")}>.ttf</MenuItem>
        <MenuItem onClick={() => handleDownload("woff")}>.woff</MenuItem>
      </Menu>
    </Box>
  );
};
