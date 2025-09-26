"use client";

import React from "react";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { useSession } from "@/components/session-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { CircularProgress } from "@/components/ui/circular-progress";

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
    goalFocus, setGoalFocus,
    tPathType, setTPathType,
    sessionLength, setSessionLength,
    tPathDescriptions,
    fullName, setFullName,
    heightCm, setHeightCm,
    weightKg, setWeightKg,
    preferredMuscles, setPreferredMuscles,
    constraints, setConstraints,
    consentGiven, setConsentGiven,
    equipmentMethod, setEquipmentMethod,
    gymName, setGymName,
    identifiedExercises, addIdentifiedExercise, removeIdentifiedExercise,
    confirmedExercises, toggleConfirmedExercise,
    handleNext,
    handleBack,
    handleSubmit,
    loading,
    summaryData,
    isSummaryModalOpen,
    handleCloseSummaryModal,
  } = useOnboardingForm();

  if (!memoizedSessionUserId) {
    return <div>Loading...</div>;
  }

  const TOTAL_STEPS = 6; // Adjusted total steps
  const progressValue = (currentStep / TOTAL_STEPS) * 100;

  const renderStepContent = () => {
    const stepProps = { handleNext, handleBack };
    switch (currentStep) {
      case 1:
        return <OnboardingStep1_GoalFocus {...{ goalFocus, setGoalFocus, ...stepProps }} />;
      case 2:
        return <OnboardingStep2_TrainingPlan {...{ tPathType, setTPathType, sessionLength, setSessionLength, tPathDescriptions, ...stepProps }} />;
      case 3:
        return <OnboardingStep3_ProfileAndAi {...{ fullName, setFullName, heightCm, setHeightCm, weightKg, setWeightKg, preferredMuscles, setPreferredMuscles, constraints, setConstraints, consentGiven, setConsentGiven, ...stepProps }} />;
      case 4:
        return <OnboardingStep4_GymSetup {...{ equipmentMethod, setEquipmentMethod, gymName, setGymName, ...stepProps }} />;
      case 5:
        return <OnboardingStep5_GymPhotoUpload {...{ identifiedExercises, addIdentifiedExercise, removeIdentifiedExercise, confirmedExercises, toggleConfirmedExercise, ...stepProps }} />;
      case 6:
        return <OnboardingStep6_AppFeatures {...{ ...stepProps }} />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const firstName = fullName.split(' ')[0] || 'there';
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="flex flex-col items-center text-center mb-8">
            <CircularProgress progress={progressValue} />
            <h1 className="text-2xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-r from-coral to-teal">
              {getStepTitle()}
            </h1>
            <p className="text-muted-foreground mt-1">{getStepDescription()}</p>
          </div>

          <div key={currentStep} className="animate-fade-in-slide-up">
            {renderStepContent()}
          </div>
        </div>
      </div>
      <LoadingOverlay 
        isOpen={loading}
        title="Crafting Your Plan..."
        description="Finalizing your profile and generating your personalized workouts."
      />
      <OnboardingSummaryModal
        open={isSummaryModalOpen}
        onOpenChange={handleCloseSummaryModal}
        summaryData={summaryData}
        onClose={handleCloseSummaryModal}
      />
    </>
  );
}