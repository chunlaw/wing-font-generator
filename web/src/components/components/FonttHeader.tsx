import { Box, Button, IconButton } from "@mui/material";
import { Download, RemoveCircleOutline } from "@mui/icons-material";
import { useContext } from "react";
import AppContext from "../../AppContext";

interface FontHeaderProps {
  family: string;
  displayName: string;
  idx?: number;
}

/**
 * Header row above each showcase font: name + remove button on the
 * left, direct .ttf / .woff download buttons on the right.
 *
 * Earlier versions of this component used a single "免費下載" (Free
 * Download) button that opened a dropdown menu to pick TTF or WOFF.
 * The "free" framing was redundant — the entire site is free — and
 * the dropdown added an unnecessary click for a binary choice that
 * users were going to make anyway. Two direct buttons surface both
 * formats at once and keep the page parseable at a glance.
 */
export const FontHeader = ({ family, displayName, idx }: FontHeaderProps) => {
  const { removePickedFont } = useContext(AppContext);

  const handleDownload = (format: "ttf" | "woff") => {
    // VITE_FONT_URL is set in web/.env.{development,production} to the
    // current font CDN host. Going via the env var (instead of
    // hard-coding the URL) means future domain changes are a single
    // .env edit + redeploy.
    const base = import.meta.env.VITE_FONT_URL ?? "";
    window.open(`${base}/${family}.${format}`, "_blank");
  };

  return (
    <Box
      display="flex"
      gap={1}
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
    >
      <Box display="flex" gap={1} alignItems="center">
        {displayName}
        {idx !== undefined && (
          <IconButton size="small" onClick={() => removePickedFont(idx)}>
            <RemoveCircleOutline />
          </IconButton>
        )}
      </Box>
      <Box display="flex" gap={1} alignItems="center">
        {/*
          Two adjacent text buttons rather than a ButtonGroup so the
          rounded-pill shape on each individual button reads as
          "tappable target" on mobile, where ButtonGroup's square
          shared borders can look like a single control.
        */}
        <DownloadButton format="ttf" onClick={() => handleDownload("ttf")} />
        <DownloadButton format="woff" onClick={() => handleDownload("woff")} />
      </Box>
    </Box>
  );
};

/**
 * One pill-shaped download button. Extracted so the two formats stay
 * visually identical without duplicating the styling — and so any
 * future format additions (woff2, otf, …) are a one-line append.
 */
const DownloadButton = ({
  format,
  onClick,
}: {
  format: "ttf" | "woff";
  onClick: () => void;
}) => (
  <Button
    onClick={onClick}
    size="small"
    variant="text"
    startIcon={<Download />}
    sx={{
      borderRadius: "9999px",
      color: "secondary.main",
      // Slight horizontal padding so the icon + label cluster looks
      // intentional inside the rounded outline instead of crammed
      // against the curve.
      px: 1.5,
    }}
  >
    .{format}
  </Button>
);
