"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Tables, TablesInsert, TablesUpdate, SetLogState, UserExercisePRInsert, UserExercisePRUpdate, GetLastExerciseSetsForExerciseReturns } from '@/types/supabase';
import { convertWeight, formatWeight } from '@/lib/unit-conversions';
import { useSetPersistence } from './use-set-persistence';
import { useSetPRLogic } from './use-set-pr-logic';
import { useProgressionSuggestion } from './use-progression-suggestion';
import { db, addToSyncQueue, LocalDraftSetLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useLiveQuery } from 'dexie-react-hooks';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;
type Profile = Tables<'profiles'>;
type UserExercisePR = Tables<'user_exercise_prs'>;

type NumericSetLogFields = 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds';

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseComplete: (exerciseId: string, isNewPR: boolean) => Promise<void>;
  workoutTemplateName: string;
  exerciseNumber: number;
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => void;
  handleInputChange: (setIndex: number, field: NumericSetLogFields, value: string) => void;
  handleSaveSet: (setIndex: number) => Promise<void>;
  handleEditSet: (setIndex: number) => void;
  handleDeleteSet: (setIndex: number) => Promise<void>;
  handleSaveExercise: () => Promise<{ success: boolean; isNewPR: boolean }>;
  exercisePR: UserExercisePR | null;
  loadingPR: boolean;
  handleSuggestProgression: () => Promise<void>;
}

const MAX_SETS = 5;
const DEFAULT_INITIAL_SETS = 3;

