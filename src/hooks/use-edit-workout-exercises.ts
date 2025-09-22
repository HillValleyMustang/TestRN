"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { LocalExerciseDefinition } from '@/lib/db'; // Import LocalExerciseDefinition
import { useWorkoutDataFetcher } from "./use-workout-data-fetcher"; // NEW: Import useWorkoutDataFetcher
import { PostgrestResponse } from '@supabase/supabase-js'; // Import PostgrestResponse

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Profile = Tables<'profiles'>;

export interface WorkoutExerciseWithDetails extends ExerciseDefinition {
  id: string; // Explicitly define id
  name: string; // Explicitly define name
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string; // ID from t_path_exercises table
}

interface UseEditWorkoutExercisesProps {
  workoutId: string;
  onSaveSuccess: () => void; // Callback to refresh parent list
  open: boolean; // To trigger data fetching when dialog opens
}

export const useEditWorkoutExercises = ({ workoutId, onSaveSuccess, open }: UseEditWorkoutExercisesProps) => {
  const { session, supabase } = useSession();
  // NEW: Consume data from useWorkoutDataFetcher
  const {
    allAvailableExercises: fetchedAllAvailableExercises,
    userGyms: fetchedUserGyms,
    exerciseGymsMap: fetchedExerciseGymsMap,
    availableMuscleGroups: fetchedAvailableMuscleGroups,
    refreshAllData, // To trigger a full refresh if needed
  } = useWorkoutDataFetcher();


  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addExerciseFilter, setAddExerciseFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [selectedGymFilter, setSelectedGymFilter] = useState<string>('all');

  const [showConfirmRemoveDialog, setShowConfirmRemoveDialog] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{ exerciseId: string; tPathExerciseId: string; name: string } | null>(null);

  const [showAddAsBonusDialog, setShowAddAsBonusDialog] = useState(false);
  const [exerciseToAddDetails, setExerciseToAddDetails] = useState<ExerciseDefinition | null>(null);

  const [showConfirmResetDialog, setShowConfirmResetDialog] = useState(false);

  const fetchWorkoutData = useCallback(async () => {
    if (!session || !workoutId) return;
    setLoading(true);
    try {
      // Fetch only t_path_exercises for this specific workout
      const tpeRes: PostgrestResponse<Tables<'t_path_exercises'>[]> = await supabase.from('t_path_exercises').select('id, exercise_id, order_index, is_bonus_exercise').eq('template_id', workoutId).order('order_index', { ascending: true });
      if (tpeRes.error) throw tpeRes.error;

      const tPathExercisesLinks = tpeRes.data || [];
      
      const exerciseDefMap = new Map<string, ExerciseDefinition>();
      fetchedAllAvailableExercises.forEach(def => exerciseDefMap.set(def.id as string, def as ExerciseDefinition));
      
      const fetchedExercises = (tPathExercisesLinks as Tables<'t_path_exercises'>[]).map((link: Tables<'t_path_exercises'>) => { // Explicitly type link
        const exerciseDef = exerciseDefMap.get(link.exercise_id);
        if (!exerciseDef) return null;
        return {
          ...exerciseDef,
          id: exerciseDef.id!, // Non-null assertion
          name: exerciseDef.name,
          order_index: link.order_index,
          is_bonus_exercise: link.is_bonus_exercise || false,
          t_path_exercise_id: link.id,
        };
      }).filter(Boolean) as WorkoutExerciseWithDetails[];

      setExercises(fetchedExercises);

    } catch (err: any) {
      console.error("Failed to load workout exercises:", JSON.stringify(err, null, 2));
      toast.error("Failed to load workout exercises."); // Changed to toast.error
    } finally {
      setLoading(false);
    }
  }, [session, supabase, workoutId, fetchedAllAvailableExercises]); // Depend on fetchedAllAvailableExercises

  useEffect(() => {
    if (open) {
      fetchWorkoutData();
    }
  }, [open, fetchWorkoutData]);

  const filteredExercisesForDropdown = useMemo(() => {
    if (!session) return [];
    return fetchedAllAvailableExercises
      .filter(ex => { // Source filter
        if (addExerciseFilter === 'my-exercises') return ex.user_id === session.user.id;
        if (addExerciseFilter === 'global-library') return ex.user_id === null;
        return false;
      })
      .filter(ex => { // Muscle filter
        return selectedMuscleFilter === 'all' || ex.main_muscle === selectedMuscleFilter;
      })
      .filter(ex => { // Gym filter
        if (selectedGymFilter === 'all') return true;
        const exerciseGyms = fetchedExerciseGymsMap[ex.id as string] || []; // Use fetchedExerciseGymsMap
        return exerciseGyms.includes(fetchedUserGyms.find(g => g.id === selectedGymFilter)?.name || ''); // Use fetchedUserGyms
      })
      .filter(ex => !exercises.some(existingEx => existingEx.id === ex.id)); // Exclude already added
  }, [fetchedAllAvailableExercises, addExerciseFilter, selectedMuscleFilter, selectedGymFilter, exercises, fetchedExerciseGymsMap, fetchedUserGyms, session]);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
        return newItems;
      });
    }
  }, []);

  const handleAddExerciseWithBonusStatus = useCallback(async (isBonus: boolean) => {
    if (!exerciseToAddDetails || !session) {
      toast.error("Cannot add exercise: details or session missing."); // Added toast.error
      return;
    }

    setIsSaving(true);
    setShowAddAsBonusDialog(false);

    try {
      const finalExerciseId = exerciseToAddDetails.id!; // Non-null assertion
      const newOrderIndex = exercises.length > 0 ? Math.max(...exercises.map(e => e.order_index)) + 1 : 0;
      const tempTPathExerciseId = `temp-${Date.now()}`;
      const newExerciseWithDetails: WorkoutExerciseWithDetails = {
        ...exerciseToAddDetails,
        id: finalExerciseId,
        name: exerciseToAddDetails.name,
        order_index: newOrderIndex,
        is_bonus_exercise: isBonus,
        t_path_exercise_id: tempTPathExerciseId,
      };
      setExercises(prev => [...prev, newExerciseWithDetails]);

      const tpePayload = {
        template_id: workoutId,
        exercise_id: finalExerciseId,
        order_index: newOrderIndex,
        is_bonus_exercise: isBonus,
      };

      const { data: insertedTpe, error: insertError } = await supabase
        .from('t_path_exercises')
        .insert(tpePayload)
        .select('id')
        .single();

      if (insertError) {
        setExercises(prev => prev.filter(ex => ex.t_path_exercise_id !== tempTPathExerciseId));
        throw insertError;
      }

      setExercises(prev => prev.map(ex => 
        ex.t_path_exercise_id === tempTPathExerciseId ? { ...ex, t_path_exercise_id: insertedTpe.id } : ex
      ));

      toast.success(`'${exerciseToAddDetails.name}' added to workout as ${isBonus ? 'Bonus' : 'Core'}!`); // Changed to toast.success
      setSelectedExerciseToAdd("");
      setExerciseToAddDetails(null);
      refreshAllData(); // Refresh all data after adding an exercise
    } catch (err: any) {
      console.error("Error adding exercise:", JSON.stringify(err, null, 2));
      let errorMessage = "An unexpected error occurred.";
      if (err && typeof err === 'object') {
        if (err.code === '23505') {
          errorMessage = "This exercise is already in the workout.";
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      toast.error("Failed to add exercise: " + errorMessage); // Changed to toast.error
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, workoutId, exercises, exerciseToAddDetails, refreshAllData]);

  const handleSelectAndPromptBonus = useCallback(() => {
    if (!selectedExerciseToAdd) {
      toast.error("Please select an exercise to add."); // Added toast.error
      return;
    }
    const exercise = fetchedAllAvailableExercises.find(e => e.id === selectedExerciseToAdd);
    if (exercise) {
      setExerciseToAddDetails(exercise as ExerciseDefinition); // Cast to ExerciseDefinition
      setShowAddAsBonusDialog(true);
    } else {
      toast.error("Selected exercise not found in available exercises."); // Added toast.error
    }
  }, [selectedExerciseToAdd, fetchedAllAvailableExercises]);

  const handleRemoveExerciseClick = useCallback((exerciseId: string, tPathExerciseId: string, name: string) => {
    setExerciseToRemove({ exerciseId, tPathExerciseId, name });
    setShowConfirmRemoveDialog(true);
  }, []);

  const confirmRemoveExercise = useCallback(async () => {
    if (!exerciseToRemove) {
      toast.error("No exercise selected for removal."); // Added toast.error
      return;
    }
    setIsSaving(true);
    setShowConfirmRemoveDialog(false);

    try {
      const previousExercises = exercises;
      setExercises(prev => prev.filter(ex => ex.id !== exerciseToRemove.exerciseId));

      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseToRemove.tPathExerciseId);

      if (error) {
        setExercises(previousExercises);
        throw error;
      }
      toast.success("Exercise removed from workout!"); // Changed to toast.success
      refreshAllData(); // Refresh all data after removing an exercise
    } catch (err: any) {
      console.error("Failed to remove exercise:", JSON.stringify(err, null, 2));
      toast.error("Failed to remove exercise."); // Changed to toast.error
    } finally {
      setIsSaving(false);
      setExerciseToRemove(null);
    }
  }, [exercises, exerciseToRemove, supabase, refreshAllData]);

  const handleToggleBonusStatus = useCallback(async (exercise: WorkoutExerciseWithDetails) => {
    if (!session) {
      toast.error("You must be logged in to toggle bonus status."); // Added toast.error
      return;
    }
    setIsSaving(true);
    const newBonusStatus = !exercise.is_bonus_exercise;

    setExercises(prev => prev.map(ex =>
      ex.id === exercise.id ? { ...ex, is_bonus_exercise: newBonusStatus } : ex
    ));

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .update({ is_bonus_exercise: newBonusStatus })
        .eq('id', exercise.t_path_exercise_id);

      if (error) throw error;
      toast.success(`'${exercise.name}' is now a ${newBonusStatus ? 'Bonus' : 'Core'} exercise!`); // Changed to toast.success
      refreshAllData(); // Refresh all data after toggling bonus status
    } catch (err: any) {
      console.error("Error toggling bonus status:", JSON.stringify(err, null, 2));
      toast.error("Failed to toggle bonus status."); // Changed to toast.error
      setExercises(prev => prev.map(ex =>
        ex.id === exercise.id ? { ...ex, is_bonus_exercise: !newBonusStatus } : ex
      ));
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, refreshAllData]);

  const handleResetToDefaults = useCallback(async () => {
    if (!session) {
      toast.error("You must be logged in to reset to defaults."); // Added toast.error
      return;
    }
    setIsSaving(true);
    setShowConfirmResetDialog(false);

    try {
      const { data: childWorkoutData, error: childWorkoutError } = await supabase
        .from('t_paths')
        .select('parent_t_path_id')
        .eq('id', workoutId)
        .eq('user_id', session.user.id)
        .single();

      if (childWorkoutError || !childWorkoutData || !childWorkoutData.parent_t_path_id) {
        throw new Error("Could not find parent T-Path for this workout.");
      }

      const parentTPathId = childWorkoutData.parent_t_path_id;
      
      const response = await fetch(`/api/generate-t-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tPathId: parentTPathId })
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || `Failed to regenerate T-Path workouts.`);
      }

      toast.success("Workout exercises reset to defaults!"); // Changed to toast.success
      onSaveSuccess();
      fetchWorkoutData();
      refreshAllData(); // Refresh all data after resetting to defaults
    } catch (err: any) {
      console.error("Error resetting exercises:", err);
      toast.error("Failed to reset exercises."); // Changed to toast.error
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, workoutId, onSaveSuccess, fetchWorkoutData, refreshAllData]);

  const handleSaveOrder = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = exercises.map((ex, index) => ({
        id: ex.t_path_exercise_id,
        order_index: index,
      }));

      // Use the new RPC function instead of upsert
      const { error } = await supabase.rpc('update_exercise_order', { updates });

      if (error) throw error;
      toast.success("Workout order saved successfully!"); // Changed to toast.success
      onSaveSuccess();
      refreshAllData(); // Refresh all data after saving order
    } catch (err: any) {
      console.error("Error saving order:", JSON.stringify(err, null, 2));
      toast.error("Failed to save workout order."); // Changed to toast.error
    } finally {
      setIsSaving(false);
    }
  }, [exercises, supabase, onSaveSuccess, refreshAllData]);

  return {
    exercises,
    allAvailableExercises: fetchedAllAvailableExercises, // Use the fetched data
    filteredExercisesForDropdown,
    selectedExerciseToAdd,
    setSelectedExerciseToAdd,
    loading,
    isSaving,
    addExerciseFilter,
    setAddExerciseFilter,
    mainMuscleGroups: fetchedAvailableMuscleGroups, // Use the fetched data
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    userGyms: fetchedUserGyms, // Use the fetched data
    selectedGymFilter,
    setSelectedGymFilter,
    showConfirmRemoveDialog,
    setShowConfirmRemoveDialog,
    exerciseToRemove,
    setExerciseToRemove,
    showAddAsBonusDialog,
    setShowAddAsBonusDialog,
    exerciseToAddDetails,
    setExerciseToAddDetails,
    showConfirmResetDialog,
    setShowConfirmResetDialog,
    handleDragEnd,
    handleAddExerciseWithBonusStatus,
    handleSelectAndPromptBonus,
    handleRemoveExerciseClick,
    confirmRemoveExercise,
    handleToggleBonusStatus,
    handleResetToDefaults,
    handleSaveOrder,
    fetchWorkoutData,
  };
};