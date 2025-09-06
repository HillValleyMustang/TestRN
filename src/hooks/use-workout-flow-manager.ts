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
  const resolveNavigationPromise = useRef<((confirm: boolean) => void) | null>(null); // Fix 1: Initialize with null and allow null in type
  const hasInitializedInitialWorkout = useRef(false); // NEW: Ref to track if initial workout has been selected

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
  } = useWorkoutSessionState({ allAvailableExercises, workoutExercisesCache }); // Pass workoutExercisesCache

  useEffect(() => {
    setLoadingFlow(loadingData);
    setFlowError(dataError);
  }, [loadingData, dataError]);

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
      resolveNavigationPromise.current = null; // Fix 2: Assign null
    }
  }, [pendingNavigationPath, router, resetWorkoutSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    setPendingNavigationPath(null);
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false); // Cancel navigation
      resolveNavigationPromise.current = null; // Fix 3: Assign null
    }
  }, []);
  // --- End Navigation Warning Logic ---

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    if (!session) {
      toast.error("You must be logged in to select a workout.");
      return;
    }

    await resetWorkoutSession(); // Always reset state and drafts when selecting a new workout

    if (!workoutId) {
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      return;
    }

    let currentWorkout: TPath | null = null;
    let exercises: WorkoutExercise[] = [];

    if (workoutId === 'ad-hoc') {
      currentWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: session.user.id, created_at: new Date().toISOString(), version: 1, settings: null, progression_settings: null, parent_t_path_id: null };
      
      // For ad-hoc, exercises are loaded from drafts or added manually
      const adHocDrafts = await db.draft_set_logs.filter(draft => draft.session_id === null).toArray();
      const adHocExerciseIds = Array.from(new Set(adHocDrafts.map(d => d.exercise_id)));
      
      if (adHocExerciseIds.length > 0 && allAvailableExercises) {
        exercises = allAvailableExercises
          .filter(ex => adHocExerciseIds.includes(ex.id))
          .map(ex => ({ ...ex, is_bonus_exercise: false }));
      }
    } else {
      const foundGroup = groupedTPaths.find(group => group.childWorkouts.some(cw => cw.id === workoutId));
      currentWorkout = foundGroup?.childWorkouts.find(cw => cw.id === workoutId) || null;

      if (!currentWorkout) {
        toast.error("Selected workout not found in your active Transformation Path.");
        return;
      }
      exercises = workoutExercisesCache[workoutId] || [];
    }

    setActiveWorkout(currentWorkout);
    setExercisesForSession(exercises);
    // setExercisesWithSets will be populated by the useEffect in useWorkoutSessionState
    // when activeWorkout and currentSessionId are set.

    refreshAllData();

  }, [session, supabase, resetWorkoutSession, groupedTPaths, workoutExercisesCache, allAvailableExercises, refreshAllData, setActiveWorkout, setExercisesForSession, setExercisesWithSets]);

  // MODIFIED: Only call selectWorkout once for initialWorkoutId
  useEffect(() => {
    if (initialWorkoutId && !loadingData && !loadingFlow && !hasInitializedInitialWorkout.current) {
      selectWorkout(initialWorkoutId);
      hasInitializedInitialWorkout.current = true; // Mark as initialized
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
    // New properties for navigation warning
    showUnsavedChangesDialog,
    pendingNavigationPath,
    promptBeforeNavigation,
    handleConfirmLeave,
    handleCancelLeave,
  };
};