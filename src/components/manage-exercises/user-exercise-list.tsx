"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2 } from "lucide-react";
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
}: UserExerciseListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">My Custom Exercises</CardTitle>
      </CardHeader>
      <CardContent>
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