"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables, GroupedTPath, FetchedExerciseDefinition } from '@/types/supabase'; // Import GroupedTPath, FetchedExerciseDefinition
import { db } from '@/lib/db';
import { useWorkoutDataFetcher } from './use-workout-data-fetcher';
import { useCoreWorkoutSessionState } from './use-core-workout-session-state';
import { useWorkoutSessionPersistence } from './use-workout-session-persistence';
import { useSessionExerciseManagement } from './use-session-exercise-management';
import { useSession } from '@/components/session-context-provider';
import { useGym } from '@/components/gym-context-provider';

type TPath = Tables<'t_paths'>;

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
  router: ReturnType<typeof useRouter>;
}

export const useWorkoutFlowManager = ({ initialWorkoutId, router }: UseWorkoutFlowManagerProps) => {
  const { supabase } = useSession();
  const { activeGym } = useGym();
  const previousActiveGymId = useRef<string | null>(null);

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
    refreshProfile,
    refreshAchievements,
    setAllAvailableExercises, // Destructure setAllAvailableExercises
    isGeneratingPlan, // Get the new state
    profile, // Get profile from the data fetcher
  } = useWorkoutDataFetcher();

  const {
    resetWorkoutSession,
    createWorkoutSessionInDb,
    finishWorkoutSession: persistAndFinishWorkoutSession,
  } = useWorkoutSessionPersistence({
    allAvailableExercises: allAvailableExercises as Tables<'exercise_definitions'>[], // Cast to ExerciseDefinition[] for this hook's internal use
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
    allAvailableExercises: allAvailableExercises as Tables<'exercise_definitions'>[], // Cast to ExerciseDefinition[] for this hook's internal use
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

  const [pendingWorkoutIdToSelect, setPendingWorkoutIdToSelect] = useState<string | null>(null);

  const [isEditWorkoutDialogOpen, setIsEditWorkoutDialogOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<{ id: string; name: string } | null>(null);

  // Effect to reset workout state when the active gym changes
  useEffect(() => {
    if (activeGym && previousActiveGymId.current && activeGym.id !== previousActiveGymId.current) {
      console.log(`[useWorkoutFlowManager] Active gym changed from ${previousActiveGymId.current} to ${activeGym.id}. Resetting workout session.`);
      resetWorkoutSession();
    }
    previousActiveGymId.current = activeGym?.id || null;
  }, [activeGym, resetWorkoutSession]);

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
  }, [isWorkoutActive, hasUnsavedChanges, activeWorkout?.id, resetWorkoutSession, setPendingNavigationPath, setShowUnsavedChangesDialog]);

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
        const adHocWorkout: TPath = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null };
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
          let exercisesForThisWorkout = workoutExercisesCache[selectedWorkout.id] || [];
          
          // NEW: Filter exercises based on active gym
          if (activeGym) {
            const { data: gymExerciseLinks, error } = await supabase
              .from('gym_exercises')
              .select('exercise_id')
              .eq('gym_id', activeGym.id);

            if (error) {
              toast.error("Could not filter exercises for the selected gym.");
            } else {
              const availableExerciseIds = new Set(gymExerciseLinks.map(l => l.exercise_id));
              
              const { data: allLinkedExercises, error: allLinksError } = await supabase
                .from('gym_exercises')
                .select('exercise_id');
              
              if (allLinksError) {
                toast.error("Could not determine bodyweight exercises.");
              } else {
                const allLinkedExerciseIds = new Set(allLinkedExercises.map(l => l.exercise_id));
                
                exercisesForThisWorkout = exercisesForThisWorkout.filter(ex => 
                  !allLinkedExerciseIds.has(ex.id) || // It's a bodyweight exercise
                  availableExerciseIds.has(ex.id)      // It's available in the active gym
                );
              }
            }
          }
          
          setActiveWorkout(selectedWorkout);
          setExercisesForSession(exercisesForThisWorkout);
          setExercisesWithSets({});
          setCurrentSessionId(null);
          setSessionStartTime(null);
        } else {
          toast.info("Selected workout not found. Starting Ad-Hoc workout.");
          setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null });
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
  }, [loadingData, pendingWorkoutIdToSelect, groupedTPaths, workoutExercisesCache, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime, activeGym, supabase]);


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
    addExerciseToSession, // Expose addExerciseToSession
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
    allAvailableExercises: allAvailableExercises, // Expose allAvailableExercises directly
    setAllAvailableExercises, // Expose setAllAvailableExercises
    updateSessionStartTime,
    isEditWorkoutDialogOpen,
    selectedWorkoutToEdit,
    handleOpenEditWorkoutDialog,
    handleEditWorkoutSaveSuccess,
    setIsEditWorkoutDialogOpen,
    toggleExerciseCardExpansion,
    refreshProfile,
    refreshAchievements,
    isGeneratingPlan, // Return the new state
    profile, // Expose profile
    pendingWorkoutIdToSelect, // Expose the pending state
  };
};