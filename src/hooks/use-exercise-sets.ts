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
import { useLiveQuery } from 'dexie-react-hooks'; // Import useLiveQuery

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;
type Profile = Tables<'profiles'>;
type UserExercisePR = Tables<'user_exercise_prs'>;

// Define a type for the numeric fields that can be updated via input
type NumericSetLogFields = 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds';

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  // Removed initialSets prop
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseComplete: (exerciseId: string, isNewPR: boolean) => Promise<void>;
  workoutTemplateName: string;
  exerciseNumber: number;
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => void;
  handleInputChange: (setIndex: number, field: NumericSetLogFields, value: string) => void; // Updated field type
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

// Helper function to validate if an ID is a non-empty string
const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

// Helper function to validate a composite key for draft_set_logs
const isValidDraftKey = (exerciseId: string | null | undefined, setIndex: number | null | undefined): boolean => {
  return isValidId(exerciseId) && typeof setIndex === 'number' && setIndex >= 0;
};

export const useExerciseSets = ({
  exerciseId,
  exerciseName,
  exerciseType,
  exerciseCategory,
  currentSessionId: propCurrentSessionId,
  supabase,
  onUpdateSets,
  // Removed initialSets prop
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
  workoutTemplateName,
  exerciseNumber,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const { session } = useSession(); // Get session for RPC calls

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

  // Use useLiveQuery to reactively get sets from IndexedDB drafts
  const sets = useLiveQuery(async () => {
    if (!isValidId(exerciseId)) {
      return [];
    }

    const drafts = await db.draft_set_logs
      .where('exercise_id').equals(exerciseId)
      .filter(draft => draft.session_id === propCurrentSessionId)
      .sortBy('set_index');

    let loadedSets: SetLogState[] = [];

    if (drafts.length > 0) {
      loadedSets = drafts.map(draft => ({
        id: draft.set_log_id || null,
        created_at: null, // Will be set on actual save
        session_id: draft.session_id,
        exercise_id: draft.exercise_id,
        weight_kg: draft.weight_kg,
        reps: draft.reps,
        reps_l: draft.reps_l,
        reps_r: draft.reps_r,
        time_seconds: draft.time_seconds,
        is_pb: false, // This is determined on save
        isSaved: draft.isSaved || false, // Use draft's isSaved status
        isPR: false, // This is determined on save
        lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
      }));
    } else {
      // If no drafts, create default empty sets and save them as drafts
      for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
        const newSet: SetLogState = {
          id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
          weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
          is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
        };
        loadedSets.push(newSet);
        const draftPayload: LocalDraftSetLog = {
          exercise_id: exerciseId, set_index: i, session_id: propCurrentSessionId,
          weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
          isSaved: false, set_log_id: null,
        };
        // Assert key validity before put
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in useLiveQuery init: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        await db.draft_set_logs.put(draftPayload);
      }
    }

    // Fetch last sets for comparison (this part remains the same)
    const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
    if (session) {
      const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
        p_user_id: session.user.id,
        p_exercise_id: exerciseId,
      });
      if (rpcError && rpcError.code !== 'PGRST116') { 
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
    return finalSets;
  }, [exerciseId, propCurrentSessionId, supabase, session, exerciseName]);

  // Notify parent component when sets change (derived from IndexedDB)
  useEffect(() => {
    if (sets) { // Ensure sets is not undefined during initial load
      onUpdateSets(exerciseId, sets);
    }
  }, [sets, exerciseId, onUpdateSets]);

  const handleAddSet = useCallback(async () => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleAddSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot add set: exercise information is incomplete.");
      return;
    }
    if (!sets || sets.length >= MAX_SETS) { // Check sets for undefined/null
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    
    const newSetIndex = sets.length; // This is the set_index for the new draft
    const lastSet = sets[sets.length - 1]; // Get last set from current state

    const newSet: SetLogState = {
      id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
      weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
      is_pb: false, isSaved: false, isPR: false,
      lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastRepsL: lastSet?.reps_l, lastRepsR: lastSet?.reps_r, lastTimeSeconds: lastSet?.time_seconds,
    };
    const draftPayload: LocalDraftSetLog = {
      exercise_id: exerciseId, set_index: newSetIndex, session_id: propCurrentSessionId,
      weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
      isSaved: false, set_log_id: null,
    };
    // Assert key validity before put
    console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleAddSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
    await db.draft_set_logs.put(draftPayload);
    // useLiveQuery will automatically update the 'sets' state
  }, [exerciseId, propCurrentSessionId, sets]); // Add sets to dependency array

  const handleInputChange = useCallback(async (setIndex: number, field: NumericSetLogFields, value: string) => { // Updated field type
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleInputChange: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot update set: exercise information is incomplete.");
      return;
    }
    if (!sets || !sets[setIndex]) return; // Ensure sets and specific set exist

    let parsedValue: number | null = parseFloat(value);
    if (isNaN(parsedValue)) parsedValue = null;

    const updatedSet = { ...sets[setIndex] };
    if (field === 'weight_kg' && parsedValue !== null) {
      updatedSet[field] = convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg');
    } else {
      updatedSet[field] = parsedValue;
    }
    updatedSet.isSaved = false; // Mark as unsaved when input changes

    const draftPayload: LocalDraftSetLog = {
      exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
      weight_kg: updatedSet.weight_kg, reps: updatedSet.reps, reps_l: updatedSet.reps_l, reps_r: updatedSet.reps_r, time_seconds: updatedSet.time_seconds,
      isSaved: false, set_log_id: updatedSet.id,
    };
    // Assert key validity before put
    console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleInputChange: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
    await db.draft_set_logs.put(draftPayload);
    // useLiveQuery will automatically update the 'sets' state
  }, [exerciseId, propCurrentSessionId, preferredWeightUnit, sets]); // Add sets to dependency array

  const handleSaveSet = useCallback(async (setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot save set: exercise information is incomplete.");
      return;
    }
    if (!sets || !sets[setIndex]) return; // Ensure sets and specific set exist

    const currentSet = sets[setIndex];

    let sessionIdToUse = propCurrentSessionId;
    if (!sessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        sessionIdToUse = newSessionId;
      } catch (err) {
        toast.error("Failed to start workout session.");
        return;
      }
    }

    const { savedSet } = await saveSetToDb(currentSet, setIndex, sessionIdToUse);
    if (savedSet) {
      // Update the draft to mark it as saved and link to the actual set_log_id
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: sessionIdToUse,
        weight_kg: savedSet.weight_kg, reps: savedSet.reps, reps_l: savedSet.reps_l, reps_r: savedSet.reps_r, time_seconds: savedSet.time_seconds,
        isSaved: true, set_log_id: savedSet.id,
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveSet update: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      await db.draft_set_logs.put(draftPayload);
      // useLiveQuery will automatically update the 'sets' state
    } else {
      toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
      // If save fails, revert isSaved status in draft
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: sessionIdToUse,
        weight_kg: currentSet.weight_kg, reps: currentSet.reps, reps_l: currentSet.reps_l, reps_r: currentSet.reps_r, time_seconds: currentSet.time_seconds,
        isSaved: false, set_log_id: currentSet.id,
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveSet rollback: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      await db.draft_set_logs.put(draftPayload);
    }
  }, [sets, propCurrentSessionId, saveSetToDb, exerciseId, onFirstSetSaved]);

  const handleEditSet = useCallback(async (setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleEditSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot edit set: exercise information is incomplete.");
      return;
    }
    if (!sets || !sets[setIndex]) return; // Ensure sets and specific set exist

    const updatedSet = { ...sets[setIndex], isSaved: false };
    const draftPayload: LocalDraftSetLog = {
      exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
      weight_kg: updatedSet.weight_kg, reps: updatedSet.reps, reps_l: updatedSet.reps_l, reps_r: updatedSet.reps_r, time_seconds: updatedSet.time_seconds,
      isSaved: false, set_log_id: updatedSet.id,
    };
    // Assert key validity before put
    console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleEditSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
    await db.draft_set_logs.put(draftPayload);
    // useLiveQuery will automatically update the 'sets' state
  }, [exerciseId, propCurrentSessionId, sets]); // Add sets to dependency array

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleDeleteSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot delete set: exercise information is incomplete.");
      return;
    }
    if (!sets || !sets[setIndex]) return; // Ensure sets and specific set exist

    const setToDelete = sets[setIndex];
    
    // Delete the draft from IndexedDB
    console.assert(isValidDraftKey(exerciseId, setIndex), `Invalid draft key in handleDeleteSet delete: [${exerciseId}, ${setIndex}]`);
    await db.draft_set_logs.delete([exerciseId, setIndex]);
    toast.success("Set removed.");

    if (!setToDelete.id) return; // If it was never saved to the main set_logs table, no need to delete from there

    const success = await deleteSetFromDb(setToDelete.id);
    if (!success) {
      toast.error("Failed to delete set from database. Please try again.");
      // If deletion from remote fails, re-add the draft locally
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
        weight_kg: setToDelete.weight_kg, reps: setToDelete.reps, reps_l: setToDelete.reps_l, reps_r: setToDelete.reps_r, time_seconds: setToDelete.time_seconds,
        isSaved: setToDelete.isSaved, set_log_id: setToDelete.id,
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleDeleteSet rollback: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      await db.draft_set_logs.put(draftPayload);
    }
  }, [sets, deleteSetFromDb, exerciseId, propCurrentSessionId]); // Add sets to dependency array

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveExercise: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot save exercise: exercise information is incomplete.");
      return false;
    }
    if (!sets) return false; // Ensure sets is not undefined/null

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

    let hasError = false;

    for (let i = 0; i < sets.length; i++) {
      const currentSet = sets[i];
      const hasDataForSet = (currentSet.weight_kg ?? 0) > 0 || (currentSet.reps ?? 0) > 0 || (currentSet.time_seconds ?? 0) > 0 || (currentSet.reps_l ?? 0) > 0 || (currentSet.reps_r ?? 0) > 0;

      if (hasDataForSet && !currentSet.isSaved) {
        const { savedSet } = await saveSetToDb(currentSet, i, currentSessionIdToUse);
        if (savedSet) {
          // Update the draft to mark it as saved and link to the actual set_log_id
          const draftPayload: LocalDraftSetLog = {
            exercise_id: exerciseId, set_index: i, session_id: currentSessionIdToUse,
            weight_kg: savedSet.weight_kg, reps: savedSet.reps, reps_l: savedSet.reps_l, reps_r: savedSet.reps_r, time_seconds: savedSet.time_seconds,
            isSaved: true, set_log_id: savedSet.id,
          };
          console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveExercise update: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
          await db.draft_set_logs.put(draftPayload);
        } else {
          hasError = true;
        }
      }
    }

    if (hasError) return false;

    try {
      const isNewPROverall = await updateExercisePRStatus(currentSessionIdToUse, sets); // Pass current 'sets' state
      await onExerciseComplete(exerciseId, isNewPROverall);
      
      // All drafts for this exercise and session should be cleared once the exercise is "completed"
      const draftsToDelete = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .filter(draft => draft.session_id === currentSessionIdToUse)
        .toArray();

      if (draftsToDelete.length > 0) {
        const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
        console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in handleSaveExercise bulkDelete: ${JSON.stringify(keysToDelete)}`);
        await db.draft_set_logs.bulkDelete(keysToDelete);
      }
      return true;
    } catch (err: any) {
      console.error("Error saving exercise completion or PR:", err);
      toast.error("Failed to complete exercise: " + err.message);
      return false;
    }
  }, [sets, exerciseId, onExerciseComplete, onFirstSetSaved, propCurrentSessionId, saveSetToDb, updateExercisePRStatus]);

  const handleSuggestProgression = useCallback(async () => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSuggestProgression: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot suggest progression: exercise information is incomplete.");
      return;
    }
    if (!sets) return; // Ensure sets is not undefined/null

    const { newSets, message } = await getProgressionSuggestion(sets.length, propCurrentSessionId);
    if (newSets) {
      // Delete all existing drafts for this exercise and session
      const draftsToDelete = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .filter(draft => draft.session_id === propCurrentSessionId)
        .toArray();

      if (draftsToDelete.length > 0) {
        const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
        console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in handleSuggestProgression bulkDelete: ${JSON.stringify(keysToDelete)}`);
        await db.draft_set_logs.bulkDelete(keysToDelete);
      }

      // Insert the new suggested sets as drafts
      const draftPayloads: LocalDraftSetLog[] = newSets.map((set, index) => ({
        exercise_id: exerciseId, set_index: index, session_id: propCurrentSessionId,
        weight_kg: set.weight_kg, reps: set.reps, reps_l: set.reps_l, reps_r: set.reps_r, time_seconds: set.time_seconds,
        isSaved: false, set_log_id: null,
      }));
      // Assert key validity before bulkPut
      console.assert(draftPayloads.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in handleSuggestProgression bulkPut: ${JSON.stringify(draftPayloads.map(d => [d.exercise_id, d.set_index]))}`);
      await db.draft_set_logs.bulkPut(draftPayloads);
      
      toast.info(message);
      // useLiveQuery will automatically update the 'sets' state
    }
  }, [sets, propCurrentSessionId, getProgressionSuggestion, exerciseId]);

  return {
    sets: sets || [], // Ensure sets is always an array, even if useLiveQuery is still loading
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