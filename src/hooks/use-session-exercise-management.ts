"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
import { db, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useCoreWorkoutSessionState } from './use-core-workout-session-state';
import { SupabaseClient } from '@supabase/supabase-js';

type ExerciseDefinition = Tables<'exercise_definitions'>;

const DEFAULT_INITIAL_SETS = 3;

// Helper function to validate if an ID is a non-empty string
const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

// Helper function to validate a composite key for draft_set_logs
const isValidDraftKey = (exerciseId: string | null | undefined, setIndex: number | null | undefined): boolean => {
  return isValidId(exerciseId) && typeof setIndex === 'number' && setIndex >= 0;
};

interface UseSessionExerciseManagementProps {
  allAvailableExercises: ExerciseDefinition[];
  coreState: ReturnType<typeof useCoreWorkoutSessionState>;
  supabase: SupabaseClient;
}

interface UseSessionExerciseManagementReturn {
  markExerciseAsCompleted: (exerciseId: string, isNewPR: boolean) => void;
  addExerciseToSession: (exercise: ExerciseDefinition) => Promise<void>;
  removeExerciseFromSession: (exerciseId: string) => Promise<void>;
  substituteExercise: (oldExerciseId: string, newExercise: WorkoutExercise) => Promise<void>;
  updateExerciseSets: (exerciseId: string, newSets: SetLogState[]) => void;
}

