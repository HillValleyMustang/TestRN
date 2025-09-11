"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { OnboardingStep1_TPathSelection } from "@/components/onboarding/onboarding-step-1-tpath-selection";
import { OnboardingStep2_ExperienceLevel } from "@/components/onboarding/onboarding-step-2-experience-level";
import { OnboardingStep3_GoalFocus } from "@/components/onboarding/onboarding-step-3-goal-focus";
import { OnboardingStep4_SessionPreferences } from "@/components/onboarding/onboarding-step-4-session-preferences";
import { OnboardingStep5_EquipmentSetup } from "@/components/onboarding/onboarding-step-5-equipment-setup";
import { OnboardingStep6_Consent } from "@/components/onboarding/onboarding-step-6-consent";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { session } = useSession();
  const {
    currentStep,
    tPathType,
    setTPathType,
    experience,
    setExperience,
    goalFocus,
    setGoalFocus,
    preferredMuscles,
    setPreferredMuscles,
    constraints,
    setConstraints,
    sessionLength,
    setSessionLength,
    equipmentMethod,
    setEquipmentMethod,
    consentGiven,
    setConsentGiven,
    loading,
    isInitialSetupLoading,
    tPathDescriptions,
    handleNext: originalHandleNext,
    handleBack,
    handleAdvanceToFinalStep,
    handleSubmit: originalHandleSubmit,
    firstGymName,
    setFirstGymName,
  } = useOnboardingForm();

  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);

  const handleNext = useCallback(async () => {
    // The new step 5 (Session Preferences) is the trigger to generate the initial T-Paths
    if (currentStep === 5) {
      try {
        await handleAdvanceToFinalStep();
        originalHandleNext();
      } catch (error) {
        console.error("Failed to advance to final step:", error);
      }
    } else {
      originalHandleNext();
    }
  }, [currentStep, originalHandleNext, handleAdvanceToFinalStep]);

  const handleSubmit = useCallback(async () => {
    if (fullName && heightCm !== null && weightKg !== null && firstGymName) {
      await originalHandleSubmit(fullName, heightCm, weightKg, bodyFatPct, firstGymName);
    } else {
      toast.error("Please fill in all required personal details.");
    }
  }, [originalHandleSubmit, fullName, heightCm, weightKg, bodyFatPct, firstGymName]);

  if (!session) {
    return <div>Loading...</div>;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStep1_TPathSelection
            tPathType={tPathType}
            setTPathType={setTPathType}
            handleNext={originalHandleNext} // Use original handleNext for steps 1-4
            tPathDescriptions={tPathDescriptions}
          />
        );
      case 2:
        return (
          <OnboardingStep2_ExperienceLevel
            experience={experience}
            setExperience={setExperience}
            handleNext={originalHandleNext}
            handleBack={handleBack}
          />
        );
      case 3:
        return (
          <OnboardingStep3_GoalFocus
            goalFocus={goalFocus}
            setGoalFocus={setGoalFocus}
            preferredMuscles={preferredMuscles}
            setPreferredMuscles={setPreferredMuscles}
            constraints={constraints}
            setConstraints={setConstraints}
            handleNext={originalHandleNext}
            handleBack={handleBack}
          />
        );
      case 4: // NEW STEP 4: Equipment Setup
        return (
          <OnboardingStep5_EquipmentSetup
            equipmentMethod={equipmentMethod}
            setEquipmentMethod={setEquipmentMethod}
            handleNext={originalHandleNext}
            handleBack={handleBack}
          />
        );
      case 5: // NEW STEP 5: Session Preferences
        return (
          <OnboardingStep4_SessionPreferences
            sessionLength={sessionLength}
            setSessionLength={setSessionLength}
            handleNext={handleNext} // Use the new handleNext that triggers generation
            handleBack={handleBack}
          />
        );
      case 6:
        return (
          <OnboardingStep6_Consent
            consentGiven={consentGiven}
            setConsentGiven={setConsentGiven}
            handleSubmit={handleSubmit}
            handleBack={handleBack}
            loading={loading}
            fullName={fullName}
            setFullName={setFullName}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            weightKg={weightKg}
            setWeightKg={setWeightKg}
            bodyFatPct={bodyFatPct}
            setBodyFatPct={setBodyFatPct}
            firstGymName={firstGymName}
            setFirstGymName={setFirstGymName}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Choose Your Transformation Path";
      case 2: return "Your Experience Level";
      case 3: return "Goal Focus";
      case 4: return "Equipment Setup"; // Updated title
      case 5: return "Session Preferences"; // Updated title
      case 6: return "Final Details & Consent";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Select the workout structure that best fits your goals";
      case 2: return "Help us tailor your program to your experience level";
      case 3: return "What are you primarily trying to achieve?";
      case 4: return "Let's set up your gym equipment"; // Updated description
      case 5: return "How long do you prefer your workout sessions to be?"; // Updated description
      case 6: return "Just a few more details to personalise your experience.";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome to Your Fitness Journey</h1>
          <p className="text-muted-foreground mt-2">
            Let's set up your personalised Transformation Path
          </p>
        </header>

        <div className="mb-6">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex-1 text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                  currentStep >= step 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step}
                </div>
                {step < 6 && (
                  <div className={`h-1 w-full mt-2 ${
                    currentStep > step 
                      ? "bg-primary" 
                      : "bg-muted"
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
      <LoadingOverlay 
        isOpen={loading || isInitialSetupLoading}
        title={isInitialSetupLoading ? "Setting up your workout plan..." : "Completing Setup..."}
        description={isInitialSetupLoading ? "Please wait while we generate your initial workout programs." : "Finalizing your profile details."}
      />
    </div >
  );
}