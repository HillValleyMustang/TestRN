"use client";

import { useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { TablesInsert, TablesUpdate, SetLogState, Tables } from '@/types/supabase';
import { convertWeight } from '@data/utils/unit-conversions';
import { db, addToSyncQueue } from '@/lib/db';

interface UseSetPersistenceProps {
  exerciseId: string;
  exerciseType: Tables<'exercise_definitions'>['type'];
  exerciseCategory?: Tables<'exercise_definitions'>['category'] | null;
  supabase: SupabaseClient;
  preferredWeightUnit: Tables<'profiles'>['preferred_weight_unit'];
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

export const useSetPersistence = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  supabase,
  preferredWeightUnit,
  setTempStatusMessage, // NEW
}: UseSetPersistenceProps) => {

  const saveSetToDb = useCallback(async (set: SetLogState, setIndex: number, sessionIdToUse: string): Promise<{ savedSet: SetLogState | null }> => {
    // Validation logic remains the same
    if (exerciseType === 'weight') {
      if (set.weight_kg === null || set.weight_kg <= 0) {
        setTempStatusMessage({ message: "Invalid weight!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        return { savedSet: null };
      }
      if (exerciseCategory === 'Unilateral') {
        if (set.reps_l === null || set.reps_r === null || set.reps_l < 0 || set.reps_r < 0) {
          setTempStatusMessage({ message: "Invalid reps!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
          return { savedSet: null };
        }
      } else {
        if (set.reps === null || set.reps <= 0) {
          setTempStatusMessage({ message: "Invalid reps!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
          return { savedSet: null };
        }
      }
    } else if (exerciseType === 'timed') {
      if (set.time_seconds === null || set.time_seconds <= 0) {
        setTempStatusMessage({ message: "Invalid time!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
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
      is_pb: set.is_pb,
      created_at: set.created_at || new Date().toISOString(),
    };

    console.log(`[useSetPersistence] Attempting to save setLogData:`, setLogData);

    try {
      await db.set_logs.put(setLogData);
      await addToSyncQueue(isNewSet ? 'create' : 'update', 'set_logs', setLogData);
      console.log(`[useSetPersistence] Set ${setIndex + 1} saved locally and added to sync queue.`);
      return { savedSet: { ...set, ...setLogData, isSaved: true } };
    } catch (error: any) {
      console.error(`[useSetPersistence] ERROR saving set ${setIndex + 1} locally:`, error);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return { savedSet: null };
    }
  }, [exerciseId, exerciseType, exerciseCategory, supabase, preferredWeightUnit, setTempStatusMessage]);

  const deleteSetFromDb = useCallback(async (setId: string): Promise<boolean> => {
    try {
      await db.set_logs.delete(setId);
      await addToSyncQueue('delete', 'set_logs', { id: setId });
      setTempStatusMessage({ message: "Removed!", type: 'removed' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return true;
    } catch (error: any) {
      console.error(`[useSetPersistence] ERROR deleting set ${setId} locally:`, error);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return false;
    }
  }, [supabase, setTempStatusMessage]);

  return { saveSetToDb, deleteSetFromDb };
};