const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

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
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
  workoutTemplateName,
  exerciseNumber,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const { session } = useSession();

  const { saveSetToDb, deleteSetFromDb } = useSetPersistence({
    exerciseId,
    exerciseType,
    exerciseCategory,
    supabase,
    preferredWeightUnit,
  });
  const { exercisePR, loadingPR, checkAndSaveSetPR } = useSetPRLogic({
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

  const drafts = useLiveQuery(async () => {
    if (!isValidId(exerciseId)) {
      return [];
    }
    return db.draft_set_logs
      .where('exercise_id').equals(exerciseId)
      .filter(draft => draft.session_id === propCurrentSessionId)
      .sortBy('set_index');
  }, [exerciseId, propCurrentSessionId]);

  const [sets, setSets] = useState<SetLogState[]>([]);
  const loadingDrafts = drafts === undefined;

  const createInitialDrafts = useCallback(async () => {
    if (!isValidId(exerciseId)) return;

    const draftPayloads: LocalDraftSetLog[] = [];
    for (let i = 0; i < DEFAULT_INITIAL_SETS; i++) {
      const newSet: SetLogState = {
        id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
      };
      draftPayloads.push({
        exercise_id: exerciseId, set_index: i, session_id: propCurrentSessionId,
        weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
        isSaved: false, set_log_id: null, is_pb: false,
      });
    }
    console.assert(draftPayloads.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in createInitialDrafts bulkPut: ${JSON.stringify(draftPayloads.map(d => [d.exercise_id, d.set_index]))}`);
    await db.draft_set_logs.bulkPut(draftPayloads);
  }, [exerciseId, propCurrentSessionId]);

  const fetchLastSets = useCallback(async () => {
    if (!session || !isValidId(exerciseId)) return new Map<string, GetLastExerciseSetsForExerciseReturns>();
    
    const { data: lastExerciseSets, error: rpcError } = await supabase.rpc('get_last_exercise_sets_for_exercise', {
      p_user_id: session.user.id,
      p_exercise_id: exerciseId,
    });

    if (rpcError && rpcError.code !== 'PGRST116') { 
      console.error(`Error fetching last sets for exercise ${exerciseName}:`, rpcError);
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
      }, [drafts, loadingDrafts, exerciseId, propCurrentSessionId, exerciseName, createInitialDrafts, fetchLastSets]);

      useEffect(() => {
        if (sets) {
          onUpdateSets(exerciseId, sets);
        }
      }, [sets, exerciseId, onUpdateSets]);

      const handleAddSet = useCallback(async () => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleAddSet: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot add set: exercise information is incomplete.");
          return;
        }
        if (!sets || sets.length >= MAX_SETS) {
          toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
          return;
        }
        
        const newSetIndex = sets.length;
        const lastSet = sets[sets.length - 1];

        const newSet: SetLogState = {
          id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
          weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
          is_pb: false, isSaved: false, isPR: false,
          lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastRepsL: lastSet?.reps_l, lastRepsR: lastSet?.reps_r, lastTimeSeconds: lastSet?.time_seconds,
        };
        const draftPayload: LocalDraftSetLog = {
          exercise_id: exerciseId, set_index: newSetIndex, session_id: propCurrentSessionId,
          weight_kg: newSet.weight_kg, reps: newSet.reps, reps_l: newSet.reps_l, reps_r: newSet.reps_r, time_seconds: newSet.time_seconds,
          isSaved: false, set_log_id: null, is_pb: false,
        };
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleAddSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        await db.draft_set_logs.put(draftPayload);
      }, [exerciseId, propCurrentSessionId, sets]);

      const handleInputChange = useCallback(async (setIndex: number, field: NumericSetLogFields, value: string) => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleInputChange: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot update set: exercise information is incomplete.");
          return;
        }
        if (!sets || !sets[setIndex]) return;

        let parsedValue: number | null = parseFloat(value);
        if (isNaN(parsedValue)) parsedValue = null;

        const updatedSet = { ...sets[setIndex] };
        if (field === 'weight_kg' && parsedValue !== null) {
          updatedSet[field] = convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg');
        } else {
          updatedSet[field] = parsedValue;
        }
        updatedSet.isSaved = false;

        const draftPayload: LocalDraftSetLog = {
          exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
          weight_kg: updatedSet.weight_kg, reps: updatedSet.reps, reps_l: updatedSet.reps_l, reps_r: updatedSet.reps_r, time_seconds: updatedSet.time_seconds,
          isSaved: false, set_log_id: updatedSet.id, is_pb: updatedSet.is_pb || false,
        };
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleInputChange: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        await db.draft_set_logs.put(draftPayload);
      }, [exerciseId, propCurrentSessionId, preferredWeightUnit, sets]);

      const handleSaveSet = useCallback(async (setIndex: number) => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveSet: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot save set: exercise information is incomplete.");
          return;
        }
        if (!sets || !sets[setIndex]) return;

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

        let isNewSetPR = false;
        if (session?.user.id) {
          isNewSetPR = await checkAndSaveSetPR(currentSet, session.user.id);
        }

        const { savedSet } = await saveSetToDb({ ...currentSet, is_pb: isNewSetPR }, setIndex, sessionIdToUse);
        if (savedSet) {
          const draftPayload: LocalDraftSetLog = {
            exercise_id: exerciseId, set_index: setIndex, session_id: sessionIdToUse,
            weight_kg: savedSet.weight_kg, reps: savedSet.reps, reps_l: savedSet.reps_l, reps_r: savedSet.reps_r, time_seconds: savedSet.time_seconds,
            isSaved: true, set_log_id: savedSet.id, is_pb: savedSet.is_pb || false, // Correctly set is_pb here
          };
          console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveSet update: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
          await db.draft_set_logs.put(draftPayload);
        } else {
          toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
          const draftPayload: LocalDraftSetLog = {
            exercise_id: exerciseId, set_index: setIndex, session_id: sessionIdToUse,
            weight_kg: currentSet.weight_kg, reps: currentSet.reps, reps_l: currentSet.reps_l, reps_r: currentSet.reps_r, time_seconds: currentSet.time_seconds,
            isSaved: false, set_log_id: currentSet.id, is_pb: currentSet.is_pb || false,
          };
          console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveSet rollback: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
          await db.draft_set_logs.put(draftPayload);
        }
      }, [sets, propCurrentSessionId, saveSetToDb, exerciseId, onFirstSetSaved, session, checkAndSaveSetPR]);

      const handleEditSet = useCallback(async (setIndex: number) => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleEditSet: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot edit set: exercise information is incomplete.");
          return;
        }
        if (!sets || !sets[setIndex]) return;

        const updatedSet = { ...sets[setIndex], isSaved: false };
        const draftPayload: LocalDraftSetLog = {
          exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
          weight_kg: updatedSet.weight_kg, reps: updatedSet.reps, reps_l: updatedSet.reps_l, reps_r: updatedSet.reps_r, time_seconds: updatedSet.time_seconds,
          isSaved: false, set_log_id: updatedSet.id, is_pb: updatedSet.is_pb || false,
        };
        console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleEditSet: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
        await db.draft_set_logs.put(draftPayload);
      }, [exerciseId, propCurrentSessionId, sets]);

      const handleDeleteSet = useCallback(async (setIndex: number) => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleDeleteSet: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot delete set: exercise information is incomplete.");
          return;
        }
        if (!sets || !sets[setIndex]) return;

        const setToDelete = sets[setIndex];
        
        console.assert(isValidDraftKey(exerciseId, setIndex), `Invalid draft key in handleDeleteSet delete: [${exerciseId}, ${setIndex}]`);
        await db.draft_set_logs.delete([exerciseId, setIndex]);
        toast.success("Set removed.");

        if (!setToDelete.id) return;

        const success = await deleteSetFromDb(setToDelete.id);
        if (!success) {
          toast.error("Failed to delete set from database. Please try again.");
          const draftPayload: LocalDraftSetLog = {
            exercise_id: exerciseId, set_index: setIndex, session_id: propCurrentSessionId,
            weight_kg: setToDelete.weight_kg, reps: setToDelete.reps, reps_l: setToDelete.reps_l, reps_r: setToDelete.reps_r, time_seconds: setToDelete.time_seconds,
            isSaved: setToDelete.isSaved, set_log_id: setToDelete.id, is_pb: setToDelete.is_pb || false,
          };
          console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleDeleteSet rollback: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
          await db.draft_set_logs.put(draftPayload);
        }
      }, [sets, deleteSetFromDb, exerciseId, propCurrentSessionId]);

      const handleSaveExercise = useCallback(async (): Promise<{ success: boolean; isNewPR: boolean }> => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSaveExercise: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot save exercise: exercise information is incomplete.");
          return { success: false, isNewPR: false };
        }
        if (!sets) return { success: false, isNewPR: false };

        let currentSessionIdToUse = propCurrentSessionId;

        const hasAnyData = sets.some(s => (s.weight_kg ?? 0) > 0 || (s.reps ?? 0) > 0 || (s.time_seconds ?? 0) > 0 || (s.reps_l ?? 0) > 0 || (s.reps_r ?? 0) > 0);
        if (!hasAnyData) {
          toast.error("No data to save for this exercise.");
          return { success: false, isNewPR: false };
        }

        if (!currentSessionIdToUse) {
          try {
            const newSessionId = await onFirstSetSaved(new Date().toISOString());
            currentSessionIdToUse = newSessionId;
          } catch (err) {
            toast.error("Failed to start workout session. Please try again.");
            return { success: false, isNewPR: false };
          }
        }

        let hasError = false;
        let anySetIsPR = false;

        for (let i = 0; i < sets.length; i++) {
          const currentSet = sets[i];
          const hasDataForSet = (currentSet.weight_kg ?? 0) > 0 || (currentSet.reps ?? 0) > 0 || (currentSet.time_seconds ?? 0) > 0 || (currentSet.reps_l ?? 0) > 0 || (currentSet.reps_r ?? 0) > 0;

          if (hasDataForSet && !currentSet.isSaved) {
            let isNewSetPR = false;
            if (session?.user.id) {
              isNewSetPR = await checkAndSaveSetPR(currentSet, session.user.id);
              if (isNewSetPR) anySetIsPR = true;
            }

            const { savedSet } = await saveSetToDb({ ...currentSet, is_pb: isNewSetPR }, i, currentSessionIdToUse);
            if (savedSet) {
              const draftPayload: LocalDraftSetLog = {
                exercise_id: exerciseId, set_index: i, session_id: currentSessionIdToUse,
                weight_kg: savedSet.weight_kg, reps: savedSet.reps, reps_l: savedSet.reps_l, reps_r: savedSet.reps_r, time_seconds: savedSet.time_seconds,
                isSaved: true, set_log_id: savedSet.id, is_pb: savedSet.is_pb || false,
              };
              console.assert(isValidDraftKey(draftPayload.exercise_id, draftPayload.set_index), `Invalid draft key in handleSaveExercise update: [${draftPayload.exercise_id}, ${draftPayload.set_index}]`);
              await db.draft_set_logs.put(draftPayload);
            } else {
              hasError = true;
            }
          } else if (currentSet.is_pb) {
            anySetIsPR = true;
          }
        }

        if (hasError) return { success: false, isNewPR: false };

        try {
          await onExerciseComplete(exerciseId, anySetIsPR);
          return { success: true, isNewPR: anySetIsPR };
        } catch (err: any) {
          console.error("Error saving exercise completion:", err);
          toast.error("Failed to complete exercise: " + err.message);
          return { success: false, isNewPR: false };
        }
      }, [sets, exerciseId, onExerciseComplete, onFirstSetSaved, propCurrentSessionId, saveSetToDb, session, checkAndSaveSetPR]);

      const handleSuggestProgression = useCallback(async () => {
        console.assert(isValidId(exerciseId), `Invalid exerciseId in handleSuggestProgression: ${exerciseId}`);
        if (!isValidId(exerciseId)) {
          toast.error("Cannot suggest progression: exercise information is incomplete.");
          return;
        }
        if (!sets) return;

        const { newSets, message } = await getProgressionSuggestion(sets.length, propCurrentSessionId);
        if (newSets) {
          const draftsToDelete = await db.draft_set_logs
            .where('exercise_id').equals(exerciseId)
            .filter(draft => draft.session_id === propCurrentSessionId)
            .toArray();

          if (draftsToDelete.length > 0) {
            const keysToDelete = draftsToDelete.map(d => [d.exercise_id, d.set_index] as [string, number]);
            console.assert(keysToDelete.every(key => isValidDraftKey(key[0], key[1])), `Invalid draft keys in handleSuggestProgression bulkDelete: ${JSON.stringify(keysToDelete)}`);
            await db.draft_set_logs.bulkDelete(keysToDelete);
          }

          const draftPayloads: LocalDraftSetLog[] = newSets.map((set, index) => ({
            exercise_id: exerciseId, set_index: index, session_id: propCurrentSessionId,
            weight_kg: set.weight_kg, reps: set.reps, reps_l: set.reps_l, reps_r: set.reps_r, time_seconds: set.time_seconds,
            isSaved: false, set_log_id: null, is_pb: false,
          }));
          console.assert(draftPayloads.every(d => isValidDraftKey(d.exercise_id, d.set_index)), `Invalid draft keys in handleSuggestProgression bulkPut: ${JSON.stringify(draftPayloads.map(d => [d.exercise_id, d.set_index]))}`);
          await db.draft_set_logs.bulkPut(draftPayloads);
          
          toast.info(message);
        }
      }, [sets, propCurrentSessionId, getProgressionSuggestion, exerciseId]);

      return {
        sets: sets || [],
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