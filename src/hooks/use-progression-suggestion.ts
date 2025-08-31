"use client";

import { useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, SetLogState } from '@/types/supabase';
import { convertWeight, formatWeight } from '@/lib/unit-conversions';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

interface UseProgressionSuggestionProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  supabase: SupabaseClient;
  preferredWeightUnit: Profile['preferred_weight_unit'];
}

const MAX_SETS = 5;
const DEFAULT_INITIAL_SETS = 3;

export const useProgressionSuggestion = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  supabase,
  preferredWeightUnit,
}: UseProgressionSuggestionProps) => {

  const getProgressionSuggestion = useCallback(async (currentSetsLength: number, internalSessionId: string | null): Promise<{ newSets: SetLogState[] | null; message: string }> => {
    if (!supabase) {
      toast.error("Supabase client not available.");
      return { newSets: null, message: "Error: Supabase client not available." };
    }

    try {
      const { data: previousSets, error: fetchError } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, reps_l, reps_r, time_seconds')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) throw fetchError;

      let suggestedWeight: number | null = null;
      let suggestedReps: number | null = null;
      let suggestedRepsL: number | null = null;
      let suggestedRepsR: number | null = null;
      let suggestedTime: number | null = null;
      let suggestedNumSets = DEFAULT_INITIAL_SETS;
      let suggestionMessage = "Focus on mastering your form!";

      if (previousSets && previousSets.length > 0) {
        const lastSet = previousSets[0];

        if (exerciseType === 'weight') {
          const lastWeight = lastSet.weight_kg || 0;
          const lastReps = lastSet.reps || 0;

          if (lastReps >= 8 && lastWeight > 0) {
            suggestedWeight = lastWeight + 2.5;
            suggestedReps = 8;
            suggestionMessage = `Great work! Try increasing the weight to ${formatWeight(convertWeight(suggestedWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')} for 8 reps.`;
          } else if (lastReps >= 5 && lastReps < 8 && lastWeight > 0) {
            suggestedWeight = lastWeight;
            suggestedReps = lastReps + 1;
            suggestionMessage = `Good effort! Try to hit ${suggestedReps} reps with ${formatWeight(convertWeight(suggestedWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')} next time.`;
          } else {
            suggestedWeight = lastWeight;
            suggestedReps = lastReps;
            suggestionMessage = `Consider maintaining ${formatWeight(convertWeight(suggestedWeight, 'kg', preferredWeightUnit as 'kg' | 'lbs'), preferredWeightUnit as 'kg' | 'lbs')} and focusing on form, or slightly reducing weight to hit more reps.`;
          }

          if (exerciseCategory === 'Unilateral') {
            suggestedRepsL = suggestedReps;
            suggestedRepsR = suggestedReps;
            suggestedReps = null;
          }

          if (currentSetsLength < MAX_SETS && previousSets.length >= 3) {
            const allPreviousSetsHitTarget = previousSets.slice(0, 3).every(s => (s.reps || 0) >= 8);
            if (allPreviousSetsHitTarget) {
              suggestedNumSets = Math.min(currentSetsLength + 1, MAX_SETS);
              suggestionMessage += ` You're consistent! Consider adding a set.`;
            }
          }

        } else if (exerciseType === 'timed') {
          const lastTime = lastSet.time_seconds || 0;
          if (lastTime > 0) {
            suggestedTime = lastTime + 5;
            suggestionMessage = `Nice! Try to hold for ${suggestedTime} seconds next time.`;
          } else {
            suggestedTime = 30;
            suggestionMessage = "Let's aim for 30 seconds on this timed exercise!";
          }

          if (currentSetsLength < MAX_SETS && previousSets.length >= 3) {
            const allPreviousSetsHitTarget = previousSets.slice(0, 3).every(s => (s.time_seconds || 0) >= (suggestedTime || 0) - 5);
            if (allPreviousSetsHitTarget) {
              suggestedNumSets = Math.min(currentSetsLength + 1, MAX_SETS);
              suggestionMessage += ` You're consistent! Consider adding a set.`;
            }
          }
        }
      } else {
        if (exerciseType === 'weight') {
          suggestedWeight = 10;
          suggestedReps = 8;
          if (exerciseCategory === 'Unilateral') {
            suggestedRepsL = suggestedReps;
            suggestedRepsR = suggestedReps;
            suggestedReps = null;
          }
          suggestionMessage = "No previous sets found. Let's start with 10kg for 8 reps and focus on form!";
        } else if (exerciseType === 'timed') {
          suggestedTime = 30;
          suggestionMessage = "No previous sets found. Let's aim for 30 seconds and focus on form!";
        }
      }

      const newSets: SetLogState[] = [];
      for (let i = 0; i < suggestedNumSets; i++) {
        newSets.push({
          id: null, created_at: null, session_id: internalSessionId, exercise_id: exerciseId,
          weight_kg: suggestedWeight, reps: suggestedReps, reps_l: suggestedRepsL, reps_r: suggestedRepsR, time_seconds: suggestedTime,
          is_pb: false, isSaved: false, isPR: false,
          lastWeight: suggestedWeight, lastReps: suggestedReps, lastRepsL: suggestedRepsL, lastRepsR: suggestedRepsR, lastTimeSeconds: suggestedTime,
        });
      }
      
      return { newSets, message: suggestionMessage };

    } catch (err: any) {
      console.error("Failed to generate progression suggestion:", err);
      toast.error("Failed to generate suggestion: " + err.message);
      return { newSets: null, message: "Failed to generate suggestion." };
    }
  }, [exerciseId, exerciseType, exerciseCategory, supabase, preferredWeightUnit]);

  return { getProgressionSuggestion };
};