"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { db, addToSyncQueue, LocalWorkoutSession, LocalDraftSetLog } from '@/lib/db';
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
  allAvailableExercises: ExerciseDefinition[];
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
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
  const [pendingWorkoutSelectionId, setPendingWorkoutSelectionId] = useState<string | null>(null);
  const resolveNavigationPromise = useRef<((confirm: boolean) => void) | null>(null);

  const {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  } = useWorkoutDataFetcher();

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
    setExercisesWithSets,
    setCurrentSessionId,
    setSessionStartTime,
    setCompletedExercises,
    resetWorkoutSession,
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
    createWorkoutSessionInDb,
    finishWorkoutSession,
  } = useWorkoutSessionState({ allAvailableExercises, workoutExercisesCache }); // MODIFIED: Pass workoutExercisesCache

  useEffect(() => {
    setLoadingFlow(loadingData);
    setFlowError(dataError);
  }, [loadingData, dataError]);

  // Internal helper for selecting a workout without triggering the prompt
  // MOVED: Definition moved before its usage in handleConfirmLeave
  const _selectWorkoutInternal = useCallback(async (workoutId: string | null) => {
    if (!session) {
      toast.error("You must be logged in to select a workout.");
      return;
    }

    // The reset is now handled by `resetWorkoutSession` in `handleConfirmLeave`
    // or implicitly by `useWorkoutSessionState`'s useEffect when `activeWorkout` changes.

    if (!workoutId) {
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      return;
    }

    let currentWorkout: TPath | null = null;

    if (workoutId === 'ad-hoc') {
      currentWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: session.user.id, created_at: new Date().toISOString(), version: 1, settings: null, progression_settings: null, parent_t_path_id: null };
    } else {
      const foundGroup = groupedTPaths.find(group => group.childWorkouts.some(cw => cw.id === workoutId));
      currentWorkout = foundGroup?.childWorkouts.find(cw => cw.id === workoutId) || null;

      if (!currentWorkout) {
        toast.error("Selected workout not found in your active Transformation Path.");
        return;
      }
    }

    // Set activeWorkout. The `useWorkoutSessionState` useEffect will react to this.
    setActiveWorkout(currentWorkout); 

    refreshAllData(); // Refresh data to ensure latest state is loaded
  }, [session, groupedTPaths, refreshAllData, setActiveWorkout]);

  // --- Navigation Warning Logic ---
  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    if (isWorkoutActive && hasUnsavedChanges) {
      setPendingNavigationPath(path);
      setPendingWorkoutSelectionId(null); // Clear any pending internal selection
      setShowUnsavedChangesDialog(true);
      return new Promise((resolve) => {
        resolveNavigationPromise.current = resolve;
      });
    }
    return Promise.resolve(false); // No active workout or no unsaved changes, allow navigation
  }, [isWorkoutActive, hasUnsavedChanges]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    await resetWorkoutSession(); // Discard current workout progress

    if (pendingNavigationPath) {
      router.push(pendingNavigationPath);
      setPendingNavigationPath(null);
    } else if (pendingWorkoutSelectionId) {
      // If it was an internal workout selection, proceed with it
      // We need to call selectWorkout again, but without the prompt
      // To avoid infinite loop, we'll make a helper function or pass a flag
      await _selectWorkoutInternal(pendingWorkoutSelectionId);
      setPendingWorkoutSelectionId(null);
    }
    
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(true); // Confirm navigation
      resolveNavigationPromise.current = null;
    }
  }, [pendingNavigationPath, pendingWorkoutSelectionId, router, resetWorkoutSession, _selectWorkoutInternal]); // MODIFIED: Added _selectWorkoutInternal to dependencies

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    setPendingNavigationPath(null);
    setPendingWorkoutSelectionId(null); // Clear pending internal selection
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false); // Cancel navigation
      resolveNavigationPromise.current = null;
    }
  }, []);
  // --- End Navigation Logic ---

  // The public `selectWorkout` function that handles the prompt
  const selectWorkout = useCallback(async (workoutId: string | null) => {
    // If the user is trying to select the *same* workout, do nothing
    if (workoutId === activeWorkout?.id) {
      return;
    }

    if (isWorkoutActive && hasUnsavedChanges) {
      setPendingWorkoutSelectionId(workoutId); // Store the ID of the workout they want to switch to
      setPendingNavigationPath(null); // Clear any pending page navigation
      setShowUnsavedChangesDialog(true);
      // The actual selection will happen in handleConfirmLeave if user confirms
    } else {
      // No active workout or no unsaved changes, proceed directly
      await _selectWorkoutInternal(workoutId);
    }
  }, [isWorkoutActive, hasUnsavedChanges, activeWorkout, _selectWorkoutInternal]);


  useEffect(() => {
    if (initialWorkoutId && !loadingData && !loadingFlow) {
      selectWorkout(initialWorkoutId);
    }
  }, [initialWorkoutId, loadingData, loadingFlow, selectWorkout]);

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
    createWorkoutSessionInDb,
    finishWorkoutSession,
    refreshAllData,
    // New properties for navigation warning
    showUnsavedChangesDialog,
    pendingNavigationPath,
    promptBeforeNavigation,
    handleConfirmLeave,
    handleCancelLeave,
  };
};