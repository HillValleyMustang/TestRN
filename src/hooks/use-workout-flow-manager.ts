"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { db } from '@/lib/db';
import { useWorkoutDataFetcher } from './use-workout-data-fetcher';
import { useCoreWorkoutSessionState } from './use-core-workout-session-state';
import { useWorkoutSessionPersistence } from './use-workout-session-persistence';
import { useSessionExerciseManagement } from './use-session-exercise-management';
import { useSession } from '@/components/session-context-provider';

type TPath = Tables<'t_paths'>;

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
  router: ReturnType<typeof useRouter>;
}

export const useWorkoutFlowManager = ({ initialWorkoutId, router }: UseWorkoutFlowManagerProps) => {
  const { supabase } = useSession();

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
    activeWorkout, // Pass directly
    currentSessionId, // Pass directly
    sessionStartTime, // Pass directly
    setIsCreatingSession, // Pass directly
    setCurrentSessionId, // Pass directly
    setSessionStartTime, // Pass directly
    _resetLocalState, // Pass directly
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
      expandedExerciseCards, // Include here
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, setExpandedExerciseCards, _resetLocalState,
    },
    supabase: supabase,
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
    console.log(`[selectWorkout] Attempting to select workoutId: ${workoutId}`);
    console.log(`[selectWorkout] Current activeWorkout.id: ${activeWorkout?.id}`);
    console.log(`[selectWorkout] isWorkoutActive: ${isWorkoutActive}, hasUnsavedChanges: ${hasUnsavedChanges}`);

    if (workoutId === activeWorkout?.id) {
      console.log(`[selectWorkout] Attempted to select already active workout. No change needed.`);
      // If it's the same workout, and there are unsaved changes, still show the dialog
      if (hasUnsavedChanges) {
        const shouldBlock = await new Promise<boolean>(resolve => {
          setPendingNavigationPath(workoutId);
          setShowUnsavedChangesDialog(true);
          resolveNavigationPromise.current = resolve;
        });
        if (shouldBlock) {
          console.log(`[selectWorkout] Navigation blocked by user choice (stay on same workout).`);
          return;
        }
        console.log(`[selectWorkout] User confirmed to reset and stay on same workout.`);
        await resetWorkoutSession(); // Reset if user confirms to leave unsaved changes
        // No need to call setActiveWorkout, it's already the active one.
      }
      return; // Exit if same workout and no unsaved changes, or if user chose to stay
    }

    // If we are here, it's a different workout or no active workout.
    if (isWorkoutActive && hasUnsavedChanges) {
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(workoutId);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });

      if (shouldBlock) {
        console.log(`[selectWorkout] Navigation to new workout blocked by user choice.`);
        return; // User chose to stay on the old workout
      }
      console.log(`[selectWorkout] User confirmed to leave unsaved changes and switch.`);
    }

    // If we reach here, either no active workout, no unsaved changes, or user confirmed to leave
    await resetWorkoutSession(); // Clear previous session data and drafts
    await refreshAllData(); // NEW: Refresh all data to ensure groupedTPaths is up-to-date
    console.log(`[selectWorkout] resetWorkoutSession and refreshAllData completed.`);

    if (workoutId === 'ad-hoc') {
      const adHocWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null };
      setActiveWorkout(adHocWorkout);
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null);
      setSessionStartTime(null);
      console.log(`[selectWorkout] Set activeWorkout to Ad-Hoc.`);
    } else if (workoutId) {
      // After refreshAllData, groupedTPaths should be the latest.
      const selectedWorkout = groupedTPaths
        .flatMap(group => group.childWorkouts)
        .find(workout => workout.id === workoutId);

      if (selectedWorkout) {
        setActiveWorkout(selectedWorkout);
        setExercisesForSession(workoutExercisesCache[selectedWorkout.id] || []);
        setExercisesWithSets({});
        setCurrentSessionId(null);
        setSessionStartTime(null);
        console.log(`[selectWorkout] Set activeWorkout to: ${selectedWorkout.template_name} (${selectedWorkout.id})`);
      } else {
        toast.error("Selected workout not found.");
        console.error(`[selectWorkout] Error: Selected workout ID ${workoutId} not found in groupedTPaths after refresh.`);
        // If selected workout not found, revert to no active workout
        setActiveWorkout(null); // This will deselect all pills
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCurrentSessionId(null);
        setSessionStartTime(null);
      }
    } else {
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null);
      setSessionStartTime(null);
      console.log(`[selectWorkout] Set activeWorkout to null.`);
    }
  }, [isWorkoutActive, hasUnsavedChanges, groupedTPaths, workoutExercisesCache, resetWorkoutSession, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime, setPendingNavigationPath, setShowUnsavedChangesDialog, activeWorkout?.id, refreshAllData]);

  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    // After saving changes in the edit dialog, we need to re-select the active workout
    // to refresh its exercises from the updated database/cache.
    // Also refresh all data to ensure groupedTPaths and workoutExercisesCache are fully updated.
    await refreshAllData(); // NEW: Refresh all data
    if (activeWorkout?.id) {
      await selectWorkout(activeWorkout.id); // Re-select to load updated exercises
    }
  }, [activeWorkout, selectWorkout, refreshAllData]);


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
  }, [initialWorkoutId, groupedTPaths, activeWorkout, setActiveWorkout, selectWorkout]);

  const finishWorkoutSession = useCallback(async () => {
    const finishedSessionId = await persistAndFinishWorkoutSession();
    if (finishedSessionId) {
      await resetWorkoutSession();
      router.push(`/workout-summary/${finishedSessionId}`);
    }
    return finishedSessionId;
  }, [persistAndFinishWorkoutSession, resetWorkoutSession, router]);

  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    console.log(`[useWorkoutFlowManager] Checking navigation to: ${path}`);

    const draftCount = await db.draft_set_logs.count();
    console.log(`[useWorkoutFlowManager] Draft count in IndexedDB: ${draftCount}`);

    const allowedPathsWithoutWarning = ['/workout']; 

    if (draftCount > 0 && !allowedPathsWithoutWarning.includes(path)) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise<boolean>(resolve => {
        resolveNavigationPromise.current = resolve;
      });
    }

    return Promise.resolve(false);
  }, [setPendingNavigationPath, setShowUnsavedChangesDialog]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationPath) {
      await resetWorkoutSession();
      router.push(pendingNavigationPath);
    }
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false);
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, [pendingNavigationPath, router, resetWorkoutSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(true);
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, []);

  const updateSessionStartTime = useCallback((timestamp: string) => {
    setSessionStartTime(new Date(timestamp));
  }, [setSessionStartTime]);

  const toggleExerciseCardExpansion = useCallback((exerciseId: string) => {
    setExpandedExerciseCards(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  }, [setExpandedExerciseCards]);

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
    allAvailableExercises,
    updateSessionStartTime,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
    expandedExerciseCards,
    toggleExerciseCardExpansion,
  };
};