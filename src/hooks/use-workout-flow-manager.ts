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
    activeWorkout,
    currentSessionId,
    sessionStartTime,
    setIsCreatingSession,
    setCurrentSessionId,
    setSessionStartTime,
    _resetLocalState,
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
      expandedExerciseCards,
      setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId,
      setSessionStartTime, setCompletedExercises, setIsCreatingSession, setExpandedExerciseCards, _resetLocalState,
    },
    supabase: supabase,
  });

  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const resolveNavigationPromise = useRef<((value: boolean) => void) | null>(null);

  const [pendingWorkoutIdToSelect, setPendingWorkoutIdToSelect] = useState<string | null>(null);

  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const handleOpenEditWorkoutDialog = useCallback((workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  }, []);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
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
      return;
    }

    if (isWorkoutActive && hasUnsavedChanges) {
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(workoutId);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });

      if (shouldBlock) {
        return;
      }
    }

    await resetWorkoutSession();
    setPendingWorkoutIdToSelect(workoutId);
    await refreshAllData();
  }, [isWorkoutActive, hasUnsavedChanges, activeWorkout?.id, resetWorkoutSession, setPendingNavigationPath, setShowUnsavedChangesDialog, refreshAllData]);

  useEffect(() => {
    if (loadingData || !pendingWorkoutIdToSelect) {
      return;
    }

    if (groupedTPaths.length === 0 && pendingWorkoutIdToSelect !== 'ad-hoc') {
      return;
    }
    if (Object.keys(workoutExercisesCache).length === 0 && pendingWorkoutIdToSelect !== 'ad-hoc') {
      return;
    }

    const performSelection = async () => {
      if (pendingWorkoutIdToSelect === 'ad-hoc') {
        const adHocWorkout: TPath = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null };
        setActiveWorkout(adHocWorkout);
        setExercisesForSession([]);
        setExercisesWithSets({});
        setCurrentSessionId(null);
        setSessionStartTime(null);
      } else if (pendingWorkoutIdToSelect) {
        const selectedWorkout = groupedTPaths
          .flatMap(group => group.childWorkouts)
          .find(workout => workout.id === pendingWorkoutIdToSelect);

        if (selectedWorkout) {
          setActiveWorkout(selectedWorkout);
          setExercisesForSession(workoutExercisesCache[selectedWorkout.id] || []);
          setExercisesWithSets({});
          setCurrentSessionId(null);
          setSessionStartTime(null);
        } else {
          toast.error("Selected workout not found. Starting Ad-Hoc workout.");
          setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null });
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
      }
      setPendingWorkoutIdToSelect(null);
    };

    performSelection();
  }, [loadingData, pendingWorkoutIdToSelect, groupedTPaths, workoutExercisesCache, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime]);


  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    await refreshAllData();
    if (activeWorkout?.id) {
      setPendingWorkoutIdToSelect(activeWorkout.id);
    }
  }, [activeWorkout, refreshAllData]);


  useEffect(() => {
    if (initialWorkoutId && groupedTPaths.length > 0 && !activeWorkout && !pendingWorkoutIdToSelect) {
      setPendingWorkoutIdToSelect(initialWorkoutId);
    }
  }, [initialWorkoutId, groupedTPaths, activeWorkout, pendingWorkoutIdToSelect]);

  const finishWorkoutSession = useCallback(async () => {
    const finishedSessionId = await persistAndFinishWorkoutSession();
    if (finishedSessionId) {
      await resetWorkoutSession();
    }
    return finishedSessionId;
  }, [persistAndFinishWorkoutSession, resetWorkoutSession]);

  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    const allowedPathsWithoutWarning = ['/workout']; 

    if (hasUnsavedChanges && !allowedPathsWithoutWarning.includes(path)) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise<boolean>(resolve => {
        resolveNavigationPromise.current = resolve;
      });
    }

    return Promise.resolve(false);
  }, [hasUnsavedChanges, isWorkoutActive, setPendingNavigationPath, setShowUnsavedChangesDialog]);

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
    expandedExerciseCards,
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
    toggleExerciseCardExpansion, // Removed duplicate
  };
};