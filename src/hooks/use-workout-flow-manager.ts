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
  const workoutData = useWorkoutDataFetcher();

  const activeSession = useActiveWorkoutSession({
    groupedTPaths: workoutData.groupedTPaths,
    workoutExercisesCache: workoutData.workoutExercisesCache,
  });

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
    await workoutData.refreshAllData();
    if (activeSession.activeWorkout?.id) {
      await activeSession.selectWorkout(activeSession.activeWorkout.id);
    }
  }, [activeSession, workoutData]);

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
    workoutData.setTempStatusMessage({ message: 'Added!', type: 'success' });
    setTimeout(() => workoutData.setTempStatusMessage(null), 3000);
  }, [activeSession, workoutData]);

  // NEW: Create a wrapped removeExerciseFromSession function
  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    await activeSession.removeExerciseFromSession(exerciseId);
    workoutData.setTempStatusMessage({ message: 'Removed!', type: 'removed' });
    setTimeout(() => workoutData.setTempStatusMessage(null), 3000);
  }, [activeSession, workoutData]);

  return useMemo(() => ({
    ...workoutData,
    ...activeSession,
    selectWorkout, // Overridden version
    substituteExercise, // Overridden version
    removeExerciseFromSession, // Overridden version
    promptBeforeNavigation,
    handleConfirmLeave,
    handleCancelLeave,
    showUnsavedChangesDialog,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
  }), [
    workoutData,
    activeSession,
    selectWorkout,
    substituteExercise,
    removeExerciseFromSession,
    promptBeforeNavigation,
    handleConfirmLeave,
    handleCancelLeave,
    showUnsavedChangesDialog,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
  ]);
};