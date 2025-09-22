"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { SetLogState, Tables } from '@/types/supabase';
import { useSetDrafts } from './use-set-drafts';
import { convertWeight } from '@/lib/unit-conversions';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

type NumericSetLogFields = 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds';

const MAX_SETS = 5;

interface UseSetActionsProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  sets: SetLogState[];
  updateDraft: (setIndex: number, updatedSet: Partial<SetLogState>) => Promise<void>;
  addDraft: (newSet: SetLogState) => Promise<void>;
  deleteDraft: (setIndex: number) => Promise<void>;
  preferredWeightUnit: Profile['preferred_weight_unit'];
}

interface UseSetActionsReturn {
  handleAddSet: () => Promise<void>;
  handleInputChange: (setIndex: number, field: NumericSetLogFields, value: string) => Promise<void>;
  handleEditSet: (setIndex: number) => Promise<void>;
  handleDeleteSet: (setIndex: number) => Promise<void>;
}

export const useSetActions = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  sets,
  updateDraft,
  addDraft,
  deleteDraft,
  preferredWeightUnit,
}: UseSetActionsProps): UseSetActionsReturn => {

  const handleAddSet = useCallback(async () => {
    if (!isValidId(exerciseId)) {
      console.error("Cannot add set: exercise information is incomplete.");
      toast.error("Cannot add set: exercise information is incomplete."); // Changed to toast.error
      return;
    }
    if (sets.length >= MAX_SETS) {
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    
    const lastSet = sets[sets.length - 1];

    const newSet: SetLogState = {
      id: null, created_at: null, session_id: currentSessionId, exercise_id: exerciseId,
      weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
      is_pb: false, isSaved: false, isPR: false,
      lastWeight: lastSet?.weight_kg, lastReps: lastSet?.reps, lastRepsL: lastSet?.reps_l, lastRepsR: lastSet?.reps_r, lastTimeSeconds: lastSet?.time_seconds,
    };
    await addDraft(newSet);
  }, [exerciseId, currentSessionId, sets, addDraft]);

  const handleInputChange = useCallback(async (setIndex: number, field: NumericSetLogFields, value: string) => {
    if (!isValidId(exerciseId)) {
      console.error("Cannot update set: exercise information is incomplete.");
      toast.error("Cannot update set: exercise information is incomplete."); // Changed to toast.error
      return;
    }
    if (!sets[setIndex]) {
      console.error(`Set at index ${setIndex} not found for input change.`);
      toast.error("Failed to update set: set not found."); // Added toast.error
      return;
    }

    let parsedValue: number | null = parseFloat(value);
    if (isNaN(parsedValue)) parsedValue = null;

    const updatedSet: Partial<SetLogState> = { isSaved: false }; // Mark as unsaved when input changes
    if (field === 'weight_kg' && parsedValue !== null) {
      updatedSet[field] = convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg');
    } else {
      updatedSet[field] = parsedValue;
    }
    
    await updateDraft(setIndex, updatedSet);
  }, [exerciseId, sets, updateDraft, preferredWeightUnit]);

  const handleEditSet = useCallback(async (setIndex: number) => {
    if (!isValidId(exerciseId)) {
      console.error("Cannot edit set: exercise information is incomplete.");
      toast.error("Cannot edit set: exercise information is incomplete."); // Changed to toast.error
      return;
    }
    if (!sets[setIndex]) {
      console.error(`Set at index ${setIndex} not found for edit.`);
      toast.error("Failed to edit set: set not found."); // Added toast.error
      return;
    }

    await updateDraft(setIndex, { isSaved: false }); // Mark as unsaved to allow editing
    console.log(`[useSetActions] handleEditSet: Set ${setIndex + 1} marked for edit. Draft updated.`);
  }, [exerciseId, sets, updateDraft]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    if (!isValidId(exerciseId)) {
      console.error("Cannot delete set: exercise information is incomplete.");
      toast.error("Cannot delete set: exercise information is incomplete."); // Changed to toast.error
      return;
    }
    if (!sets[setIndex]) {
      console.error(`Set at index ${setIndex} not found for delete.`);
      toast.error("Failed to delete set: set not found."); // Added toast.error
      return;
    }

    const setToDelete = sets[setIndex];
    
    await deleteDraft(setIndex);
    toast.success("Set removed."); // Changed to toast.success

    if (setToDelete.id) {
      // If the set was already saved to DB, queue its deletion
      // This logic is now handled by useSetPersistence directly
    }
  }, [exerciseId, sets, deleteDraft]);

  return {
    handleAddSet,
    handleInputChange,
    handleEditSet,
    handleDeleteSet,
  };
};

const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};