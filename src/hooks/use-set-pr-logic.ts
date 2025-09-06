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
        return;
      }

      setLoadingPR(true);
      console.log(`[useSetPRLogic] Fetching PR for exerciseId: ${exerciseId}, userId: ${session.user.id}`); // DEBUG
      const { data, error, status, statusText } = await supabase // Capture status and statusText
        .from('user_exercise_prs')
        .select('id, user_id, exercise_id, best_volume_kg, best_time_seconds, last_achieved_date, created_at, updated_at')
        .eq('exercise_id', exerciseId)
        .eq('user_id', session.user.id) // Explicitly filter by user_id
        .limit(1);

      console.log(`[TEST PR FETCH] Raw fetch for exerciseId: ${exerciseId}, userId: ${session.user.id}`); // DEBUG
      console.log(`[TEST PR FETCH] Raw fetch SUCCESS. Data:`, data); // DEBUG
      console.log(`[TEST PR FETCH] Status: ${status}, Status Text: ${statusText}`); // DEBUG

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching exercise PR:", error);
        setExercisePR(null);
      } else if (data && data.length > 0) {
        setExercisePR(data[0] as UserExercisePR); // Take the first (and only) record
        console.log(`[useSetPRLogic] Found existing PR for ${exerciseId}:`, data[0]); // DEBUG
      } else {
        setExercisePR(null);
        console.log(`[useSetPRLogic] No existing PR found for ${exerciseId}.`); // DEBUG
      }
      setLoadingPR(false);
    };
    fetchExercisePR();
  }, [exerciseId, supabase, session?.user.id]);

  const checkAndSaveSetPR = useCallback(async (set: SetLogState, userId: string): Promise<boolean> => {
    let currentSetPerformance: number | null = null;

    if (exerciseType === 'weight') {
      currentSetPerformance = (set.weight_kg || 0) * (set.reps || 0);
    } else if (exerciseType === 'timed') {
      currentSetPerformance = set.time_seconds || 0;
    }

    if (currentSetPerformance === null || currentSetPerformance <= 0) {
      console.log(`[useSetPRLogic] No valid performance for PR check. currentSetPerformance: ${currentSetPerformance}`); // DEBUG
      return false;
    }

    console.log(`[useSetPRLogic] checkAndSaveSetPR called for exercise ${exerciseId}, userId ${userId}. Current exercisePR state:`, exercisePR); // DEBUG

    let isNewPR = false;
    if (!exercisePR) {
      isNewPR = true;
      console.log(`[useSetPRLogic] No previous PR, setting isNewPR to true.`); // DEBUG
    } else if (exerciseType === 'weight' && exercisePR.best_volume_kg !== null) {
      console.log(`[useSetPRLogic] Comparing weight PR: current ${currentSetPerformance} vs best ${exercisePR.best_volume_kg}`); // DEBUG
      isNewPR = currentSetPerformance >= exercisePR.best_volume_kg;
    } else if (exerciseType === 'timed' && exercisePR.best_time_seconds !== null) {
      console.log(`[useSetPRLogic] Comparing timed PR: current ${currentSetPerformance} vs best ${exercisePR.best_time_seconds}`); // DEBUG
      isNewPR = currentSetPerformance >= exercisePR.best_time_seconds;
    } else {
      isNewPR = true;
      console.log(`[useSetPRLogic] Previous PR exists but relevant field is null, setting isNewPR to true.`); // DEBUG
    }

    console.log(`[useSetPRLogic] isNewPR calculated as: ${isNewPR}`); // DEBUG

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
  }, [exerciseId, exerciseType, exercisePR, supabase, session?.user.id]);

  return { exercisePR, loadingPR, checkAndSaveSetPR };
};