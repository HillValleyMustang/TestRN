"use client";

import { useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { TablesInsert, TablesUpdate, SetLogState, Tables } from '@/types/supabase';
import { convertWeight } from '@/lib/unit-conversions';
import { db, addToSyncQueue } from '@/lib/db';

interface UseSetPersistenceProps {
  exerciseId: string;
  exerciseType: Tables<'exercise_definitions'>['type'];
  exerciseCategory?: Tables<'exercise_definitions'>['category'] | null;
  preferredWeightUnit: Tables<'profiles'>['preferred_weight_unit'];
}

export const useSetPersistence = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  preferredWeightUnit,
}: UseSetPersistenceProps) => {

  const saveSetToDb = useCallback(async (set: SetLogState, setIndex: number, sessionIdToUse: string): Promise<{ savedSet: SetLogState | null }> => {
    // Validation logic remains the same
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
      } else {
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

    const isNewSet = !set.id;
    const setId = set.id || uuidv4();

    const setLogData = {
      id: setId,
      session_id: sessionIdToUse,
      exercise_id: exerciseId,
      weight_kg: set.weight_kg,
      reps: set.reps,
      reps_l: set.reps_l,
      reps_r: set.reps_r,
      time_seconds: set.time_seconds,
      is_pb: false,
      created_at: set.created_at || new Date().toISOString(),
    };

    try {
      await db.set_logs.put(setLogData);
      await addToSyncQueue(isNewSet ? 'create' : 'update', 'set_logs', setLogData);
      toast.success(`Set ${setIndex + 1} saved locally.`);
      return { savedSet: { ...set, ...setLogData, isSaved: true } };
    } catch (error: any) {
      toast.error(`Failed to save set ${setIndex + 1} locally: ` + error.message);
      console.error("Error saving set locally:", error);
      return { savedSet: null };
    }
  }, [exerciseId, exerciseType, exerciseCategory, preferredWeightUnit]);

  const deleteSetFromDb = useCallback(async (setId: string): Promise<boolean> => {
    try {
      await db.set_logs.delete(setId);
      await addToSyncQueue('delete', 'set_logs', { id: setId });
      toast.success("Set removed. Will sync deletion when online.");
      return true;
    } catch (error: any) {
      toast.error("Failed to remove set locally: " + error.message);
      return false;
    }
  }, []);

  return { saveSetToDb, deleteSetFromDb };
};