"use client";

import React, { useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { toast } from "sonner";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { OnboardingProgressBar } from "@/components/onboarding/onboarding-progress-bar";

// Import new step components
import { OnboardingStep1_Profile } from "@/components/onboarding/onboarding-step-1-profile";
import { OnboardingStep2_GoalsAndExperience } from "@/components/onboarding/onboarding-step-2-goals-and-experience";
import { OnboardingStep3_TPathSelection } from "@/components/onboarding/onboarding-step-3-tpath-selection";
import { OnboardingStep4_ScheduleAndTools } from "@/components/onboarding/onboarding-step-4-schedule-and-tools";
import { OnboardingStep5_GymAnalysis } from "@/components/onboarding/onboarding-step-5-gym-analysis";
import { OnboardingStep6_AppFeatures } from "@/components/onboarding/onboarding-step-6-app-features";

export default function OnboardingPage() {
  const { memoizedSessionUserId } = useSession();
  const {
    currentStep, tPathType, setTPathType, experience, setExperience, goalFocus, setGoalFocus,
    preferredMuscles, setPreferredMuscles, constraints, setConstraints, sessionLength, setSessionLength,
    equipmentMethod, setEquipmentMethod, loading, isInitialSetupLoading, tPathDescriptions,
    handleNext, handleBack, handleSubmit: originalHandleSubmit, identifiedExercises, addIdentifiedExercise,
    removeIdentifiedExercise, confirmedExercises, toggleConfirmedExercise, gymName, setGymName,
    summaryData, isSummaryModalOpen, setIsSummaryModalOpen, handleCloseSummaryModal,
  } = useOnboardingForm();

  // State for the final details, now part of Step 1
  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(175);
  const [weightKg, setWeightKg] = useState<number | null>(70);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);

  const handleSubmit = useCallback(async () => {
    if (fullName && heightCm !== null && weightKg !== null) {
      await originalHandleSubmit(fullName, heightCm, weightKg, bodyFatPct);
    } else {
      toast.error("Please fill in all required personal details.");
    }
  }, [originalHandleSubmit, fullName, heightCm, weightKg, bodyFatPct]);

  if (!memoizedSessionUserId) {
    return <div>Loading...</div>;
  }

  const totalSteps = equipmentMethod === 'skip' ? 5 : 6; // Total steps changes based on skip path

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <OnboardingStep1_Profile handleNext={handleNext} fullName={fullName} setFullName={setFullName} heightCm={heightCm} setHeightCm={setHeightCm} weightKg={weightKg} setWeightKg={setWeightKg} bodyFatPct={bodyFatPct} setBodyFatPct={setBodyFatPct} />;
      case 2:
        return <OnboardingStep2_GoalsAndExperience experience={experience} setExperience={setExperience} goalFocus={goalFocus} setGoalFocus={setGoalFocus} preferredMuscles={preferredMuscles} setPreferredMuscles={setPreferredMuscles} constraints={constraints} setConstraints={setConstraints} handleNext={handleNext} handleBack={handleBack} />;
      case 3:
        return <OnboardingStep3_TPathSelection tPathType={tPathType} setTPathType={setTPathType} handleNext={handleNext} handleBack={handleBack} tPathDescriptions={tPathDescriptions} />;
      case 4:
        return <OnboardingStep4_ScheduleAndTools sessionLength={sessionLength} setSessionLength={setSessionLength} equipmentMethod={equipmentMethod} setEquipmentMethod={setEquipmentMethod} handleNext={handleNext} handleBack={handleBack} gymName={gymName} setGymName={setGymName} />;
      case 5:
        return <OnboardingStep5_GymAnalysis identifiedExercises={identifiedExercises} addIdentifiedExercise={addIdentifiedExercise} removeIdentifiedExercise={removeIdentifiedExercise} confirmedExercises={confirmedExercises} toggleConfirmedExercise={toggleConfirmedExercise} handleNext={handleNext} handleBack={handleBack} />;
      case 6:
        return <OnboardingStep6_AppFeatures handleNext={handleSubmit} handleBack={handleBack} />; // Final step before summary
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Let's Build Your Athlete Profile";
      case 2: return "What Are Your Goals?";
      case 3: return "Choose Your Transformation Path";
      case 4: return "Your Schedule & Tools";
      case 5: return "Calibrating Your Gym";
      case 6: return "A Preview of Your New Power";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Tell us a bit about yourself to get started.";
      case 2: return "Help us tailor your program to your experience and what you want to achieve.";
      case 3: return "Select the workout structure that best fits your goals. This will theme your app.";
      case 4: return "The final inputs our AI needs to build your personalised plan.";
      case 5: return "Upload photos of your gym equipment for the AI to analyse.";
      case 6: return "Here's a quick look at what you can do with the app.";
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

          <OnboardingProgressBar currentStep={currentStep} totalSteps={totalSteps} tPathType={tPathType} />

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