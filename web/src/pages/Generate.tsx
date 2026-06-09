/**
 * Generate page — non-linear 5-step font generation flow.
 *
 * The actual state and step components live under ./Generate/. This
 * file is the orchestration shell: it provides the GenerateContext,
 * renders an MUI Stepper, and swaps between the 5 step bodies based
 * on the current index.
 *
 * Responsive layout:
 *   - md+ (>=900px): horizontal Stepper at top, step body below.
 *     The standard wide-screen experience.
 *   - xs/sm (<900px): vertical Stepper where each step's body renders
 *     inline below its own label. Horizontal labels-below-dots
 *     ("alternativeLabel") doesn't fit on a phone — 5 labels in a
 *     ~360px viewport overlap and become unreadable. Vertical
 *     orientation is the standard MUI idiom for narrow stepper UIs.
 */
import {
  Box,
  Step,
  StepButton,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { GenerateProvider, useGenerate } from "./Generate/GenerateContext";
import { useTranslation } from "../i18n/LanguageContext";
import Step1Fonts from "./Generate/steps/Step1Fonts";
import Step2Mappings from "./Generate/steps/Step2Mappings";
import Step3Parameters from "./Generate/steps/Step3Parameters";
import Step4Log from "./Generate/steps/Step4Log";
import Step5Preview from "./Generate/steps/Step5Preview";

const Generate = () => {
  return (
    <GenerateProvider>
      <GenerateInner />
    </GenerateProvider>
  );
};

const GenerateInner = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { currentStep, setCurrentStep } = useGenerate();

  // Step labels are i18n keys; bodies are React components. Keeping
  // them in one array lets the desktop AND mobile renderers stay in
  // perfect sync without duplicating the step list.
  const steps = [
    { label: t("generate.step1.label"), body: <Step1Fonts /> },
    { label: t("generate.step2.label"), body: <Step2Mappings /> },
    { label: t("generate.step3.label"), body: <Step3Parameters /> },
    { label: t("generate.step4.label"), body: <Step4Log /> },
    { label: t("generate.step5.label"), body: <Step5Preview /> },
  ];

  return (
    <Box width="100%" my={2} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h4">{t("generate.title")}</Typography>

      {isMobile ? (
        // --- Mobile / vertical layout ---------------------------------
        // Each step body renders inline below its label via StepContent.
        // We keep the stepper non-linear (StepButton + onClick) so users
        // can jump around freely; the visible "active" step controls
        // which body is currently expanded.
        <Stepper
          activeStep={currentStep}
          orientation="vertical"
          nonLinear
        >
          {steps.map((step, idx) => (
            <Step key={step.label}>
              <StepButton onClick={() => setCurrentStep(idx)}>
                <StepLabel>{step.label}</StepLabel>
              </StepButton>
              <StepContent>
                {/* py:2 so the inline body doesn't crowd the next step
                    label visually. */}
                <Box py={2}>{step.body}</Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      ) : (
        // --- Desktop / horizontal layout ------------------------------
        <>
          <Stepper activeStep={currentStep} nonLinear alternativeLabel>
            {steps.map((step, idx) => (
              <Step key={step.label} completed={false}>
                <StepButton onClick={() => setCurrentStep(idx)}>
                  {step.label}
                </StepButton>
              </Step>
            ))}
          </Stepper>
          <Box>{steps[currentStep]?.body}</Box>
        </>
      )}
    </Box>
  );
};

export default Generate;
