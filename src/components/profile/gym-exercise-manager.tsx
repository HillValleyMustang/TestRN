"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables, FetchedExerciseDefinition, Profile } from '@/types/supabase';
import { LoadingOverlay } from '../loading-overlay';
import { LayoutTemplate, PlusCircle, Trash2, Info } from 'lucide-react';
import { SetupGymPlanPrompt } from '@/components/manage-t-paths/setup-gym-plan-prompt';
import { AddExercisesToWorkoutDialog } from './add-exercises-to-workout-dialog'; // NEW: Import the new dialog
import { ScrollArea } from '@/components/ui/scroll-area'; // For the list of exercises in workout

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
  profile: Profile | null;
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
  const [searchTerm, setSearchTerm] = useState(""); // No longer used directly in this component, but kept for potential future use
  const [muscleFilter, setMuscleFilter] = useState("all"); // No longer used directly in this component, but kept for potential future use
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [addExerciseSourceFilter, setAddExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  // NEW: State for the AddExercisesToWorkoutDialog
  const [showAddExercisesDialog, setShowAddExercisesDialog] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<ExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);


  const fetchData = useCallback(async () => {
    if (!session || !gym || !profile) {
      console.log("[ManageGymWorkoutsExercisesDialog] Skipping fetchData: session, gym, or profile is null.", { session: !!session, gym: !!gym, profile: !!profile });
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log("[ManageGymWorkoutsExercisesDialog] Starting fetchData for gym:", gym.name, "ID:", gym.id, "User ID:", session.user.id);
    try {
      // 1. Get the active_t_path_id from the user's profile
      const activeTPathId = profile.active_t_path_id;
      console.log(`[ManageGymWorkoutsExercisesDialog] User's active_t_path_id: ${activeTPathId}`);

      let mainTPathData: TPath | null = null;
      if (activeTPathId) {
        // 2. Fetch the specific main T-Path using the active_t_path_id
        console.log(`[ManageGymWorkoutsExercisesDialog] Querying t_paths for id: ${activeTPathId}, gym_id: ${gym.id}, user_id: ${session.user.id}, parent_t_path_id: null`);
        const { data, error } = await supabase
          .from('t_paths')
          .select('*')
          .eq('id', activeTPathId)
          .eq('gym_id', gym.id)
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null) // Ensure it's a main T-Path
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("[ManageGymWorkoutsExercisesDialog] Error fetching active main T-Path:", error);
          throw error;
        }
        mainTPathData = data;
      }
      
      console.log("[ManageGymWorkoutsExercisesDialog] Fetched main T-Path data:", mainTPathData);
      setMainTPath(mainTPathData);

      if (!mainTPathData) {
        console.log("[ManageGymWorkoutsExercisesDialog] No active main T-Path found for this gym. Displaying setup prompt.");
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
  }, [session, supabase, gym, profile, selectedWorkoutId]);

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
  }, [open, refreshDialogData]);

  // NEW: Handle adding multiple exercises from the AddExercisesToWorkoutDialog
  const handleAddExercisesToWorkout = useCallback(async (exerciseIds: string[]) => {
    if (!session || !gym || !selectedWorkoutId || exerciseIds.length === 0) return;
    setIsSaving(true);

    try {
      const exercisesToInsert: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
      const gymLinksToInsert: { gym_id: string; exercise_id: string }[] = [];
      const optimisticUpdates: WorkoutExerciseWithDetails[] = [];

      let currentMaxOrderIndex = exercisesInSelectedWorkout.length > 0 ? Math.max(...exercisesInSelectedWorkout.map(e => e.order_index)) : -1;

      for (const exerciseId of exerciseIds) {
        const exerciseDef = allExercises.find(ex => ex.id === exerciseId);
        if (!exerciseDef) {
          console.warn(`Exercise definition not found for ID: ${exerciseId}, skipping.`);
          continue;
        }

        // 1. Prepare gym link if not already linked
        if (!exerciseIdsInGym.has(exerciseId)) {
          gymLinksToInsert.push({ gym_id: gym.id, exercise_id: exerciseId });
        }

        // 2. Prepare exercise for workout template
        currentMaxOrderIndex++;
        exercisesToInsert.push({
          template_id: selectedWorkoutId,
          exercise_id: exerciseId,
          order_index: currentMaxOrderIndex,
          is_bonus_exercise: false, // Default to non-bonus when adding
        });

        // Prepare optimistic update
        optimisticUpdates.push({
          ...exerciseDef,
          id: exerciseDef.id,
          name: exerciseDef.name,
          order_index: currentMaxOrderIndex,
          is_bonus_exercise: false,
          t_path_exercise_id: `temp-${Date.now()}-${exerciseId}`, // Temporary ID
        });
      }

      // Optimistic update UI
      setExercisesInSelectedWorkout(prev => [...prev, ...optimisticUpdates]);
      setExerciseIdsInGym(prev => new Set([...prev, ...exerciseIds.filter(id => !prev.has(id))]));

      // Perform database operations
      if (gymLinksToInsert.length > 0) {
        const { error: linkError } = await supabase.from('gym_exercises').insert(gymLinksToInsert).select();
        if (linkError) throw linkError;
      }

      if (exercisesToInsert.length > 0) {
        const { data: insertedTpes, error: insertError } = await supabase
          .from('t_path_exercises')
          .insert(exercisesToInsert)
          .select('id, exercise_id');

        if (insertError) throw insertError;

        // Update optimistic updates with real t_path_exercise_ids
        setExercisesInSelectedWorkout(prev => prev.map(ex => {
          const realTpe = insertedTpes.find(tpe => tpe.exercise_id === ex.id && ex.t_path_exercise_id.startsWith('temp-'));
          return realTpe ? { ...ex, t_path_exercise_id: realTpe.id } : ex;
        }));
      }

      toast.success(`Added ${exerciseIds.length} exercise(s) to workout!`);
      onSaveSuccess(); // Trigger parent refresh
    } catch (err: any) {
      toast.error("Failed to add exercises to workout.");
      console.error("Error adding exercises to workout:", err);
      // Rollback optimistic updates on error
      setExercisesInSelectedWorkout(prev => prev.filter(ex => !ex.t_path_exercise_id.startsWith('temp-')));
      setExerciseIdsInGym(prev => new Set([...prev].filter(id => !exerciseIds.includes(id))));
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

  const handleOpenInfoDialog = (exercise: ExerciseDefinition) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

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
                <SetupGymPlanPrompt gym={gym} onSetupSuccess={refreshDialogData} profile={profile} />
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
                  <Button 
                    onClick={() => setShowAddExercisesDialog(true)} 
                    disabled={!selectedWorkoutId}
                    className="flex-shrink-0 sm:w-1/3"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Exercises
                  </Button>
                </div>
                
                <div className="flex-grow overflow-hidden border rounded-md">
                  {selectedWorkoutId ? (
                    <ScrollArea className="h-full w-full p-2">
                      {exercisesInSelectedWorkout.length === 0 ? (
                        <p className="text-muted-foreground text-center p-4">No exercises in this workout. Click "Add Exercises" to get started!</p>
                      ) : (
                        <ul className="space-y-2">
                          {exercisesInSelectedWorkout.map(ex => (
                            <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md bg-card">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-muted-foreground text-sm">({ex.main_muscle})</span>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" title="Exercise Info" onClick={() => handleOpenInfoDialog(ex)}>
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Remove Exercise" onClick={() => handleRemoveExerciseFromWorkout(ex.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </ScrollArea>
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

      {/* NEW: Add Exercises Dialog */}
      <AddExercisesToWorkoutDialog
        open={showAddExercisesDialog}
        onOpenChange={setShowAddExercisesDialog}
        allExercises={allExercises}
        exercisesInWorkout={exercisesInSelectedWorkout.map(ex => ex.id)}
        muscleGroups={muscleGroups}
        onAddExercises={handleAddExercisesToWorkout}
        addExerciseSourceFilter={addExerciseSourceFilter}
        setAddExerciseSourceFilter={setAddExerciseSourceFilter}
      />

      {/* Exercise Info Dialog */}
      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
        />
      )}
    </>
  );
};