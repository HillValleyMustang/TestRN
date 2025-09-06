"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { db, addToSyncQueue, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutDataFetcher } from './use-workout-data-fetcher';
import { useWorkoutSessionState } from './use-workout-session-state';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
  router: ReturnType<typeof useRouter>;
}

interface UseWorkoutFlowManagerReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  isCreatingSession: boolean;
  isWorkoutActive: boolean;
  hasUnsavedChanges: boolean;
  selectWorkout: (workoutId: string | null) => Promise<void>;
  addExerciseToSession: (exercise: ExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  resetWorkoutSession: () => Promise<void>;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  groupedTPaths: { mainTPath: TPath; childWorkouts: (TPath & { last_completed_at: string | null; })[]; }[];
  isCreatingSession: boolean;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<string | null>;
  refreshAllData: () => void;
  // New properties for navigation warning
  showUnsavedChangesDialog: boolean;
  pendingNavigationPath: string | null;
  promptBeforeNavigation: (path: string) => Promise<boolean>;
  handleConfirmLeave: () => void;
  handleCancelLeave: () => void;
}

const DEFAULT_INITIAL_SETS = 3;

export const useWorkoutFlowManager = ({ initialWorkoutId, router }: UseWorkoutFlowManagerProps): UseWorkoutFlowManagerReturn => {
  const { session, supabase } = useSession();

  const [loadingFlow, setLoadingFlow] = useState(true);
  const [flowError, setFlowError] = useState<string | null>(null);

  // State for navigation warning dialog
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const resolveNavigationPromise = useRef<((confirm: boolean) => void) | null>(null); // Initialize with null

  const {
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
    setExercisesWithSets, // Corrected setter name
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    setIsCreatingSession, // Corrected setter name
    _resetLocalState,
  } = useWorkoutSessionState({ allAvailableExercises: [], workoutExercisesCache: {} }); // Placeholder values, will be updated

  const {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  } = useWorkoutDataFetcher();

  // Update core state dependencies
  useEffect(() => {
    setExercisesForSession(exercisesForSession);
    setExercisesWithSets(exercisesWithSets); // Use the correct setter
    setCurrentSessionId(currentSessionId);
    setSessionStartTime(sessionStartTime);
    setCompletedExercises(completedExercises);
    setIsCreatingSession(isCreatingSession);
  }, [
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    setExercisesForSession,
    setExercisesWithSets, // Use the correct setter
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    setIsCreatingSession, // Corrected setter name
  ]);

  // --- Navigation Warning Logic ---
  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    if (isWorkoutActive && hasUnsavedChanges) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise((resolve) => {
        resolveNavigationPromise.current = resolve;
      });
    }
    return Promise.resolve(false); // No active workout or no unsaved changes, allow navigation
  }, [isWorkoutActive, hasUnsavedChanges]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationPath) {
      await resetWorkoutSession(); // Discard current workout progress
      router.push(pendingNavigationPath);
      setPendingNavigationPath(null);
    }
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(true); // Confirm navigation
      resolveNavigationPromise.current = null; // Clear the ref
    }
  }, [pendingNavigationPath, router, resetWorkoutSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    setPendingNavigationPath(null);
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false); // Cancel navigation
      resolveNavigationPromise.current = null; // Clear the ref
    }
  }, []);
  // --- End Navigation Warning Logic ---

  // Effect to initialize workout if initialWorkoutId is provided
  useEffect(() => {
    if (initialWorkoutId && !loadingData && !loadingFlow && !hasInitializedInitialWorkout.current) {
      selectWorkout(initialWorkoutId);
      hasInitializedInitialWorkout.current = true;
    }
  }, [initialWorkoutId, loadingData, loadingFlow, selectWorkout]);

  // Re-fetch data when the component mounts or dependencies change
  useEffect(() => {
    if (!loadingData && !dataError) {
      refreshAllData();
    }
  }, [loadingData, dataError, refreshAllData]);

  // Update loading and error states based on data fetching
  useEffect(() => {
    setLoadingFlow(loadingData);
    setFlowError(dataError);
  }, [loadingData, dataError]);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading: loadingFlow,
    error: flowError,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
    isWorkoutActive,
    hasUnsavedChanges,
    selectWorkout,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime: useCallback((timestamp: string) => {
      if (currentSessionId && !sessionStartTime) {
        setSessionStartTime(new Date(timestamp));
      }
    }, [currentSessionId, sessionStartTime, setSessionStartTime]),
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
    groupedTPaths,
    isCreatingSession,
    createWorkoutSessionInDb,
    finishWorkoutSession,
    refreshAllData,
    // Navigation warning properties
    showUnsavedChangesDialog,
    pendingNavigationPath,
    promptBeforeNavigation,
    handleConfirmLeave,
    handleCancelLeave,
  };
};