"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalDraftSetLog } from '@/lib/db';
import { SetLogState, Tables, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner'; // Import toast

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
  const { session, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId

  const drafts = useLiveQuery(async () => {
    if (!isValidId(exerciseId)) {
      return [];
    }
    try {
      const fetchedDrafts = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        // Removed the filter by session_id here to always fetch all drafts for the exercise
        .sortBy('set_index');
      return fetchedDrafts;
    } catch (error) {
      console.error(`Error fetching draft set logs for exercise ${exerciseId}:`, error);
      toast.error("Failed to load local set drafts.");
      return [];
    }
  }, [exerciseId]); // currentSessionId is no longer a dependency here

  const [sets, setSets] = useState<SetLogState[]>([]);
  const loadingDrafts = drafts === undefined;

  const createInitialDrafts = useCallback(async () => {
    if (!isValidId(exerciseId)) {
      return;
    }
    try {
      // Check for existing drafts for this exercise, regardless of session_id
      const existingDraftsCheck = await db.draft_set_logs
        .where('exercise_id').equals(exerciseId)
        .count();

      if (existingDraftsCheck > 0) {
        return;
      }

      const draftPayloads: LocalDraftSetLog[] = [];
      for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
        const newSet: SetLogState = {
          id: null, created_at: null, session_id: currentSessionId, exercise_id: exerciseId,
          weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
          is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
        };
        draftPayloads.push({
          exercise_id: exerciseId, set_index: i, session_id: newSet.session_id, // Use newSet.session_id (which is currentSessionId)
          weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
          isSaved: false, set_log_id: null,
          is_pb: false,
        });
      }
      await db.draft_set_logs.bulkPut(draftPayloads);
    } catch (error) {
      console.error(`Error creating initial draft sets for exercise ${exerciseId}:`, error);
      toast.error("Failed to create initial local set drafts.");
    }
  }, [exerciseId, currentSessionId]); // currentSessionId is a dependency here because it's used in the payload

  const fetchLastSets = useCallback(async () => {
    if (!memoizedSessionUserId || !isValidId(exerciseId)) return new Map<string, GetLastExerciseSetsForExerciseReturns>(); // Use memoized ID
    
    try {
      const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
        p_user_id: memoizedSessionUserId, // Use memoized ID
        p_exercise_id: exerciseId,
      });

      if (rpcError && rpcError.code !== 'PGRST116') { 
        console.error(`Error fetching last sets for exercise ${exerciseName}:`, rpcError);
        toast.error(`Failed to load previous sets for ${exerciseName}.`); // Changed to toast.error
        return new Map<string, GetLastExerciseSetsForExerciseReturns>();
      }
      
      const lastSetsMap = new Map<string, GetLastExerciseSetsForExerciseReturns>();
      if (lastExerciseSets) {
        lastSetsMap.set(exerciseId, lastExerciseSets);
      }
      return lastSetsMap;
    } catch (error) {
      console.error(`Unexpected error in fetchLastSets for exercise ${exerciseId}:`, error);
      toast.error(`Failed to load previous sets for ${exerciseName}.`); // Changed to toast.error
      return new Map<string, GetLastExerciseSetsForExerciseReturns>();
    }
  }, [memoizedSessionUserId, supabase, exerciseId, exerciseName]); // Depend on memoized ID

  // NEW: Effect to update session_id for existing drafts when currentSessionId becomes available
  useEffect(() => {
    const updateDraftSessionIds = async () => {
      if (currentSessionId && drafts && drafts.length > 0) {
        const draftsToUpdate = drafts.filter(d => d.session_id === null);
        if (draftsToUpdate.length > 0) {
          console.log(`[useSetDrafts] Updating ${draftsToUpdate.length} drafts to new session_id: ${currentSessionId}`);
          await db.transaction('rw', db.draft_set_logs, async () => {
            for (const draft of draftsToUpdate) {
              await db.draft_set_logs.update([draft.exercise_id, draft.set_index], { session_id: currentSessionId });
            }
          });
        }
      }
    };
    updateDraftSessionIds();
  }, [currentSessionId, drafts]); // Depend on currentSessionId and drafts

  useEffect(() => {
    const processAndSetSets = async () => {
      if (loadingDrafts || !isValidId(exerciseId)) {
        return;
      }

      if (drafts && drafts.length > 0) {
        const loadedSets = drafts.map((draft: LocalDraftSetLog) => ({
          id: draft.set_log_id || null,
          created_at: null,
          session_id: draft.session_id,
          exercise_id: draft.exercise_id,
          weight_kg: draft.weight_kg,
          reps: draft.reps,
          reps_l: draft.reps_l,
          reps_r: draft.reps_r,
          time_seconds: draft.time_seconds,
          is_pb: draft.is_pb || false,
          isSaved: draft.isSaved || false,
          isPR: draft.is_pb || false,
          lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
        }));

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
      } else if (drafts && drafts.length === 0) {
        if (sets.length > 0) {
          // Do nothing, preserve state to avoid wipe
        } else {
          // This block will now correctly trigger initial drafts if none exist for the exercise
          await createInitialDrafts();
        }
      }
    };

    processAndSetSets();
  }, [drafts, loadingDrafts, exerciseId, currentSessionId, exerciseName, createInitialDrafts, fetchLastSets]); // Removed sets.length from dependencies

  const updateDraft = useCallback(async (setIndex: number, updatedSet: Partial<SetLogState>) => {
    if (!isValidDraftKey(exerciseId, setIndex)) {
      console.error(`Invalid draft key for updateDraft: exerciseId=${exerciseId}, setIndex=${setIndex}`);
      toast.error("Failed to update local set draft: invalid key.");
      return;
    }

    try {
      const currentDraft = await db.draft_set_logs.get([exerciseId, setIndex]);
      if (!currentDraft) {
        console.warn(`Draft not found for update: exerciseId=${exerciseId}, setIndex=${setIndex}`);
        toast.error("Failed to update local set draft: draft not found.");
        return;
      }

      const newDraft: LocalDraftSetLog = {
        ...currentDraft,
        weight_kg: updatedSet.weight_kg !== undefined ? updatedSet.weight_kg : currentDraft.weight_kg,
        reps: updatedSet.reps !== undefined ? updatedSet.reps : currentDraft.reps,
        reps_l: updatedSet.reps_l !== undefined ? updatedSet.reps_l : currentDraft.reps_l,
        reps_r: updatedSet.reps_r !== undefined ? updatedSet.reps_r : currentDraft.reps_r,
        time_seconds: updatedSet.time_seconds !== undefined ? updatedSet.time_seconds : currentDraft.time_seconds,
        isSaved: updatedSet.isSaved !== undefined ? updatedSet.isSaved : currentDraft.isSaved,
        is_pb: updatedSet.is_pb !== undefined ? updatedSet.is_pb : currentDraft.is_pb,
        
        exercise_id: exerciseId, 
        set_index: setIndex, 
        session_id: updatedSet.session_id !== undefined ? updatedSet.session_id : currentDraft.session_id,
        set_log_id: updatedSet.id !== undefined ? updatedSet.id : currentDraft.set_log_id,
      };
      await db.draft_set_logs.put(newDraft);
    } catch (error) {
      console.error(`Error updating draft set log for exercise ${exerciseId}, set ${setIndex}:`, error);
      toast.error("Failed to update local set draft.");
    }
  }, [exerciseId]);

  const addDraft = useCallback(async (newSet: SetLogState) => {
    const newSetIndex = drafts ? drafts.length : 0; // Use drafts.length for the new index
    if (!isValidDraftKey(exerciseId, newSetIndex)) {
      console.error(`Invalid draft key for addDraft: exerciseId=${exerciseId}, newSetIndex=${newSetIndex}`);
      toast.error("Failed to add local set draft: invalid key.");
      return;
    }
    try {
      const draftPayload: LocalDraftSetLog = {
        exercise_id: exerciseId, set_index: newSetIndex, session_id: currentSessionId,
        weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
        isSaved: newSet.isSaved, set_log_id: newSet.id, is_pb: newSet.is_pb,
      };
      await db.draft_set_logs.put(draftPayload);
    } catch (error) {
      console.error(`Error adding draft set log for exercise ${exerciseId}, set ${newSetIndex}:`, error);
      toast.error("Failed to add local set draft.");
    }
  }, [exerciseId, currentSessionId, drafts]); // Depend on drafts for length

  const deleteDraft = useCallback(async (setIndex: number) => {
    if (!isValidDraftKey(exerciseId, setIndex)) {
      console.error(`Invalid draft key for deleteDraft: exerciseId=${exerciseId}, setIndex=${setIndex}`);
      toast.error("Failed to delete local set draft: invalid key.");
      return;
    }
    try {
      await db.draft_set_logs.delete([exerciseId, setIndex]);
      // After deleting, re-index the remaining drafts to maintain sequential order
      const remainingDrafts = await db.draft_set_logs.where('exercise_id').equals(exerciseId).sortBy('set_index');
      await db.transaction('rw', db.draft_set_logs, async () => {
        for (let i = 0; i < remainingDrafts.length; i++) {
          const draft = remainingDrafts[i];
          if (draft.set_index !== i) {
            // Delete old entry and create new with correct index
            await db.draft_set_logs.delete([draft.exercise_id, draft.set_index]);
            await db.draft_set_logs.put({ ...draft, set_index: i });
          }
        }
      });
    } catch (error) {
      console.error(`Error deleting draft set log for exercise ${exerciseId}, set ${setIndex}:`, error);
      toast.error("Failed to delete local set draft.");
    }
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