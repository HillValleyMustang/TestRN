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
import { AddExercisesToWorkoutDialog } from './add-exercises-to-workout-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';

type Gym = Tables<'gyms'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPath = Tables<'t_paths'>;
type TPathExercise = Tables<'t_path_exercises'>;

export interface WorkoutExerciseWithDetails extends ExerciseDefinition {
  id: string;
  name: string;
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string;
}

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
  const [exerciseIdsInGym, setExerciseIdsInGym] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [addExerciseSourceFilter, setAddExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  const [showAddExercisesDialog, setShowAddExercisesDialog] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<ExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);


  const fetchData = useCallback(async () => {
    if (!session || !gym || !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const activeTPathId = profile.active_t_path_id;

      let mainTPathData: TPath | null = null;
      if (activeTPathId) {
        const { data, error } = await supabase
          .from('t_paths')
          .select('*')
          .eq('id', activeTPathId)
          .eq('gym_id', gym.id)
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        mainTPathData = data;
      }
      
      setMainTPath(mainTPathData);

      if (!mainTPathData) {
        setChildWorkouts([]);
        setAllExercises([]);
        setExercisesInSelectedWorkout([]);
        setExerciseIdsInGym(new Set());
        setLoading(false);
        return;
      }

      const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('*')
        .eq('parent_t_path_id', mainTPathData.id)
        .eq('is_bonus', true)
        .order('template_name', { ascending: true });
      if (childWorkoutsError) throw childWorkoutsError;
      setChildWorkouts(childWorkoutsData || []);

      const { data: allExRes, error: allExError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .or(`user_id.eq.${session.user.id},user_id.is.null`);
      if (allExError) throw allExError;
      setAllExercises(allExRes || []);
      setMuscleGroups(Array.from(new Set((allExRes || []).map(ex => ex.main_muscle))).sort());

      const { data: gymExRes, error: gymExError } = await supabase
        .from('gym_exercises')
        .select('exercise_id')
        .eq('gym_id', gym.id);
      if (gymExError) throw gymExError;
      setExerciseIdsInGym(new Set((gymExRes || []).map((link: { exercise_id: string }) => link.exercise_id)));

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

  const refreshDialogData = useCallback(() => {
    fetchData();
    onSaveSuccess();
  }, [fetchData, onSaveSuccess]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setMainTPath(null);
      setChildWorkouts([]);
      setSelectedWorkoutId(null);
      setExercisesInSelectedWorkout([]);
      setAllExercises([]);
      setExerciseIdsInGym(new Set());
      setMuscleGroups([]);
      setAddExerciseSourceFilter('my-exercises');
    }
  }, [open, refreshDialogData]);

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

        if (!exerciseIdsInGym.has(exerciseId)) {
          gymLinksToInsert.push({ gym_id: gym.id, exercise_id: exerciseId });
        }

        currentMaxOrderIndex++;
        exercisesToInsert.push({
          template_id: selectedWorkoutId,
          exercise_id: exerciseId,
          order_index: currentMaxOrderIndex,
          is_bonus_exercise: false,
        });

        optimisticUpdates.push({
          ...exerciseDef,
          id: exerciseDef.id,
          name: exerciseDef.name,
          order_index: currentMaxOrderIndex,
          is_bonus_exercise: false,
          t_path_exercise_id: `temp-${Date.now()}-${exerciseId}`,
        });
      }

      setExercisesInSelectedWorkout(prev => [...prev, ...optimisticUpdates]);
      setExerciseIdsInGym(prev => new Set([...prev, ...exerciseIds.filter(id => !prev.has(id))]));

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

        setExercisesInSelectedWorkout(prev => prev.map(ex => {
          const realTpe = insertedTpes.find(tpe => tpe.exercise_id === ex.id && ex.t_path_exercise_id.startsWith('temp-'));
          return realTpe ? { ...ex, t_path_exercise_id: realTpe.id } : ex;
        }));
      }

      toast.success(`Added ${exerciseIds.length} exercise(s) to workout!`);
      onSaveSuccess();
    } catch (err: any) {
      toast.error("Failed to add exercises to workout.");
      console.error("Error adding exercises to workout:", err);
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

      setExercisesInSelectedWorkout(prev => prev.filter(ex => ex.id !== exerciseId));

      const { error: deleteError } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseToRemove.t_path_exercise_id);

      if (deleteError) {
        setExercisesInSelectedWorkout(prev => [...prev, exerciseToRemove]);
        throw deleteError;
      }

      toast.success(`'${exerciseToRemove.name}' removed from workout.`);
      onSaveSuccess();
    } catch (err: any) {
      toast.error("Failed to remove exercise from workout.");
      console.error("Error removing exercise from workout:", err);
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, selectedWorkoutId, exercisesInSelectedWorkout, onSaveSuccess]);

  const handleWorkoutSelectChange = useCallback((newWorkoutId: string) => {
    setSelectedWorkoutId(newWorkoutId);
  }, []);

  const handleOpenInfoDialog = (exercise: ExerciseDefinition) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  if (!gym) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0"> {/* Added p-0 here */}
          <DialogHeader className="p-4 pb-2 border-b"> {/* Added padding to header */}
            <DialogTitle className="flex items-center gap-2 text-xl"> {/* Reduced title size */}
              <LayoutTemplate className="h-5 w-5" /> Manage Workouts for "{gym.name}"
            </DialogTitle>
            <DialogDescription className="text-sm"> {/* Reduced description size */}
              Select a workout to add or remove exercises from its template.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden"> {/* Added padding and flex-col */}
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
                    <SelectTrigger className="flex-1 h-9 text-sm"> {/* Reduced height and text size */}
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
                    className="flex-shrink-0 sm:w-1/3 h-9 text-sm" // Reduced height and text size
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Exercises
                  </Button>
                </div>
                
                <ScrollArea className="flex-grow border rounded-md p-2"> {/* ScrollArea now wraps the ul */}
                  {selectedWorkoutId ? (
                    exercisesInSelectedWorkout.length === 0 ? (
                      <p className="text-muted-foreground text-center p-4">No exercises in this workout. Click "Add Exercises" to get started!</p>
                    ) : (
                      <ul className="space-y-1"> {/* Reduced space-y */}
                        {exercisesInSelectedWorkout.map(ex => (
                          <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md bg-card text-sm"> {/* Reduced padding, text size */}
                            <span className="font-medium">{ex.name}</span>
                            <div className="flex gap-1"> {/* Reduced gap */}
                              <Button variant="ghost" size="icon" title="Exercise Info" onClick={() => handleOpenInfoDialog(ex)} className="h-7 w-7"> {/* Reduced button size */}
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Remove Exercise" onClick={() => handleRemoveExerciseFromWorkout(ex.id)} className="h-7 w-7"> {/* Reduced button size */}
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <p className="text-muted-foreground text-center p-4">Please select a workout to manage its exercises.</p>
                  )}
                </ScrollArea>
              </>
            )}
          </div>
          <DialogFooter className="p-4 pt-2 border-t"> {/* Added padding to footer */}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isOpen={isSaving} title="Updating Workout Exercises" />

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