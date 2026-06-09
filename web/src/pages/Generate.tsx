/**
 * Generate page — non-linear 5-step font generation flow.
 *
 * The actual state and step components live under ./Generate/. This
 * file is the orchestration shell: it provides the GenerateContext,
 * renders an MUI Stepper, and swaps between the 5 step bodies based
 * on the current index.
 */
import { Box, Step, StepButton, Stepper, Typography } from "@mui/material";
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
  const { currentStep, setCurrentStep } = useGenerate();

  // Step labels are i18n keys; bodies are React components. Keeping
  // them in one array lets the stepper and the body switch stay in
  // perfect sync as we add/remove steps in the future.
  const steps = [
    { label: t("generate.step1.label"), body: <Step1Fonts /> },
    { label: t("generate.step2.label"), body: <Step2Mappings /> },
    { label: t("generate.step3.label"), body: <Step3Parameters /> },
    { label: t("generate.step4.label"), body: <Step4Log /> },
    { label: t("generate.step5.label"), body: <Step5Preview /> },
  ];

  return (
    <Box width="100%" my={2} display="flex" flexDirection="column" gap={3}>
      <Typography variant="h5">{t("generate.title")}</Typography>

      {/* Non-linear stepper — every step is clickable any time, so the
          user can jump back to tweak fonts after seeing the preview,
          for example. nonLinear + StepButton is the MUI idiom. */}
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
    </Box>
  );
};

export default Generate;
