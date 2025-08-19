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

interface ExerciseListProps {
  exercises: ExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: ExerciseDefinition) => void;
  onDelete: (exercise: ExerciseDefinition) => void;
  isDeleteDialogOpen: boolean;
  exerciseToDelete: ExerciseDefinition | null;
  setIsDeleteDialogOpen: (open: boolean) => void;
  confirmDeleteExercise: () => void;
}

export const ExerciseList = ({
  exercises,
  loading,
  onEdit,
  onDelete,
  isDeleteDialogOpen,
  exerciseToDelete,
  setIsDeleteDialogOpen,
  confirmDeleteExercise,
}: ExerciseListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Exercise Library</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : exercises.length === 0 ? (
          <p>No exercises defined yet. Add some or they will be generated for you!</p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md">
                  <span>
                    {ex.name} <span className="text-muted-foreground">({ex.main_muscle})</span>
                    {ex.user_id === null && <span className="ml-2 text-xs text-blue-500">(Global)</span>}
                  </span>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(ex)}><Edit className="h-4 w-4" /></Button>
                    {ex.user_id !== null && ( // Only allow deleting user-owned exercises
                      <Button variant="ghost" size="icon" onClick={() => onDelete(ex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
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
              This action cannot be undone. This will permanently delete the exercise "{exerciseToDelete?.name}".
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