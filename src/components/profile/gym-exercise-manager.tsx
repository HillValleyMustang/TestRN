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

// DND imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';

// New sortable components
import { SortableGymExerciseList } from './gym-exercise-manager/sortable-gym-exercise-list';
import { SortableGymExerciseItem } from './gym-exercise-manager/sortable-gym-exercise-item';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


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
  const [coreExercises, setCoreExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [bonusExercises, setBonusExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseDefinition[]>([]);
  const [exerciseIdsInGym, setExerciseIdsInGym] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [addExerciseSourceFilter, setAddExerciseSourceFilter] = useState<'my-exercises' | 'global-library'>('my-exercises');

  const [showAddExercisesDialog, setShowAddExercisesDialog] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<ExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const [showConfirmRemoveDialog, setShowConfirmRemoveDialog] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<WorkoutExerciseWithDetails | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardChangesDialog, setShowDiscardChangesDialog] = useState(false);


  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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
        setCoreExercises([]);
        setBonusExercises([]);
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
        
        setCoreExercises(fetchedExercises.filter(ex => !ex.is_bonus_exercise));
        setBonusExercises(fetchedExercises.filter(ex => ex.is_bonus_exercise));

      } else {
        setCoreExercises([]);
        setBonusExercises([]);
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
    setHasUnsavedChanges(false); // Clear unsaved changes after a full refresh
  }, [fetchData, onSaveSuccess]);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setMainTPath(null);
      setChildWorkouts([]);
      setSelectedWorkoutId(null);
      setCoreExercises([]);
      setBonusExercises([]);
      setAllExercises([]);
      setExerciseIdsInGym(new Set());
      setMuscleGroups([]);
      setAddExerciseSourceFilter('my-exercises');
      setHasUnsavedChanges(false); // Reset on close
    }
  }, [open, refreshDialogData]);

  const handleAddExercisesToWorkout = useCallback(async (exerciseIds: string[]) => {
    if (!session || !gym || !selectedWorkoutId || exerciseIds.length === 0) return;
    setIsSaving(true);

    try {
      const exercisesToInsert: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
      const gymLinksToInsert: { gym_id: string; exercise_id: string }[] = [];
      const optimisticUpdates: WorkoutExerciseWithDetails[] = [];

      let currentMaxOrderIndex = [...coreExercises, ...bonusExercises].length > 0 ? Math.max(...[...coreExercises, ...bonusExercises].map(e => e.order_index)) : -1;

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

      setCoreExercises(prev => [...prev, ...optimisticUpdates]);
      setExerciseIdsInGym(prev => new Set([...prev, ...exerciseIds.filter(id => !prev.has(id))]));
      setHasUnsavedChanges(true); // Mark as unsaved after adding

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

        setCoreExercises(prev => prev.map(ex => 
          ex.t_path_exercise_id.startsWith('temp-') && insertedTpes.some(tpe => tpe.exercise_id === ex.id)
            ? { ...ex, t_path_exercise_id: insertedTpes.find(tpe => tpe.exercise_id === ex.id)?.id || ex.t_path_exercise_id }
            : ex
        ));
      }

      toast.success(`Added ${exerciseIds.length} exercise(s) to workout!`);
      onSaveSuccess();
    } catch (err: any) {
      toast.error("Failed to add exercises to workout.");
      console.error("Error adding exercises to workout:", err);
      setCoreExercises(prev => prev.filter(ex => !ex.t_path_exercise_id.startsWith('temp-')));
      setExerciseIdsInGym(prev => new Set([...prev].filter(id => !exerciseIds.includes(id))));
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, gym, selectedWorkoutId, coreExercises, bonusExercises, allExercises, exerciseIdsInGym, onSaveSuccess]);


  const handleRemoveExerciseClick = useCallback((exerciseId: string) => {
    const exercise = [...coreExercises, ...bonusExercises].find(ex => ex.id === exerciseId);
    if (exercise) {
      setExerciseToRemove(exercise);
      setShowConfirmRemoveDialog(true);
    }
  }, [coreExercises, bonusExercises]);

  const confirmRemoveExercise = useCallback(async () => {
    if (!session || !selectedWorkoutId || !exerciseToRemove) return;
    setIsSaving(true);
    setShowConfirmRemoveDialog(false);

    try {
      // Optimistic update
      setCoreExercises(prev => prev.filter(ex => ex.id !== exerciseToRemove.id));
      setBonusExercises(prev => prev.filter(ex => ex.id !== exerciseToRemove.id));
      setHasUnsavedChanges(true); // Mark as unsaved after removing

      const { error: deleteError } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseToRemove.t_path_exercise_id);

      if (deleteError) {
        // Rollback on error
        if (!exerciseToRemove.is_bonus_exercise) {
          setCoreExercises(prev => [...prev, exerciseToRemove]);
        } else {
          setBonusExercises(prev => [...prev, exerciseToRemove]);
        }
        throw deleteError;
      }

      toast.success(`'${exerciseToRemove.name}' removed from workout.`);
      onSaveSuccess();
    } catch (err: any) {
      toast.error("Failed to remove exercise from workout.");
      console.error("Error removing exercise from workout:", err);
    } finally {
      setIsSaving(false);
      setExerciseToRemove(null);
    }
  }, [session, supabase, selectedWorkoutId, coreExercises, bonusExercises, exerciseToRemove, onSaveSuccess]);

  const handleWorkoutSelectChange = useCallback((newWorkoutId: string) => {
    setSelectedWorkoutId(newWorkoutId);
  }, []);

  const handleOpenInfoDialog = (exercise: WorkoutExerciseWithDetails) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedWorkoutId) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const overContainerId = over.data.current?.sortable?.containerId || over.id;
    const activeContainerId = active.data.current?.sortable?.containerId || active.id;

    let newCore = [...coreExercises];
    let newBonus = [...bonusExercises];
    
    // Find the dragged item
    const draggedItem = [...newCore, ...newBonus].find(ex => ex.id === activeId);
    if (!draggedItem) return;

    if (activeContainerId === overContainerId) {
      // Moved within the same list
      const isCoreList = activeContainerId === 'core-exercises';
      const currentList = isCoreList ? newCore : newBonus;
      
      const oldIndex = currentList.findIndex(item => item.id === activeId);
      const newIndex = currentList.findIndex(item => item.id === overId);

      const newOrderedList = arrayMove(currentList, oldIndex, newIndex);
      
      if (isCoreList) {
        setCoreExercises(newOrderedList);
      } else {
        setBonusExercises(newOrderedList);
      }

    } else {
      // Moved between lists (e.g., Core to Bonus, or Bonus to Core)
      const isMovingToBonus = overContainerId === 'bonus-exercises';

      // Remove from source list
      newCore = newCore.filter(ex => ex.id !== activeId);
      newBonus = newBonus.filter(ex => ex.id !== activeId);

      // Add to target list at the correct position
      const targetList = isMovingToBonus ? newBonus : newCore;
      const newIndex = targetList.findIndex(item => item.id === overId);
      const insertIndex = newIndex === -1 ? targetList.length : newIndex;

      const newItem = { ...draggedItem, is_bonus_exercise: isMovingToBonus };
      targetList.splice(insertIndex, 0, newItem);

      setCoreExercises(newCore);
      setBonusExercises(newBonus);
    }
    setHasUnsavedChanges(true); // Mark as unsaved after any drag-and-drop
  }, [coreExercises, bonusExercises, selectedWorkoutId]);

  const handleSaveChanges = useCallback(async () => {
    if (!session || !selectedWorkoutId || !hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const updates = [
        ...coreExercises.map((ex, index) => ({ id: ex.t_path_exercise_id, order_index: index, is_bonus_exercise: false })),
        ...bonusExercises.map((ex, index) => ({ id: ex.t_path_exercise_id, order_index: index, is_bonus_exercise: true })),
      ];
      const { error } = await supabase.rpc('update_gym_exercise_order_and_status', { updates });
      if (error) throw error;
      toast.success("Exercise order and status updated!");
      setHasUnsavedChanges(false);
      onSaveSuccess();
    } catch (err: any) {
      toast.error("Failed to save exercise order/status.");
      console.error("Error saving exercise order/status:", err);
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase, selectedWorkoutId, coreExercises, bonusExercises, hasUnsavedChanges, onSaveSuccess]);

  const handleCloseDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardChangesDialog(true);
    } else {
      onOpenChange(false);
    }
  }, [hasUnsavedChanges, onOpenChange]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardChangesDialog(false);
    onOpenChange(false); // Close the main dialog
  }, [onOpenChange]);

  const handleCancelDiscard = useCallback(() => {
    setShowDiscardChangesDialog(false);
  }, []);


  if (!gym) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <LayoutTemplate className="h-5 w-5" /> Manage Workouts for "{gym.name}"
            </DialogTitle>
            <DialogDescription className="text-sm">
              Select a workout to add, remove, or reorder exercises.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
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
                    <SelectTrigger className="flex-1 h-9 text-sm">
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
                    className="flex-shrink-0 sm:w-1/3 h-9 text-sm"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Exercises
                  </Button>
                </div>
                
                {selectedWorkoutId ? (
                  <div className="flex-grow flex flex-col gap-4 overflow-y-auto">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableGymExerciseList
                        id="core-exercises"
                        title="Core Exercises"
                        exercises={coreExercises}
                        onDragEnd={handleDragEnd}
                        onRemoveExercise={handleRemoveExerciseClick}
                        onOpenInfoDialog={handleOpenInfoDialog}
                        emptyMessage="No core exercises in this workout. Add some!"
                      />
                      <SortableGymExerciseList
                        id="bonus-exercises"
                        title="Bonus Exercises"
                        exercises={bonusExercises}
                        onDragEnd={handleDragEnd}
                        onRemoveExercise={handleRemoveExerciseClick}
                        onOpenInfoDialog={handleOpenInfoDialog}
                        emptyMessage="No bonus exercises in this workout. Add some!"
                      />
                    </DndContext>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center p-4">Please select a workout to manage its exercises.</p>
                )}
              </>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 p-4 pt-2 border-t">
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving} size="sm">Close</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving || !hasUnsavedChanges} size="sm">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LoadingOverlay isOpen={isSaving} title="Updating Workout Exercises" />

      <AddExercisesToWorkoutDialog
        open={showAddExercisesDialog}
        onOpenChange={setShowAddExercisesDialog}
        allExercises={allExercises}
        exercisesInWorkout={[...coreExercises, ...bonusExercises].map(ex => ex.id)}
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

      <AlertDialog open={showConfirmRemoveDialog} onOpenChange={setShowConfirmRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "<span className="font-semibold">{exerciseToRemove?.name}</span>" from this workout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmRemoveDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveExercise}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDiscardChangesDialog} onOpenChange={setShowDiscardChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Unsaved Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDiscard}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};