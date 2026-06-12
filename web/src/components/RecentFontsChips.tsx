/**
 * RecentFontsChips — horizontal row of chips showing the user's recently
 * generated fonts (up to MAX_SLOTS=5 from IndexedDB). Surfaced on the
 * /generate Step 1 page so the user can re-download / preview / pin a
 * previous generation without rerunning the pipeline.
 *
 * Each chip:
 *   - Carries a pin icon. Filled when pinned; outlined otherwise.
 *   - Clicking the pin toggles pin/unpin (capped at MAX_PINNED=4).
 *   - Clicking the chip body opens a Menu with the available actions:
 *     download TTF, download WOFF, view in Specimen, remove.
 *
 * Why a menu and not direct download-on-click:
 *   - Two formats (.ttf + .woff) means a single click can't be
 *     unambiguous. A menu lets the user pick the right one without
 *     us having to surface two side-by-side targets (which crammed
 *     the FontHeader on /showcase before the responsive fix).
 *   - The menu also hosts the secondary actions (specimen, remove)
 *     without forcing icon buttons that would clutter mobile.
 *
 * Hidden when entries.length === 0 — empty state is silence, not a
 * "no recent fonts" notice. The chip row only earns the vertical
 * space when there's something to show.
 */
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  PushPin,
  PushPinOutlined,
  Download,
  DeleteOutline,
  Visibility,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecentFonts } from "../RecentFontsContext";
import { useTranslation } from "../i18n/LanguageContext";
import { useSharedTick } from "../utils/hooks";
import { BUILT_IN_MAPPINGS } from "../utils/wingfontPresets";
import type { RecentFontEntry } from "../utils/recentFonts";

