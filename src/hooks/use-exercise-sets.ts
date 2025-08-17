"use client";

import { useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/types/supabase';
import { SetLogState } from './use-workout-session'; // Import the shared type

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLogInsert = TablesInsert<'set_logs'>;

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
  handleInputChange: (setIndex: number, field: keyof SetLogInsert, value: string) => void;
  handleSaveSet: (setIndex: number) => Promise<void>;
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
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
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
  }, [exerciseId, onUpdateSets]);

  const handleInputChange = useCallback((setIndex: number, field: keyof SetLogInsert, value: string) => {
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

    const newSetLog: SetLogInsert = {
      session_id: currentSessionId,
      exercise_id: exerciseId,
      weight_kg: currentSet.weight_kg,
      reps: currentSet.reps,
      reps_l: currentSet.reps_l,
      reps_r: currentSet.reps_r,
      time_seconds: currentSet.time_seconds,
      is_pb: isPR, // Save the calculated PR status
    };

    const { error: saveError } = await supabase.from('set_logs').insert([newSetLog]);

    if (saveError) {
      toast.error("Failed to save set: " + saveError.message);
      console.error("Error saving set:", saveError);
    } else {
      setSets(prev => {
        const updatedSets = [...prev];
        updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: true, isPR: isPR };
        onUpdateSets(exerciseId, updatedSets); // Update global state
        return updatedSets;
      });
      toast.success("Set saved successfully!");
    }
  }, [currentSessionId, exerciseId, exerciseType, exerciseCategory, sets, supabase, onUpdateSets]);

  return {
    sets,
    handleAddSet,
    handleInputChange,
    handleSaveSet,
  };
};