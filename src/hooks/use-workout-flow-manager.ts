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

  // Use a ref to hold the current activeWorkout value without making it a dependency
  const activeWorkoutRef = useRef(activeWorkout);
  useEffect(() => {
    activeWorkoutRef.current = activeWorkout;
  }, [activeWorkout]);

  // Effect to automatically select a default workout when context changes
  useEffect(() => {
    console.log(`[AutoSelectEffect] Running. loadingData=${loadingData}, profile=${!!profile}, activeGym=${!!activeGym}, groupedTPaths.length=${groupedTPaths.length}, pendingWorkoutIdToSelect=${pendingWorkoutIdToSelect}`);

    // Only run if data is loaded, profile and active gym exist, and there are T-Paths
    if (loadingData || !profile || !activeGym || groupedTPaths.length === 0) {
      console.log("[AutoSelectEffect] Early exit due to loading or missing data.");
      return;
    }

    // If there's already a pending selection, let that process.
    // This prevents auto-selection from overriding a user's click or quick-start.
    if (pendingWorkoutIdToSelect) {
      console.log(`[AutoSelectEffect] Pending selection already exists (${pendingWorkoutIdToSelect}), skipping auto-selection.`);
      return;
    }

    const activeTPathGroupForGym = groupedTPaths.find(group => group.mainTPath.gym_id === activeGym.id);
    const currentActiveWorkoutId = activeWorkoutRef.current?.id; // Use ref here to avoid dependency loop

    if (activeTPathGroupForGym) {
      // If the current active workout is not part of this active T-Path group,
      // or if there's no active workout at all, set the first child workout as pending.
      if (!currentActiveWorkoutId || !activeTPathGroupForGym.childWorkouts.some(cw => cw.id === currentActiveWorkoutId)) {
        if (activeTPathGroupForGym.childWorkouts.length > 0) {
          console.log(`[AutoSelectEffect] Auto-selecting first workout for active gym: ${activeTPathGroupForGym.childWorkouts[0].template_name} (${activeTPathGroupForGym.childWorkouts[0].id})`);
          setPendingWorkoutIdToSelect(activeTPathGroupForGym.childWorkouts[0].id);
        } else {
          // If no child workouts in the active T-Path, ensure no workout is active.
          // This will trigger the reset in the other useEffect.
          console.log(`[AutoSelectEffect] No child workouts in active T-Path, setting pendingWorkoutIdToSelect to null.`);
          setPendingWorkoutIdToSelect(null);
        }
      } else {
        console.log(`[AutoSelectEffect] Current active workout (${currentActiveWorkoutId}) is consistent with active T-Path, no auto-selection needed.`);
      }
    } else {
      // If the active gym has no configured T-Path, ensure no workout is active.
      if (currentActiveWorkoutId) { // Only set to null if there's currently an active workout
        console.log(`[AutoSelectEffect] Active gym has no configured T-Path, setting pendingWorkoutIdToSelect to null.`);
        setPendingWorkoutIdToSelect(null);
      } else {
        console.log(`[AutoSelectEffect] Active gym has no configured T-Path and no workout is active, no change needed.`);
      }
    }
  }, [
    loadingData,
    profile,
    activeGym,
    groupedTPaths,
    pendingWorkoutIdToSelect,
    setPendingWorkoutIdToSelect,
    // activeWorkout is NOT a dependency here, using activeWorkoutRef.current instead
  ]);


  useEffect(() => {
    const performSelection = async () => {
      console.log(`[performSelection] Effect triggered. loadingData=${loadingData}, pendingWorkoutIdToSelect=${pendingWorkoutIdToSelect}`);

      if (loadingData || pendingWorkoutIdToSelect === undefined) { // pendingWorkoutIdToSelect can be null, but not undefined
        console.log(`[performSelection] Early exit: loadingData=${loadingData}, pendingWorkoutIdToSelect=${pendingWorkoutIdToSelect}`);
        return;
      }
      
      console.log(`[performSelection] Processing pendingWorkoutIdToSelect: ${pendingWorkoutIdToSelect}`);

      // Explicitly reset all workout-related states before setting new ones
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      setCurrentSessionId(null);
      setSessionStartTime(null);
      setCompletedExercises(new Set());
      setExpandedExerciseCards({});

      if (pendingWorkoutIdToSelect === 'ad-hoc') {
        const adHocWorkout: TPath = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null };
        setActiveWorkout(adHocWorkout);
        setExercisesForSession([]);
        console.log("[performSelection] Set Ad-Hoc workout.");
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
          console.log(`[performSelection] Set workout: ${selectedWorkout.template_name} with ${exercisesForThisWorkout.length} exercises.`);
        } else {
          toast.info("Selected workout not found. Starting Ad-Hoc workout.");
          setActiveWorkout({ id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: null, created_at: new Date().toISOString(), version: null, settings: null, progression_settings: null, parent_t_path_id: null, gym_id: null });
          setExercisesForSession([]);
          console.log("[performSelection] Selected workout not found, defaulted to Ad-Hoc.");
        }
      } else { // pendingWorkoutIdToSelect is null
        setActiveWorkout(null);
        setExercisesForSession([]);
        console.log("[performSelection] pendingWorkoutIdToSelect is null, resetting active workout.");
      }
      setPendingWorkoutIdToSelect(null); // Clear pending selection after processing
      console.log("[performSelection] Cleared pendingWorkoutIdToSelect.");
    };

    performSelection();
  }, [loadingData, pendingWorkoutIdToSelect, groupedTPaths, workoutExercisesCache, setActiveWorkout, setExercisesForSession, setExercisesWithSets, setCurrentSessionId, setSessionStartTime, setCompletedExercises, setExpandedExerciseCards, activeGym, supabase]);


  const handleEditWorkoutSaveSuccess = useCallback(async () => {
    setIsEditWorkoutDialogOpen(false);
    await refreshAllData();
    if (activeWorkout?.id) {
      setPendingWorkoutIdToSelect(activeWorkout.id);
    }
  }, [activeWorkout, refreshAllData]);


  useEffect(() => {
    if (initialWorkoutId && groupedTPaths.length > 0 && !activeWorkout && !pendingWorkoutIdToSelect) {
      console.log(`[InitialWorkoutIdEffect] Setting pendingWorkoutIdToSelect from URL: ${initialWorkoutId}`);
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
  };
};