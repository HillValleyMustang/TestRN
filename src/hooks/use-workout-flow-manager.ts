"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { db, addToSyncQueue, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutDataFetcher } from './use-workout-data-fetcher'; // Import new hook
import { useWorkoutSessionState } from './use-workout-session-state'; // Import new hook

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseWorkoutFlowManagerProps {
  initialWorkoutId?: string | null;
  router: ReturnType<typeof useRouter>;
}

interface UseWorkoutFlowManagerReturn {
  activeWorkout: TPath | null;
  exercisesForSession: WorkoutExercise[];
  exercisesWithSets: Record<string, SetLogState[]>;
  allAvailableExercises: ExerciseDefinition[];
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  completedExercises: Set<string>;
  selectWorkout: (workoutId: string | null) => Promise<void>;
  addExerciseToSession: (exercise: ExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  updateSessionStartTime: (timestamp: string) => void;
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  resetWorkoutSession: () => Promise<void>;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
  groupedTPaths: { mainTPath: TPath; childWorkouts: (TPath & { last_completed_at: string | null; })[]; }[];
  isCreatingSession: boolean;
  createWorkoutSessionInDb: (templateName: string, firstSetTimestamp: string) => Promise<string>;
  finishWorkoutSession: () => Promise<void>;
  refreshAllData: () => void; // Added to return type
}

const DEFAULT_INITIAL_SETS = 3;

export const useWorkoutFlowManager = ({ initialWorkoutId, router }: UseWorkoutFlowManagerProps): UseWorkoutFlowManagerReturn => {
  const { session, supabase } = useSession();

  const [loadingFlow, setLoadingFlow] = useState(true);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(initialWorkoutId ?? null);

  // Use new modular hooks
  const {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData, // This now reflects the processing of cached data
    dataError,
    refreshAllData, // Destructure refreshAllData
  } = useWorkoutDataFetcher();

  const {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    isCreatingSession,
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
    createWorkoutSessionInDb,
    finishWorkoutSession,
  } = useWorkoutSessionState({ allAvailableExercises });

  useEffect(() => {
    setLoadingFlow(loadingData); // loadingFlow now reflects if initial cache processing is done
    setFlowError(dataError);
  }, [loadingData, dataError]);

  const selectWorkout = useCallback(async (workoutId: string | null) => {
    setSelectedWorkoutId(workoutId);
    if (!session) {
      toast.error("You must be logged in to select a workout.");
      return;
    }

    await resetWorkoutSession(); // Always reset session state first

    if (!workoutId) {
      setActiveWorkout(null);
      setExercisesForSession([]);
      setExercisesWithSets({});
      return;
    }

    // Use the already available groupedTPaths and workoutExercisesCache from the data fetcher
    // These states are populated from IndexedDB as soon as possible.
    let currentWorkout: TPath | null = null;
    let exercises: WorkoutExercise[] = [];

    if (workoutId === 'ad-hoc') {
      currentWorkout = { id: 'ad-hoc', template_name: 'Ad Hoc Workout', is_bonus: false, user_id: session.user.id, created_at: new Date().toISOString(), version: 1, settings: null, progression_settings: null, parent_t_path_id: null };
      const adHocDrafts = await db.draft_set_logs.filter(draft => draft.session_id === null).toArray(); // FIX APPLIED HERE
      const adHocExerciseIds = Array.from(new Set(adHocDrafts.map(d => d.exercise_id)));
      
      if (adHocExerciseIds.length > 0 && allAvailableExercises) { // Use allAvailableExercises from hook
        exercises = allAvailableExercises
          .filter(ex => adHocExerciseIds.includes(ex.id))
          .map(ex => ({ ...ex, is_bonus_exercise: false }));
      }
    } else {
      // Find the selected workout from the grouped T-Paths
      const foundGroup = groupedTPaths.find(group => group.childWorkouts.some(cw => cw.id === workoutId));
      currentWorkout = foundGroup?.childWorkouts.find(cw => cw.id === workoutId) || null;

      if (!currentWorkout) {
        toast.error("Selected workout not found in your active Transformation Path.");
        return;
      }
      exercises = workoutExercisesCache[workoutId] || [];
    }

    setActiveWorkout(currentWorkout);
    setExercisesForSession(exercises);

    const initialSets: Record<string, SetLogState[]> = {};
    for (const ex of exercises) {
      const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
        p_user_id: session.user.id,
        p_exercise_id: ex.id,
      });
      
      if (rpcError) {
        console.error(`Error fetching last sets for exercise ${ex.name}:`, rpcError);
      }

      const lastAttemptSets = rpcError ? [] : (lastExerciseSets || []);

      const drafts = await db.draft_set_logs.where({ exercise_id: ex.id, session_id: currentSessionId }).sortBy('set_index');

      if (drafts.length > 0) {
        initialSets[ex.id] = drafts.map((draft, setIndex) => {
          const correspondingLastSet = lastAttemptSets[setIndex];
          return {
            id: null, created_at: null, session_id: draft.session_id, exercise_id: draft.exercise_id,
            weight_kg: draft.weight_kg, reps: draft.reps, reps_l: draft.reps_l, reps_r: draft.reps_r, time_seconds: draft.time_seconds,
            is_pb: false, isSaved: false, isPR: false,
            lastWeight: correspondingLastSet?.weight_kg || null,
            lastReps: correspondingLastSet?.reps || null,
            lastRepsL: correspondingLastSet?.reps_l || null,
            lastRepsR: correspondingLastSet?.reps_r || null,
            lastTimeSeconds: correspondingLastSet?.time_seconds || null,
          };
        });
      } else {
        initialSets[ex.id] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
          const correspondingLastSet = lastAttemptSets[setIndex];
          return {
            id: null, created_at: null, session_id: currentSessionId, exercise_id: ex.id,
            weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
            is_pb: false, isSaved: false, isPR: false,
            lastWeight: correspondingLastSet?.weight_kg || null,
            lastReps: correspondingLastSet?.reps || null,
            lastRepsL: correspondingLastSet?.reps_l || null,
            lastRepsR: correspondingLastSet?.reps_r || null,
            lastTimeSeconds: correspondingLastSet?.time_seconds || null,
          };
        });
      }
    }
    setExercisesWithSets(initialSets);

    // Trigger a background refresh to ensure cache is up-to-date for next time
    refreshAllData();

  }, [session, supabase, resetWorkoutSession, groupedTPaths, workoutExercisesCache, currentSessionId, allAvailableExercises, refreshAllData]);

  useEffect(() => {
    if (initialWorkoutId && !loadingData && !loadingFlow) {
      selectWorkout(initialWorkoutId);
    }
  }, [initialWorkoutId, loadingData, loadingFlow, selectWorkout]);

  return {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading: loadingFlow,
    error: flowError,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    selectWorkout,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime: useCallback((timestamp: string) => {
      if (currentSessionId && !sessionStartTime) {
        setSessionStartTime(new Date(timestamp));
      }
    }, [currentSessionId, sessionStartTime, setSessionStartTime]),
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
    groupedTPaths,
    isCreatingSession,
    createWorkoutSessionInDb,
    finishWorkoutSession,
    refreshAllData, // Return refreshAllData
  };
};