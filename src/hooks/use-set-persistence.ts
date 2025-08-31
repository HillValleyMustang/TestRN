"use client";

import { useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { TablesInsert, TablesUpdate, SetLogState, Tables } from '@/types/supabase'; // Added Tables import
import { convertWeight } from '@/lib/unit-conversions';

interface UseSetPersistenceProps {
  exerciseId: string;
  exerciseType: Tables<'exercise_definitions'>['type'];
  exerciseCategory?: Tables<'exercise_definitions'>['category'] | null;
  supabase: SupabaseClient;
  preferredWeightUnit: Tables<'profiles'>['preferred_weight_unit'];
}

export const useSetPersistence = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  supabase,
  preferredWeightUnit,
}: UseSetPersistenceProps) => {

  const saveSetToDb = useCallback(async (set: SetLogState, setIndex: number, sessionIdToUse: string): Promise<{ savedSet: SetLogState | null }> => {
    if (exerciseType === 'weight') {
      if (set.weight_kg === null || set.weight_kg <= 0) {
        toast.error(`Set ${setIndex + 1}: Please enter a valid positive weight.`);
        return { savedSet: null };
      }
      if (exerciseCategory === 'Unilateral') {
        if (set.reps_l === null || set.reps_r === null || set.reps_l < 0 || set.reps_r < 0) {
          toast.error(`Set ${setIndex + 1}: Please enter valid positive reps for both left and right sides.`);
          return { savedSet: null };
        }
      } else { // Bilateral weight
        if (set.reps === null || set.reps <= 0) {
          toast.error(`Set ${setIndex + 1}: Please enter valid positive reps.`);
          return { savedSet: null };
        }
      }
    } else if (exerciseType === 'timed') {
      if (set.time_seconds === null || set.time_seconds <= 0) {
        toast.error(`Set ${setIndex + 1}: Please enter a valid positive time in seconds.`);
        return { savedSet: null };
      }
    }

    const setLogData: TablesInsert<'set_logs'> = {
      session_id: sessionIdToUse,
      exercise_id: exerciseId,
      weight_kg: set.weight_kg,
      reps: set.reps,
      reps_l: set.reps_l,
      reps_r: set.reps_r,
      time_seconds: set.time_seconds,
      is_pb: false, // Will be determined and updated after all sets are saved
    };

    console.log(`[DEBUG] Set ${setIndex + 1} - Data to insert/update:`, setLogData);

    let error;
    let data;

    if (set.id) {
      const result = await supabase
        .from('set_logs')
        .update(setLogData as TablesUpdate<'set_logs'>)
        .eq('id', set.id)
        .select()
        .single();
      error = result.error;
      data = result.data;
    } else {
      const result = await supabase.from('set_logs').insert([setLogData]).select().single();
      error = result.error;
      data = result.data;
    }

    if (error) {
      toast.error(`Failed to save set ${setIndex + 1}: ` + error.message);
      console.error("Error saving set:", error);
      console.log(`[DEBUG] Set ${setIndex + 1} - Error from DB:`, error);
      return { savedSet: null };
    } else {
      console.log(`[DEBUG] Set ${setIndex + 1} - Data returned from DB:`, data);
      return { savedSet: { ...set, ...data, isSaved: true } };
    }
  }, [exerciseId, exerciseType, exerciseCategory, supabase, preferredWeightUnit]);

  const deleteSetFromDb = useCallback(async (setId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('set_logs')
      .delete()
      .eq('id', setId);

    if (error) {
      toast.error("Failed to delete set: " + error.message);
      return false;
    }
    toast.success("Set deleted successfully!");
    return true;
  }, [supabase]);

  return { saveSetToDb, deleteSetFromDb };
};