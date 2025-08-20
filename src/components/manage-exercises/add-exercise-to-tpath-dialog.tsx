"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { PlusCircle } from "lucide-react";

type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPath = Tables<'t_paths'>;

interface AddExerciseToTPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: ExerciseDefinition;
  onAddSuccess: () => void;
}

export const AddExerciseToTPathDialog = ({ open, onOpenChange, exercise, onAddSuccess }: AddExerciseToTPathDialogProps) => {
  const { session, supabase } = useSession();
  const [userWorkouts, setUserWorkouts] = useState<TPath[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchUserWorkouts = async () => {
      if (!session || !open) return;

      setLoading(true);
      try {
        // Fetch only the user's child T-Paths (workouts)
        const { data, error } = await supabase
          .from('t_paths')
          .select('*') // Changed to select all columns to match TPath type
          .eq('user_id', session.user.id)
          .eq('is_bonus', true) // These are the individual workouts within a main T-Path
          .not('parent_t_path_id', 'is', null) // Ensure it's a child workout
          .order('template_name', { ascending: true });

        if (error) throw error;
        setUserWorkouts(data || []);
      } catch (err: any) {
        console.error("Failed to fetch user workouts:", err);
        toast.error("Failed to load your workouts: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchUserWorkouts();
      setSelectedWorkoutId(""); // Reset selection when opening
    }
  }, [open, session, supabase]);

  const adoptExercise = async (exerciseToAdopt: ExerciseDefinition): Promise<ExerciseDefinition> => {
    if (exerciseToAdopt.user_id === session?.user.id) {
      return exerciseToAdopt; // Already user-owned
    }

    // Check if user already has an adopted copy of this global exercise
    if (exerciseToAdopt.library_id) {
      const { data: existingAdopted, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('library_id', exerciseToAdopt.library_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }
      if (existingAdopted) {
        return existingAdopted; // Return existing adopted copy
      }
    }

    // If not user-owned and no adopted copy exists, create one
    const { data: newAdoptedExercise, error: insertError } = await supabase
      .from('exercise_definitions')
      .insert({
        name: exerciseToAdopt.name,
        main_muscle: exerciseToAdopt.main_muscle,
        type: exerciseToAdopt.type,
        category: exerciseToAdopt.category,
        description: exerciseToAdopt.description,
        pro_tip: exerciseToAdopt.pro_tip,
        video_url: exerciseToAdopt.video_url,
        user_id: session!.user.id,
        library_id: exerciseToAdopt.library_id || null, // Preserve library_id if it exists
        is_favorite: false, // Default to not favorited on adoption
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }
    return newAdoptedExercise;
  };

  const handleAddToWorkout = async () => {
    if (!session || !selectedWorkoutId) {
      toast.error("Please select a workout.");
      return;
    }

    setIsAdding(true);
    try {
      // 1. Ensure the exercise is user-owned (adopt if global)
      const userOwnedExercise = await adoptExercise(exercise);

      // 2. Determine the next order_index for the selected workout
      const { data: existingExercises, error: fetchExistingError } = await supabase
        .from('t_path_exercises')
        .select('order_index')
        .eq('template_id', selectedWorkoutId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (fetchExistingError) throw fetchExistingError;

      const nextOrderIndex = (existingExercises && existingExercises.length > 0)
        ? (existingExercises[0].order_index || 0) + 1
        : 0;

      // 3. Insert into t_path_exercises
      const { error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: selectedWorkoutId,
          exercise_id: userOwnedExercise.id,
          order_index: nextOrderIndex,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation code
          toast.error("This exercise is already in the selected workout.");
        } else {
          throw insertError;
        }
      } else {
        toast.success(`'${userOwnedExercise.name}' added to workout!`);
        onAddSuccess(); // Notify parent to refresh data
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error("Failed to add exercise to workout:", err);
      toast.error("Failed to add exercise: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{exercise.name}" to a Workout</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select one of your personalized workouts to add this exercise to.
            This will permanently add it to the workout template.
          </p>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading your workouts...</p>
          ) : userWorkouts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              You don't have any personalized workouts yet. Create a T-Path first!
            </p>
          ) : (
            <Select onValueChange={setSelectedWorkoutId} value={selectedWorkoutId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a workout" />
              </SelectTrigger>
              <SelectContent>
                {userWorkouts.map(workout => (
                  <SelectItem key={workout.id} value={workout.id}>
                    {workout.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAddToWorkout} disabled={!selectedWorkoutId || isAdding || loading}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {isAdding ? "Adding..." : "Add to Workout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};