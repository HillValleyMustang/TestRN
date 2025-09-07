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
    coreState: {
      activeWorkout, exercisesForSession, exercisesWithSets, currentSessionId, sessionStartTime,
      completedExercises, isCreatingSession, isWorkoutActive, hasUnsavedChanges,
      expandedExerciseCards, // Include here
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, setExpandedExerciseCards, _resetLocalState,
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