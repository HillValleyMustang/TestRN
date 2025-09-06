"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, UserExercisePR, UserExercisePRInsert, UserExercisePRUpdate } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseSetPRLogicProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  supabase: SupabaseClient;
}

export const useSetPRLogic = ({ exerciseId, exerciseType, supabase }: UseSetPRLogicProps) => {
  const [exercisePR, setExercisePR] = useState<UserExercisePR | null>(null);
  const [loadingPR, setLoadingPR] = useState(true);

  useEffect(() => {
    const fetchExercisePR = async () => {
      setLoadingPR(true);
      const { data, error } = await supabase
        .from('user_exercise_prs')
        .select('id, user_id, exercise_id, best_volume_kg, best_time_seconds, last_achieved_date, created_at, updated_at')
        .eq('exercise_id', exerciseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching exercise PR:", error);
        setExercisePR(null);
      } else if (data) {
        setExercisePR(data as UserExercisePR);
      } else {
        setExercisePR(null);
      }
      setLoadingPR(false);
    };
    fetchExercisePR();
  }, [exerciseId, supabase]);

  const checkAndSaveSetPR = useCallback(async (set: SetLogState, userId: string): Promise<boolean> => {
    let currentSetPerformance: number | null = null;

    if (exerciseType === 'weight') {
      currentSetPerformance = (set.weight_kg || 0) * (set.reps || 0);
    } else if (exerciseType === 'timed') {
      currentSetPerformance = set.time_seconds || 0;
    }

    if (currentSetPerformance === null || currentSetPerformance <= 0) {
      return false; // No valid performance to check for PR
    }

    let isNewPR = false;
    if (!exercisePR) {
      isNewPR = true;
    } else if (exerciseType === 'weight' && exercisePR.best_volume_kg !== null) {
      isNewPR = currentSetPerformance > exercisePR.best_volume_kg;
    } else if (exerciseType === 'timed' && exercisePR.best_time_seconds !== null) {
      isNewPR = currentSetPerformance > exercisePR.best_time_seconds;
    } else {
      // This case handles when there's a PR record but the relevant field is null (e.g., first time doing a timed exercise)
      isNewPR = true;
    }

    if (isNewPR) {
      const prData: UserExercisePRInsert | UserExercisePRUpdate = {
        user_id: userId,
        exercise_id: exerciseId,
        last_achieved_date: new Date().toISOString(),
        best_volume_kg: exerciseType === 'weight' ? currentSetPerformance : (exercisePR?.best_volume_kg || null),
        best_time_seconds: exerciseType === 'timed' ? currentSetPerformance : (exercisePR?.best_time_seconds || null),
      };

      const { error: upsertError, data: updatedPR } = await supabase
        .from('user_exercise_prs')
        .upsert(prData, { onConflict: 'user_id,exercise_id' })
        .select()
        .single();

      if (upsertError) {
        console.error("Error saving set PR:", upsertError);
        toast.error("Failed to update personal record: " + upsertError.message);
        return false;
      }
      setExercisePR(updatedPR as UserExercisePR);
    }
    return isNewPR;
  }, [exerciseId, exerciseType, exercisePR, supabase]);

  return { exercisePR, loadingPR, checkAndSaveSetPR };
};