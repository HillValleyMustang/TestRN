"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { SetLogState, Tables, UserExercisePR } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';
import { useSetPersistence } from './use-set-persistence';
import { useSetPRLogic } from './use-set-pr-logic'; // Import useSetPRLogic
import { useSetDrafts } from './use-set-drafts'; // Import useSetDrafts

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

// NEW: Helper function to check if a set has any user input
const hasUserInput = (set: SetLogState): boolean => {
  return (set.weight_kg !== null && set.weight_kg > 0) ||
         (set.reps !== null && set.reps > 0) ||
         (set.reps_l !== null && set.reps_l > 0) ||
         (set.reps_r !== null && set.reps_r > 0) ||
         (set.time_seconds !== null && set.time_seconds > 0);
};

const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

interface UseSetSaverProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  sets: SetLogState[];
  updateDraft: (setIndex: number, updatedSet: Partial<SetLogState>) => Promise<void>;
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  preferredWeightUnit: Profile['preferred_weight_unit'];
}

interface UseSetSaverReturn {
  handleSaveSet: (setIndex: number) => Promise<void>;
  exercisePR: UserExercisePR | null;
  loadingPR: boolean;
}

export const useSetSaver = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  sets,
  updateDraft,
  onFirstSetSaved,
  preferredWeightUnit,
}: UseSetSaverProps): UseSetSaverReturn => {
  const { session, supabase } = useSession();

  const { saveSetToDb } = useSetPersistence({
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

  const handleSaveSet = useCallback(async (setIndex: number) => {
    console.log(`[useSetSaver] handleSaveSet called for setIndex: ${setIndex}. Initial currentSessionId: ${currentSessionId}`);

    if (!isValidId(exerciseId)) {
      toast.error("Cannot save set: exercise information is incomplete.");
      return;
    }
    if (!sets[setIndex]) return;

    let currentSet = { ...sets[setIndex] }; // Create a mutable copy

    if (!hasUserInput(currentSet)) {
      toast.error(`Set ${setIndex + 1}: No data to save.`);
      return;
    }

    let sessionIdToUse = currentSessionId;
    if (!sessionIdToUse) {
      console.log(`[useSetSaver] currentSessionId is null. Calling onFirstSetSaved.`);
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        sessionIdToUse = newSessionId;
        console.log(`[useSetSaver] New sessionId generated: ${sessionIdToUse}`);
        currentSet.session_id = newSessionId; // IMPORTANT: Update session_id in the currentSet copy
      } catch (err) {
        toast.error("Failed to start workout session.");
        return;
      }
    } else {
      console.log(`[useSetSaver] Using existing sessionId: ${sessionIdToUse}`);
      currentSet.session_id = sessionIdToUse; // Ensure it's set even if not new
    }

    let isNewSetPR = false;
    let localCurrentExercisePR: UserExercisePR | null = exercisePR;
    if (session?.user.id) {
      // Pass the updated currentSet to PR check
      const { isNewPR, updatedPR } = await checkAndSaveSetPR(currentSet, session.user.id, localCurrentExercisePR);
      isNewSetPR = isNewPR;
      localCurrentExercisePR = updatedPR;
      console.log(`[useSetSaver] handleSaveSet: Set ${setIndex + 1} PR check result: isNewPR=${isNewPR}, updatedPR=`, updatedPR);
    }

    // Pass the updated currentSet to saveSetToDb
    const { savedSet } = await saveSetToDb({ ...currentSet, is_pb: isNewSetPR }, setIndex, sessionIdToUse);
    if (savedSet) {
      console.log(`[useSetSaver] saveSetToDb returned savedSet:`, savedSet);
      await updateDraft(setIndex, {
        id: savedSet.id,
        session_id: sessionIdToUse,
        weight_kg: savedSet.weight_kg,
        reps: savedSet.reps,
        reps_l: savedSet.reps_l,
        reps_r: savedSet.reps_r,
        time_seconds: savedSet.time_seconds,
        isSaved: true,
        is_pb: savedSet.is_pb || false,
      });
      console.log(`[useSetSaver] handleSaveSet: Set ${setIndex + 1} saved locally with is_pb=${savedSet.is_pb}. Draft updated.`);
    } else {
      toast.error(`Failed to save set ${setIndex + 1}. Please try again.`);
      await updateDraft(setIndex, { isSaved: false }); // Rollback saved status
      console.log(`[useSetSaver] handleSaveSet: Set ${setIndex + 1} failed to save. Draft rolled back.`);
    }
  }, [exerciseId, currentSessionId, sets, updateDraft, onFirstSetSaved, session, checkAndSaveSetPR, exercisePR, saveSetToDb]);

  return {
    handleSaveSet,
    exercisePR,
    loadingPR,
  };
};