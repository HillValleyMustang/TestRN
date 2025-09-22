"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { useActiveWorkoutSession } from './data/useActiveWorkoutSession';
import { Tables, WorkoutExercise } from '@/types/supabase';

interface UseWorkoutFlowManagerProps {
  router: ReturnType<typeof useRouter>;
}

export const useWorkoutFlowManager = ({ router }: UseWorkoutFlowManagerProps) => {
  const {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
    refreshProfile,
    refreshAchievements,
    isGeneratingPlan,
    profile,
    tempStatusMessage,
    setTempStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Destructure the new map
    refreshTPaths,
    refreshTPathExercises,
  } = useWorkoutDataFetcher();

  const activeSession = useActiveWorkoutSession();

  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const resolveNavigationPromise = useRef<((value: boolean) => void) | null>(null);

  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  const handleOpenEditWorkoutDialog = useCallback((workoutId: string, workoutName: string) => {
    setSelectedWorkoutToEdit({ id: workoutId, name: workoutName });
    setIsEditWorkoutDialogOpen(true);
  }, []);

  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    await refreshAllData();
    if (activeSession.activeWorkout?.id) {
      await activeSession.selectWorkout(activeSession.activeWorkout.id);
    }
  }, [activeSession, refreshAllData]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    if (activeSession.isWorkoutActive && activeSession.hasUnsavedChanges) {
      const shouldBlock = await new Promise<boolean>(resolve => {
        setPendingNavigationPath(`/workout?workoutId=${workoutId}`);
        setShowUnsavedChangesDialog(true);
        resolveNavigationPromise.current = resolve;
      });
      if (shouldBlock) return;
    }
    await activeSession.selectWorkout(workoutId);
  }, [activeSession]);

  const promptBeforeNavigation = useCallback(async (path: string): Promise<boolean> => {
    const allowedPathsWithoutWarning = ['/workout'];
    if (activeSession.hasUnsavedChanges && !allowedPathsWithoutWarning.some(p => path.startsWith(p))) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return new Promise<boolean>(resolve => {
        resolveNavigationPromise.current = resolve;
      });
    }
    return Promise.resolve(false);
  }, [activeSession.hasUnsavedChanges]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationPath) {
      await activeSession.resetWorkoutSession();
      router.push(pendingNavigationPath);
    }
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(false);
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, [pendingNavigationPath, router, activeSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    if (resolveNavigationPromise.current) {
      resolveNavigationPromise.current(true);
      resolveNavigationPromise.current = null;
    }
    setPendingNavigationPath(null);
  }, []);

  // NEW: Create a wrapped substituteExercise function
  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    await activeSession.substituteExercise(oldExerciseId, newExercise);
    setTempStatusMessage({ message: 'Added!', type: 'success' });
    setTimeout(() => setTempStatusMessage(null), 3000);
  }, [activeSession, setTempStatusMessage]);

  // NEW: Create a wrapped removeExerciseFromSession function
  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    await activeSession.removeExerciseFromSession(exerciseId);
    setTempStatusMessage({ message: 'Removed!', type: 'removed' });
    setTimeout(() => setTempStatusMessage(null), 3000);
  }, [activeSession, setTempStatusMessage]);

  return useMemo(() => ({
    ...activeSession,
    substituteExercise, // Override with the wrapped function
    removeExerciseFromSession, // Override with the wrapped function
    selectWorkout,
    loading: loadingData,
    groupedTPaths,
    refreshAllData,
    showUnsavedChangesDialog,
    handleConfirmLeave,
    handleCancelLeave,
    promptBeforeNavigation,
    allAvailableExercises,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
    profile,
    tempStatusMessage,
    setTempStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Pass it through
  }), [
    activeSession,
    substituteExercise,
    removeExerciseFromSession,
    selectWorkout,
    loadingData,
    groupedTPaths,
    refreshAllData,
    showUnsavedChangesDialog,
    handleConfirmLeave,
    handleCancelLeave,
    promptBeforeNavigation,
    allAvailableExercises,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
    profile,
    tempStatusMessage,
    setTempStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Add to dependencies
  ]);
};