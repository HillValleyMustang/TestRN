"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables, FetchedExerciseDefinition, Profile } from '@/types/supabase'; // Import Profile type
import { ExerciseTransferUI } from './exercise-transfer-ui';
import { LoadingOverlay } from '../loading-overlay';
import { LayoutTemplate, PlusCircle } from 'lucide-react'; // Added LayoutTemplate and PlusCircle
import { SetupGymPlanPrompt } from '@/components/manage-t-paths/setup-gym-plan-prompt'; // Import SetupGymPlanPrompt

type Gym = Tables<'gyms'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPath = Tables<'t_paths'>;
type TPathExercise = Tables<'t_path_exercises'>;

// Reusing the WorkoutExerciseWithDetails type from use-edit-workout-exercises for consistency
export interface WorkoutExerciseWithDetails extends ExerciseDefinition {
  id: string; // Explicitly define id
  name: string; // Explicitly define name
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string; // ID from t_path_exercises table
}

// Define types for the specific Supabase query results
type GymExerciseLink = { exercise_id: string; gym_id: string; };
type TPathExerciseLink = { id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean | null; };


interface ManageGymWorkoutsExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gym: Gym | null;
  onSaveSuccess: () => void;
  profile: Profile | null; // NEW: Pass profile to SetupGymPlanPrompt
}

