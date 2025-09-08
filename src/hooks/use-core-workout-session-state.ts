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
  const [activeWorkout, _setActiveWorkout] = useState<TPath | null>(null);
  const [exercisesForSession, setExercisesForSession] = useState<WorkoutExercise[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [expandedExerciseCards, setExpandedExerciseCards] = useState<Record<string, boolean>>({});

  const isWorkoutActive = !!activeWorkout && !!currentSessionId; // Only active if a workout is selected AND a session has started

  const hasUnsavedChanges = useMemo(() => {
    if (!isWorkoutActive) {
      return false;
    }
    const hasChanges = Object.values(exercisesWithSets).some(setsArray => 
      setsArray.some(set => hasUserInput(set))
    );
    return hasChanges;
  }, [isWorkoutActive, exercisesWithSets]);

  const setActiveWorkout: Dispatch<SetStateAction<TPath | null>> = useCallback((value: SetStateAction<TPath | null>) => {
    _setActiveWorkout(value);
  }, []);

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