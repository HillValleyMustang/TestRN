"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase'; // Import FetchedExerciseDefinition
import { PlusCircle } from "lucide-react";

// Removed local ExerciseDefinition definition

type TPath = Tables<'t_paths'>;
type Profile = Tables<'profiles'>;

interface AddExerciseToTPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: FetchedExerciseDefinition; // Use FetchedExerciseDefinition
  onAddSuccess: () => void;
  onOptimisticAdd: (exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => void; // Updated type
  onAddFailure: (exerciseId: string, workoutId: string) => void; // Updated type
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

export const AddExerciseToTPathDialog = ({ open, onOpenChange, exercise, onAddSuccess, onOptimisticAdd, onAddFailure, setTempStatusMessage }: AddExerciseToTPathDialogProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [userWorkouts, setUserWorkouts] = useState<TPath[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchUserWorkouts = async () => {
      if (!memoizedSessionUserId) return; // Use memoized ID

      setLoading(true);
      try {
        // First, get the user's active_t_path_id from their profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('active_t_path_id')
          .eq('id', memoizedSessionUserId) // Use memoized ID
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const activeTPathId = profileData?.active_t_path_id;

        if (!activeTPathId) {
          setUserWorkouts([]);
          setTempStatusMessage({ message: "No active plan!", type: 'error' });
          setTimeout(() => setTempStatusMessage(null), 3000);
          setLoading(false);
          return;
        }

        // Then, fetch only the child T-Paths (workouts) that belong to the active T-Path
        const { data, error } = await supabase
          .from('t_paths')
          .select('id, template_name, created_at, is_bonus, user_id, version, settings, progression_settings, parent_t_path_id') // Specify all columns required by TPath
          .eq('user_id', memoizedSessionUserId) // Use memoized ID
          .eq('is_bonus', true) // These are the individual workouts within a main T-Path
          .eq('parent_t_path_id', activeTPathId) // Filter by the active parent T-Path
          .order('template_name', { ascending: true });

        if (error) throw error;
        setUserWorkouts(data as TPath[] || []); // Explicitly cast
      } catch (err: any) {
        console.error("Failed to fetch user workouts:", err);
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchUserWorkouts();
      setSelectedWorkoutId(""); // Reset selection when opening
    }
  }, [open, memoizedSessionUserId, supabase, setTempStatusMessage]); // Depend on memoized ID

  // Removed adoptExercise function as per new requirements

  const handleAddToWorkout = async () => {
    if (!memoizedSessionUserId || !selectedWorkoutId) { // Use memoized ID
      setTempStatusMessage({ message: "Select workout!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }

    setIsAdding(true);
    let workoutName = userWorkouts.find(w => w.id === selectedWorkoutId)?.template_name || 'Unknown Workout';

    try {
      // Optimistic update: Update UI immediately
      // We use the original exercise.id directly, as no adoption is happening.
      if (exercise.id === null) {
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        setIsAdding(false);
        return;
      }
      onOptimisticAdd(exercise.id, selectedWorkoutId, workoutName, false); // Assuming not bonus for now

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

      // 3. Insert into t_path_exercises, directly linking to the exercise.id
      const { error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: selectedWorkoutId,
          exercise_id: exercise.id, // Use the original exercise ID
          order_index: nextOrderIndex,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation code
          setTempStatusMessage({ message: "Duplicate!", type: 'error' });
        } else {
          throw insertError;
        }
        onAddFailure(exercise.id, selectedWorkoutId); // Rollback on error
      } else {
        setTempStatusMessage({ message: "Added!", type: 'success' });
        onAddSuccess(); // Notify parent to refresh data
        onOpenChange(false);
      }
      setTimeout(() => setTempStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Failed to add exercise to workout:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      if (exercise.id) { // Only call onAddFailure if exercise.id is not null
        onAddFailure(exercise.id, selectedWorkoutId); // Rollback on error
      }
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
            Select one of your personalised workouts to add this exercise to.
            This will permanently add it to the workout template.
          </p>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading your workouts...</p>
          ) : userWorkouts.length === 0 ? (
            <p className="text-center text-muted-foreground">
              You don't have any workouts in your active Transformation Path.
            </p>
          ) : (
            <Select onValueChange={setSelectedWorkoutId} value={selectedWorkoutId}>
              <SelectTrigger className="flex-1 h-9 text-sm">
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