export const useSessionExerciseManagement = ({ // Ensure this export is correctly picked up
  allAvailableExercises,
  coreState,
  supabase,
}: UseSessionExerciseManagementProps): UseSessionExerciseManagementReturn => {
  console.log("[useSessionExerciseManagement] Hook initialized."); // Added console log
  const { session } = useSession();
  const {
    exercisesForSession,
    exercisesWithSets,
    currentSessionId,
    setExercisesForSession,
    setExercisesWithSets,
    setCompletedExercises,
    setExpandedExerciseCards,
  } = coreState;

  const addExerciseToSession = useCallback(async (exercise: ExerciseDefinition) => {
    if (!session) return;
    if (!isValidId(exercise.id)) {
      console.error("Attempted to add exercise with invalid ID:", exercise);
      toast.error("Cannot add exercise: invalid exercise ID.");
      return;
    }

    if (exercisesForSession.some(ex => ex.id === exercise.id)) {
      toast.info(`'${exercise.name}' is already in this workout session.`);
      return;
    }

    let lastWeight = null, lastReps = null, lastTimeSeconds = null, lastRepsL = null, lastRepsR = null;
    
    const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
      p_user_id: session.user.id,
      p_exercise_id: exercise.id,
    });

    if (rpcError && rpcError.code !== 'PGRST116') { 
      console.error(`Error fetching last sets for ad-hoc exercise ${exercise.name}:`, rpcError);
    } else if (lastExerciseSets && lastExerciseSets.length > 0) {
      const firstLastSet = lastExerciseSets[0];
      lastWeight = firstLastSet.weight_kg;
      lastReps = firstLastSet.reps;
      lastRepsL = firstLastSet.reps_l;
      lastRepsR = firstLastSet.reps_r;
      lastTimeSeconds = firstLastSet.time_seconds;
    }

    setExercisesForSession((prev: WorkoutExercise[]) => [{ ...exercise, is_bonus_exercise: false }, ...prev]);
    
    const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
      const newSet: SetLogState = { 
        id: null, created_at: null, session_id: currentSessionId, exercise_id: exercise.id, 
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, 
        is_pb: false, isSaved: false, isPR: false, 
        lastWeight, lastReps, lastRepsL, lastRepsR, lastTimeSeconds
      };
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exercise.id,
        set_index: setIndex,
        session_id: currentSessionId,
        weight_kg: newSet.weight_kg,
        reps: newSet.reps,
        reps_l: newSet.reps_l,
        reps_r: newSet.reps_r,
        time_seconds: newSet.time_seconds,
        isSaved: false, set_log_id: null,
        is_pb: false,
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in addExerciseToSession put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return newSet;
    });

    setExercisesWithSets((prev: Record<string, SetLogState[]>) => ({ ...prev, [exercise.id]: newSetsForExercise }));
    setExpandedExerciseCards(prev => ({ ...prev, [exercise.id]: true }));
  }, [currentSessionId, session, supabase, exercisesForSession, setExercisesForSession, setExercisesWithSets, setExpandedExerciseCards]);

  const removeExerciseFromSession = useCallback(async (exerciseId: string) => {
    if (!isValidId(exerciseId)) {
      console.error("Attempted to remove exercise with invalid ID:", exerciseId);
      toast.error("Cannot remove exercise: invalid exercise ID.");
      return;
    }
    setExercisesForSession((prev: WorkoutExercise[]) => prev.filter((ex: WorkoutExercise) => ex.id !== exerciseId));
    setExercisesWithSets((prev: Record<string, SetLogState[]>) => { const newSets = { ...prev }; delete newSets[exerciseId]; return newSets; });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(exerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => { const newExpanded = { ...prev }; delete newExpanded[exerciseId]; return newExpanded; });
    
    const draftsToDelete = await db.draft_set_logs
      .where('exercise_id').equals(exerciseId)
      .filter((draft: LocalDraftSetLog) => draft.session_id === currentSessionId)
      .toArray();
    
    if (draftsToDelete.length > 0) {
      const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
      console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1]), `Invalid draft keys in removeExerciseFromSession bulkDelete: ${JSON.stringify(keysToDelete)}`));
      await db.draft_set_logs.bulkDelete(keysToDelete);
    }
  }, [currentSessionId, setExercisesForSession, setExercisesWithSets, setCompletedExercises, setExpandedExerciseCards]);

  const substituteExercise = useCallback(async (oldExerciseId: string, newExercise: WorkoutExercise) => {
    if (!isValidId(oldExerciseId) || !isValidId(newExercise.id)) {
      console.error("Attempted to substitute exercise with invalid IDs:", oldExerciseId, newExercise);
      toast.error("Cannot substitute exercise: invalid exercise ID(s).");
      return;
    }

    if (exercisesForSession.some(ex => ex.id === newExercise.id)) {
      toast.info(`'${newExercise.name}' is already in this workout session.`);
      return;
    }

    setExercisesForSession((prev: WorkoutExercise[]) => prev.map((ex: WorkoutExercise) => ex.id === oldExerciseId ? newExercise : ex));
    setExercisesWithSets((prev: Record<string, SetLogState[]>) => {
      const newSets = { ...prev };
      const newSetsForExercise: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map((_, setIndex) => {
        const newSet: SetLogState = { id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id, weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null };
        const draftPayload: LocalDraftSetLog = {
          exercise_id: newExercise.id,
          set_index: setIndex,
          session_id: currentSessionId,
          weight_kg: newSet.weight_kg,
          reps: newSet.reps,
          reps_l: newSet.reps_l,
          reps_r: newSet.reps_r,
          time_seconds: newSet.time_seconds,
          isSaved: false, set_log_id: null,
          is_pb: false,
        };
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in substituteExercise put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        db.draft_set_logs.put(draftPayload);
        return newSet;
      });
      newSets[newExercise.id] = newSetsForExercise;
      delete newSets[oldExerciseId];
      return newSets;
    });
    setCompletedExercises((prev: Set<string>) => { const newCompleted = new Set(prev); newCompleted.delete(oldExerciseId); return newCompleted; });
    setExpandedExerciseCards(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[oldExerciseId];
      newExpanded[newExercise.id] = true; // Expand the new exercise
      return newExpanded;
    });
    
    const draftsToDelete = await db.draft_set_logs
      .where('exercise_id').equals(oldExerciseId)
      .filter((draft: LocalDraftSetLog) => draft.session_id === currentSessionId)
      .toArray();
    
    if (draftsToDelete.length > 0) {
      const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
      console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1]), `Invalid draft keys in substituteExercise bulkDelete: ${JSON.stringify(keysToDelete)}`));
      await db.draft_set_logs.bulkDelete(keysToDelete);
    }
  }, [currentSessionId, exercisesForSession, setExercisesForSession, setExercisesWithSets, setCompletedExercises, setExpandedExerciseCards]);

  const updateExerciseSets = useCallback((exerciseId: string, newSets: SetLogState[]) => {
    setExercisesWithSets((prev: Record<string, SetLogState[]>) => ({ ...prev, [exerciseId]: newSets }));
    // No change to expanded state here, as saving a set should keep it open
  }, [setExercisesWithSets]);

  const markExerciseAsCompleted = useCallback((exerciseId: string, isNewPR: boolean) => {
    setCompletedExercises((prev: Set<string>) => {
      const newCompleted = new Set(prev);
      newCompleted.add(exerciseId);
      return newCompleted;
    });
    setExpandedExerciseCards(prev => ({ ...prev, [exerciseId]: false })); // Collapse on completion
  }, [setCompletedExercises, setExpandedExerciseCards]);

  return {
    markExerciseAsCompleted,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateExerciseSets,
  };
};