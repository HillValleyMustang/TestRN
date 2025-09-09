"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState, UserExercisePR, UserExercisePRInsert, UserExercisePRUpdate } from '@/types/supabase';
import { useSession } from '@/components/session-context-provider'; // Import useSession to get user ID

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UseSetPRLogicProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  supabase: SupabaseClient;
}

export const useSetPRLogic = ({ exerciseId, exerciseType, supabase }: UseSetPRLogicProps) => {
  const { session } = useSession(); // Get session to access user ID
  const [exercisePR, setExercisePR] = useState<UserExercisePR | null>(null);
  const [loadingPR, setLoadingPR] = useState(true);

  useEffect(() => {
    const fetchExercisePR = async () => {
      if (!session?.user.id) {
        setLoadingPR(false);
        console.log(`[useSetPRLogic] No user session, skipping PB fetch for ${exerciseId}`);
        return;
      }

      setLoadingPR(true);
      console.log(`[useSetPRLogic] Fetching PB for exercise ${exerciseId} for user ${session.user.id}`);
      const { data, error } = await supabase
        .from('user_exercise_prs')
        .select('id, user_id, exercise_id, best_volume_kg, best_time_seconds, last_achieved_date, created_at, updated_at')
        .eq('exercise_id', exerciseId)
        .eq('user_id', session.user.id) // Explicitly filter by user_id
        .limit(1); // Fetch up to one record

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error(`[useSetPRLogic] Error fetching exercise PB for ${exerciseId}:`, error);
        setExercisePR(null);
      } else if (data && data.length > 0) {
        setExercisePR(data[0] as UserExercisePR); // Take the first (and only) record
        console.log(`[useSetPRLogic] Found existing PB for ${exerciseId}:`, data[0]);
      } else {
        setExercisePR(null);
        console.log(`[useSetPRLogic] No existing PB found for ${exerciseId}.`);
      }
      setLoadingPR(false);
    };
    fetchExercisePR();
  }, [exerciseId, supabase, session?.user.id]);

  const checkAndSaveSetPR = useCallback(async (
    set: SetLogState,
    userId: string,
    currentPRState: UserExercisePR | null // New argument
  ): Promise<{ isNewPR: boolean; updatedPR: UserExercisePR | null }> => {
    let currentSetPerformance: number | null = null;

    if (exerciseType === 'weight') {
      currentSetPerformance = (set.weight_kg || 0) * (set.reps || 0);
    } else if (exerciseType === 'timed') {
      currentSetPerformance = set.time_seconds || 0;
    }

    console.log(`[useSetPRLogic] checkAndSaveSetPB for ${exerciseId}, set performance: ${currentSetPerformance}, currentPRState:`, currentPRState);

    if (currentSetPerformance === null || currentSetPerformance <= 0) {
      console.log(`[useSetPRLogic] No valid performance for PB check for ${exerciseId}.`);
      return { isNewPR: false, updatedPR: currentPRState };
    }

    let isNewPR = false;
    if (!currentPRState) { // Use currentPRState for comparison
      isNewPR = true;
      console.log(`[useSetPRLogic] No previous PB, so this is a new PB for ${exerciseId}.`);
    } else if (exerciseType === 'weight' && currentPRState.best_volume_kg !== null) {
      isNewPR = currentSetPerformance > currentPRState.best_volume_kg;
      console.log(`[useSetPRLogic] Weight PB check: current ${currentSetPerformance} vs previous ${currentPRState.best_volume_kg}. New PB: ${isNewPR}`);
    } else if (exerciseType === 'timed' && currentPRState.best_time_seconds !== null) {
      isNewPR = currentSetPerformance > currentPRState.best_time_seconds;
      console.log(`[useSetPRLogic] Timed PB check: current ${currentSetPerformance} vs previous ${currentPRState.best_time_seconds}. New PB: ${isNewPR}`);
    } else {
      // This case handles when there's a PB record but the relevant field is null (e.g., first time doing a timed exercise)
      isNewPR = true;
      console.log(`[useSetPRLogic] Existing PB record but relevant field is null, so this is a new PB for ${exerciseId}.`);
    }

    if (isNewPR) {
      console.log(`[useSetPRLogic] New PB detected for exercise ${exerciseId}! Performance: ${currentSetPerformance}`);
      const prData: UserExercisePRInsert | UserExercisePRUpdate = {
        user_id: userId,
        exercise_id: exerciseId,
        last_achieved_date: new Date().toISOString(),
        best_volume_kg: exerciseType === 'weight' ? currentSetPerformance : (currentPRState?.best_volume_kg || null),
        best_time_seconds: exerciseType === 'timed' ? currentSetPerformance : (currentPRState?.best_time_seconds || null),
      };

      const { error: upsertError, data: updatedPR } = await supabase
        .from('user_exercise_prs')
        .upsert(prData, { onConflict: 'user_id,exercise_id' })
        .select()
        .single();

      if (upsertError) {
        console.error(`[useSetPRLogic] Error saving set PB for ${exerciseId}:`, upsertError);
        toast.error("Failed to update personal best: " + upsertError.message);
        return { isNewPR: false, updatedPR: currentPRState }; // Return original if error
      }
      setExercisePR(updatedPR as UserExercisePR); // Update internal state
      console.log(`[useSetPRLogic] Successfully upserted PB for ${exerciseId}. New PB record:`, updatedPR);
      return { isNewPR: true, updatedPR: updatedPR as UserExercisePR };
    }
    console.log(`[useSetPRLogic] No new PB for ${exerciseId}.`);
    return { isNewPR: false, updatedPR: currentPRState };
  }, [exerciseId, exerciseType, supabase, session?.user.id]);

  return { exercisePR, loadingPR, checkAndSaveSetPR };
};