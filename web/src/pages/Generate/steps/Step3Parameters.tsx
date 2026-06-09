/**
 * Step 3 — generation parameters.
 *
 * Same controls the original flat Generate.tsx had, just isolated into
 * its own step. Sliders are wired to GenerateContext so changes persist
 * even if the user navigates away and back.
 */
import {
  Box,
  Checkbox,
  FormControlLabel,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useGenerate } from "../GenerateContext";
import { useTranslation } from "../../../i18n/LanguageContext";
import { GenerateParams } from "../types";

const Step3Parameters = () => {
  const { t } = useTranslation();
  const { params, setParam } = useGenerate();

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h6">{t("step3.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("step3.description")}
        </Typography>
      </Box>

      <TextField
        label={t("step3.family")}
        helperText={t("step3.familyHint")}
        value={params.familyName}
        onChange={(e) => setParam("familyName", e.target.value)}
        fullWidth
      />

      <LabeledSlider
        label={t("step3.baseScale")}
        value={params.baseScale}
        min={0.3}
        max={1}
        step={0.01}
        onChange={(v) => setParam("baseScale", v)}
      />
      <LabeledSlider
        label={t("step3.annoScale")}
        value={params.annoScale}
        min={0.05}
        max={0.35}
        step={0.01}
        onChange={(v) => setParam("annoScale", v)}
      />
      <LabeledSlider
        label={t("step3.yOffset")}
        value={params.yOffsetRatio}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setParam("yOffsetRatio", v)}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={params.invert}
              onChange={(e) => setParam("invert", e.target.checked)}
            />
          }
          label={t("step3.invert")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={params.optimize}
              onChange={(e) => setParam("optimize", e.target.checked)}
            />
          }
          label={t("step3.optimize")}
        />
      </Stack>
    </Box>
  );
};

interface LabeledSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const LabeledSlider = ({ label, value, onChange, min, max, step }: LabeledSliderProps) => {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}: {value.toFixed(2)}
      </Typography>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(Array.isArray(v) ? v[0] : v)}
        valueLabelDisplay="auto"
      />
    </Box>
  );
};

// Re-export the type so step files can be self-contained imports.
export type { GenerateParams };
export default Step3Parameters;
