"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, XCircle, GripVertical, ArrowLeft, Info, Heart } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { WorkoutBadge } from "@/components/workout-badge";
import { cn } from "@/lib/utils";

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPathExercise = Tables<'t_path_exercises'>;

interface WorkoutExerciseWithDetails extends ExerciseDefinition {
  order_index: number;
  is_bonus_exercise: boolean;
  t_path_exercise_id: string; // ID from t_path_exercises table
  is_favorited_by_current_user?: boolean; // For global exercises
}

export default function EditWorkoutExercisesPage({ params }: { params: { workoutId: string } }) {
  const { workoutId } = params;
  const router = useRouter();
  const { session, supabase } = useSession();

  const [workoutName, setWorkoutName] = useState<string>("");
  const [exercises, setExercises] = useState<WorkoutExerciseWithDetails[]>([]);
  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<WorkoutExerciseWithDetails | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const fetchWorkoutData = useCallback(async () => {
    if (!session || !workoutId) return;
    setLoading(true);
    try {
      // Fetch workout details
      const { data: workoutData, error: workoutError } = await supabase
        .from('t_paths')
        .select('template_name')
        .eq('id', workoutId)
        .eq('user_id', session.user.id)
        .single();

      if (workoutError || !workoutData) {
        throw new Error(workoutError?.message || "Workout not found or does not belong to user.");
      }
      setWorkoutName(workoutData.template_name);

      // Fetch exercises for this workout
      const { data: tPathExercises, error: tpeError } = await supabase
        .from('t_path_exercises')
        .select('id, exercise_id, order_index, is_bonus_exercise, exercise_definitions(*)')
        .eq('template_id', workoutId)
        .order('order_index', { ascending: true });

      if (tpeError) throw tpeError;

      const fetchedExercises: WorkoutExerciseWithDetails[] = (tPathExercises || []).map(tpe => {
        const exerciseDef = Array.isArray(tpe.exercise_definitions) && tpe.exercise_definitions.length > 0
          ? tpe.exercise_definitions[0] as ExerciseDefinition
          : null;

        if (!exerciseDef) {
          console.warn(`Exercise definition not found for t_path_exercise_id: ${tpe.id}`);
          return null; // Skip this entry if exercise definition is missing
        }

        return {
          ...exerciseDef,
          order_index: tpe.order_index,
          is_bonus_exercise: tpe.is_bonus_exercise || false,
          t_path_exercise_id: tpe.id,
        };
      }).filter(Boolean) as WorkoutExerciseWithDetails[]; // Filter out nulls and assert type
      setExercises(fetchedExercises);

      // Fetch all available exercises (user's own and global) for the add dropdown
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id')
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
    fetchWorkoutData();
  }, [fetchWorkoutData]);

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

  const handleAddExercise = async () => {
    if (!selectedExerciseToAdd) {
      toast.error("Please select an exercise to add.");
      return;
    }
    const exerciseToAdd = allAvailableExercises.find(e => e.id === selectedExerciseToAdd);
    if (!exerciseToAdd) return;

    if (exercises.some(e => e.id === exerciseToAdd.id)) {
      toast.info("This exercise is already in the workout.");
      return;
    }

    setIsSaving(true);
    try {
      // If it's a global exercise, adopt it first
      let finalExerciseId = exerciseToAdd.id;
      if (exerciseToAdd.user_id === null) {
        const { data: adoptedExercise, error: adoptError } = await supabase
          .from('exercise_definitions')
          .insert({
            name: exerciseToAdd.name,
            main_muscle: exerciseToAdd.main_muscle,
            type: exerciseToAdd.type,
            category: exerciseToAdd.category,
            description: exerciseToAdd.description,
            pro_tip: exerciseToAdd.pro_tip,
            video_url: exerciseToAdd.video_url,
            user_id: session!.user.id,
            library_id: exerciseToAdd.library_id || null,
            is_favorite: false,
          })
          .select('id')
          .single();
        if (adoptError) throw adoptError;
        finalExerciseId = adoptedExercise.id;
      }

      // Optimistic update
      const newOrderIndex = exercises.length > 0 ? Math.max(...exercises.map(e => e.order_index)) + 1 : 0;
      const tempTPathExerciseId = `temp-${Date.now()}`; // Temporary ID for optimistic update
      const newExerciseWithDetails: WorkoutExerciseWithDetails = {
        ...exerciseToAdd,
        id: finalExerciseId, // Use the adopted ID if applicable
        order_index: newOrderIndex,
        is_bonus_exercise: false, // Default to false when manually added
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
          is_bonus_exercise: false,
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

      toast.success(`'${exerciseToAdd.name}' added to workout!`);
      setSelectedExerciseToAdd("");
    } catch (err: any) {
      toast.error("Failed to add exercise: " + err.message);
      console.error("Error adding exercise:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveExercise = async (exerciseId: string, tPathExerciseId: string) => {
    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }
    setIsSaving(true);
    try {
      // Optimistic update
      const previousExercises = exercises;
      setExercises(prev => prev.filter(ex => ex.id !== exerciseId));

      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('id', tPathExerciseId);

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
    }
  };

  const handleSaveOrder = async () => {
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
    } catch (err: any) {
      toast.error("Failed to save workout order: " + err.message);
      console.error("Error saving order:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInfoDialog = (exercise: WorkoutExerciseWithDetails) => {
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4">
      <header className="mb-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.push('/manage-t-paths')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to T-Paths
        </Button>
        <h1 className="text-3xl font-bold">{workoutName}</h1>
        <div className="w-24"></div> {/* Spacer */}
      </header>

      <Card>
        <CardHeader><CardTitle>Manage Exercises</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading exercises...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                  <SelectTrigger><SelectValue placeholder="Add exercise from library" /></SelectTrigger>
                  <SelectContent>
                    {allAvailableExercises
                      .filter(ex => !exercises.some(existingEx => existingEx.id === ex.id))
                      .map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddExercise} disabled={!selectedExerciseToAdd || isSaving}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-96 border rounded-md p-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {exercises.map(exercise => (
                        <SortableExerciseItem
                          key={exercise.id}
                          exercise={exercise}
                          onRemove={handleRemoveExercise}
                          onOpenInfo={handleOpenInfoDialog}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </ScrollArea>

              <Button onClick={handleSaveOrder} className="w-full" disabled={isSaving}>
                {isSaving ? "Saving Order..." : "Save Exercise Order"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}

// Helper component for sortable items
function SortableExerciseItem({ exercise, onRemove, onOpenInfo }: { exercise: WorkoutExerciseWithDetails; onRemove: (exerciseId: string, tPathExerciseId: string) => void; onOpenInfo: (exercise: WorkoutExerciseWithDetails) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between p-2 border rounded-md bg-card">
      <div className="flex items-center gap-2">
        <button {...listeners} {...attributes} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
        <WorkoutBadge workoutName={exercise.name}>
          {exercise.name}
        </WorkoutBadge>
        {exercise.is_bonus_exercise && (
          <WorkoutBadge workoutName="Bonus">
            Bonus
          </WorkoutBadge>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => onOpenInfo(exercise)} title="Exercise Info">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onRemove(exercise.id, exercise.t_path_exercise_id)} title="Remove from Workout">
          <XCircle className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}