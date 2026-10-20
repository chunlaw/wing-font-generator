import { Box, Link, Typography } from "@mui/material";
import { Fragment, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { AVAILABLE_FONTS, FontOption, isListedFont } from "../utils/const";
import FONT_FACTS from "../utils/fontFacts.generated.json";
import { schemeIntro, schemeKey } from "../utils/schemeIntros";

const MAPPINGS_URL =
  "https://github.com/chunlaw/wing-font-generator/blob/main/python/mappings/";

const facts: Record<
  string,
  { base: string; annotation: string; mapping: string } | undefined
> = FONT_FACTS;

/** Crawlable per-font copy under the specimen editor: scheme intro, build facts, sibling styles. */
const SpecimenAbout = ({
  font,
  dialectLabel,
}: {
  font: FontOption;
  dialectLabel: string;
}) => {
  const { t, lang } = useTranslation();
  const fact = facts[font.name];
  if (!fact) return null;

  const intro = schemeIntro(font.name, lang);
  const siblings = Object.values(AVAILABLE_FONTS)
    .flatMap((dialect) => Object.values(dialect.fonts))
    .filter(
      (f) =>
        f.name !== font.name &&
        isListedFont(f) &&
        schemeKey(f.name) === schemeKey(font.name),
    );
  const rows: [string, ReactNode][] = [
    [t("specimen.about.language"), dialectLabel],
    [t("specimen.about.scheme"), font.note],
    [t("specimen.about.base"), fact.base],
    [t("specimen.about.annotation"), fact.annotation],
    [
      t("specimen.about.mapping"),
      <Link href={MAPPINGS_URL + fact.mapping}>{fact.mapping}</Link>,
    ],
    [t("specimen.about.license"), "SIL Open Font License 1.1"],
  ];

  return (
    <Box component="section">
      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
        {t("specimen.about.title")}
      </Typography>
      {intro && <Typography sx={{ mb: 1.5 }}>{intro}</Typography>}
      <Typography sx={{ mb: 2 }}>
        {t("specimen.about.summary", {
          name: font.displayName,
          dialect: dialectLabel,
          base: fact.base,
          annotation: fact.annotation,
        })}
      </Typography>
      <Box
        component="dl"
        sx={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          columnGap: 2,
          rowGap: 0.5,
          m: 0,
          overflowWrap: "anywhere",
        }}
      >
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <Typography component="dt" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {value}
            </Typography>
          </Fragment>
        ))}
      </Box>
      {siblings.length > 0 && (
        <>
          <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>
            {t("specimen.about.siblings")}
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {siblings.map((f) => (
              <Link
                key={f.name}
                component={RouterLink}
                to={`/specimen/${f.name}`}
              >
                {f.displayName}
              </Link>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default SpecimenAbout;
