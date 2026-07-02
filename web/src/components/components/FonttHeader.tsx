import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { Download, DeleteOutline, RemoveCircleOutline } from "@mui/icons-material";
import { useContext, useMemo } from "react";
import AppContext from "../../AppContext";
import { useRecentFonts } from "../../RecentFontsContext";

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
 *
 * Source resolution:
 *   The `family` prop can be either a built-in font's machine name
 *   (e.g. "NotoSansHK-Noto-lshk") or a recent-fonts opaque id (e.g.
 *   "gen-..." for pipeline-generated, "up-..." for uploaded). Built-
 *   in fonts download from the CDN (VITE_FONT_URL/<family>.ttf);
 *   recent-fonts entries download from the IndexedDB-stored bytes
 *   directly. Both paths surface to the user as identical pill
 *   buttons — the source switch is invisible.
 */
export const FontHeader = ({ family, displayName, idx }: FontHeaderProps) => {
  const { removePickedFont } = useContext(AppContext);
  const { entries: recentEntries, remove: removeRecentFont } = useRecentFonts();

  // Look up the matching recent-fonts entry (if any). Used to
  // route the download through IndexedDB bytes, decide which
  // download buttons to render (uploaded entries only have one
  // populated format, so we hide the missing format's button),
  // and route the header's remove button between "unpick from row"
  // and "delete from cache" (see the remove handler below).
  const recentEntry = useMemo(
    () => recentEntries.find((e) => e.id === family),
    [recentEntries, family],
  );

  // Uploaded fonts are the one recent-entry class where a distinct
  // "delete forever" affordance makes sense — the source of truth is
  // a file the user picked from disk (they can always re-upload if
  // needed), and the IndexedDB copy is dead weight once they choose
  // to purge it. Pipeline-generated entries are the user's build
  // output and don't get a per-card delete here — that lives on
  // /generate's RecentFontsChips row, where a delete is more clearly
  // an intent to discard the build rather than an accidental
  // extension of an unpick click.
  const isUploaded = recentEntry?.source === "uploaded";

  // Hide from /showcase. Same operation for every font class — drops
  // the card from the current pickedFonts row, leaving IndexedDB
  // (and any /generate chip visibility) untouched. Reversible: the
  // user can pick the same font again from the font picker to bring
  // the card back.
  const handleUnpick = () => {
    if (idx === undefined) return;
    removePickedFont(idx);
  };

  // Delete an uploaded font — permanent. Removes the IndexedDB entry
  // (also revokes the blob URL and removes the FontFace registration
  // via RecentFontsContext.remove) AND unpicks the card. Ordering
  // matters: purge IndexedDB first so removePickedFont doesn't leave
  // a card briefly pointing at bytes we're mid-deleting.
  const handleDelete = async () => {
    if (idx === undefined) return;
    await removeRecentFont(family);
    removePickedFont(idx);
  };

  // The compressed-format extension depends on where the bytes
  // came from:
  //   * Built-in (CDN) fonts ship as WOFF2 since June 2026 (Brotli-
  //     compressed sfnt; ~30-50% smaller than WOFF1, every modern
  //     browser supports it natively). See the WOFF2 swap in
  //     wing-font.py / deploy-pages.yml — verified ccmp-preserving
  //     in python/tools/verify_woff2_ccmp.py.
  //   * Recent-fonts entries (IndexedDB) are still WOFF1: the
  //     in-browser pipeline uses CompressionStream (zlib only —
  //     browsers don't expose a Brotli ENCODER yet), so the cache
  //     keeps the WOFF1 bytes the Pyodide worker produced. The
  //     ".woff" button on these cards is correct as labelled.
  // Choosing the extension per entry rather than per-format keeps
  // the button label honest in both cases.
  const woffExt = recentEntry ? "woff" : "woff2";

  const handleDownload = (format: "ttf" | "woff") => {
    if (recentEntry) {
      // Recent-fonts entry — download from IndexedDB bytes. The
      // FontFace registration in RecentFontsContext already loaded
      // these into memory; we synthesize a blob URL on demand for
      // the download anchor, then revoke after a short delay so
      // browsers that race the anchor click against the URL
      // lifetime don't drop the download.
      const bytes =
        format === "ttf" ? recentEntry.ttfBytes : recentEntry.woffBytes;
      if (!bytes || bytes.length === 0) return;
      const mime = format === "ttf" ? "font/ttf" : "font/woff";
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // For generated entries we have a real OpenType family name
      // in fontFamily; for uploaded entries we used the file's
      // base name. Either way, ${fontFamily}.${ext} produces a
      // sensible suggested filename — `format === "woff"` always
      // maps to the .woff extension for recent-fonts entries (see
      // `woffExt` comment above).
      const ext = format === "ttf" ? "ttf" : "woff";
      a.download = `${recentEntry.fontFamily}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    // Built-in font path — two different CDNs for two formats:
    //
    //   * WOFF2 → VITE_FONT_URL → Pages (wing-font.chunlaw.io/fonts/).
    //     Same-origin so FontFace registration sidesteps CORS; small
    //     enough to fit the Pages bandwidth budget.
    //
    //   * TTF → VITE_TTF_URL → GitHub Releases rolling `latest/
    //     download/` redirect. Off-Pages because TTFs are roughly
    //     2× the WOFF2 bytes and would exhaust the Pages bandwidth
    //     ceiling. The CI workflow keeps the 3 most recent
    //     build-<sha> releases and marks the newest as latest, so
    //     this URL never changes (302 to the current release).
    //
    // Going via env vars instead of hard-coding the URLs means a
    // future host change is a single .env edit + redeploy.
    const base =
      format === "ttf"
        ? (import.meta.env.VITE_TTF_URL ?? "")
        : (import.meta.env.VITE_FONT_URL ?? "");
    const ext = format === "ttf" ? "ttf" : woffExt;
    window.open(`${base}/${family}.${ext}`, "_blank");
  };

  // Format availability flags. For built-in fonts both are always
  // true (the CI matrix builds both .ttf and .woff2 for every
  // font). For recent-fonts entries we check the actual byte
  // length: generated entries have both populated; uploaded
  // entries have exactly the format the user gave us.
  const hasTtf = recentEntry
    ? Boolean(recentEntry.ttfBytes && recentEntry.ttfBytes.length > 0)
    : true;
  const hasWoff = recentEntry
    ? Boolean(recentEntry.woffBytes && recentEntry.woffBytes.length > 0)
    : true;

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
          <>
            {/*
              Universal "hide from showcase" affordance — reversible
              unpick that doesn't touch IndexedDB. Shown for every
              font class (built-in, generated, uploaded) because the
              user might want to compact the /showcase row without
              throwing away the underlying font.
            */}
            <Tooltip title="Hide from showcase">
              <IconButton size="small" onClick={handleUnpick}>
                <RemoveCircleOutline />
              </IconButton>
            </Tooltip>
            {/*
              Uploaded-only "delete forever" affordance — sits next
              to the unpick button so the two operations read as
              related-but-distinct choices ("hide" vs "delete"). The
              trash-can icon carries the destructive-intent visual
              weight; the unpick's remove-circle stays as the
              softer, reversible cousin. Not shown for pipeline-
              generated entries (delete lives on /generate's chips)
              or built-ins (nothing to delete on the CDN).
            */}
            {isUploaded && (
              <Tooltip title="Delete uploaded font">
                <IconButton
                  size="small"
                  onClick={() => {
                    // Fire-and-forget: the visible removal is
                    // driven by the pickedFonts change inside
                    // handleDelete after the IndexedDB purge
                    // resolves. Adding await here would gate the
                    // click handler on a rejectable promise with
                    // no meaningful recovery UX beyond a Snackbar
                    // for a narrow edge case.
                    void handleDelete();
                  }}
                >
                  <DeleteOutline />
                </IconButton>
              </Tooltip>
            )}
          </>
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
        {hasTtf && (
          <DownloadButton label="ttf" onClick={() => handleDownload("ttf")} />
        )}
        {hasWoff && (
          <DownloadButton
            label={woffExt}
            onClick={() => handleDownload("woff")}
          />
        )}
      </Box>
    </Box>
  );
};

/**
 * One pill-shaped download button. Extracted so the formats stay
 * visually identical without duplicating the styling.
 *
 * `label` is the literal extension shown to the user (e.g. "ttf",
 * "woff", "woff2"). The caller decides which extension is honest
 * for a given entry — built-in fonts ship as WOFF2 since June 2026,
 * IndexedDB recent-fonts entries still emit WOFF1 from the
 * in-browser pipeline. Decoupling the label from the click handler
 * lets the parent map "I want the compressed format" → the right
 * extension per entry without this button having to know.
 */
const DownloadButton = ({
  label,
  onClick,
}: {
  label: string;
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
    .{label}
  </Button>
);
