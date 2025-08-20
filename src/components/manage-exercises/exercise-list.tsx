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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (value: string) => void;
  availableMuscleGroups: string[];
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
  selectedMuscleFilter,
  setSelectedMuscleFilter,
  availableMuscleGroups,
}: ExerciseListProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    setSelectedMuscleFilter(value);
    setIsPopoverOpen(false); // Close popover after selection
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-2xl font-bold">My Exercise Library</CardTitle>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Filter className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" side="bottom" align="start">
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
          </PopoverContent>
        </Popover>
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