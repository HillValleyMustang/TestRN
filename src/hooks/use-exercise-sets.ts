"use client";

import { useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate, SetLogState } from '@/types/supabase'; // Import SetLogState from consolidated types

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>; // Use Tables<'set_logs'> to get the 'id' field

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => void;
  handleInputChange: (setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => void;
  handleSaveSet: (setIndex: number) => Promise<void>;
  handleEditSet: (setIndex: number) => void;
  handleDeleteSet: (setIndex: number) => Promise<void>;
}

export const useExerciseSets = ({
  exerciseId,
  exerciseType,
  exerciseCategory,
  currentSessionId,
  supabase,
  onUpdateSets,
  initialSets,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const [sets, setSets] = useState<SetLogState[]>(initialSets);

  const handleAddSet = useCallback(() => {
    setSets(prev => {
      const lastSet = prev[prev.length - 1];
      const newSet: SetLogState = {
        id: null, // New sets don't have an ID yet
        created_at: null, // Will be set by DB
        session_id: currentSessionId,
        exercise_id: exerciseId,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false, // Default for new set
        isSaved: false,
        isPR: false,
        lastWeight: lastSet?.weight_kg,
        lastReps: lastSet?.reps,
        lastTimeSeconds: lastSet?.time_seconds,
      };
      const updatedSets = [...prev, newSet];
      onUpdateSets(exerciseId, updatedSets); // Update global state
      return updatedSets;
    });
  }, [exerciseId, onUpdateSets, currentSessionId]);

  const handleInputChange = useCallback((setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => {
    setSets(prev => {
      const newSets = [...prev];
      newSets[setIndex] = {
        ...newSets[setIndex],
        [field]: parseFloat(value) || null
      };
      onUpdateSets(exerciseId, newSets); // Update global state
      return newSets;
    });
  }, [exerciseId, onUpdateSets]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    if (!currentSessionId) {
      toast.error("Workout session not started. Please refresh.");
      return;
    }

    const currentSet = sets[setIndex];

    if (exerciseType === 'weight' && (!currentSet.weight_kg || !currentSet.reps)) {
      toast.error("Please enter weight and reps for this set.");
      return;
    }
    if (exerciseType === 'timed' && !currentSet.time_seconds) {
      toast.error("Please enter time for this set.");
      return;
    }
    if (exerciseCategory === 'Unilateral' && (!currentSet.reps_l || !currentSet.reps_r)) {
      toast.error("Please enter reps for both left and right sides.");
      return;
    }

    // Check for Personal Record (PR) before saving
    let isPR = false;
    const { data: allPreviousSets, error: fetchPreviousError } = await supabase
      .from('set_logs')
      .select('weight_kg, reps, time_seconds')
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false });

    if (fetchPreviousError) {
      console.error("Error fetching previous sets for PR check:", fetchPreviousError);
    } else {
      const relevantPreviousSets = allPreviousSets || [];

      if (exerciseType === 'weight') {
        const currentVolume = (currentSet.weight_kg || 0) * (currentSet.reps || 0);
        // A new PR if current volume is strictly greater than all previous volumes
        isPR = relevantPreviousSets.every(prevSet => {
          const prevVolume = (prevSet.weight_kg || 0) * (prevSet.reps || 0);
          return currentVolume > prevVolume;
        });
      } else if (exerciseType === 'timed') {
        const currentTime = currentSet.time_seconds || Infinity;
        // A new PR if current time is strictly less than all previous times (for timed exercises, lower is better)
        isPR = relevantPreviousSets.every(prevSet => {
          const prevTime = prevSet.time_seconds || Infinity;
          return currentTime < prevTime;
        });
      }
    }

    const setLogData: TablesInsert<'set_logs'> | TablesUpdate<'set_logs'> = {
      session_id: currentSessionId,
      exercise_id: exerciseId,
      weight_kg: currentSet.weight_kg,
      reps: currentSet.reps,
      reps_l: currentSet.reps_l,
      reps_r: currentSet.reps_r,
      time_seconds: currentSet.time_seconds,
      is_pb: isPR, // Save the calculated PR status
    };

    let error;
    let data;

    if (currentSet.id) {
      // Update existing set
      const result = await supabase
        .from('set_logs')
        .update(setLogData as TablesUpdate<'set_logs'>)
        .eq('id', currentSet.id)
        .select()
        .single();
      error = result.error;
      data = result.data;
    } else {
      // Insert new set
      const result = await supabase.from('set_logs').insert([setLogData as TablesInsert<'set_logs'>]).select().single();
      error = result.error;
      data = result.data;
    }

    if (error) {
      toast.error("Failed to save set: " + error.message);
      console.error("Error saving set:", error);
    } else {
      setSets(prev => {
        const updatedSets = [...prev];
        updatedSets[setIndex] = {
          ...updatedSets[setIndex],
          ...data, // Update with actual data from DB (e.g., id, created_at)
          isSaved: true,
          isPR: isPR,
        };
        onUpdateSets(exerciseId, updatedSets); // Update global state
        return updatedSets;
      });
      toast.success("Set saved successfully!");
    }
  }, [currentSessionId, exerciseId, exerciseType, exerciseCategory, sets, supabase, onUpdateSets]);

  const handleEditSet = useCallback((setIndex: number) => {
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      onUpdateSets(exerciseId, updatedSets); // Update global state
      return updatedSets;
    });
  }, [exerciseId, onUpdateSets]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    const setToDelete = sets[setIndex];
    if (!setToDelete.id) {
      // If it's a new unsaved set, just remove from UI
      setSets(prev => {
        const updatedSets = prev.filter((_, i) => i !== setIndex);
        onUpdateSets(exerciseId, updatedSets);
        return updatedSets;
      });
      toast.success("Unsaved set removed.");
      return;
    }

    if (!confirm("Are you sure you want to delete this set? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from('set_logs')
      .delete()
      .eq('id', setToDelete.id);

    if (error) {
      toast.error("Failed to delete set: " + error.message);
      console.error("Error deleting set:", error);
    } else {
      setSets(prev => {
        const updatedSets = prev.filter((_, i) => i !== setIndex);
        onUpdateSets(exerciseId, updatedSets); // Update global state
        return updatedSets;
      });
      toast.success("Set deleted successfully!");
    }
  }, [exerciseId, sets, supabase, onUpdateSets]);

  return {
    sets,
    handleAddSet,
    handleInputChange,
    handleSaveSet,
    handleEditSet,
    handleDeleteSet,
  };
};