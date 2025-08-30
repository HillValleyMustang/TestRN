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
  currentSessionId: string | null; // This will now be null initially
  supabase: SupabaseClient;
  onUpdateSets: (exerciseId: string, newSets: SetLogState[]) => void;
  initialSets: SetLogState[];
  preferredWeightUnit: Profile['preferred_weight_unit'];
  onFirstSetSaved: (timestamp: string) => Promise<string>; // Now expects to return the new session ID
  onExerciseComplete: (exerciseId: string, isNewPR: boolean) => Promise<void>; // New prop for exercise completion
  workoutTemplateName: string; // Added workoutTemplateName
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

// Helper for deep comparison of relevant parts of SetLogState
const areSetsEqual = (a: SetLogState[], b: SetLogState[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const setA = a[i];
    const setB = b[i];
    // Compare only the 'last' values and session_id, as other fields are user-editable
    if (
      setA.lastWeight !== setB.lastWeight ||
      setA.lastReps !== setB.lastReps ||
      setA.lastTimeSeconds !== setB.lastTimeSeconds ||
      setA.session_id !== setB.session_id
    ) {
      return false;
    }
  }
  return true;
};

export const useExerciseSets = ({
  exerciseId,
  exerciseName, // Destructure exerciseName
  exerciseType,
  exerciseCategory,
  currentSessionId: propCurrentSessionId, // Renamed to avoid conflict with state
  supabase,
  onUpdateSets,
  initialSets,
  preferredWeightUnit,
  onFirstSetSaved,
  onExerciseComplete,
  workoutTemplateName, // Destructure workoutTemplateName
}: UseExerciseSetsProps): UseExerciseSetsReturn => {
  const [sets, setSets] = useState<SetLogState[]>(() => {
    // This initializer runs only once on the initial render.
    // It sets up the initial state based on initialSets or defaults.
    if (initialSets.length === 0) {
      return Array.from({ length: DEFAULT_INITIAL_SETS }).map(() => ({
        id: null, created_at: null, session_id: propCurrentSessionId, exercise_id: exerciseId,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null,
        is_pb: false, isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastTimeSeconds: null,
      }));
    }
    return initialSets;
  });

  const [exercisePR, setExercisePR] = useState<UserExercisePR | null>(null);
  const [loadingPR, setLoadingPR] = useState(true);
  const [internalSessionId, setInternalSessionId] = useState<string | null>(propCurrentSessionId);

  // Update internalSessionId when propCurrentSessionId changes
  useEffect(() => {
    setInternalSessionId(propCurrentSessionId);
  }, [propCurrentSessionId]);

  // Effect to update 'last' values and session_id when initialSets (from parent) changes.
  // This is the crucial change to break the infinite loop.
  useEffect(() => {
    setSets(prevSets => {
      // If prevSets is empty (e.g., after reset), and initialSets has data, use initialSets
      if (prevSets.length === 0 && initialSets.length > 0) {
        return initialSets.map(set => ({ ...set, session_id: internalSessionId }));
      }

      // Create a new array of sets by merging 'last' properties and session_id from initialSets
      const newSets = prevSets.map((prevSet, index) => {
        const initialSet = initialSets[index];
        if (initialSet) {
          return {
            ...prevSet,
            lastWeight: initialSet.lastWeight,
            lastReps: initialSet.lastReps,
            lastTimeSeconds: initialSet.lastTimeSeconds,
            session_id: prevSet.session_id || internalSessionId, // Only update if prevSet.session_id is null
          };
        }
        return prevSet;
      });

      // Only update state if the newSets are actually different from prevSets
      // This prevents unnecessary re-renders and breaks the loop.
      if (!areSetsEqual(prevSets, newSets)) {
        return newSets;
      }
      return prevSets; // No change, so return previous state to prevent re-render
    });
  }, [initialSets, exerciseId, internalSessionId]); // Depend on initialSets and exerciseId

  // Effect to report local 'sets' state changes back to the parent
  // This runs AFTER the component has rendered with the new local 'sets' state
  useEffect(() => {
    onUpdateSets(exerciseId, sets);
  }, [sets, exerciseId, onUpdateSets]); // Dependencies for this effect


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
        session_id: internalSessionId, // Use internalSessionId
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
      return [...prev, newSet]; // Removed onUpdateSets here
    });
  }, [exerciseId, internalSessionId, sets.length]);

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
      return newSets; // Removed onUpdateSets here
    });
  }, [preferredWeightUnit]); // exerciseId and onUpdateSets are now in the new useEffect

  const saveSingleSetToDatabase = useCallback(async (set: SetLogState, setIndex: number): Promise<SetLogState | null> => {
    let currentSessionIdToUse = internalSessionId;

    // If session hasn't been created yet, create it now
    if (!currentSessionIdToUse) {
      try {
        const newSessionId = await onFirstSetSaved(new Date().toISOString());
        currentSessionIdToUse = newSessionId;
        setInternalSessionId(newSessionId); // Update internal state
        
        // Update all sets in the current exercise to link to this new session ID
        setSets(prevSets => prevSets.map(s => ({ ...s, session_id: newSessionId })));
        // The parent's state will be updated by handleSaveSet after this function returns.
      } catch (err) {
        toast.error("Failed to start workout session. Please try again.");
        console.error("Error creating session on first set save:", err);
        return null;
      }
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
      session_id: currentSessionIdToUse, // Use the determined session ID
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
  }, [internalSessionId, exerciseId, exerciseType, exerciseCategory, supabase, onFirstSetSaved, sets]);

  const handleSaveSet = useCallback(async (setIndex: number) => {
    const updatedSet = await saveSingleSetToDatabase(sets[setIndex], setIndex);
    if (updatedSet) {
      setSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = updatedSet;
        return newSets; // onUpdateSets will be called by the new useEffect
      });
      toast.success(`Set ${setIndex + 1} saved successfully!`);
    }
  }, [sets, exerciseId, saveSingleSetToDatabase]);

  const handleEditSet = useCallback((setIndex: number) => {
    setSets(prev => {
      const updatedSets = [...prev];
      updatedSets[setIndex] = { ...updatedSets[setIndex], isSaved: false };
      return updatedSets; // onUpdateSets will be called by the new useEffect
    });
  }, []);

  const handleDeleteSet = useCallback(async (setIndex: number) => {
    const setToDelete = sets[setIndex];
    if (!setToDelete.id) {
      setSets(prev => {
        const updatedSets = prev.filter((_, i) => i !== setIndex);
        return updatedSets; // onUpdateSets will be called by the new useEffect
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
        return updatedSets; // onUpdateSets will be called by the new useEffect
      });
      toast.success("Set deleted successfully!");
    }
  }, [sets, supabase]);

  const handleSaveExercise = useCallback(async (): Promise<boolean> => {
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

      if (hasData && !currentSet.isSaved) { // Only attempt to save if it has data AND is not already saved
        const savedSet = await saveSingleSetToDatabase(currentSet, i);
        if (savedSet) {
          updatedSetsState.push(savedSet);
          anySetSavedInThisCall = true;
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
      setSets(updatedSetsState); // Update local state with any successful saves
      return false;
    }

    // After attempting to save all unsaved sets, check if there's *any* valid data in the exercise
    const hasAnyValidSetData = updatedSetsState.some(s =>
      (s.weight_kg !== null && s.weight_kg > 0) ||
      (s.reps !== null && s.reps > 0) ||
      (s.time_seconds !== null && s.time_seconds > 0) ||
      (s.reps_l !== null && s.reps_l > 0) ||
      (s.reps_r !== null && s.reps_r > 0)
    );

    if (!hasAnyValidSetData) {
      toast.error("No valid sets to save. Please input data for at least one set.");
      setSets(updatedSetsState); // Ensure local state is fully updated after all saves
      return false;
    }

    setSets(updatedSetsState); // Ensure local state is fully updated after all saves

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
  }, [internalSessionId, sets, exerciseType, exerciseCategory, exercisePR, exerciseId, supabase, onExerciseComplete, exerciseName, saveSingleSetToDatabase]);

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