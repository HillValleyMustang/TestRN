"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Heart, Info, PlusCircle } from "lucide-react"; // Import PlusCircle icon
import {
  AlertDialog, // Keep AlertDialog import as it might be used elsewhere or for other purposes
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseForm } from "@/components/manage-exercises/exercise-form";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { cn, getWorkoutColorClass } from "@/lib/utils";
import { WorkoutBadge } from "@/components/workout-badge"; // Import WorkoutBadge
import { AddExerciseToTPathDialog } from "./add-exercise-to-tpath-dialog"; // Import the dialog

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

interface UserExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  onDelete: (exercise: FetchedExerciseDefinition) => void; // This will now be passed to ExerciseInfoDialog
  // Removed isDeleteDialogOpen, exerciseToDelete, setIsDeleteDialogOpen, confirmDeleteExercise
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddSuccess: () => void; // Prop to trigger refresh after adding to T-Path
}

export const UserExerciseList = ({
  exercises,
  loading,
  onEdit,
  onDelete, // Pass this down to ExerciseInfoDialog
  // Removed isDeleteDialogOpen, exerciseToDelete, setIsDeleteDialogOpen, confirmDeleteExercise
  editingExercise,
  onCancelEdit,
  onSaveSuccess,
  exerciseWorkoutsMap,
  onRemoveFromWorkout,
  onToggleFavorite,
  onAddSuccess, // Pass this down
}: UserExerciseListProps) => {
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);

  const handleOpenAddTPathDialog = (exercise: FetchedExerciseDefinition, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening info dialog
    setSelectedExerciseForTPath(exercise);
    setIsAddTPathDialogOpen(true);
  };

  const handleToggleFavoriteClick = (exercise: FetchedExerciseDefinition, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent opening info dialog
    onToggleFavorite(exercise);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-bold">My Custom Exercises</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <ExerciseForm
            editingExercise={editingExercise}
            onCancelEdit={onCancelEdit}
            onSaveSuccess={onSaveSuccess}
          />
        </div>

        <h3 className="text-xl font-semibold mb-4">My Exercises</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-muted-foreground">You haven't created any custom exercises yet.</p>
        ) : (
          <ScrollArea className="pr-4">
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md">
                  {/* Main clickable area for info dialog */}
                  <ExerciseInfoDialog
                    exercise={ex}
                    exerciseWorkouts={exerciseWorkoutsMap[ex.id] || []}
                    onRemoveFromWorkout={onRemoveFromWorkout}
                    onDeleteExercise={onDelete} // Pass the onDelete function here
                    trigger={
                      <div className="flex-1 cursor-pointer py-1 pr-2">
                        <span className="font-medium">
                          {ex.name}{' '}
                          <span className="text-sm text-muted-foreground">
                            ({ex.main_muscle}){' '}
                          </span>
                        </span>
                        {exerciseWorkoutsMap[ex.id]?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {exerciseWorkoutsMap[ex.id].map(workout => (
                              <div key={workout.id} className="flex items-center gap-1 bg-muted p-1 rounded-md">
                                <WorkoutBadge 
                                  workoutName={workout.name}
                                >
                                  {workout.name}
                                </WorkoutBadge>
                                {workout.isBonus && (
                                  <WorkoutBadge workoutName="Bonus">
                                    Bonus
                                  </WorkoutBadge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    }
                  />
                  {/* Action buttons group */}
                  <div className="flex space-x-1">
                    {/* New Info Button (redundant if main area is trigger, but kept for consistency with global list) */}
                    <ExerciseInfoDialog
                      exercise={ex}
                      exerciseWorkouts={exerciseWorkoutsMap[ex.id] || []}
                      onRemoveFromWorkout={onRemoveFromWorkout}
                      onDeleteExercise={onDelete} // Pass the onDelete function here
                      trigger={
                        <Button variant="ghost" size="icon" title="More Info">
                          <Info className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleToggleFavoriteClick(ex, e)} 
                      title={ex.is_favorite ? "Unfavourite" : "Favourite"}
                    >
                      <Heart className={cn("h-4 w-4", ex.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleOpenAddTPathDialog(ex, e)} title="Add to T-Path">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(ex); }} title="Edit Exercise">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* Removed the direct delete button from the card */}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>

      {/* Removed AlertDialog from here as it's now handled inside ExerciseInfoDialog */}
      {selectedExerciseForTPath && (
        <AddExerciseToTPathDialog
          key={selectedExerciseForTPath.id} // Added key prop
          open={isAddTPathDialogOpen}
          onOpenChange={setIsAddTPathDialogOpen}
          exercise={selectedExerciseForTPath}
          onAddSuccess={onAddSuccess}
        />
      )}
    </Card>
  );
};