export const ManageGymWorkoutsExercisesDialog = ({ open, onOpenChange, gym, onSaveSuccess, profile }: ManageGymWorkoutsExercisesDialogProps) => {
  const { session, supabase } = useSession();
  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<TPath[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [exercisesInSelectedWorkout, setExercisesInSelectedWorkout] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [exerciseIdsInGym, setExerciseIdsInGym] = useState<Set<string>>(new Set()); // Exercises explicitly linked to this gym
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [addExerciseSourceFilter, setAddExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  const fetchData = useCallback(async () => {
    if (!session || !gym) {
      console.log("[ManageGymWorkoutsExercisesDialog] Skipping fetchData: session or gym is null.", { session: !!session, gym: !!gym });
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log("[ManageGymWorkoutsExercisesDialog] Starting fetchData for gym:", gym.name, "ID:", gym.id, "User ID:", session.user.id);
    try {
      // 1. Fetch the main T-Path for this gym
      console.log(`[ManageGymWorkoutsExercisesDialog] Querying t_paths for gym_id: ${gym.id}, user_id: ${session.user.id}, parent_t_path_id: null`);
      const { data: mainTPathData, error: mainTPathError } = await supabase
        .from('t_paths')
        .select('*')
        .eq('gym_id', gym.id)
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null)
        .single();

      if (mainTPathError) {
        if (mainTPathError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("[ManageGymWorkoutsExercisesDialog] Error fetching main T-Path (not PGRST116):", mainTPathError);
          throw mainTPathError;
        } else {
          console.log("[ManageGymWorkoutsExercisesDialog] No main T-Path found for this gym (PGRST116).");
        }
      }
      console.log("[ManageGymWorkoutsExercisesDialog] Fetched main T-Path data:", mainTPathData);
      setMainTPath(mainTPathData);

      if (!mainTPathData) {
        console.log("[ManageGymWorkoutsExercisesDialog] No main T-Path found for this gym. Displaying setup prompt.");
        setChildWorkouts([]);
        setAllExercises([]);
        setExercisesInSelectedWorkout([]);
        setExerciseIdsInGym(new Set());
        setLoading(false);
        return;
      }

      // 2. Fetch all child workouts for this main T-Path
      const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('*')
        .eq('parent_t_path_id', mainTPathData.id)
        .eq('is_bonus', true) // Only individual workouts, not the main T-Path itself
        .order('template_name', { ascending: true });
      if (childWorkoutsError) throw childWorkoutsError;
      setChildWorkouts(childWorkoutsData || []);

      // 3. Fetch all exercise definitions (user-owned and global)
      const { data: allExRes, error: allExError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .or(`user_id.eq.${session.user.id},user_id.is.null`);
      if (allExError) throw allExError;
      setAllExercises(allExRes || []);
      setMuscleGroups(Array.from(new Set((allExRes || []).map(ex => ex.main_muscle))).sort());

      // 4. Fetch exercises explicitly linked to this gym
      const { data: gymExRes, error: gymExError } = await supabase
        .from('gym_exercises')
        .select('exercise_id')
        .eq('gym_id', gym.id);
      if (gymExError) throw gymExError;
      setExerciseIdsInGym(new Set((gymExRes || []).map((link: { exercise_id: string }) => link.exercise_id)));

      // 5. Set initial selected workout and its exercises
      const initialSelectedWorkoutId = selectedWorkoutId || (childWorkoutsData && childWorkoutsData.length > 0 ? childWorkoutsData[0].id : null);
      setSelectedWorkoutId(initialSelectedWorkoutId);

      if (initialSelectedWorkoutId) {
        const { data: tpeRes, error: tpeError } = await supabase
          .from('t_path_exercises')
          .select('id, exercise_id, order_index, is_bonus_exercise')
          .eq('template_id', initialSelectedWorkoutId)
          .order('order_index', { ascending: true });
        if (tpeError) throw tpeError;

        const exerciseDefMap = new Map<string, ExerciseDefinition>();
        (allExRes || []).forEach(def => exerciseDefMap.set(def.id, def as ExerciseDefinition));

        const fetchedExercises = (tpeRes || []).map((link: TPathExerciseLink) => {
          const exerciseDef = exerciseDefMap.get(link.exercise_id);
          if (!exerciseDef) return null;
          return {
            ...exerciseDef,
            id: exerciseDef.id,
            name: exerciseDef.name,
            order_index: link.order_index,
            is_bonus_exercise: link.is_bonus_exercise || false,
            t_path_exercise_id: link.id,
          };
        }).filter(Boolean) as WorkoutExerciseWithDetails[];
        setExercisesInSelectedWorkout(fetchedExercises);
      } else {
        setExercisesInSelectedWorkout([]);
      }

    } catch (err: any) {
      toast.error("Failed to load gym and workout data.");
      console.error("Error fetching gym workout data:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, gym, selectedWorkoutId]); // Added selectedWorkoutId to dependencies to re-fetch when it changes

  // Add a refresh function for the dialog itself
  const refreshDialogData = useCallback(() => {
    fetchData();
    onSaveSuccess(); // Also notify parent to refresh
  }, [fetchData, onSaveSuccess]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Reset state when dialog closes
      setMainTPath(null);
      setChildWorkouts([]);
      setSelectedWorkoutId(null);
      setExercisesInSelectedWorkout([]);
      setAllExercises([]);
      setExerciseIdsInGym(new Set());
      setSearchTerm("");
      setMuscleFilter("all");
      setAddExerciseSourceFilter('my-exercises');
    }
  }, [open, refreshDialogData]); // Changed dependency to refreshDialogData

  // Memoized list of exercises available for transfer (left column)
  const availableExercisesForTransfer = useMemo(() => {
    if (!session) return [];
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return allExercises
      .filter(ex => { // Filter by source (My Exercises vs Global)
        if (addExerciseSourceFilter === 'my-exercises') return ex.user_id === session.user.id;
        if (addExerciseSourceFilter === 'global-library') return ex.user_id === null;
        return false;
      })
      .filter(ex => { // Filter by muscle group
        return muscleFilter === 'all' || ex.main_muscle === muscleFilter;
      })
      .filter(ex => { // Filter by search term
        return ex.name.toLowerCase().includes(lowerCaseSearchTerm);
      })
      .filter(ex => { // Only show exercises that are available in the current gym
        return exerciseIdsInGym.has(ex.id);
      })
      .filter(ex => { // Exclude exercises already in the selected workout
        return !exercisesInSelectedWorkout.some(e => e.id === ex.id);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allExercises, addExerciseSourceFilter, muscleFilter, searchTerm, exerciseIdsInGym, exercisesInSelectedWorkout, session]);

  const handleAddExerciseToWorkout = useCallback(async (exerciseId: string) => {
    if (!session || !gym || !selectedWorkoutId) return;
    setIsSaving(true);

    try {
      // 1. Ensure the exercise is linked to the gym (if not already)
      if (!exerciseIdsInGym.has(exerciseId)) {
        const { error: linkError } = await supabase
          .from('gym_exercises')
          .insert({ gym_id: gym.id, exercise_id: exerciseId });
        if (linkError) throw linkError;
        setExerciseIdsInGym(prev => new Set(prev).add(exerciseId)); // Optimistic update
      }

      // 2. Add exercise to the selected workout (t_path_exercises)
      const exerciseDef = allExercises.find(ex => ex.id === exerciseId);
      if (!exerciseDef) throw new Error("Exercise definition not found.");

      const newOrderIndex = exercisesInSelectedWorkout.length > 0 ? Math.max(...exercisesInSelectedWorkout.map(e => e.order_index)) + 1 : 0;
      const tempTPathExerciseId = `temp-${Date.now()}`; // Temporary ID for optimistic update

      const newExerciseWithDetails: WorkoutExerciseWithDetails = {
        ...exerciseDef,
        id: exerciseDef.id,
        name: exerciseDef.name,
        order_index: newOrderIndex,
        is_bonus_exercise: false, // Default to non-bonus when adding
        t_path_exercise_id: tempTPathExerciseId,
      };
      setExercisesInSelectedWorkout(prev => [...prev, newExerciseWithDetails]); // Optimistic update

      const { data: insertedTpe, error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: selectedWorkoutId,
          exercise_id: exerciseId,
          order_index: newOrderIndex,
          is_bonus_exercise: false,
        })
        .select('id')
        .single();

      if (insertError) {
        setExercisesInSelectedWorkout(prev => prev.filter(ex => ex.t_path_exercise_id !== tempTPathExerciseId)); // Rollback
        throw insertError;
      }

      // Update the temporary ID with the real one from Supabase
      setExercisesInSelectedWorkout(prev => prev.map(ex => 
        ex.t_path_exercise_id === tempTPathExerciseId ? { ...ex, t_path_exercise_id: insertedTpe.id } : ex
      ));

      toast.success(`'${exerciseDef.name}' added to workout!`);
      onSaveSuccess(); // Trigger parent refresh
    } catch (err: any) {
      toast.error("Failed to add exercise to workout.");
      console.error("Error adding exercise to workout:", err);
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, gym, selectedWorkoutId, exercisesInSelectedWorkout, allExercises, exerciseIdsInGym, onSaveSuccess]);

  const handleRemoveExerciseFromWorkout = useCallback(async (exerciseId: string) => {
    if (!session || !selectedWorkoutId) return;
    setIsSaving(true);

    try {
      const exerciseToRemove = exercisesInSelectedWorkout.find(ex => ex.id === exerciseId);
      if (!exerciseToRemove) throw new Error("Exercise not found in workout.");

      // Optimistic update
      setExercisesInSelectedWorkout(prev => prev.filter(ex => ex.id !== exerciseId));

      const { error: deleteError } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseToRemove.t_path_exercise_id);

      if (deleteError) {
        setExercisesInSelectedWorkout(prev => [...prev, exerciseToRemove]); // Rollback
        throw deleteError;
      }

      toast.success(`'${exerciseToRemove.name}' removed from workout.`);
      onSaveSuccess(); // Trigger parent refresh
    } catch (err: any) {
      toast.error("Failed to remove exercise from workout.");
      console.error("Error removing exercise from workout:", err);
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, selectedWorkoutId, exercisesInSelectedWorkout, onSaveSuccess]);

  const handleWorkoutSelectChange = useCallback((newWorkoutId: string) => {
    setSelectedWorkoutId(newWorkoutId);
    // The useEffect for fetchData will handle re-fetching exercises for the new workout
  }, []);

  if (!gym) {
    return null; // Should not happen if opened from GymManagementSection
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" /> Manage Workouts for "{gym.name}"
            </DialogTitle>
            <DialogDescription>
              Select a workout to add or remove exercises from its template.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-grow flex flex-col">
            {loading ? (
              <p className="text-muted-foreground text-center">Loading gym workout data...</p>
            ) : !mainTPath ? (
              <div className="text-center text-muted-foreground">
                {/* Display SetupGymPlanPrompt if no mainTPath is found */}
                <SetupGymPlanPrompt gym={gym} onSetupSuccess={refreshDialogData} />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select onValueChange={handleWorkoutSelectChange} value={selectedWorkoutId || ''}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a workout to manage" />
                    </SelectTrigger>
                    <SelectContent>
                      {childWorkouts.map(workout => (
                        <SelectItem key={workout.id} value={workout.id}>
                          {workout.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex sm:w-1/3">
                    <Button
                      variant={addExerciseSourceFilter === 'my-exercises' ? 'secondary' : 'ghost'}
                      onClick={() => setAddExerciseSourceFilter('my-exercises')}
                      className="flex-1 h-9 text-xs"
                    >
                      My Exercises
                    </Button>
                    <Button
                      variant={addExerciseSourceFilter === 'global-library' ? 'secondary' : 'ghost'}
                      onClick={() => setAddExerciseSourceFilter('global-library')}
                      className="flex-1 h-9 text-xs"
                    >
                      Global
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Select onValueChange={setMuscleFilter} value={muscleFilter}>
                    <SelectTrigger className="sm:w-1/3">
                      <SelectValue placeholder="Filter by muscle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Muscle Groups</SelectItem>
                      {muscleGroups.map(muscle => <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex-grow overflow-hidden">
                  {selectedWorkoutId ? (
                    <ExerciseTransferUI
                      availableExercises={availableExercisesForTransfer}
                      exercisesInGym={exercisesInSelectedWorkout} // Renamed prop to reflect content
                      onAdd={handleAddExerciseToWorkout}
                      onRemove={handleRemoveExerciseFromWorkout}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center p-4">Please select a workout to manage its exercises.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isOpen={isSaving} title="Updating Workout Exercises" />
    </>
  );
};