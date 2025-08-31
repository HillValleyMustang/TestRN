"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
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

const areSetsEqual = (a: SetLogState[], b: SetLogState[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const setA = a[i];
    const setB = b[i];
    if (
      setA.lastWeight !== setB.lastWeight ||
      setA.lastReps !== setB.lastReps ||
      setA.lastRepsL !== setB.lastRepsL ||
      setA.lastRepsR !== setB.lastRepsR ||
      setA.lastTimeSeconds !== setB.lastTimeSeconds ||
      setA.session_id !== setB.session_id
    ) {
      return false;
    }
  }
  return true;
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

  const [internalSessionId, setInternalSessionId] = useState<string | null>(propCurrentSessionId);

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

  // Effect to load drafts or initial sets
  useEffect(() => {
    const loadSets = async () => {
      const loadedSets: SetLogState[] = [];
      const drafts = await db.draft_set_logs
        .where({ exercise_id: exerciseId, session_id: internalSessionId })
        .sortBy('set_index');

      if (drafts.length > 0) {
        // Load from drafts
        drafts.forEach(draft => {
          loadedSets.push({
            id: null, // Drafts don't have a DB ID yet
            created_at: null,
            session_id: draft.session_id,
            exercise_id: draft.exercise_id,
            weight_kg: draft.weight_kg,
            reps: draft.reps,
            reps_l: draft.reps_l,
            reps_r: draft.reps_r,
            time_seconds: draft.time_seconds,
            is_pb: false,
            isSaved: false, // Drafts are not "saved" in the DB sense
            isPR: false,
            lastWeight: null, // Will be fetched separately
            lastReps: null,
            lastRepsL: null,
            lastRepsR: null,
            lastTimeSeconds: null,
          });
        });
      } else if (initialSets.length > 0) {
        // Load from initialSets if no drafts
        initialSets.forEach(set => loadedSets.push({ ...set, session_id: internalSessionId }));
      } else {
        // Default initial sets if neither drafts nor initialSets exist
        for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
          loadedSets.push({
            id: null, created_at: null, session_id: internalSessionId, exercise_id: exerciseId,
            weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
            is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
          });
        }
      }

      // Fetch last attempt data for all loaded sets
      const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
      if (session) { // Ensure session exists before RPC call
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
  }, [exerciseId, internalSessionId, initialSets, supabase, session, exerciseName]); // Added session and exerciseName to dependencies

  useEffect(() => {
    setInternalSessionId(propCurrentSessionId);
  }, [propCurrentSessionId]);

  useEffect(() => {
    onUpdateSets(exerciseId, sets);
  }, [sets, exerciseId, onUpdateSets]);

  const handleAddSet = useCallback(() => {
    if (sets.length >= MAX_SETS) {
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    setSets(prev => {
      const lastSet = prev[prev.length - 1];
      const newSet: SetLogState = {
        id: null,
        created_at: null,
        session_id: internalSessionId,
        exercise_id: exerciseId,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        isSaved: false,
        isPR: false,
        lastWeight: lastSet?.weight_kg,
        lastReps: lastSet?.reps,
        lastRepsL: lastSet?.reps_l,
        lastRepsR: lastSet?.reps_r,
        lastTimeSeconds: lastSet?.time_seconds,
      };
      // Save new set as a draft immediately
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId,
        set_index: prev.length, // Use current length as index for new set
        session_id: internalSessionId,
        weight_kg: newSet.weight_kg,
        reps: newSet.reps,
        reps_l: newSet.reps_l,
        reps_r: newSet.reps_r,
        time_seconds: newSet.time_seconds,
      };
      console.log("[DEBUG] Adding draft set:", draftPayload); // Debug log
      db.draft_set_logs.put(draftPayload); // No await needed, fire and forget
      return [...prev, newSet];
    });
  }, [exerciseId, internalSessionId, sets.length]);

  const handleInputChange = useCallback((setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => {
    setSets(prev => {
      const newSets = [...prev];
      let parsedValue: number | null = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = null;

      if (field === 'weight_kg' && parsedValue !== null) {
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg')
        };
      } else {
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: parsedValue
        };
      }
      newSets[setIndex].isSaved = false;

      // Save draft to IndexedDB
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId,
        set_index: setIndex,
        session_id: internalSessionId,
        weight_kg: newSets[setIndex].weight_kg,
        reps: newSets[setIndex].reps,
        reps_l: newSets[setIndex].reps_l,
        reps_r: newSets[setIndex].reps_r,
        time_seconds: newSets[setIndex].time_seconds,
      };
      console.log("[DEBUG] Updating draft set:", draftPayload); // Debug log
      db.draft_set_logs.put(draftPayload); // No await needed, fire and forget

      return newSets;
    });
  }, [exerciseId, internalSessionId, preferredWeightUnit]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    const currentSet = sets[setIndex];
    const hasData = (currentSet.weight_kg !== null && currentSet.weight_kg > 0) ||
                    (currentSet.reps !== null && currentSet.reps > 0) ||
                    (currentSet.time_seconds !== null && currentSet.time_seconds > 0) ||
                    (currentSet.reps_l !== null && currentSet.reps_l > 0) ||
                    (currentSet.reps_r !== null && currentSet.reps_r > 0);

    if (!hasData) {
      toast.error(`Set ${setIndex + 1}: Please input data before saving.`);
      return;
    }

    // Optimistic update: Mark set as saved immediately in UI
    const previousSets = sets;
    setSets(prev => {
      const newSets = [...prev];
      newSets[setIndex] = { ...newSets[setIndex], isSaved: true };
      return newSets;
    });

    if (!internalSessionId) {
      if (exerciseNumber === 1 && setIndex === 0) {
        toast.info("Don't forget to hit 'Save Exercise' once you're done to start the Workout Session.");
      }
      // Clear draft for this set as it's now "optimistically saved"
      console.log("[DEBUG] Deleting draft set (optimistic save):", [exerciseId, setIndex]); // Debug log
      db.draft_set_logs.delete([exerciseId, setIndex]);
      return;
    }

    const { savedSet } = await saveSetToDb(currentSet, setIndex, internalSessionId);
    if (savedSet) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = savedSet;
        // Clear draft for this set
        console.log("[DEBUG] Deleting draft set (successful save):", [exerciseId, setIndex]); // Debug log
        db.draft_set_logs.delete([exerciseId, setIndex]);
        return newSets;
      });
    } else {
      // Rollback: If save failed, revert UI state
      setSets(previousSets);
      toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
    }
  }, [sets, internalSessionId, saveSetToDb, exerciseId, exerciseNumber]); // Added exerciseId to dependencies

  const handleEditSet = useCallback((setIndex: number) => {
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      // Re-save as draft to allow editing
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId,
        set_index: setIndex,
        session_id: internalSessionId,
        weight_kg: updatedSets[setIndex].weight_kg,
        reps: updatedSets[setIndex].reps,
        reps_l: updatedSets[setIndex].reps_l,
        reps_r: updatedSets[setIndex].reps_r,
        time_seconds: updatedSets[setIndex].time_seconds,
      };
      console.log("[DEBUG] Editing draft set:", draftPayload); // Debug log
      db.draft_set_logs.put(draftPayload);
      return updatedSets;
    });
  }, [exerciseId, internalSessionId]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    const setToDelete = sets[setIndex];
    
    // Optimistic update: Remove set from UI immediately
    const previousSets = sets;
    setSets(prev => prev.filter((_, i) => i !== setIndex));
    // Clear draft for this set
    console.log("[DEBUG] Deleting draft set (from UI):", [exerciseId, setIndex]); // Debug log
    db.draft_set_logs.delete([exerciseId, setIndex]);
    toast.success("Set removed.");

    if (!setToDelete.id) {
      // If it was an unsaved set (no DB ID), no further action needed
      return;
    }

    // Attempt to delete from DB
    const success = await deleteSetFromDb(setToDelete.id);
    if (!success) {
      // Rollback: If delete failed, revert UI state
      setSets(previousSets);
      toast.error("Failed to delete set from database. Please try again.");
    }
  }, [sets, deleteSetFromDb, exerciseId]); // Added exerciseId to dependencies

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
    let currentSessionIdToUse = internalSessionId;

    if (!currentSessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        currentSessionIdToUse = newSessionId;
        setInternalSessionId(newSessionId);
      } catch (err) {
        toast.error("Failed to start workout session. Please try again.");
        console.error("Error creating session on first set save:", err);
        return false;
      }
    }

    const updatedSetsState: SetLogState[] = [];
    let hasError = false;

    for (let i = 0; i < sets.length; i++) {
      const currentSet = sets[i];
      const hasData = (currentSet.weight_kg !== null && currentSet.weight_kg > 0) ||
                      (currentSet.reps !== null && currentSet.reps > 0) ||
                      (currentSet.time_seconds !== null && currentSet.time_seconds > 0) ||
                      (currentSet.reps_l !== null && currentSet.reps_l > 0) ||
                      (currentSet.reps_r !== null && currentSet.reps_r > 0);

      if (hasData && !currentSet.isSaved) {
        console.log(`[DEBUG] handleSaveExercise: Attempting to save set ${i + 1} (ID: ${currentSet.id})`);
        const { savedSet } = await saveSetToDb(currentSet, i, currentSessionIdToUse);
        if (savedSet) {
          console.log(`[DEBUG] handleSaveExercise: Successfully saved set ${i + 1}, new ID: ${savedSet.id}`);
          updatedSetsState.push(savedSet);
        } else {
          console.error(`[DEBUG] handleSaveExercise: Failed to save set ${i + 1}`);
          hasError = true;
          updatedSetsState.push(currentSet);
        }
      } else if (hasData && currentSet.isSaved) {
        console.log(`[DEBUG] handleSaveExercise: Set ${i + 1} already saved, skipping DB operation.`);
        updatedSetsState.push(currentSet);
      } else {
        console.log(`[DEBUG] handleSaveExercise: Set ${i + 1} has no data, skipping.`);
        updatedSetsState.push(currentSet);
      }
    }

    setSets(updatedSetsState);

    if (hasError) {
      return false;
    }

    const hasAnyValidSetData = updatedSetsState.some(s =>
      (s.weight_kg !== null && s.weight_kg > 0) ||
      (s.reps !== null && s.reps > 0) ||
      (s.time_seconds !== null && s.time_seconds > 0) ||
      (s.reps_l !== null && s.reps_l > 0) ||
      (s.reps_r !== null && s.reps_r > 0)
    );

    if (!hasAnyValidSetData) {
      toast.error("No valid sets to save. Please input data for at least one set.");
      return false;
    }

    try {
      const isNewPROverall = await updateExercisePRStatus(currentSessionIdToUse, updatedSetsState);
      await onExerciseComplete(exerciseId, isNewPROverall);
      // Clear all drafts for this exercise after successful completion
      console.log("[DEBUG] Clearing all drafts for exercise after completion:", exerciseId); // Debug log
      await db.draft_set_logs.where({ exercise_id: exerciseId }).delete();
      return true;
    } catch (err: any) {
      console.error("Error saving exercise completion or PR:", err);
      toast.error("Failed to complete exercise: " + err.message);
      return false;
    }
  }, [sets, exerciseId, onExerciseComplete, onFirstSetSaved, internalSessionId, saveSetToDb, updateExercisePRStatus]);

  const handleSuggestProgression = useCallback(async () => {
    const { newSets, message } = await getProgressionSuggestion(sets.length, internalSessionId);
    if (newSets) {
      setSets(newSets);
      toast.info(message);
      // Save newly suggested sets as drafts
      console.log("[DEBUG] Deleting existing drafts for progression suggestion:", { exercise_id: exerciseId, session_id: internalSessionId }); // Debug log
      await db.draft_set_logs.where({ exercise_id: exerciseId, session_id: internalSessionId }).delete(); // Clear existing drafts first
      const draftPayloads: LocalDraftSetLog[] = newSets.map((set, index) => ({
        exercise_id: exerciseId,
        set_index: index,
        session_id: internalSessionId,
        weight_kg: set.weight_kg,
        reps: set.reps,
        reps_l: set.reps_l,
        reps_r: set.reps_r,
        time_seconds: set.time_seconds,
      }));
      console.log("[DEBUG] Bulk putting suggested drafts:", draftPayloads); // Debug log
      await db.draft_set_logs.bulkPut(draftPayloads);
    }
  }, [sets.length, internalSessionId, getProgressionSuggestion, exerciseId]);

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