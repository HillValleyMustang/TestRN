"use client";

import { useState, useCallback, useMemo, Dispatch, SetStateAction } from 'react'; // Import Dispatch, SetStateAction
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
};

interface UseCoreWorkoutSessionStateReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  isWorkoutActive: boolean;
  hasUnsavedChanges: boolean;
  setActiveWorkout: Dispatch<SetStateAction<TPath | null>>; // Updated type
  setExercisesForSession: Dispatch<SetStateAction<WorkoutExercise[]>>; // Updated type
  setExercisesWithSets: Dispatch<SetStateAction<Record<string, SetLogState[]>>>; // Updated type
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>; // Updated type
  setSessionStartTime: Dispatch<SetStateAction<Date | null>>; // Updated type
  setCompletedExercises: Dispatch<SetStateAction<Set<string>>>; // Updated type
  setIsCreatingSession: Dispatch<SetStateAction<boolean>>; // Updated type
  _resetLocalState: () => void; // Internal reset for local state only
}

export const useCoreWorkoutSessionState = (): UseCoreWorkoutSessionStateReturn => {
  const [activeWorkout, setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Derived state for workout activity
  const isWorkoutActive = !!activeWorkout;

  // Derived state for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return isWorkoutActive && Object.values(exercisesWithSets).some(setsArray =>
      setsArray.some(set => !set.isSaved && hasUserInput(set))
    );
  }, [isWorkoutActive, exercisesWithSets]);

  // Internal function to clear only the local React state
  const _resetLocalState = useCallback(() => {
    setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setIsCreatingSession(false);
  }, []);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    isWorkoutActive,
    hasUnsavedChanges,
    setActiveWorkout,
    setExercisesForSession,
    setExercisesWithSets,
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    setIsCreatingSession,
    _resetLocalState,
  };
};