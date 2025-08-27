"use client";

import { useState, useCallback, useEffect, useRef } from 'react'; // Import useRef
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate, SetLogState, UserExercisePRInsert, UserExercisePRUpdate } from '@/types/supabase';
import { convertWeight } from '@/lib/unit-conversions';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;
type Profile = Tables<'profiles'>;
type UserExercisePR = Tables<'user_exercise_prs'>;

interface UseExerciseSetsProps {
  exerciseId: string;
  exerciseName: string; // Added exerciseName
  exerciseType: ExerciseDefinition['type'];
  exerciseCategory?: ExerciseDefinition['category'] | null;
  currentSessionId: string | null;
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => void; // New prop for updating session start time
  onExerciseComplete: (exerciseId: string, isNewPR: boolean) => Promise<void>; // New prop for exercise completion
}

interface UseExerciseSetsReturn {
  sets: SetLogState[];
  handleAddSet: () => void;
  handleInputChange: (setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => void;
  handleSaveSet: (setIndex: number) => Promise<void>;
  handleEditSet: (setIndex: number) => void;
  handleDeleteSet: (setIndex: number) => Promise<void>;
  handleSaveExercise: () => Promise<boolean>; // New function for saving the entire exercise
  exercisePR: UserExercisePR | null; // State to hold the exercise-level PR
  loadingPR: boolean;
}

const MAX_SETS = 5;
const DEFAULT_INITIAL_SETS = 3;

export const useExerciseSets = ({
  exerciseId,
  exerciseName, // Destructure exerciseName
  exerciseType,
  exerciseCategory,
  currentSessionId,
  supabase,
  onUpdateSets,
  initialSets,
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const [sets, setSets] = useState<SetLogState[]>(initialSets);
  const [exercisePR, setExercisePR] = useState<UserExercisePR | null>(null);
  const [loadingPR, setLoadingPR] = useState(true);
  const hasFirstSetBeenSavedRef = useRef(false); // Use ref for hasFirstSetBeenSaved

  // Initialize sets with 3 empty sets if initialSets is empty
  useEffect(() => {
    if (initialSets.length === 0) {
      const defaultSets: SetLogState[] = Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
        id: null,
        created_at: null,
        session_id: currentSessionId,
        exercise_id: exerciseId,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        isSaved: false,
        isPR: false,
        lastWeight: null,
        lastReps: null,
        lastTimeSeconds: null,
      }));
      setSets(defaultSets);
      onUpdateSets(exerciseId, defaultSets);
    } else {
      setSets(initialSets);
    }
  }, [initialSets, exerciseId, currentSessionId, onUpdateSets]);

  // Fetch exercise-level PR on component mount
  useEffect(() => {
    const fetchExercisePR = async () => {
      setLoadingPR(true);
      const { data, error } = await supabase
        .from('user_exercise_prs')
        .select('*')
        .eq('exercise_id', exerciseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching exercise PR:", error);
      } else if (data) {
        setExercisePR(data as UserExercisePR);
      }
      setLoadingPR(false);
    };
    fetchExercisePR();
  }, [exerciseId, supabase]);

  const handleAddSet = useCallback(() => {
    if (sets.length >= MAX_SETS) {
      toast.info(`Maximum of ${MAX_SETS} sets reached for this exercise.`);
      return;
    }
    setSets(prev => {
      const lastSet = prev[prev.length - 1];
      const newSet: SetLogState = {
        id: null,
        created_at: null,
        session_id: currentSessionId,
        exercise_id: exerciseId,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        isSaved: false,
        isPR: false,
        lastWeight: lastSet?.weight_kg, // Stored in KG
        lastReps: lastSet?.reps,
        lastTimeSeconds: lastSet?.time_seconds,
      };
      const updatedSets = [...prev, newSet];
      onUpdateSets(exerciseId, updatedSets);
      return updatedSets;
    });
  }, [exerciseId, onUpdateSets, currentSessionId, sets.length]);

  const handleInputChange = useCallback((setIndex: number, field: keyof TablesInsert<'set_logs'>, value: string) => {
    setSets(prev => {
      const newSets = [...prev];
      let parsedValue: number | null = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = null;

      if (field === 'weight_kg' && parsedValue !== null) {
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: convertWeight(parsedValue, preferredWeightUnit as 'kg' | 'lbs', 'kg')
        };
      } else {
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: parsedValue
        };
      }
      // Mark set as unsaved if input changes
      newSets[setIndex].isSaved = false;
      onUpdateSets(exerciseId, newSets);
      return newSets;
    });
  }, [exerciseId, onUpdateSets, preferredWeightUnit]);

  const saveSingleSetToDatabase = useCallback(async (set: SetLogState, setIndex: number) => {
    if (!currentSessionId) {
      toast.error("Workout session not started. Please refresh the page to begin logging sets.");
      return null;
    }

    if (exerciseType === 'weight') {
      if (set.weight_kg === null || set.reps === null || set.weight_kg <= 0 || set.reps <= 0) {
        toast.error(`Set ${setIndex + 1}: Please enter valid positive weight and reps.`);
        return null;
      }
    } else if (exerciseType === 'timed') {
      if (set.time_seconds === null || set.time_seconds <= 0) {
        toast.error(`Set ${setIndex + 1}: Please enter a valid positive time in seconds.`);
        return null;
      }
    }

    if (exerciseCategory === 'Unilateral') {
      if (set.reps_l === null || set.reps_r === null || set.reps_l < 0 || set.reps_r < 0) {
        toast.error(`Set ${setIndex + 1}: Please enter valid positive reps for both left and right sides.`);
        return null;
      }
    }

    // Check for Personal Record (PR) for this specific set
    let isSetPR = false;
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
        const currentVolume = (set.weight_kg || 0) * (set.reps || 0);
        isSetPR = relevantPreviousSets.every(prevSet => {
          const prevVolume = (prevSet.weight_kg || 0) * (prevSet.reps || 0);
          return currentVolume > prevVolume;
        });
      } else if (exerciseType === 'timed') {
        const currentTime = set.time_seconds || Infinity;
        isSetPR = relevantPreviousSets.every(prevSet => {
          const prevTime = prevSet.time_seconds || Infinity;
          return currentTime < prevTime;
        });
      }
    }

    const setLogData: TablesInsert<'set_logs'> = {
      session_id: currentSessionId,
      exercise_id: exerciseId,
      weight_kg: set.weight_kg,
      reps: set.reps,
      reps_l: set.reps_l,
      reps_r: set.reps_r,
      time_seconds: set.time_seconds,
      is_pb: isSetPR,
    };

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
      return null;
    } else {
      if (isSetPR) {
        toast.success(`Set ${setIndex + 1}: New Personal Record!`);
      }
      return { ...set, ...data, isSaved: true, isPR: isSetPR };
    }
  }, [currentSessionId, exerciseId, exerciseType, exerciseCategory, supabase]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    const updatedSet = await saveSingleSetToDatabase(sets[setIndex], setIndex);
    if (updatedSet) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = updatedSet;
        onUpdateSets(exerciseId, newSets);
        return newSets;
      });
      toast.success(`Set ${setIndex + 1} saved successfully!`);

      // If this is the very first set saved in the entire workout, update session_date
      if (!hasFirstSetBeenSavedRef.current) {
        onFirstSetSaved(updatedSet.created_at);
        hasFirstSetBeenSavedRef.current = true;
      }
    }
  }, [sets, onUpdateSets, exerciseId, onFirstSetSaved, saveSingleSetToDatabase]);

  const handleEditSet = useCallback((setIndex: number) => {
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      onUpdateSets(exerciseId, updatedSets);
      return updatedSets;
    });
  }, [exerciseId, onUpdateSets]);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    const setToDelete = sets[setIndex];
    if (!setToDelete.id) {
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
    } else {
      setSets(prev => {
        const updatedSets = prev.filter((_, i) => i !== setIndex);
        onUpdateSets(exerciseId, updatedSets);
        return updatedSets;
      });
      toast.success("Set deleted successfully!");
    }
  }, [exerciseId, sets, supabase, onUpdateSets]);

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
    if (!currentSessionId) {
      toast.error("Workout session not started. Please refresh.");
      return false;
    }

    const updatedSetsState: SetLogState[] = [];
    let anySetSavedInThisCall = false;
    let hasError = false;

    for (let i = 0; i < sets.length; i++) {
      const currentSet = sets[i];
      // Check if set has any meaningful data
      const hasData = (currentSet.weight_kg !== null && currentSet.weight_kg > 0) ||
                      (currentSet.reps !== null && currentSet.reps > 0) ||
                      (currentSet.time_seconds !== null && currentSet.time_seconds > 0) ||
                      (currentSet.reps_l !== null && currentSet.reps_l > 0) ||
                      (currentSet.reps_r !== null && currentSet.reps_r > 0);

      if (hasData && !currentSet.isSaved) {
        const savedSet = await saveSingleSetToDatabase(currentSet, i);
        if (savedSet) {
          updatedSetsState.push(savedSet);
          anySetSavedInThisCall = true;
          if (!hasFirstSetBeenSavedRef.current) {
            onFirstSetSaved(savedSet.created_at);
            hasFirstSetBeenSavedRef.current = true;
          }
        } else {
          hasError = true;
          updatedSetsState.push(currentSet); // Keep original if save failed
        }
      } else {
        updatedSetsState.push(currentSet); // Keep already saved or empty sets as is
      }
    }

    if (hasError) {
      toast.error("Some sets failed to save. Please check your inputs.");
      setSets(updatedSetsState); // Update state with any successful saves
      onUpdateSets(exerciseId, updatedSetsState);
      return false;
    }

    if (!anySetSavedInThisCall && sets.filter(s => s.isSaved).length === 0) {
      toast.error("No valid sets to save. Please input data for at least one set.");
      return false;
    }

    setSets(updatedSetsState); // Ensure state is fully updated after all saves
    onUpdateSets(exerciseId, updatedSetsState);

    let currentExercisePRValue: number | null = null;
    if (exerciseType === 'weight') {
      currentExercisePRValue = updatedSetsState.reduce((totalVolume, set) => totalVolume + ((set.weight_kg || 0) * (set.reps || 0)), 0);
    } else if (exerciseType === 'timed') {
      const validTimes = updatedSetsState.map(set => set.time_seconds).filter((time): time is number => time !== null);
      currentExercisePRValue = validTimes.length > 0 ? Math.min(...validTimes) : null;
    }

    let isNewPR = false;
    if (currentExercisePRValue !== null) {
      if (!exercisePR) {
        isNewPR = true;
      } else if (exerciseType === 'weight' && exercisePR.best_volume_kg !== null) {
        isNewPR = currentExercisePRValue > exercisePR.best_volume_kg;
      } else if (exerciseType === 'timed' && exercisePR.best_time_seconds !== null) {
        isNewPR = currentExercisePRValue < exercisePR.best_time_seconds;
      } else {
        isNewPR = true;
      }
    }

    try {
      if (isNewPR) {
        const prData: UserExercisePRInsert | UserExercisePRUpdate = {
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          exercise_id: exerciseId,
          last_achieved_date: new Date().toISOString(),
          best_volume_kg: exerciseType === 'weight' ? currentExercisePRValue : null,
          best_time_seconds: exerciseType === 'timed' ? currentExercisePRValue : null,
        };

        const { error: upsertError, data: updatedPR } = await supabase
          .from('user_exercise_prs')
          .upsert(prData, { onConflict: 'user_id,exercise_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;
        setExercisePR(updatedPR as UserExercisePR);
        toast.success(`New Exercise Personal Record for ${exerciseName}!`);
      }

      await onExerciseComplete(exerciseId, isNewPR);
      toast.success(`${exerciseName} completed!`);
      return true;
    } catch (err: any) {
      console.error("Error saving exercise completion or PR:", err);
      toast.error("Failed to complete exercise: " + err.message);
      return false;
    }
  }, [currentSessionId, sets, exerciseType, exerciseCategory, exercisePR, exerciseId, supabase, onExerciseComplete, exerciseName, onFirstSetSaved, saveSingleSetToDatabase]);

  return {
    sets,
    handleAddSet,
    handleInputChange,
    handleSaveSet,
    handleEditSet,
    handleDeleteSet,
    handleSaveExercise,
    exercisePR,
    loadingPR,
  };
};