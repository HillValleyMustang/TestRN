"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress"; // Import the new progress component

// Import new step components
import { OnboardingStep1_PersonalInfo } from "@/components/onboarding/onboarding-step-1-personal-info";
import { OnboardingStep2_TrainingSetup } from "@/components/onboarding/onboarding-step-2-training-setup";
import { OnboardingStep3_GoalsAndPreferences } from "@/components/onboarding/onboarding-step-3-goals-and-preferences";
import { OnboardingStep4_GymSetupAndConsent } from "@/components/onboarding/onboarding-step-4-gym-setup-and-consent";
import { OnboardingStep5_GymPhotoUpload } from "@/components/onboarding/onboarding-step-5-gym-photo-upload";

export default function OnboardingPage() {
  const { memoizedSessionUserId } = useSession();
  const {
    currentStep,
    handleNext,
    handleBack,
    handleSubmit,
    loading,
    isInitialSetupLoading,
    summaryData,
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    handleCloseSummaryModal,
    // Destructure all state and setters for the new components
    tPathType, setTPathType, tPathDescriptions,
    experience, setExperience,
    goalFocus, setGoalFocus,
    preferredMuscles, setPreferredMuscles,
    constraints, setConstraints,
    sessionLength, setSessionLength,
    equipmentMethod, setEquipmentMethod,
    gymName, setGymName,
    identifiedExercises, addIdentifiedExercise, removeIdentifiedExercise,
    confirmedExercises, toggleConfirmedExercise,
    consentGiven, setConsentGiven,
    fullName, setFullName,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    bodyFatPct, setBodyFatPct,
  } = useOnboardingForm();

  if (!memoizedSessionUserId) {
    return <div>Loading...</div>;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStep1_PersonalInfo
            handleNext={handleNext}
            fullName={fullName} setFullName={setFullName}
            heightCm={heightCm} setHeightCm={setHeightCm}
            weightKg={weightKg} setWeightKg={setWeightKg}
            bodyFatPct={bodyFatPct} setBodyFatPct={setBodyFatPct}
          />
        );
      case 2:
        return (
          <OnboardingStep2_TrainingSetup
            tPathType={tPathType} setTPathType={setTPathType}
            experience={experience} setExperience={setExperience}
            handleNext={handleNext} handleBack={handleBack}
            tPathDescriptions={tPathDescriptions}
          />
        );
      case 3:
        return (
          <OnboardingStep3_GoalsAndPreferences
            goalFocus={goalFocus} setGoalFocus={setGoalFocus}
            preferredMuscles={preferredMuscles} setPreferredMuscles={setPreferredMuscles}
            constraints={constraints} setConstraints={setConstraints}
            sessionLength={sessionLength} setSessionLength={setSessionLength}
            handleNext={handleNext} handleBack={handleBack}
          />
        );
      case 4:
        return (
          <OnboardingStep4_GymSetupAndConsent
            equipmentMethod={equipmentMethod} setEquipmentMethod={setEquipmentMethod}
            handleNext={handleNext} handleBack={handleBack}
            handleSubmit={handleSubmit}
            gymName={gymName} setGymName={setGymName}
            consentGiven={consentGiven} setConsentGiven={setConsentGiven}
            loading={loading}
          />
        );
      case 5:
        return (
          <OnboardingStep5_GymPhotoUpload
            identifiedExercises={identifiedExercises}
            addIdentifiedExercise={addIdentifiedExercise}
            removeIdentifiedExercise={removeIdentifiedExercise}
            confirmedExercises={confirmedExercises}
            toggleConfirmedExercise={toggleConfirmedExercise}
            handleNext={handleSubmit} // The "Next" button here is the final submission
            handleBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Let's Get to Know You";
      case 2: return "Training Setup";
      case 3: return "Goals & Session Preferences";
      case 4: return "Gym Setup & Consent";
      case 5: return "Analyse Your Gym";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Your personal details help us tailor your experience.";
      case 2: return "Select the workout structure and your experience level.";
      case 3: return "Tell us what you want to achieve and how long you like to train.";
      case 4: return "Let's set up your gym equipment and confirm your consent.";
      case 5: return "Upload photos of your gym equipment for the AI to analyse.";
      default: return "";
    }
  };

  const totalSteps = 5;

  return (
    <>
      <div className="min-h-screen bg-background p-2 sm:p-4">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Welcome to Your Fitness Journey</h1>
            <p className="text-muted-foreground mt-2">
              Let's set up your personalised Transformation Path
            </p>
          </header>

          <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />

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
          title={loading ? "Completing Setup..." : "Setting up your workout plan..."}
          description={loading ? "Finalizing your profile details." : "Please wait while we generate your initial workout programs."}
        />
      </div>
      <OnboardingSummaryModal
        open={isSummaryModalOpen}
        onOpenChange={setIsSummaryModalOpen}
        summaryData={summaryData}
        onClose={handleCloseSummaryModal}
      />
    </>
  );
}