"use client";

import { useState, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  const inputDetected = (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
  if (inputDetected) {
    console.log(`[hasUserInput] Set for exercise ${set.exercise_id} has input. Weight: ${set.weight_kg}, Reps: ${set.reps}, Time: ${set.time_seconds}`);
  }
  return inputDetected;
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
  expandedExerciseCards: Record<string, boolean>;
  setActiveWorkout: Dispatch<SetStateAction<TPath | null>>;
  setExercisesForSession: Dispatch<SetStateAction<WorkoutExercise[]>>;
  setExercisesWithSets: Dispatch<SetStateAction<Record<string, SetLogState[]>>>;
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>;
  setSessionStartTime: Dispatch<SetStateAction<Date | null>>;
  setCompletedExercises: Dispatch<SetStateAction<Set<string>>>;
  setIsCreatingSession: Dispatch<SetStateAction<boolean>>;
  setExpandedExerciseCards: Dispatch<SetStateAction<Record<string, boolean>>>;
  _resetLocalState: () => void;
}

export const useCoreWorkoutSessionState = (): UseCoreWorkoutSessionStateReturn => {
  const [activeWorkout, _setActiveWorkout] = useState<TPath | null>(null); // Renamed internal setter
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [expandedExerciseCards, setExpandedExerciseCards] = useState<Record<string, boolean>>({});

  // Derived state for workout activity
  const isWorkoutActive = !!activeWorkout;

  // Derived state for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!isWorkoutActive) {
      console.log("[useCoreWorkoutSessionState] hasUnsavedChanges: Workout not active, returning false.");
      return false;
    }
    const hasChanges = Object.values(exercisesWithSets).some(setsArray => 
      setsArray.some(set => hasUserInput(set))
    );
    console.log(`[useCoreWorkoutSessionState] hasUnsavedChanges: Final result: ${hasChanges}`);
    return hasChanges;
  }, [isWorkoutActive, exercisesWithSets]);

  // Custom setter for activeWorkout to include logging
  const setActiveWorkout: Dispatch<SetStateAction<TPath | null>> = useCallback((value: SetStateAction<TPath | null>) => {
    _setActiveWorkout(value);
    // If value is a function, we can't log the new ID directly here without calling it.
    // For logging purposes, we'd typically use another useEffect that watches `activeWorkout`.
    // console.log(`[useCoreWorkoutSessionState] setActiveWorkout called. New activeWorkout ID: ${typeof value === 'function' ? 'function' : value?.id}`);
  }, []);

  // Internal function to clear only the local React state
  const _resetLocalState = useCallback(() => {
    _setActiveWorkout(null);
    setExercisesForSession([]);
    setExercisesWithSets({});
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setCompletedExercises(new Set());
    setIsCreatingSession(false);
    setExpandedExerciseCards({});
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
    expandedExerciseCards,
    setActiveWorkout,
    setExercisesForSession,
    setExercisesWithSets,
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    setIsCreatingSession,
    setExpandedExerciseCards,
    _resetLocalState,
  };
};