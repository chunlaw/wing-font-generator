/**
 * Step 3 — DIY annotations (optional).
 *
 * Picks the `--diy-annotations` inventory: a CSV of `input,annotation`
 * rows (e.g. `ｚａａ１,zaa1`). In the generated font, typing the
 * full-width input after a character — with ０ first to strip its baked
 * reading, e.g. `行０ｚａａ１` — draws that annotation over it. Off by
 * default; only the full Generate run uses it (live previews skip it).
 */
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { ChangeEvent, useMemo, useState } from "react";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { BUILT_IN_DIY } from "../../../utils/wingfontPresets";

const CUSTOM = "__custom";

/** First usable `input,annotation` row + row count, for the status line. */
function summarise(csv: string): { count: number; input: string; anno: string } {
  let count = 0;
  let first: [string, string] | null = null;
  for (const line of csv.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    count += 1;
    if (!first) {
      const [a, b] = s.split(",");
      first = [a, b ?? a];
    }
  }
  return { count, input: first?.[0] ?? "", anno: first?.[1] ?? "" };
}

const StepDiy = () => {
  const { t } = useTranslation();
  const {
    diyCsvText,
    diyName,
    diyPresetKey,
    loadBuiltInDiy,
    loadDiyFromCsvText,
    clearDiy,
    params,
  } = useGenerate();
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(
    () => (diyCsvText ? summarise(diyCsvText) : null),
    [diyCsvText],
  );

  const handlePreset = async (key: string) => {
    setError(null);
    if (!key) return clearDiy();
    const preset = BUILT_IN_DIY.find((p) => p.key === key);
    if (!preset) return;
    try {
      await loadBuiltInDiy(preset);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setError(null);
    try {
      loadDiyFromCsvText(await file.text(), file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const selectValue = diyPresetKey ?? (diyCsvText ? CUSTOM : "");

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">{t("stepDiy.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("stepDiy.description")}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <FormControl size="small" sx={{ minWidth: 320 }}>
          <InputLabel id="diy-preset-label">{t("stepDiy.preset")}</InputLabel>
          <Select
            labelId="diy-preset-label"
            label={t("stepDiy.preset")}
            value={selectValue}
            onChange={(e) => handlePreset(e.target.value)}
          >
            <MenuItem value="">{t("stepDiy.none")}</MenuItem>
            {BUILT_IN_DIY.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
            {selectValue === CUSTOM && (
              <MenuItem value={CUSTOM} disabled>
                {t("stepDiy.custom")}
              </MenuItem>
            )}
          </Select>
        </FormControl>
        <Button variant="outlined" component="label" size="small">
          {t("stepDiy.upload")}
          <input hidden type="file" accept=".csv,text/csv" onChange={handleImport} />
        </Button>
        {diyCsvText && (
          <Button size="small" color="inherit" onClick={() => handlePreset("")}>
            {t("stepDiy.clear")}
          </Button>
        )}
      </Stack>

      {summary && (
        <Alert severity={summary.count ? "success" : "warning"}>
          {t("stepDiy.loaded")
            .replace("{name}", diyName ?? "")
            .replace("{count}", summary.count.toLocaleString())}
          {summary.count > 0 && (
            <>
              <br />
              {t("stepDiy.example")
                .replace("{input}", `行０${summary.input}`)
                .replace("{anno}", summary.anno)}
            </>
          )}
        </Alert>
      )}

      {diyCsvText && !params.optimize && (
        <Alert severity="warning">{t("stepDiy.needsOptimize")}</Alert>
      )}

      <Typography variant="caption" color="text.secondary">
        {t("stepDiy.format")}
      </Typography>
    </Stack>
  );
};

export default StepDiy;
