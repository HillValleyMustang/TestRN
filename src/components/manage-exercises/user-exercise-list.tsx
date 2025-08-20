"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Filter } from "lucide-react";
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

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface UserExerciseListProps {
  exercises: ExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: ExerciseDefinition) => void;
  onDelete: (exercise: ExerciseDefinition) => void;
  isDeleteDialogOpen: boolean;
  exerciseToDelete: ExerciseDefinition | null;
  setIsDeleteDialogOpen: (open: boolean) => void;
  confirmDeleteExercise: () => void;
  editingExercise: ExerciseDefinition | null;
  onCancelEdit: () => void;
  onSaveSuccess: () => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (value: string) => void;
  availableMuscleGroups: string[];
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
}: UserExerciseListProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    setSelectedMuscleFilter(value);
    setIsSheetOpen(false);
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
                  {availableMuscleGroups.filter(muscle => muscle !== 'all').map(muscle => (
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
          <ScrollArea className="h-[600px] pr-4">
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span>
                    {ex.name} <span className="text-muted-foreground">({ex.main_muscle})</span>
                  </span>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(ex)} title="Edit Exercise">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(ex)} title="Delete Exercise">
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