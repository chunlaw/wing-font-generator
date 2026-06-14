/**
 * Notes — per-language documentation of how each annotation mapping is
 * built and where it falls short. One tab per language; the body is the
 * same markdown that lives beside the mapping data in
 * python/mappings/<language>/NOTES.md, rendered through the shared
 * MUI-themed <Markdown> wrapper.
 *
 * The active tab is driven by the `?language=<key>` query param, so a tab
 * is directly linkable (e.g. /notes?language=japanese) and the showcase /
 * Step 2 "help improve" memos can deep-link to the relevant language.
 *
 * The markdown is imported as a raw string (Vite `?raw`) so the docs stay
 * plain markdown a linguist can edit, with no JSX duplication.
 */
import InstagramIcon from "@mui/icons-material/Instagram";
import {
  Alert,
  Box,
  Container,
  Link as MuiLink,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import Markdown from "../components/Markdown";
import { useTranslation } from "../i18n/LanguageContext";
import { NOTE_LANGUAGES } from "../utils/languageNotes";

import cantonese from "../notes/cantonese.md?raw";
import taiwanese from "../notes/taiwanese.md?raw";
import teochew from "../notes/teochew.md?raw";
import mandarin from "../notes/mandarin.md?raw";
import japanese from "../notes/japanese.md?raw";
import thai from "../notes/thai.md?raw";
import hindi from "../notes/hindi.md?raw";
import arabic from "../notes/arabic.md?raw";

const MARKDOWN: Record<string, string> = {
  cantonese,
  taiwanese,
  teochew,
  mandarin,
  japanese,
  thai,
  hindi,
  arabic,
};

export default function Notes() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab is derived from the URL so it stays deep-linkable; an absent or
  // unknown ?language= falls back to the first language.
  const fromParam = NOTE_LANGUAGES.findIndex(
    (l) => l.key === searchParams.get("language"),
  );
  const index = fromParam >= 0 ? fromParam : 0;
  const active = NOTE_LANGUAGES[index];

  const handleChange = (_: unknown, next: number) => {
    setSearchParams({ language: NOTE_LANGUAGES[next].key }, { replace: true });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        {t("notes.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t("notes.subtitle")}
      </Typography>

      <Tabs
        value={index}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="language notes"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        {NOTE_LANGUAGES.map((l) => (
          <Tab
            key={l.key}
            id={`notes-tab-${l.key}`}
            aria-controls={`notes-panel-${l.key}`}
            label={
              <Box component="span" sx={{ textTransform: "none", lineHeight: 1.2 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {l.native}
                </Box>
                <Box
                  component="span"
                  sx={{ ml: 0.75, color: "text.secondary", fontSize: "0.8em" }}
                >
                  {l.en}
                </Box>
              </Box>
            }
          />
        ))}
      </Tabs>

      <Box
        role="tabpanel"
        id={`notes-panel-${active.key}`}
        aria-labelledby={`notes-tab-${active.key}`}
      >
        <Markdown>{MARKDOWN[active.key]}</Markdown>
      </Box>

      {/* Contact CTA — native speakers / linguists who want to help. */}
      <Alert
        severity="info"
        variant="outlined"
        icon={<InstagramIcon fontSize="inherit" />}
        sx={{ mt: 4 }}
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
          <span>{t("notes.contact.text")}</span>
          <MuiLink
            href="https://www.instagram.com/wingfont"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
          >
            {t("notes.contact.link")} →
          </MuiLink>
        </Box>
      </Alert>
    </Container>
  );
}
