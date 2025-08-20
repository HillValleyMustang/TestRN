"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, PlusCircle, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { AddExerciseToTPathDialog } from "./add-exercise-to-tpath-dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

interface GlobalExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (value: string) => void;
  availableMuscleGroups: string[];
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean }[]>; // New prop
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void; // New prop
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void; // New prop
  onAddSuccess: () => void; // New prop for refreshing after adding to T-Path
}

export const GlobalExerciseList = ({
  exercises,
  loading,
  onEdit,
  selectedMuscleFilter,
  setSelectedMuscleFilter,
  availableMuscleGroups,
  exerciseWorkoutsMap,
  onRemoveFromWorkout,
  onToggleFavorite,
  onAddSuccess,
}: GlobalExerciseListProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);

  const handleFilterChange = (value: string) => {
    setSelectedMuscleFilter(value);
    setIsSheetOpen(false);
  };

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
        <CardTitle className="text-2xl font-bold">Global Exercise Library</CardTitle>
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
                  <SelectItem value="favorites">Favorites</SelectItem>
                  {availableMuscleGroups.filter(muscle => muscle !== 'all' && muscle !== 'favorites').map(muscle => (
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
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-muted-foreground">No global exercises found matching the filter.</p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
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
                      title={ex.is_favorited_by_current_user ? "Unfavorite" : "Favorite"}
                    >
                      <Heart className={cn("h-4 w-4", ex.is_favorited_by_current_user ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => handleOpenAddTPathDialog(ex, e)} title="Add to T-Path">
                      <PlusCircle className="h-4 w-4" />
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
          open={isAddTPathDialogOpen}
          onOpenChange={setIsAddTPathDialogOpen}
          exercise={selectedExerciseForTPath}
          onAddSuccess={onAddSuccess}
        />
      )}
    </Card>
  );
};