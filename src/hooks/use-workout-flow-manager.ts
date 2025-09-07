"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { db } from '@/lib/db'; // Import db
import { useWorkoutDataFetcher } from './use-workout-data-fetcher';
import { useCoreWorkoutSessionState } from './use-core-workout-session-state';
import { useWorkoutSessionPersistence } from './use-workout-session-persistence';
import { useSessionExerciseManagement } from './use-session-exercise-management';
import { useSession } from '@/components/session-context-provider'; // Import useSession

type TPath = Tables<'t_paths'>;

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
  router: ReturnType<typeof useRouter>;
}

export const useWorkoutFlowManager = ({ initialWorkoutId, router }: UseWorkoutFlowManagerProps) => {
  const { supabase } = useSession(); // Get supabase client from useSession

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
    setIsCreatingSession,
    _resetLocalState,
  } = useCoreWorkoutSessionState();

  const {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  } = useWorkoutDataFetcher();

  const {
    resetWorkoutSession,
    createWorkoutSessionInDb,
    finishWorkoutSession: persistAndFinishWorkoutSession,
  } = useWorkoutSessionPersistence({
    allAvailableExercises,
    workoutExercisesCache,
    coreState: {
      activeWorkout, exercisesForSession, exercisesWithSets, currentSessionId, sessionStartTime,
      completedExercises, isCreatingSession, isWorkoutActive, hasUnsavedChanges,
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, _resetLocalState,
    },
  });

  const {
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
  } = useSessionExerciseManagement({
    allAvailableExercises,
    coreState: {
      activeWorkout, exercisesForSession, exercisesWithSets, currentSessionId, sessionStartTime,
      completedExercises, isCreatingSession, isWorkoutActive, hasUnsavedChanges,
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, _resetLocalState,
    },
    supabase: supabase, // Pass the supabase client from useSession
  });

  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const resolveNavigationPromise = useRef<((value: boolean) => void) | null>(null);

  // New states and handlers for EditWorkoutExercisesDialog
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const handleOpenEditWorkoutDialog = useCallback((workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  }, []);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    console.log(`[selectWorkout] Attempting to select workout: ${workoutId}`);
    console.log(`[selectWorkout] Current activeWorkout (before reset check):`, activeWorkout);
    console.log(`[selectWorkout] isWorkoutActive: ${isWorkoutActive}, hasUnsavedChanges: ${hasUnsavedChanges}`);

    if (isWorkoutActive && hasUnsavedChanges) {
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(workoutId);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });

      if (shouldBlock) {
        console.log(`[selectWorkout] User chose to stay, blocking navigation.`);
        return; // User chose to stay
      }
      console.log(`[selectWorkout] User confirmed to leave, proceeding with reset.`);
    }

    // If we reach here, either no active workout, no unsaved changes, or user confirmed to leave
    await resetWorkoutSession(); // Clear previous session data and drafts
    console.log(`[selectWorkout] resetWorkoutSession completed. activeWorkout should now be null.`);

    if (workoutId === 'ad-hoc') {
      console.log(`[selectWorkout] Setting Ad-Hoc workout.`);
      setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null });
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null); // Ad-hoc starts with null session ID until first set saved
      setSessionStartTime(null);
    } else if (workoutId) {
      console.log(`[selectWorkout] Looking for workout with ID: ${workoutId}`);
      const selectedWorkout = groupedTPaths
        .flatMap(group => group.childWorkouts)
        .find(workout => workout.id === workoutId);

      if (selectedWorkout) {
        console.log(`[selectWorkout] Found selected workout:`, selectedWorkout);
        setActiveWorkout(selectedWorkout);
        setExercisesForSession(workoutExercisesCache[selectedWorkout.id] || []);
        setExercisesWithSets({}); // Will be populated by useSetDrafts
        setCurrentSessionId(null); // T-Path workout starts with null session ID until first set saved
        setSessionStartTime(null);
      } else {
        toast.error("Selected workout not found.");
        console.error(`[selectWorkout] Selected workout ID ${workoutId} not found in groupedTPaths.`);
      }
    } else {
      console.log(`[selectWorkout] No workoutId provided, resetting to null active workout.`);
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null);
      setSessionStartTime(null);
    }
  }, [isWorkoutActive, hasUnsavedChanges, groupedTPaths, workoutExercisesCache, resetWorkoutSession, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime, setPendingNavigationPath, setShowUnsavedChangesDialog, activeWorkout]); // Added activeWorkout to dependencies for logging

  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    // After saving changes in the edit dialog, we need to re-select the active workout
    // to refresh its exercises from the updated database/cache.
    if (activeWorkout?.id) {
      await selectWorkout(activeWorkout.id);
    }
  }, [activeWorkout, selectWorkout]);


  useEffect(() => {
    if (initialWorkoutId && groupedTPaths.length > 0 && !activeWorkout) {
      const workoutToSelect = groupedTPaths
        .flatMap(group => group.childWorkouts)
        .find(workout => workout.id === initialWorkoutId);

      if (workoutToSelect) {
        setActiveWorkout(workoutToSelect);
      } else if (initialWorkoutId === 'ad-hoc') {
        setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null });
      } else {
        toast.error("Selected workout not found. Starting Ad-Hoc workout.");
        setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null });
      }
    }
  }, [initialWorkoutId, groupedTPaths, activeWorkout, setActiveWorkout, selectWorkout]); // Added selectWorkout to dependencies

  const finishWorkoutSession = useCallback(async () => {
    const finishedSessionId = await persistAndFinishWorkoutSession();
    if (finishedSessionId) {
      await resetWorkoutSession(); // Ensure all local state is cleared after successful finish
      router.push(`/workout-summary/${finishedSessionId}`);
    }
    return finishedSessionId;
  }, [persistAndFinishWorkoutSession, resetWorkoutSession, router]);

  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    console.log(`[useWorkoutFlowManager] Checking navigation to: ${path}`);

    const draftCount = await db.draft_set_logs.count();
    console.log(`[useWorkoutFlowManager] Draft count in IndexedDB: ${draftCount}`);

    // Only the /workout page itself is considered 'safe' if there are drafts.
    // Any other path should trigger the warning if drafts exist.
    const allowedPathsWithoutWarning = ['/workout']; 

    if (draftCount > 0 && !allowedPathsWithoutWarning.includes(path)) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise<boolean>(resolve => {
        resolveNavigationPromise.current = resolve;
      });
    }

    return Promise.resolve(false); // No drafts, or navigating to an allowed path, allow navigation
  }, [setPendingNavigationPath, setShowUnsavedChangesDialog]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationPath) {
      await resetWorkoutSession(); // Clear all local state and drafts
      router.push(pendingNavigationPath);
    }
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false); // Resolve to false, meaning navigation should proceed
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, [pendingNavigationPath, router, resetWorkoutSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(true); // Resolve to true, meaning navigation should be blocked
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, []);

  const updateSessionStartTime = useCallback((timestamp: string) => {
    setSessionStartTime(new Date(timestamp));
  }, [setSessionStartTime]);

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
    resetWorkoutSession,
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
    selectWorkout,
    loading: loadingData,
    groupedTPaths,
    createWorkoutSessionInDb,
    finishWorkoutSession,
    refreshAllData,
    showUnsavedChangesDialog,
    handleConfirmLeave,
    handleCancelLeave,
    promptBeforeNavigation,
    allAvailableExercises, // Expose allAvailableExercises
    updateSessionStartTime, // Expose the new function
    // New exports for EditWorkoutExercisesDialog
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen, // Expose setter to allow closing from layout
  };
};