"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";
import { OnboardingSummaryModal } from "@/components/onboarding/onboarding-summary-modal";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingStep1_PersonalInfo } from "@/components/onboarding/onboarding-step-1-personal-info";
import { OnboardingStep2_TrainingSetup } from "@/components/onboarding/onboarding-step-2-training-setup";
import { OnboardingStep3_GoalsAndPreferences } from "@/components/onboarding/onboarding-step-3-goals-and-preferences";
import { OnboardingStep4_GymSetupAndConsent } from "@/components/onboarding/onboarding-step-4-gym-setup-and-consent";
import { OnboardingStep5_GymPhotoUpload } from "@/components/onboarding/onboarding-step-5-gym-photo-upload";

type OnboardingSummaryData = {
  profile: Tables<'profiles'>;
  mainTPath: Tables<'t_paths'>;
  childWorkouts: (Tables<'t_paths'> & { exercises: (Tables<'exercise_definitions'> & { is_bonus_exercise: boolean })[] })[];
  identifiedExercises: Partial<FetchedExerciseDefinition>[];
  confirmedExerciseNames: Set<string>;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { session, supabase, memoizedSessionUserId } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(175);
  const [weightKg, setWeightKg] = useState<number | null>(70);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(15);

  // Step 2 State
  const [tPathType, setTPathType] = useState<"ulul" | "ppl" | null>(null);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | null>(null);

  // Step 3 State
  const [goalFocus, setGoalFocus] = useState<string>("");
  const [preferredMuscles, setPreferredMuscles] = useState<string>("");
  const [constraints, setConstraints] = useState<string>("");
  const [sessionLength, setSessionLength] = useState<string>("");

  // Step 4 State
  const [gymName, setGymName] = useState<string>("");
  const [equipmentMethod, setEquipmentMethod] = useState<"photo" | "skip" | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);

  // Step 5 State
  const [identifiedExercises, setIdentifiedExercises] = useState<Partial<FetchedExerciseDefinition>[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());

  // Summary Modal State
  const [summaryData, setSummaryData] = useState<OnboardingSummaryData | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const tPathDescriptions = {
    ulul: { title: "4-Day Upper/Lower (ULUL)", pros: ["Higher frequency per muscle group (2x/week)", "Good for hypertrophy", "Flexible scheduling"], cons: ["Sessions can be longer", "Potential for upper body fatigue", "Less focus on single 'big lift' days"], research: ["Studies show that training muscle groups twice a week can lead to greater muscle growth than once a week.", "Allows for more recovery time for individual muscle groups compared to full-body splits.", "Provides a balanced approach to training, hitting all major muscle groups effectively."] },
    ppl: { title: "3-Day Push/Pull/Legs (PPL)", pros: ["Logical split by movement pattern", "Allows for high volume per session", "Feels intuitive"], cons: ["Lower frequency per muscle group (once every 5-7 days)", "Missing a day can unbalance the week", "Can be demanding for beginners"], research: ["PPL is effective for building strength and muscle mass by allowing high volume for specific movement patterns.", "Grouping exercises by push, pull, and legs can optimize recovery and performance for each session.", "This split is popular among intermediate to advanced lifters for its structured approach to progressive overload."] }
  };

  const addIdentifiedExercise = useCallback((exercise: Partial<FetchedExerciseDefinition>) => {
    setIdentifiedExercises(prev => {
      if (prev.some(e => e.name === exercise.name)) return prev;
      setConfirmedExercises(prevConfirmed => new Set(prevConfirmed).add(exercise.name!));
      return [...prev, exercise];
    });
  }, []);

  const removeIdentifiedExercise = useCallback((exerciseName: string) => {
    setIdentifiedExercises(prev => prev.filter(e => e.name !== exerciseName));
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      newSet.delete(exerciseName);
      return newSet;
    });
  }, []);

  const toggleConfirmedExercise = useCallback((exerciseName: string) => {
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      if (newSet.has(exerciseName)) newSet.delete(exerciseName);
      else newSet.add(exerciseName);
      return newSet;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!memoizedSessionUserId) {
      toast.error("You must be logged in to complete onboarding.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        tPathType, experience, goalFocus, preferredMuscles, constraints,
        sessionLength, equipmentMethod, gymName,
        confirmedExercises: identifiedExercises.filter(ex => confirmedExercises.has(ex.name!)),
        fullName, heightCm, weightKg, bodyFatPct,
      };

      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Onboarding process failed.');

      setSummaryData({ ...data, confirmedExerciseNames: confirmedExercises });
      setIsSummaryModalOpen(true);

    } catch (error: any) {
      console.error("Onboarding failed:", error.message);
      toast.error("Onboarding failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [
    memoizedSessionUserId, session, router, tPathType, experience, goalFocus, preferredMuscles,
    constraints, sessionLength, equipmentMethod, gymName, identifiedExercises, confirmedExercises,
    fullName, heightCm, weightKg, bodyFatPct
  ]);

  const handleNext = useCallback(() => {
    if (currentStep === 4 && equipmentMethod === 'skip') {
      handleSubmit();
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, equipmentMethod, handleSubmit]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
    router.push('/dashboard');
  };

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
            handleNext={handleSubmit}
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
          isOpen={loading}
          title="Completing Setup..."
          description="Finalizing your profile details."
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