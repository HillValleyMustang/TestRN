"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, TablesInsert, TablesUpdate, SetLogState, UserExercisePRInsert, UserExercisePRUpdate, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { convertWeight, formatWeight } from '@/lib/unit-conversions';
import { useSetPersistence } from './use-set-persistence'; // Import new hook
import { useExercisePRLogic } from './use-exercise-pr-logic'; // Import new hook
import { useProgressionSuggestion } from './use-progression-suggestion'; // Import new hook
import { db, addToSyncQueue, LocalDraftSetLog } from '@/lib/db'; // Import db and LocalDraftSetLog
import { useSession } from '@/components/session-context-provider'; // Import useSession to get user ID for RPC

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;
type Profile = Tables<'profiles'>;
type UserExercisePR = Tables<'user_exercise_prs'>;

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseComplete: (exerciseId: string, isNewPR: boolean) => Promise<void>;
  workoutTemplateName: string;
  exerciseNumber: number;
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => void;
  handleInputChange: (setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => void;
  handleSaveSet: (setIndex: number) => Promise<void>;
  handleEditSet: (setIndex: number) => void;
  handleDeleteSet: (setIndex: number) => Promise<void>;
  handleSaveExercise: () => Promise<boolean>;
  exercisePR: UserExercisePR | null;
  loadingPR: boolean;
  handleSuggestProgression: () => Promise<void>;
}

const MAX_SETS = 5;
const DEFAULT_INITIAL_SETS = 3;

// Validation function to ensure keys are valid before DB operations
const isValidKey = (key: any): key is string => {
  return typeof key === 'string' && key.length > 0;
};

