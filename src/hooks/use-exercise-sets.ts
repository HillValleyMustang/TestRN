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
  initialSets, // This prop will now be used for initial load only
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
  workoutTemplateName,
  exerciseNumber,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const { session } = useSession(); // Get session for RPC calls

  // Initialize sets state with initialSets directly. This runs only once on first render.
  const [sets, setSets] = useState<SetLogState[]>(initialSets); 

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

  // This effect is for LOADING sets. It uses the prop directly for the query to ensure stability.
  // It should only run when the exercise context changes, not when set content changes.
  useEffect(() => {
    const loadSets = async () => {
      const sessionIdForQuery = propCurrentSessionId;

      console.assert(isValidId(exerciseId), `Invalid exerciseId in loadSets: ${exerciseId}`);
      if (!isValidId(exerciseId)) {
        console.warn(`Skipping loadSets for invalid exerciseId: ${exerciseId}`);
        return;
      }

      let loadedSets: SetLogState[] = [];
      
      const allDraftsForExercise = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .toArray();
      
      const drafts = allDraftsForExercise
        .filter(draft => draft.session_id === sessionIdForQuery)
        .sort((a, b) => a.set_index - b.set_index);

      if (drafts.length > 0) {
        loadedSets = drafts.map(draft => ({
          id: draft.set_log_id || null, // Use set_log_id if available
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
        // If no drafts, use the initialSets provided by the parent.
        // This ensures that if the parent provides 3 sets, we start with 3 sets.
        // If initialSets is empty, then create default empty sets.
        if (initialSets && initialSets.length > 0) {
            loadedSets = initialSets.map(set => ({ ...set, session_id: sessionIdForQuery }));
        } else {
            for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
                loadedSets.push({
                    id: null, created_at: null, session_id: sessionIdForQuery, exercise_id: exerciseId,
                    weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
                    is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
                });
            }
        }
      }

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
      setSets(finalSets);
    };

    // Only run when the exercise or session context changes, not when set content changes
    loadSets();
  }, [exerciseId, propCurrentSessionId, supabase, session, exerciseName]); // Removed initialSets from dependencies

  useEffect(() => {
    onUpdateSets(exerciseId, sets);
  }, [sets, exerciseId, onUpdateSets]);

  const handleAddSet = useCallback(() => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleAddSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot add set: exercise information is incomplete.");
      return;
    }
    if (sets.length >= MAX_SETS) {
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    setSets(prev => {
      const lastSet = prev[prev.length - 1];
      const newSetIndex = prev.length; // This is the set_index for the new draft
      const newSet: SetLogState = {
        id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false,
        lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastRepsL: lastSet?.reps_l, lastRepsR: lastSet?.reps_r, lastTimeSeconds: lastSet?.time_seconds,
      };
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: newSetIndex, session_id: propCurrentSessionId,
        weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
        isSaved: false, set_log_id: null, // NEW
      };
      // Assert key validity before put
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleAddSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return [...prev, newSet];
    });
  }, [exerciseId, propCurrentSessionId, sets.length]);

  const handleInputChange = useCallback((setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleInputChange: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
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
      newSets[setIndex].isSaved = false; // Mark as unsaved when input changes

      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
        weight_kg: newSets[setIndex].weight_kg, reps: newSets[setIndex].reps, reps_l: newSets[setIndex].reps_l, reps_r: newSets[setIndex].reps_r, time_seconds: newSets[setIndex].time_seconds,
        isSaved: false, set_log_id: newSets[setIndex].id, // NEW: Keep set_log_id if it exists
      };
      // Assert key validity before put
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleInputChange: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return newSets;
    });
  }, [exerciseId, propCurrentSessionId, preferredWeightUnit]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
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
        sessionIdToUse = newSessionId; // <--- propCurrentSessionId is updated here in parent
      } catch (err) {
        toast.error("Failed to start workout session.");
        setSets(previousSets); // Rollback optimistic update
        return;
      }
    }

    const { savedSet } = await saveSetToDb(currentSet, setIndex, sessionIdToUse);
    if (savedSet) {
      // Update local state with the saved set's actual ID and session_id
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = { ...savedSet, session_id: sessionIdToUse };
        return newSets;
      });
      // Update the draft to mark it as saved and link to the actual set_log_id
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: sessionIdToUse,
        weight_kg: savedSet.weight_kg, reps: savedSet.reps, reps_l: savedSet.reps_l, reps_r: savedSet.reps_r, time_seconds: savedSet.time_seconds,
        isSaved: true, set_log_id: savedSet.id, // NEW: Mark as saved and link ID
      };
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveSet update: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload); // Update the draft, don't delete
    } else {
      setSets(previousSets); // Rollback on failure
      toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
    }
  }, [sets, propCurrentSessionId, saveSetToDb, exerciseId, onFirstSetSaved]);

  const handleEditSet = useCallback((setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleEditSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot edit set: exercise information is incomplete.");
      return;
    }
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
        weight_kg: updatedSets[setIndex].weight_kg, reps: updatedSets[setIndex].reps, reps_l: updatedSets[setIndex].reps_l, reps_r: updatedSets[setIndex].reps_r, time_seconds: updatedSets[setIndex].time_seconds,
        isSaved: false, set_log_id: updatedSets[setIndex].id, // NEW: Keep set_log_id if it exists
      };
      // Assert key validity before put
      console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleEditSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
      db.draft_set_logs.put(draftPayload);
      return updatedSets;
    });
  }, [exerciseId, propCurrentSessionId]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleDeleteSet: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
      toast.error("Cannot delete set: exercise information is incomplete.");
      return;
    }
    const setToDelete = sets[setIndex];
    const previousSets = sets;
    setSets(prev => prev.filter((_, i) => i !== setIndex));
    
    // Delete the draft from IndexedDB
    console.assert(isValidDraftKey(exerciseId, setIndex), `Invalid draft key in handleDeleteSet delete: [${exerciseId}, ${setIndex}]`);
    db.draft_set_logs.delete([exerciseId, setIndex]);
    toast.success("Set removed.");

    if (!setToDelete.id) return; // If it was never saved to the main set_logs table, no need to delete from there

    const success = await deleteSetFromDb(setToDelete.id);
    if (!success) {
      setSets(previousSets);
      toast.error("Failed to delete set from database. Please try again.");
    }
  }, [sets, deleteSetFromDb, exerciseId]);

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
    console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveExercise: ${exerciseId}`);
    if (!isValidId(exerciseId)) {
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
      
      // FIX: More robust deletion from draft_set_logs to handle null currentSessionIdToUse
      // All drafts for this exercise and session should be cleared once the exercise is "completed"
      const draftsToDelete = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .filter(draft => draft.session_id === currentSessionIdToUse) // Filter by session_id, including null
        .toArray();

      if (draftsToDelete.length > 0) {
        // Assert key validity before bulkDelete
        console.assert(draftsToDelete.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in handleSaveExercise bulkDelete: ${JSON.stringify(draftsToDelete.map(d => [d.exercise_id, d.set_index]))}`);
        await db.draft_set_logs.bulkDelete(draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number])); // Explicitly cast to tuple
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
    const { newSets, message } = await getProgressionSuggestion(sets.length, propCurrentSessionId);
    if (newSets) {
      // FIX: More robust deletion from draft_set_logs to handle null propCurrentSessionId
      const draftsToDelete = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .filter(draft => draft.session_id === propCurrentSessionId) // Filter by session_id, including null
        .toArray();

      if (draftsToDelete.length > 0) {
        // Assert key validity before bulkDelete
        console.assert(draftsToDelete.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in handleSuggestProgression bulkDelete: ${JSON.stringify(draftsToDelete.map(d => [d.exercise_id, d.set_index]))}`);
        await db.draft_set_logs.bulkDelete(draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number])); // Explicitly cast to tuple
      }

      const draftPayloads: LocalDraftSetLog[] = newSets.map((set, index) => ({
        exercise_id: exerciseId, set_index: index, session_id: propCurrentSessionId,
        weight_kg: set.weight_kg, reps: set.reps, reps_l: set.reps_l, reps_r: set.reps_r, time_seconds: set.time_seconds,
        isSaved: false, set_log_id: null, // NEW: Mark as unsaved
      }));
      // Assert key validity before bulkPut
      console.assert(draftPayloads.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in handleSuggestProgression bulkPut: ${JSON.stringify(draftPayloads.map(d => [d.exercise_id, d.set_index]))}`);
      await db.draft_set_logs.bulkPut(draftPayloads);
      
      setSets(newSets);
      toast.info(message);
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