const RecentFontsChips = () => {
  const { t } = useTranslation();
  const { entries, canPin, togglePin, remove, clearAll } = useRecentFonts();

  // ── Minute-tick for relative-time captions ────────────────────────
  // Each chip shows "X min ago" / "X h ago" computed off Date.now() at
  // render time. Without an external nudge, that string would stale
  // ("just now" stays "just now" indefinitely until something else
  // re-renders the row). One 60 s setInterval at the parent triggers a
  // re-render across every chip in lockstep, so the captions tick
  // forward together. Return value of useSharedTick is the tick count,
  // which we don't need — the side effect of the re-render is the
  // whole point. Cadence of 60 s is the natural granularity of the
  // captions ("min ago" / "h ago" / "d ago") — anything faster would
  // be wasted work.
  useSharedTick(60_000);

  if (entries.length === 0) return null;

  const hasUnpinned = entries.some((e) => !e.pinned);

  return (
    <Box>
      {/* Section heading + clear-all action */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: "0.08em", flex: 1 }}
        >
          {t("step1.recentFonts.title")}  ·  {entries.length} / 5
        </Typography>
        {hasUnpinned && (
          <Typography
            component="button"
            variant="caption"
            color="text.secondary"
            onClick={() => {
              if (window.confirm(t("step1.recentFonts.clearConfirm"))) {
                void clearAll();
              }
            }}
            sx={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              p: 0,
              "&:hover": { color: "primary.main" },
            }}
          >
            {t("step1.recentFonts.clearAll")}
          </Typography>
        )}
      </Stack>

      {/*
        Chips wrap rather than scroll horizontally. With max 5 chips
        on a mobile viewport, wrapping to a 2-row grid is more
        thumb-friendly than horizontal scroll — the user can see
        every entry at a glance.
      */}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        rowGap={1}
      >
        {entries.map((entry) => (
          <RecentFontChip
            key={entry.id}
            entry={entry}
            canPin={canPin}
            onTogglePin={() => togglePin(entry.id)}
            onRemove={() => remove(entry.id)}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default RecentFontsChips;

// ── Individual chip ────────────────────────────────────────────────

interface RecentFontChipProps {
  entry: RecentFontEntry;
  /**
   * From the parent context — true when the user can still pin
   * another entry. We pass it in (rather than re-reading from the
   * context) so the chip stays a pure presentation of one entry
   * plus its actions.
   */
  canPin: boolean;
  onTogglePin: () => Promise<
    | { ok: true; entry: RecentFontEntry }
    | { ok: false; reason: "cap" | "not-found" }
  >;
  onRemove: () => Promise<void>;
}

const RecentFontChip = ({
  entry,
  canPin,
  onTogglePin,
  onRemove,
}: RecentFontChipProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const relativeTime = useRelativeTime(entry.generatedAt);

  // Resolve the human label for the mapping preset (e.g. "lshk" →
  // "粵語拼音 (LSHK Jyutping)"). The raw preset key in
  // entry.config.mappingName is terse and developer-y; the BUILT_IN
  // catalog carries the bilingual label the user actually saw in
  // the Step 2 dropdown. If the user uploaded a custom CSV there's
  // no preset key, so we skip the subtitle entirely rather than
  // showing "undefined".
  const mappingLabel = useMemo(() => {
    const key = entry.config.mappingName;
    if (!key) return undefined;
    const preset = BUILT_IN_MAPPINGS.find((p) => p.key === key);
    return preset?.label ?? key;
  }, [entry.config.mappingName]);

  // Pin button is disabled when at cap AND the entry isn't already
  // pinned (you can always UN-pin even at the cap).
  const pinDisabled = !canPin && !entry.pinned;
  const pinTooltip = pinDisabled
    ? t("step1.recentFonts.pinCap")
    : entry.pinned
      ? t("step1.recentFonts.unpin")
      : t("step1.recentFonts.pin");

  const handleDownload = (format: "ttf" | "woff") => {
    setMenuAnchor(null);
    const bytes = format === "ttf" ? entry.ttfBytes : entry.woffBytes;
    const mime = format === "ttf" ? "font/ttf" : "font/woff";
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.fontFamily}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Defer revocation — some browsers cancel the download if the
    // URL goes away too quickly.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Chip
        // Avatar slot: pin button. clickable independently of the
        // chip body so the user can pin without opening the menu.
        avatar={
          <Tooltip title={pinTooltip} arrow>
            {/* span needed because Tooltip on disabled IconButton
                doesn't work without an interactive parent. */}
            <span style={{ display: "inline-flex" }}>
              <IconButton
                size="small"
                disabled={pinDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  void onTogglePin();
                }}
                sx={{
                  color: entry.pinned ? "primary.main" : "text.secondary",
                  // Tighter padding so the icon doesn't enlarge the
                  // chip beyond MUI's default 32px height.
                  p: 0.25,
                }}
              >
                {entry.pinned ? (
                  <PushPin sx={{ fontSize: 16 }} />
                ) : (
                  <PushPinOutlined sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        }
        label={
          // Inline tri-segment label: displayName · mappingLabel · time.
          // The middle segment is the key disambiguator when the
          // user has multiple generations sharing a family name —
          // e.g. two "MyFont" entries become
          //   [MyFont · 粵語拼音 (LSHK Jyutping) · 2 min ago]
          //   [MyFont · 漢語拼音 (Hanyu Pinyin) · 1 day ago]
          // making the iteration / dialect axis legible at a glance.
          // Middle segment is omitted when the user generated from
          // a custom (uploaded) CSV — no preset key, no useful label
          // to surface.
          <Box display="flex" alignItems="baseline" gap={0.75}>
            {/* Tiny upload-file icon for uploaded entries —
                visually distinguishes them from pipeline-generated
                ones at chip resolution. Generated entries get no
                icon (the chip's quiet default IS the generated
                state). Aligned to baseline-1px so the icon sits
                with the displayName text. */}
            {entry.source === "uploaded" && (
              <UploadFileIcon
                sx={{
                  fontSize: 14,
                  color: "text.secondary",
                  alignSelf: "center",
                  mr: -0.25,
                }}
              />
            )}
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 500 }}
            >
              {entry.displayName}
            </Typography>
            {mappingLabel && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{
                  // Keep the mapping label compact; on very narrow
                  // screens it would otherwise stretch the chip
                  // wider than the row can wrap.
                  maxWidth: 180,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                · {mappingLabel}
              </Typography>
            )}
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
            >
              · {relativeTime}
            </Typography>
          </Box>
        }
        variant={entry.pinned ? "filled" : "outlined"}
        clickable
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        // ── Explicit delete affordance ────────────────────────────
        // MUI's onDelete renders a small X icon at the right edge of
        // the chip. We only wire it for UNPINNED entries — the pin
        // is the "I don't want this lost" affordance, so an
        // accidental tap on the X next to a pinned font would
        // violate that promise. To delete a pinned font, the user
        // clicks the pin icon first (same chip, no menu), then the
        // X appears. Two-step for protected content, one-tap for
        // unpinned. Stop propagation so the click doesn't also open
        // the menu.
        onDelete={
          entry.pinned
            ? undefined
            : (e: React.MouseEvent) => {
                e.stopPropagation();
                void onRemove();
              }
        }
        deleteIcon={
          <Tooltip title={t("step1.recentFonts.remove")} arrow>
            <DeleteOutline sx={{ fontSize: 18 }} />
          </Tooltip>
        }
        sx={{
          height: 36,
          // Pinned chips lean on a subtle primary-tinted fill so
          // they stand out as "protected" at a glance.
          ...(entry.pinned && {
            bgcolor: "primary.50",
            borderColor: "primary.light",
          }),
        }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        // Keep the chip width unrelated to the menu width — Menu
        // sizes to its own content, the chip stays compact.
      >
        {/* Download menu items — only render formats whose bytes
            are actually populated. Generated entries always have
            both; uploaded entries have exactly the format the
            user gave us (TTF/OTF lands in ttfBytes; WOFF/WOFF2
            in woffBytes), so the other menu item is hidden
            rather than offering a broken download.

            Why hide rather than disable: a disabled item with the
            same label is confusing ("why can't I download a
            .woff?"). Hiding makes the menu shorter and the
            available action obvious. */}
        {entry.ttfBytes && entry.ttfBytes.length > 0 && (
          <MenuItem onClick={() => handleDownload("ttf")}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            {t("step1.recentFonts.redownloadTtf")}
          </MenuItem>
        )}
        {entry.woffBytes && entry.woffBytes.length > 0 && (
          <MenuItem onClick={() => handleDownload("woff")}>
            <Download fontSize="small" sx={{ mr: 1 }} />
            {t("step1.recentFonts.redownloadWoff")}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            // /specimen/:family resolves by entry.id when the font
            // isn't in AVAILABLE_FONTS (see Specimen.tsx fallback),
            // so we route on the stable opaque id rather than the
            // user-typed fontFamily — collision-safe across two
            // generations that share a family name.
            navigate(`/specimen/${entry.id}`);
          }}
        >
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {t("step1.recentFonts.viewSpecimen")}
        </MenuItem>
        {/*
          The "Remove" menu item used to live here. It's been
          superseded by the X icon (onDelete) on the chip face — a
          one-tap action that's visible without opening the menu.
          For pinned entries, the X is hidden (they're protected);
          the user unpins via the pin icon, then the X appears.
        */}
      </Menu>
    </>
  );
};

// ── Relative-time helper ───────────────────────────────────────────

/**
 * Format `Date.now() - generatedAt` as a localized "X ago" string.
 * Buckets:
 *   - <60 s    → "just now"
 *   - <60 min  → "{n} min ago"
 *   - <24 h    → "{n} h ago"
 *   - ≥24 h    → "{n} d ago"
 *
 * We could pull in date-fns / dayjs for this but the rule is so
 * small that the cost of a dep doesn't pay off. Re-evaluated each
 * render — chip components mount frequently enough that the
 * "X minutes ago" naturally drifts forward without needing a timer.
 */
const useRelativeTime = (timestamp: number): string => {
  const { t } = useTranslation();
  return useMemo(() => {
    const diffMs = Date.now() - timestamp;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return t("step1.recentFonts.justNow");
    const min = Math.floor(sec / 60);
    if (min < 60)
      return t("step1.recentFonts.minutesAgo").replace("{n}", String(min));
    const hr = Math.floor(min / 60);
    if (hr < 24)
      return t("step1.recentFonts.hoursAgo").replace("{n}", String(hr));
    const day = Math.floor(hr / 24);
    return t("step1.recentFonts.daysAgo").replace("{n}", String(day));
    // Recompute on locale change too — t identity is stable per locale,
    // so depending on it captures the lang flip.
  }, [timestamp, t]);
};