export const useExerciseSets = ({
  exerciseId,
  exerciseName,
  exerciseType,
  exerciseCategory,
  currentSessionId: propCurrentSessionId,
  supabase,
  onUpdateSets,
  initialSets,
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
  workoutTemplateName,
  exerciseNumber,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const { session } = useSession(); // Get session for RPC calls
  const [sets, setSets] = useState<SetLogState[]>([]); // Initialize as empty, will load from drafts or initialSets

  // Integrate new modular hooks
  const { saveSetToDb, deleteSetFromDb } = useSetPersistence({
    exerciseId,
    exerciseType,
    exerciseCategory,
    supabase,
    preferredWeightUnit,
  });
  const { exercisePR, loadingPR, updateExercisePRStatus } = useExercisePRLogic({
    exerciseId,
    exerciseType,
    supabase,
  });
  const { getProgressionSuggestion } = useProgressionSuggestion({
    exerciseId,
    exerciseType,
    exerciseCategory,
    supabase,
    preferredWeightUnit,
  });

  // This effect is for LOADING sets. It uses the prop directly to avoid race conditions.
  useEffect(() => {
    const loadSets = async () => {
      // Use the prop directly for the query to ensure stability.
      const sessionIdForQuery = propCurrentSessionId;

      if (!isValidKey(exerciseId) || typeof sessionIdForQuery === 'undefined') {
        // This guard prevents the query from running with invalid keys.
        return;
      }

      const loadedSets: SetLogState[] = [];
      
      // **FIX**: Use a more robust query method to avoid race conditions with compound keys.
      const allDraftsForExercise = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .toArray();
      
      const drafts = allDraftsForExercise
        .filter(draft => draft.session_id === sessionIdForQuery)
        .sort((a, b) => a.set_index - b.set_index);

      if (drafts.length > 0) {
        drafts.forEach(draft => {
          loadedSets.push({
            id: null, created_at: null, session_id: draft.session_id, exercise_id: draft.exercise_id,
            weight_kg: draft.weight_kg, reps: draft.reps, reps_l: draft.reps_l, reps_r: draft.reps_r, time_seconds: draft.time_seconds,
            is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
          });
        });
      } else if (initialSets.length > 0) {
        initialSets.forEach(set => loadedSets.push({ ...set, session_id: sessionIdForQuery }));
      } else {
        for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
          loadedSets.push({
            id: null, created_at: null, session_id: sessionIdForQuery, exercise_id: exerciseId,
            weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
            is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
          });
        }
      }

      const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
      if (session) {
        const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
          p_user_id: session.user.id,
          p_exercise_id: exerciseId,
        });
        if (rpcError) {
          console.error(`Error fetching last sets for exercise ${exerciseName}:`, rpcError);
        } else if (lastExerciseSets) {
          lastSetsMap.set(exerciseId, lastExerciseSets);
        }
      }

      const finalSets = loadedSets.map((set, setIndex) => {
        const correspondingLastSet = lastSetsMap.get(exerciseId)?.[setIndex];
        return {
          ...set,
          lastWeight: correspondingLastSet?.weight_kg || null,
          lastReps: correspondingLastSet?.reps || null,
          lastRepsL: correspondingLastSet?.reps_l || null,
          lastRepsR: correspondingLastSet?.reps_r || null,
          lastTimeSeconds: correspondingLastSet?.time_seconds || null,
        };
      });
      setSets(finalSets);
    };

    loadSets();
  }, [exerciseId, propCurrentSessionId, initialSets, supabase, session, exerciseName]); // Note dependency on prop, not state.

  useEffect(() => {
    onUpdateSets(exerciseId, sets);
  }, [sets, exerciseId, onUpdateSets]);

  const handleAddSet = useCallback(() => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot add set: exercise information is incomplete.");
      return;
    }
    if (sets.length >= MAX_SETS) {
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    setSets(prev => {
      const lastSet = prev[prev.length - 1];
      const newSet: SetLogState = {
        id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false,
        lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastRepsL: lastSet?.reps_l, lastRepsR: lastSet?.reps_r, lastTimeSeconds: lastSet?.time_seconds,
      };
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: prev.length, session_id: propCurrentSessionId,
        weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
      };
      db.draft_set_logs.put(draftPayload);
      return [...prev, newSet];
    });
  }, [exerciseId, propCurrentSessionId, sets.length]);

  const handleInputChange = useCallback((setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot update set: exercise information is incomplete.");
      return;
    }
    setSets(prev => {
      const newSets = [...prev];
      let parsedValue: number | null = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = null;

      if (field === 'weight_kg' && parsedValue !== null) {
        newSets[setIndex] = { ...newSets[setIndex], [field]: convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg') };
      } else {
        newSets[setIndex] = { ...newSets[setIndex], [field]: parsedValue };
      }
      newSets[setIndex].isSaved = false;

      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
        weight_kg: newSets[setIndex].weight_kg, reps: newSets[setIndex].reps, reps_l: newSets[setIndex].reps_l, reps_r: newSets[setIndex].reps_r, time_seconds: newSets[setIndex].time_seconds,
      };
      db.draft_set_logs.put(draftPayload);
      return newSets;
    });
  }, [exerciseId, propCurrentSessionId, preferredWeightUnit]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot save set: exercise information is incomplete.");
      return;
    }
    const currentSet = sets[setIndex];
    const previousSets = sets;

    // Optimistic UI update
    setSets(prev => {
      const newSets = [...prev];
      newSets[setIndex] = { ...newSets[setIndex], isSaved: true };
      return newSets;
    });

    let sessionIdToUse = propCurrentSessionId;
    if (!sessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        sessionIdToUse = newSessionId;
      } catch (err) {
        toast.error("Failed to start workout session.");
        setSets(previousSets); // Rollback optimistic update
        return;
      }
    }

    const { savedSet } = await saveSetToDb(currentSet, setIndex, sessionIdToUse);
    if (savedSet) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = { ...savedSet, session_id: sessionIdToUse };
        db.draft_set_logs.delete([exerciseId, setIndex]);
        return newSets;
      });
    } else {
      setSets(previousSets); // Rollback on failure
      toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
    }
  }, [sets, propCurrentSessionId, saveSetToDb, exerciseId, onFirstSetSaved]);

  const handleEditSet = useCallback((setIndex: number) => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot edit set: exercise information is incomplete.");
      return;
    }
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
        weight_kg: updatedSets[setIndex].weight_kg, reps: updatedSets[setIndex].reps, reps_l: updatedSets[setIndex].reps_l, reps_r: updatedSets[setIndex].reps_r, time_seconds: updatedSets[setIndex].time_seconds,
      };
      db.draft_set_logs.put(draftPayload);
      return updatedSets;
    });
  }, [exerciseId, propCurrentSessionId]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot delete set: exercise information is incomplete.");
      return;
    }
    const setToDelete = sets[setIndex];
    const previousSets = sets;
    setSets(prev => prev.filter((_, i) => i !== setIndex));
    db.draft_set_logs.delete([exerciseId, setIndex]);
    toast.success("Set removed.");

    if (!setToDelete.id) return;

    const success = await deleteSetFromDb(setToDelete.id);
    if (!success) {
      setSets(previousSets);
      toast.error("Failed to delete set from database. Please try again.");
    }
  }, [sets, deleteSetFromDb, exerciseId]);

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot save exercise: exercise information is incomplete.");
      return false;
    }
    let currentSessionIdToUse = propCurrentSessionId;

    const hasAnyData = sets.some(s => (s.weight_kg ?? 0) > 0 || (s.reps ?? 0) > 0 || (s.time_seconds ?? 0) > 0 || (s.reps_l ?? 0) > 0 || (s.reps_r ?? 0) > 0);
    if (!hasAnyData) {
      toast.error("No data to save for this exercise.");
      return false;
    }

    if (!currentSessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        currentSessionIdToUse = newSessionId;
      } catch (err) {
        toast.error("Failed to start workout session. Please try again.");
        return false;
      }
    }

    const updatedSetsState: SetLogState[] = [];
    let hasError = false;

    for (let i = 0; i < sets.length; i++) {
      const currentSet = sets[i];
      const hasDataForSet = (currentSet.weight_kg ?? 0) > 0 || (currentSet.reps ?? 0) > 0 || (currentSet.time_seconds ?? 0) > 0 || (currentSet.reps_l ?? 0) > 0 || (currentSet.reps_r ?? 0) > 0;

      if (hasDataForSet && !currentSet.isSaved) {
        const { savedSet } = await saveSetToDb(currentSet, i, currentSessionIdToUse);
        if (savedSet) {
          updatedSetsState.push(savedSet);
        } else {
          hasError = true;
          updatedSetsState.push(currentSet);
        }
      } else if (hasDataForSet && currentSet.isSaved) {
        updatedSetsState.push(currentSet);
      } else {
        updatedSetsState.push(currentSet);
      }
    }

    setSets(updatedSetsState);
    if (hasError) return false;

    try {
      const isNewPROverall = await updateExercisePRStatus(currentSessionIdToUse, updatedSetsState);
      await onExerciseComplete(exerciseId, isNewPROverall);
      await db.draft_set_logs.where({ exercise_id: exerciseId, session_id: currentSessionIdToUse }).delete();
      return true;
    } catch (err: any) {
      console.error("Error saving exercise completion or PR:", err);
      toast.error("Failed to complete exercise: " + err.message);
      return false;
    }
  }, [sets, exerciseId, onExerciseComplete, onFirstSetSaved, propCurrentSessionId, saveSetToDb, updateExercisePRStatus]);

  const handleSuggestProgression = useCallback(async () => {
    if (!isValidKey(exerciseId)) {
      toast.error("Cannot suggest progression: exercise information is incomplete.");
      return;
    }
    const { newSets, message } = await getProgressionSuggestion(sets.length, propCurrentSessionId);
    if (newSets) {
      setSets(newSets);
      toast.info(message);
      await db.draft_set_logs.where({ exercise_id: exerciseId, session_id: propCurrentSessionId }).delete();
      const draftPayloads: LocalDraftSetLog[] = newSets.map((set, index) => ({
        exercise_id: exerciseId, set_index: index, session_id: propCurrentSessionId,
        weight_kg: set.weight_kg, reps: set.reps, reps_l: set.reps_l, reps_r: set.reps_r, time_seconds: set.time_seconds,
      }));
      await db.draft_set_logs.bulkPut(draftPayloads);
    }
  }, [sets.length, propCurrentSessionId, getProgressionSuggestion, exerciseId]);

  return {
    sets,
    handleAddSet,
    handleInputChange,
    handleSaveSet,
    handleEditSet,
    handleDeleteSet,
    handleSaveExercise,
    exercisePR,
    loadingPR,
    handleSuggestProgression,
  };
};