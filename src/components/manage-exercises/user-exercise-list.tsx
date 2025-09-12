"use client";

import React, { useState, useRef, useEffect } from "react"; // Import useRef and useEffect
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Heart, Info, PlusCircle, Menu, Sparkles, Building2 } from "lucide-react"; // Added Sparkles and Building2
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditExerciseDialog } from "./edit-exercise-dialog"; // Import the new dialog

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
  onRemoveFromWorkout: (workoutId: string, exerciseId: string) => void;
  onToggleFavorite: (exercise: FetchedExerciseDefinition) => void;
  onAddSuccess: () => void;
  onOptimisticAdd: (exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => void; // Added
  onAddFailure: (exerciseId: string, workoutId: string) => void; // Added
  availableLocationTags: string[]; // New prop
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
  onOptimisticAdd, // Destructured
  onAddFailure, // Destructured
  availableLocationTags, // Destructured
}: UserExerciseListProps) => {
  const [isAddTPathDialogOpen, setIsAddTPathDialogOpen] = useState(false);
  const [selectedExerciseForTPath, setSelectedExerciseForTPath] = useState<FetchedExerciseDefinition | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedExerciseForInfo, setSelectedExerciseForInfo] = useState<FetchedExerciseDefinition | null>(null);

  // State for the new EditExerciseDialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<FetchedExerciseDefinition | null>(null);

  // Removed exerciseFormRef and its useEffect as the form is now in a modal
  // const exerciseFormRef = useRef<HTMLDivElement>(null); 
  // useEffect(() => { ... }, [editingExercise]);

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
    setExerciseToEdit(exercise);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setExerciseToEdit(null);
    setIsEditDialogOpen(false);
    onCancelEdit(); // Ensure parent state is reset
  };

  const handleEditDialogSaveSuccess = () => {
    onSaveSuccess(); // Trigger parent refresh
    handleEditDialogClose(); // Close dialog and reset state
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-semibold">My Custom Exercises</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="mb-6">
          {/* The ExerciseForm is now used for adding new exercises directly in this component */}
          <ExerciseForm
            editingExercise={null} // Always null for adding new
            onCancelEdit={() => {}} // No specific cancel logic needed here for add form
            onSaveSuccess={onAddSuccess} // Use onAddSuccess for new exercises
            availableLocationTags={availableLocationTags} // Pass down the tags
            // Removed onAddOnlyToCurrentWorkout prop
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
                <li key={ex.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 border rounded-md">
                  <div className="flex-grow min-w-0 py-1 px-0">
                    <p className="font-medium text-base leading-tight whitespace-normal">{ex.name}</p> {/* Exercise name */}
                    <p className="text-sm text-muted-foreground">{ex.main_muscle}</p> {/* Muscle group on new line */}
                    <div className="mt-2 flex flex-wrap gap-2 items-center"> {/* Added items-center for vertical alignment */}
                      {ex.library_id?.startsWith('ai_gen_') && ( // Check for AI-generated
                        <WorkoutBadge workoutName="AI" className="text-xs px-2 py-0.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI
                        </WorkoutBadge>
                      )}
                      {ex.location_tags && ex.location_tags.length > 0 && ex.location_tags.map(tag => (
                        <WorkoutBadge key={tag} workoutName="Gym" className="text-xs px-2 py-0.5 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {tag}
                        </WorkoutBadge>
                      ))}
                      {/* Existing workout badges for t-paths */}
                      {exerciseWorkoutsMap[ex.id as string]?.length > 0 && (
                        exerciseWorkoutsMap[ex.id as string].map(workout => (
                          <div key={workout.id} className="flex items-center gap-1 p-1 rounded-md"> {/* Removed bg-muted */}
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
                  <div className="flex gap-1 flex-shrink-0 mt-2 sm:mt-0">
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
                        <DropdownMenuItem onSelect={() => handleOpenEditDialog(ex)}> {/* Open dialog here */}
                          <Edit className="h-4 w-4 mr-2" /> Edit Exercise
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDelete(ex)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Exercise
                        </DropdownMenuItem>
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
          onDeleteExercise={onDelete}
        />
      )}

      {/* New Edit Exercise Dialog */}
      <EditExerciseDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        exercise={exerciseToEdit}
        onSaveSuccess={handleEditDialogSaveSuccess}
        availableLocationTags={availableLocationTags}
      />
    </Card>
  );
};