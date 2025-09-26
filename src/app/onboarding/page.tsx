"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { Progress } from "@/components/ui/progress";

// Import step components
import { OnboardingStep1_GoalFocus } from "@/components/onboarding/onboarding-step-1-goal-focus";
import { OnboardingStep2_TrainingPlan } from "@/components/onboarding/onboarding-step-2-training-plan";
import { OnboardingStep3_ProfileAndAi } from "@/components/onboarding/onboarding-step-3-profile-and-ai";
import { OnboardingStep4_GymSetup } from "@/components/onboarding/onboarding-step-4-gym-setup";
import { OnboardingStep5_GymPhotoUpload } from "@/components/onboarding/onboarding-step-5-gym-photo-upload";
import { OnboardingStep6_AppFeatures } from "@/components/onboarding/onboarding-step-6-app-features";

export default function OnboardingPage() {
  const { memoizedSessionUserId } = useSession();
  const {
    currentStep,
    // Step 1
    goalFocus, setGoalFocus,
    // Step 2
    tPathType, setTPathType,
    sessionLength, setSessionLength,
    tPathDescriptions,
    // Step 3
    fullName, setFullName,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    preferredMuscles, setPreferredMuscles,
    constraints, setConstraints,
    consentGiven, setConsentGiven,
    // Step 4 & 5
    equipmentMethod, setEquipmentMethod,
    gymName, setGymName,
    identifiedExercises, addIdentifiedExercise, removeIdentifiedExercise,
    confirmedExercises, toggleConfirmedExercise,
    // Handlers
    handleNext,
    handleBack,
    handleSubmit,
    // Final step
    loading,
    summaryData,
    isSummaryModalOpen,
    handleCloseSummaryModal,
  } = useOnboardingForm();

  if (!memoizedSessionUserId) {
    return <div>Loading...</div>;
  }

  const TOTAL_STEPS = 7;
  const progressValue = (currentStep / TOTAL_STEPS) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <OnboardingStep1_GoalFocus
            goalFocus={goalFocus}
            setGoalFocus={setGoalFocus}
            handleNext={handleNext}
          />
        );
      case 2:
        return (
          <OnboardingStep2_TrainingPlan
            tPathType={tPathType}
            setTPathType={setTPathType}
            sessionLength={sessionLength}
            setSessionLength={setSessionLength}
            handleNext={handleNext}
            handleBack={handleBack}
            tPathDescriptions={tPathDescriptions}
          />
        );
      case 3:
        return (
          <OnboardingStep3_ProfileAndAi
            fullName={fullName}
            setFullName={setFullName}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            weightKg={weightKg}
            setWeightKg={setWeightKg}
            preferredMuscles={preferredMuscles}
            setPreferredMuscles={setPreferredMuscles}
            constraints={constraints}
            setConstraints={setConstraints}
            consentGiven={consentGiven}
            setConsentGiven={setConsentGiven}
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
          <OnboardingStep6_AppFeatures
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const firstName = fullName.split(' ')[0];
    switch (currentStep) {
      case 1: return `Welcome! What's Your Main Goal?`;
      case 2: return "How Do You Like to Train?";
      case 3: return `Great, ${firstName}! Let's Personalise Your Plan.`;
      case 4: return "Let's Equip Your Workouts";
      case 5: return "Analyse Your Gym";
      case 6: return "Your Plan Comes With Powerful Tools";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "This helps us tailor your workout plan to what you want to achieve.";
      case 2: return "Choose the structure and duration that best fits your lifestyle.";
      case 3: return "These details help us and our AI coach create a truly bespoke plan for you.";
      case 4: return "Tell us about your primary gym so we can select the right exercises.";
      case 5: return "Upload photos of your equipment, and our AI will identify exercises for you to confirm.";
      case 6: return "Here are some of the key features you're about to unlock. Click below to generate your plan!";
      default: return "";
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background p-2 sm:p-4">
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Your Fitness Journey Starts Now</h1>
            <p className="text-muted-foreground mt-2">
              Let's set up your personalised Transformation Path
            </p>
          </header>

          <div className="mb-6 px-2">
            <Progress value={progressValue} className="w-full" />
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
          isOpen={loading}
          title="Crafting Your Plan..."
          description="Finalizing your profile and generating your personalized workouts."
        />
      </div>
      <OnboardingSummaryModal
        open={isSummaryModalOpen}
        onOpenChange={handleCloseSummaryModal}
        summaryData={summaryData}
        onClose={handleCloseSummaryModal}
      />
    </>
  );
}