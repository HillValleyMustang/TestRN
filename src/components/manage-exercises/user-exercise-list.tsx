"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Filter, Heart } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

interface UserExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  onDelete: (exercise: FetchedExerciseDefinition) => void;
  isDeleteDialogOpen: boolean;
  exerciseToDelete: FetchedExerciseDefinition | null;
  setIsDeleteDialogOpen: (open: boolean) => void;
  confirmDeleteExercise: () => void;
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (value: string) => void;
  availableMuscleGroups: string[];
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean }[]>; // New prop
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void; // New prop
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void; // New prop
}

export const UserExerciseList = ({
  exercises,
  loading,
  onEdit,
  onDelete,
  isDeleteDialogOpen,
  exerciseToDelete,
  setIsDeleteDialogOpen,
  confirmDeleteExercise,
  editingExercise,
  onCancelEdit,
  onSaveSuccess,
  selectedMuscleFilter,
  setSelectedMuscleFilter,
  availableMuscleGroups,
  exerciseWorkoutsMap,
  onRemoveFromWorkout,
  onToggleFavorite,
}: UserExerciseListProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    setSelectedMuscleFilter(value);
    setIsSheetOpen(false);
  };

  const handleToggleFavoriteClick = (exercise: FetchedExerciseDefinition, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent opening info dialog
    onToggleFavorite(exercise);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-bold">My Custom Exercises</CardTitle>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Filter className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-fit max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Exercises by Muscle Group</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <Select onValueChange={handleFilterChange} value={selectedMuscleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Muscle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Muscle Groups</SelectItem>
                  <SelectItem value="favorites">Favourites</SelectItem> {/* New filter option */}
                  {availableMuscleGroups.map(muscle => (
                    <SelectItem key={muscle} value={muscle}>
                      {muscle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SheetContent>
        </Sheet>
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
                  <ExerciseInfoDialog
                    exercise={ex}
                    exerciseWorkouts={exerciseWorkoutsMap[ex.id] || []}
                    onRemoveFromWorkout={onRemoveFromWorkout}
                    trigger={
                      <div className="flex-1 cursor-pointer py-1 pr-2">
                        <span className="font-medium">
                          {ex.name} <span className="text-muted-foreground">({ex.main_muscle})</span>
                        </span>
                        {exerciseWorkoutsMap[ex.id]?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {exerciseWorkoutsMap[ex.id].map(workout => (
                              <Badge key={workout.id} variant="secondary" className="px-2 py-0.5 text-xs">
                                {workout.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    }
                  />
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleToggleFavoriteClick(ex, e)} 
                      title={ex.is_favorite ? "Unfavourite" : "Favourite"}
                    >
                      <Heart className={cn("h-4 w-4", ex.is_favorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(ex); }} title="Edit Exercise">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(ex); }} title="Delete Exercise">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exercise "{exerciseToDelete?.name}" from your custom library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExercise}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};