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
      // ── Responsive direction ──────────────────────────────────────
      // Desktop (sm+): name on the left, download buttons on the
      // right, both centred on a single row — the natural "card
      // header" reading.
      //
      // Mobile (xs): switch to column. Some font displayNames are
      // long (e.g. 「思源黑體 香港（香港語言學會）」) and on a
      // ~360 px viewport there isn't room for that plus two
      // download buttons on one row. Previously the row used
      // flex-wrap, which let the buttons orphan onto a second row
      // anchored to the right edge — visually disconnected from
      // the font they belong to. Stacking explicitly keeps both
      // groups left-anchored and reads as two intentional rows.
      flexDirection={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
    >
      <Box display="flex" gap={1} alignItems="center">
        {displayName}
        {idx !== undefined && (
          <IconButton size="small" onClick={() => removePickedFont(idx)}>
            <RemoveCircleOutline />
          </IconButton>
        )}
      </Box>
      <Box
        display="flex"
        gap={1}
        alignItems="center"
        // Negative margin pulls the button cluster back to the
        // visual left edge when it wraps onto its own mobile row
        // — the .ttf/.woff buttons have ~12 px of internal padding
        // that otherwise makes them appear to sit indented from
        // the font name above. Cancels out cleanly on desktop
        // because alignItems="center" + justifyContent="space-between"
        // doesn't care about the horizontal nudge.
        sx={{ ml: { xs: -1, sm: 0 } }}
      >
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
