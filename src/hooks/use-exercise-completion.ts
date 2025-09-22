"use client";

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { SetLogState, Tables, UserExercisePR } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@/components/session-context-provider';
import { useSetSaver } from './use-set-saver'; // Import useSetSaver
import { useSetPersistence } from './use-set-persistence'; // Import useSetPersistence
import { useSetPRLogic } from './use-set-pr-logic'; // Import useSetPRLogic

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

// Helper function to check if a set has any user input
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

interface UseExerciseCompletionProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  sets: SetLogState[];
  updateDraft: (setIndex: number, updatedSet: Partial<SetLogState>) => Promise<void>;
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseCompleted: (exerciseId: string, isNewPR: boolean) => void;
  preferredWeightUnit: Profile['preferred_weight_unit'];
}

interface UseExerciseCompletionReturn {
  handleCompleteExercise: () => Promise<{ success: boolean; isNewPR: boolean }>;
  hasAchievedPRInSession: boolean;
}

export const useExerciseCompletion = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  sets,
  updateDraft,
  onFirstSetSaved,
  onExerciseCompleted,
  preferredWeightUnit,
}: UseExerciseCompletionProps): UseExerciseCompletionReturn => {
  const { session, supabase } = useSession();

  const { saveSetToDb } = useSetPersistence({
    exerciseId,
    exerciseType,
    exerciseCategory,
    supabase,
    preferredWeightUnit,
  });
  const { exercisePR, checkAndSaveSetPR } = useSetPRLogic({
    exerciseId,
    exerciseType,
    supabase,
  });

  // Derived state for trophy icon visibility
  const hasAchievedPRInSession = useMemo(() => {
    return sets.some(set => set.is_pb);
  }, [sets]);

  const handleCompleteExercise = useCallback(async (): Promise<{ success: boolean; isNewPR: boolean }> => {
    if (!isValidId(exerciseId)) {
      toast.error("Cannot complete exercise: exercise information is incomplete.");
      return { success: false, isNewPR: false };
    }
    if (!sets) {
      console.error("Error: Sets data is null or undefined when trying to complete exercise.");
      toast.error("Cannot complete exercise: no set data found."); // Added toast.error
      return { success: false, isNewPR: false };
    }

    let currentSessionIdToUse = currentSessionId;

    const hasAnyData = sets.some(s => hasUserInput(s));
    if (!hasAnyData) {
      toast.error("No data to save for this exercise. Please log at least one set.");
      return { success: false, isNewPR: false };
    }

    if (!currentSessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        currentSessionIdToUse = newSessionId;
        console.log(`[useExerciseCompletion] handleCompleteExercise: New session created with ID: ${currentSessionIdToUse}`);
      } catch (err) {
        console.error("Failed to start workout session:", err);
        toast.error("Failed to start workout session. Please try again.");
        return { success: false, isNewPR: false };
      }
    }

    let hasError = false;
    let anySetIsPR = false;
    let localCurrentExercisePR: UserExercisePR | null = exercisePR; // Use a local variable for PR state within the loop

    for (let i = 0; i < sets.length; i++) {
      const currentSet = sets[i];
      const hasDataForSet = hasUserInput(currentSet);

      if (hasDataForSet && !currentSet.isSaved) {
        if (!session?.user.id) { // Ensure session.user.id is available for PR check
          console.error("Session user ID is missing for PR check.");
          hasError = true;
          break;
        }
        const { isNewPR, updatedPR } = await checkAndSaveSetPR(currentSet, session.user.id, localCurrentExercisePR); // Pass local PR state
        if (isNewPR) anySetIsPR = true;
        localCurrentExercisePR = updatedPR; // Update local PR state for next iteration
        console.log(`[useExerciseCompletion] handleCompleteExercise: Processing set ${i + 1}. isNewPR=${isNewPR}, anySetIsPR (cumulative)=${anySetIsPR}`);

        const { savedSet } = await saveSetToDb({ ...currentSet, is_pb: isNewPR }, i, currentSessionIdToUse);
        if (savedSet) {
          await updateDraft(i, {
            id: savedSet.id,
            session_id: currentSessionIdToUse,
            weight_kg: savedSet.weight_kg,
            reps: savedSet.reps,
            reps_l: savedSet.reps_l,
            reps_r: savedSet.reps_r,
            time_seconds: savedSet.time_seconds,
            isSaved: true,
            is_pb: savedSet.is_pb || false,
          });
          console.log(`[useExerciseCompletion] handleCompleteExercise: Set ${i + 1} saved locally with is_pb=${savedSet.is_pb}. Draft updated.`);
        } else {
          hasError = true;
          console.error(`[useExerciseCompletion] handleCompleteExercise: Failed to save set ${i + 1}.`);
        }
      } else if (currentSet.is_pb) {
        // If the set was already saved and was a PR, ensure it contributes to anySetIsPR
        anySetIsPR = true;
        console.log(`[useExerciseCompletion] handleCompleteExercise: Set ${i + 1} was already a PR. anySetIsPR (cumulative)=${anySetIsPR}`);
      }
    }

    if (hasError) {
      console.error(`[useExerciseCompletion] handleCompleteExercise: Encountered errors while saving sets.`);
      toast.error("Failed to save some sets. Please check your inputs."); // Added toast.error
      return { success: false, isNewPR: false };
    }

    try {
      console.log(`[useExerciseCompletion] handleCompleteExercise: Calling onExerciseCompleted for ${exerciseId} with anySetIsPR: ${anySetIsPR}`);
      await onExerciseCompleted(exerciseId, anySetIsPR);
      return { success: true, isNewPR: anySetIsPR };
    } catch (err: any) {
      console.error("[useExerciseCompletion] Error saving exercise completion:", err);
      toast.error("Failed to complete exercise: " + err.message);
      return { success: false, isNewPR: false };
    }
  }, [
    exerciseId, sets, currentSessionId, exercisePR,
    onFirstSetSaved, onExerciseCompleted, updateDraft,
    saveSetToDb, checkAndSaveSetPR, session
  ]);

  return {
    handleCompleteExercise,
    hasAchievedPRInSession,
  };
};