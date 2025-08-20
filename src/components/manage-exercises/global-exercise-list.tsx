"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Info, PlusCircle } from "lucide-react";
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

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface GlobalExerciseListProps {
  exercises: ExerciseDefinition[];
  loading: boolean;
  onEdit: (exercise: ExerciseDefinition) => void;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (value: string) => void;
  availableMuscleGroups: string[];
}

export const GlobalExerciseList = ({
  exercises,
  loading,
  onEdit,
  selectedMuscleFilter,
  setSelectedMuscleFilter,
  availableMuscleGroups,
}: GlobalExerciseListProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    setSelectedMuscleFilter(value);
    setIsSheetOpen(false);
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
                    trigger={
                      <span className="cursor-pointer hover:underline">
                        {ex.name} <span className="text-muted-foreground">({ex.main_muscle})</span>
                      </span>
                    }
                  />
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(ex)} title="Adopt & Edit">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};