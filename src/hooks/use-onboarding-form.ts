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
  const { session, supabase, memoizedSessionUserId } = useSession();

  // State for each step
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1 State (Goal Focus)
  const [goalFocus, setGoalFocus] = useState<string>("");

  // Step 2 State (Training Plan)
  const [tPathType, setTPathType] = useState<"ulul" | "ppl" | null>(null);
  const [sessionLength, setSessionLength] = useState<string>("");

  // Step 3 State (Profile & AI)
  const [fullName, setFullName] = useState('');
  const [heightCm, setHeightCm] = useState<number | null>(175);
  const [weightKg, setWeightKg] = useState<number | null>(75);
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(15);
  const [preferredMuscles, setPreferredMuscles] = useState<string>("");
  const [constraints, setConstraints] = useState<string>("");
  const [consentGiven, setConsentGiven] = useState(false);

  // Step 4 & 5 State (Gym Setup)
  const [equipmentMethod, setEquipmentMethod] = useState<"photo" | "skip" | null>(null);
  const [gymName, setGymName] = useState<string>("");
  const [identifiedExercises, setIdentifiedExercises] = useState<Partial<FetchedExerciseDefinition>[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());

  // Final Step State
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = useCallback(async () => {
    if (!memoizedSessionUserId) {
      toast.error("You must be logged in to complete onboarding.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        tPathType,
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
        experience: 'intermediate', // Defaulting experience for now
      };

      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Onboarding process failed.');
      }

      setSummaryData({ ...data, confirmedExerciseNames: confirmedExercises });
      setIsSummaryModalOpen(true);

    } catch (error: any) {
      console.error("Onboarding failed:", error.message);
      toast.error("Onboarding failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [
    memoizedSessionUserId, session, router, tPathType, goalFocus, preferredMuscles,
    constraints, sessionLength, equipmentMethod, gymName, identifiedExercises, confirmedExercises,
    fullName, heightCm, weightKg, bodyFatPct
  ]);

  const handleNext = useCallback(() => {
    if (currentStep === 7) {
      handleSubmit();
      return;
    }
    // Skip photo upload if user chooses to use defaults
    if (currentStep === 4 && equipmentMethod === 'skip') {
      setCurrentStep(6); // Skip to the features step
      return;
    }
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, equipmentMethod, handleSubmit]);

  const handleBack = useCallback(() => {
    // Handle skipping back over photo upload
    if (currentStep === 6 && equipmentMethod === 'skip') {
      setCurrentStep(4);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, equipmentMethod]);

  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
    router.push('/dashboard');
  };

  return {
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
    bodyFatPct, setBodyFatPct,
    preferredMuscles, setPreferredMuscles,
    constraints, setConstraints,
    consentGiven, setConsentGiven,
    // Step 4 & 5
    equipmentMethod, setEquipmentMethod,
    gymName, setGymName,
    identifiedExercises, addIdentifiedExercise, removeIdentifiedExercise,
    confirmedExercises, toggleConfirmedExercise,
    // Final
    loading,
    summaryData,
    isSummaryModalOpen,
    setIsSummaryModalOpen,
    // Handlers & Data
    handleNext,
    handleBack,
    handleSubmit,
    handleCloseSummaryModal,
  };
};