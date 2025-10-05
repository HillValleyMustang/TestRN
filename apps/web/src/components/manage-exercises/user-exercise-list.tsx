"use client";

import React, { useState, useRef, useEffect, useMemo } from "react"; // Import useMemo
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Heart, Info, PlusCircle, Menu, Home } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditExerciseDialog } from "./edit-exercise-dialog"; // Import the new dialog
import { Badge } from "@/components/ui/badge";
import { ManageExerciseGymsDialog } from "./manage-exercise-gyms-dialog";
import { ExerciseListInfoDialog } from "./exercise-list-info-dialog"; // NEW IMPORT
import { toast } from "sonner"; // Import toast

// Removed local FetchedExerciseDefinition definition

interface UserExerciseListProps {
  exercises: FetchedExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: FetchedExerciseDefinition) => void;
  onDelete: (exercise: FetchedExerciseDefinition) => void;
  editingExercise: FetchedExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  exerciseGymsMap: Record<string, string[]>;
  userGyms: Tables<'gyms'>[];
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddSuccess: () => void;
  onOptimisticAdd: (exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => void; // Added
  onAddFailure: (exerciseId: string, workoutId: string) => void; // Added
  totalCount: number; // NEW PROP
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
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
  exerciseGymsMap,
  userGyms,
  onRemoveFromWorkout,
  onToggleFavorite,
  onAddSuccess,
  onOptimisticAdd, // Destructured
  onAddFailure, // Destructured
  totalCount, // NEW
  setTempStatusMessage, // NEW
}: UserExerciseListProps) => {
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);
  const [isManageGymsDialogOpen, setIsManageGymsDialogOpen] = useState(false);
  const [selectedExerciseForGyms, setSelectedExerciseForGyms] = useState<FetchedExerciseDefinition | null>(null);

  // NEW: State for the explainer dialog
  const [isExplainerDialogOpen, setIsExplainerDialogOpen] = useState(false);

  const initialSelectedGymIdsForDialog = useMemo(() => {
    if (!selectedExerciseForGyms) return new Set<string>();
    const gymNamesForExercise = exerciseGymsMap[selectedExerciseForGyms.id as string] || [];
    const gymIds = userGyms
        .filter(gym => gymNamesForExercise.includes(gym.name))
        .map(gym => gym.id);
    return new Set(gymIds);
  }, [selectedExerciseForGyms, exerciseGymsMap, userGyms]);

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

  const handleOpenEditDialog = (exercise: FetchedExerciseDefinition) => {
    onEdit(exercise); // Call the parent's onEdit prop
  };

  // This function is no longer needed here as editing state is managed by parent
  // const handleEditDialogClose = () => {
  //   onCancelEdit(); // Ensure parent state is reset
  // };

  // This function is no longer needed here as editing state is managed by parent
  // const handleEditDialogSaveSuccess = () => {
  //   onSaveSuccess(); // Trigger parent refresh
  //   handleEditDialogClose(); // Close dialog and reset state
  // };

  const handleOpenManageGymsDialog = (exercise: FetchedExerciseDefinition) => {
    setSelectedExerciseForGyms(exercise);
    setIsManageGymsDialogOpen(true);
  };

  return (
    <Card>
      <CardContent className="p-3"> {/* Removed CardHeader, moved ExerciseForm here */}
        <div className="mb-6">
          <ExerciseForm
            editingExercise={null} // Always null for adding new
            onCancelEdit={() => {}} // No specific cancel logic needed here for add form
            onSaveSuccess={onAddSuccess} // Use onAddSuccess for new exercises
            setTempStatusMessage={setTempStatusMessage} // NEW
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4"> {/* NEW: Flex container for text and button */}
              <p className="text-sm text-muted-foreground">
                Showing {exercises.length} of {totalCount} exercises
              </p>
              <Button variant="ghost" size="icon" onClick={() => setIsExplainerDialogOpen(true)} title="How to use this page">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            {exercises.length === 0 ? (
              <p className="text-muted-foreground">You haven't created any custom exercises yet.</p>
            ) : (
              <ScrollArea>
                <ul className="space-y-2 w-full">
                  {exercises.map((ex) => (
                    <li key={ex.id!} className="flex flex-col py-1 px-2 border rounded-md w-full"> {/* Changed to flex-col */}
                      <div className="flex justify-between items-start w-full"> {/* Row 1: Exercise Name */}
                        <p className="font-medium text-base whitespace-normal flex-grow min-w-0">{ex.name}</p>
                      </div>
                      <div className="flex justify-between items-center w-full mt-1"> {/* Row 2: Muscle Group | Buttons */}
                        <p className="text-sm text-muted-foreground whitespace-normal flex-grow min-w-0">{ex.main_muscle}</p>
                        <div className="flex gap-1 flex-shrink-0">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="More Options">
                                <Menu className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenEditDialog(ex)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit Exercise
                              </DropdownMenuItem>
                              {userGyms.length > 0 && (
                                <DropdownMenuItem onSelect={() => handleOpenManageGymsDialog(ex)}>
                                  <Home className="h-4 w-4 mr-2" /> Manage Gyms
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => onDelete(ex)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Exercise
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 w-full"> {/* Row 3: Badges */}
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
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>

      {selectedExerciseForTPath && (
        <AddExerciseToTPathDialog
          key={selectedExerciseForTPath.id!}
          open={isAddTPathDialogOpen}
          onOpenChange={setIsAddTPathDialogOpen}
          exercise={selectedExerciseForTPath}
          onAddSuccess={onAddSuccess}
          onOptimisticAdd={onOptimisticAdd}
          onAddFailure={onAddFailure}
          setTempStatusMessage={setTempStatusMessage} // NEW
        />
      )}

      {selectedExerciseForInfo && (
        <ExerciseInfoDialog
          open={isInfoDialogOpen}
          onOpenChange={setIsInfoDialogOpen}
          exercise={selectedExerciseForInfo}
          exerciseWorkouts={exerciseWorkoutsMap[selectedExerciseForInfo.id as string] || []}
          onRemoveFromWorkout={onRemoveFromWorkout}
          onDeleteExercise={onDelete}
          setTempStatusMessage={setTempStatusMessage} // NEW
        />
      )}

      {selectedExerciseForGyms && (
        <ManageExerciseGymsDialog
            open={isManageGymsDialogOpen}
            onOpenChange={setIsManageGymsDialogOpen}
            exercise={selectedExerciseForGyms}
            userGyms={userGyms}
            initialSelectedGymIds={initialSelectedGymIdsForDialog}
            onSaveSuccess={onAddSuccess}
            setTempStatusMessage={setTempStatusMessage} // NEW
        />
      )}

      {/* New Edit Exercise Dialog is now managed by the parent ManageExercisesPage */}
      {/* {editingExercise && (
        <EditExerciseDialog
          open={!!editingExercise}
          onOpenChange={handleEditDialogClose}
          exercise={editingExercise}
          onSaveSuccess={handleEditDialogSaveSuccess}
        />
      )} */}

      {/* NEW: Explainer Dialog */}
      <ExerciseListInfoDialog
        open={isExplainerDialogOpen}
        onOpenChange={setIsExplainerDialogOpen}
        type="my-exercises"
      />
    </Card>
  );
};