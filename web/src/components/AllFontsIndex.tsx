import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";
import { AVAILABLE_FONTS, getDialectLabel, isListedFont } from "../utils/const";

/** Plain links to every /specimen page, so crawlers (and readers) reach each font from the site itself. */
const AllFontsIndex = () => {
  const { t, lang } = useTranslation();
  return (
    <Box component="section" sx={{ width: "100%" }}>
      <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
        {t("showcase.allFonts")}
      </Typography>
      {Object.entries(AVAILABLE_FONTS).map(([dialectKey, dialect]) => (
        <Box key={dialectKey} sx={{ mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
            {getDialectLabel(dialectKey, lang)}
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              columnGap: 4,
              rowGap: 0.5,
            }}
          >
            {Object.values(dialect.fonts)
              .filter(isListedFont)
              .map((f) => (
                <li key={f.name}>
                  <Link component={RouterLink} to={`/specimen/${f.name}`}>
                    {f.displayName}
                  </Link>
                  {f.note && (
                    <Typography component="span" color="text.secondary">
                      {" "}
                      {f.note}
                    </Typography>
                  )}
                </li>
              ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default AllFontsIndex;
