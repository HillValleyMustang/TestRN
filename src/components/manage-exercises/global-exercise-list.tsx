"use client";

import React, { useState } from "react";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Heart, Info, Menu, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseInfoDialog } from "@/components/exercise-info-dialog";
import { AddExerciseToTPathDialog } from "./add-exercise-to-tpath-dialog";
import { cn, getWorkoutColorClass } from "@/lib/utils";
import { WorkoutBadge } from "@/components/workout-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ManageExerciseGymsDialog } from "./manage-exercise-gyms-dialog";

// Removed local FetchedExerciseDefinition definition

interface GlobalExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  exerciseGymsMap: Record<string, string[]>;
  userGyms: Tables<'gyms'>[];
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddSuccess: () => void;
  onOptimisticAdd: (exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => void; // Added
  onAddFailure: (exerciseId: string, workoutId: string) => void; // Added
}

export const GlobalExerciseList = ({
  exercises,
  loading,
  onEdit,
  exerciseWorkoutsMap,
  exerciseGymsMap,
  userGyms,
  onRemoveFromWorkout,
  onToggleFavorite,
  onAddSuccess,
  onOptimisticAdd, // Destructured
  onAddFailure, // Destructured
}: GlobalExerciseListProps) => {
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);
  const [isManageGymsDialogOpen, setIsManageGymsDialogOpen] = useState(false);
  const [selectedExerciseForGyms, setSelectedExerciseForGyms] = useState<FetchedExerciseDefinition | null>(null);

  const handleOpenAddTPathDialog = (exercise: FetchedExerciseDefinition) => {
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

  const handleOpenManageGymsDialog = (exercise: FetchedExerciseDefinition) => {
    setSelectedExerciseForGyms(exercise);
    setIsManageGymsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-semibold">Global Exercise Library</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-muted-foreground">No global exercises found matching the filter.</p>
        ) : (
          <ScrollArea>
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between py-1 px-2 border rounded-md">
                  <div className="flex-1 py-1 px-0">
                    <p className="font-medium">{ex.name}</p> {/* Exercise name */}
                    <p className="text-sm text-muted-foreground">{ex.main_muscle}</p> {/* Muscle group on new line */}
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exerciseGymsMap[ex.id as string]?.length > 0 && (
                        exerciseGymsMap[ex.id as string].map(gymName => (
                          <Badge key={gymName} variant="secondary" className="text-xs">
                            <Home className="h-3 w-3 mr-1" />
                            {gymName}
                          </Badge>
                        ))
                      )}
                      {exerciseWorkoutsMap[ex.id as string]?.length > 0 && (
                        exerciseWorkoutsMap[ex.id as string].map(workout => (
                          <div key={workout.id} className="flex items-center gap-1">
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
                        ))
                      )}
                    </div>
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
                      title={ex.is_favorited_by_current_user ? "Unfavourite" : "Favourite"}
                    >
                      <Heart className={cn("h-4 w-4", ex.is_favorited_by_current_user ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="More Options">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleOpenAddTPathDialog(ex)}>
                          <PlusCircle className="h-4 w-4 mr-2" /> Add to T-Path
                        </DropdownMenuItem>
                        {userGyms.length > 0 && (
                          <DropdownMenuItem onSelect={() => handleOpenManageGymsDialog(ex)}>
                            <Home className="h-4 w-4 mr-2" /> Manage Gyms
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          onOptimisticAdd={onOptimisticAdd}
          onAddFailure={onAddFailure}
        />
      )}

      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
          exerciseWorkouts={exerciseWorkoutsMap[selectedExerciseForInfo.id as string] || []}
          onRemoveFromWorkout={onRemoveFromWorkout}
        />
      )}

      {selectedExerciseForGyms && (
        <ManageExerciseGymsDialog
            open={isManageGymsDialogOpen}
            onOpenChange={setIsManageGymsDialogOpen}
            exercise={selectedExerciseForGyms}
            userGyms={userGyms}
            initialSelectedGymIds={new Set(
                userGyms
                    .filter(gym => exerciseGymsMap[selectedExerciseForGyms.id as string]?.includes(gym.name))
                    .map(gym => gym.id)
            )}
            onSaveSuccess={onAddSuccess}
        />
      )}
    </Card>
  );
};