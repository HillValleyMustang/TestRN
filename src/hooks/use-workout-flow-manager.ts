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

  // New state for controlling the EditWorkoutExercisesDialog
  const [showEditWorkoutDialog, setShowEditWorkoutDialog] = useState(false);
  const [editWorkoutDetails, setEditWorkoutDetails] = useState<{ id: string; name: string } | null>(null);

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
  }, [initialWorkoutId, groupedTPaths, activeWorkout, setActiveWorkout]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    if (isWorkoutActive && hasUnsavedChanges) {
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(workoutId);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });

      if (shouldBlock) {
        return; // User chose to stay
      }
    }

    // If we reach here, either no active workout, no unsaved changes, or user confirmed to leave
    await resetWorkoutSession(); // Clear previous session data and drafts

    if (workoutId === 'ad-hoc') {
      setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null });
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null); // Ad-hoc starts with null session ID until first set saved
      setSessionStartTime(null);
    } else if (workoutId) {
      const selectedWorkout = groupedTPaths
        .flatMap(group => group.childWorkouts)
        .find(workout => workout.id === workoutId);

      if (selectedWorkout) {
        setActiveWorkout(selectedWorkout);
        setExercisesForSession(workoutExercisesCache[selectedWorkout.id] || []);
        setExercisesWithSets({}); // Will be populated by useSetDrafts
        setCurrentSessionId(null); // T-Path workout starts with null session ID until first set saved
        setSessionStartTime(null);
      } else {
        toast.error("Selected workout not found.");
      }
    } else {
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null);
      setSessionStartTime(null);
    }
  }, [isWorkoutActive, hasUnsavedChanges, groupedTPaths, workoutExercisesCache, resetWorkoutSession, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime, setPendingNavigationPath, setShowUnsavedChangesDialog]);

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

  const openEditWorkoutDialog = useCallback(async (workoutId: string, workoutName: string) => {
    // This action is similar to "Continue and Exit" in that it leaves the current workout.
    // So, we confirm leaving (which clears drafts) and then open the dialog.
    setShowUnsavedChangesDialog(false);
    await resetWorkoutSession(); // Clear all local state and drafts

    setEditWorkoutDetails({ id: workoutId, name: workoutName });
    setShowEditWorkoutDialog(true);

    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false); // Resolve to false, meaning navigation should proceed (to the dialog)
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null); // Clear any pending path
  }, [resetWorkoutSession]);

  const closeEditWorkoutDialog = useCallback(async () => {
    setShowEditWorkoutDialog(false);
    setEditWorkoutDetails(null);
    // After closing the edit dialog, we should refresh the workout data
    // to reflect any changes made in the dialog.
    await refreshAllData();
  }, [refreshAllData]);

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
    openEditWorkoutDialog, // Expose the new handler
    closeEditWorkoutDialog, // Expose the new handler
    showEditWorkoutDialog, // Expose the new state
    editWorkoutDetails, // Expose the new state
    promptBeforeNavigation,
    allAvailableExercises, // Expose allAvailableExercises
    updateSessionStartTime, // Expose the new function
  };
};