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
import { LoadingOverlay } from "@/components/loading-overlay"; // Import LoadingOverlay
import { useCallback, useState } from "react"; // Import useCallback and useState
import { toast } from "sonner"; // NEW: Import toast

export default function OnboardingPage() {
  const { session } = useSession(); // Use session to check if user is logged in
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
    loading, // For final submit button
    isInitialSetupLoading, // New loading state for step 5 -> 6 transition
    tPathDescriptions,
    handleNext: originalHandleNext, // Rename original handleNext
    handleBack,
    handleAdvanceToFinalStep, // New function for step 5 -> 6 transition
    handleSubmit: originalHandleSubmit, // Rename original handleSubmit
  } = useOnboardingForm();

  // Local state for Step 6 inputs
  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);

  const handleNext = useCallback(async () => {
    if (currentStep === 5) {
      try {
        await handleAdvanceToFinalStep(); // Trigger background setup
        originalHandleNext(); // Then advance step
      } catch (error) {
        // Error handled in hook, just prevent step advance
        console.error("Failed to advance to final step:", error);
      }
    } else {
      originalHandleNext();
    }
  }, [currentStep, originalHandleNext, handleAdvanceToFinalStep]);

  const handleSubmit = useCallback(async () => {
    // Ensure heightCm and weightKg are not null before passing, as they are now required
    if (fullName && heightCm !== null && weightKg !== null) {
      await originalHandleSubmit(fullName, heightCm, weightKg, bodyFatPct);
    } else {
      // This case should ideally be prevented by the disabled state of the button
      // but adding a toast for robustness.
      toast.error("Please fill in all required personal details.");
    }
  }, [originalHandleSubmit, fullName, heightCm, weightKg, bodyFatPct]);


  if (!session) {
    return <div>Loading...</div>; // Or redirect to login if session is null
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStep1_TPathSelection
            tPathType={tPathType}
            setTPathType={setTPathType}
            handleNext={handleNext}
            tPathDescriptions={tPathDescriptions}
          />
        );
      case 2:
        return (
          <OnboardingStep2_ExperienceLevel
            experience={experience}
            setExperience={setExperience}
            handleNext={handleNext}
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
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 4:
        return (
          <OnboardingStep4_SessionPreferences
            sessionLength={sessionLength}
            setSessionLength={setSessionLength}
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 5:
        return (
          <OnboardingStep5_EquipmentSetup
            equipmentMethod={equipmentMethod}
            setEquipmentMethod={setEquipmentMethod}
            handleNext={handleNext}
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
            // Pass Step 6 specific inputs
            fullName={fullName}
            setFullName={setFullName}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            weightKg={weightKg}
            setWeightKg={setWeightKg}
            bodyFatPct={bodyFatPct}
            setBodyFatPct={setBodyFatPct}
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
      case 4: return "Session Preferences";
      case 5: return "Equipment Setup";
      case 6: return "Final Details & Consent"; // Updated title
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Select the workout structure that best fits your goals";
      case 2: return "Help us tailor your program to your experience level";
      case 3: return "What are you primarily trying to achieve?";
      case 4: return "How long do you prefer your workout sessions to be?";
      case 5: return "Let's set up your gym equipment";
      case 6: return "Just a few more details to personalise your experience."; // Updated description
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
        isOpen={loading} // Only show loading for the final submit
        title="Completing Setup..."
        description="Finalizing your profile details."
      />
    </div>
  );
}