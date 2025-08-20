"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { OnboardingStep1_TPathSelection } from "@/components/onboarding/onboarding-step-1-tpath-selection.tsx";
import { OnboardingStep2_ExperienceLevel } from "@/components/onboarding/onboarding-step-2-experience-level.tsx";
import { OnboardingStep3_GoalFocus } from "@/components/onboarding/onboarding-step-3-goal-focus.tsx";
import { OnboardingStep4_SessionPreferences } from "@/components/onboarding/onboarding-step-4-session-preferences.tsx";
import { OnboardingStep5_EquipmentSetup } from "@/components/onboarding/onboarding-step-5-equipment-setup.tsx";
import { OnboardingStep6_Consent } from "@/components/onboarding/onboarding-step-6-consent.tsx";
import { useSession } from "@/components/session-context-provider";

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
    loading,
    tPathDescriptions,
    handleNext,
    handleBack,
    handleSubmit,
  } = useOnboardingForm();

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
      case 6: return "Consent";
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
      case 6: return "We need your permission to store your data";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
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
    </div>
  );
}