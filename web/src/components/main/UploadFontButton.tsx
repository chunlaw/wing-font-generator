/**
 * UploadFontButton — file-picker affordance for adding a custom
 * .ttf / .otf / .woff / .woff2 to the recent-fonts cache.
 *
 * Used on /showcase and /specimen. The visible Button drives a
 * hidden `<input type="file">` so we get the native file picker
 * across platforms without the security clipboard restrictions
 * that plague drag-drop on some embedded browsers (Outlook,
 * Notion-in-iframe, etc.).
 *
 * Errors are surfaced via an internal Snackbar — the caller doesn't
 * need to thread a feedback channel through. Successful uploads
 * call `onUploaded(entry)` so the caller can do the
 * page-specific thing: /showcase auto-adds the new font to the
 * picked fonts so it appears as a comparison card; /specimen
 * navigates to /specimen/<entry.id>.
 *
 * Visual choice — text-variant Button matches the Share button's
 * weight on /showcase (both are secondary "I want to do something
 * outside the main flow" affordances).
 */
import {
  Button,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import { useRef, useState } from "react";
import { parseFontUpload } from "../../utils/uploadFont";
import type { RecentFontEntry } from "../../utils/recentFonts";
import { useRecentFonts } from "../../RecentFontsContext";
import { useTranslation } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";

interface UploadFontButtonProps {
  /**
   * Called with the saved RecentFontEntry after a successful upload.
   * /showcase uses it to call addPickedFont(USER_FONTS_GROUP_KEY,
   * entry.id) so the new font appears as a card immediately;
   * /specimen uses it to navigate to /specimen/<entry.id>.
   */
  onUploaded?: (entry: RecentFontEntry) => void;
  /**
   * Override the button's variant. /showcase wants the same quiet
   * text-variant treatment as Share; /specimen might want a
   * contained variant when sitting in a more isolated header.
   */
  variant?: "text" | "outlined" | "contained";
  /**
   * Override the button size. Defaults to "small" — matches the
   * Share button next to it on /showcase.
   */
  size?: "small" | "medium" | "large";
}

const UploadFontButton = ({
  onUploaded,
  variant = "text",
  size = "small",
}: UploadFontButtonProps) => {
  const { t } = useTranslation();
  // The context's `save` method writes to IndexedDB AND triggers
  // refresh — which (a) updates the entries state any picker /
  // chip row reads, (b) refreshes the AppContext-side
  // recentFontEntriesRef that addPickedFont consults, and
  // (c) registers the new FontFace so CSS lookups by entry.id
  // resolve to real glyphs. We MUST go through this path, not the
  // bare saveRecentFont util — bypassing it leaves the upload
  // invisible to React consumers until a reload.
  const { save } = useRecentFonts();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Snackbar state — keyed by `kind` so the Snackbar's children re-
  // render with fresh copy whenever a new event fires (even if the
  // previous one is still on screen, the key bump replaces it).
  const [snack, setSnack] = useState<
    | {
        kind: "success" | "error";
        messageKey: TranslationKey;
        // Optional interpolation value used by the "Added {name}"
        // template; left empty for error messages.
        name?: string;
      }
    | null
  >(null);

  const openPicker = () => {
    // Reset the input value first so re-selecting the SAME file
    // still fires onChange. Without this, picking foo.ttf, removing
    // it from the chips row, then picking foo.ttf again does
    // nothing because the input's value hasn't changed.
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    try {
      // Two-stage: parse the file into a partial (validates magic
      // bytes, size limit, builds the entry shape) then hand it to
      // context.save() to actually persist. context.save awaits
      // its own refresh() before resolving, so by the time we have
      // the entry back, the context's entries state, ref, and
      // FontFace registry are all up-to-date — onUploaded() can
      // safely call addPickedFont(entry.id) and have it resolve.
      const { partial } = await parseFontUpload(file);
      const entry = await save(partial);
      setSnack({
        kind: "success",
        messageKey: "showcase.uploadAdded",
        name: entry.displayName,
      });
      onUploaded?.(entry);
    } catch (err) {
      // Map the error's `name` (set by uploadFont) to the matching
      // translation key. Unknown errors fall through to the
      // generic read-failed copy.
      let key: TranslationKey = "showcase.uploadReadFailed";
      if (err instanceof Error) {
        if (err.name === "bad-format") key = "showcase.uploadBadFormat";
        else if (err.name === "too-large") key = "showcase.uploadTooLarge";
      }
      setSnack({ kind: "error", messageKey: key });
    }
  };

  return (
    <>
      <Tooltip title={t("showcase.upload")} arrow>
        <Button
          variant={variant}
          size={size}
          startIcon={<UploadFileIcon />}
          onClick={openPicker}
          sx={{ borderRadius: "9999px", px: 1.5 }}
        >
          {t("showcase.upload")}
        </Button>
      </Tooltip>
      {/*
        Hidden file input. accept= filters the picker on most
        platforms but isn't an authoritative validation — the magic-
        byte sniffing in uploadFont() is the real gate. We accept
        an explicit list of extensions rather than a font/* MIME
        wildcard because OS file pickers map .woff/.woff2 to
        application/font-woff (deprecated) inconsistently.
      */}
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Snackbar
        key={snack ? `${snack.kind}-${snack.messageKey}-${snack.name ?? ""}` : "idle"}
        open={snack !== null}
        autoHideDuration={snack?.kind === "success" ? 3000 : 4500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={
          snack
            ? snack.messageKey === "showcase.uploadAdded" && snack.name
              ? t("showcase.uploadAdded").replace("{name}", snack.name)
              : t(snack.messageKey)
            : ""
        }
      />
    </>
  );
};

export default UploadFontButton;
