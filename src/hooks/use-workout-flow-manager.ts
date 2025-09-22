"use client";

import React, { createContext, useContext, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { useActiveWorkoutSession } from './data/useActiveWorkoutSession';
import { Tables, WorkoutExercise } from '@/types/supabase';
import { toast } from 'sonner';
import { useGym } from '@/components/gym-context-provider';
import { useSession } from '@/components/session-context-provider';

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
    tempActionStatusMessage,
    setTempActionStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Destructure the new map
  } = useWorkoutDataFetcher();

  const { supabase } = useSession();
  const { activeGym } = useGym();
  const activeSession = useActiveWorkoutSession();
  const {
    activeWorkout,
    exercisesForSession,
    currentSessionId,
    setExercisesForSession,
    setExercisesWithSets,
    setCompletedExercises,
    setExpandedExerciseCards,
  } = activeSession;
  const prevExercisesRef = useRef<WorkoutExercise[]>([]);

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

  // The useEffect for reactivity
  useEffect(() => {
    const refreshActiveWorkoutExercises = async () => {
      console.log("[ActiveWorkoutSession] Reactivity useEffect triggered.");
      if (!activeWorkout || activeWorkout.id === 'ad-hoc') {
        console.log("[ActiveWorkoutSession] No active workout or it's ad-hoc, skipping reactivity update.");
        return;
      }

      const newExercisesFromCache = workoutExercisesCache[activeWorkout.id];
      console.log(`[ActiveWorkoutSession] Active workout ID: ${activeWorkout.id}, Name: ${activeWorkout.template_name}`);
      console.log("[ActiveWorkoutSession] New exercises from cache (raw):", newExercisesFromCache?.map(e => e.name));

      if (!newExercisesFromCache) {
        console.log("[ActiveWorkoutSession] No new exercises found in cache for active workout, skipping update.");
        return;
      }

      let filteredNewExercises = newExercisesFromCache;

      if (activeGym) {
        try {
          const { data: gymLinks, error: gymLinksError } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGym.id);
          if (gymLinksError) throw gymLinksError;
          const { data: allLinks, error: allLinksError } = await supabase.from('gym_exercises').select('exercise_id');
          if (allLinksError) throw allLinksError;

          const availableIds = new Set((gymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
          const allLinkedIds = new Set((allLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
          filteredNewExercises = newExercisesFromCache.filter(ex => !allLinkedIds.has(ex.id) || availableIds.has(ex.id));
          console.log("[ActiveWorkoutSession] New exercises after gym filtering:", filteredNewExercises.map(e => e.name));
        } catch (error) {
          console.error("[ActiveWorkoutSession] Error filtering exercises by active gym in reactivity effect:", error);
          toast.error("Failed to update workout exercises based on active gym.");
          return;
        }
      }

      const currentIds = exercisesForSession.map(e => e.id).sort().join(',');
      const newIds = filteredNewExercises.map(e => e.id).sort().join(',');

      console.log(`[ActiveWorkoutSession] Current exercise IDs in state: ${currentIds}`);
      console.log(`[ActiveWorkoutSession] New exercise IDs from filtered cache: ${newIds}`);

      if (currentIds !== newIds) {
        console.log("[ActiveWorkoutSession] Detected change in exercise IDs. Updating session exercises.");
        const prevIds = new Set(prevExercisesRef.current.map(e => e.id));
        const newIdsSet = new Set(filteredNewExercises.map(e => e.id));
        let message = "Updated!";
        if (newIdsSet.size > prevIds.size) {
          message = "Added!";
        } else if (newIdsSet.size < prevIds.size) {
          message = "Removed!";
        }
        
        let type: 'added' | 'removed' | 'info' = 'info';
        if (newIdsSet.size > prevIds.size) {
            type = 'added';
        } else if (newIdsSet.size < prevIds.size) {
            type = 'removed';
        }

        setTempActionStatusMessage({ message, type, icon: 'check' });
        setTimeout(() => setTempActionStatusMessage(null), 3000);
        setExercisesForSession(filteredNewExercises);
        const initialSets = Object.fromEntries(filteredNewExercises.map(ex => [ex.id, Array.from({ length: 3 }, () => ({ id: null, created_at: null, session_id: currentSessionId, exercise_id: ex.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null }))]));
        setExercisesWithSets(initialSets);
        setCompletedExercises(new Set());
        setExpandedExerciseCards(Object.fromEntries(filteredNewExercises.map(ex => [ex.id, false]))); // Changed to false for collapsed by default
      } else {
        console.log("[ActiveWorkoutSession] No change in exercise IDs. Skipping update.");
      }
      prevExercisesRef.current = filteredNewExercises;
    };
    refreshActiveWorkoutExercises();
  }, [
    activeWorkout,
    workoutExercisesCache,
    setTempActionStatusMessage,
    activeGym,
    supabase,
    exercisesForSession,
    currentSessionId,
    setExercisesForSession,
    setExercisesWithSets,
    setCompletedExercises,
    setExpandedExerciseCards,
  ]);

  return useMemo(() => ({
    ...activeSession,
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
    isGeneratingPlan,
    profile,
    tempActionStatusMessage,
    setTempActionStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Pass it through
  }), [
    activeSession,
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
    isGeneratingPlan,
    profile,
    tempActionStatusMessage,
    setTempActionStatusMessage,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap, // Add to dependencies
  ]);
};