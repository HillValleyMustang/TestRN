"use client";

import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GripVertical, Info, XCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkoutExerciseWithDetails } from "@/hooks/use-edit-workout-exercises";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SortableExerciseListProps {
  exercises: WorkoutExerciseWithDetails[];
  handleDragEnd: (event: any) => void;
  handleRemoveExerciseClick: (exerciseId: string, tPathExerciseId: string, name: string) => void;
  handleOpenInfoDialog: (exercise: WorkoutExerciseWithDetails) => void;
  handleToggleBonusStatus: (exercise: WorkoutExerciseWithDetails) => void;
}

export const SortableExerciseList = ({
  exercises,
  handleDragEnd,
  handleRemoveExerciseClick,
  handleOpenInfoDialog,
  handleToggleBonusStatus,
}: SortableExerciseListProps) => {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <ScrollArea className="h-96 border rounded-md p-2 w-full">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {exercises.map(exercise => (
              <SortableExerciseItem
                key={exercise.id}
                exercise={exercise}
                onRemove={handleRemoveExerciseClick}
                onOpenInfo={handleOpenInfoDialog}
                onToggleBonus={handleToggleBonusStatus}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
};

// Helper component for sortable items
function SortableExerciseItem({ exercise, onRemove, onOpenInfo, onToggleBonus }: {
  exercise: WorkoutExerciseWithDetails;
  onRemove: (exerciseId: string, tPathExerciseId: string, name: string) => void;
  onOpenInfo: (exercise: WorkoutExerciseWithDetails) => void;
  onToggleBonus: (exercise: WorkoutExerciseWithDetails) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between py-1 px-2 border-2 rounded-md bg-card",
        exercise.is_bonus_exercise ? "border-workout-bonus" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <button {...listeners} {...attributes} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
        <div className="flex flex-col flex-grow min-w-0">
          <span className="font-medium text-sm text-foreground leading-tight">{exercise.name}</span>
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onOpenInfo(exercise)} title="Exercise Info">
          <Info className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="More Options">
              <GripVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onToggleBonus(exercise)}>
              {exercise.is_bonus_exercise ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Make Core
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Make Bonus
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRemove(exercise.id, exercise.t_path_exercise_id, exercise.name)} className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}