"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { LocalExerciseDefinition } from '@/lib/db'; // Import LocalExerciseDefinition

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

  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addExerciseFilter, setAddExerciseFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');
  const [mainMuscleGroups, setMainMuscleGroups] = useState<string[]>([]);

  const [showConfirmRemoveDialog, setShowConfirmRemoveDialog] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{ exerciseId: string; tPathExerciseId: string; name: string } | null>(null);

  const [showAddAsBonusDialog, setShowAddAsBonusDialog] = useState(false);
  const [exerciseToAddDetails, setExerciseToAddDetails] = useState<ExerciseDefinition | null>(null);

  const [showConfirmResetDialog, setShowConfirmResetDialog] = useState(false);

  const fetchWorkoutData = useCallback(async () => {
    if (!session || !workoutId) return;
    setLoading(true);
    try {
      // 1. Fetch t_path_exercises to get exercise_ids and order_index
      const { data: tPathExercisesLinks, error: tpeError } = await supabase
        .from('t_path_exercises')
        .select('id, exercise_id, order_index, is_bonus_exercise')
        .eq('template_id', workoutId)
        .order('order_index', { ascending: true });

      if (tpeError) throw tpeError;
      console.log("Fetched tPathExercisesLinks:", tPathExercisesLinks); // DEBUG

      const exerciseIdsInWorkout = (tPathExercisesLinks || []).map(link => link.exercise_id);

      // 2. Fetch all exercise definitions that are either user-owned or global
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url')
        .or(`user_id.eq.${session.user.id},user_id.is.null`) // Fetch all user's and global exercises
        .order('name', { ascending: true });

      if (allExercisesError) throw allExercisesError;
      console.log("Fetched allExercisesData (for map):", allExercisesData); // DEBUG

      const exerciseDefMap = new Map<string, ExerciseDefinition>();
      (allExercisesData || []).forEach(def => exerciseDefMap.set(def.id, def as ExerciseDefinition));
      
      let fetchedExercises: WorkoutExerciseWithDetails[] = [];
      fetchedExercises = (tPathExercisesLinks || []).map(link => {
        const exerciseDef = exerciseDefMap.get(link.exercise_id);
        if (!exerciseDef) {
          console.warn(`Exercise definition not found for exercise_id: ${link.exercise_id} in workout ${workoutId}. This link will be skipped.`);
          return null; // Skip this link if definition is missing
        }
        return {
          ...exerciseDef,
          id: exerciseDef.id, // Ensure id is explicitly set
          name: exerciseDef.name, // Ensure name is explicitly set
          order_index: link.order_index,
          is_bonus_exercise: link.is_bonus_exercise || false,
          t_path_exercise_id: link.id,
        };
      }).filter(Boolean) as WorkoutExerciseWithDetails[];
      console.log("Final fetchedExercises (after filtering):", fetchedExercises); // DEBUG

      setExercises(fetchedExercises);

      // Extract unique muscle groups from all exercises
      const uniqueMuscleGroups = Array.from(new Set((allExercisesData || []).map(ex => ex.main_muscle))).sort();
      setMainMuscleGroups(uniqueMuscleGroups);

      // Filter available exercises for the "Add Exercise" dropdown
      // This list should include all global exercises and all user-created exercises.
      // No "adoption" filtering here, as the dropdown should show everything available to link.
      setAllAvailableExercises(allExercisesData as ExerciseDefinition[]);

    } catch (err: any) {
      console.error("Failed to load workout exercises:", JSON.stringify(err, null, 2)); // Log full error
      toast.info("Failed to load workout exercises.");
    } finally {
      setLoading(false);
    }
  }, [session, supabase, workoutId]);

  useEffect(() => {
    if (open) {
      fetchWorkoutData();
    }
  }, [open, fetchWorkoutData]);

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

  // Removed adoptExercise function as per new requirements

  const handleAddExerciseWithBonusStatus = useCallback(async (isBonus: boolean) => {
    if (!exerciseToAddDetails || !session) return;

    setIsSaving(true);
    setShowAddAsBonusDialog(false);

    try {
      // Directly use the exerciseToAddDetails.id, no adoption needed.
      const finalExerciseId = exerciseToAddDetails.id;

      // Optimistic UI update: Add the exercise to the local state immediately
      const newOrderIndex = exercises.length > 0 ? Math.max(...exercises.map(e => e.order_index)) + 1 : 0;
      const tempTPathExerciseId = `temp-${Date.now()}`; // Temporary ID for optimistic UI
      const newExerciseWithDetails: WorkoutExerciseWithDetails = {
        ...exerciseToAddDetails,
        id: finalExerciseId, // Use the original ID
        name: exerciseToAddDetails.name, // Ensure name is explicitly set
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
      console.log("Attempting to insert t_path_exercises with payload:", tpePayload); // DEBUG: Log payload

      // Attempt to insert into the database. Rely on DB unique constraint.
      const { data: insertedTpe, error: insertError } = await supabase
        .from('t_path_exercises')
        .insert(tpePayload)
        .select('id')
        .single();

      if (insertError) {
        // If insert fails, rollback the optimistic UI update
        setExercises(prev => prev.filter(ex => ex.t_path_exercise_id !== tempTPathExerciseId));
        throw insertError; // Re-throw to be caught by the outer catch block
      }

      // If successful, update the temporary ID with the real one from the database
      setExercises(prev => prev.map(ex => 
        ex.t_path_exercise_id === tempTPathExerciseId ? { ...ex, t_path_exercise_id: insertedTpe.id } : ex
      ));

      console.log(`'${exerciseToAddDetails.name}' added to workout as ${isBonus ? 'Bonus' : 'Core'}!`); // Replaced toast.success
      setSelectedExerciseToAdd("");
      setExerciseToAddDetails(null);
    } catch (err: any) {
      // Enhanced error handling to specifically catch unique constraint violations
      console.error(
        "Error adding exercise:",
        err.message,
        "Code:", err.code,
        "Details:", err.details,
        "Hint:", err.hint,
        "Full Error:", JSON.stringify(err, null, 2) // Log full error
      );

      let errorMessage = "An unexpected error occurred.";
      if (err && typeof err === 'object') {
        if (err.code === '23505') { // PostgreSQL unique_violation error code
          errorMessage = "This exercise is already in the workout.";
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.details) { // Supabase specific error detail
          errorMessage = err.details;
        }
      }
      toast.info("Failed to add exercise: " + errorMessage); // Replaced toast.error
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, workoutId, exercises, exerciseToAddDetails]);

  const handleSelectAndPromptBonus = useCallback(() => {
    if (!selectedExerciseToAdd) {
      toast.info("Please select an exercise to add.");
      return;
    }
    const exercise = allAvailableExercises.find(e => e.id === selectedExerciseToAdd);
    if (exercise) {
      setExerciseToAddDetails(exercise);
      setShowAddAsBonusDialog(true);
    }
  }, [selectedExerciseToAdd, allAvailableExercises]);

  const handleRemoveExerciseClick = useCallback((exerciseId: string, tPathExerciseId: string, name: string) => {
    setExerciseToRemove({ exerciseId, tPathExerciseId, name });
    setShowConfirmRemoveDialog(true);
  }, []);

  const confirmRemoveExercise = useCallback(async () => {
    if (!exerciseToRemove) return;
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
      console.log("Exercise removed from workout!"); // Replaced toast.success
    } catch (err: any) {
      console.error("Failed to remove exercise:", JSON.stringify(err, null, 2)); // Log full error
      toast.info("Failed to remove exercise."); // Replaced toast.error
    } finally {
      setIsSaving(false);
      setExerciseToRemove(null);
    }
  }, [exercises, exerciseToRemove, supabase]);

  const handleToggleBonusStatus = useCallback(async (exercise: WorkoutExerciseWithDetails) => {
    if (!session) return;
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
      console.log(`'${exercise.name}' is now a ${newBonusStatus ? 'Bonus' : 'Core'} exercise!`); // Replaced toast.success
    } catch (err: any) {
      console.error("Error toggling bonus status:", JSON.stringify(err, null, 2)); // Log full error
      toast.info("Failed to toggle bonus status."); // Replaced toast.error
      setExercises(prev => prev.map(ex =>
        ex.id === exercise.id ? { ...ex, is_bonus_exercise: !newBonusStatus } : ex
      ));
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase]);

  const handleResetToDefaults = useCallback(async () => {
    if (!session) return;
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

      console.log("Workout exercises reset to defaults!"); // Replaced toast.success
      onSaveSuccess();
      fetchWorkoutData();
    } catch (err: any) {
      console.error("Error resetting exercises:", err);
      toast.info("Failed to reset exercises."); // Replaced toast.error
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, workoutId, onSaveSuccess, fetchWorkoutData]);

  const handleSaveOrder = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = exercises.map((ex, index) => ({
        id: ex.t_path_exercise_id,
        order_index: index,
      }));

      const { error } = await supabase
        .from('t_path_exercises')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      console.log("Workout order saved successfully!"); // Replaced toast.success
      onSaveSuccess();
    } catch (err: any) {
      console.error("Error saving order:", JSON.stringify(err, null, 2)); // Log full error
      toast.info("Failed to save workout order."); // Replaced toast.error
    } finally {
      setIsSaving(false);
    }
  }, [exercises, supabase, onSaveSuccess]);

  return {
    exercises,
    allAvailableExercises,
    selectedExerciseToAdd,
    setSelectedExerciseToAdd,
    loading,
    isSaving,
    addExerciseFilter,
    setAddExerciseFilter,
    mainMuscleGroups,
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