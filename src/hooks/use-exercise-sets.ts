"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, UserExercisePR } from '@/types/supabase';
import { useSetPersistence } from './use-set-persistence';
import { useProgressionSuggestion } from './use-progression-suggestion';
import { useSession } from '@/components/session-context-provider';

// Import new modular hooks
import { useSetDrafts } from './use-set-drafts';
import { useSetActions } from './use-set-actions';
import { useSetSaver } from './use-set-saver';
import { useExerciseCompletion } from './use-exercise-completion';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

type NumericSetLogFields = 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds';

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateGlobalSets: (exerciseId: string, newSets: SetLogState[]) => void;
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => Promise<string>;
  onExerciseCompleted: (exerciseId: string, isNewPR: boolean) => void;
  workoutTemplateName: string;
  exerciseNumber: number;
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => Promise<void>;
  handleInputChange: (setIndex: number, field: NumericSetLogFields, value: string) => Promise<void>;
  handleSaveSet: (setIndex: number) => Promise<void>;
  handleEditSet: (setIndex: number) => Promise<void>;
  handleDeleteSet: (setIndex: number) => Promise<void>;
  handleCompleteExercise: () => Promise<{ success: boolean; isNewPR: boolean }>;
  exercisePR: UserExercisePR | null;
  loadingPR: boolean;
  handleSuggestProgression: () => Promise<void>;
  isExerciseCompleted: boolean;
  hasAchievedPRInSession: boolean;
}

const MAX_SETS = 5;

const isValidId = (id: string | null | undefined): id is string => {
  return typeof id === 'string' && id.length > 0;
};

export const useExerciseSets = ({
  exerciseId,
  exerciseName,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  supabase,
  onUpdateGlobalSets,
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseCompleted,
  workoutTemplateName,
  exerciseNumber,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const { session } = useSession();

  // Use the new modular hooks
  const {
    sets,
    loadingDrafts,
    updateDraft,
    addDraft,
    deleteDraft,
    fetchLastSets, // Still exposed for potential external use if needed, though not directly used here anymore
  } = useSetDrafts({
    exerciseId,
    exerciseName,
    exerciseType,
    exerciseCategory,
    currentSessionId,
    supabase,
  });

  const {
    handleAddSet,
    handleInputChange,
    handleEditSet,
    handleDeleteSet,
  } = useSetActions({
    exerciseId,
    exerciseType,
    exerciseCategory,
    currentSessionId,
    sets,
    updateDraft,
    addDraft,
    deleteDraft,
    preferredWeightUnit,
  });

  const {
    handleSaveSet,
    exercisePR,
    loadingPR,
  } = useSetSaver({
    exerciseId,
    exerciseType,
    exerciseCategory,
    currentSessionId,
    sets,
    updateDraft,
    onFirstSetSaved,
    preferredWeightUnit,
  });

  const {
    handleCompleteExercise,
    isExerciseCompleted,
    hasAchievedPRInSession,
  } = useExerciseCompletion({
    exerciseId,
    exerciseType,
    exerciseCategory,
    currentSessionId,
    sets,
    updateDraft,
    onFirstSetSaved,
    onExerciseCompleted,
    preferredWeightUnit,
  });

  const { getProgressionSuggestion } = useProgressionSuggestion({
    exerciseId,
    exerciseType,
    exerciseCategory,
    supabase,
    preferredWeightUnit,
  });

  useEffect(() => {
    if (sets) {
      onUpdateGlobalSets(exerciseId, sets);
    }
  }, [sets, exerciseId, onUpdateGlobalSets]);

  const handleSuggestProgression = useCallback(async () => {
    if (!isValidId(exerciseId)) {
      toast.error("Cannot suggest progression: exercise information is incomplete.");
      return;
    }
    if (!sets) return;

    const { newSets, message } = await getProgressionSuggestion(sets.length, currentSessionId);
    if (newSets) {
      // Clear existing drafts for this exercise and session
      const draftsToDelete = sets.map((_, index) => ({ exercise_id: exerciseId, set_index: index }));
      await Promise.all(draftsToDelete.map(d => deleteDraft(d.set_index)));

      // Add new suggested drafts
      await Promise.all(newSets.map((set, index) => addDraft({ ...set, session_id: currentSessionId, exercise_id: exerciseId })));
      
      toast.info(message);
    }
  }, [sets, currentSessionId, getProgressionSuggestion, exerciseId, deleteDraft, addDraft]);

  return {
    sets: sets || [],
    handleAddSet,
    handleInputChange,
    handleSaveSet,
    handleEditSet,
    handleDeleteSet,
    handleCompleteExercise,
    exercisePR,
    loadingPR,
    handleSuggestProgression,
    isExerciseCompleted,
    hasAchievedPRInSession,
  };
};