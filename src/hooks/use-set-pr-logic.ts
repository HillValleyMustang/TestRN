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

  // --- Temporary Test Function ---
  const testPRFetch = useCallback(async () => {
    if (!session?.user.id) {
      console.log(`[TEST PR FETCH] No session user ID.`);
      return;
    }
    console.log(`[TEST PR FETCH] Attempting raw fetch for exerciseId: ${exerciseId}, userId: ${session.user.id}`);
    try {
      const { data, error, status, statusText } = await supabase
        .from('user_exercise_prs')
        .select('*') // Select all to be sure
        .eq('exercise_id', exerciseId)
        .eq('user_id', session.user.id)
        .limit(1);

      if (error) {
        console.error(`[TEST PR FETCH] Raw fetch ERROR:`, error);
        console.error(`[TEST PR FETCH] Status: ${status}, Status Text: ${statusText}`);
      } else {
        console.log(`[TEST PR FETCH] Raw fetch SUCCESS. Data:`, data);
        console.log(`[TEST PR FETCH] Status: ${status}, Status Text: ${statusText}`);
      }
    } catch (e) {
      console.error(`[TEST PR FETCH] Raw fetch EXCEPTION:`, e);
    }
  }, [exerciseId, supabase, session?.user.id]);
  // --- End Temporary Test Function ---

  useEffect(() => {
    const fetchExercisePR = async () => {
      if (!session?.user.id) {
        console.log(`[useSetPRLogic] No session user ID, skipping PR fetch for exercise ${exerciseId}.`);
        setLoadingPR(false);
        return;
      }

      setLoadingPR(true);
      console.log(`[useSetPRLogic] Fetching PR for exerciseId: ${exerciseId}, userId: ${session.user.id}`);
      const { data, error } = await supabase
        .from('user_exercise_prs')
        .select('id, user_id, exercise_id, best_volume_kg, best_time_seconds, last_achieved_date, created_at, updated_at')
        .eq('exercise_id', exerciseId)
        .eq('user_id', session.user.id) // Explicitly filter by user_id
        .limit(1); // Fetch up to one record

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error(`[useSetPRLogic] Error fetching exercise PR for ${exerciseId}:`, error);
        setExercisePR(null);
      } else if (data && data.length > 0) {
        console.log(`[useSetPRLogic] Found existing PR for ${exerciseId}:`, data[0]);
        setExercisePR(data[0] as UserExercisePR);
      } else {
        console.log(`[useSetPRLogic] No existing PR found for ${exerciseId}.`);
        setExercisePR(null);
      }
      setLoadingPR(false);
    };
    fetchExercisePR();
    // Call the test function here to see its output
    testPRFetch(); 
  }, [exerciseId, supabase, session?.user.id, testPRFetch]); // Add testPRFetch to dependencies

  const checkAndSaveSetPR = useCallback(async (set: SetLogState, userId: string): Promise<boolean> => {
    console.log(`[useSetPRLogic] checkAndSaveSetPR called for exercise ${exerciseId}, userId ${userId}. Current exercisePR state:`, exercisePR);

    let currentSetPerformance: number | null = null;

    if (exerciseType === 'weight') {
      currentSetPerformance = (set.weight_kg || 0) * (set.reps || 0);
    } else if (exerciseType === 'timed') {
      currentSetPerformance = set.time_seconds || 0;
    }

    if (currentSetPerformance === null || currentSetPerformance <= 0) {
      console.log(`[useSetPRLogic] No valid performance for PR check. currentSetPerformance: ${currentSetPerformance}`);
      return false; // No valid performance to check for PR
    }

    let isNewPR = true; // TEMPORARY: Force to true for testing
    // if (!exercisePR) {
    //   console.log(`[useSetPRLogic] No existing PR found for ${exerciseId}. This is a new PR.`);
    //   isNewPR = true;
    // } else if (exerciseType === 'weight' && exercisePR.best_volume_kg !== null) {
    //   console.log(`[useSetPRLogic] Comparing weight PR: current ${currentSetPerformance} vs best ${exercisePR.best_volume_kg}`);
    //   isNewPR = currentSetPerformance > exercisePR.best_volume_kg;
    // } else if (exerciseType === 'timed' && exercisePR.best_time_seconds !== null) {
    //   console.log(`[useSetPRLogic] Comparing timed PR: current ${currentSetPerformance} vs best ${exercisePR.best_time_seconds}`);
    //   isNewPR = currentSetPerformance > exercisePR.best_time_seconds;
    // } else {
    //   // This case handles when there's a PR record but the relevant field is null (e.g., first time doing a timed exercise)
    //   console.log(`[useSetPRLogic] Existing PR record found, but relevant field is null. Treating as new PR.`);
    //   isNewPR = true;
    // }

    console.log(`[useSetPRLogic] isNewPR calculated as: ${isNewPR}`);

    if (isNewPR) {
      const prData: UserExercisePRInsert | UserExercisePRUpdate = {
        user_id: userId,
        exercise_id: exerciseId,
        last_achieved_date: new Date().toISOString(),
        best_volume_kg: exerciseType === 'weight' ? currentSetPerformance : (exercisePR?.best_volume_kg || null),
        best_time_seconds: exerciseType === 'timed' ? currentSetPerformance : (exercisePR?.best_time_seconds || null),
      };
      console.log(`[useSetPRLogic] Attempting to upsert PR data:`, prData);

      const { error: upsertError, data: updatedPR } = await supabase
        .from('user_exercise_prs')
        .upsert(prData, { onConflict: 'user_id,exercise_id' })
        .select()
        .single();

      if (upsertError) {
        console.error("[useSetPRLogic] Error saving set PR:", upsertError);
        toast.error("Failed to update personal record: " + upsertError.message);
        return false;
      }
      console.log(`[useSetPRLogic] Successfully upserted PR. New PR data:`, updatedPR);
      setExercisePR(updatedPR as UserExercisePR); // Update state with the new PR
    }
    return isNewPR;
  }, [exerciseId, exerciseType, exercisePR, supabase, session?.user.id]); // Added session.user.id to dependencies

  return { exercisePR, loadingPR, checkAndSaveSetPR };
};