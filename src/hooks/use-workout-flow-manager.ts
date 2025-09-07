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
    hasUnsavedChanges, // <-- Now directly using this derived state
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

  // New state to manage pending workout selection after data refresh
  const [pendingWorkoutIdToSelect, setPendingWorkoutIdToSelect] = useState<string | null>(null);

  // New states and handlers for EditWorkoutExercisesDialog
  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const handleOpenEditWorkoutDialog = useCallback((workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  }, []);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    console.log(`[useWorkoutFlowManager - selectWorkout] Called with workoutId: ${workoutId}, current activeWorkout.id: ${activeWorkout?.id}`);

    if (workoutId === activeWorkout?.id) {
      if (hasUnsavedChanges) {
        const shouldBlock = await new Promise<boolean>(resolve => {
          setPendingNavigationPath(workoutId);
          setShowUnsavedChangesDialog(true);
          resolveNavigationPromise.current = resolve;
        });
        if (shouldBlock) {
          return;
        }
        await resetWorkoutSession();
      }
      console.log(`[useWorkoutFlowManager - selectWorkout] Clicked on already active workout. Returning.`);
      return;
    }

    if (isWorkoutActive && hasUnsavedChanges) {
      console.log(`[useWorkoutFlowManager - selectWorkout] Active workout with unsaved changes. Prompting user.`);
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(workoutId);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });

      if (shouldBlock) {
        console.log(`[useWorkoutFlowManager - selectWorkout] User chose to stay. Blocking navigation.`);
        return;
      }
      console.log(`[useWorkoutFlowManager - selectWorkout] User chose to leave. Resetting session.`);
    }

    // Reset previous session and trigger data refresh
    await resetWorkoutSession();
    setPendingWorkoutIdToSelect(workoutId); // Set pending ID
    console.log(`[useWorkoutFlowManager - selectWorkout] Resetting session and refreshing data. Pending workout ID: ${workoutId}`);
    await refreshAllData(); // Trigger data re-fetch
  }, [isWorkoutActive, hasUnsavedChanges, activeWorkout?.id, resetWorkoutSession, setPendingNavigationPath, setShowUnsavedChangesDialog, refreshAllData]);

  // Effect to handle actual workout selection once data is refreshed
  useEffect(() => {
    if (loadingData || !pendingWorkoutIdToSelect) {
      console.log(`[useWorkoutFlowManager - performSelection] Skipping: loadingData=${loadingData}, pendingWorkoutIdToSelect=${pendingWorkoutIdToSelect}`);
      return;
    }

    // NEW: Ensure data is actually available before proceeding
    if (groupedTPaths.length === 0 && pendingWorkoutIdToSelect !== 'ad-hoc') {
      console.log(`[useWorkoutFlowManager - performSelection] groupedTPaths is empty, waiting for data.`);
      return;
    }
    if (Object.keys(workoutExercisesCache).length === 0 && pendingWorkoutIdToSelect !== 'ad-hoc') {
      console.log(`[useWorkoutFlowManager - performSelection] workoutExercisesCache is empty, waiting for data.`);
      return;
    }

    const performSelection = async () => {
      console.log(`[useWorkoutFlowManager - performSelection] START`);
      console.log(`[useWorkoutFlowManager - performSelection] pendingWorkoutIdToSelect: ${pendingWorkoutIdToSelect}`);
      console.log(`[useWorkoutFlowManager - performSelection] Current groupedTPaths (full):`, JSON.stringify(groupedTPaths, null, 2));
      console.log(`[useWorkoutFlowManager - performSelection] Current workoutExercisesCache (full):`, JSON.stringify(workoutExercisesCache, null, 2));

      if (pendingWorkoutIdToSelect === 'ad-hoc') {
        const adHocWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null };
        setActiveWorkout(adHocWorkout);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCurrentSessionId(null);
        setSessionStartTime(null);
        console.log(`[useWorkoutFlowManager - performSelection] Selected Ad-Hoc workout.`);
      } else if (pendingWorkoutIdToSelect) {
        const selectedWorkout = groupedTPaths
          .flatMap(group => group.childWorkouts)
          .find(workout => workout.id === pendingWorkoutIdToSelect);

        console.log(`[useWorkoutFlowManager - performSelection] Result of find for workout ID ${pendingWorkoutIdToSelect}:`, selectedWorkout);

        if (selectedWorkout) {
          setActiveWorkout(selectedWorkout);
          setExercisesForSession(workoutExercisesCache[selectedWorkout.id] || []);
          setExercisesWithSets({});
          setCurrentSessionId(null);
          setSessionStartTime(null);
          console.log(`[useWorkoutFlowManager - performSelection] Successfully selected workout: ${selectedWorkout.template_name}`);
        } else {
          console.warn(`[useWorkoutFlowManager - performSelection] Selected workout ID ${pendingWorkoutIdToSelect} not found in groupedTPaths. Starting Ad-Hoc workout.`);
          toast.error("Selected workout not found. Starting Ad-Hoc workout.");
          setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: null, version: null, settings: null, progression_settings: null, parent_t_path_id: null });
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
        console.log(`[useWorkoutFlowManager - performSelection] No pending workout ID, resetting active workout.`);
      }
      setPendingWorkoutIdToSelect(null); // Clear pending ID after selection
      console.log(`[useWorkoutFlowManager - performSelection] END`);
    };

    performSelection();
  }, [loadingData, pendingWorkoutIdToSelect, groupedTPaths, workoutExercisesCache, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime]);


  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    await refreshAllData();
    if (activeWorkout?.id) {
      setPendingWorkoutIdToSelect(activeWorkout.id); // Re-select the active workout after save
    }
  }, [activeWorkout, refreshAllData]);


  useEffect(() => {
    if (initialWorkoutId && groupedTPaths.length > 0 && !activeWorkout && !pendingWorkoutIdToSelect) {
      setPendingWorkoutIdToSelect(initialWorkoutId); // Trigger initial selection from URL
    }
  }, [initialWorkoutId, groupedTPaths, activeWorkout, pendingWorkoutIdToSelect]);

  const finishWorkoutSession = useCallback(async () => {
    const finishedSessionId = await persistAndFinishWorkoutSession();
    if (finishedSessionId) {
      await resetWorkoutSession();
      router.push(`/workout-summary/${finishedSessionId}`);
    }
    return finishedSessionId;
  }, [persistAndFinishWorkoutSession, resetWorkoutSession, router]);

  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    const allowedPathsWithoutWarning = ['/workout']; 
    console.log(`[promptBeforeNavigation] Attempting to navigate to: ${path}`);
    console.log(`[promptBeforeNavigation] isWorkoutActive: ${isWorkoutActive}, hasUnsavedChanges: ${hasUnsavedChanges}`);

    if (hasUnsavedChanges && !allowedPathsWithoutWarning.includes(path)) {
      console.log(`[promptBeforeNavigation] Unsaved changes detected, showing dialog.`);
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise<boolean>(resolve => {
        resolveNavigationPromise.current = resolve;
      });
    }

    console.log(`[promptBeforeNavigation] No unsaved changes or allowed path. Proceeding.`);
    return Promise.resolve(false);
  }, [hasUnsavedChanges, isWorkoutActive, setPendingNavigationPath, setShowUnsavedChangesDialog]); // Added isWorkoutActive to dependencies

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