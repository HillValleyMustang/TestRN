"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { Progress } from "@/components/ui/progress";

// Import step components
import { OnboardingStep1_ProfileSnapshot } from "@/components/onboarding/onboarding-step-1-profile-snapshot";
import { OnboardingStep2_GoalFocus } from "@/components/onboarding/onboarding-step-2-goal-focus";
import { OnboardingStep3_GoalFocus as OnboardingStep3_AiCoach } from "@/components/onboarding/onboarding-step-3-goal-focus";
import { OnboardingStep4_TrainingPlan } from "@/components/onboarding/onboarding-step-4-training-plan";
import { OnboardingStep5_GymSetup } from "@/components/onboarding/onboarding-step-5-gym-setup";
// Placeholder for future steps - will be created in subsequent turns
// import { OnboardingStep6_Toolkit } from "@/components/onboarding/onboarding-step-6-toolkit";

export default function OnboardingPage() {
  const { memoizedSessionUserId } = useSession();
  const {
    currentStep,
    // Step 1
    fullName, setFullName,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    consentGiven, setConsentGiven,
    // Step 2
    goalFocus, setGoalFocus,
    // Step 3
    preferredMuscles, setPreferredMuscles,
    constraints, setConstraints,
    // Step 4
    tPathType, setTPathType,
    sessionLength, setSessionLength,
    tPathDescriptions,
    // Step 5
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
          <OnboardingStep1_ProfileSnapshot
            fullName={fullName}
            setFullName={setFullName}
            heightCm={heightCm}
            setHeightCm={setHeightCm}
            weightKg={weightKg}
            setWeightKg={setWeightKg}
            consentGiven={consentGiven}
            setConsentGiven={setConsentGiven}
            handleNext={handleNext}
          />
        );
      case 2:
        return (
          <OnboardingStep2_GoalFocus
            goalFocus={goalFocus}
            setGoalFocus={setGoalFocus}
            handleNext={handleNext}
            handleBack={handleBack}
          />
        );
      case 3:
        return (
          <OnboardingStep3_AiCoach
            goalFocus={goalFocus}
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
          <OnboardingStep4_TrainingPlan
            tPathType={tPathType}
            setTPathType={setTPathType}
            sessionLength={sessionLength}
            setSessionLength={setSessionLength}
            handleNext={handleNext}
            handleBack={handleBack}
            tPathDescriptions={tPathDescriptions}
          />
        );
      case 5:
        return (
          <OnboardingStep5_GymSetup
            equipmentMethod={equipmentMethod}
            setEquipmentMethod={setEquipmentMethod}
            handleNext={handleNext}
            handleBack={handleBack}
            gymName={gymName}
            setGymName={setGymName}
          />
        );
      // Cases for steps 6-7 will be added in future turns
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const firstName = fullName.split(' ')[0];
    switch (currentStep) {
      case 1: return "Welcome! Let's Get to Know You.";
      case 2: return `What's Your Main Goal, ${firstName}?`;
      case 3: return "Any Specifics for Your AI Coach?";
      case 4: return "How Do You Like to Train?";
      case 5: return "Let's Equip Your Plan";
      case 6: return "Your Plan Comes With Powerful Tools";
      case 7: return "Crafting Your Personalized Plan...";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Let's start with the basics to personalize your experience.";
      case 2: return "This helps us tailor your workout plan to what you want to achieve.";
      case 3: return "Tell us about any preferences or limitations so we can fine-tune your plan.";
      case 4: return "Choose the structure and duration that best fits your lifestyle.";
      case 5: return "Tell us about your primary gym so we can select the right exercises.";
      // Descriptions for steps 6-7 will be added
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