"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalDraftSetLog } from '@/lib/db';
import { SetLogState, Tables, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

const DEFAULT_INITIAL_SETS = 3;

const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

const isValidDraftKey = (exerciseId: string | null | undefined, setIndex: number | null | undefined): boolean => {
  return isValidId(exerciseId) && typeof setIndex === 'number' && setIndex >= 0;
};

interface UseSetDraftsProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
}

interface UseSetDraftsReturn {
  sets: SetLogState[];
  loadingDrafts: boolean;
  updateDraft: (setIndex: number, updatedSet: Partial<SetLogState>) => Promise<void>;
  addDraft: (newSet: SetLogState) => Promise<void>;
  deleteDraft: (setIndex: number) => Promise<void>;
  fetchLastSets: () => Promise<Map<string, GetLastExerciseSetsForExerciseReturns>>;
}

export const useSetDrafts = ({
  exerciseId,
  exerciseName,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  supabase,
}: UseSetDraftsProps): UseSetDraftsReturn => {
  const { session } = useSession();

  const drafts = useLiveQuery(async () => {
    if (!isValidId(exerciseId)) {
      return [];
    }
    return db.draft_set_logs
      .where('exercise_id').equals(exerciseId)
      .filter(draft => draft.session_id === currentSessionId)
      .sortBy('set_index');
  }, [exerciseId, currentSessionId]);

  const [sets, setSets] = useState<SetLogState[]>([]);
  const loadingDrafts = drafts === undefined;

  const createInitialDrafts = useCallback(async () => {
    if (!isValidId(exerciseId)) return;

    const draftPayloads: LocalDraftSetLog[] = [];
    for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
      const newSet: SetLogState = {
        id: null, created_at: null, session_id: currentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
      };
      draftPayloads.push({
        exercise_id: exerciseId, set_index: i, session_id: currentSessionId,
        weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
        isSaved: false, set_log_id: null, is_pb: false,
      });
    }
    console.assert(draftPayloads.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in createInitialDrafts bulkPut: ${JSON.stringify(draftPayloads.map(d => [d.exercise_id, d.set_index]))}`);
    await db.draft_set_logs.bulkPut(draftPayloads);
  }, [exerciseId, currentSessionId]);

  const fetchLastSets = useCallback(async () => {
    if (!session || !isValidId(exerciseId)) return new Map<string, GetLastExerciseSetsForExerciseReturns>();
    
    const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
      p_user_id: session.user.id,
      p_exercise_id: exerciseId,
    });

    if (rpcError && rpcError.code !== 'PGRST116') { 
      console.error(`[useSetDrafts] Error fetching last sets for exercise ${exerciseName}:`, rpcError);
      return new Map<string, GetLastExerciseSetsForExerciseReturns>();
    }
    
    const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
    if (lastExerciseSets) {
      lastSetsMap.set(exerciseId, lastExerciseSets);
    }
    return lastSetsMap;
  }, [session, supabase, exerciseId, exerciseName]);

  useEffect(() => {
    const processAndSetSets = async () => {
      if (loadingDrafts || !isValidId(exerciseId)) return;

      let loadedSets: SetLogState[] = [];

      if (drafts && drafts.length > 0) {
        loadedSets = drafts.map((draft: LocalDraftSetLog) => ({
          id: draft.set_log_id || null, // Use set_log_id if available
          created_at: null, // This will be populated from actual set_log if it exists
          session_id: draft.session_id,
          exercise_id: draft.exercise_id,
          weight_kg: draft.weight_kg,
          reps: draft.reps,
          reps_l: draft.reps_l,
          reps_r: draft.reps_r,
          time_seconds: draft.time_seconds,
          is_pb: draft.is_pb || false, // Use is_pb from draft
          isSaved: draft.isSaved || false, // Use isSaved from draft
          isPR: draft.is_pb || false, // This is for set-level PR, derived from draft.is_pb
          lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
        }));
      } else {
        createInitialDrafts();
        return;
      }

      const lastSetsMap = await fetchLastSets();

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

        processAndSetSets();
      }, [drafts, loadingDrafts, exerciseId, currentSessionId, exerciseName, createInitialDrafts, fetchLastSets]);

  const updateDraft = useCallback(async (setIndex: number, updatedSet: Partial<SetLogState>) => {
    if (!isValidDraftKey(exerciseId, setIndex)) return;

    const currentDraft = await db.draft_set_logs.get([exerciseId, setIndex]);
    if (!currentDraft) return;

    const newDraft: LocalDraftSetLog = {
      ...currentDraft,
      // Spread properties from updatedSet, ensuring explicit handling for optional/nullable fields
      weight_kg: updatedSet.weight_kg !== undefined ? updatedSet.weight_kg : currentDraft.weight_kg,
      reps: updatedSet.reps !== undefined ? updatedSet.reps : currentDraft.reps,
      reps_l: updatedSet.reps_l !== undefined ? updatedSet.reps_l : currentDraft.reps_l,
      reps_r: updatedSet.reps_r !== undefined ? updatedSet.reps_r : currentDraft.reps_r,
      time_seconds: updatedSet.time_seconds !== undefined ? updatedSet.time_seconds : currentDraft.time_seconds,
      isSaved: updatedSet.isSaved !== undefined ? updatedSet.isSaved : currentDraft.isSaved,
      is_pb: updatedSet.is_pb !== undefined ? updatedSet.is_pb : currentDraft.is_pb,
      
      // Ensure exercise_id and set_index are always set
      exercise_id: exerciseId, 
      set_index: setIndex, 
      session_id: updatedSet.session_id !== undefined ? updatedSet.session_id : currentDraft.session_id,
      set_log_id: updatedSet.id !== undefined ? updatedSet.id : currentDraft.set_log_id,
    };
    console.assert(isValidDraftKey(newDraft.exercise_id, newDraft.set_index), `Invalid draft key in updateDraft put: [${newDraft.exercise_id}, ${newDraft.set_index}]`);
    await db.draft_set_logs.put(newDraft);
  }, [exerciseId]);

  const addDraft = useCallback(async (newSet: SetLogState) => {
    const newSetIndex = sets.length;
    const draftPayload: LocalDraftSetLog = {
      exercise_id: exerciseId, set_index: newSetIndex, session_id: currentSessionId,
      weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
      isSaved: newSet.isSaved, set_log_id: newSet.id, is_pb: newSet.is_pb,
    };
    console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in addDraft put: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
    await db.draft_set_logs.put(draftPayload);
  }, [exerciseId, currentSessionId, sets.length]);

  const deleteDraft = useCallback(async (setIndex: number) => {
    if (!isValidDraftKey(exerciseId, setIndex)) return;
    console.assert(isValidDraftKey(exerciseId, setIndex), `Invalid draft key in deleteDraft delete: [${exerciseId}, ${setIndex}]`);
    await db.draft_set_logs.delete([exerciseId, setIndex]);
  }, [exerciseId]);

  return {
    sets,
    loadingDrafts,
    updateDraft,
    addDraft,
    deleteDraft,
    fetchLastSets,
  };
};