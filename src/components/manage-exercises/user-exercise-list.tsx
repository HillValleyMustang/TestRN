"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Heart, Info, PlusCircle } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseForm } from "@/components/manage-exercises/exercise-form";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { cn, getWorkoutColorClass } from "@/lib/utils";
import { WorkoutBadge } from "@/components/workout-badge";
import { AddExerciseToTPathDialog } from "./add-exercise-to-tpath-dialog";

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

interface UserExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  onDelete: (exercise: FetchedExerciseDefinition) => void;
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddSuccess: () => void;
}

export const UserExerciseList = ({
  exercises,
  loading,
  onEdit,
  onDelete,
  editingExercise,
  onCancelEdit,
  onSaveSuccess,
  exerciseWorkoutsMap,
  onRemoveFromWorkout,
  onToggleFavorite,
  onAddSuccess,
}: UserExerciseListProps) => {
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);

  const handleOpenAddTPathDialog = (exercise: FetchedExerciseDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExerciseForTPath(exercise);
    setIsAddTPathDialogOpen(true);
  };

  const handleToggleFavoriteClick = (exercise: FetchedExerciseDefinition, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleFavorite(exercise);
  };

  const handleOpenInfoDialog = (exercise: FetchedExerciseDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExerciseForInfo(exercise);
    setIsInfoDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-semibold">My Custom Exercises</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="mb-6">
          <ExerciseForm
            editingExercise={editingExercise}
            onCancelEdit={onCancelEdit}
            onSaveSuccess={onSaveSuccess}
          />
        </div>

        <h3 className="text-lg font-semibold mb-4">My Exercises</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-muted-foreground">You haven't created any custom exercises yet.</p>
        ) : (
          <ScrollArea>
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between py-1 px-2 border rounded-md">
                  <div className="flex-1 py-1 px-0">
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
                  {/* Action buttons group */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="More Info" onClick={(e) => handleOpenInfoDialog(ex, e)}>
                      <Info className="h-4 w-4" />
                    </Button>
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
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>

      {selectedExerciseForTPath && (
        <AddExerciseToTPathDialog
          key={selectedExerciseForTPath.id}
          open={isAddTPathDialogOpen}
          onOpenChange={setIsAddTPathDialogOpen}
          exercise={selectedExerciseForTPath}
          onAddSuccess={onAddSuccess}
        />
      )}

      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
          exerciseWorkouts={exerciseWorkoutsMap[selectedExerciseForInfo.id] || []}
          onRemoveFromWorkout={onRemoveFromWorkout}
          onDeleteExercise={onDelete}
        />
      )}
    </Card>
  );
};