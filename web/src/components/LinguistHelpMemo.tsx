/**
 * LinguistHelpMemo — an inline callout inviting native speakers / linguists
 * to help correct an annotation mapping, deep-linking to the relevant
 * /notes tab.
 *
 * - Pass `language` (a NOTE_LANGUAGES slug) for a single-language CTA
 *   (used in the Step 2 mapping picker, scoped to the chosen mapping).
 * - Omit it to list every language (used on /showcase, which shows
 *   several at once).
 */
import TranslateIcon from "@mui/icons-material/Translate";
import { Alert, Box, Link as MuiLink } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { NOTE_LANGUAGES, noteLanguage } from "../utils/languageNotes";

interface Props {
  /** A NOTE_LANGUAGES slug. When omitted, all languages are listed. */
  language?: string;
  sx?: object;
}

export default function LinguistHelpMemo({ language, sx }: Props) {
  const { t } = useTranslation();
  const single = language ? noteLanguage(language) : undefined;

  // A `language` was requested but isn't one we have notes for → render
  // nothing rather than a dead link.
  if (language && !single) return null;

  return (
    <Alert
      severity="info"
      variant="outlined"
      icon={<TranslateIcon fontSize="inherit" />}
      sx={{ width: "100%", ...sx }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 1.5,
          rowGap: 0.5,
        }}
      >
        <span>{t("notes.help.text")}</span>
        {single ? (
          <MuiLink
            component={RouterLink}
            to={`/notes?language=${single.key}`}
            sx={{ fontWeight: 600 }}
          >
            {t("notes.help.link")} · {single.native} →
          </MuiLink>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {NOTE_LANGUAGES.map((l) => (
              <MuiLink
                key={l.key}
                component={RouterLink}
                to={`/notes?language=${l.key}`}
                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {l.native}
              </MuiLink>
            ))}
          </Box>
        )}
      </Box>
    </Alert>
  );
}
