"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, UserExercisePR, UserExercisePRInsert, UserExercisePRUpdate } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseExercisePRLogicProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  supabase: SupabaseClient;
}

export const useExercisePRLogic = ({ exerciseId, exerciseType, supabase }: UseExercisePRLogicProps) => {
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

  const updateExercisePRStatus = useCallback(async (currentSessionId: string, sets: SetLogState[]): Promise<boolean> => {
    let currentExercisePRValue: number | null = null;
    // The sets passed are already for the current exercise. No need to filter by session_id which might be stale.
    const currentSessionSets = sets;

    if (exerciseType === 'weight') {
      currentExercisePRValue = currentSessionSets.reduce((totalVolume, set) => totalVolume + ((set.weight_kg || 0) * (set.reps || 0)), 0);
    } else if (exerciseType === 'timed') {
      const validTimes = currentSessionSets.map(set => set.time_seconds).filter((time): time is number => time !== null);
      // For timed exercises like planks, a higher value (longer duration) is better.
      currentExercisePRValue = validTimes.length > 0 ? Math.max(...validTimes) : null;
    }

    let isNewPROverall = false;
    if (currentExercisePRValue !== null) {
      if (!exercisePR) {
        isNewPROverall = true;
      } else if (exerciseType === 'weight' && exercisePR.best_volume_kg !== null) {
        isNewPROverall = currentExercisePRValue > exercisePR.best_volume_kg;
      } else if (exerciseType === 'timed' && exercisePR.best_time_seconds !== null) {
        isNewPROverall = currentExercisePRValue > exercisePR.best_time_seconds;
      } else {
        // This case handles when there's a PR record but the relevant field is null (e.g., first time doing a timed exercise)
        isNewPROverall = true;
      }
    }

    // Update is_pb flag for all sets in the current session if it's a new PR
    if (isNewPROverall) {
      const { error: updatePbError } = await supabase
        .from('set_logs')
        .update({ is_pb: true })
        .eq('session_id', currentSessionId)
        .eq('exercise_id', exerciseId);
      if (updatePbError) {
        console.error("Error updating is_pb for sets:", updatePbError);
      }
    }

    // Update user_exercise_prs table if a new PR was achieved
    try {
      if (isNewPROverall) {
        const prData: UserExercisePRInsert | UserExercisePRUpdate = {
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          exercise_id: exerciseId,
          last_achieved_date: new Date().toISOString(),
          best_volume_kg: exerciseType === 'weight' ? currentExercisePRValue : (exercisePR?.best_volume_kg || null),
          best_time_seconds: exerciseType === 'timed' ? currentExercisePRValue : (exercisePR?.best_time_seconds || null),
        };

        const { error: upsertError, data: updatedPR } = await supabase
          .from('user_exercise_prs')
          .upsert(prData, { onConflict: 'user_id,exercise_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;
        setExercisePR(updatedPR as UserExercisePR);
      }
      return isNewPROverall;
    } catch (err: any) {
      console.error("Error saving exercise PR:", err);
      toast.error("Failed to update personal record: " + err.message);
      return false;
    }
  }, [exerciseId, exerciseType, exercisePR, supabase]);

  return { exercisePR, loadingPR, updateExercisePRStatus };
};