"use client";

import React, { useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { OnboardingStep1_TPathSelection } from "@/components/onboarding/onboarding-step-1-tpath-selection";
import { OnboardingStep2_ExperienceLevel } from "@/components/onboarding/onboarding-step-2-experience-level";
import { OnboardingStep3_GoalFocus } from "@/components/onboarding/onboarding-step-3-goal-focus";
import { OnboardingStep4_GymSetup } from "@/components/onboarding/onboarding-step-4-gym-setup";
import { OnboardingStep5_GymPhotoUpload } from "@/components/onboarding/onboarding-step-5-gym-photo-upload";
import { OnboardingStep6_SessionPreferences } from "@/components/onboarding/onboarding-step-6-session-preferences";
import { OnboardingStep7_AppFeatures } from "@/components/onboarding/onboarding-step-7-app-features";
import { OnboardingStep8_FinalDetails } from "@/components/onboarding/onboarding-step-8-final-details";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
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
    handleNext,
    handleBack,
    handleSubmit: originalHandleSubmit,
    identifiedExercises,
    addIdentifiedExercise,
    removeIdentifiedExercise,
    confirmedExercises,
    toggleConfirmedExercise,
    gymName,
    setGymName,
  } = useOnboardingForm();

  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);

  const handleSubmit = useCallback(async () => {
    if (fullName && heightCm !== null && weightKg !== null) {
      await originalHandleSubmit(fullName, heightCm, weightKg, bodyFatPct);
    } else {
      toast.error("Please fill in all required personal details.");
    }
  }, [originalHandleSubmit, fullName, heightCm, weightKg, bodyFatPct]);

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
          <OnboardingStep4_GymSetup
            equipmentMethod={equipmentMethod}
            setEquipmentMethod={setEquipmentMethod}
            handleNext={handleNext}
            handleBack={handleBack}
            gymName={gymName}
            setGymName={setGymName}
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
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 6:
        return (
          <OnboardingStep6_SessionPreferences
            sessionLength={sessionLength}
            setSessionLength={setSessionLength}
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 7:
        return (
          <OnboardingStep7_AppFeatures
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 8:
        return (
          <OnboardingStep8_FinalDetails
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
      case 4: return "Gym Setup";
      case 5: return "Analyse Your Gym";
      case 6: return "Session Preferences";
      case 7: return "App Features";
      case 8: return "Final Details & Consent";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Select the workout structure that best fits your goals";
      case 2: return "Help us tailor your program to your experience level";
      case 3: return "What are you primarily trying to achieve?";
      case 4: return "Let's set up your gym equipment";
      case 5: return "Upload photos of your gym equipment for the AI to analyse";
      case 6: return "How long do you prefer your workout sessions to be?";
      case 7: return "Here's a quick look at what you can do with the app.";
      case 8: return "Just a few more details to personalise your experience.";
      default: return "";
    }
  };

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

          <div className="mb-6">
            <div className="flex justify-between items-start">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex-shrink-0 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                      currentStep >= step 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step}
                    </div>
                  </div>
                  {step < 8 && (
                    <div className={`flex-grow h-1 mt-4 ${
                      currentStep > step 
                        ? "bg-primary" 
                        : "bg-muted"
                    }`}></div>
                  )}
                </React.Fragment>
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
          title={loading ? "Completing Setup..." : "Setting up your workout plan..."}
          description={loading ? "Finalizing your profile details." : "Please wait while we generate your initial workout programs."}
        />
      </div>
    </>
  );
}