/**
 * Acknowledgements (/credits) — credits the open-source datasets and
 * fonts Wing Font builds on. Added when the Taiwanese / Southern Min
 * showcase landed: its character readings, cross-romanization tables
 * and tone-mark logic all come from AlanJui's open repositories, and
 * the showcase is set in Noto Sans TC + Huninn — all of which deserve
 * visible attribution beyond a line in the README.
 *
 * Layout mirrors About.tsx: a centered hero, an intro paragraph, then
 * grouped sections. Each source is a card linking out to its upstream
 * home with a one-line description of what we use it for.
 */
import {
  Box,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { OpenInNew } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

interface Source {
  /** Proper noun — not translated. */
  name: string;
  url: string;
  /** i18n key for the "what we use it for" line. */
  descKey: TranslationKey;
}

// Grouped credits. Names + URLs are hardcoded (proper nouns); only the
// descriptions go through i18n. Keep in sync with the ack.* keys in
// i18n/translations.ts and the "Mapping sources" section of
// python/README.md.
const TAIGI_SOURCES: Source[] = [
  {
    name: "AlanJui / Piau-Im",
    url: "https://github.com/AlanJui/Piau-Im",
    descKey: "ack.taigi.piauim",
  },
  {
    name: "AlanJui / rime-tlpa",
    url: "https://github.com/AlanJui/rime-tlpa",
    descKey: "ack.taigi.rimetlpa",
  },
  {
    name: "ButTaiwan / taigivs",
    url: "https://github.com/ButTaiwan/taigivs",
    descKey: "ack.taigi.taigivs",
  },
];

const TEOCHEW_SOURCES: Source[] = [
  {
    name: "learn-teochew / learn-teochew.github.io",
    url: "https://github.com/learn-teochew/learn-teochew.github.io",
    descKey: "ack.teochew.learnteochew",
  },
  {
    name: "learn-teochew / parsetc",
    url: "https://github.com/learn-teochew/parsetc",
    descKey: "ack.teochew.parsetc",
  },
];

// Every input TTF Wing Font's pipeline can use, with its upstream and
// a one-line role-and-license note. All 15 fonts are SIL OFL 1.1 —
// we say so in each description rather than relying on a footer note
// so a reader scanning the page sees the licence next to every font.
// Source-of-truth list lives in LICENSES.md at the repo root and in
// chunlaw/wing-font-hub (the CDN that hosts the binaries).
const FONT_SOURCES: Source[] = [
  // CJK base — sans-serif (Noto Sans family)
  {
    name: "Noto Sans TC — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Sans+TC",
    descKey: "ack.fonts.notosanstc",
  },
  {
    name: "Noto Sans SC — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Sans+SC",
    descKey: "ack.fonts.notosanssc",
  },
  {
    name: "Noto Sans HK — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Sans+HK",
    descKey: "ack.fonts.notosanshk",
  },
  {
    name: "Noto Sans JP — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Sans+JP",
    descKey: "ack.fonts.notosansjp",
  },
  {
    name: "Noto Sans KR — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Sans+KR",
    descKey: "ack.fonts.notosanskr",
  },
  // CJK base — serif
  {
    name: "昭源宋體（ChironSung HK）— chiron-fonts",
    url: "https://github.com/chiron-fonts/chiron-sung-hk",
    descKey: "ack.fonts.chironsung",
  },
  {
    name: "昭源黑體（ChironHei HK）— chiron-fonts",
    url: "https://github.com/chiron-fonts/chiron-hei-hk",
    descKey: "ack.fonts.chironhei",
  },
  {
    name: "Source Han Serif — Adobe",
    url: "https://github.com/adobe-fonts/source-han-serif",
    descKey: "ack.fonts.sourcehanserif",
  },
  {
    name: "Xiaolai SC — lxgw",
    url: "https://github.com/lxgw/Xiaolai-Sansserif",
    descKey: "ack.fonts.xiaolai",
  },
  // Annotation fonts
  {
    name: "Huninn (jf-openhuninn) — justfont",
    url: "https://github.com/justfont/open-huninn-font",
    descKey: "ack.fonts.huninn",
  },
  {
    name: "Noto Serif — Google",
    url: "https://fonts.google.com/noto/specimen/Noto+Serif",
    descKey: "ack.fonts.notoserif",
  },
  {
    name: "M PLUS 1m — Coji Morishita",
    url: "https://github.com/coz-m/mplus_outline_fonts",
    descKey: "ack.fonts.mplus1m",
  },
  {
    name: "M PLUS Rounded 1c — Coji Morishita",
    url: "https://github.com/coz-m/mplus_outline_fonts",
    descKey: "ack.fonts.mplusrounded",
  },
  {
    name: "Google Sans Thai — Cadson Demak / IT Foundry",
    url: "https://github.com/itfoundry/google-sans-thai",
    descKey: "ack.fonts.googlesansthai",
  },
];

const CANTO_SOURCES: Source[] = [
  {
    name: "TypeDuck",
    url: "https://github.com/TypeDuck-HK/TypeDuck-Mac",
    descKey: "ack.canto.typeduck",
  },
  {
    name: "粵語審音配詞字庫 (CUHK)",
    url: "https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/",
    descKey: "ack.canto.cuhk",
  },
  {
    name: "Cantonese Romanization Converter",
    url: "https://www.kodensha.jp/webapp/cantonese/can_converter_e.html",
    descKey: "ack.canto.kodensha",
  },
];

const MANDARIN_SOURCES: Source[] = [
  {
    name: "mozillazg / pinyin-data",
    url: "https://github.com/mozillazg/pinyin-data",
    descKey: "ack.mandarin.pinyindata",
  },
  {
    name: "mozillazg / phrase-pinyin-data",
    url: "https://github.com/mozillazg/phrase-pinyin-data",
    descKey: "ack.mandarin.phrasepinyindata",
  },
  {
    name: "Unicode Han Database (Unihan)",
    url: "https://www.unicode.org/charts/unihan.html",
    descKey: "ack.mandarin.unihan",
  },
];

const Acknowledgements = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      width="100%"
      display="flex"
      flexDirection="column"
      gap={{ xs: 6, md: 10 }}
      sx={{ pb: { xs: 6, md: 10 } }}
    >
      {/* Hero */}
      <Box
        textAlign="center"
        maxWidth={720}
        mx="auto"
        px={2}
        sx={{ pt: { xs: 4, md: 8 } }}
      >
        <Typography variant="h1" sx={{ mb: { xs: 2, md: 3 } }}>
          {t("ack.hero.title")}
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ fontWeight: 400, lineHeight: 1.5 }}
        >
          {t("ack.hero.tagline")}
        </Typography>
      </Box>

      {/* Intro */}
      <Box maxWidth={880} mx="auto" width="100%" px={2}>
        <Typography variant="body1" color="text.secondary">
          {t("ack.intro")}
        </Typography>
      </Box>

      {/* Taiwanese / Southern Min — the section this page exists for */}
      <CreditSection
        title={t("ack.taigi.title")}
        body={t("ack.taigi.body")}
        sources={TAIGI_SOURCES}
      />

      {/* Teochew — reading data from the learn-teochew project */}
      <CreditSection
        title={t("ack.teochew.title")}
        body={t("ack.teochew.body")}
        sources={TEOCHEW_SOURCES}
      />

      {/* Fonts — preamble explains every entry below is OFL-1.1; the
          per-font descKey just adds role + the license name in line
          with each card so a casual scanner sees licence next to font. */}
      <CreditSection
        title={t("ack.fonts.title")}
        body={t("ack.fonts.body")}
        sources={FONT_SOURCES}
      />

      {/* Cantonese */}
      <CreditSection title={t("ack.canto.title")} sources={CANTO_SOURCES} />

      {/* Mandarin — data taken from mozillazg's permissive upstream */}
      <CreditSection
        title={t("ack.mandarin.title")}
        body={t("ack.mandarin.body")}
        sources={MANDARIN_SOURCES}
      />

      {/* Licence note + CTA */}
      <Box maxWidth={880} mx="auto" width="100%" px={2}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("ack.license")}
        </Typography>
        <Link
          component="button"
          variant="body1"
          underline="hover"
          onClick={() => navigate("/showcase")}
          sx={{ fontWeight: 600 }}
        >
          {t("ack.cta.showcase")} →
        </Link>
      </Box>
    </Box>
  );
};

/**
 * One titled section: optional intro paragraph + a responsive grid of
 * source cards. Shares the max-width / rhythm with About.tsx's Section.
 */
const CreditSection = ({
  title,
  body,
  sources,
}: {
  title: string;
  body?: string;
  sources: Source[];
}) => {
  const { t } = useTranslation();
  return (
    <Box maxWidth={1100} mx="auto" width="100%" px={2}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      {body && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {body}
        </Typography>
      )}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
        gap={{ xs: 2, md: 3 }}
      >
        {sources.map((s) => (
          <Card
            key={s.name}
            variant="outlined"
            sx={{
              height: "100%",
              transition:
                "border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
              "&:hover": {
                borderColor: "primary.main",
                transform: "translateY(-2px)",
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0 6px 24px -8px rgba(15, 23, 42, 0.12)"
                    : "0 6px 24px -8px rgba(0, 0, 0, 0.5)",
              },
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ mb: 1 }}
              >
                <Link
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtitle1"
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  {s.name}
                </Link>
                <OpenInNew sx={{ fontSize: 16, color: "text.secondary" }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t(s.descKey)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default Acknowledgements;
