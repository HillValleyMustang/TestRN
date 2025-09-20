"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlusCircle, Search, Filter, XCircle } from 'lucide-react';
import { Tables, FetchedExerciseDefinition } from '@/types/supabase';
import { cn } from '@/lib/utils';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AddExercisesToWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allExercises: ExerciseDefinition[]; // All exercises available in the system
  exercisesInWorkout: string[]; // IDs of exercises already in the current workout
  muscleGroups: string[];
  onAddExercises: (exerciseIds: string[]) => void;
  addExerciseSourceFilter: 'my-exercises' | 'global-library';
  setAddExerciseSourceFilter: (filter: 'my-exercises' | 'global-library') => void;
}

export const AddExercisesToWorkoutDialog = ({
  open,
  onOpenChange,
  allExercises,
  exercisesInWorkout,
  muscleGroups,
  onAddExercises,
  addExerciseSourceFilter,
  setAddExerciseSourceFilter,
}: AddExercisesToWorkoutDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  // Reset selected exercises when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedExerciseIds(new Set());
      setSearchTerm("");
      setMuscleFilter("all");
    }
  }, [open]);

  const availableExercises = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return allExercises
      .filter(ex => !exercisesInWorkout.includes(ex.id)) // Exclude exercises already in workout
      .filter(ex => { // Filter by source (My Exercises vs Global)
        if (addExerciseSourceFilter === 'my-exercises') return ex.user_id !== null; // User-owned
        if (addExerciseSourceFilter === 'global-library') return ex.user_id === null; // Global
        return false;
      })
      .filter(ex => { // Filter by muscle group
        return muscleFilter === 'all' || ex.main_muscle === muscleFilter;
      })
      .filter(ex => { // Filter by search term
        return ex.name.toLowerCase().includes(lowerCaseSearchTerm);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allExercises, exercisesInWorkout, addExerciseSourceFilter, muscleFilter, searchTerm]);

  const handleToggleSelect = (exerciseId: string, isChecked: boolean) => {
    setSelectedExerciseIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(exerciseId);
      } else {
        newSet.delete(exerciseId);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    onAddExercises(Array.from(selectedExerciseIds));
    onOpenChange(false); // Close dialog after adding
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" /> Add Exercises
          </DialogTitle>
          <DialogDescription className="mb-2"> {/* Reduced margin-bottom */}
            Select exercises to add to the current workout template.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2 flex-grow flex flex-col"> {/* Reduced padding and spacing */}
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-2"> {/* Reduced gap */}
            <div className="flex sm:w-1/3">
              <Button
                variant="ghost"
                onClick={() => setAddExerciseSourceFilter('my-exercises')}
                className={cn(
                  "flex-1 h-9 text-xs",
                  addExerciseSourceFilter === 'my-exercises' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-accent"
                )}
              >
                My Exercises
              </Button>
              <Button
                variant="ghost"
                onClick={() => setAddExerciseSourceFilter('global-library')}
                className={cn(
                  "flex-1 h-9 text-xs",
                  addExerciseSourceFilter === 'global-library' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-accent"
                )}
              >
                Global
              </Button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm" // Added text-sm
              />
            </div>
            <Select onValueChange={setMuscleFilter} value={muscleFilter}>
              <SelectTrigger className="sm:w-1/3 h-9 text-sm"> {/* Added text-sm */}
                <SelectValue placeholder="Filter by muscle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Muscle Groups</SelectItem>
                {muscleGroups.map(muscle => <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Exercise List */}
          <ScrollArea className="flex-grow border rounded-md p-2">
            {availableExercises.length === 0 ? (
              <p className="text-muted-foreground text-center p-4 text-sm">No exercises found matching your criteria.</p>
            ) : (
              <ul className="space-y-1">
                {availableExercises.map(ex => (
                  <li key={ex.id} className="flex items-center justify-between p-2 text-sm hover:bg-accent rounded-md">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`add-exercise-${ex.id}`}
                        checked={selectedExerciseIds.has(ex.id)}
                        onCheckedChange={(checked) => handleToggleSelect(ex.id, !!checked)}
                      />
                      <Label htmlFor={`add-exercise-${ex.id}`} className="font-medium cursor-pointer">
                        {ex.name}
                      </Label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-9 text-sm">Cancel</Button>
          <Button onClick={handleAddSelected} disabled={selectedExerciseIds.size === 0} className="flex-1 h-9 text-sm">
            Add {selectedExerciseIds.size > 0 ? `(${selectedExerciseIds.size})` : ''} Exercises
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};