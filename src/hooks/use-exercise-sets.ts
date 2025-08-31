"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate, SetLogState, UserExercisePRInsert, UserExercisePRUpdate } from '@/types/supabase';
import { convertWeight, formatWeight } from '@/lib/unit-conversions';
import { useSetPersistence } from './use-set-persistence'; // Import new hook
import { useExercisePRLogic } from './use-exercise-pr-logic'; // Import new hook
import { useProgressionSuggestion } from './use-progression-suggestion'; // Import new hook

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
  const [sets, setSets] = useState<SetLogState[]>(() => {
    if (initialSets.length === 0) {
      return Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
        id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastRepsL: null, lastRepsR: null, lastTimeSeconds: null,
      }));
    }
    return initialSets;
  });

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

  useEffect(() => {
    setInternalSessionId(propCurrentSessionId);
  }, [propCurrentSessionId]);

  useEffect(() => {
    setSets(prevSets => {
      if (prevSets.length === 0 && initialSets.length > 0) {
        return initialSets.map(set => ({ ...set, session_id: internalSessionId }));
      }

      const newSets = prevSets.map((prevSet, index) => {
        const initialSet = initialSets[index];
        if (initialSet) {
          return {
            ...prevSet,
            lastWeight: initialSet.lastWeight,
            lastReps: initialSet.lastReps,
            lastRepsL: initialSet.lastRepsL,
            lastRepsR: initialSet.lastRepsR,
            lastTimeSeconds: initialSet.lastTimeSeconds,
            session_id: prevSet.session_id || internalSessionId,
          };
        }
        return prevSet;
      });

      if (!areSetsEqual(prevSets, newSets)) {
        return newSets;
      }
      return prevSets;
    });
  }, [initialSets, exerciseId, internalSessionId]);

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
      return newSets;
    });
  }, [preferredWeightUnit]);

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

    if (!internalSessionId) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = { ...newSets[setIndex], isSaved: true };
        return newSets;
      });

      if (exerciseNumber === 1 && setIndex === 0) {
        toast.info("Don't forget to hit 'Save Exercise' once you're done to start the Workout Session.");
      }
      return;
    }

    const { savedSet } = await saveSetToDb(sets[setIndex], setIndex, internalSessionId);
    if (savedSet) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = savedSet;
        return newSets;
      });
    }
  }, [sets, internalSessionId, saveSetToDb, exerciseNumber]);

  const handleEditSet = useCallback((setIndex: number) => {
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      return updatedSets;
    });
  }, []);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    const setToDelete = sets[setIndex];
    if (!setToDelete.id) {
      setSets(prev => prev.filter((_, i) => i !== setIndex));
      toast.success("Unsaved set removed.");
      return;
    }

    if (!confirm("Are you sure you want to delete this set? This action cannot be undone.")) {
      return;
    }

    const success = await deleteSetFromDb(setToDelete.id);
    if (success) {
      setSets(prev => prev.filter((_, i) => i !== setIndex));
    }
  }, [sets, deleteSetFromDb]);

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
    }
  }, [sets.length, internalSessionId, getProgressionSuggestion]);

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