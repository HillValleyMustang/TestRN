"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, XCircle, GripVertical, Info, Sparkles, RefreshCcw, CheckCircle2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { WorkoutBadge } from "@/components/workout-badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Dialog components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPathExercise = Tables<'t_path_exercises'>;
type Profile = Tables<'profiles'>;

interface WorkoutExerciseWithDetails extends ExerciseDefinition {
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string; // ID from t_path_exercises table
}

interface EditWorkoutExercisesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  onSaveSuccess: () => void; // Callback to refresh parent list
}

export const EditWorkoutExercisesDialog = ({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  onSaveSuccess,
}: EditWorkoutExercisesDialogProps) => {
  const { session, supabase } = useSession();

  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<WorkoutExerciseWithDetails | null>(null);
  const [addExerciseFilter, setAddExerciseFilter] = useState<'all' | 'my-exercises' | 'global-library'>('all'); // New state for filter

  const [showConfirmRemoveDialog, setShowConfirmRemoveDialog] = useState(false);
  const [exerciseToRemove, setExerciseToRemove] = useState<{ exerciseId: string; tPathExerciseId: string; name: string } | null>(null);

  const [showAddAsBonusDialog, setShowAddAsBonusDialog] = useState(false);
  const [exerciseToAddDetails, setExerciseToAddDetails] = useState<ExerciseDefinition | null>(null);

  const [showConfirmResetDialog, setShowConfirmResetDialog] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

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

      const exerciseIdsInWorkout = (tPathExercisesLinks || []).map(link => link.exercise_id);

      let fetchedExercises: WorkoutExerciseWithDetails[] = [];

      if (exerciseIdsInWorkout.length > 0) {
        // 2. Fetch exercise definitions using the extracted IDs
        const { data: exerciseDefs, error: edError } = await supabase
          .from('exercise_definitions')
          .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id, icon_url') // Added icon_url
          .in('id', exerciseIdsInWorkout);

        if (edError) throw edError;

        // Create a map for quick lookup of exercise definitions
        const exerciseDefMap = new Map<string, ExerciseDefinition>();
        (exerciseDefs || []).forEach(def => exerciseDefMap.set(def.id, def as ExerciseDefinition)); // Cast 'def' to ExerciseDefinition
        
        // 3. Combine data and set exercises
        fetchedExercises = (tPathExercisesLinks || []).map(link => {
          const exerciseDef = exerciseDefMap.get(link.exercise_id);
          if (!exerciseDef) {
            console.warn(`Exercise definition not found for exercise_id: ${link.exercise_id} in workout ${workoutId}`);
            return null;
          }
          return {
            ...exerciseDef,
            order_index: link.order_index,
            is_bonus_exercise: link.is_bonus_exercise || false,
            t_path_exercise_id: link.id, // This is the ID from t_path_exercises
          };
        }).filter(Boolean) as WorkoutExerciseWithDetails[];
      }
      setExercises(fetchedExercises);

      // Fetch all available exercises (user's own and global) for the add dropdown
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id, icon_url') // Added icon_url
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (allExercisesError) throw allExercisesError;

      // Filter out global exercises if a user-owned copy already exists
      const userOwnedExerciseIds = new Set(
        (allExercisesData || [])
          .filter(ex => ex.user_id === session.user.id && ex.library_id)
          .map(ex => ex.library_id)
      );

      const filteredAvailableExercises = (allExercisesData || []).filter(ex => {
        if (ex.user_id === null && ex.library_id && userOwnedExerciseIds.has(ex.library_id)) {
          return false; // Exclude global if user has an adopted copy
        }
        return true;
      });

      setAllAvailableExercises(filteredAvailableExercises as ExerciseDefinition[]);

    } catch (err: any) {
      toast.error("Failed to load workout exercises: " + err.message);
      console.error("Error fetching workout exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, workoutId]);

  useEffect(() => {
    if (open) { // Only fetch data when the dialog is open
      fetchWorkoutData();
    }
  }, [open, fetchWorkoutData]);

  const handleDragEnd = (event: any) => {
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
  };

  const adoptExercise = async (exerciseToAdopt: ExerciseDefinition): Promise<string> => {
    if (exerciseToAdopt.user_id === session?.user.id) {
      return exerciseToAdopt.id; // Already user-owned
    }

    // Check if user already has an adopted copy of this global exercise
    if (exerciseToAdopt.library_id) {
      const { data: existingAdopted, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('id')
        .eq('user_id', session!.user.id)
        .eq('library_id', exerciseToAdopt.library_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }
      if (existingAdopted) {
        return existingAdopted.id;
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
        is_favorite: false,
        icon_url: exerciseToAdopt.icon_url,
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }
    return newAdoptedExercise.id;
  };

  const handleAddExerciseWithBonusStatus = async (isBonus: boolean) => {
    if (!exerciseToAddDetails || !session) return;

    setIsSaving(true);
    setShowAddAsBonusDialog(false); // Close the bonus choice dialog

    try {
      const finalExerciseId = await adoptExercise(exerciseToAddDetails);

      if (exercises.some(e => e.id === finalExerciseId)) {
        toast.info("This exercise is already in the workout.");
        setIsSaving(false);
        return;
      }

      // Optimistic update
      const newOrderIndex = exercises.length > 0 ? Math.max(...exercises.map(e => e.order_index)) + 1 : 0;
      const tempTPathExerciseId = `temp-${Date.now()}`; // Temporary ID for optimistic update
      const newExerciseWithDetails: WorkoutExerciseWithDetails = {
        ...exerciseToAddDetails,
        id: finalExerciseId, // Use the adopted ID if applicable
        order_index: newOrderIndex,
        is_bonus_exercise: isBonus,
        t_path_exercise_id: tempTPathExerciseId,
      };
      setExercises(prev => [...prev, newExerciseWithDetails]);

      // Insert into t_path_exercises
      const { data: insertedTpe, error: insertError } = await supabase
        .from('t_path_exercises')
        .insert({
          template_id: workoutId,
          exercise_id: finalExerciseId,
          order_index: newOrderIndex,
          is_bonus_exercise: isBonus,
        })
        .select('id')
        .single();

      if (insertError) {
        // Rollback optimistic update on error
        setExercises(prev => prev.filter(ex => ex.t_path_exercise_id !== tempTPathExerciseId));
        throw insertError;
      }

      // Update the optimistic item with the real ID
      setExercises(prev => prev.map(ex => 
        ex.t_path_exercise_id === tempTPathExerciseId ? { ...ex, t_path_exercise_id: insertedTpe.id } : ex
      ));

      toast.success(`'${exerciseToAddDetails.name}' added to workout as ${isBonus ? 'Bonus' : 'Core'}!`);
      setSelectedExerciseToAdd("");
      setExerciseToAddDetails(null);
    } catch (err: any) {
      toast.error("Failed to add exercise: " + err.message);
      console.error("Error adding exercise:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAndPromptBonus = () => {
    if (!selectedExerciseToAdd) {
      toast.error("Please select an exercise to add.");
      return;
    }
    const exercise = allAvailableExercises.find(e => e.id === selectedExerciseToAdd);
    if (exercise) {
      setExerciseToAddDetails(exercise);
      setShowAddAsBonusDialog(true);
    }
  };

  const handleRemoveExerciseClick = (exerciseId: string, tPathExerciseId: string, name: string) => {
    setExerciseToRemove({ exerciseId, tPathExerciseId, name });
    setShowConfirmRemoveDialog(true);
  };

  const confirmRemoveExercise = async () => {
    if (!exerciseToRemove) return;
    setIsSaving(true);
    setShowConfirmRemoveDialog(false); // Close confirmation dialog

    try {
      // Optimistic update
      const previousExercises = exercises;
      setExercises(prev => prev.filter(ex => ex.id !== exerciseToRemove.exerciseId));

      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', exerciseToRemove.tPathExerciseId);

      if (error) {
        // Rollback optimistic update on error
        setExercises(previousExercises);
        throw error;
      }
      toast.success("Exercise removed from workout!");
    } catch (err: any) {
      toast.error("Failed to remove exercise: " + err.message);
      console.error("Error removing exercise:", err);
    } finally {
      setIsSaving(false);
      setExerciseToRemove(null);
    }
  };

  const handleToggleBonusStatus = useCallback(async (exercise: WorkoutExerciseWithDetails) => {
    if (!session) return;
    setIsSaving(true);
    const newBonusStatus = !exercise.is_bonus_exercise;

    // Optimistic update
    setExercises(prev => prev.map(ex =>
      ex.id === exercise.id ? { ...ex, is_bonus_exercise: newBonusStatus } : ex
    ));

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .update({ is_bonus_exercise: newBonusStatus })
        .eq('id', exercise.t_path_exercise_id);

      if (error) throw error;
      toast.success(`'${exercise.name}' is now a ${newBonusStatus ? 'Bonus' : 'Core'} exercise!`);
    } catch (err: any) {
      toast.error("Failed to toggle bonus status: " + err.message);
      console.error("Error toggling bonus status:", err);
      // Rollback optimistic update on error
      setExercises(prev => prev.map(ex =>
        ex.id === exercise.id ? { ...ex, is_bonus_exercise: !newBonusStatus } : ex
      ));
    } finally {
      setIsSaving(false);
    }
  }, [session, supabase]);

  const handleResetToDefaults = async () => {
    if (!session) return;
    setIsSaving(true);
    setShowConfirmResetDialog(false); // Close confirmation dialog

    try {
      // 1. Fetch the parent T-Path ID and settings for the current workoutId
      const { data: childWorkoutData, error: childWorkoutError } = await supabase
        .from('t_paths')
        .select('parent_t_path_id, template_name, settings')
        .eq('id', workoutId)
        .eq('user_id', session.user.id)
        .single();

      if (childWorkoutError || !childWorkoutData || !childWorkoutData.parent_t_path_id) {
        throw new Error("Could not find parent T-Path or settings for this workout.");
      }

      const parentTPathId = childWorkoutData.parent_t_path_id;
      const currentWorkoutName = childWorkoutData.template_name;
      const tPathSettings = childWorkoutData.settings as { tPathType?: string };
      const workoutSplit = tPathSettings?.tPathType;

      if (!workoutSplit) {
        throw new Error("Workout split type not found in T-Path settings.");
      }

      // 2. Fetch user's preferred session length
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_session_length')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profileData?.preferred_session_length) {
        throw new Error("Could not fetch user's preferred session length.");
      }
      const preferredSessionLength = profileData.preferred_session_length;

      // Call the edge function to regenerate exercises for this specific workout
      // The edge function `generate-t-path` is designed to regenerate ALL child workouts for a main T-Path.
      // To reset a single child workout, we need to call it with the main T-Path ID.
      // The edge function will then delete and recreate all child workouts for that main T-Path,
      // including the one we want to reset.
      const response = await fetch(`/api/generate-t-path`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tPathId: parentTPathId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to regenerate T-Path workouts: ${errorText}`);
      }

      toast.success("Workout exercises reset to defaults!");
      onSaveSuccess(); // Refresh parent list
      fetchWorkoutData(); // Re-fetch data for this dialog
    } catch (err: any) {
      toast.error("Failed to reset exercises: " + err.message);
      console.error("Error resetting exercises:", err);
    } finally {
      setIsSaving(false);
    }
  };

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
      toast.success("Workout order saved successfully!");
      onSaveSuccess(); // Notify parent to refresh
    } catch (err: any) {
      toast.error("Failed to save workout order: " + err.message);
      console.error("Error saving order:", err);
    } finally {
      setIsSaving(false);
    }
  }, [exercises, supabase, onSaveSuccess]);

  const handleOpenInfoDialog = (exercise: WorkoutExerciseWithDetails) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Manage Exercises for <WorkoutBadge workoutName={workoutName} className="text-xl px-3 py-1" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading exercises...</p>
          ) : (
            <div className="space-y-6 w-full">
              <div className="flex gap-2 w-full">
                <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Add exercise" /></SelectTrigger>
                  <SelectContent className="p-0">
                    <div className="flex border-b p-2">
                      <Button
                        variant={addExerciseFilter === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setAddExerciseFilter('all')}
                        className="flex-1 h-8 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant={addExerciseFilter === 'my-exercises' ? 'secondary' : 'ghost'}
                        onClick={() => setAddExerciseFilter('my-exercises')}
                        className="flex-1 h-8 text-xs"
                      >
                        My Exercises
                      </Button>
                      <Button
                        variant={addExerciseFilter === 'global-library' ? 'secondary' : 'ghost'}
                        onClick={() => setAddExerciseFilter('global-library')}
                        className="flex-1 h-8 text-xs"
                      >
                        Global
                      </Button>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="p-1">
                        {allAvailableExercises
                          .filter(ex => {
                            if (addExerciseFilter === 'my-exercises') return ex.user_id === session?.user.id;
                            if (addExerciseFilter === 'global-library') return ex.user_id === null;
                            return true; // 'all' filter
                          })
                          .filter(ex => !exercises.some(existingEx => existingEx.id === ex.id))
                          .map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} ({e.main_muscle})
                            </SelectItem>
                          ))}
                      </div>
                    </ScrollArea>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleSelectAndPromptBonus} disabled={!selectedExerciseToAdd || isSaving}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-96 border rounded-md p-2 w-full">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {exercises.map(exercise => (
                        <SortableExerciseItem
                          key={exercise.id}
                          exercise={exercise}
                          onRemove={handleRemoveExerciseClick}
                          onOpenInfo={handleOpenInfoDialog}
                          onToggleBonus={handleToggleBonusStatus}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </ScrollArea>

              <div className="flex flex-col gap-2">
                <Button onClick={handleSaveOrder} className="w-full" disabled={isSaving}>
                  {isSaving ? "Saving Order..." : "Save Exercise Order"}
                </Button>
                <Button variant="outline" onClick={() => setShowConfirmResetDialog(true)} className="w-full" disabled={isSaving}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Reset to Defaults
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <LoadingOverlay
        isOpen={isSaving}
        title="Updating Workout"
        description="Please wait while your workout exercises are being saved."
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

      <Dialog open={showAddAsBonusDialog} onOpenChange={setShowAddAsBonusDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add "{exerciseToAddDetails?.name}" as?</DialogTitle>
            <DialogDescription>
              Choose whether to add this exercise as a core part of your workout or as an optional bonus.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button onClick={() => handleAddExerciseWithBonusStatus(false)} disabled={isSaving}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Add as Core Exercise
            </Button>
            <Button variant="outline" onClick={() => handleAddExerciseWithBonusStatus(true)} disabled={isSaving}>
              <Sparkles className="h-4 w-4 mr-2" /> Add as Bonus Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmResetDialog} onOpenChange={setShowConfirmResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reset to Defaults</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the exercises for "<span className="font-semibold">{workoutName}</span>" to its default configuration? This will remove all custom exercises and reintroduce the original set based on your preferred session length. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmResetDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>Reset to Defaults</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

// Helper component for sortable items
function SortableExerciseItem({ exercise, onRemove, onOpenInfo, onToggleBonus }: {
  exercise: WorkoutExerciseWithDetails;
  onRemove: (exerciseId: string, tPathExerciseId: string, name: string) => void;
  onOpenInfo: (exercise: WorkoutExerciseWithDetails) => void;
  onToggleBonus: (exercise: WorkoutExerciseWithDetails) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-1 px-2 border-2 rounded-md bg-card",
        exercise.is_bonus_exercise ? "border-workout-bonus" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <button {...listeners} {...attributes} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
        <div className="flex flex-col flex-grow min-w-0">
          <span className="font-medium text-sm text-foreground leading-tight">{exercise.name}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onOpenInfo(exercise)} title="Exercise Info">
          <Info className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="More Options">
              <GripVertical className="h-4 w-4" /> {/* Using GripVertical for dropdown trigger */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onToggleBonus(exercise)}>
              {exercise.is_bonus_exercise ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Make Core
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Make Bonus
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRemove(exercise.id, exercise.t_path_exercise_id, exercise.name)} className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}