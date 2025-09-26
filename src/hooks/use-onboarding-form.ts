"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { Tables, TablesInsert, ProfileInsert, FetchedExerciseDefinition } from "@/types/supabase";
import { v4 as uuidv4 } from 'uuid';

// New type for the summary data structure
type OnboardingSummaryData = {
  profile: Tables<'profiles'>;
  mainTPath: Tables<'t_paths'>;
  childWorkouts: (Tables<'t_paths'> & { exercises: (Tables<'exercise_definitions'> & { is_bonus_exercise: boolean })[] })[];
  identifiedExercises: Partial<FetchedExerciseDefinition>[];
  confirmedExerciseNames: Set<string>;
};

export const useOnboardingForm = () => {
  const router = useRouter();
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId

  const [currentStep, setCurrentStep] = useState(1);
  const [tPathType, setTPathType] = useState<"ulul" | "ppl" | null>(null);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | null>(null);
  const [goalFocus, setGoalFocus] = useState<string>("");
  const [preferredMuscles, setPreferredMuscles] = useState<string>("");
  const [constraints, setConstraints] = useState<string>("");
  const [sessionLength, setSessionLength] = useState<string>("");
  const [equipmentMethod, setEquipmentMethod] = useState<"photo" | "skip" | null>(null);
  const [identifiedExercises, setIdentifiedExercises] = useState<Partial<FetchedExerciseDefinition>[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialSetupLoading, setIsInitialSetupLoading] = useState(false);
  const [gymName, setGymName] = useState<string>("");

  // New state for the summary modal
  const [summaryData, setSummaryData] = useState<OnboardingSummaryData | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  const tPathDescriptions = {
    ulul: {
      title: "4-Day Upper/Lower (ULUL)",
      pros: [
        "Higher frequency per muscle group (2x/week)",
        "Good for hypertrophy",
        "Flexible scheduling"
      ],
      cons: [
        "Sessions can be longer",
        "Potential for upper body fatigue",
        "Less focus on single 'big lift' days"
      ],
      research: [
        "Studies show that training muscle groups twice a week can lead to greater muscle growth than once a week.",
        "Allows for more recovery time for individual muscle groups compared to full-body splits.",
        "Provides a balanced approach to training, hitting all major muscle groups effectively."
      ]
    },
    ppl: {
      title: "3-Day Push/Pull/Legs (PPL)",
      pros: [
        "Logical split by movement pattern",
        "Allows for high volume per session",
        "Feels intuitive"
      ],
      cons: [
        "Lower frequency per muscle group (once every 5-7 days)",
        "Missing a day can unbalance the week",
        "Can be demanding for beginners"
      ],
      research: [
        "PPL is effective for building strength and muscle mass by allowing high volume for specific movement patterns.",
        "Grouping exercises by push, pull, and legs can optimize recovery and performance for each session.",
        "This split is popular among intermediate to advanced lifters for its structured approach to progressive overload."
      ]
    }
  };

  const addIdentifiedExercise = useCallback((exercise: Partial<FetchedExerciseDefinition>) => {
    setIdentifiedExercises(prev => {
      if (prev.some(e => e.name === exercise.name)) {
        return prev;
      }
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
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 4 && equipmentMethod === 'skip') {
      setCurrentStep(6);
      return;
    }
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, equipmentMethod]);

  const handleBack = useCallback(() => {
    if (currentStep === 6 && equipmentMethod === 'skip') {
      setCurrentStep(4);
      return;
    }
    setCurrentStep(prev => prev - 1);
  }, [currentStep, equipmentMethod]);

  const handleSubmit = useCallback(async (fullName: string, heightCm: number, weightKg: number, bodyFatPct: number | null) => {
    if (!memoizedSessionUserId) { // Use memoized ID
      toast.error("You must be logged in to complete onboarding."); // Added toast.error
      return;
    }
    setLoading(true);

    try {
      const payload = {
        tPathType,
        experience,
        goalFocus,
        preferredMuscles,
        constraints,
        sessionLength,
        equipmentMethod,
        gymName,
        confirmedExercises: identifiedExercises.filter(ex => confirmedExercises.has(ex.name!)),
        fullName,
        heightCm,
        weightKg,
        bodyFatPct,
      };

      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`, // Use session?.access_token
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Onboarding process failed.');
      }

      // Instead of redirecting, set the summary data and open the modal
      setSummaryData({ ...data, confirmedExerciseNames: confirmedExercises });
      setIsSummaryModalOpen(true);

    } catch (error: any) {
      console.error("Onboarding failed:", error.message);
      toast.error("Onboarding failed: " + error.message); // Changed to toast.error
    } finally {
      setLoading(false);
    }
  }, [
    memoizedSessionUserId, session, router, tPathType, experience, goalFocus, preferredMuscles, // Depend on memoized ID
    constraints, sessionLength, equipmentMethod, gymName, identifiedExercises, confirmedExercises
  ]);

  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
    router.push('/dashboard');
  };

  return {
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
    handleSubmit,
    identifiedExercises,
    addIdentifiedExercise,
    removeIdentifiedExercise,
    confirmedExercises,
    toggleConfirmedExercise,
    gymName,
    setGymName,
    summaryData,
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    handleCloseSummaryModal,
  };
};