"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { GripVertical, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutExerciseWithDetails } from '../gym-exercise-manager';

interface SortableGymExerciseItemProps {
  exercise: WorkoutExerciseWithDetails;
  onRemove: (exerciseId: string) => void;
  onOpenInfo: (exercise: WorkoutExerciseWithDetails) => void;
}

export const SortableGymExerciseItem = ({ exercise, onRemove, onOpenInfo }: SortableGymExerciseItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0, // Bring dragged item to front
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-1 px-2 border rounded-md bg-card group hover:bg-accent transition-colors text-sm",
        isDragging && "ring-2 ring-primary", // Highlight dragged item
      )}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <button {...listeners} {...attributes} className="cursor-grab p-1 -ml-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="font-medium text-sm text-foreground leading-tight break-words">{exercise.name}</span>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onOpenInfo(exercise)} title="Exercise Info" className="h-7 w-7">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Remove Exercise" onClick={() => onRemove(exercise.id)} className="h-7 w-7">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
};