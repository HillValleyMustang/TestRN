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
// Placeholder for future steps - will be created in subsequent turns
// import { OnboardingStep3_AiCoach } from "@/components/onboarding/onboarding-step-3-ai-coach";
// import { OnboardingStep4_Blueprint } from "@/components/onboarding/onboarding-step-4-blueprint";
// import { OnboardingStep5_Equip } from "@/components/onboarding/onboarding-step-5-equip";
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
      // Cases for steps 3-7 will be added in future turns
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
      // Descriptions for steps 3-7 will be added
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